import assert from 'node:assert/strict'
import test from 'node:test'
import { score } from '../utils/scoring/index.ts'
import { combinedDoraIndicatorCount, doraIndicatorRowCount, splitCombinedDoraIndicators } from '../utils/scoring/dora-indicators.ts'
import type { Hand, HonorValue, Suit, Tile } from '../utils/scoring/types.ts'

const suited = (suit: Suit, value: number): Tile => ({
  suit,
  value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
})

const honor = (value: HonorValue): Tile => ({ suit: 'honor', value })

function hand(overrides: Partial<Hand>): Hand {
  return {
    closedTiles: [],
    winningTile: suited('man', 1),
    melds: [],
    winType: 'ron',
    seatWind: 'south',
    roundWind: 'east',
    doraIndicators: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    haitei: false,
    houtei: false,
    rinshan: false,
    chankan: false,
    ...overrides,
  }
}

test('combined dora input splits omote and ura rows from kan count and riichi', () => {
  const indicators = [suited('man', 1), suited('man', 2), suited('pin', 3), suited('sou', 4), suited('pin', 5), suited('sou', 6)]

  assert.deepEqual(splitCombinedDoraIndicators(indicators, 2, true), {
    omote: indicators.slice(0, 3),
    ura: indicators.slice(3, 6),
  })
  assert.deepEqual(splitCombinedDoraIndicators(indicators, 2, false), {
    omote: indicators.slice(0, 3),
    ura: [],
  })
  assert.equal(doraIndicatorRowCount(2), 3)
  assert.equal(combinedDoraIndicatorCount(2, false), 3)
  assert.equal(combinedDoraIndicatorCount(2, true), 6)
})

test('SRL double-yakuman forms are worth two yakuman units', () => {
  const kokushiOrphans: Tile[] = [
    suited('man', 1), suited('man', 9), suited('pin', 1), suited('pin', 9), suited('sou', 1), suited('sou', 9),
    honor('east'), honor('south'), honor('west'), honor('north'), honor('haku'), honor('hatsu'), honor('chun'),
  ]
  const kokushi = score(hand({ closedTiles: kokushiOrphans, winningTile: suited('man', 1) }), { doubleYakuman: true })
  assert.equal(kokushi.valid, true)
  assert.equal(kokushi.yaku.find((y) => y.name === 'kokushi')?.han, 26)

  const suuankou = score(hand({
    closedTiles: [
      suited('man', 1), suited('man', 1), suited('man', 1),
      suited('pin', 2), suited('pin', 2), suited('pin', 2),
      suited('sou', 3), suited('sou', 3), suited('sou', 3),
      suited('sou', 4), suited('sou', 4), suited('sou', 4),
      honor('east'),
    ],
    winningTile: honor('east'),
  }), { doubleYakuman: true })
  assert.equal(suuankou.valid, true)
  assert.equal(suuankou.yaku.find((y) => y.name === 'suuankou')?.han, 26)

  const chuurenBase = [1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9].map((value) => suited('pin', value))
  const chuuren = score(hand({ closedTiles: chuurenBase, winningTile: suited('pin', 5) }), { doubleYakuman: true })
  assert.equal(chuuren.valid, true)
  assert.equal(chuuren.yaku.find((y) => y.name === 'chuurenpoutou')?.han, 26)

  const windPon = (value: HonorValue) => ({ type: 'pon' as const, tiles: [honor(value), honor(value), honor(value)] as [Tile, Tile, Tile] })
  const daisuushi = score(hand({
    closedTiles: [suited('pin', 2)],
    winningTile: suited('pin', 2),
    melds: [windPon('east'), windPon('south'), windPon('west'), windPon('north')],
  }), { doubleYakuman: true })
  assert.equal(daisuushi.valid, true)
  assert.equal(daisuushi.yaku.find((y) => y.name === 'daisuushi')?.han, 26)
})
