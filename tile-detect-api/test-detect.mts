// Sanity test for the detection pipeline (blank + synthetic strip).
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { detectTiles, warmUpDetector } from './lib/detect.js';

await warmUpDetector();
await warmUpDetector(); // cached: repeated readiness checks must share one warm-up
console.log('warm-up: ready');

const blank = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#dddddd' } }).jpeg().toBuffer();
const t0 = Date.now();
const blankPreds = await detectTiles(blank);
console.log('blank image:', blankPreds.length, 'predictions in', Date.now() - t0, 'ms');
assert.equal(blankPreds.length, 0, 'a blank image should not produce tile detections');

// synthetic row of tiles from the SVG assets
const files = ['Man2', 'Man3', 'Man4', 'Pin5', 'Pin6', 'Pin7', 'Sou1', 'Sou2', 'Sou3'];
const TILE_W = 200, TILE_H = 280;
const composites = [];
for (let i = 0; i < files.length; i++) {
  const png = await sharp(`../public/tiles/${files[i]}.svg`, { density: 300 })
    .resize(TILE_W, TILE_H).png().toBuffer();
  composites.push({ input: png, left: i * TILE_W, top: 0 });
}
const strip = await sharp({ create: { width: TILE_W * files.length, height: TILE_H, channels: 3, background: '#c8b68e' } })
  .composite(composites).jpeg().toBuffer();
const t1 = Date.now();
const stripPreds = await detectTiles(strip);
console.log('tile strip:', stripPreds.length, 'predictions in', Date.now() - t1, 'ms');
assert.ok(stripPreds.length > 0, 'synthetic tile strip should produce at least one detection');
