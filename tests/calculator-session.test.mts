import assert from 'node:assert/strict'
import test from 'node:test'
import {
  sanitizeCalculatorDraft,
  sanitizeCalculatorForm,
  sanitizeCalculatorGroups,
  type SessionIdRefs,
} from '../utils/riichiCalculatorSession.ts'

const refs: SessionIdRefs = {
  yakuIds: ['riichi', 'tanyao', 'chiitoitsu', 'kokushi', 'daisangen'],
  pairIds: ['simple', 'dragon', 'dragon-haku', 'wind-south', 'seat-wind'],
  waitIds: ['ryanmen', 'tanki', 'shanpon', 'kokushi-thirteen', 'chuuren-nine'],
}

function savedForm(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    winType: 'ron', seatWind: 'south', seatWindConfirmed: true, roundWind: 'east', roundWindConfirmed: true,
    playerCount: 4, isDealer: false, isClosed: true, handShape: 'standard', selectedYaku: ['riichi'],
    pairChoice: 'simple', sevenPairsHasHonor: null, ryuuiisouTilesConfirmed: null, waitType: 'ryanmen',
    groups: [{ id: 1, type: 'triplet', tileKind: 'simple', concealed: true, completedByRon: false, yakuId: null }],
    bonusHan: { dora: 1, nuki: 0 },
    doubleYakumanWaits: { kokushi: false, suuankou: false, chuuren: false },
    honba: 2, paoApplies: false, paoResponsibleAlsoDiscarder: null, paoResponsibleIsDealer: null,
    directHan: 0, directFu: 30, groupsConfirmed: false,
    ...overrides,
  }
}

test('well-formed session state round-trips unchanged', () => {
  const clean = sanitizeCalculatorForm(savedForm(), refs)
  assert.ok(clean)
  assert.equal(clean.winType, 'ron')
  assert.deepEqual(clean.selectedYaku, ['riichi'])
  assert.equal(clean.groups.length, 1)
  assert.equal(clean.groups[0].yakuId, null)
  assert.deepEqual(clean.bonusHan, { dora: 1, nuki: 0 })
})

test('non-objects and missing arrays are rejected', () => {
  assert.equal(sanitizeCalculatorForm(null, refs), null)
  assert.equal(sanitizeCalculatorForm('nope', refs), null)
  assert.equal(sanitizeCalculatorForm({ selectedYaku: [] }, refs), null)
  assert.equal(sanitizeCalculatorForm({ groups: [] }, refs), null)
})

test('malformed groups are dropped and yakuId is forced to string-or-null', () => {
  const groups = sanitizeCalculatorGroups([
    { id: 1, type: 'triplet', tileKind: 'simple', concealed: true, completedByRon: false, yakuId: null },
    { id: 2, type: 'triplet', tileKind: 'honor', concealed: false, completedByRon: false, yakuId: 5 },
    { id: 3, type: 'run', tileKind: 'simple', concealed: true, completedByRon: false, yakuId: null },
    { id: 4, type: 'kan', tileKind: 'weird', concealed: true, completedByRon: false, yakuId: null },
    null, 42, 'triplet',
  ])
  assert.equal(groups.length, 2)
  assert.equal(groups[1].yakuId, null)
  for (const group of groups) {
    group.yakuId?.startsWith('wind-')
  }
})

test('unknown yaku, pair and wait ids are dropped and duplicates removed', () => {
  const clean = sanitizeCalculatorForm(savedForm({
    selectedYaku: ['riichi', 'not-a-yaku', 42, 'riichi'],
    pairChoice: 'not-a-pair',
    waitType: 'not-a-wait',
  }), refs)
  assert.ok(clean)
  assert.deepEqual(clean.selectedYaku, ['riichi'])
  assert.equal(clean.pairChoice, null)
  assert.equal(clean.waitType, null)
})

test('dealer, winds, counts and table rules repair to consistent states', () => {
  const dealer = sanitizeCalculatorForm(savedForm({ isDealer: true, seatWind: 'south' }), refs)
  assert.ok(dealer)
  assert.equal(dealer.seatWind, 'east')
  assert.equal(dealer.seatWindConfirmed, true)

  const eastSeat = sanitizeCalculatorForm(savedForm({ isDealer: false, seatWind: 'east' }), refs)
  assert.ok(eastSeat)
  assert.equal(eastSeat.isDealer, true)

  const sanma = sanitizeCalculatorForm(savedForm({ playerCount: 3, seatWind: 'north', bonusHan: { dora: 0, nuki: 9 } }), refs)
  assert.ok(sanma)
  assert.equal(sanma.seatWind, 'south')
  assert.equal(sanma.bonusHan.nuki, 4)

  const yonma = sanitizeCalculatorForm(savedForm({ playerCount: 4, bonusHan: { dora: 2, nuki: 2 }, honba: 500, directHan: 200, directFu: 22 }), refs)
  assert.ok(yonma)
  assert.equal(yonma.bonusHan.nuki, 0)
  assert.equal(yonma.honba, 99)
  assert.equal(yonma.directHan, 99)
  assert.equal(yonma.directFu, 30)

  const weird = sanitizeCalculatorForm(savedForm({ winType: 'ties', handShape: 'thirteen', roundWind: 'north' }), refs)
  assert.ok(weird)
  assert.equal(weird.winType, 'ron')
  assert.equal(weird.handShape, 'standard')
  assert.equal(weird.roundWind, 'east')
})

test('special hand shapes regain their yaku id', () => {
  const chiitoitsu = sanitizeCalculatorForm(savedForm({ handShape: 'chiitoitsu', selectedYaku: [] }), refs)
  assert.ok(chiitoitsu)
  assert.deepEqual(chiitoitsu.selectedYaku, ['chiitoitsu'])
})

test('standard-hand drafts sanitize like the form and reject junk', () => {
  const draft = sanitizeCalculatorDraft({
    groups: [{ id: 7, type: 'kan', tileKind: 'terminal', concealed: true, completedByRon: false, yakuId: null }],
    pairChoice: 'dragon-haku', waitType: 'tanki', groupsConfirmed: true,
  }, refs)
  assert.deepEqual(draft, {
    groups: [{ id: 7, type: 'kan', tileKind: 'terminal', concealed: true, completedByRon: false, yakuId: null }],
    pairChoice: 'dragon-haku', waitType: 'tanki', groupsConfirmed: true,
  })
  assert.equal(sanitizeCalculatorDraft(null, refs), null)
  assert.equal(sanitizeCalculatorDraft({ groups: 'nope' }, refs), null)
})
