import { calculatePoints, handName, type HandName } from "./points";

export type ManualWait = "ryanmen" | "penchan" | "kanchan" | "tanki" | "shanpon" | "kokushi-thirteen" | "chuuren-nine";
export type ManualGroupType = "triplet" | "kan";
export type ManualTileKind = "simple" | "terminal" | "honor";
export type ManualYakuCategory = "common" | "yakuhai" | "patterns" | "suits" | "situational" | "yakuman";

export interface ManualGroup {
  id: number;
  type: ManualGroupType;
  tileKind: ManualTileKind;
  concealed: boolean;
  /** A concealed triplet completed on ron is open for fu only. */
  completedByRon: boolean;
  /** The selected dragon or wind yaku represented by this set, when applicable. */
  yakuId?: string | null;
}

export interface ManualYakuOption {
  id: string;
  name: string;
  detail: string;
  category: ManualYakuCategory;
  closedHan: number;
  openHan?: number;
  requiresClosed?: boolean;
  winMethod?: "ron" | "tsumo";
  requiresDealer?: boolean;
  yakuman?: boolean;
  incompatible?: string[];
}

export const MANUAL_YAKU: ManualYakuOption[] = [
  { id: "riichi", name: "Riichi", detail: "Declared riichi", category: "common", closedHan: 1, requiresClosed: true, incompatible: ["double-riichi"] },
  { id: "double-riichi", name: "Double riichi", detail: "Riichi declared on your first discard", category: "common", closedHan: 2, requiresClosed: true, incompatible: ["riichi"] },
  { id: "ippatsu", name: "Ippatsu", detail: "Win before your next discard after riichi, with no intervening calls or kans", category: "situational", closedHan: 1, requiresClosed: true, incompatible: ["rinshan"] },
  { id: "pinfu", name: "Pinfu", detail: "Four runs, a non-value pair and a two-sided wait", category: "common", closedHan: 1, requiresClosed: true, incompatible: ["chiitoitsu", "toitoi", "sanankou", "suuankou"] },
  { id: "iipeiko", name: "Iipeikou", detail: "Two identical runs; closed hand", category: "patterns", closedHan: 1, requiresClosed: true, incompatible: ["ryanpeiko"] },
  { id: "tanyao", name: "Tanyao", detail: "All tiles are 2–8", category: "common", closedHan: 1, openHan: 1 },
  { id: "yakuhai-haku", name: "White dragon set", detail: "White dragon triplet or kan · 1 han", category: "yakuhai", closedHan: 1, openHan: 1 },
  { id: "yakuhai-hatsu", name: "Green dragon set", detail: "Green dragon triplet or kan · 1 han", category: "yakuhai", closedHan: 1, openHan: 1 },
  { id: "yakuhai-chun", name: "Red dragon set", detail: "Red dragon triplet or kan · 1 han", category: "yakuhai", closedHan: 1, openHan: 1 },
  { id: "yakuhai-seat", name: "Seat-wind set", detail: "Your seat-wind triplet or kan", category: "yakuhai", closedHan: 1, openHan: 1 },
  { id: "yakuhai-round", name: "Round-wind set", detail: "The round-wind triplet or kan", category: "yakuhai", closedHan: 1, openHan: 1 },
  { id: "chankan", name: "Chankan", detail: "Robbed an added kan", category: "situational", closedHan: 1, openHan: 1, winMethod: "ron", incompatible: ["houtei"] },
  { id: "rinshan", name: "Rinshan", detail: "Won on the replacement tile after a kan", category: "situational", closedHan: 1, openHan: 1, winMethod: "tsumo", incompatible: ["haitei", "ippatsu"] },
  { id: "haitei", name: "Haitei", detail: "Won by tsumo on the final live-wall tile", category: "situational", closedHan: 1, openHan: 1, winMethod: "tsumo", incompatible: ["rinshan"] },
  { id: "houtei", name: "Houtei", detail: "Won by ron on the final discard", category: "situational", closedHan: 1, openHan: 1, winMethod: "ron", incompatible: ["chankan"] },

  { id: "chiitoitsu", name: "Chiitoitsu", detail: "Seven different pairs", category: "patterns", closedHan: 2, requiresClosed: true, incompatible: ["pinfu", "toitoi", "sanankou", "suuankou"] },
  { id: "ittsu", name: "Ittsuu", detail: "123, 456 and 789 in one suit", category: "patterns", closedHan: 2, openHan: 1 },
  { id: "sanshoku-doujun", name: "Sanshoku doujun", detail: "The same run in all three suits", category: "patterns", closedHan: 2, openHan: 1, incompatible: ["honitsu", "chinitsu"] },
  { id: "sanshoku-doukou", name: "Sanshoku doukou", detail: "The same triplet in all three suits", category: "patterns", closedHan: 2, openHan: 2, incompatible: ["honitsu", "chinitsu"] },
  { id: "toitoi", name: "Toitoi", detail: "Four triplets or kans; no runs", category: "patterns", closedHan: 2, openHan: 2, incompatible: ["pinfu", "chiitoitsu"] },
  { id: "sanankou", name: "Sanankou", detail: "Three concealed triplets or kans", category: "patterns", closedHan: 2, openHan: 2, incompatible: ["pinfu", "chiitoitsu", "suuankou"] },
  { id: "sankantsu", name: "Sankantsu", detail: "Three kans", category: "patterns", closedHan: 2, openHan: 2 },
  { id: "chanta", name: "Chanta", detail: "Every group contains a terminal or honour", category: "suits", closedHan: 2, openHan: 1, incompatible: ["junchan", "chinitsu"] },
  { id: "honroutou", name: "Honroutou", detail: "Only terminals and honours; combines with All Triplets or Seven Pairs", category: "suits", closedHan: 2, openHan: 2 },
  { id: "shousangen", name: "Shousangen", detail: "Two dragon sets and a pair of the third dragon · plus 2 Yakuhai han", category: "patterns", closedHan: 2, openHan: 2 },

  { id: "ryanpeiko", name: "Ryanpeikou", detail: "Two pairs of identical runs; closed hand", category: "patterns", closedHan: 3, requiresClosed: true, incompatible: ["iipeiko"] },
  { id: "honitsu", name: "Honitsu", detail: "One suit and honours", category: "suits", closedHan: 3, openHan: 2, incompatible: ["chinitsu", "junchan"] },
  { id: "junchan", name: "Junchan", detail: "Every group contains 1 or 9; no honours", category: "suits", closedHan: 3, openHan: 2, incompatible: ["chanta", "honitsu"] },
  { id: "renhou", name: "Renhou", detail: "Non-dealer ron before your first draw", category: "situational", closedHan: 5, requiresClosed: true, winMethod: "ron", requiresDealer: false, incompatible: ["pinfu", "iipeiko", "ryanpeiko", "riichi", "double-riichi", "ippatsu", "chankan", "houtei", "tanyao", "ittsu", "sanshoku-doujun", "sanshoku-doukou", "toitoi", "sanankou", "sankantsu", "chanta", "junchan", "honroutou", "shousangen", "honitsu", "chinitsu"] },
  { id: "chinitsu", name: "Chinitsu", detail: "One suit, no honours", category: "suits", closedHan: 6, openHan: 5, incompatible: ["honitsu", "chanta", "shousangen"] },

  { id: "tenhou", name: "Tenhou", detail: "Dealer wins on the opening draw", category: "yakuman", closedHan: 13, requiresClosed: true, winMethod: "tsumo", requiresDealer: true, yakuman: true, incompatible: ["sankantsu", "suuankantsu", "riichi", "double-riichi", "ippatsu", "rinshan", "haitei"] },
  { id: "chiihou", name: "Chiihou", detail: "Non-dealer wins on the first draw before any call", category: "yakuman", closedHan: 13, requiresClosed: true, winMethod: "tsumo", requiresDealer: false, yakuman: true, incompatible: ["sankantsu", "suuankantsu", "riichi", "double-riichi", "ippatsu", "rinshan", "haitei"] },
  { id: "kokushi", name: "Kokushi musou", detail: "Thirteen orphans; thirteen-sided wait is double", category: "yakuman", closedHan: 13, requiresClosed: true, yakuman: true, incompatible: ["suuankou", "daisangen", "shousangen", "daisuushi", "shousuushi", "suuankantsu", "sankantsu", "toitoi", "sanankou", "chiitoitsu"] },
  { id: "chuuren", name: "Chuuren poutou", detail: "Nine gates; pure nine-sided wait is double", category: "yakuman", closedHan: 13, requiresClosed: true, yakuman: true, incompatible: ["sankantsu"] },
  { id: "ryuuiisou", name: "Ryuuiisou", detail: "All green tiles", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true },
  { id: "suuankou", name: "Suuankou", detail: "Four concealed triplets; tanki wait is double", category: "yakuman", closedHan: 13, requiresClosed: true, yakuman: true, incompatible: ["pinfu", "sanankou", "chiitoitsu", "kokushi"] },
  { id: "suuankantsu", name: "Suukantsu", detail: "Four kans", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true, incompatible: ["kokushi", "tenhou", "chiihou"] },
  { id: "chinroutou", name: "Chinroutou", detail: "All terminals", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true },
  { id: "tsuuiisou", name: "Tsuuiisou", detail: "All honours", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true },
  { id: "daisangen", name: "Daisangen", detail: "A set of all three dragons", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true, incompatible: ["kokushi", "shousangen"] },
  { id: "shousuushi", name: "Shousuushi", detail: "Three wind sets and a pair of the fourth wind", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true, incompatible: ["kokushi", "daisuushi"] },
  { id: "daisuushi", name: "Daisuushi", detail: "A set of all four winds", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true, incompatible: ["kokushi", "shousuushi"] },
];

