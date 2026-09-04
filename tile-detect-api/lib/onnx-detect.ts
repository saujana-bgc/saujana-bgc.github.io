import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { roboflowLabelToTile, type RawPrediction } from './roboflow-parser.js';
import type { Tile } from './types.js';

const MODEL_PATH = fileURLToPath(new URL('../tile-model.onnx', import.meta.url));
const INPUT_SIZE = 160;
const NOMINAL_TILE_FRACTION = 0.12;

const CLASSES = [
  'Chun', 'Haku', 'Hatsu', 'Man1', 'Man2', 'Man3', 'Man4', 'Man5',
  'Man5-Dora', 'Man6', 'Man7', 'Man8', 'Man9', 'Nan', 'Pei', 'Pin1',
  'Pin2', 'Pin3', 'Pin4', 'Pin5', 'Pin5-Dora', 'Pin6', 'Pin7', 'Pin8',
  'Pin9', 'Shaa', 'Sou1', 'Sou2', 'Sou3', 'Sou4', 'Sou5', 'Sou5-Dora',
  'Sou6', 'Sou7', 'Sou8', 'Sou9', 'Ton',
] as const;

const NAME_TO_LABEL: Record<(typeof CLASSES)[number], string> = {
  Chun: '7z', Haku: '5z', Hatsu: '6z',
  Man1: '1m', Man2: '2m', Man3: '3m', Man4: '4m', Man5: '5m',
  'Man5-Dora': '5mr', Man6: '6m', Man7: '7m', Man8: '8m', Man9: '9m',
  Nan: '2z', Pei: '4z',
  Pin1: '1p', Pin2: '2p', Pin3: '3p', Pin4: '4p', Pin5: '5p',
  'Pin5-Dora': '5pr', Pin6: '6p', Pin7: '7p', Pin8: '8p', Pin9: '9p',
  Shaa: '3z',
  Sou1: '1s', Sou2: '2s', Sou3: '3s', Sou4: '4s', Sou5: '5s',
  'Sou5-Dora': '5sr', Sou6: '6s', Sou7: '7s', Sou8: '8s', Sou9: '9s',
  Ton: '1z',
};

interface Box { left: number; top: number; width: number; height: number }
interface PreparedImage { data: Buffer; width: number; height: number; channels: number }

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
  });
  return sessionPromise;
}

export async function warmUpOnnx(): Promise<void> {
  const session = await getSession();
  const input = new ort.Tensor('float32', new Float32Array(3 * INPUT_SIZE * INPUT_SIZE), [1, 3, INPUT_SIZE, INPUT_SIZE]);
  await session.run({ image: input });
}

async function prepare(buffer: Buffer): Promise<PreparedImage> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function creamBounds(image: PreparedImage): Box | null {
  const { data, width, height, channels } = image;
  const rowCounts = new Uint32Array(height);
  const columnCounts = new Uint32Array(width);
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if (isCream(r, g, b)) {
        rowCounts[y]++; columnCounts[x]++; count++;
      }
    }
  }
  if (count < width * height * 0.001) return null;
  const rowThreshold = Math.max(8, Math.round(width * 0.015));
  const columnThreshold = Math.max(8, Math.round(height * 0.008));
  let minX = columnCounts.findIndex((value) => value >= columnThreshold);
  let minY = rowCounts.findIndex((value) => value >= rowThreshold);
  let maxX = width - 1;
  let maxY = height - 1;
  while (maxX >= 0 && columnCounts[maxX] < columnThreshold) maxX--;
  while (maxY >= 0 && rowCounts[maxY] < rowThreshold) maxY--;
  if (minX < 0 || minY < 0 || maxX <= minX || maxY <= minY) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function isCream(r: number, g: number, b: number): boolean {
  const light = (r + g + b) / 3;
  return light > 115 && r - b > 7 && g - b > 2;
}

