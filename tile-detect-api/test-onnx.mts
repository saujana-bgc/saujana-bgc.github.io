import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import sharp from 'sharp';
import { detectTilesOnnx, warmUpOnnx } from './lib/onnx-detect.js';

test('model loads and blank images contain no tiles', async () => {
  await warmUpOnnx();
  const blank = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#777777' } })
    .png()
    .toBuffer();
  const result = await detectTilesOnnx(blank.toString('base64'), 640, 480);
  assert.deepEqual(result, []);
});

test('expected count produces one ordered prediction per physical tile', async () => {
  const width = 120;
  const tileHeight = 76;
  const count = 14;
  const strip = await sharp({
    create: { width, height: tileHeight * count, channels: 3, background: '#777777' },
  })
    .composite(Array.from({ length: count }, (_, index) => ({
      input: {
        create: { width: 104, height: tileHeight - 2, channels: 3, background: '#eee5c8' },
      },
      left: 8,
      top: index * tileHeight + 1,
    })))
    .png()
    .toBuffer();
  const predictions = await detectTilesOnnx(strip.toString('base64'), width, tileHeight * count, count);
  assert.equal(predictions.length, count);
  assert.ok(predictions.every((prediction) => prediction.x > 0 && prediction.y > 0));
  assert.ok(predictions.every((prediction, index) => index === 0 || prediction.y > predictions[index - 1].y));
});

test('classifies exact project artwork including aka and ordinary sou five', async () => {
  const cases = [
    ['Man1.svg', '1m'],
    ['Pin4.svg', '4p'],
    ['Sou5-Dora.svg', '5sr'],
    ['Sou5.svg', '5s'],
    ['Pin1.svg', '1p'],
    ['Sou1.svg', '1s'],
  ] as const;
  const tileWidth = 120;
  const tileHeight = 80;
  const tiles = await Promise.all(cases.map(async ([file]) => {
    const svg = await fs.readFile(new URL(`../public/tiles/${file}`, import.meta.url));
    const art = await sharp(svg).resize(64, 94, { fit: 'contain' }).png().toBuffer();
    const portrait = await sharp({ create: { width: 80, height: 120, channels: 3, background: '#eee5c8' } })
      .composite([{ input: art, gravity: 'center' }])
      .png()
      .toBuffer();
    return sharp(portrait).rotate(90).png().toBuffer();
  }));
  const strip = await sharp({ create: { width: tileWidth, height: tileHeight * tiles.length, channels: 3, background: '#777777' } })
    .composite(tiles.map((input, index) => ({ input, left: 0, top: index * tileHeight })))
    .png()
    .toBuffer();
  const predictions = await detectTilesOnnx(strip.toString('base64'), tileWidth, tileHeight * tiles.length, tiles.length);
  assert.deepEqual(predictions.map((prediction) => prediction.class), cases.map(([, label]) => label));
});
