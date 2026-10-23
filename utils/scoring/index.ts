import type { Hand, ScoreResult, RulesConfig, Yaku, WindValue } from "./types";
import { DEFAULT_RULES } from "./types";
import { parseHand } from "./hand-parser";
import { detectYaku, detectYakuman } from "./yaku";
import { calculateFu, chiitoitsiFuBreakdown } from "./fu";
import { calculatePoints, handName, roundUp100 } from "./points";
import { countDora, countAkaDora, tilesEqual } from "./tiles";
import type { HandInterpretation } from "./hand-parser";
import type { FuBreakdown } from "./types";

const PAO_YAKU = new Set(["daisangen", "daisuushi"]);

export function hasDeclaredKan(melds: Hand["melds"]): boolean {
  return melds.some((m) => m.type === "kan-open" || m.type === "kan-closed" || m.type === "kan-added");
}

// Malformed pao input is rejected rather than silently mis-settled: the
// responsible player and (for ron) the discarder must be declared and must be
// someone other than the winner.
function paoProblem(hand: Hand): string | null {
  if (hand.paoResponsibleSeat === undefined) return null;
  if (hand.paoResponsibleSeat === hand.seatWind) return "The pao responsible player cannot be the winner";
  if (hand.winType === "ron") {
    if (hand.ronDiscarderSeat === undefined) return "A pao ron needs the discarding player declared";
    if (hand.ronDiscarderSeat === hand.seatWind) return "The discarding player cannot be the winner";
  }
  return null;
}

/** Apply pao to only the yakuman whose final set was fed. Honba and any other
 * yakuman remain the discarder’s / ordinary tsumo payers’ responsibility. */
function applyPao(
  hand: Hand,
  yaku: Yaku[],
  points: ScoreResult["points"],
  playerCount: 3 | 4,
): ScoreResult["points"] {
  const responsibleSeat: WindValue | undefined = hand.paoResponsibleSeat;
  const liableUnits = Math.round(yaku
    .filter((y) => PAO_YAKU.has(y.name))
    .reduce((sum, y) => sum + y.han, 0) / 13);
  if (!responsibleSeat || liableUnits === 0) return points;

  const honba = hand.honba ?? 0;
  const isDealer = hand.seatWind === "east";
  const otherUnits = Math.max(0, yakumanUnits(yaku) - liableUnits);

  if (hand.winType === "ron" && hand.ronDiscarderSeat !== responsibleSeat) {
    const liableRon = calculatePoints(0, 30, isDealer, "ron", liableUnits, false, 0, playerCount).total;
    const half = roundUp100(liableRon / 2);
    const otherRon = otherUnits > 0
      ? calculatePoints(0, 30, isDealer, "ron", otherUnits, false, 0, playerCount).total
      : 0;
    return {
      ...points,
      responsiblePays: half,
      // Only the discarder pays honba on ron, plus any non-liable yakuman.
      discarderPays: half + otherRon + 300 * honba,
    };
  }

  if (hand.winType === "ron") return { ...points, responsiblePays: points.total };

  const liableTsumo = calculatePoints(0, 30, isDealer, "tsumo", liableUnits, false, 0, playerCount).total;
  const otherTsumo = otherUnits > 0
    ? calculatePoints(0, 30, isDealer, "tsumo", otherUnits, false, 0, playerCount)
    : undefined;
  const responsibleShare = isDealer
    ? otherTsumo?.tsumo?.nonDealerPays ?? 0
    : responsibleSeat === "east"
      ? otherTsumo?.tsumo?.dealerPays ?? 0
      : otherTsumo?.tsumo?.nonDealerPays ?? 0;
  const perOtherDealerPayment = isDealer || responsibleSeat === "east"
    ? 0
    : (otherTsumo?.tsumo?.dealerPays ?? 0) + 100 * honba;
  const perOtherNonDealerPayment = (otherTsumo?.tsumo?.nonDealerPays ?? 0) + 100 * honba;
  const otherDealerCount = isDealer || responsibleSeat === "east" ? 0 : 1;
  const otherNonDealerCount = isDealer
    ? playerCount - 2
    : playerCount - 2 - (responsibleSeat === "east" ? 0 : 1);
  const otherPlayersPay = otherDealerCount * perOtherDealerPayment
    + otherNonDealerCount * perOtherNonDealerPayment;
  return {
    ...points,
    responsiblePays: liableTsumo + responsibleShare + 100 * honba,
    otherPlayersPay,
    tsumo: { dealerPays: perOtherDealerPayment, nonDealerPays: perOtherNonDealerPayment },
  };
}

