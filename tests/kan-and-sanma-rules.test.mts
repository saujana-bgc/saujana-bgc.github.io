import assert from 'node:assert/strict'
import test from 'node:test'
import { score } from '../utils/scoring/index.ts'
import { countDora, doraFromIndicator } from '../utils/scoring/tiles.ts'
import type { Hand, Suit, Tile } from '../utils/scoring/types.ts'

const suited = (suit: Suit, value: number): Tile => ({
  suit,
  value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
})

test('a completed hand with one kan has eleven concealed tiles', () => {
  const closed: Tile[] = [
    suited('pin', 2), suited('pin', 3), suited('pin', 4),
    suited('pin', 3), suited('pin', 4), suited('pin', 5),
    suited('sou', 6), suited('sou', 7), suited('sou', 8),
    suited('sou', 2),
  ]
  const hand: Hand = {
    closedTiles: closed,
    winningTile: suited('sou', 2),
    melds: [{ type: 'kan-closed', tiles: [suited('man', 1), suited('man', 1), suited('man', 1), suited('man', 1)] }],
    winType: 'ron', seatWind: 'south', roundWind: 'east', doraIndicators: [],
    riichi: true, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
  }

  const result = score(hand)
  assert.equal(result.valid, true)
})

test('sanma manzu dora indicators cycle directly between one and nine', () => {
  assert.deepEqual(doraFromIndicator(suited('man', 1), 3), suited('man', 9))
  assert.deepEqual(doraFromIndicator(suited('man', 9), 3), suited('man', 1))
  assert.equal(countDora([suited('man', 9)], [suited('man', 1)], 3), 1)
  assert.equal(countDora([suited('man', 2)], [suited('man', 1)], 3), 0)
})

test('pao assigns a daisangen payment to the responsible player', () => {
  const dragonPon = (value: 'haku' | 'hatsu' | 'chun') => ({
    type: 'pon' as const,
    tiles: [{ suit: 'honor' as const, value }, { suit: 'honor' as const, value }, { suit: 'honor' as const, value }],
  })
  const hand: Hand = {
    closedTiles: [suited('man', 1), suited('man', 2), suited('man', 3), suited('pin', 2)],
    winningTile: suited('pin', 2),
    melds: [dragonPon('haku'), dragonPon('hatsu'), dragonPon('chun')],
    winType: 'tsumo', seatWind: 'south', roundWind: 'east', doraIndicators: [], pao: true,
    riichi: false, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
  }

  const result = score(hand)
  assert.equal(result.valid, true)
  assert.equal(result.points.responsiblePays, result.points.total)
})
