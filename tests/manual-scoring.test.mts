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

test('Seven Pairs with Honitsu asks for an honour-pair confirmation instead of standard fu details', () => {
  const missing = calculateManualScore(hand({ selectedYaku: ['chiitoitsu', 'honitsu'], handShape: 'chiitoitsu' }))
  assert.ok(missing.issues.some(issue => /Seven Pairs with Honitsu needs at least one honour pair/.test(issue)))

  const noHonourPair = calculateManualScore(hand({
    selectedYaku: ['chiitoitsu', 'honitsu'], handShape: 'chiitoitsu', sevenPairsHasHonor: false,
  }))
  assert.ok(noHonourPair.issues.some(issue => /this Seven Pairs hand has none/.test(issue)))
  assert.equal(noHonourPair.points, 0)

  const valid = calculateManualScore(hand({
    selectedYaku: ['chiitoitsu', 'honitsu'], handShape: 'chiitoitsu', sevenPairsHasHonor: true,
  }))
  assert.deepEqual(valid.issues, [])
  assert.equal(valid.fu, 25)
  assert.equal(valid.han, 5)
  assert.equal(valid.points, 8000)
})

test('an open hand with only called runs scores without entering triplets or kans', () => {
  const result = calculateManualScore(hand({ selectedYaku: ['chinitsu'], isClosed: false }))
  assert.deepEqual(result.issues, [])
  assert.equal(result.han, 5)
  assert.equal(result.points, 8000)
})

test('limit hands do not demand hidden group inputs, but lower hands still need group fu', () => {
  for (const yaku of ['toitoi', 'sanankou', 'sankantsu', 'rinshan']) {
    const group = (id: number, type: 'triplet' | 'kan' = 'triplet') => ({ id, type, tileKind: 'simple' as const, concealed: true, completedByRon: false })
    const groups = yaku === 'toitoi'
      ? [group(1), group(2), group(3), group(4)]
      : yaku === 'sanankou'
        ? [group(1), group(2), group(3)]
        : yaku === 'sankantsu'
          ? [group(1, 'kan'), group(2, 'kan'), group(3, 'kan')]
          : [group(1, 'kan')]
    const input = hand({ selectedYaku: [yaku], winType: yaku === 'rinshan' ? 'tsumo' : 'ron', groups, groupsConfirmed: true })
    const low = calculateManualScore(input)
    assert.ok(low.issues.length > 0, yaku)
    const limit = calculateManualScore({ ...input, bonusHan: { ...input.bonusHan, dora: 4 } })
    assert.deepEqual(limit.issues, [], yaku)
    assert.ok(limit.points > 0, yaku)
  }
  for (const yaku of ['suuankou', 'suuankantsu']) {
    const groups = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1, type: yaku === 'suuankantsu' ? 'kan' as const : 'triplet' as const,
      tileKind: 'simple' as const, concealed: true, completedByRon: false,
    }))
    const result = calculateManualScore(hand({ selectedYaku: [yaku], winType: 'tsumo', groups }))
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

  const impossibleChanta = calculateManualScore(hand({
    selectedYaku: ['chanta'], pairChoice: 'terminal-number', pairFu: 0, pairIsValue: false, waitType: 'tanki',
    groups: [triplet(1, 'terminal'), triplet(2, 'terminal'), triplet(3, 'terminal')],
  }))
  assert.ok(impossibleChanta.issues.some(issue => /Chanta needs at least one honour pair or group/.test(issue)))
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

test('Honroutou requires four triplet groups and both terminals and honours', () => {
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
  assert.ok(complete.issues.some(issue => /Honroutou needs at least one terminal and one honour/.test(issue)))
  assert.ok(complete.yaku.some(yaku => yaku.id === 'toitoi' && yaku.han === 2))
  assert.equal(complete.points, 0)

  const mixed = calculateManualScore(hand({
    selectedYaku: ['honroutou'], pairChoice: 'dragon', pairFu: 2, pairIsValue: true, waitType: 'tanki',
    groups: [...groups.slice(0, 3), { ...groups[3], tileKind: 'honor' }],
  }))
  assert.deepEqual(mixed.issues, [])
  assert.equal(mixed.points, 8000)
})