function specialWinProblem(hand: Hand): string | null {
  if (hand.haitei && hand.winType !== "tsumo") return "Haitei requires tsumo";
  if (hand.rinshan && hand.winType !== "tsumo") return "Rinshan requires tsumo";
  if (hand.houtei && hand.winType !== "ron") return "Houtei requires ron";
  if (hand.chankan && hand.winType !== "ron") return "Chankan requires ron";
  if (hand.haitei && hand.rinshan) return "Haitei and Rinshan cannot apply together";
  if (hand.houtei && hand.chankan) return "Houtei and Chankan cannot apply together";
  if (hand.openingWin && hand.winType !== "tsumo") return "Tenhou and Chiihou require tsumo";
  if (hand.openingWin === "tenhou" && hand.seatWind !== "east") return "Tenhou requires the dealer";
  if (hand.openingWin === "chiihou" && hand.seatWind === "east") return "Chiihou requires a non-dealer";
  if (hand.openingWin && (hand.melds.length > 0 || hand.opponentKanCount || hand.nukiDoraCount || hand.riichi || hand.doubleRiichi || hand.ippatsu || hand.haitei || hand.rinshan || hand.chankan || hand.renho)) {
    return "Tenhou and Chiihou require the first draw before any player calls or declares a kan";
  }
  if (hand.renho && (hand.winType !== "ron" || hand.seatWind === "east" || hand.melds.length > 0 || hand.opponentKanCount || hand.nukiDoraCount || hand.riichi || hand.doubleRiichi || hand.ippatsu || hand.haitei || hand.houtei || hand.rinshan || hand.chankan)) {
    return "Renhou requires a non-dealer ron before your first draw, with no calls or kans by any player, North extraction, or riichi";
  }
  if (hand.chankan) {
    const heldBeforeWin = [
      ...hand.closedTiles,
      ...hand.melds.flatMap((meld) => meld.tiles),
      ...hand.doraIndicators,
      ...(hand.uraDoraIndicators ?? []),
    ];
    if (heldBeforeWin.some((tile) => tilesEqual(tile, hand.winningTile))) {
      return "Chankan is impossible when you already hold a copy of the tile; the opponent's added kan uses all four copies";
    }
  }
  // Rinshan kaihou is a win on the kan replacement draw, so a declared kan
  // must exist even when the caller bypasses the UI.
  if (hand.rinshan && !hasDeclaredKan(hand.melds)) return "Rinshan requires a declared kan";
  return null;
}

// Sum of only the isYakuman-flagged yaku's han, divided into 13-han units.
// A single yakuman is 1 unit; a doubled yakuman (han: 26) or two distinct
// yakuman stacked on one hand are both 2 units; each further win multiplies
// the payout again. Non-yakuman yaku (including kazoe-yakuman's regular han)
// never contribute here - kazoe-yakuman always pays flat single, unlike real
// yakuman which multiply per unit.
function yakumanUnits(allYaku: Yaku[]): number {
  const han = allYaku.filter((y) => y.isYakuman).reduce((sum, y) => sum + y.han, 0);
  return Math.round(han / 13);
}

// Once any yakuman applies, ordinary yaku (tsumo, yakuhai, toitoi, ...) are
// irrelevant to both the score and the display - a yakuman hand is always
// announced as just the yakuman(s), never "yakuman + 6 more han of yaku
// stacked on top". Without this, totalHan/yaku would show a nonsensical
// inflated number (e.g. suuankou + tsumo + toitoi + sanankou = "19 han")
// even though the payout already ignores everything but the yakuman.
function supersedeWithYakuman(allYaku: Yaku[]): Yaku[] {
  const yakumanOnly = allYaku.filter((y) => y.isYakuman);
  return yakumanOnly.length > 0 ? yakumanOnly : allYaku;
}