function tightenBox(image: PreparedImage, box: Box): Box {
  const { data, width, height, channels } = image;
  let minX = box.left + box.width, minY = box.top + box.height, maxX = -1, maxY = -1;
  const right = Math.min(width, box.left + box.width);
  const bottom = Math.min(height, box.top + box.height);
  for (let y = Math.max(0, box.top); y < bottom; y++) {
    for (let x = Math.max(0, box.left); x < right; x++) {
      const offset = (y * width + x) * channels;
      if (isCream(data[offset], data[offset + 1], data[offset + 2])) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) return box;
  const pad = 2;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const clippedRight = Math.min(width, maxX + pad + 1);
  const clippedBottom = Math.min(height, maxY + pad + 1);
  return { left, top, width: clippedRight - left, height: clippedBottom - top };
}

function splitRun(run: Box, count: number): Box[] {
  const boxes: Box[] = [];
  if (run.height >= run.width) {
    const step = run.height / count;
    for (let i = 0; i < count; i++) {
      const top = Math.round(run.top + i * step);
      const bottom = Math.round(run.top + (i + 1) * step);
      boxes.push({ left: run.left, top, width: run.width, height: Math.max(1, bottom - top) });
    }
  } else {
    const step = run.width / count;
    for (let i = 0; i < count; i++) {
      const left = Math.round(run.left + i * step);
      const right = Math.round(run.left + (i + 1) * step);
      boxes.push({ left, top: run.top, width: Math.max(1, right - left), height: run.height });
    }
  }
  return boxes;
}

function estimatedCount(run: Box): number {
  const long = Math.max(run.width, run.height);
  const short = Math.min(run.width, run.height);
  return Math.max(1, Math.min(20, Math.round(long / Math.max(1, short / 1.55))));
}

async function cropRotations(buffer: Buffer, box: Box): Promise<{ data: Float32Array; count: number }> {
  // Normalize the physical tile to portrait. Testing squashed landscape
  // variants lets an invalid orientation occasionally win with false confidence.
  const rotations = box.width > box.height ? [90, 270] : [0, 180];
  const batch = new Float32Array(rotations.length * 3 * INPUT_SIZE * INPUT_SIZE);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  // Materialize extraction first: Sharp schedules rotation before extraction
  // in a single pipeline, which makes 90-degree variants use swapped bounds.
  const crop = await sharp(buffer).extract(box).png().toBuffer();
  for (let n = 0; n < rotations.length; n++) {
    const { data, info } = await sharp(crop)
      .rotate(rotations[n])
      .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let y = 0; y < INPUT_SIZE; y++) {
      for (let x = 0; x < INPUT_SIZE; x++) {
        const src = (y * INPUT_SIZE + x) * info.channels;
        for (let c = 0; c < 3; c++) {
          const dst = n * 3 * INPUT_SIZE * INPUT_SIZE + c * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x;
          batch[dst] = (data[src + c] / 255 - mean[c]) / std[c];
        }
      }
    }
  }
  return { data: batch, count: rotations.length };
}

async function classifyBox(rawImage: Buffer, box: Box): Promise<{ label: string; confidence: number }> {
  const session = await getSession();
  const input = await cropRotations(rawImage, box);
  const output = await session.run({ image: new ort.Tensor('float32', input.data, [input.count, 3, INPUT_SIZE, INPUT_SIZE]) });
  const logits = output.logits.data as Float32Array;
  let bestIndex = 0, bestProbability = -1;
  for (let rotation = 0; rotation < input.count; rotation++) {
    const offset = rotation * CLASSES.length;
    let maxLogit = -Infinity;
    for (let c = 0; c < CLASSES.length; c++) maxLogit = Math.max(maxLogit, logits[offset + c]);
    let denominator = 0;
    for (let c = 0; c < CLASSES.length; c++) denominator += Math.exp(logits[offset + c] - maxLogit);
    for (let c = 0; c < CLASSES.length; c++) {
      const probability = Math.exp(logits[offset + c] - maxLogit) / denominator;
      if (probability > bestProbability) { bestProbability = probability; bestIndex = c; }
    }
  }
  return { label: NAME_TO_LABEL[CLASSES[bestIndex]], confidence: bestProbability };
}

export async function detectTilesOnnx(
  imageBase64: string,
  imgWidth: number,
  imgHeight: number,
  expectedCount?: number,
): Promise<RawPrediction[]> {
  const original = Buffer.from(imageBase64, 'base64');
  const prepared = await prepare(original);
  const run = creamBounds(prepared);
  if (!run) return [];
  const count = expectedCount ?? estimatedCount(run);
  const boxes = splitRun(run, count).map((box) => tightenBox(prepared, box));
  if (process.env.TILE_DETECT_DEBUG === '1') console.error(JSON.stringify({ run, boxes }));
  const sx = imgWidth / prepared.width;
  const sy = imgHeight / prepared.height;
  const nominal = Math.min(imgWidth, imgHeight) * NOMINAL_TILE_FRACTION;
  const predictions: RawPrediction[] = [];
  // Classify the prepared, orientation-normalized image so boxes and pixels share coordinates.
  const preparedPng = await sharp(prepared.data, { raw: { width: prepared.width, height: prepared.height, channels: prepared.channels } }).png().toBuffer();
  for (const box of boxes) {
    const result = await classifyBox(preparedPng, box);
    predictions.push({
      class: result.label,
      confidence: result.confidence,
      x: (box.left + box.width / 2) * sx,
      y: (box.top + box.height / 2) * sy,
      width: nominal,
      height: nominal * 1.4,
    });
  }
  return predictions;
}

export async function detectWinningTile(crop: Buffer): Promise<Tile | null> {
  const meta = await sharp(crop).metadata();
  const predictions = await detectTilesOnnx(crop.toString('base64'), meta.width ?? 1, meta.height ?? 1, 1);
  if (!predictions[0]) return null;
  try { return roboflowLabelToTile(predictions[0].class); } catch { return null; }
}
