// Server-side equivalent of RiichiCam's on-device ONNX pipeline:
// base64 JPEG/PNG -> letterboxed 640x640 tensor -> YOLO decode -> tile list.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as ort from 'onnxruntime-node';
import { computeLetterbox, type LetterboxInfo } from './letterbox.js';
import { decodeYoloOutput } from './decode-yolo-output.js';
import { CLASS_NAMES } from './tile-classes.js';
import type { RawPrediction } from './roboflow-parser.js';

const MODEL_INPUT_SIZE = 640;

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let warmupPromise: Promise<void> | null = null;

// Locate the model in the deployed bundle. Vercel's NFT (node-file-trace)
// bundling may place it under /var/task/lib/ or hoist it to /var/task/, and
// the traced copy can land in a .vercel/output subdirectory — probe the known
// candidates instead of trusting one path.
function findModelPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, 'tile-detector.onnx'),
    path.join(here, '..', 'tile-detector.onnx'),
    path.join(here, '..', '..', 'lib', 'tile-detector.onnx'),
    path.join(here, '..', '..', 'tile-detector.onnx'),
    path.join(process.cwd(), 'lib', 'tile-detector.onnx'),
    path.join(process.cwd(), 'tile-detector.onnx'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // fall through
    }
  }
  throw new Error(`tile-detector.onnx not found; probed: ${candidates.join(', ')}`);
}

// Lazily create (and cache) the inference session. On Vercel with Fluid
// compute the instance stays warm across requests, so the model load cost is
// paid on cold start only.
function loadSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(findModelPath(), {
      executionProviders: ['cpu'],
    });
  }
  return sessionPromise;
}

// Load the model and execute one throwaway inference so the first real scan
// does not pay the cold-start/session-initialization cost.
export function warmUpDetector(): Promise<void> {
  if (!warmupPromise) {
    warmupPromise = (async () => {
      const session = await loadSession();
      const inputName = session.inputNames[0];
      await session.run({
        [inputName]: new ort.Tensor(
          'float32',
          new Float32Array(3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE),
          [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE],
        ),
      });
    })();
  }
  return warmupPromise;
}

// Runs detection on a raw image buffer. Mirrors the browser pipeline:
// centered-pad letterbox to 640x640, CHW float32 RGB, decode + NMS.
export async function detectTiles(buffer: Buffer): Promise<RawPrediction[]> {
  const session = await loadSession();

  const meta = await sharp(buffer).metadata();
  const srcWidth = meta.width ?? 0;
  const srcHeight = meta.height ?? 0;
  if (!srcWidth || !srcHeight) {
    throw new Error('Unreadable image dimensions');
  }

  const letterbox = computeLetterbox(srcWidth, srcHeight, MODEL_INPUT_SIZE);
  const drawWidth = Math.round(srcWidth * letterbox.scale);
  const drawHeight = Math.round(srcHeight * letterbox.scale);

  const resized = await sharp(buffer)
    .resize(drawWidth, drawHeight, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Recreate the browser canvas composite: paste the resized image onto a
  // 114-gray square at the letterbox offsets (Ultralytics default pad color).
  const padded = await sharp({
    create: {
      width: MODEL_INPUT_SIZE,
      height: MODEL_INPUT_SIZE,
      channels: 3,
      background: { r: 114, g: 114, b: 114 },
    },
  })
    .composite([
      {
        input: resized.data,
        raw: { width: drawWidth, height: drawHeight, channels: 3 },
        left: Math.round(letterbox.padX),
        top: Math.round(letterbox.padY),
      },
    ])
    // sharp promotes composited images to RGBA even when the base image and
    // overlay are RGB. Remove that generated alpha channel before building
    // the CHW tensor below, whose indexing deliberately uses an RGB stride.
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (padded.info.channels !== 3) {
    throw new Error(`Expected RGB preprocessing output, got ${padded.info.channels} channels`);
  }

  const planeSize = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const chw = new Float32Array(3 * planeSize);
  // /255 RGB CHW — identical to RiichiCam's browser canvas preprocessing,
  // which was validated against real tile photos (137-142 tiles identified).
  for (let i = 0; i < planeSize; i++) {
    chw[i] = padded.data[i * 3] / 255;
    chw[planeSize + i] = padded.data[i * 3 + 1] / 255;
    chw[2 * planeSize + i] = padded.data[i * 3 + 2] / 255;
  }

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const results = await session.run({
    [inputName]: new ort.Tensor('float32', chw, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]),
  });
  const output = results[outputName];

  // This export produces [1, 4 + numClasses, numAnchors] (column-major, raw
  // logits — see decode-yolo-output.ts for the layout note).
  const [, channels, numAnchors] = output.dims;
  const numClasses = channels - 4;
  if (numClasses !== CLASS_NAMES.length) {
    throw new Error(`Model output has ${numClasses} classes but ${CLASS_NAMES.length} were expected.`);
  }

  return decodeYoloOutput(
    { data: output.data as Float32Array, numAnchors, numClasses },
    letterbox,
  );
}