function bestInterpretation(
  interpretations: HandInterpretation[],
  hand: Hand,
  rules: RulesConfig,
  bonusHan: number,
): { interp: HandInterpretation; fu: FuBreakdown; yaku: Yaku[]; han: number } {
  let best: { interp: HandInterpretation; fu: FuBreakdown; yaku: Yaku[]; han: number } | null = null;
  let bestPoints = -1;

  for (const interp of interpretations) {
    const parsed = { type: "standard" as const, interpretation: interp };
    const yakuList = detectYaku(hand, parsed, rules);
    const yakumanList = detectYakuman(hand, parsed, rules);
    const allYaku = [...yakuList, ...yakumanList];

    const isPinfu = yakuList.some((y) => y.name === "pinfu");
    const fu = calculateFu(
      interp,
      hand.melds,
      hand.seatWind,
      hand.roundWind,
      hand.winType,
      isPinfu,
      rules,
    );

    const structuralHan = allYaku.reduce((sum, y) => sum + y.han, 0);
    const units = yakumanUnits(allYaku);
    const totalHan = allYaku.some(y => y.isYakuman) ? structuralHan : structuralHan + bonusHan;
    const points = calculatePoints(totalHan, fu.total, hand.seatWind === "east", hand.winType, units, rules.kiriagemangan, hand.honba ?? 0, rules.playerCount ?? 4).total;

    if (!best || points > bestPoints || (points === bestPoints && (structuralHan > best.han || (structuralHan === best.han && fu.total > best.fu.total)))) {
      best = { interp, fu, yaku: allYaku, han: structuralHan };
      bestPoints = points;
    }
  }

  return best!;
}

// Scores a standard-hand grouping; returns null if no yaku applies (can't win on this shape).
function scoreStandardInterpretations(
  interpretations: HandInterpretation[],
  hand: Hand,
  rules: RulesConfig,
  doraCount: number,
  akaDoraCount: number,
  uraDoraCount: number,
  nukiDoraCount: number,
  isDealer: boolean,
  bonusHan: number,
): ScoreResult | null {
  const { fu, yaku: rawYaku, han: rawStructuralHan } = bestInterpretation(interpretations, hand, rules, bonusHan);
  const isYakuman = rawYaku.some((y) => y.isYakuman);

  if (!isYakuman && rawYaku.filter((y) => !y.isYakuman).length === 0) {
    return null;
  }

  const allYaku = supersedeWithYakuman(rawYaku);
  const structuralHan = isYakuman ? allYaku.reduce((sum, y) => sum + y.han, 0) : rawStructuralHan;

  const totalHan = structuralHan + (isYakuman ? 0 : bonusHan);
  const units = yakumanUnits(allYaku);
  const name = handName(totalHan, fu.total, units, rules.kiriagemangan);
  const playerCount = rules.playerCount ?? 4;
  const points = applyPao(
    hand,
    allYaku,
    calculatePoints(totalHan, fu.total, isDealer, hand.winType, units, rules.kiriagemangan, hand.honba ?? 0, playerCount),
    playerCount,
  );

  return {
    valid: true,
    yaku: allYaku,
    totalHan: structuralHan,
    fu: fu.total,
    fuBreakdown: fu,
    doraCount,
    akaDoraCount,
    uraDoraCount,
    nukiDoraCount,
    points,
    handName: name,
  };
}