test('Shousangen validates its dragon sets and counts both implied Yakuhai', () => {
  const groups = [
    { id: 1, type: 'triplet' as const, tileKind: 'honor' as const, concealed: true, completedByRon: false, yakuId: 'yakuhai-haku' },
    { id: 2, type: 'triplet' as const, tileKind: 'honor' as const, concealed: true, completedByRon: false, yakuId: 'yakuhai-hatsu' },
    { id: 3, type: 'triplet' as const, tileKind: 'simple' as const, concealed: true, completedByRon: false },
    { id: 4, type: 'triplet' as const, tileKind: 'simple' as const, concealed: true, completedByRon: false },
  ]
  const valid = calculateManualScore(hand({
    selectedYaku: ['shousangen'], pairChoice: 'dragon-chun', pairFu: 2, pairIsValue: true, waitType: 'tanki', groups,
  }))
  assert.deepEqual(valid.issues, [])
  assert.equal(valid.han, 4)
  assert.equal(valid.points, 8000)
  assert.ok(valid.yaku.some(yaku => yaku.id === 'shousangen-dragon-sets' && yaku.han === 2))

  const twoDragonGroups = calculateManualScore(hand({
    selectedYaku: ['shousangen'], pairChoice: 'dragon-chun', pairFu: 2, pairIsValue: true, waitType: 'tanki', groups: groups.slice(0, 2),
  }))
  assert.deepEqual(twoDragonGroups.issues, [])
  assert.equal(twoDragonGroups.points, 8000)

  const impossible = calculateManualScore(hand({
    selectedYaku: ['shousangen'], pairChoice: 'dragon-chun', pairFu: 2, pairIsValue: true, waitType: 'tanki',
    groups: groups.map(group => ({ ...group, tileKind: 'simple' as const })),
  }))
  assert.ok(impossible.issues.some(issue => /Shousangen needs two dragon triplets or kans/.test(issue)))
  assert.equal(impossible.points, 0)

  const alreadySelected = calculateManualScore(hand({
    selectedYaku: ['shousangen', 'yakuhai-haku', 'yakuhai-hatsu'], pairChoice: 'dragon-chun', pairFu: 2, pairIsValue: true, waitType: 'tanki', groups,
  }))
  assert.deepEqual(alreadySelected.issues, [])
  assert.equal(alreadySelected.han, 4)
  assert.equal(alreadySelected.yaku.filter(yaku => yaku.id.startsWith('yakuhai-')).length, 2)

  const pairDuplicatesSet = calculateManualScore(hand({
    selectedYaku: ['shousangen'], pairChoice: 'dragon-haku', pairFu: 2, pairIsValue: true, waitType: 'tanki', groups,
  }))
  assert.ok(pairDuplicatesSet.issues.some(issue => /different from the pair/.test(issue)))
})

test('Sanshoku yaku cannot combine with either flush', () => {
  for (const pattern of ['sanshoku-doujun', 'sanshoku-doukou']) {
    for (const flush of ['honitsu', 'chinitsu']) {
      const input = hand({ selectedYaku: [pattern, flush] })
      assert.match(manualYakuUnavailableReason(pattern, input) ?? '', /cannot be scored alongside/)
      const result = calculateManualScore(input)
      assert.ok(result.issues.some(issue => /cannot be scored alongside/.test(issue)), `${pattern} + ${flush}`)
      assert.equal(result.points, 0)
    }
  }
})

test('structurally impossible yaku combinations are rejected even at yakuman values', () => {
  const impossible = [
    ['ryuuiisou', 'daisangen'],
    ['ryuuiisou', 'daisuushi'],
    ['chuuren', 'suuankou'],
    ['daisangen', 'daisuushi'],
    ['daisangen', 'shousuushi'],
  ]
  for (const selectedYaku of impossible) {
    const result = calculateManualScore(hand({ selectedYaku, isDealer: false, winType: 'ron' }))
    assert.ok(result.issues.length > 0, selectedYaku.join(' + '))
    assert.equal(result.points, 0, selectedYaku.join(' + '))
  }

  // These two yakuman can share four groups and remain a valid double yakuman.
  const validStack = calculateManualScore(hand({
    selectedYaku: ['tsuuiisou', 'daisangen', 'suuankou'],
    isClosed: true,
    winType: 'tsumo',
    pairChoice: 'non-value-wind',
    waitType: 'tanki',
    doubleYakumanWaits: { kokushi: false, suuankou: true, chuuren: false },
    groups: [
      { id: 1, type: 'triplet', tileKind: 'honor', concealed: true, completedByRon: false, yakuId: 'yakuhai-haku' },
      { id: 2, type: 'triplet', tileKind: 'honor', concealed: true, completedByRon: false, yakuId: 'yakuhai-hatsu' },
      { id: 3, type: 'triplet', tileKind: 'honor', concealed: true, completedByRon: false, yakuId: 'yakuhai-chun' },
      { id: 4, type: 'triplet', tileKind: 'honor', concealed: true, completedByRon: false },
    ],
  }))
  assert.deepEqual(validStack.issues, [])
  assert.equal(validStack.yakumanUnits, 4)
})

