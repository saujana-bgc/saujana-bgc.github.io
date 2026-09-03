import type { RawPrediction } from './roboflow-parser.js';
import { MIN_CONFIDENCE } from './roboflow-parser.js';
import { classIndexToLabel, CLASS_NAMES } from './tile-classes.js';
import { computeLetterbox, unletterboxBox, type LetterboxInfo } from './letterbox.js';
import { nms, type ScoredBox } from './nms.js';

// This export produces shape [1, 4 + numClasses, numAnchors] (column-major:
// all anchors for box-x first, then box-y, ..., then each class row).
// Class channels are 0..1 probabilities (sigmoid applied in-graph — verified
// via the ONNX graph: the final Concat joins the box decode with a Sigmoid
// node), so no extra activation is applied here. Batch dim is dropped since
// we only run one image.
export interface YoloOutputTensor {
  data: ArrayLike<number>;
  numAnchors: number;
  numClasses: number;
}

export interface DecodeOptions {
  confidenceThreshold?: number;
  iouThreshold?: number;
}


export function decodeYoloOutput(
  output: YoloOutputTensor,
  letterboxInfo: LetterboxInfo,
  opts: DecodeOptions = {},
): RawPrediction[] {
  const { data, numAnchors, numClasses } = output;
  const confidenceThreshold = opts.confidenceThreshold ?? MIN_CONFIDENCE;
  const iouThreshold = opts.iouThreshold ?? 0.5;

  if (numClasses !== CLASS_NAMES.length) {
    throw new Error(
      `Model has ${numClasses} classes but tile-classes.ts defines ${CLASS_NAMES.length}; ` +
      `class order would be silently wrong. Check the export matches CLASS_NAMES.`,
    );
  }

  const candidates: ScoredBox[] = [];
  for (let a = 0; a < numAnchors; a++) {
    // Column-major: class c's probability for anchor a sits at (4 + c) * numAnchors + a.
    let bestScore = -Infinity;
    let bestClass = -1;
    for (let c = 0; c < numClasses; c++) {
      const score = data[(4 + c) * numAnchors + a];
      if (score > bestScore) {
        bestScore = score;
        bestClass = c;
      }
    }
    if (bestScore >= confidenceThreshold) {
      candidates.push({
        x: data[0 * numAnchors + a],
        y: data[1 * numAnchors + a],
        width: data[2 * numAnchors + a],
        height: data[3 * numAnchors + a],
        score: bestScore,
        classIndex: bestClass,
      });
    }
  }

  const kept = nms(candidates, iouThreshold);

  return kept.map((box) => {
    const orig = unletterboxBox(box, letterboxInfo);
    return {
      class: classIndexToLabel(box.classIndex),
      confidence: box.score,
      x: orig.x,
      y: orig.y,
      width: orig.width,
      height: orig.height,
    };
  });
}

export { computeLetterbox };
export type { LetterboxInfo };