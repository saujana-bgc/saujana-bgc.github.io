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

test('two and four kans retain the normal logical hand size', () => {
  const kan = (suit: Suit, value: number) => ({
    type: 'kan-closed' as const,
    tiles: [suited(suit, value), suited(suit, value), suited(suit, value), suited(suit, value)] as [Tile, Tile, Tile, Tile],
  })
  const twoKan: Hand = {
    closedTiles: [suited('pin', 2), suited('pin', 3), suited('pin', 4), suited('sou', 6), suited('sou', 7), suited('sou', 8), suited('sou', 2)],
    winningTile: suited('sou', 2), melds: [kan('man', 1), kan('man', 9)],
    winType: 'ron', seatWind: 'south', roundWind: 'east', doraIndicators: [],
    riichi: true, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
  }
  assert.equal(score(twoKan).valid, true)

  const fourKan: Hand = {
    closedTiles: [suited('pin', 2)], winningTile: suited('pin', 2),
    melds: [kan('man', 1), kan('man', 9), kan('pin', 1), kan('sou', 1)],
    winType: 'tsumo', seatWind: 'south', roundWind: 'east', doraIndicators: [],
    riichi: true, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
  }
  assert.equal(score(fourKan).valid, true)
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
    winType: 'tsumo', seatWind: 'south', roundWind: 'east', doraIndicators: [],
    riichi: false, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
  }

  const withoutPao = score(hand)
  const withPao = score({ ...hand, pao: true })
  assert.equal(withoutPao.valid, true)
  assert.equal(withoutPao.points.responsiblePays, undefined)
  assert.equal(withPao.points.responsiblePays, withPao.points.total)
})

test('pao applies to daisuushii but not unrelated yakuman', () => {
  const windPon = (value: 'east' | 'south' | 'west' | 'north') => ({
    type: 'pon' as const,
    tiles: [{ suit: 'honor' as const, value }, { suit: 'honor' as const, value }, { suit: 'honor' as const, value }],
  })
  const daisuushii: Hand = {
    closedTiles: [suited('pin', 2)], winningTile: suited('pin', 2),
    melds: [windPon('east'), windPon('south'), windPon('west'), windPon('north')],
    winType: 'tsumo', seatWind: 'south', roundWind: 'east', doraIndicators: [], pao: true,
    riichi: false, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
  }
  const result = score(daisuushii)
  assert.equal(result.valid, true)
  assert.equal(result.points.responsiblePays, result.points.total)

  const unrelated: Hand = { ...daisuushii, melds: [{ type: 'kan-closed', tiles: [suited('man', 1), suited('man', 1), suited('man', 1), suited('man', 1)] }, { type: 'kan-closed', tiles: [suited('man', 9), suited('man', 9), suited('man', 9), suited('man', 9)] }, { type: 'kan-closed', tiles: [suited('pin', 1), suited('pin', 1), suited('pin', 1), suited('pin', 1)] }, { type: 'kan-closed', tiles: [suited('sou', 1), suited('sou', 1), suited('sou', 1), suited('sou', 1)] }] }
  assert.equal(score(unrelated).points.responsiblePays, undefined)
})

test('special-win conflicts are rejected by the scoring engine', () => {
  const malformed: Hand = {
    closedTiles: [], winningTile: suited('pin', 1), melds: [], winType: 'tsumo', seatWind: 'south', roundWind: 'east', doraIndicators: [],
    riichi: false, doubleRiichi: false, ippatsu: false, haitei: true, houtei: false, rinshan: true, chankan: false,
  }
  assert.match(score(malformed).error ?? '', /Haitei and Rinshan/)
  assert.match(score({ ...malformed, haitei: false, rinshan: false, houtei: true }).error ?? '', /Houtei requires ron/)
})

test('aka and ura dora are counted separately and ura needs riichi', () => {
  const tiles: Tile[] = [
    suited('man', 1), suited('man', 2), suited('man', 3),
    suited('pin', 4), { suit: 'pin', value: 5, isAka: true }, suited('pin', 6),
    suited('sou', 6), suited('sou', 7), suited('sou', 8),
    suited('pin', 2), suited('pin', 2), suited('sou', 3), suited('sou', 4), suited('sou', 5),
  ]
  const hand: Hand = {
    closedTiles: tiles.slice(0, -1), winningTile: tiles.at(-1)!, melds: [], winType: 'ron', seatWind: 'south', roundWind: 'east',
    doraIndicators: [suited('pin', 4)], uraDoraIndicators: [suited('sou', 2)],
    riichi: true, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
  }
  const riichi = score(hand)
  assert.equal(riichi.valid, true)
  assert.equal(riichi.doraCount, 1)
  assert.equal(riichi.akaDoraCount, 1)
  assert.equal(riichi.uraDoraCount, 1)
  assert.equal(score({ ...hand, riichi: false }).uraDoraCount, 0)
})