test('ordinary yaku conflicts that exceed the four-group structure are rejected', () => {
  const impossible = [
    ['tanyao', 'ittsu'],
    ['ittsu', 'chanta'],
    ['ittsu', 'junchan'],
    ['ittsu', 'sanshoku-doujun'],
    ['ittsu', 'ryanpeiko'],
    ['ryanpeiko', 'sanshoku-doujun'],
    ['pinfu', 'sankantsu'],
    ['iipeiko', 'sanankou'],
    ['iipeiko', 'sankantsu'],
  ]
  for (const selectedYaku of impossible) {
    const result = calculateManualScore(hand({ selectedYaku, bonusHan: { dora: 4, nuki: 0 } }))
    assert.ok(result.issues.length > 0, selectedYaku.join(' + '))
    assert.equal(result.points, 0, selectedYaku.join(' + '))
  }
})

test('complete group confirmation is enforced regardless of han or fu', () => {
  for (const selectedYaku of ['toitoi', 'sankantsu', 'sanshoku-doukou']) {
    const result = calculateManualScore(hand({
      selectedYaku: [selectedYaku], groupsConfirmed: true,
      pairChoice: 'simple', pairFu: 0, pairIsValue: false, waitType: 'tanki',
      bonusHan: { dora: 4, nuki: 0 },
    }))
    assert.ok(result.issues.length > 0, selectedYaku)
    assert.equal(result.points, 0, selectedYaku)
  }

  const kan = (id: number) => ({ id, type: 'kan' as const, tileKind: 'simple' as const, concealed: true, completedByRon: false })
  const completeSankantsu = calculateManualScore(hand({
    selectedYaku: ['sankantsu'], groups: [kan(1), kan(2), kan(3)], groupsConfirmed: true,
    pairChoice: 'simple', pairFu: 0, pairIsValue: false, waitType: 'tanki',
  }))
  assert.deepEqual(completeSankantsu.issues, [])
})

test('fully described flushes and yakuman pairs must fit their tile sets', () => {
  const group = (id: number, tileKind: 'simple' | 'terminal' | 'honor', yakuId?: string) => ({
    id, type: 'triplet' as const, tileKind, concealed: true, completedByRon: false, yakuId,
  })
  const honitsuWithoutHonours = calculateManualScore(hand({
    selectedYaku: ['honitsu'], groups: Array.from({ length: 4 }, (_, index) => group(index + 1, 'simple')),
    groupsConfirmed: true, pairChoice: 'simple', pairFu: 0, pairIsValue: false, waitType: 'tanki',
  }))
  assert.ok(honitsuWithoutHonours.issues.some(issue => /Honitsu needs at least one honour/.test(issue)))

  const allGreenTerminal = calculateManualScore(hand({
    selectedYaku: ['ryuuiisou'], groups: [group(1, 'terminal')], groupsConfirmed: true, pairChoice: 'simple',
  }))
  assert.ok(allGreenTerminal.issues.some(issue => /All Green cannot include terminal/.test(issue)))

  const bigDragonsWithDragonPair = calculateManualScore(hand({
    selectedYaku: ['daisangen'], pairChoice: 'dragon-haku', groupsConfirmed: true,
    groups: [group(1, 'honor', 'yakuhai-haku'), group(2, 'honor', 'yakuhai-hatsu'), group(3, 'honor', 'yakuhai-chun')],
  }))
  assert.ok(bigDragonsWithDragonPair.issues.some(issue => /pair other than the three dragon sets/.test(issue)))

  const validAllGreen = calculateManualScore(hand({
    selectedYaku: ['ryuuiisou'], pairChoice: 'simple', ryuuiisouTilesConfirmed: true,
    groups: Array.from({ length: 4 }, (_, index) => group(index + 1, 'simple')),
  }))
  assert.deepEqual(validAllGreen.issues, [])
  assert.equal(validAllGreen.points, 32000)
})

