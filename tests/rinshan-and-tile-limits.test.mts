import assert from 'node:assert/strict'
import test from 'node:test'
import { score } from '../utils/scoring/index.ts'
import { findMeldOptions, meldFromOption } from '../utils/scoring/meld-options.ts'
import { validateTileSet } from '../utils/scoring/tile-set.ts'
import type { Hand, Meld, Suit, Tile } from '../utils/scoring/types.ts'

const suited = (suit: Suit, value: number): Tile => ({
  suit,
  value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
})

const aka = (suit: Suit): Tile => ({ suit, value: 5, isAka: true })

const honor = (value: 'north'): Tile => ({ suit: 'honor', value: 'north' })

function baseHand(over: Partial<Hand>): Hand {
  return {
    closedTiles: [], melds: [], winningTile: suited('pin', 2), winType: 'tsumo',
    seatWind: 'south', roundWind: 'east', doraIndicators: [],
    riichi: false, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
    ...over,
  }
}

const kanMeld = (suit: Suit, value: number): Meld => ({
  type: 'kan-closed',
  tiles: [suited(suit, value), suited(suit, value), suited(suit, value), suited(suit, value)],
})

// ─── Rinshan kaihou requires a declared kan ───────────────────────────────────

test('tsumo with a kan and rinshan is valid and awards rinshan', () => {
  const closed = [
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('sou', 2), suited('sou', 3), suited('sou', 4), suited('sou', 2),
  ]
  const result = score(baseHand({
    closedTiles: closed,
    winningTile: suited('sou', 2),
    melds: [kanMeld('man', 1)],
    rinshan: true,
  }))

  assert.equal(result.valid, true)
  assert.equal(result.yaku.some((y) => y.name === 'rinshan'), true)
})

test('tsumo with an open kan also satisfies the rinshan kan requirement', () => {
  const closed = [
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('sou', 2), suited('sou', 3), suited('sou', 4), suited('sou', 2),
  ]
  const result = score(baseHand({
    closedTiles: closed,
    winningTile: suited('sou', 2),
    melds: [{ type: 'kan-open', tiles: [suited('man', 1), suited('man', 1), suited('man', 1), suited('man', 1)], calledTileIndex: 0 }],
    rinshan: true,
  }))

  assert.equal(result.valid, true)
  assert.equal(result.yaku.some((y) => y.name === 'rinshan'), true)
})

test('rinshan without any kan is rejected by the scoring engine', () => {
  const closed = [
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('sou', 2), suited('sou', 3), suited('sou', 4),
    suited('man', 2), suited('man', 3), suited('man', 4), suited('sou', 2),
  ]
  const result = score(baseHand({
    closedTiles: closed,
    winningTile: suited('sou', 2),
    melds: [],
    rinshan: true,
  }))

  assert.equal(result.valid, false)
  assert.match(result.error ?? '', /Rinshan requires a declared kan/)
})

test('ron with rinshan stays invalid even when a kan exists', () => {
  const closed = [
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('sou', 2), suited('sou', 3), suited('sou', 4), suited('sou', 2),
  ]
  const result = score(baseHand({
    closedTiles: closed,
    winningTile: suited('sou', 2),
    melds: [kanMeld('man', 1)],
    winType: 'ron',
    rinshan: true,
  }))

  assert.equal(result.valid, false)
  assert.match(result.error ?? '', /Rinshan requires tsumo/)
})

test('haitei and rinshan remain mutually exclusive', () => {
  const closed = [
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('sou', 2), suited('sou', 3), suited('sou', 4), suited('sou', 2),
  ]
  const result = score(baseHand({
    closedTiles: closed,
    winningTile: suited('sou', 2),
    melds: [kanMeld('man', 1)],
    haitei: true,
    rinshan: true,
  }))

  assert.equal(result.valid, false)
  assert.match(result.error ?? '', /Haitei and Rinshan/)
})

// ─── Global four-copy validation ─────────────────────────────────────────────

test('a red five plus three ordinary fives exhaust all four copies legally', () => {
  const tiles: Tile[] = [aka('pin'), suited('pin', 5), suited('pin', 5), suited('pin', 5)]
  assert.equal(validateTileSet(tiles, { playerCount: 4 }), null)
})

test('a fifth physical copy of a five is rejected regardless of aka split', () => {
  const fourCopies: Tile[] = [aka('pin'), suited('pin', 5), suited('pin', 5), suited('pin', 5)]
  const sameFace = (t: Tile) => t.suit === 'pin' && t.value === 5
  assert.equal(fourCopies.filter(sameFace).length, 4, 'aka and ordinary fives share the same physical pool')

  assert.match(
    validateTileSet([...fourCopies, suited('pin', 5)], { playerCount: 4 }) ?? '',
    /more than 4/,
  )
  assert.match(
    validateTileSet([...fourCopies, aka('pin')], { playerCount: 4 }) ?? '',
    /red five per suit/,
  )
})

test('meld creation cannot bypass the copy limit', () => {
  // Four fives in hand; declaring a pon leaves the rest in hand: still 4 total.
  const hand: Tile[] = [suited('pin', 5), aka('pin'), suited('pin', 5), suited('pin', 5)]
  const option = findMeldOptions(hand, 0, { allowChi: false }).find((o) => o.type === 'pon')
  assert.ok(option)

  const meld = meldFromOption(option!)
  const remaining = hand.filter((_, index) => !option!.indices.includes(index))
  const combined: Tile[] = [...remaining, ...meld.tiles]
  assert.equal(combined.length, hand.length, 'a meld moves tiles, it never creates them')
  assert.equal(validateTileSet(combined, { playerCount: 4 }), null)

  // A fifth copy entering the sheet anywhere is rejected.
  assert.match(
    validateTileSet([...combined, suited('pin', 5)], { playerCount: 4 }) ?? '',
    /more than 4/,
  )
})

test('sanma rejects the red five-man and the middle manzu tiles', () => {
  assert.match(validateTileSet([aka('man')], { playerCount: 3 }) ?? '', /no red five-man/)
  assert.match(validateTileSet([suited('man', 5)], { playerCount: 3 }) ?? '', /2–8 man removed/)
  assert.match(validateTileSet([suited('man', 2)], { playerCount: 3 }) ?? '', /2–8 man removed/)
  assert.equal(validateTileSet([aka('pin'), aka('sou')], { playerCount: 3 }), null, 'the two sanma red fives are legal')
})

test('sanma nuki dora plus North tiles cannot exceed four copies', () => {
  assert.match(
    validateTileSet([honor('north'), honor('north'), honor('north')], { playerCount: 3, nukiDoraCount: 2 }) ?? '',
    /four North tiles/,
  )
  assert.equal(validateTileSet([honor('north')], { playerCount: 3, nukiDoraCount: 3 }), null)
})

test('yonma allows three red fives but not a repeated suit', () => {
  assert.equal(validateTileSet([aka('man'), aka('pin'), aka('sou')], { playerCount: 4 }), null)
  assert.match(validateTileSet([aka('pin'), aka('pin')], { playerCount: 4 }) ?? '', /one red five per suit/)
  // Two red copies of the same suit trip the per-suit limit before the table total.
  assert.match(validateTileSet([aka('man'), aka('pin'), aka('sou'), aka('man')], { playerCount: 4 }) ?? '', /red five/)
})
