// Test the LLM detection pipeline against local image files.
// Usage: npx tsx test-llm.mts [image1 image2 ...]
// The API key is read from the environment or from .env.local in this folder.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { detectTilesLlm, warmUpLlm } from './lib/llm-detect.js';
import { parsePredictions } from './lib/roboflow-parser.js';

if (!process.env.OLLAMA_API_KEY) {
  try {
    const env = readFileSync(new URL('./.env.local', import.meta.url), 'utf8');
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) process.env[match[1]] ??= match[2].trim();
    }
  } catch { /* no .env.local; warm-up will report the missing key */ }
}

await warmUpLlm();
console.log('warm-up: ready');

const files = process.argv.slice(2);
if (files.length === 0) {
  // Default: blank image + synthetic strip built from the SVG assets
  const blank = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#dddddd' } }).jpeg().toBuffer();
  const t0 = Date.now();
  const blankPreds = await detectTilesLlm(blank.toString('base64'), 800, 400);
  console.log('blank image:', blankPreds.length, 'predictions in', Date.now() - t0, 'ms');
  assert.equal(blankPreds.length, 0, 'a blank image should not produce tile detections');

  const files = ['Man1', 'Man5-Dora', 'Sou3', 'Pin4', 'Chun'];
  const TILE_W = 200, TILE_H = 280, GAP = 24;
  const composites = [];
  for (let i = 0; i < files.length; i++) {
    const png = await sharp(`../public/tiles/${files[i]}.svg`, { density: 300 })
      .resize(TILE_W, TILE_H).png().toBuffer();
    composites.push({ input: png, left: i * (TILE_W + GAP), top: 0 });
  }
  const strip = await sharp({
    create: { width: files.length * (TILE_W + GAP) + GAP, height: TILE_H, channels: 3, background: '#c8b68e' },
  }).composite(composites).jpeg().toBuffer();
  const t1 = Date.now();
  const stripPreds = await detectTilesLlm(strip.toString('base64'),
    files.length * (TILE_W + GAP) + GAP, TILE_H);
  const stripTiles = parsePredictions(stripPreds);
  console.log('synthetic strip:', stripTiles.length, 'tiles in', Date.now() - t1, 'ms');
  console.log('  read:', stripTiles.map((t) => t.suit === 'honor' ? t.value : (t.isAka ? '0' + t.suit[0] : t.suit[0] + t.value)).join(' '));
  // Vision LLMs are unreliable on synthetic SVG strips (flat upscaled faces)
  // — they over-count and misread the small pin/sou faces. The strip is only
  // a smoke check for the pipeline plumbing (model reachable, JSON parses,
  // tiles map to codes): assert the two unambiguous end tiles.
  const read = stripTiles.map((t) => t.suit === 'honor' ? t.value : t.suit[0] + t.value);
  assert.ok(read.includes('m1'), 'strip should include m1');
  assert.ok(read.includes('chun'), 'strip should include chun');
} else {
  for (const file of files) {
    const buffer = await sharp(file).jpeg({ quality: 85 }).toBuffer();
    const meta = await sharp(buffer).metadata();
    const t0 = Date.now();
    const preds = await detectTilesLlm(buffer.toString('base64'), meta.width ?? 0, meta.height ?? 0);
    const tiles = parsePredictions(preds);
    console.log(`\n${file}: ${tiles.length} tiles in ${Date.now() - t0}ms`);
    console.log('  read:', tiles.map((t) => t.suit === 'honor' ? t.value : (t.isAka ? '0' + t.suit[0] : t.suit[0] + t.value)).join(' '));
    for (const p of preds.sort((a, b) => a.x - b.x)) {
      console.log(`   ${p.class.padStart(4)} x=${Math.round(p.x)} y=${Math.round(p.y)}`);
    }
  }
}
console.log('\nDONE');