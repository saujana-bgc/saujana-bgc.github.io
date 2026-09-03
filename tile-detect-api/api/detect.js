import { detectTilesLlm, detectWinningTile, warmUpLlm } from '../lib/llm-detect.js';
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
      await warmUpLlm();
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
    // The LLM reports normalized coordinates; they are mapped onto the
    // original image's pixel size so the guided-mode section boxes (which the
    // client draws against this same size) align with detections.
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

    // Individual mode: a flat tile list (hand / dora scanning).
    // Guided mode: optional section boxes (normalized 0..1) split one frame
    // into hand / winning / dora / meld groups; the image pixel size is
    // passed through so splitBySection can map boxes back to pixels.
    if (body.sections && Object.keys(body.sections).length > 0) {
      const guided = await detectGuided(body, buffer, imgWidth, imgHeight, handCount);
      return res.status(200).json({ mode: 'guided', ...guided });
    }

    const predictions = await detectTilesLlm(body.image, imgWidth, imgHeight, expectedCount);
    const tiles = parsePredictions(predictions);
    return res.status(200).json({ mode: 'individual', tiles });
  } catch (err) {
    console.error('detect failed:', err);
    return fail(res, 500, 'Detection failed');
  }
}

// Guided scan. The winning tile gets a dedicated close-up pass: the winning
// section box is cropped from the original frame and read by a focused
// single-tile LLM call in parallel with the full-frame scan, so the winner is
// whatever is inside the viewfinder box rather than whichever full-frame
// detection happened to land in the box by its approximate coordinates.
async function detectGuided(body, buffer, imgWidth, imgHeight, handCount) {
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

  // The hand row is the one region whose count we know up front; ask the
  // model to hit it and retry once with a different seed if the split comes
  // back short or long (same corrective pattern as expectedCount scans).
  let predictions = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    predictions = await detectTilesLlm(
      body.image,
      imgWidth,
      imgHeight,
      undefined,
      handCount,
    );
    if (!handCount) break;
    const split = splitBySection(predictions, withoutWinning(sections), imgWidth, imgHeight);
    if (split.hand.length === handCount) break;
    console.error(`guided hand count ${split.hand.length} != ${handCount}, retrying`);
  }

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

  // Fallback: today's behavior — bucket full-frame detections by section
  // boxes, winner = first detection inside the winning box.
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
    .rotate() // match the orientation detectTilesLlm applies before measuring
    .extract(pixelBox)
    .toBuffer();
}
