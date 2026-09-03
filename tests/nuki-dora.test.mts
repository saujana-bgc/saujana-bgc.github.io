import assert from 'node:assert/strict'
import test from 'node:test'
import { score } from '../utils/scoring/index.ts'
import type { Hand, HonorValue, Suit, Tile } from '../utils/scoring/types.ts'

const suited = (suit: Suit, value: number): Tile => ({
  suit,
  value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
})

const honor = (value: HonorValue): Tile => ({ suit: 'honor', value })

function riichiHand(nukiDoraCount: number): Hand {
  const tiles: Tile[] = [
    suited('man', 1), suited('man', 2), suited('man', 3),
    suited('man', 2), suited('man', 3), suited('man', 4),
    suited('pin', 4), suited('pin', 5), suited('pin', 6),
    suited('sou', 6), suited('sou', 7), suited('sou', 8),
    suited('pin', 2), suited('pin', 2),
  ]

  return {
    closedTiles: tiles.slice(0, -1),
    melds: [],
    winningTile: tiles.at(-1)!,
    winType: 'ron',
    seatWind: 'south',
    roundWind: 'east',
    doraIndicators: [],
    nukiDoraCount,
    riichi: true,
    doubleRiichi: false,
    ippatsu: false,
    haitei: false,
    houtei: false,
    rinshan: false,
    chankan: false,
  }
}

test('nuki dora adds bonus han to a sanma hand', () => {
  const withoutNuki = score(riichiHand(0), { playerCount: 3, akaDoraCount: 2 })
  const withNuki = score(riichiHand(4), { playerCount: 3, akaDoraCount: 2 })

  assert.equal(withoutNuki.valid, true)
  assert.equal(withNuki.valid, true)
  assert.equal(withNuki.nukiDoraCount, 4)
  assert.ok(withNuki.points.total > withoutNuki.points.total)
})

test('nuki dora is capped at four and ignored in four-player mode', () => {
  const capped = score(riichiHand(99), { playerCount: 3, akaDoraCount: 2 })
  const yonma = score(riichiHand(4), { playerCount: 4, akaDoraCount: 3 })

  assert.equal(capped.nukiDoraCount, 4)
  assert.equal(yonma.nukiDoraCount, 0)
})

test('yakuhai results identify the dragon and wind role', () => {
  const tiles: Tile[] = [
    suited('man', 1), suited('man', 1), suited('man', 1),
    suited('man', 2), suited('man', 3), suited('man', 4),
    honor('east'), honor('east'), honor('east'),
    honor('haku'), honor('haku'), honor('haku'),
    suited('pin', 2), suited('pin', 2),
  ]
  const hand: Hand = {
    ...riichiHand(0),
    closedTiles: tiles.slice(0, -1),
    winningTile: tiles.at(-1)!,
    riichi: false,
  }

  const result = score(hand)
  const details = result.yaku.filter((yaku) => yaku.name === 'yakuhai').map((yaku) => yaku.detail)

  assert.equal(result.valid, true)
  assert.deepEqual(details.sort(), ['East (round wind)', 'White dragon'])
})

test('double-wind yakuhai identifies both roles and remains worth two han', () => {
  const tiles: Tile[] = [
    suited('man', 1), suited('man', 1), suited('man', 1),
    suited('man', 2), suited('man', 3), suited('man', 4),
    suited('pin', 4), suited('pin', 5), suited('pin', 6),
    honor('east'), honor('east'), honor('east'),
    suited('pin', 2), suited('pin', 2),
  ]
  const hand: Hand = {
    ...riichiHand(0),
    closedTiles: tiles.slice(0, -1),
    winningTile: tiles.at(-1)!,
    seatWind: 'east',
    roundWind: 'east',
    riichi: false,
  }

  const result = score(hand)
  const east = result.yaku.find((yaku) => yaku.name === 'yakuhai')

  assert.equal(result.valid, true)
  assert.equal(east?.detail, 'East (seat and round wind)')
  assert.equal(east?.han, 2)
})
