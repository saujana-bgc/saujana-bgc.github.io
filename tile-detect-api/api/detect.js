import { detectTilesOnnx, detectWinningTile, warmUpOnnx } from '../lib/onnx-detect.js';
import { parsePredictions } from '../lib/roboflow-parser.js';
import { splitBySection } from '../lib/sections.js';
import { pixelBoxFor, pointInBox } from '../lib/section-box.js';
import sharp from 'sharp';

// Shared CORS config: the caller is the GitHub Pages site.
const ALLOWED_ORIGINS = new Set([
  'https://saujana-bgc.github.io',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:4174',
]);

function cors(req, res) {
  const origin = req.headers.origin ?? '';
  if (!ALLOWED_ORIGINS.has(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

const MAX_BODY_BYTES = 8 * 1024 * 1024; // ~8 MB base64 payload ceiling

function fail(res, status, error) {
  return res.status(status).json({ error });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    cors(req, res);
    return res.status(204).end();
  }
  if (req.method === 'GET') {
    if (!cors(req, res)) {
      return fail(res, 403, 'Origin not allowed');
    }
    try {
      await warmUpOnnx();
      return res.status(200).json({ ready: true });
    } catch (err) {
      console.error('warm-up failed:', err);
      return fail(res, 500, 'Scanner warm-up failed');
    }
  }
  if (req.method !== 'POST') {
    return fail(res, 405, 'Method not allowed');
  }
  if (!cors(req, res)) {
    return fail(res, 403, 'Origin not allowed');
  }

  const body = req.body ?? {};
  if (!body.image || typeof body.image !== 'string') {
    return fail(res, 400, 'Missing base64 "image" field');
  }
  if (body.image.length > MAX_BODY_BYTES) {
    return fail(res, 413, 'Image too large');
  }

  const buffer = Buffer.from(body.image, 'base64');
  if (buffer.length < 100) {
    return fail(res, 400, 'Image payload too small');
  }

  try {
    const meta = await sharp(buffer).metadata();
    const imgWidth = meta.width ?? 0;
    const imgHeight = meta.height ?? 0;
    if (!imgWidth || !imgHeight) {
      throw new Error('Unreadable image dimensions');
    }

    const expectedCount = Number.isInteger(body.expectedCount) && body.expectedCount >= 1 && body.expectedCount <= 20
      ? body.expectedCount
      : undefined;
    const handCount = Number.isInteger(body.handCount) && body.handCount >= 1 && body.handCount <= 20
      ? body.handCount
      : undefined;
    const doraCount = Number.isInteger(body.doraCount) && body.doraCount >= 1 && body.doraCount <= 10
      ? body.doraCount
      : undefined;

    // Individual mode: a flat tile list (hand / dora scanning).
    // Guided mode: optional section boxes (normalized 0..1) split one frame
    // into hand / winning / dora / meld groups; the image pixel size is
    // passed through so splitBySection can map boxes back to pixels.
    if (body.sections && Object.keys(body.sections).length > 0) {
      const guided = await detectGuided(body, buffer, imgWidth, imgHeight, handCount, doraCount);
      return res.status(200).json({ mode: 'guided', ...guided });
    }

    const predictions = await detectTilesOnnx(body.image, imgWidth, imgHeight, expectedCount);
    const tiles = parsePredictions(predictions);
    return res.status(200).json({ mode: 'individual', tiles });
  } catch (err) {
    console.error('detect failed:', err);
    return fail(res, 500, 'Detection failed');
  }
}

async function detectGuided(body, buffer, imgWidth, imgHeight, handCount, doraCount) {
  const sections = body.sections;
  const winningBox = sections.winning;

  const winnerCropPromise = winningBox
    ? cropForWinner(buffer, winningBox, imgWidth, imgHeight)
        .then((crop) => (crop ? detectWinningTile(crop) : null))
        .catch((err) => {
          console.error('winner-crop detection failed:', err);
          return null; // fall back to coordinate bucketing below
        })
    : Promise.resolve(null);

  // Classify each viewfinder region independently. This gives the local
  // detector a clean tile run instead of asking it to segment the whole table.
  const predictions = (await Promise.all(
    Object.entries(withoutWinning(sections)).map(async ([key, box]) => {
      const pixelBox = pixelBoxFor(box, imgWidth, imgHeight);
      if (!pixelBox) return [];
      const crop = await sharp(buffer).extract(pixelBox).toBuffer();
      const expected = key === 'hand' ? handCount : key === 'dora' ? doraCount : undefined;
      const local = await detectTilesOnnx(crop.toString('base64'), pixelBox.width, pixelBox.height, expected);
      return local.map((prediction) => ({
        ...prediction,
        x: prediction.x + pixelBox.left,
        y: prediction.y + pixelBox.top,
      }));
    }),
  )).flat();

  const cropWinner = await winnerCropPromise;

  if (cropWinner) {
    // The winner is a physically separate tile: drop any full-frame detection
    // inside the winning box so it can't double-count into the hand, then
    // split the remaining regions without the winning key.
    const filtered = predictions.filter(
      (p) => !pointInBox(p.x, p.y, winningBox, imgWidth, imgHeight),
    );
    const split = splitBySection(filtered, withoutWinning(sections), imgWidth, imgHeight);
    split.winningTile = cropWinner;
    return split;
  }

  // Fallback: bucket region detections by section boxes.
  return splitBySection(predictions, sections, imgWidth, imgHeight);
}

function withoutWinning(sections) {
  const rest = { ...sections };
  delete rest.winning;
  return rest;
}

// Crop the normalized winning box out of the ORIGINAL frame (full camera
// resolution) so the focused pass sees the tile at its sharpest; sharp's
// extract happens before any downscaling.
async function cropForWinner(buffer, box, imgWidth, imgHeight) {
  const pixelBox = pixelBoxFor(box, imgWidth, imgHeight);
  if (!pixelBox) return null;
  return sharp(buffer)
    .rotate()
    .extract(pixelBox)
    .toBuffer();
}