/** Yaku whose pattern spans several groups, so every triplet and kan must be listed to check them. */
export const STRUCTURAL_GROUP_YAKU = ["chanta", "junchan", "honitsu", "honroutou", "toitoi", "sanankou", "sankantsu", "sanshoku-doukou", "suuankou", "suuankantsu", "daisangen", "daisuushi", "shousuushi", "ryuuiisou", "chinroutou", "tsuuiisou"];

const additionalYakuConflicts: Record<string, string[]> = {
  "yakuhai-haku": ["tanyao", "pinfu", "chiitoitsu", "junchan", "chinitsu", "kokushi", "chuuren", "chinroutou", "ryuuiisou"],
  "yakuhai-hatsu": ["tanyao", "pinfu", "chiitoitsu", "junchan", "chinitsu", "kokushi", "chuuren", "chinroutou"],
  "yakuhai-chun": ["tanyao", "pinfu", "chiitoitsu", "junchan", "chinitsu", "kokushi", "chuuren", "chinroutou", "ryuuiisou"],
  "yakuhai-seat": ["tanyao", "pinfu", "chiitoitsu", "junchan", "chinitsu", "kokushi", "chuuren", "chinroutou"],
  "yakuhai-round": ["tanyao", "pinfu", "chiitoitsu", "junchan", "chinitsu", "kokushi", "chuuren", "chinroutou"],
  chiitoitsu: ["iipeiko", "ryanpeiko", "ittsu", "sanshoku-doujun", "sanshoku-doukou", "sankantsu", "chanta", "junchan", "shousangen", "suuankantsu", "daisangen", "shousuushi", "daisuushi", "chinroutou", "chuuren", "ryuuiisou"],
  tanyao: ["chanta", "junchan", "honroutou", "honitsu", "shousangen", "kokushi", "chuuren", "chinroutou", "tsuuiisou", "daisangen", "shousuushi", "daisuushi"],
  honroutou: ["pinfu", "iipeiko", "ryanpeiko", "ittsu", "sanshoku-doujun", "chanta", "junchan", "chinitsu", "ryuuiisou", "chinroutou"],
  toitoi: ["pinfu", "chiitoitsu", "iipeiko", "ryanpeiko", "ittsu", "sanshoku-doujun", "chanta", "junchan"],
  "sanshoku-doukou": ["pinfu", "chiitoitsu", "honitsu", "chinitsu"],
  "sanshoku-doujun": ["honitsu", "chinitsu"],
  ittsu: ["tanyao", "chanta", "junchan", "sanshoku-doujun", "ryanpeiko"],
  iipeiko: ["sanankou", "sankantsu", "sanshoku-doujun"],
  ryanpeiko: ["sanshoku-doujun", "sankantsu"],
  pinfu: ["sankantsu"],
  daisangen: ["ittsu", "shousuushi", "daisuushi"],
  shousuushi: ["ittsu", "ryanpeiko", "shousangen"],
  shousangen: ["chinitsu"],
  tsuuiisou: ["pinfu", "iipeiko", "ryanpeiko", "ittsu", "sanshoku-doujun", "sanshoku-doukou", "chanta", "junchan", "honitsu", "chinitsu", "honroutou", "chuuren", "chinroutou", "ryuuiisou"],
  ryuuiisou: ["chanta", "junchan", "honroutou", "chinroutou", "daisangen", "shousuushi", "daisuushi", "sanshoku-doujun", "sanshoku-doukou", "ittsu"],
  chuuren: ["kokushi", "suuankou", "suuankantsu", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "chinroutou", "ryuuiisou"],
  chinroutou: ["tsuuiisou", "ryuuiisou", "daisangen", "shousuushi", "daisuushi"],
};
const dragonYakuIds = ["yakuhai-haku", "yakuhai-hatsu", "yakuhai-chun"];
const shousangenPairToYaku: Record<string, string> = {
  "dragon-haku": "yakuhai-haku",
  "dragon-hatsu": "yakuhai-hatsu",
  "dragon-chun": "yakuhai-chun",
};
for (const [id, conflicts] of Object.entries(additionalYakuConflicts)) {
  const option = MANUAL_YAKU.find((yaku) => yaku.id === id);
  if (option) option.incompatible = [...new Set([...(option.incompatible ?? []), ...conflicts])];
  for (const conflict of conflicts) {
    const other = MANUAL_YAKU.find((yaku) => yaku.id === conflict);
    if (other) other.incompatible = [...new Set([...(other.incompatible ?? []), id])];
  }
}

type YakuAvailabilityInput = Pick<ManualScoreInput, "selectedYaku" | "isClosed" | "isDealer" | "winType" | "playerCount" | "handShape">;

