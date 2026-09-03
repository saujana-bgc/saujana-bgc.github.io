// Verify the full detect pipeline: realistic synthetic tiles + real photo crop.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { detectTiles } from './lib/detect.js';
import { parsePredictions } from './lib/roboflow-parser.js';

// 1) synthetic strip with white tile bodies
const files = ['Man2', 'Man3', 'Man4', 'Pin5', 'Pin6', 'Pin7', 'Sou1', 'Sou2', 'Sou3'];
const TILE_W = 200, TILE_H = 280, GAP = 24;
const composites = [];
for (let i = 0; i < files.length; i++) {
  const x = i * (TILE_W + GAP);
  const body = Buffer.from(`<svg width="${TILE_W}" height="${TILE_H}"><rect x="4" y="4" width="${TILE_W - 8}" height="${TILE_H - 8}" rx="18" fill="#f7f3e6" stroke="#d8d2c0" stroke-width="3"/></svg>`);
  composites.push({ input: body, left: x, top: 0 });
  const face = await sharp(`../public/tiles/${files[i]}.svg`, { density: 300 })
    .resize(TILE_W - 48, TILE_H - 48).png().toBuffer();
  composites.push({ input: face, left: x + 24, top: 24 });
}
const strip = await sharp({
  create: { width: files.length * (TILE_W + GAP), height: TILE_H, channels: 3, background: '#5a6a4f' },
})
  .composite(composites).jpeg().toBuffer();

const stripPreds = parsePredictions(await detectTiles(strip));
console.log('SYNTHETIC STRIP:', stripPreds.map((p) => p.suit[0] + p.value).join(' '));
assert.equal(stripPreds.length, files.length, 'all synthetic tiles should be detected');

// 2) real photo (single-tile-ish crop)
const photo = await fetch('https://commons.wikimedia.org/wiki/Special:FilePath/Mahjong%20Tiles%20(2).jpg?width=1280', { redirect: 'follow' })
  .then((r) => r.arrayBuffer()).then((b) => Buffer.from(b));
const crop = await sharp(photo).extract({ left: 40, top: 300, width: 220, height: 300 }).jpeg().toBuffer();
const cropPreds = await detectTiles(crop);
console.log('REAL CROP predictions >= 0.45:', cropPreds.length);
console.log(cropPreds.slice(0, 10).map((p) => `${p.class}@${p.confidence.toFixed(2)}`).join(' '));
assert.ok(cropPreds.length > 0, 'real mahjong photo crop should produce tile detections');
