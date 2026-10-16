import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateManualHanFuScore, calculateManualScore, manualYakuUnavailableReason, type ManualScoreInput } from '../utils/scoring/manual.ts'

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

test('explicit tile and group details must fit selected yaku patterns', () => {
  const triplet = (id: number, tileKind: 'simple' | 'terminal' | 'honor' = 'simple') => ({
    id, type: 'triplet' as const, tileKind, concealed: true, completedByRon: false,
  })
  const pairAndWait = { pairChoice: 'simple', pairFu: 0, pairIsValue: false, waitType: 'ryanmen' as const }

  const impossibleIttsuu = calculateManualScore(hand({
    selectedYaku: ['ittsu'], ...pairAndWait, groups: [triplet(1), triplet(2)],
  }))
  assert.ok(impossibleIttsuu.issues.some(issue => /Ittsuu needs three runs/.test(issue)))

  const impossibleHonours = calculateManualScore(hand({
    selectedYaku: ['tsuuiisou'], pairChoice: 'dragon', groups: [triplet(1)],
  }))
  assert.ok(impossibleHonours.issues.some(issue => /Tsuuiisou cannot include suited tiles/.test(issue)))

  const impossibleHonroutou = calculateManualScore(hand({
    selectedYaku: ['honroutou'], pairChoice: 'terminal-number', pairFu: 0, pairIsValue: false,
    waitType: 'ryanmen', groups: [triplet(1)],
  }))
  assert.ok(impossibleHonroutou.issues.some(issue => /Honroutou cannot include simple/.test(issue)))

  const impossibleJunchan = calculateManualScore(hand({
    selectedYaku: ['junchan'], pairChoice: 'dragon', pairFu: 2, pairIsValue: true,
    waitType: 'ryanmen',
  }))
  assert.ok(impossibleJunchan.issues.some(issue => /Junchan needs a terminal or honour pair/.test(issue)))

  const impossibleIipeiko = calculateManualScore(hand({
    selectedYaku: ['iipeiko'], ...pairAndWait, groups: [triplet(1), triplet(2), triplet(3)],
  }))
  assert.ok(impossibleIipeiko.issues.some(issue => /Iipeikou needs two identical runs/.test(issue)))

  const impossibleFourTripletJunchan = calculateManualScore(hand({
    selectedYaku: ['junchan'], pairChoice: 'terminal-number', pairFu: 0, pairIsValue: false,
    groups: [triplet(1, 'terminal'), triplet(2, 'terminal'), triplet(3, 'terminal'), triplet(4, 'terminal')],
  }))
  assert.ok(impossibleFourTripletJunchan.issues.some(issue => /Junchan needs at least one run/.test(issue)))

  const impossibleHonroutouWait = calculateManualScore(hand({
    selectedYaku: ['honroutou'], pairChoice: 'terminal-number', waitType: 'ryanmen',
  }))
  assert.ok(impossibleHonroutouWait.issues.some(issue => /cannot use a run wait/.test(issue)))
})

test('first-draw yakuman cannot stack with four kans, while Kokushi supports compatible selections', () => {
  const firstDrawFourKans = calculateManualScore(hand({
    selectedYaku: ['tenhou', 'suuankantsu'], isDealer: true, winType: 'tsumo',
  }))
  assert.ok(firstDrawFourKans.issues.some(issue => /cannot be scored alongside Suukantsu/.test(issue)))
  assert.equal(firstDrawFourKans.points, 0)

  const tenhouRiichi = calculateManualScore(hand({
    selectedYaku: ['tenhou', 'riichi'], isDealer: true, winType: 'tsumo',
  }))
  assert.ok(tenhouRiichi.issues.some(issue => /Tenhou cannot be scored alongside Riichi/.test(issue)))

  const chiihouRiichi = calculateManualScore(hand({
    selectedYaku: ['chiihou', 'double-riichi', 'ippatsu'], isDealer: false, winType: 'tsumo',
  }))
  assert.ok(chiihouRiichi.issues.some(issue => /Chiihou cannot be scored alongside Double riichi/.test(issue)))

  const kokushiChiihou = calculateManualScore(hand({
    selectedYaku: ['kokushi', 'chiihou'], handShape: 'kokushi', isDealer: false, winType: 'tsumo',
  }))
  assert.deepEqual(kokushiChiihou.issues, [])
  assert.equal(kokushiChiihou.yakumanUnits, 2)
  assert.equal(kokushiChiihou.points, 64000)
})