/** Keep picker guidance and scorer validation on the same yaku rules. */
export function manualYakuUnavailableReason(id: string, input: YakuAvailabilityInput): string | null {
  const option = selectedOption(id);
  if (!option) return "Remove this unrecognised yaku.";
  if (input.handShape === "kokushi" && !["kokushi", "riichi", "double-riichi", "ippatsu", "tenhou", "chiihou", "chankan", "haitei", "houtei"].includes(id)) {
    return "Kokushi can only combine with Riichi, compatible situational yaku, or a compatible first-draw yakuman.";
  }
  if (input.handShape === "chiitoitsu" && ["pinfu", "iipeiko", "ryanpeiko", "toitoi", "sanankou", "suuankou"].includes(id)) {
    return "This hand is set as Seven Pairs.";
  }
  if (input.playerCount === 3 && id === "sanshoku-doujun") {
    return "Sanshoku doujun needs runs in all three suits, but three-player mahjong removes 2–8 man.";
  }
  if (option.requiresClosed && !input.isClosed) return `${option.name} requires a closed hand.`;
  if (option.winMethod && option.winMethod !== input.winType) {
    return `${option.name} requires ${option.winMethod === "tsumo" ? "tsumo (self-draw)" : "ron (a discard)"}.`;
  }
  if (option.requiresDealer !== undefined && option.requiresDealer !== input.isDealer) {
    return `${option.name} requires ${option.requiresDealer ? "the dealer" : "a non-dealer"}.`;
  }
  if (id === "ippatsu" && !input.selectedYaku.some((selected) => ["riichi", "double-riichi"].includes(selected))) {
    return "Ippatsu requires Riichi or Double riichi.";
  }
  const conflictingId = input.selectedYaku.find((selected) => {
    if (selected === id) return false;
    const other = selectedOption(selected);
    return id === "renhou" || selected === "renhou" || option.incompatible?.includes(selected) || other?.incompatible?.includes(id);
  });
  if (conflictingId) return `${option.name} cannot be scored alongside ${selectedOption(conflictingId)?.name ?? conflictingId}.`;
  return null;
}

export interface ManualScoreInput {
  selectedYaku: string[];
  isClosed: boolean;
  isDealer: boolean;
  seatWind: string;
  roundWind: string;
  winType: "ron" | "tsumo";
  playerCount: 3 | 4;
  handShape: "standard" | "chiitoitsu" | "kokushi";
  riichiDeclared: boolean;
  pairFu: number | null;
  pairChoice: string | null;
  waitType: ManualWait | null;
  pairIsValue: boolean | null;
  /** For Seven Pairs + Honitsu, confirms at least one pair is an honour. */
  sevenPairsHasHonor?: boolean | null;
  /** Confirms the exact bamboo 2/3/4/6/8 and Green-dragon tile rule for All Green. */
  ryuuiisouTilesConfirmed?: boolean | null;
  groups: ManualGroup[];
  /** True when the user confirmed every triplet and kan is listed. */
  groupsConfirmed?: boolean;
  bonusHan: { dora: number; nuki: number };
  doubleYakumanWaits: { kokushi: boolean; suuankou: boolean; chuuren: boolean };
  honba: number;
  /** Pao applies to Daisangen or Daisuushi under the local league rules. */
  paoApplies?: boolean;
  /** For ron, whether the pao-responsible player also discarded the winning tile. */
  paoResponsibleAlsoDiscarder?: boolean | null;
  /** Needed for tsumo when other yakuman also score. */
  paoResponsibleIsDealer?: boolean | null;
  kiriageMangan?: boolean;
}

export interface ManualFuBreakdown {
  base: number;
  closedRon: number;
  tsumo: number;
  pair: number;
  groups: number;
  wait: number;
  raw: number;
  total: number;
}

export interface ManualScoreResult {
  issues: string[];
  isYakuman: boolean;
  han: number;
  yakumanUnits: number;
  fu: number | null;
  fuBreakdown: ManualFuBreakdown | null;
  handName?: HandName;
  points: number;
  ron: number;
  tsumo?: { dealerPays: number; nonDealerPays: number };
  yaku: { id: string; name: string; han: number }[];
  bonusHan: number;
  pao?: { responsiblePays: number; discarderPays?: number; otherTsumo?: { dealerPays: number; nonDealerPays: number }; responsibleIsDealer?: boolean };
}

export interface ManualHanFuInput {
  han: number;
  fu: number;
  isClosed: boolean;
  isDealer: boolean;
  winType: "ron" | "tsumo";
  playerCount: 3 | 4;
  honba: number;
  kiriageMangan?: boolean;
}

/** Score a hand when its total han and fu are already known. */
export function calculateManualHanFuScore(input: ManualHanFuInput): ManualScoreResult {
  const issues: string[] = [];
  const validHan = Number.isSafeInteger(input.han) && input.han >= 1;
  const validFu = new Set([20, 25, ...Array.from({ length: 9 }, (_, index) => 30 + index * 10)]).has(input.fu);
  if (!validHan) issues.push("Enter a whole number of han greater than zero. A hand needs a yaku to win.");
  if (!Number.isSafeInteger(input.honba) || input.honba < 0) issues.push("Honba must be a whole number of zero or more.");

  if (validHan && input.han < 5) {
    if (!validFu) issues.push("Choose a valid fu total.");
    if (input.fu === 20 && input.winType !== "tsumo") issues.push("20 fu is only possible on tsumo.");
    if (input.fu === 20 && input.han < 2) issues.push("20 fu requires at least 2 han.");
    if (input.fu === 20 && !input.isClosed) issues.push("20 fu requires a closed hand with Pinfu on tsumo.");
    if (input.fu === 25 && input.han < 2) issues.push("25 fu is Seven Pairs, which is worth at least 2 han.");
    if (input.fu === 25 && input.winType === "tsumo" && input.han < 3) issues.push("25 fu on tsumo needs at least 3 han: Seven Pairs plus Menzen tsumo or another yaku.");
    if (input.fu === 25 && !input.isClosed) issues.push("25 fu is Seven Pairs and requires a closed hand.");
    if (input.han === 1 && input.fu < 30) issues.push("A 1-han hand cannot score below 30 fu.");
  }

  const fu = validHan && input.han >= 5 ? 30 : input.fu;
  const name = validHan ? handName(input.han, fu, 0, input.kiriageMangan ?? false) : undefined;
  const payments = issues.length === 0
    ? calculatePoints(input.han, fu, input.isDealer, input.winType, 0, input.kiriageMangan ?? false, input.honba, input.playerCount)
    : null;
  return {
    issues,
    isYakuman: false,
    han: validHan ? input.han : 0,
    yakumanUnits: 0,
    fu: validHan && input.han < 5 ? fu : null,
    fuBreakdown: null,
    handName: name,
    points: payments?.total ?? 0,
    ron: payments?.ron ?? 0,
    tsumo: payments?.tsumo,
    yaku: [],
    bonusHan: 0,
  };
}

/** Fu for one triplet or kan, including the opened-by-ron rule for concealed triplets. */
export function tripletFu(group: ManualGroup): number {
  const terminal = group.tileKind !== "simple";
  if (group.type === "kan") {
    if (group.concealed) return terminal ? 32 : 16;
    return terminal ? 16 : 8;
  }
  const completedByRon = group.concealed && group.completedByRon;
  if (completedByRon) return terminal ? 4 : 2;
  if (group.concealed) return terminal ? 8 : 4;
  return terminal ? 4 : 2;
}

function groupName(group: ManualGroup): string {
  const tileKind = group.tileKind === "simple" ? "simple" : group.tileKind === "terminal" ? "terminal" : "honour";
  return `${group.type === "kan" ? "Kan" : "Triplet"}, ${group.concealed ? "concealed" : "called"}, ${tileKind}`;
}

function selectedOption(id: string): ManualYakuOption | undefined {
  return MANUAL_YAKU.find((option) => option.id === id);
}

