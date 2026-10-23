/** Sanitize persisted riichi-calculator state before it touches the live form.
 * sessionStorage is trusted storage in practice, but a corrupt or tampered
 * entry must never crash render or silently compute wrong payments. Anything
 * unrecognised falls back to the equivalent default. */

export interface SessionCalculatorGroup {
  id: number;
  type: "triplet" | "kan";
  tileKind: "simple" | "terminal" | "honor";
  concealed: boolean;
  completedByRon: boolean;
  yakuId: string | null;
}

export interface SessionCalculatorForm {
  winType: "ron" | "tsumo";
  seatWind: string;
  seatWindConfirmed: boolean;
  roundWind: string;
  roundWindConfirmed: boolean;
  playerCount: 3 | 4;
  isDealer: boolean;
  isClosed: boolean;
  handShape: "standard" | "chiitoitsu" | "kokushi";
  selectedYaku: string[];
  pairChoice: string | null;
  sevenPairsHasHonor: boolean | null;
  ryuuiisouTilesConfirmed: boolean | null;
  waitType: string | null;
  groups: SessionCalculatorGroup[];
  bonusHan: { dora: number; nuki: number };
  doubleYakumanWaits: { kokushi: boolean; suuankou: boolean; chuuren: boolean };
  honba: number;
  paoApplies: boolean;
  paoResponsibleAlsoDiscarder: boolean | null;
  paoResponsibleIsDealer: boolean | null;
  directHan: number;
  directFu: number;
  groupsConfirmed: boolean;
}

export interface SessionCalculatorDraft {
  groups: SessionCalculatorGroup[];
  pairChoice: string | null;
  waitType: string | null;
  groupsConfirmed: boolean;
}

/** Valid ids supplied by the page (yaku, pair and wait vocabularies live there). */
export interface SessionIdRefs {
  yakuIds: string[];
  pairIds: string[];
  waitIds: string[];
}

const HAND_SHAPES = ["standard", "chiitoitsu", "kokushi"];
const SEAT_WINDS = ["east", "south", "west", "north"];
const ROUND_WINDS = ["east", "south"];
const DIRECT_FU_VALUES = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];

function intAtLeastZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function triState(value: unknown): boolean | null {
  return value === true ? true : value === false ? false : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function sanitizeCalculatorGroups(groups: unknown): SessionCalculatorGroup[] {
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group): SessionCalculatorGroup[] => {
    if (!group || typeof group !== "object") return [];
    const entry = group as Record<string, unknown>;
    if (entry.type !== "triplet" && entry.type !== "kan") return [];
    if (entry.tileKind !== "simple" && entry.tileKind !== "terminal" && entry.tileKind !== "honor") return [];
    return [{
      id: Number(entry.id) || 0,
      type: entry.type,
      tileKind: entry.tileKind,
      concealed: entry.concealed === true,
      completedByRon: entry.completedByRon === true,
      // A non-string yakuId would throw in startsWith during render.
      yakuId: typeof entry.yakuId === "string" ? entry.yakuId : null,
    }];
  });
}

export function sanitizeCalculatorPairChoice(choice: unknown, refs: SessionIdRefs): string | null {
  return typeof choice === "string" && refs.pairIds.includes(choice) ? choice : null;
}

export function sanitizeCalculatorWaitType(wait: unknown, refs: SessionIdRefs): string | null {
  return typeof wait === "string" && refs.waitIds.includes(wait) ? wait : null;
}

export function sanitizeCalculatorForm(saved: unknown, refs: SessionIdRefs): SessionCalculatorForm | null {
  if (!saved || typeof saved !== "object") return null;
  const input = saved as Record<string, unknown>;
  if (!Array.isArray(input.selectedYaku) || !Array.isArray(input.groups)) return null;

  const playerCount = input.playerCount === 3 ? 3 : 4;
  let seatWind = typeof input.seatWind === "string" && SEAT_WINDS.includes(input.seatWind) ? input.seatWind : "south";
  if (playerCount === 3 && seatWind === "north") seatWind = "south";
  // Dealer status and East seat imply each other; repair either half.
  const isDealer = input.isDealer === true || seatWind === "east";
  if (isDealer) seatWind = "east";

  const handShape = typeof input.handShape === "string" && HAND_SHAPES.includes(input.handShape)
    ? (input.handShape as SessionCalculatorForm["handShape"])
    : "standard";
  const selectedYaku = [...new Set(
    (input.selectedYaku as unknown[]).filter((id): id is string => typeof id === "string" && refs.yakuIds.includes(id)),
  )];
  if ((handShape === "chiitoitsu" || handShape === "kokushi") && !selectedYaku.includes(handShape)) {
    selectedYaku.push(handShape);
  }

  const bonus = record(input.bonusHan);
  const waits = record(input.doubleYakumanWaits);

  return {
    winType: input.winType === "tsumo" ? "tsumo" : "ron",
    seatWind,
    seatWindConfirmed: isDealer || input.seatWindConfirmed === true,
    roundWind: typeof input.roundWind === "string" && ROUND_WINDS.includes(input.roundWind) ? input.roundWind : "east",
    roundWindConfirmed: input.roundWindConfirmed === true,
    playerCount,
    isDealer,
    isClosed: input.isClosed !== false,
    handShape,
    selectedYaku,
    pairChoice: sanitizeCalculatorPairChoice(input.pairChoice, refs),
    sevenPairsHasHonor: triState(input.sevenPairsHasHonor),
    ryuuiisouTilesConfirmed: triState(input.ryuuiisouTilesConfirmed),
    waitType: sanitizeCalculatorWaitType(input.waitType, refs),
    groups: sanitizeCalculatorGroups(input.groups),
    bonusHan: {
      dora: intAtLeastZero(bonus.dora),
      nuki: playerCount === 3 ? Math.min(4, intAtLeastZero(bonus.nuki)) : 0,
    },
    doubleYakumanWaits: {
      kokushi: waits.kokushi === true,
      suuankou: waits.suuankou === true,
      chuuren: waits.chuuren === true,
    },
    honba: Math.min(99, intAtLeastZero(input.honba)),
    paoApplies: input.paoApplies === true,
    paoResponsibleAlsoDiscarder: triState(input.paoResponsibleAlsoDiscarder),
    paoResponsibleIsDealer: triState(input.paoResponsibleIsDealer),
    directHan: Math.min(99, intAtLeastZero(input.directHan)),
    directFu: typeof input.directFu === "number" && DIRECT_FU_VALUES.includes(input.directFu) ? input.directFu : 30,
    groupsConfirmed: input.groupsConfirmed === true,
  };
}

export function sanitizeCalculatorDraft(saved: unknown, refs: SessionIdRefs): SessionCalculatorDraft | null {
  if (!saved || typeof saved !== "object") return null;
  const input = saved as Record<string, unknown>;
  if (!Array.isArray(input.groups)) return null;
  return {
    groups: sanitizeCalculatorGroups(input.groups),
    pairChoice: sanitizeCalculatorPairChoice(input.pairChoice, refs),
    waitType: sanitizeCalculatorWaitType(input.waitType, refs),
    groupsConfirmed: input.groupsConfirmed === true,
  };
}
