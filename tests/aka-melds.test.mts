import assert from 'node:assert/strict'
import test from 'node:test'
import { findMeldOptions, meldFromOption, removeMeldAt } from '../utils/scoring/meld-options.ts'
import { isAkaDora, isSuited } from '../utils/scoring/tiles.ts'
import { score } from '../utils/scoring/index.ts'
import type { Hand, HonorValue, Meld, Suit, Tile } from '../utils/scoring/types.ts'

const suited = (suit: Suit, value: number): Tile => ({
  suit,
  value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
})

const aka = (suit: Suit): Tile => ({ suit, value: 5, isAka: true })

const honor = (value: HonorValue): Tile => ({ suit: 'honor', value })

/** Face value of a suited tile, with aka fives written as 0 (riichi notation). */
function faceOf(tile: Tile | undefined): number {
  if (!tile || !isSuited(tile)) throw new Error('expected a suited tile')
  return tile.isAka ? 0 : tile.value
}

function akaTileAt(tiles: readonly Tile[], index: number): boolean {
  const tile = tiles.at(index)
  assert.ok(tile, `expected a tile at index ${index}`)
  return isAkaDora(tile)
}

function baseHand(over: Partial<Hand>): Hand {
  return {
    closedTiles: [], melds: [], winningTile: suited('pin', 2), winType: 'ron',
    seatWind: 'south', roundWind: 'east', doraIndicators: [],
    riichi: false, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
    ...over,
  }
}

test('held red five moved into a chi stays red', () => {
  // Player holds 3p + 0p and calls 4p: tap the 4p they claimed.
  const hand: Tile[] = [suited('pin', 3), aka('pin'), suited('pin', 4)]
  const options = findMeldOptions(hand, 2, { allowChi: true })
  const chi = options.find((option) => option.type === 'chi')

  assert.ok(chi, 'a chi option using 3p 0p 4p must exist')
  assert.deepEqual(chi.tiles.map(faceOf), [4, 3, 0])
  assert.equal(chi.tiles.at(2), hand.at(1), 'the meld must reference the actual red five object')
  assert.equal(chi.calledTileIndex, 0, 'the tapped tile is the claimed discard')

  const meld = meldFromOption(chi)
  assert.equal(meld.type, 'chi')
  assert.equal(meld.calledTileIndex, 0)
  assert.equal(akaTileAt(meld.tiles, 2), true)
})

test('held red five moved into a pon stays red', () => {
  const hand: Tile[] = [aka('man'), suited('man', 5), suited('man', 5)]
  const options = findMeldOptions(hand, 0, { allowChi: true })
  const pon = options.find((option) => option.type === 'pon')

  assert.ok(pon, '0m 5m 5m must offer a pon')
  assert.equal(akaTileAt(pon.tiles, 0), true)
  assert.deepEqual(pon.tiles.map(faceOf), [0, 5, 5])
})

test('called red five pon (0s claimed over two ordinary fives) counts aka dora', () => {
  const hand: Tile[] = [suited('sou', 5), suited('sou', 5), aka('sou')]
  const options = findMeldOptions(hand, 2, { allowChi: true })
  const pon = options.find((option) => option.type === 'pon')

  assert.ok(pon, 'the claimed 0s must complete a pon with 5s 5s')
  const meld = meldFromOption(pon)
  assert.deepEqual(meld.tiles.map(faceOf), [0, 5, 5])

  const result = score(baseHand({
    melds: [meld],
    closedTiles: [honor('haku'), honor('haku'), honor('haku'), suited('pin', 2), suited('pin', 3), suited('pin', 4), suited('pin', 6), suited('pin', 7), suited('pin', 8), suited('sou', 2)],
    winningTile: suited('sou', 2),
  }))
  assert.equal(result.valid, true)
  assert.equal(result.akaDoraCount, 1, 'called red five in the pon must count aka dora +1')
})

test('called red five chi (0p claimed over 3p 4p) counts aka dora', () => {
  const hand: Tile[] = [suited('pin', 3), suited('pin', 4), aka('pin')]
  const options = findMeldOptions(hand, 2, { allowChi: true })
  const chi = options.find((option) => {
    if (option.type !== 'chi') return false
    return option.tiles.every((t) => isSuited(t) && t.suit === 'pin')
      && [...option.tiles].map(faceOf).sort().join() === '0,3,4'
  })

  assert.ok(chi, 'the claimed 0p must complete a chi with 3p 4p')
  const meld = meldFromOption(chi)

  const result = score(baseHand({
    melds: [meld],
    closedTiles: [suited('sou', 2), suited('sou', 3), suited('sou', 4), suited('sou', 6), suited('sou', 7), suited('sou', 8), suited('pin', 2), suited('pin', 3), suited('pin', 4), suited('pin', 6)],
    winningTile: suited('pin', 6),
  }))
  assert.equal(result.valid, true)
  assert.equal(result.akaDoraCount, 1, 'called red five in the chi must count aka dora +1')
})

test('called red five in an open kan counts aka dora', () => {
  // All four 5-pin copies: three ordinary held + the red copy claimed.
  const hand: Tile[] = [suited('pin', 5), suited('pin', 5), suited('pin', 5), aka('pin')]
  const options = findMeldOptions(hand, 3, { allowChi: true })
  const openKan = options.find((option) => option.type === 'kan-open')

  assert.ok(openKan, 'the claimed 0p must complete an open kan')
  const meld = meldFromOption(openKan)
  assert.deepEqual(meld.tiles.map(faceOf), [0, 5, 5, 5])

  const result = score(baseHand({
    melds: [meld],
    closedTiles: [honor('haku'), honor('haku'), honor('haku'), suited('sou', 2), suited('sou', 3), suited('sou', 4), suited('sou', 6), suited('sou', 7), suited('sou', 8), suited('pin', 2)],
    winningTile: suited('pin', 2),
  }))
  assert.equal(result.valid, true)
  assert.equal(result.akaDoraCount, 1, 'called red five in the open kan must count aka dora +1')
})