export function score(hand: Hand, rulesOverride?: Partial<RulesConfig>): ScoreResult {
  const rules: RulesConfig = { ...DEFAULT_RULES, ...rulesOverride };

  // Collect all tiles for dora counting
  const allClosedWithWin = [...hand.closedTiles, hand.winningTile];
  const allMeldTiles = hand.melds.flatMap((m) => m.tiles);
  const allTiles = [...allClosedWithWin, ...allMeldTiles];

  const akaDoraCount = countAkaDora(allTiles);
  const playerCount = rules.playerCount ?? 4;
  const nukiDoraCount = playerCount === 3
    ? Math.min(4, Math.max(0, Math.trunc(hand.nukiDoraCount ?? 0)))
    : 0;
  // Extracted Norths are outside the hand shape, but still count as dora when
  // a visible or ura indicator points to North (West in sanma).
  const doraTiles = nukiDoraCount > 0
    ? [...allTiles, ...Array.from({ length: nukiDoraCount }, () => ({ suit: "honor" as const, value: "north" as const }))]
    : allTiles;
  const doraCount = countDora(doraTiles, hand.doraIndicators, playerCount);
  const uraDoraCount =
    (hand.riichi || hand.doubleRiichi) && hand.uraDoraIndicators
      ? countDora(doraTiles, hand.uraDoraIndicators, playerCount)
      : 0;
  const bonusHan = hand.bonusHanOverride === undefined
    ? doraCount + akaDoraCount + uraDoraCount + nukiDoraCount
    : Number.isFinite(hand.bonusHanOverride)
      ? Math.min(99, Math.max(0, Math.trunc(hand.bonusHanOverride)))
      : 0;

  const specialProblem = specialWinProblem(hand) ?? paoProblem(hand);
  if (specialProblem) {
    return {
      valid: false, error: specialProblem, yaku: [], totalHan: 0, fu: 0,
      fuBreakdown: { base: 0, pairFu: 0, meldFu: 0, waitFu: 0, tsumoFu: 0, total: 0 },
      doraCount, akaDoraCount, uraDoraCount, nukiDoraCount, points: { total: 0 },
    };
  }

  const parsed = parseHand(hand.closedTiles, hand.melds, hand.winningTile);

  if (parsed.type === "invalid") {
    return {
      valid: false,
      error: parsed.reason,
      yaku: [],
      totalHan: 0,
      fu: 0,
      fuBreakdown: { base: 0, pairFu: 0, meldFu: 0, waitFu: 0, tsumoFu: 0, total: 0 },
      doraCount,
      akaDoraCount,
      uraDoraCount,
      nukiDoraCount,
      points: { total: 0 },
    };
  }

  const isDealer = hand.seatWind === "east";
  const hasShapeYakuman = parsed.type === "standard"
    ? parsed.interpretations.some((interpretation) => detectYakuman(hand, { type: "standard", interpretation }, rules).length > 0)
    : parsed.type === "chiitoitsu"
      ? detectYakuman(hand, { type: "chiitoitsu", interp: parsed }, rules).length > 0
      : detectYakuman(hand, { type: "kokushi", interp: parsed }, rules).length > 0;

  // Renhou is configured here as a fixed five-han award, matching the manual
  // method. It replaces ordinary yaku and all dora rather than stacking with
  // the shape, and Seven Pairs is treated consistently with standard hands.
  if (hand.renho && rules.localYaku?.renho && hand.seatWind !== "east" && hand.winType === "ron" && !hasShapeYakuman) {
    const fu: FuBreakdown = parsed.type === "chiitoitsu"
      ? chiitoitsiFuBreakdown()
      : { base: 30, pairFu: 0, meldFu: 0, waitFu: 0, tsumoFu: 0, total: 30 };
    const yaku: Yaku = { name: "renho", nameJa: "人和", han: 5, isYakuman: false };
    const points = calculatePoints(5, fu.total, isDealer, hand.winType, 0, rules.kiriagemangan, hand.honba ?? 0, playerCount);
    return {
      valid: true, yaku: [yaku], totalHan: 5, fu: fu.total, fuBreakdown: fu,
      doraCount: 0, akaDoraCount: 0, uraDoraCount: 0, nukiDoraCount: 0,
      points, handName: handName(5, fu.total, 0, rules.kiriagemangan),
    };
  }

  if (parsed.type === "kokushi") {
    const yakuList: Yaku[] = [];
    const yakumanList = detectYakuman(hand, { type: "kokushi", interp: parsed }, rules);
    const situationalYaku: Yaku[] = [];
    if (hand.doubleRiichi) situationalYaku.push({ name: "double-riichi", nameJa: "ダブル立直", han: 2, isYakuman: false });
    else if (hand.riichi) situationalYaku.push({ name: "riichi", nameJa: "立直", han: 1, isYakuman: false });

    const allYaku = [...yakumanList, ...situationalYaku];
    // Situational yaku (riichi etc.) never scale a yakuman's payout - only
    // stacking further yakuman does. totalHan reflects that: it's the
    // yakuman's own han (13, or 26 if doubled), not the situational extras.
    const totalHan = yakumanList.reduce((sum, y) => sum + y.han, 0);

    // Yakuman fu is irrelevant for points but we return 30 as convention
    const fuBreakdown: FuBreakdown = { base: 30, pairFu: 0, meldFu: 0, waitFu: 0, tsumoFu: 0, total: 30 };
    const points = calculatePoints(totalHan, 30, isDealer, hand.winType, yakumanUnits(allYaku), rules.kiriagemangan, hand.honba ?? 0, rules.playerCount ?? 4);

    return {
      valid: true,
      yaku: allYaku,
      totalHan,
      fu: 30,
      fuBreakdown,
      doraCount,
      akaDoraCount,
      uraDoraCount,
      nukiDoraCount,
      points,
      handName: "yakuman",
    };
  }

  if (parsed.type === "chiitoitsu") {
    const parsedForYaku = { type: "chiitoitsu" as const, interp: parsed };
    const yakuList = detectYaku(hand, parsedForYaku, rules);
    const yakumanList = detectYakuman(hand, parsedForYaku, rules);
    const allYaku = supersedeWithYakuman([...yakuList, ...yakumanList]);

    const structuralHan = allYaku.reduce((sum, y) => sum + y.han, 0);
    const isYakuman = allYaku.some(y => y.isYakuman);
    const totalHan = structuralHan + (isYakuman ? 0 : bonusHan);

    const fuBreakdown = chiitoitsiFuBreakdown();
    const units = yakumanUnits(allYaku);
    const name = handName(totalHan, 25, units, rules.kiriagemangan);
    const points = calculatePoints(totalHan, 25, isDealer, hand.winType, units, rules.kiriagemangan, hand.honba ?? 0, rules.playerCount ?? 4);

    const chiitoitsuResult: ScoreResult = {
      valid: true,
      yaku: allYaku,
      totalHan: structuralHan,
      fu: 25,
      fuBreakdown,
      doraCount,
      akaDoraCount,
      uraDoraCount,
      nukiDoraCount,
      points,
      handName: name,
    };

    // Some seven-pairs shapes (e.g. ryanpeikou) also parse as a standard hand
    // worth more - score both and keep whichever pays out more.
    if (parsed.standardAlt) {
      const standardResult = scoreStandardInterpretations(
        parsed.standardAlt,
        hand,
        rules,
        doraCount,
        akaDoraCount,
        uraDoraCount,
        nukiDoraCount,
        isDealer,
        bonusHan,
      );
      if (standardResult && standardResult.points.total > chiitoitsuResult.points.total) {
        return standardResult;
      }
    }

    return chiitoitsuResult;
  }

  // Standard hand
  const { fu, yaku: rawYaku, han: rawStructuralHan } = bestInterpretation(
    parsed.interpretations,
    hand,
    rules,
    bonusHan,
  );

  const isYakuman = rawYaku.some((y) => y.isYakuman);

  if (!isYakuman && rawYaku.filter((y) => !y.isYakuman).length === 0) {
    // No yaku - check if dora saves it (no, dora doesn't give yaku)
    // Actually need at least one yaku to win
    return {
      valid: false,
      error: "No yaku",
      yaku: [],
      totalHan: 0,
      fu: fu.total,
      fuBreakdown: fu,
      doraCount,
      akaDoraCount,
      uraDoraCount,
      nukiDoraCount,
      points: { total: 0 },
    };
  }

  const allYaku = supersedeWithYakuman(rawYaku);
  const structuralHan = isYakuman ? allYaku.reduce((sum, y) => sum + y.han, 0) : rawStructuralHan;

  const totalHan = structuralHan + (isYakuman ? 0 : bonusHan);
  const units = yakumanUnits(allYaku);
  const name = handName(totalHan, fu.total, units, rules.kiriagemangan);
  const points = applyPao(
    hand,
    allYaku,
    calculatePoints(totalHan, fu.total, isDealer, hand.winType, units, rules.kiriagemangan, hand.honba ?? 0, playerCount),
    playerCount,
  );

  return {
    valid: true,
    yaku: allYaku,
    totalHan: structuralHan,
    fu: fu.total,
    fuBreakdown: fu,
    doraCount,
    akaDoraCount,
    uraDoraCount,
    nukiDoraCount,
    points,
    handName: name,
  };
}
