import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { detectTilesOnnx, warmUpOnnx } from './lib/onnx-detect.js'

const source = process.argv[2]
if (!source) throw new Error('Usage: tsx evaluate-reference-set.mts <reference-photo.jpg>')

const labels = [
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}m`), '5mr',
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}p`), '5pr',
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}s`), '5sr',
  '1z', '2z', '3z', '4z', '5z', '6z', '7z',
]

// Centre points for the supplied 3408×1994 reference layout. The crop leaves
// a small background margin so the production detector sees a realistic tile.
const columnCenters = [250, 585, 920, 1255, 1590, 1925, 2260, 2595, 2930, 3240]
const rowCenters = [320, 775, 1230, 1690]
const grid = labels.map((label, index) => {
  const row = index < 30 ? Math.floor(index / 10) : 3
  const column = index < 30 ? index % 10 : index - 30
  return { label, x: columnCenters[column], y: rowCenters[row] }
})

assert.equal(grid.length, 37)
const image = await readFile(source)
await warmUpOnnx()
let correct = 0

for (const { label, x, y } of grid) {
  const crop = await sharp(image)
    .extract({ left: x - 145, top: y - 205, width: 290, height: 410 })
    .jpeg()
    .toBuffer()
  const prediction = (await detectTilesOnnx(crop.toString('base64'), 290, 410, 1))[0]
  const actual = prediction?.class ?? 'none'
  if (actual === label) correct++
  console.log(`${label}\t${actual}\t${prediction?.confidence.toFixed(3) ?? '0.000'}`)
}

console.log(`Accuracy: ${correct}/37 (${Math.round((correct / 37) * 100)}%)`)
