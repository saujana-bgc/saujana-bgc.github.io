import assert from 'node:assert/strict'
import test from 'node:test'
import { score } from '../utils/scoring/index.ts'
import type { Hand, HonorValue, Meld, Suit, Tile, WindValue } from '../utils/scoring/types.ts'

const suited = (suit: Suit, value: number): Tile => ({
  suit,
  value: value as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
})

const honor = (value: HonorValue): Tile => ({ suit: 'honor', value })

function ponMeld(value: HonorValue): Meld {
  return { type: 'pon', tiles: [honor(value), honor(value), honor(value)] }
}

function daisangenHand(over: Partial<Hand>): Hand {
  return {
    closedTiles: [suited('man', 1), suited('man', 2), suited('man', 3), suited('pin', 2)],
    winningTile: suited('pin', 2),
    melds: [ponMeld('haku'), ponMeld('hatsu'), ponMeld('chun')],
    winType: 'tsumo', seatWind: 'south', roundWind: 'east', doraIndicators: [],
    riichi: false, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
    ...over,
  }
}

test('pao tsumo: the responsible player pays the full amount', () => {
  const withoutPao = score(daisangenHand({}))
  const withPao = score(daisangenHand({ paoResponsibleSeat: 'west' }))

  assert.equal(withoutPao.valid, true)
  assert.equal(withoutPao.points.responsiblePays, undefined)
  assert.equal(withPao.valid, true)
  assert.equal(withPao.points.responsiblePays, withPao.points.total, 'pao tsumo = full responsibility')
  assert.equal(withPao.points.discarderPays, undefined)
  // The underlying tsumo math is unchanged; pao only redirects who pays.
  assert.equal(withPao.points.total, withoutPao.points.total)
})

test('pao ron where the responsible player is also the discarder: they pay everything', () => {
  const result = score(daisangenHand({
    winType: 'ron',
    paoResponsibleSeat: 'west',
    ronDiscarderSeat: 'west',
  }))

  assert.equal(result.valid, true)
  assert.equal(result.points.ron, result.points.total)
  assert.equal(result.points.responsiblePays, result.points.total, 'liable player = discarder pays the full ron')
  assert.equal(result.points.discarderPays, undefined)
})

test('pao ron with a different discarder splits the payment in half', () => {
  const result = score(daisangenHand({
    winType: 'ron',
    paoResponsibleSeat: 'west',
    ronDiscarderSeat: 'east',
  }))

  assert.equal(result.valid, true)
  // Non-dealer yakuman ron = 32000; each half is 16000.
  assert.equal(result.points.total, 32000)
  assert.equal(result.points.responsiblePays, 16000)
  assert.equal(result.points.discarderPays, 16000)
})

test('pao ron split with the dealer winning doubles the base before halving', () => {
  const result = score(daisangenHand({
    winType: 'ron',
    seatWind: 'east',
    paoResponsibleSeat: 'south',
    ronDiscarderSeat: 'west',
  }))

  assert.equal(result.valid, true)
  assert.equal(result.points.total, 48000, 'dealer yakuman ron = 48000')
  assert.equal(result.points.responsiblePays, 24000)
  assert.equal(result.points.discarderPays, 24000)
})

test('honba is part of a split pao ron and each half rounds up to 100', () => {
  const result = score(daisangenHand({
    winType: 'ron',
    paoResponsibleSeat: 'west',
    ronDiscarderSeat: 'east',
    honba: 1,
  }))

  assert.equal(result.valid, true)
  assert.equal(result.points.total, 32300, '32000 + 300 honba')
  assert.equal(result.points.responsiblePays, 16200, 'each half rounds up independently')
  assert.equal(result.points.discarderPays, 16200)
})

test('daisuushii pao settles the same way', () => {
  const daisuushii = (over: Partial<Hand>): Hand => ({
    closedTiles: [suited('pin', 2)],
    winningTile: suited('pin', 2),
    melds: [ponMeld('east'), ponMeld('south'), ponMeld('west'), ponMeld('north')],
    winType: 'tsumo', seatWind: 'south', roundWind: 'east', doraIndicators: [],
    riichi: false, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
    ...over,
  })

  const tsumo = score(daisuushii({ paoResponsibleSeat: 'north' }))
  assert.equal(tsumo.valid, true)
  assert.equal(tsumo.points.responsiblePays, tsumo.points.total)

  const split = score(daisuushii({
    winType: 'ron',
    paoResponsibleSeat: 'north',
    ronDiscarderSeat: 'west',
  }))
  assert.equal(split.valid, true)
  assert.equal(split.points.total, 32000)
  assert.equal(split.points.responsiblePays, 16000)
  assert.equal(split.points.discarderPays, 16000)
})