test('sanma rejects an open only-runs hand and Renhou rejects a concealed kan', () => {
  const openOnlyRuns = calculateManualScore(hand({
    selectedYaku: ['tanyao'], isClosed: false, playerCount: 3, groupsConfirmed: true,
    pairChoice: 'simple', pairFu: 0, pairIsValue: false, waitType: 'tanki',
  }))
  assert.ok(openOnlyRuns.issues.some(issue => /Three-player mahjong has no chi/.test(issue)))

  const openWithOnlyConcealedSets = calculateManualScore(hand({
    selectedYaku: ['tanyao'], isClosed: false, playerCount: 3,
    groups: [{ id: 1, type: 'triplet', tileKind: 'simple', concealed: true, completedByRon: false }],
  }))
  assert.ok(openWithOnlyConcealedSets.issues.some(issue => /open hand must include a called triplet or kan/.test(issue)))

  const concealedKan = calculateManualScore(hand({
    selectedYaku: ['renhou'], groups: [{ id: 1, type: 'kan', tileKind: 'simple', concealed: true, completedByRon: false }],
  }))
  assert.ok(concealedKan.issues.some(issue => /first-draw win cannot include a kan/.test(issue)))
})

test('extracted North tiles cannot consume copies required by Kokushi or Seven Pairs All Honours', () => {
  const kokushi = calculateManualScore(hand({
    selectedYaku: ['kokushi'], handShape: 'kokushi', playerCount: 3, bonusHan: { dora: 0, nuki: 4 },
  }))
  assert.ok(kokushi.issues.some(issue => /Kokushi needs a North tile/.test(issue)))

  const sevenHonours = calculateManualScore(hand({
    selectedYaku: ['chiitoitsu', 'tsuuiisou'], handShape: 'chiitoitsu', playerCount: 3, bonusHan: { dora: 0, nuki: 3 },
  }))
  assert.ok(sevenHonours.issues.some(issue => /Seven Pairs plus All Honours needs a North pair/.test(issue)))
})

test('manual pao splits ron yakuman and assigns honba to the discarder', () => {
  const result = calculateManualScore(hand({
    selectedYaku: ['daisangen'], isClosed: false, isDealer: false, winType: 'ron', honba: 1,
    pairChoice: 'simple', pairFu: 0, pairIsValue: false, groupsConfirmed: true,
    groups: [
      { id: 1, type: 'triplet', tileKind: 'honor', concealed: false, completedByRon: false, yakuId: 'yakuhai-haku' },
      { id: 2, type: 'triplet', tileKind: 'honor', concealed: false, completedByRon: false, yakuId: 'yakuhai-hatsu' },
      { id: 3, type: 'triplet', tileKind: 'honor', concealed: false, completedByRon: false, yakuId: 'yakuhai-chun' },
    ],
    paoApplies: true, paoResponsibleAlsoDiscarder: false,
  }))
  assert.deepEqual(result.issues, [])
  assert.equal(result.points, 32300)
  assert.deepEqual(result.pao, { responsiblePays: 16000, discarderPays: 16300 })

  const unspecifiedDiscarder = calculateManualScore(hand({ selectedYaku: ['daisangen'], paoApplies: true }))
  assert.ok(unspecifiedDiscarder.issues.some(issue => /Choose whether the pao-responsible player also discarded/.test(issue)))

  const sameDiscarder = calculateManualScore(hand({
    selectedYaku: ['daisangen'], isClosed: false, pairChoice: 'simple', groupsConfirmed: true,
    groups: [
      { id: 1, type: 'triplet', tileKind: 'honor', concealed: false, completedByRon: false, yakuId: 'yakuhai-haku' },
      { id: 2, type: 'triplet', tileKind: 'honor', concealed: false, completedByRon: false, yakuId: 'yakuhai-hatsu' },
      { id: 3, type: 'triplet', tileKind: 'honor', concealed: false, completedByRon: false, yakuId: 'yakuhai-chun' },
    ],
    paoApplies: true, paoResponsibleAlsoDiscarder: true,
  }))
  assert.deepEqual(sameDiscarder.issues, [])
  assert.deepEqual(sameDiscarder.pao, { responsiblePays: 32000 })
})