test('special hands reject incompatible kans and Rinshan while first-draw hands allow concealed triplets', () => {
  const kan = { id: 1, type: 'kan' as const, tileKind: 'simple' as const, concealed: true, completedByRon: false }
  const triplet = { ...kan, type: 'triplet' as const }

  for (const selectedYaku of [['chiitoitsu', 'rinshan'], ['kokushi', 'rinshan'], ['chuuren', 'rinshan']]) {
    const handShape = selectedYaku.includes('chiitoitsu') ? 'chiitoitsu' as const : selectedYaku.includes('kokushi') ? 'kokushi' as const : 'standard' as const
    const result = calculateManualScore(hand({ selectedYaku, handShape, winType: 'tsumo', groups: [kan], bonusHan: { dora: 4, nuki: 0 } }))
    assert.ok(result.issues.length > 0, selectedYaku.join(', '))
    assert.equal(result.points, 0, selectedYaku.join(', '))
  }

  const nineGatesWithKan = calculateManualScore(hand({
    selectedYaku: ['chuuren'], groups: [kan], bonusHan: { dora: 4, nuki: 0 },
  }))
  assert.ok(nineGatesWithKan.issues.some(issue => /cannot contain a kan/.test(issue)))

  const tenhouConcealedTriplet = calculateManualScore(hand({
    selectedYaku: ['tenhou'], isDealer: true, winType: 'tsumo', groups: [triplet],
  }))
  assert.deepEqual(tenhouConcealedTriplet.issues, [])
  assert.equal(tenhouConcealedTriplet.points, 48000)
})