test('sanma pao tsumo: the responsible player pays the full two-payer amount', () => {
  const rules = { playerCount: 3 as const, akaDoraCount: 2 as const }
  const withoutPao = score(daisangenHand({}), rules)
  const withPao = score(daisangenHand({ paoResponsibleSeat: 'west' }), rules)

  assert.equal(withoutPao.valid, true)
  // Sanma tsumo: two payers, each making their normal four-player payment
  // (dealer 2× basic, the other non-dealer 1×) with no absent-fourth compensation.
  assert.equal(
    withoutPao.points.total,
    (withoutPao.points.tsumo?.dealerPays ?? 0) + (withoutPao.points.tsumo?.nonDealerPays ?? 0),
    'sanma tsumo: exactly two payers',
  )
  assert.equal(withPao.points.responsiblePays, withPao.points.total)
  assert.equal(withPao.points.total, withoutPao.points.total)
})

test('a normal yakuman without pao is settled unchanged', () => {
  // Suuankou tsumo: four concealed triplets + pair.
  const triplet = (suit: Suit, value: number): Tile[] => [suited(suit, value), suited(suit, value), suited(suit, value)]
  const closed: Tile[] = [
    ...triplet('man', 1), ...triplet('pin', 2), ...triplet('sou', 3), ...triplet('man', 4), suited('pin', 5),
  ]
  const hand: Hand = {
    closedTiles: closed,
    winningTile: suited('pin', 5),
    melds: [],
    winType: 'tsumo', seatWind: 'south', roundWind: 'east', doraIndicators: [],
    riichi: false, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false,
  }

  const result = score(hand)
  assert.equal(result.valid, true)
  assert.equal(result.yaku.some((y) => y.name === 'suuankou'), true)
  assert.equal(result.points.responsiblePays, undefined)
  assert.equal(result.points.discarderPays, undefined)
})

test('a non-pao ron keeps its ordinary payment even with pao seats on unrelated hands', () => {
  // Same daisangen shape but pao claimed on a hand whose yaku are not
  // daisangen/daisuushi: pao must be ignored.
  const toitoiLike = score(daisangenHand({
    winType: 'ron',
    paoResponsibleSeat: 'west',
    ronDiscarderSeat: 'west',
  }))
  assert.equal(toitoiLike.points.responsiblePays, toitoiLike.points.total, 'daisangen is present, so pao applies')

  const plainHand = score({
    ...daisangenHand({ winType: 'ron', paoResponsibleSeat: 'west', ronDiscarderSeat: 'west' }),
    melds: [ponMeld('haku')],
    closedTiles: [
      suited('man', 1), suited('man', 1), suited('man', 1),
      suited('pin', 2), suited('pin', 3), suited('pin', 4),
      suited('sou', 6), suited('sou', 7), suited('sou', 8),
      suited('pin', 2),
    ],
    winningTile: suited('pin', 2),
  })
  assert.equal(plainHand.valid, true)
  assert.equal(plainHand.yaku.some((y) => y.name === 'daisangen'), false)
  assert.equal(plainHand.points.responsiblePays, undefined, 'pao only applies to daisangen/daisuushi')
  assert.equal(plainHand.points.discarderPays, undefined)
})

test('malformed pao input is rejected', () => {
  const winnerIsResponsible = score(daisangenHand({ paoResponsibleSeat: 'south' }))
  assert.equal(winnerIsResponsible.valid, false)
  assert.match(winnerIsResponsible.error ?? '', /cannot be the winner/)

  const ronWithoutDiscarder = score(daisangenHand({
    winType: 'ron',
    paoResponsibleSeat: 'west',
  }))
  assert.equal(ronWithoutDiscarder.valid, false)
  assert.match(ronWithoutDiscarder.error ?? '', /discarding player/)

  const discarderIsWinner = score(daisangenHand({
    winType: 'ron',
    paoResponsibleSeat: 'west',
    ronDiscarderSeat: 'south',
  }))
  assert.equal(discarderIsWinner.valid, false)
  assert.match(discarderIsWinner.error ?? '', /cannot be the winner/)

  // A pao tsumo needs no discarder and stays valid with the seat declared.
  assert.equal(score(daisangenHand({ paoResponsibleSeat: 'west', ronDiscarderSeat: 'west' })).valid, true)
})

test('pao seat rejection works for every non-winner seat only', () => {
  const seats: WindValue[] = ['east', 'south', 'west', 'north']
  for (const seat of seats) {
    const result = score(daisangenHand({
      winType: 'ron',
      seatWind: 'south',
      paoResponsibleSeat: seat,
      ronDiscarderSeat: seat === 'south' ? 'west' : seat,
    }))
    if (seat === 'south') {
      assert.equal(result.valid, false, 'winner cannot be pao responsible')
    } else {
      assert.equal(result.valid, true)
    }
  }
})