test('manual pao applies only to its yakuman when yakuman stack', () => {
  const groups = [
    { id: 1, type: 'triplet' as const, tileKind: 'honor' as const, concealed: false, completedByRon: false, yakuId: 'yakuhai-haku' },
    { id: 2, type: 'triplet' as const, tileKind: 'honor' as const, concealed: false, completedByRon: false, yakuId: 'yakuhai-hatsu' },
    { id: 3, type: 'triplet' as const, tileKind: 'honor' as const, concealed: false, completedByRon: false, yakuId: 'yakuhai-chun' },
    { id: 4, type: 'triplet' as const, tileKind: 'honor' as const, concealed: false, completedByRon: false },
  ]
  const ron = calculateManualScore(hand({
    selectedYaku: ['daisangen', 'tsuuiisou'], isClosed: false, winType: 'ron', honba: 1,
    pairChoice: 'non-value-wind', groups, paoApplies: true, paoResponsibleAlsoDiscarder: false,
  }))
  assert.deepEqual(ron.issues, [])
  assert.equal(ron.points, 64300)
  assert.deepEqual(ron.pao, { responsiblePays: 16000, discarderPays: 48300 })

  const tsumo = calculateManualScore(hand({
    selectedYaku: ['daisangen', 'tsuuiisou'], isClosed: false, winType: 'tsumo', honba: 1,
    pairChoice: 'non-value-wind', groups, paoApplies: true, paoResponsibleIsDealer: false,
  }))
  assert.deepEqual(tsumo.issues, [])
  assert.equal(tsumo.points, 64300)
  assert.deepEqual(tsumo.pao, {
    responsiblePays: 40100,
    otherTsumo: { dealerPays: 16100, nonDealerPays: 8100 },
    responsibleIsDealer: false,
  })
})

test('Chankan rejects waits that would require a fifth copy of the robbed tile', () => {
  for (const overrides of [
    { waitType: 'tanki' as const },
    { waitType: 'shanpon' as const },
    { handShape: 'chiitoitsu' as const, selectedYaku: ['chankan', 'chiitoitsu'] },
    { selectedYaku: ['chankan', 'chuuren'] },
    { handShape: 'kokushi' as const, selectedYaku: ['chankan', 'kokushi'], doubleYakumanWaits: { kokushi: false, suuankou: false, chuuren: false }, waitType: 'kokushi-thirteen' as const },
  ]) {
    const result = calculateManualScore(hand({ selectedYaku: ['chankan'], ...overrides }))
    assert.ok(result.issues.some(issue => /Chankan wait already holds a copy/.test(issue)))
    assert.equal(result.points, 0)
  }
  const missingWait = calculateManualScore(hand({ selectedYaku: ['chankan'], bonusHan: { dora: 4, nuki: 0 } }))
  assert.ok(missingWait.issues.some(issue => /Choose the winning wait to check/.test(issue)))
  const validSequenceWait = calculateManualScore(hand({
    selectedYaku: ['chankan'], waitType: 'ryanmen', pairChoice: 'simple', pairFu: 0, pairIsValue: false,
    groups: [{ id: 1, type: 'triplet', tileKind: 'simple', concealed: true, completedByRon: false }],
  }))
  assert.deepEqual(validSequenceWait.issues, [])
})

test('Chankan cannot combine with Houtei, and impossible kan yaku combinations are rejected', () => {
  const chankanHoutei = hand({ selectedYaku: ['chankan', 'houtei'] })
  assert.match(manualYakuUnavailableReason('houtei', chankanHoutei) ?? '', /cannot be scored alongside Chankan/)
  const conflictingWin = calculateManualScore(chankanHoutei)
  assert.ok(conflictingWin.issues.some(issue => /cannot be scored alongside/.test(issue)))
  assert.equal(conflictingWin.points, 0)

  const impossibleYakuhai = calculateManualScore(hand({
    selectedYaku: ['yakuhai-haku'], bonusHan: { dora: 4, nuki: 0 },
    groups: Array.from({ length: 4 }, (_, index) => ({ id: index + 1, type: 'triplet' as const, tileKind: 'simple' as const, concealed: true, completedByRon: false })),
  }))
  assert.ok(impossibleYakuhai.issues.some(issue => /too few sets for the selected dragon or wind yaku/.test(issue)))
  assert.equal(impossibleYakuhai.points, 0)

  for (const selectedYaku of [['tenhou', 'sankantsu'], ['chuuren', 'sankantsu']]) {
    const impossibleKanWin = calculateManualScore(hand({
      selectedYaku, isDealer: selectedYaku.includes('tenhou'), winType: selectedYaku.includes('tenhou') ? 'tsumo' : 'ron',
    }))
    assert.ok(impossibleKanWin.issues.some(issue => /cannot be scored alongside Sankantsu/.test(issue)), selectedYaku.join(', '))
    assert.equal(impossibleKanWin.points, 0, selectedYaku.join(', '))
  }
})
