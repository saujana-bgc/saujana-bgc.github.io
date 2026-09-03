import { detectTilesLlm, warmUpLlm } from '../lib/llm-detect.js';
import { parsePredictions } from '../lib/roboflow-parser.js';
import { splitBySection } from '../lib/sections.js';
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
    const predictions = await detectTilesLlm(body.image, imgWidth, imgHeight, expectedCount);

    // Individual mode: a flat tile list (hand / dora scanning).
    // Guided mode: optional section boxes (normalized 0..1) split one frame
    // into hand / winning / dora / meld groups; the image pixel size is
    // passed through so splitBySection can map boxes back to pixels.
    if (body.sections && Object.keys(body.sections).length > 0) {
      const split = splitBySection(
        predictions,
        body.sections,
        imgWidth,
        imgHeight,
      );
      return res.status(200).json({ mode: 'guided', ...split });
    }

    const tiles = parsePredictions(predictions);
    return res.status(200).json({ mode: 'individual', tiles });
  } catch (err) {
    console.error('detect failed:', err);
    return fail(res, 500, 'Detection failed');
  }
}