test('held red five chi scores aka dora through the real scoring flow', () => {
  // Scenario A: hand contains 3p + 0p, call 4p -> meld must read 3p 4p 0p.
  const hand: Tile[] = [suited('pin', 3), aka('pin'), suited('pin', 4)]
  const chi = findMeldOptions(hand, 2, { allowChi: true }).find((option) => option.type === 'chi')
  assert.ok(chi)
  const meld = meldFromOption(chi)
  // Meld order: the claimed discard first, then the tiles taken from the hand.
  assert.deepEqual(meld.tiles.map(faceOf), [4, 3, 0])

  const result = score(baseHand({
    melds: [meld],
    closedTiles: [suited('sou', 2), suited('sou', 3), suited('sou', 4), suited('sou', 6), suited('sou', 7), suited('sou', 8), suited('pin', 2), suited('pin', 3), suited('pin', 4), suited('pin', 6)],
    winningTile: suited('pin', 6),
  }))
  assert.equal(result.valid, true)
  assert.equal(result.akaDoraCount, 1)
  assert.equal(result.yaku.some((y) => y.name === 'tanyao'), true, 'a red five is still a simple tile: tanyao holds')
})

test('an ordinary five never becomes aka', () => {
  const hand: Tile[] = [suited('sou', 5), suited('sou', 5), suited('sou', 5)]
  const pon = findMeldOptions(hand, 0, { allowChi: true }).find((option) => option.type === 'pon')
  assert.ok(pon)
  const meld = meldFromOption(pon)

  assert.equal(meld.tiles.some(isAkaDora), false)

  const result = score(baseHand({
    melds: [meld],
    closedTiles: [honor('haku'), honor('haku'), honor('haku'), suited('pin', 2), suited('pin', 3), suited('pin', 4), suited('pin', 6), suited('pin', 7), suited('pin', 8), suited('sou', 2)],
    winningTile: suited('sou', 2),
  }))
  assert.equal(result.valid, true)
  assert.equal(result.akaDoraCount, 0)
})

test('a pon option may mix the red copy with ordinary fives', () => {
  // Holding 5p 0p 5p and tapping an ordinary 5p: the meld uses all real copies.
  const hand: Tile[] = [suited('pin', 5), aka('pin'), suited('pin', 5)]
  const pon = findMeldOptions(hand, 0, { allowChi: true }).find((option) => option.type === 'pon')
  assert.ok(pon)
  const meld = meldFromOption(pon)

  assert.deepEqual(meld.tiles.map(faceOf), [5, 0, 5])
  assert.equal(meld.tiles.filter(isAkaDora).length, 1, 'exactly the held red copy is aka')
})

test('closed kan options keep every held tile including a red five', () => {
  const hand: Tile[] = [suited('sou', 5), suited('sou', 5), suited('sou', 5), aka('sou')]
  const options = findMeldOptions(hand, 0, { allowChi: false })
  const closedKan = options.find((option) => option.type === 'kan-closed')

  assert.ok(closedKan, 'four identical tiles offer a closed kan')
  assert.equal(closedKan.calledTileIndex, undefined, 'a concealed kan has no called tile')
  assert.deepEqual(closedKan.tiles.map(faceOf), [5, 5, 5, 0])
  const meld = meldFromOption(closedKan)
  assert.equal(meld.calledTileIndex, undefined)
  assert.equal(akaTileAt(meld.tiles, 3), true)
})

test('chi options are not offered when chi is not allowed (sanma)', () => {
  const hand: Tile[] = [suited('pin', 3), suited('pin', 4), suited('pin', 5)]
  const options = findMeldOptions(hand, 2, { allowChi: false })

  assert.equal(options.some((option) => option.type === 'chi'), false)
})

test('meld options only reference distinct in-hand tiles (no fabricated copies)', () => {
  const hand: Tile[] = [suited('pin', 3), aka('pin'), suited('pin', 4), suited('sou', 5), suited('sou', 5), suited('sou', 5)]
  for (let selected = 0; selected < hand.length; selected++) {
    for (const option of findMeldOptions(hand, selected, { allowChi: true })) {
      assert.equal(new Set(option.indices).size, option.indices.length, 'indices must be distinct')
      assert.equal(option.indices.length, option.tiles.length)
      option.indices.forEach((index, position) => {
        assert.ok(index >= 0 && index < hand.length, 'indices must be in hand range')
        assert.equal(option.tiles.at(position), hand.at(index), 'tiles must be the actual hand objects')
      })
    }
  }
})

test('removing a meld returns its actual tiles (red five included) to the hand', () => {
  const declared: Meld = { type: 'pon', tiles: [aka('pin'), suited('pin', 5), suited('pin', 5)], calledTileIndex: 0 }
  const handTiles: Tile[] = [suited('sou', 2)]

  const next = removeMeldAt(handTiles, [declared], 0)
  assert.ok(next)
  assert.equal(next.melds.length, 0)
  assert.equal(next.handTiles.length, 4)
  assert.ok(next.handTiles.includes(declared.tiles[0]), 'the exact aka tile object returns to the hand')
  assert.equal(next.handTiles.filter(isAkaDora).length, 1)
})

test('removing an out-of-range meld is a no-op', () => {
  assert.equal(removeMeldAt([], [], 3), null)
})
