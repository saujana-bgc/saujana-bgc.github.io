import assert from 'node:assert/strict';
import test from 'node:test';
import { deduplicateSpatialEchoes, type LlmTile } from './lib/llm-detect.js';
import { pixelBoxFor, pointInBox } from './lib/section-box.js';

test('preserves adjacent physical copies in a seven-pairs hand', () => {
  const codes = ['1m', '2m', '3p', '4p', '5s', '6s', '7z'];
  const tiles: LlmTile[] = codes.flatMap((code, pairIndex) => [0, 1].map((copy) => ({
    code,
    aka: false,
    x: 0.05 + (pairIndex * 2 + copy) * 0.065,
    y: 0.5,
  })));

  assert.equal(deduplicateSpatialEchoes(tiles, 1400, 400).length, 14);
});

test('still removes a near-identical model echo', () => {
  const tiles: LlmTile[] = [
    { code: '5p', aka: false, x: 0.4, y: 0.5 },
    { code: '5p', aka: false, x: 0.402, y: 0.503 },
    { code: '5p', aka: false, x: 0.465, y: 0.5 },
  ];

  const deduplicated = deduplicateSpatialEchoes(tiles, 1400, 400);
  assert.equal(deduplicated.length, 2);
  assert.equal(deduplicated[1], tiles[2]);
});

// ─── Section-box crop geometry ────────────────────────────────────────────────

test('pixelBoxFor converts a normalized box to padded pixel bounds', () => {
  // The guided landscape winning box: x:0.76 y:0.47 w:0.19 h:0.28
  const box = pixelBoxFor({ x: 0.76, y: 0.47, w: 0.19, h: 0.28 }, 1920, 1080);
  assert.ok(box);
  // 2% pad on every side: 0.74..0.97 of 1920, 0.45..0.77 of 1080
  assert.equal(box.left, Math.round(0.74 * 1920));
  assert.equal(box.top, Math.round(0.45 * 1080));
  assert.equal(box.width, Math.round(0.97 * 1920) - Math.round(0.74 * 1920));
  assert.equal(box.height, Math.round(0.77 * 1080) - Math.round(0.45 * 1080));
});

test('pixelBoxFor clamps boxes that run past the image edges', () => {
  const box = pixelBoxFor({ x: 0.95, y: 0.02, w: 0.2, h: 0.2 }, 1000, 500);
  assert.ok(box);
  assert.equal(box.left + box.width, 1000);
  assert.equal(box.top, 0);
  assert.ok(box.width > 0 && box.height > 0);
});

test('pixelBoxFor rejects degenerate boxes', () => {
  assert.equal(pixelBoxFor({ x: 0.5, y: 0.5, w: 0, h: 0.2 }, 1000, 500), null);
  assert.equal(pixelBoxFor({ x: 0.5, y: 0.5, w: 0.2, h: 0.2 }, 0, 0), null);
  assert.equal(pixelBoxFor({ x: NaN, y: 0.5, w: 0.2, h: 0.2 }, 1000, 500), null);
  // Entirely outside the frame clamps down to nothing.
  assert.equal(pixelBoxFor({ x: 1.5, y: 0.5, w: 0.2, h: 0.2 }, 1000, 500), null);
});

test('pointInBox matches splitBySection bucketing with the same pad', () => {
  const box = { x: 0.76, y: 0.47, w: 0.19, h: 0.28 };
  const imgW = 1536, imgH = 864;
  // Center of the box: clearly inside.
  assert.ok(pointInBox(0.855 * imgW, 0.61 * imgH, box, imgW, imgH));
  // Just past the unpadded edge but within the 2% pad: still inside.
  assert.ok(pointInBox(0.97 * imgW, 0.61 * imgH, box, imgW, imgH));
  // Beyond the padded edge: outside.
  assert.ok(!pointInBox(0.98 * imgW, 0.61 * imgH, box, imgW, imgH));
  assert.ok(!pointInBox(0.5 * imgW, 0.61 * imgH, box, imgW, imgH));
});