function yakumanUnits(input: ManualScoreInput): number {
  let units = 0;
  for (const id of input.selectedYaku) {
    const option = selectedOption(id);
    if (!option?.yakuman) continue;
    const double =
      (id === "kokushi" && input.doubleYakumanWaits.kokushi) ||
      (id === "suuankou" && input.doubleYakumanWaits.suuankou) ||
      (id === "chuuren" && input.doubleYakumanWaits.chuuren);
    units += double ? 2 : 1;
  }
  return units;
}

export function manualScoringIssues(input: ManualScoreInput): string[] {
  const issues: string[] = [];
  const selected = new Set(input.selectedYaku);
  const selectedYakuman = input.selectedYaku.filter((id) => selectedOption(id)?.yakuman);
  const needsGroupFu = selectedYakuman.length === 0 && manualHandValue(input).han < 5;
  const isSevenPairs = input.handShape === "chiitoitsu" || selected.has("chiitoitsu");
  const allGroupsKnown = input.groups.length === 4 || input.groupsConfirmed === true;
  const requiresCompleteGroups = input.handShape === "standard"
    && STRUCTURAL_GROUP_YAKU.some(id => selected.has(id));
  const possibleUnlistedGroups = input.groupsConfirmed
    ? 0
    : Math.max(0, 4 - input.groups.length);

  if (selected.size !== input.selectedYaku.length) issues.push("Each yaku can only be selected once.");

  for (const [label, value] of Object.entries({
    dora: input.bonusHan.dora,
    "North bonus": input.bonusHan.nuki,
    honba: input.honba,
  })) {
    if (!Number.isSafeInteger(value) || value < 0) issues.push(`${label} must be a non-negative whole number.`);
  }
  if (input.bonusHan.nuki > 4 || (input.playerCount === 4 && input.bonusHan.nuki > 0)) {
    issues.push("North bonus tiles require a three-player table, with no more than four tiles.");
  }
  if (input.bonusHan.nuki > 3 && selected.has("kokushi")) {
    issues.push("Kokushi needs a North tile in the hand, so no more than three North tiles can be extracted.");
  }
  if (input.bonusHan.nuki > 2 && isSevenPairs && selected.has("tsuuiisou")) {
    issues.push("Seven Pairs plus All Honours needs a North pair in the hand, so no more than two North tiles can be extracted.");
  }

  if (selected.size === 0 && !(input.isClosed && input.winType === "tsumo")) issues.push("Select at least one yaku. Dora alone cannot complete a winning hand.");
  if (input.groups.length > 4) issues.push("A hand can have no more than four groups.");
  if (requiresCompleteGroups && !allGroupsKnown) issues.push("Confirm that all triplets and kans are entered, or confirm the remaining groups are runs.");
  if (input.isClosed && input.groups.some((group) => !group.concealed)) issues.push("Called groups require an open hand. Change the hand to open or remove the called groups.");
  if (input.handShape === "kokushi" && input.groups.length) issues.push("Kokushi musou has no sets. Remove the listed groups.");
  if (input.riichiDeclared && !input.isClosed) issues.push("Riichi requires a closed hand.");
  if (selected.has("ippatsu") && !selected.has("riichi") && !selected.has("double-riichi")) issues.push("Ippatsu requires riichi or double riichi.");
  if (selected.has("ippatsu") && (!input.isClosed || input.groups.some((group) => !group.concealed))) issues.push("Ippatsu requires a closed hand with no calls.");
  if (selected.has("double-riichi") && !input.isClosed) issues.push("Double riichi requires a closed hand.");
  if ((selected.has("tenhou") || selected.has("chiihou") || selected.has("renhou")) && input.groups.some((group) => group.type === "kan")) issues.push("A first-draw win cannot include a kan. Remove the kan or deselect the first-draw yaku.");
  if ((selected.has("tenhou") || selected.has("chiihou") || selected.has("renhou")) && input.groups.some((group) => !group.concealed)) issues.push("A first-draw win cannot include a call. Remove the called group or deselect the first-draw yaku.");
  if (selected.has("rinshan") && input.handShape !== "standard") issues.push("Rinshan requires a standard hand; Seven Pairs and Thirteen Orphans cannot contain a kan.");
  if ((selected.has("kokushi") || selected.has("chiitoitsu") || selected.has("chuuren")) && input.groups.some((group) => group.type === "kan")) {
    issues.push("This hand shape cannot contain a kan. Remove the kan or change the selected hand shape or yaku.");
  }
  if (selected.has("chuuren") && selected.has("rinshan")) issues.push("Nine Gates cannot include a kan or a Rinshan win.");
  if (selected.has("chankan")) {
    const ordinaryKokushiMissingOrphanWait = selected.has("kokushi") && !input.doubleYakumanWaits.kokushi && input.waitType === null;
    if (input.waitType === null && !ordinaryKokushiMissingOrphanWait) issues.push("Choose the winning wait to check whether Chankan could use a fifth copy of the robbed tile.");
    if (input.handShape === "chiitoitsu" || selected.has("chuuren") || input.waitType === "tanki" || input.waitType === "shanpon" || (selected.has("kokushi") && (input.doubleYakumanWaits.kokushi || input.waitType === "kokushi-thirteen"))) {
      issues.push("This Chankan wait already holds a copy of the robbed tile, so the added kan would require a fifth copy. Use a wait where your hand holds none of that tile.");
    }
  }
  if (needsGroupFu && selected.has("rinshan") && input.groups.every((group) => group.type !== "kan")) issues.push("Rinshan requires a kan in the winning hand.");
  if (selected.has("renhou") && input.winType !== "ron") issues.push("Renhou requires a ron win before your first draw.");
  if (selected.has("renhou") && input.bonusHan.nuki > 0) issues.push("Renhou happens before North extraction; remove the nuki bonuses.");
  if (input.paoApplies && !["daisangen", "daisuushi"].some((id) => selected.has(id))) issues.push("Pao only applies to Daisangen or Daisuushi.");
  if (input.paoApplies && input.winType === "ron" && input.paoResponsibleAlsoDiscarder == null) issues.push("Choose whether the pao-responsible player also discarded the winning tile.");
  if (input.paoApplies && input.winType === "tsumo" && !input.isDealer && yakumanUnits(input) > 1 && input.paoResponsibleIsDealer == null) issues.push("Choose whether the pao-responsible player is the dealer to split the other yakuman payments.");
  if (input.paoApplies && input.winType === "tsumo" && input.isDealer && input.paoResponsibleIsDealer === true) issues.push("The pao-responsible player cannot be the dealer when you are the dealer.");

  for (const id of selected) {
    const option = selectedOption(id);
    if (!option) {
      issues.push("Remove an unrecognised yaku selection.");
      continue;
    }
    const reason = manualYakuUnavailableReason(id, input);
    if (reason) issues.push(reason);
  }

  if (selected.has("renhou") && input.isClosed && input.winType === "tsumo") issues.push("Renhou is a ron win and cannot stack with Menzen tsumo.");
  if (selected.has("pinfu")) {
    if (input.groups.length) issues.push("Pinfu has only runs. Remove the listed triplets or kans, or deselect Pinfu.");
    if ((input.pairFu !== null && input.pairFu !== 0) || input.pairIsValue === true) issues.push("Pinfu needs a non-value pair.");
    if (input.waitType !== null && input.waitType !== "ryanmen") issues.push("Pinfu needs a two-sided wait.");
    if (!input.isClosed) issues.push("Pinfu requires a closed hand.");
  }
  if (selected.has("tanyao")) {
    if (input.pairChoice && input.pairChoice !== "simple") {
      issues.push("Tanyao needs a number-tile pair. Change the pair or deselect Tanyao.");
    }
    if (input.groups.some((group) => group.tileKind !== "simple")) {
      issues.push("Tanyao cannot include terminal or honour triplets and kans. Remove those groups or deselect Tanyao.");
    }
    if (input.waitType === "penchan") {
      issues.push("Tanyao cannot use an edge wait because it needs a 1 or 9. Choose another wait or deselect Tanyao.");
    }
  }
  const suitedPattern = selected.has("chanta") || selected.has("junchan");
  if (suitedPattern) {
    const allowedPair = selected.has("junchan") ? input.pairChoice === "terminal-number" : ["terminal-number", "non-value-wind", "dragon", "seat-wind", "round-wind", "double-wind"].includes(input.pairChoice ?? "") || input.pairChoice?.startsWith("dragon-") === true;
    if (!input.pairChoice) issues.push(`${selected.has("junchan") ? "Junchan" : "Chanta"} needs a terminal or honour pair. Choose the pair.`);
    if (input.pairChoice && !allowedPair) issues.push(`${selected.has("junchan") ? "Junchan" : "Chanta"} needs a terminal or honour pair. Choose a valid pair or deselect the yaku.`);
    const invalidGroup = input.groups.some((group) => selected.has("junchan") ? group.tileKind !== "terminal" : group.tileKind === "simple");
    if (invalidGroup) issues.push(`${selected.has("junchan") ? "Junchan" : "Chanta"} cannot include ${selected.has("junchan") ? "honour or simple" : "simple"} triplets and kans.`);
    if (input.groups.length === 4) issues.push(`${selected.has("junchan") ? "Junchan" : "Chanta"} needs at least one run. Four entered triplets or kans leave no run.`);
    if (selected.has("chanta") && input.pairChoice === "terminal-number" && !input.groups.some((group) => group.tileKind === "honor") && input.groups.length >= 3) {
      issues.push("Chanta needs at least one honour pair or group as well as a terminal. The remaining sets must include a run.");
    }
    if (selected.has("chanta") && input.groupsConfirmed && input.pairChoice === "terminal-number" && !input.groups.some((group) => group.tileKind === "honor")) {
      issues.push("Chanta needs an honour pair or group. Choose an honour pair or add an honour triplet or kan.");
    }
  }
  const honorPair = ["non-value-wind", "dragon", "seat-wind", "round-wind", "double-wind"].includes(input.pairChoice ?? "") || input.pairChoice?.startsWith("dragon-") === true;
  const hasHonor = honorPair || input.groups.some((group) => group.tileKind === "honor");
  if ((selected.has("chinitsu") || selected.has("chuuren")) && (honorPair || input.groups.some((group) => group.tileKind === "honor"))) {
    issues.push(`${selected.has("chuuren") ? "Nine Gates" : "Chinitsu"} cannot include honours. Change the pair or remove the honour groups.`);
  }
  if (selected.has("honitsu") && allGroupsKnown && !hasHonor) {
    issues.push("Honitsu needs at least one honour pair, triplet or kan. Choose an honour pair or add an honour group.");
  }
  if (selected.has("honitsu") && isSevenPairs) {
    if (input.sevenPairsHasHonor == null) issues.push("Seven Pairs with Honitsu needs at least one honour pair. Confirm that your seven pairs include a wind or dragon.");
    else if (!input.sevenPairsHasHonor) issues.push("Honitsu needs at least one honour pair; this Seven Pairs hand has none.");
  }
  if (selected.has("ryuuiisou")) {
    if (input.ryuuiisouTilesConfirmed == null) issues.push("Confirm every tile is bamboo 2, 3, 4, 6 or 8, or a Green dragon.");
    else if (!input.ryuuiisouTilesConfirmed) issues.push("All Green only allows bamboo 2, 3, 4, 6, 8 and Green dragons.");
    if (!input.pairChoice) issues.push("Choose the pair to confirm it is a suited tile or Green dragon.");
    if (input.pairChoice === "terminal-number") issues.push("All Green cannot include a terminal pair. Choose a simple or green-dragon pair.");
    if (["dragon", "dragon-haku", "dragon-chun"].includes(input.pairChoice ?? "")) issues.push("All Green only allows a Green dragon pair. Choose Green dragon or a suited pair.");
    if (input.groups.some((group) => group.tileKind === "terminal" || (group.tileKind === "honor" && group.yakuId !== "yakuhai-hatsu"))) {
      issues.push("All Green cannot include terminal, White dragon, Red dragon or non-green wind groups.");
    }
  }
  if (selected.has("daisangen")) {
    const dragonGroups = input.groups.filter((group) => dragonYakuIds.includes(group.yakuId ?? ""));
    if (!input.pairChoice || input.pairChoice.startsWith("dragon-") || input.pairChoice === "dragon") issues.push("Big Three Dragons needs a pair other than the three dragon sets.");
    if (dragonGroups.some((group) => group.tileKind !== "honor")) issues.push("Big Three Dragons needs three honour groups, one for each dragon.");
    if (allGroupsKnown && dragonGroups.length !== 3) issues.push("Big Three Dragons needs three different dragon triplets or kans. Mark each group.");
    if (new Set(dragonGroups.map((group) => group.yakuId)).size !== dragonGroups.length) issues.push("Big Three Dragons needs one set of each different dragon.");
  }
  if (selected.has("daisuushi")) {
    if (!input.pairChoice || input.pairChoice.startsWith("wind-") || ["seat-wind", "round-wind", "double-wind", "non-value-wind"].includes(input.pairChoice)) issues.push("Big Four Winds needs a pair that is not a wind.");
    if (input.groups.some((group) => group.tileKind !== "honor")) issues.push("Big Four Winds cannot include suited groups.");
    const windSets = input.groups.map(group => group.yakuId).filter((id): id is string => Boolean(id) && ["wind-east", "wind-south", "wind-west", "wind-north"].includes(id!));
    if (allGroupsKnown && (windSets.length !== 4 || new Set(windSets).size !== 4)) issues.push("Big Four Winds needs one triplet or kan of each wind. Mark all four wind groups.");
  }
  if (selected.has("shousuushi")) {
    if (!input.pairChoice?.startsWith("wind-")) issues.push("Little Four Winds needs a specific wind pair. Choose East, South, West or North.");
    if (input.groups.some((group) => group.tileKind !== "honor")) issues.push("Little Four Winds cannot include suited groups.");
    const windSets = input.groups.map(group => group.yakuId).filter((id): id is string => Boolean(id) && ["wind-east", "wind-south", "wind-west", "wind-north"].includes(id!));
    if (new Set(windSets).size !== windSets.length) issues.push("Little Four Winds needs three different wind triplets or kans. Mark each wind group.");
    if (allGroupsKnown && windSets.length !== 3) issues.push("Little Four Winds needs exactly three wind triplets or kans and a pair of the fourth wind.");
    if (input.pairChoice?.startsWith("wind-") && windSets.includes(input.pairChoice)) issues.push("Little Four Winds cannot use the pair wind for both its pair and a set.");
    if (input.pairChoice === "seat-wind" && windSets.includes(`wind-${input.seatWind}`)) issues.push("Little Four Winds cannot use the seat wind for both its pair and a set.");
    if (input.pairChoice === "round-wind" && windSets.includes(`wind-${input.roundWind}`)) issues.push("Little Four Winds cannot use the round wind for both its pair and a set.");
    if (input.pairChoice === "double-wind" && [input.seatWind, input.roundWind].some(wind => windSets.includes(`wind-${wind}`))) issues.push("Little Four Winds cannot use the pair wind for both its pair and a set.");
  }
  if (selected.has("honroutou")) {
    if (!input.pairChoice) issues.push("Honroutou needs a terminal or honour pair. Choose the pair.");
    if (input.pairChoice && !["terminal-number", "non-value-wind", "dragon", "seat-wind", "round-wind", "double-wind"].includes(input.pairChoice) && !input.pairChoice.startsWith("dragon-")) issues.push("Honroutou needs a terminal or honour pair.");
    if (input.groups.some((group) => group.tileKind === "simple")) issues.push("Honroutou cannot include simple triplets or kans.");
    if (!isSevenPairs && input.groups.length !== 4 && (needsGroupFu || input.groupsConfirmed)) issues.push("Honroutou needs four terminal or honour triplets or kans. Add all four groups to check its fu.");
    if (input.groups.length === 4 && !isSevenPairs && input.pairChoice !== null) {
      const hasTerminal = input.pairChoice === "terminal-number" || input.groups.some((group) => group.tileKind === "terminal");
      const hasHonor = input.pairChoice !== "terminal-number" && Boolean(input.pairChoice) || input.groups.some((group) => group.tileKind === "honor");
      if (!hasTerminal || !hasHonor) issues.push("Honroutou needs at least one terminal and one honour. Check the pair and all four groups.");
    }
  }
  if (selected.has("chinroutou")) {
    if (!input.pairChoice) issues.push("Chinroutou needs a terminal-number pair.");
    if (input.pairChoice && input.pairChoice !== "terminal-number") issues.push("Chinroutou needs a terminal-number pair.");
    if (input.groups.some((group) => group.tileKind !== "terminal")) issues.push("Chinroutou cannot include simple tiles or honours in its triplets and kans.");
  }
  if (selected.has("tsuuiisou")) {
    if (!input.pairChoice) issues.push("Tsuuiisou needs an honour pair.");
    if (input.pairChoice && !["non-value-wind", "dragon", "seat-wind", "round-wind", "double-wind"].includes(input.pairChoice) && !input.pairChoice.startsWith("dragon-")) issues.push("Tsuuiisou needs an honour pair.");
    if (input.groups.some((group) => group.tileKind !== "honor")) issues.push("Tsuuiisou cannot include suited tiles in its triplets and kans.");
  }
  const noRunPattern = ["toitoi", "honroutou", "chinroutou", "tsuuiisou"].some((id) => selected.has(id)) || isSevenPairs;
  if (noRunPattern && input.waitType !== null && ["ryanmen", "penchan", "kanchan"].includes(input.waitType)) {
    issues.push("This hand pattern has no runs, so it cannot use a run wait. Choose a pair or triplet wait.");
  }
  if (selected.has("ittsu") && input.groups.filter((group) => group.type === "triplet" || group.type === "kan").length > 1) {
    issues.push("Ittsuu needs three runs in one suit, so it can include at most one triplet or kan.");
  }
  if (selected.has("sanshoku-doujun") && input.groups.length > 1) {
    issues.push("Sanshoku doujun needs the same run in all three suits, so it can include at most one triplet or kan.");
  }
  if (selected.has("iipeiko") && input.groups.length > 2) {
    issues.push("Iipeikou needs two identical runs, so it can include at most two triplets or kans.");
  }
  if (selected.has("ryanpeiko") && input.groups.length) {
    issues.push("Ryanpeikou needs four runs. Remove the entered triplets or kans.");
  }
  if (input.pairChoice === "double-wind" && input.seatWind !== input.roundWind) {
    issues.push("A double-wind pair must match both your seat wind and the round wind.");
  }
  if (input.seatWind === input.roundWind && ["seat-wind", "round-wind"].includes(input.pairChoice ?? "")) {
    issues.push("A double-wind pair is worth 4 fu here. Choose Seat + round wind.");
  }
  const pairYakuhai = new Set<string>();
  if (input.pairChoice === "seat-wind" || input.pairChoice === "double-wind") pairYakuhai.add("yakuhai-seat");
  if (input.pairChoice === "round-wind" || input.pairChoice === "double-wind") pairYakuhai.add("yakuhai-round");
  const specificPairYaku = shousangenPairToYaku[input.pairChoice ?? ""];
  if (specificPairYaku) pairYakuhai.add(specificPairYaku);
  if ([...pairYakuhai].some((id) => selected.has(id)) || input.groups.some((group) => group.yakuId && pairYakuhai.has(group.yakuId))) {
    issues.push("The pair and a dragon or wind set cannot use the same tile. Assign that yaku to a different group.");
  }
  if (selected.has("shousangen")) {
    const pairDragon = shousangenPairToYaku[input.pairChoice ?? ""];
    const dragonYaku = [...selected].filter((id) => dragonYakuIds.includes(id));
    const markedDragonSets = input.groups.map((group) => group.yakuId).filter((id): id is string => Boolean(id) && dragonYakuIds.includes(id as string));
    const validMarkedDragonGroups = input.groups.filter((group) => group.tileKind === "honor" && (group.type === "triplet" || group.type === "kan") && dragonYakuIds.includes(group.yakuId ?? ""));
    if (!pairDragon) issues.push("Shousangen needs a specific dragon pair: White, Green, or Red.");
    if (dragonYaku.length > 2) issues.push("Shousangen has two dragon sets and a pair of the third dragon. Remove the third dragon-set yaku.");
    if (markedDragonSets.length > 2 || new Set(markedDragonSets).size !== markedDragonSets.length || (pairDragon && markedDragonSets.includes(pairDragon))) {
      issues.push("Shousangen needs two different dragon sets, each different from the pair. Mark the matching dragon groups.");
    }
    if (validMarkedDragonGroups.length !== 2) issues.push("Shousangen needs two dragon triplets or kans. Add both groups and mark the matching dragons.");
  }
  if (input.handShape === "kokushi" && !selected.has("kokushi")) issues.push("Select Kokushi musou for a Thirteen Orphans hand.");
  if (input.handShape !== "kokushi" && selected.has("kokushi")) issues.push("Choose Thirteen Orphans as the hand shape for Kokushi musou.");
  if (input.handShape === "chiitoitsu" && !selected.has("chiitoitsu")) issues.push("Seven pairs includes Chiitoitsu; select it as your yaku.");
  if (input.handShape !== "chiitoitsu" && selected.has("chiitoitsu")) issues.push("Choose Seven pairs as the hand shape for Chiitoitsu.");
  if (isSevenPairs && input.groups.length) issues.push("Seven pairs has no triplets, kans or group fu. Remove the listed groups.");
  if (input.playerCount === 3 && !input.isClosed && !input.groups.some((group) => !group.concealed)) {
    issues.push("Three-player mahjong has no chi, so an open hand must include a called triplet or kan.");
  }
  if (selected.has("sanshoku-doukou") && input.groups.length + possibleUnlistedGroups < 3) issues.push("Triple Triplets needs at least three triplet or kan groups.");
  if (selected.has("sanshoku-doukou") && input.groupsConfirmed && input.groups.filter((group) => group.type === "triplet" || group.type === "kan").length < 3) {
    issues.push("Triple Triplets needs three triplet or kan groups; the confirmed remaining groups are runs.");
  }
  if (needsGroupFu && (selected.has("toitoi") || (selected.has("honroutou") && !isSevenPairs)) && input.groups.length !== 4) issues.push("Toitoi requires four triplets or kans. Add each group to check its fu.");
  if (needsGroupFu && selected.has("sankantsu") && input.groups.filter((group) => group.type === "kan").length < 3) issues.push("Sankantsu requires at least three kans. Add each kan.");
  if (needsGroupFu && selected.has("sanankou") && input.groups.filter((group) => group.type === "triplet" && group.concealed && !(input.winType === "ron" && group.completedByRon)).length + input.groups.filter((group) => group.type === "kan" && group.concealed).length < 3) {
    issues.push("Sanankou needs at least three concealed triplets or kans. Mark calls and any triplet completed by ron correctly.");
  }
  {
    const yakuhai = [...selected].filter((id) => id.startsWith("yakuhai-"));
    const hasDoubleWindSet = yakuhai.includes("yakuhai-seat") && yakuhai.includes("yakuhai-round") && input.seatWind === input.roundWind;
    const requiredYakuhai = new Set(yakuhai);
    if (hasDoubleWindSet) {
      requiredYakuhai.delete("yakuhai-seat");
      requiredYakuhai.delete("yakuhai-round");
      requiredYakuhai.add("yakuhai-double-wind");
    }
    const assignedYakuhai = input.groups.map((group) => group.yakuId).filter((id): id is string => Boolean(id));
    if (new Set(assignedYakuhai).size !== assignedYakuhai.length) issues.push("Assign each dragon or wind yaku to a different group.");
    for (const group of input.groups) {
      const inferredShousangenDragon = selected.has("shousangen") && dragonYakuIds.includes(group.yakuId ?? "");
      const yakumanDragon = (selected.has("daisangen") || selected.has("shousangen")) && dragonYakuIds.includes(group.yakuId ?? "");
      const yakumanWind = (selected.has("daisuushi") || selected.has("shousuushi")) && ["wind-east", "wind-south", "wind-west", "wind-north"].includes(group.yakuId ?? "");
      if (group.yakuId && ((!requiredYakuhai.has(group.yakuId) && !inferredShousangenDragon && !yakumanDragon && !yakumanWind) || group.tileKind !== "honor")) {
        issues.push("Match the selected dragon or wind yaku to its honour triplet or kan, or mark this as another set.");
        break;
      }
    }
    if (needsGroupFu && [...requiredYakuhai].some((id) => !assignedYakuhai.includes(id))) {
      issues.push("Assign each selected dragon or wind set to its matching triplet or kan to count fu.");
    }
    const remainingGroups = possibleUnlistedGroups;
    const unresolvedYakuhai = [...requiredYakuhai].filter((id) => !assignedYakuhai.includes(id));
    if (unresolvedYakuhai.length > remainingGroups) {
      issues.push("The listed groups leave too few sets for the selected dragon or wind yaku.");
    }
  }
  if (!needsGroupFu) {
    const remainingGroups = possibleUnlistedGroups;
    const kans = input.groups.filter((group) => group.type === "kan").length;
    const concealed = input.groups.filter((group) => group.concealed && !(input.winType === "ron" && group.completedByRon)).length;
    const yakuhai = [...selected].filter((id) => id.startsWith("yakuhai-"));
    const doubleWind = yakuhai.includes("yakuhai-seat") && yakuhai.includes("yakuhai-round") && input.seatWind === input.roundWind;
    const requiredYakuhaiCount = yakuhai.length - (doubleWind ? 1 : 0);
    const unresolvedYakuhai = requiredYakuhaiCount - input.groups.filter((group) => group.yakuId).length;
    if (unresolvedYakuhai > remainingGroups) issues.push("The listed groups leave too few sets for the selected dragon or wind yaku.");
    if (selected.has("rinshan") && kans + remainingGroups < 1) issues.push("Rinshan needs a kan. Correct the listed groups or deselect Rinshan.");
    if (selected.has("sankantsu") && kans + remainingGroups < 3) issues.push("Sankantsu needs three kans. Correct the listed groups or deselect Sankantsu.");
    if (selected.has("suuankantsu") && kans + remainingGroups < 4) issues.push("Suukantsu needs four kans. Correct the listed groups or deselect Suukantsu.");
    if (selected.has("sanankou") && concealed + remainingGroups < 3) issues.push("Sanankou needs three concealed groups. Correct the listed groups or deselect Sanankou.");
    if (selected.has("toitoi") && input.groups.length + remainingGroups < 4) issues.push("Toitoi needs four triplet or kan groups. Correct the groups or deselect Toitoi.");
    if (selected.has("toitoi") && input.groupsConfirmed && input.groups.length !== 4) issues.push("Toitoi needs four triplet or kan groups; the confirmed remaining groups are runs.");
  }
  if (selected.has("suuankou") && input.groups.some((group) => !group.concealed || (input.winType === "ron" && group.completedByRon))) {
    issues.push("Suuankou needs concealed groups. Remove called groups or any triplet completed by ron.");
  }
  if (selected.has("suuankou") && input.winType === "ron" && input.waitType !== "tanki") {
    issues.push("Suuankou on ron requires a pair wait.");
  }
  if (selected.has("suuankou") && input.waitType !== null && !["tanki", "shanpon"].includes(input.waitType)) {
    issues.push("Suuankou needs a pair wait or a self-drawn triplet wait.");
  }
  if (selected.has("kokushi") && input.doubleYakumanWaits.kokushi && input.waitType !== "kokushi-thirteen") issues.push("Double Kokushi requires a thirteen-sided wait.");
  if (selected.has("chuuren") && input.doubleYakumanWaits.chuuren && input.waitType !== "chuuren-nine") issues.push("Double Nine Gates requires the pure nine-sided wait.");
  if (input.winType === "ron" && input.waitType === "shanpon" && input.groups.some((group) => group.completedByRon && (!group.concealed || group.type !== "triplet"))) {
    issues.push("Only a concealed triplet completed by ron can use the winning-triplet option.");
  }
  if (input.groups.some((group) => group.completedByRon) && (input.winType !== "ron" || input.waitType !== "shanpon")) {
    issues.push("Mark a triplet completed by ron only for a ron win on a shanpon wait.");
  }
  const ronCompletedGroups = input.groups.filter((group) => group.completedByRon);
  if (ronCompletedGroups.length > 1) issues.push("Only one winning triplet can be completed by ron.");
  if (needsGroupFu && !isSevenPairs && input.winType === "ron" && input.waitType === "shanpon" && ronCompletedGroups.length !== 1) {
    issues.push("Mark the winning triplet completed by ron to count its fu correctly.");
  }
  if (input.groups.length === 4 && input.waitType !== null && ["ryanmen", "penchan", "kanchan"].includes(input.waitType)) {
    issues.push("Four triplets or kans leave no run for this wait. Correct the groups or choose another wait.");
  }

  return [...new Set(issues)];
}

