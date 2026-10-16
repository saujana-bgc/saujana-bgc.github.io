import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateManualScore, type ManualScoreInput } from '../utils/scoring/manual.ts'

function hand(overrides: Partial<ManualScoreInput> = {}): ManualScoreInput {
  return {
    selectedYaku: [], isClosed: true, isDealer: false,
    seatWind: 'south', roundWind: 'east', winType: 'ron', playerCount: 4,
    handShape: 'standard', riichiDeclared: false,
    pairFu: null, pairChoice: null, pairIsValue: null, waitType: null, groups: [],
    bonusHan: { dora: 0, nuki: 0 },
    doubleYakumanWaits: { kokushi: false, suuankou: false, chuuren: false },
    honba: 0, ...overrides,
  }
}

test('Pinfu and Seven Pairs calculate without redundant pair, wait or confirmation inputs', () => {
  const pinfuRon = calculateManualScore(hand({ selectedYaku: ['pinfu'] }))
  assert.deepEqual(pinfuRon.issues, [])
  assert.equal(pinfuRon.fu, 30)
  assert.equal(pinfuRon.points, 1000)

  const pinfuTsumo = calculateManualScore(hand({ selectedYaku: ['pinfu'], winType: 'tsumo' }))
  assert.deepEqual(pinfuTsumo.issues, [])
  assert.equal(pinfuTsumo.fu, 20)
  assert.deepEqual(pinfuTsumo.tsumo, { dealerPays: 700, nonDealerPays: 400 })

  const sevenPairs = calculateManualScore(hand({ selectedYaku: ['chiitoitsu'], handShape: 'chiitoitsu' }))
  assert.deepEqual(sevenPairs.issues, [])
  assert.equal(sevenPairs.fu, 25)
  assert.equal(sevenPairs.points, 1600)
})

test('an open hand with only called runs scores without entering triplets or kans', () => {
  const result = calculateManualScore(hand({ selectedYaku: ['chinitsu'], isClosed: false }))
  assert.deepEqual(result.issues, [])
  assert.equal(result.han, 5)
  assert.equal(result.points, 8000)
})

test('limit hands do not demand hidden group inputs, but lower hands still need group fu', () => {
  for (const yaku of ['toitoi', 'sanankou', 'sankantsu', 'rinshan']) {
    const input = hand({ selectedYaku: [yaku], winType: yaku === 'rinshan' ? 'tsumo' : 'ron' })
    const low = calculateManualScore(input)
    assert.ok(low.issues.some(issue => /triplets|kans|requires a kan/.test(issue)), yaku)
    const limit = calculateManualScore({ ...input, bonusHan: { ...input.bonusHan, dora: 4 } })
    assert.deepEqual(limit.issues, [], yaku)
    assert.ok(limit.points > 0, yaku)
  }
  for (const yaku of ['suuankou', 'suuankantsu']) {
    const result = calculateManualScore(hand({ selectedYaku: [yaku], winType: 'tsumo' }))
    assert.deepEqual(result.issues, [], yaku)
    assert.equal(result.isYakuman, true)
    assert.equal(result.points, 32000)
  }
})

test('simplified questions still reject contradictory explicit details', () => {
  const pinfuValuePair = calculateManualScore(hand({ selectedYaku: ['pinfu'], pairFu: 2, pairIsValue: true }))
  assert.ok(pinfuValuePair.issues.some(issue => issue.includes('non-value pair')))
  assert.equal(pinfuValuePair.points, 0)
  const pinfuWait = calculateManualScore(hand({ selectedYaku: ['pinfu'], waitType: 'tanki' }))
  assert.ok(pinfuWait.issues.some(issue => issue.includes('two-sided wait')))
  const calledGroup = { id: 1, type: 'triplet' as const, tileKind: 'simple' as const, concealed: false, completedByRon: false }
  const closedWithCall = calculateManualScore(hand({ selectedYaku: ['chinitsu'], groups: [calledGroup] }))
  assert.ok(closedWithCall.issues.some(issue => issue.startsWith('Called groups')))
  assert.equal(closedWithCall.points, 0)
  const pinfuWithTriplet = calculateManualScore(hand({ selectedYaku: ['pinfu'], groups: [{ ...calledGroup, concealed: true }] }))
  assert.ok(pinfuWithTriplet.issues.some(issue => issue.startsWith('Pinfu has only runs')))
  const fourKansWithTriplet = calculateManualScore(hand({ selectedYaku: ['suuankantsu'], isClosed: false, groups: [calledGroup] }))
  assert.ok(fourKansWithTriplet.issues.some(issue => issue.startsWith('Suukantsu needs four kans')))
  assert.equal(fourKansWithTriplet.points, 0)
})

test('automatic Menzen Tsumo counts as a yaku and dealer payments include honba', () => {
  const result = calculateManualScore(hand({
    winType: 'tsumo', isDealer: true, seatWind: 'east',
    pairFu: 0, pairIsValue: false, pairChoice: 'simple', waitType: 'ryanmen',
    honba: 1,
  }))
  assert.deepEqual(result.issues, [])
  assert.equal(result.han, 1)
  assert.deepEqual(result.tsumo, { dealerPays: 600, nonDealerPays: 600 })
  assert.equal(result.points, 1800)
})