test('Sanshoku doujun is unavailable in three-player mode in the picker and scorer', () => {
  const input = hand({ selectedYaku: ['sanshoku-doujun'], playerCount: 3 })
  assert.match(manualYakuUnavailableReason('sanshoku-doujun', input) ?? '', /three-player mahjong/)
  const result = calculateManualScore(input)
  assert.ok(result.issues.some(issue => /three-player mahjong/.test(issue)))
  assert.equal(result.points, 0)
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

test('quick han and fu entry scores known totals and validates special fu totals', () => {
  const ron = calculateManualHanFuScore({ han: 2, fu: 30, isClosed: true, isDealer: false, winType: 'ron', playerCount: 4, honba: 0 })
  assert.deepEqual(ron.issues, [])
  assert.equal(ron.points, 2000)

  const pinfuTsumo = calculateManualHanFuScore({ han: 2, fu: 20, isClosed: true, isDealer: false, winType: 'tsumo', playerCount: 4, honba: 0 })
  assert.deepEqual(pinfuTsumo.issues, [])
  assert.deepEqual(pinfuTsumo.tsumo, { dealerPays: 700, nonDealerPays: 400 })

  const ronTwentyFu = calculateManualHanFuScore({ han: 2, fu: 20, isClosed: true, isDealer: false, winType: 'ron', playerCount: 4, honba: 0 })
  assert.ok(ronTwentyFu.issues.some(issue => issue.includes('only possible on tsumo')))
  assert.equal(ronTwentyFu.points, 0)

  const openTwentyFu = calculateManualHanFuScore({ han: 2, fu: 20, isClosed: false, isDealer: false, winType: 'tsumo', playerCount: 4, honba: 0 })
  assert.ok(openTwentyFu.issues.some(issue => issue.includes('closed hand with Pinfu')))

  const oneHanTwentyFiveFu = calculateManualHanFuScore({ han: 1, fu: 25, isClosed: true, isDealer: false, winType: 'ron', playerCount: 4, honba: 0 })
  assert.ok(oneHanTwentyFiveFu.issues.some(issue => issue.includes('at least 2 han')))

  const invalidSevenPairsTsumo = calculateManualHanFuScore({ han: 2, fu: 25, isClosed: true, isDealer: false, winType: 'tsumo', playerCount: 4, honba: 0 })
  assert.ok(invalidSevenPairsTsumo.issues.some(issue => /25 fu on tsumo needs at least 3 han/.test(issue)))
  assert.equal(invalidSevenPairsTsumo.points, 0)
  const validSevenPairsTsumo = calculateManualHanFuScore({ han: 3, fu: 25, isClosed: true, isDealer: false, winType: 'tsumo', playerCount: 4, honba: 0 })
  assert.deepEqual(validSevenPairsTsumo.issues, [])
  assert.equal(validSevenPairsTsumo.points, 3200)

  const mangan = calculateManualHanFuScore({ han: 5, fu: 0, isClosed: false, isDealer: true, winType: 'ron', playerCount: 4, honba: 0 })
  assert.deepEqual(mangan.issues, [])
  assert.equal(mangan.fu, null)
  assert.equal(mangan.points, 12000)
})

test('win-method and dealer-only yaku are rejected when the hand does not match', () => {
  const chankanTsumo = calculateManualScore(hand({ selectedYaku: ['chankan'], winType: 'tsumo' }))
  assert.ok(chankanTsumo.issues.some(issue => issue.includes('requires ron')))
  assert.equal(chankanTsumo.points, 0)

  const haiteiRon = calculateManualScore(hand({ selectedYaku: ['haitei'], winType: 'ron' }))
  assert.ok(haiteiRon.issues.some(issue => issue.includes('requires tsumo')))

  const tenhouNonDealer = calculateManualScore(hand({ selectedYaku: ['tenhou'], winType: 'tsumo' }))
  assert.ok(tenhouNonDealer.issues.some(issue => issue.includes('requires the dealer')))
  assert.equal(tenhouNonDealer.points, 0)
})

test('Renhou stays mangan and excludes bonus han', () => {
  const result = calculateManualScore(hand({
    selectedYaku: ['renhou'], bonusHan: { dora: 3, nuki: 0 },
  }))
  assert.deepEqual(result.issues, [])
  assert.equal(result.han, 5)
  assert.equal(result.bonusHan, 0)
  assert.equal(result.points, 8000)
})

test('Honroutou requires four triplet groups for fu and adds its All Triplets yaku', () => {
  const incomplete = calculateManualScore(hand({
    selectedYaku: ['honroutou'], pairChoice: 'terminal-number', pairFu: 0, pairIsValue: false, waitType: 'tanki',
  }))
  assert.ok(incomplete.issues.some(issue => /Honroutou needs four terminal or honour triplets or kans/.test(issue)))
  assert.equal(incomplete.points, 0)

  const groups = Array.from({ length: 4 }, (_, index) => ({
    id: index + 1, type: 'triplet' as const, tileKind: 'terminal' as const, concealed: true, completedByRon: false,
  }))
  const complete = calculateManualScore(hand({
    selectedYaku: ['honroutou'], pairChoice: 'terminal-number', pairFu: 0, pairIsValue: false, waitType: 'tanki', groups,
  }))
  assert.deepEqual(complete.issues, [])
  assert.ok(complete.yaku.some(yaku => yaku.id === 'toitoi' && yaku.han === 2))
  assert.equal(complete.points, 8000)
})

test('Chankan cannot combine with Houtei, and impossible kan yaku combinations are rejected', () => {
  const chankanHoutei = hand({ selectedYaku: ['chankan', 'houtei'] })
  assert.match(manualYakuUnavailableReason('houtei', chankanHoutei) ?? '', /cannot be scored alongside Chankan/)
  const conflictingWin = calculateManualScore(chankanHoutei)
  assert.ok(conflictingWin.issues.some(issue => /cannot be scored alongside/.test(issue)))
  assert.equal(conflictingWin.points, 0)

  for (const selectedYaku of [['tenhou', 'sankantsu'], ['chuuren', 'sankantsu']]) {
    const impossibleKanWin = calculateManualScore(hand({
      selectedYaku, isDealer: selectedYaku.includes('tenhou'), winType: selectedYaku.includes('tenhou') ? 'tsumo' : 'ron',
    }))
    assert.ok(impossibleKanWin.issues.some(issue => /cannot be scored alongside Sankantsu/.test(issue)), selectedYaku.join(', '))
    assert.equal(impossibleKanWin.points, 0, selectedYaku.join(', '))
  }
})