// Yaku selections declare the hand pattern. Detailed groups are required only
// when their fu can change the payment; explicit contradictions still validate.
function manualHandValue(input: ManualScoreInput) {
  const selected = new Set(input.selectedYaku);
  const units = yakumanUnits(input);
  const hasYakuman = units > 0;
  const isSevenPairs = input.handShape === "chiitoitsu";
  const regularYaku = input.selectedYaku.flatMap((id) => {
    const option = selectedOption(id);
    if (!option || option.yakuman || (id === "chiitoitsu" && !isSevenPairs)) return [];
    if (id === "renhou") return [{ id, name: option.name, han: option.closedHan }];
    if (!input.isClosed && option.requiresClosed) return [];
    return [{ id, name: option.name, han: input.isClosed ? option.closedHan : (option.openHan ?? option.closedHan) }];
  });

  if (isSevenPairs && !regularYaku.some((yaku) => yaku.id === "chiitoitsu")) {
    regularYaku.push({ id: "chiitoitsu", name: "Chiitoitsu", han: 2 });
  }
  if (selected.has("honroutou") && !isSevenPairs && !selected.has("toitoi")) {
    regularYaku.push({ id: "toitoi", name: selectedOption("toitoi")?.name ?? "Toitoi", han: 2 });
  }
  if (selected.has("shousangen")) {
    const selectedDragonSets = input.selectedYaku.filter((id) => ["yakuhai-haku", "yakuhai-hatsu", "yakuhai-chun"].includes(id)).length;
    const impliedDragonHan = Math.max(0, 2 - selectedDragonSets);
    if (impliedDragonHan > 0) regularYaku.push({ id: "shousangen-dragon-sets", name: "Dragon sets (Shousangen)", han: impliedDragonHan });
  }
  if (input.isClosed && input.winType === "tsumo" && !hasYakuman) {
    regularYaku.push({ id: "menzen-tsumo", name: "Menzen tsumo", han: 1 });
  }

  // A blessing-of-man win is a fixed five han and does not stack with other yaku.
  const printedYaku = hasYakuman
    ? input.selectedYaku.flatMap((id) => {
        const option = selectedOption(id);
        if (!option?.yakuman) return [];
        const double =
          (id === "kokushi" && input.doubleYakumanWaits.kokushi) ||
          (id === "suuankou" && input.doubleYakumanWaits.suuankou) ||
          (id === "chuuren" && input.doubleYakumanWaits.chuuren);
        return [{ id, name: option.name, han: double ? 26 : 13 }];
      })
    : selected.has("renhou")
      ? [{ id: "renhou", name: "Renhou", han: 5 }]
      : regularYaku;

  const bonus = hasYakuman || selected.has("renhou") ? 0 : Math.max(0, input.bonusHan.dora) + Math.max(0, input.bonusHan.nuki);
  const han = printedYaku.reduce((sum, yaku) => sum + yaku.han, 0) + bonus;
  return { printedYaku, bonus, han, units, hasYakuman };
}

