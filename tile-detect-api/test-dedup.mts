import assert from 'node:assert/strict';
import test from 'node:test';
import { deduplicateSpatialEchoes, type LlmTile } from './lib/llm-detect.js';

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