export function calculateManualScore(input: ManualScoreInput): ManualScoreResult {
  const selected = new Set(input.selectedYaku);
  const isSevenPairs = input.handShape === "chiitoitsu";
  const { printedYaku, bonus, han, units, hasYakuman } = manualHandValue(input);
  const requiresFu = !hasYakuman && han < 5;
  const issues = manualScoringIssues(input);

  let fuBreakdown: ManualFuBreakdown | null = null;
  if (requiresFu && isSevenPairs) {
    fuBreakdown = { base: 25, closedRon: 0, tsumo: 0, pair: 0, groups: 0, wait: 0, raw: 25, total: 25 };
  } else if (requiresFu) {
    if (selected.has("pinfu")) {
      fuBreakdown = { base: input.winType === "ron" ? 30 : 20, closedRon: 0, tsumo: 0, pair: 0, groups: 0, wait: 0, raw: input.winType === "ron" ? 30 : 20, total: input.winType === "ron" ? 30 : 20 };
    } else {
      if (input.pairFu === null) issues.push("Choose your pair to count fu.");
      if (input.waitType === null) issues.push("Choose the wait completed by your winning tile.");
      if (input.waitType !== null && input.pairFu !== null) {
        const groupFu = input.groups.reduce((sum, group) => sum + tripletFu(group), 0);
        const waitFu = ["penchan", "kanchan", "tanki"].includes(input.waitType) ? 2 : 0;
        const closedRon = input.winType === "ron" && input.isClosed ? 10 : 0;
        const tsumo = input.winType === "tsumo" ? 2 : 0;
        const base = 20;
        const raw = base + closedRon + tsumo + input.pairFu + groupFu + waitFu;
        const total = Math.max(30, Math.ceil(raw / 10) * 10);
        fuBreakdown = { base, closedRon, tsumo, pair: input.pairFu, groups: groupFu, wait: waitFu, raw, total };
      }
    }
  }

  const fu = requiresFu ? (fuBreakdown?.total ?? 0) : (isSevenPairs ? 25 : 30);
  const name = hasYakuman ? "yakuman" : handName(han, fu, 0, input.kiriageMangan ?? false);
  const scoreReady = issues.length === 0 && han > 0 && (!requiresFu || fuBreakdown !== null);
  let payments = scoreReady
    ? calculatePoints(han, fu, input.isDealer, input.winType, units, input.kiriageMangan ?? false, Math.max(0, input.honba), input.playerCount)
    : null;
  let pao: ManualScoreResult["pao"];
  const paoYaku = selected.has("daisangen") || selected.has("daisuushi");
  if (payments && input.paoApplies && paoYaku) {
    if (input.winType === "tsumo") {
      const otherUnits = Math.max(0, units - 1);
      const otherPayments = otherUnits
        ? calculatePoints(13, 30, input.isDealer, "tsumo", otherUnits, input.kiriageMangan ?? false, 0, input.playerCount).tsumo
        : { dealerPays: 0, nonDealerPays: 0 };
      const responsibleIsDealer = input.paoResponsibleIsDealer === true;
      const responsibleShare = input.isDealer
        ? otherPayments.nonDealerPays
        : responsibleIsDealer ? otherPayments.dealerPays : otherPayments.nonDealerPays;
      const honbaEach = 100 * Math.max(0, input.honba);
      const otherTsumo = {
        dealerPays: otherPayments.dealerPays + honbaEach,
        nonDealerPays: otherPayments.nonDealerPays + honbaEach,
      };
      pao = {
        responsiblePays: calculatePoints(13, 30, input.isDealer, "tsumo", 1, false, 0, input.playerCount).total + responsibleShare + honbaEach,
        ...(otherUnits ? { otherTsumo, responsibleIsDealer } : {}),
      };
    } else if (input.paoResponsibleAlsoDiscarder) {
      pao = { responsiblePays: payments.total };
    } else {
      const liableYakuman = calculatePoints(13, 30, input.isDealer, "ron", 1, false, 0, input.playerCount).total;
      const otherUnits = Math.max(0, units - 1);
      const otherYakuman = otherUnits
        ? calculatePoints(13, 30, input.isDealer, "ron", otherUnits, false, 0, input.playerCount).total
        : 0;
      const eachYakumanShare = Math.ceil(liableYakuman / 2 / 100) * 100;
      const honba = Math.max(0, input.honba) * 300;
      const responsiblePays = eachYakumanShare;
      const discarderPays = eachYakumanShare + otherYakuman + honba;
      const total = responsiblePays + discarderPays;
      payments = { total, ron: total, responsiblePays, discarderPays };
      pao = { responsiblePays, discarderPays };
    }
  }
  const pointTotal = payments?.total ?? 0;
  return {
    issues: [...new Set(issues)],
    isYakuman: hasYakuman,
    han,
    yakumanUnits: units,
    fu: requiresFu ? fuBreakdown?.total ?? null : isSevenPairs ? 25 : null,
    fuBreakdown: requiresFu ? fuBreakdown : null,
    handName: name,
    points: pointTotal,
    ron: payments?.ron ?? 0,
    tsumo: payments?.tsumo,
    yaku: printedYaku,
    bonusHan: bonus,
    pao,
  };
}
