import { calculatePoints, handName, type HandName } from "./points";

export type ManualWait = "ryanmen" | "penchan" | "kanchan" | "tanki" | "shanpon" | "kokushi-thirteen" | "chuuren-nine";
export type ManualGroupType = "triplet" | "kan";
export type ManualTileKind = "simple" | "terminal-honor";
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
  { id: "ippatsu", name: "Ippatsu", detail: "Win before your next discard after riichi", category: "situational", closedHan: 1, requiresClosed: true },
  { id: "pinfu", name: "Pinfu", detail: "Four runs, a non-value pair and a two-sided wait", category: "common", closedHan: 1, requiresClosed: true, incompatible: ["chiitoitsu", "toitoi", "sanankou", "suuankou"] },
  { id: "iipeiko", name: "Iipeikou", detail: "Two identical runs; closed hand", category: "patterns", closedHan: 1, requiresClosed: true, incompatible: ["ryanpeiko"] },
  { id: "tanyao", name: "Tanyao", detail: "All tiles are 2–8", category: "common", closedHan: 1, openHan: 1 },
  { id: "yakuhai-haku", name: "White dragon set", detail: "White dragon triplet or kan · 1 han", category: "yakuhai", closedHan: 1, openHan: 1 },
  { id: "yakuhai-hatsu", name: "Green dragon set", detail: "Green dragon triplet or kan · 1 han", category: "yakuhai", closedHan: 1, openHan: 1 },
  { id: "yakuhai-chun", name: "Red dragon set", detail: "Red dragon triplet or kan · 1 han", category: "yakuhai", closedHan: 1, openHan: 1 },
  { id: "yakuhai-seat", name: "Seat-wind set", detail: "Your seat-wind triplet or kan", category: "yakuhai", closedHan: 1, openHan: 1 },
  { id: "yakuhai-round", name: "Round-wind set", detail: "The round-wind triplet or kan", category: "yakuhai", closedHan: 1, openHan: 1 },
  { id: "chankan", name: "Chankan", detail: "Robbed an added kan", category: "situational", closedHan: 1, openHan: 1, winMethod: "ron" },
  { id: "rinshan", name: "Rinshan", detail: "Won on the replacement tile after a kan", category: "situational", closedHan: 1, openHan: 1, winMethod: "tsumo", incompatible: ["haitei"] },
  { id: "haitei", name: "Haitei", detail: "Won by tsumo on the final live-wall tile", category: "situational", closedHan: 1, openHan: 1, winMethod: "tsumo", incompatible: ["rinshan"] },
  { id: "houtei", name: "Houtei", detail: "Won by ron on the final discard", category: "situational", closedHan: 1, openHan: 1, winMethod: "ron" },

  { id: "chiitoitsu", name: "Chiitoitsu", detail: "Seven different pairs", category: "patterns", closedHan: 2, requiresClosed: true, incompatible: ["pinfu", "toitoi", "sanankou", "suuankou"] },
  { id: "ittsu", name: "Ittsuu", detail: "123, 456 and 789 in one suit", category: "patterns", closedHan: 2, openHan: 1 },
  { id: "sanshoku-doujun", name: "Sanshoku doujun", detail: "The same run in all three suits", category: "patterns", closedHan: 2, openHan: 1 },
  { id: "sanshoku-doukou", name: "Sanshoku doukou", detail: "The same triplet in all three suits", category: "patterns", closedHan: 2, openHan: 2 },
  { id: "toitoi", name: "Toitoi", detail: "Four triplets or kans; no runs", category: "patterns", closedHan: 2, openHan: 2, incompatible: ["pinfu", "chiitoitsu"] },
  { id: "sanankou", name: "Sanankou", detail: "Three concealed triplets or kans", category: "patterns", closedHan: 2, openHan: 2, incompatible: ["pinfu", "chiitoitsu", "suuankou"] },
  { id: "sankantsu", name: "Sankantsu", detail: "Three kans", category: "patterns", closedHan: 2, openHan: 2 },
  { id: "chanta", name: "Chanta", detail: "Every group contains a terminal or honour", category: "suits", closedHan: 2, openHan: 1, incompatible: ["junchan"] },
  { id: "honroutou", name: "Honroutou", detail: "Only terminals and honours", category: "suits", closedHan: 2, openHan: 2 },
  { id: "shousangen", name: "Shousangen", detail: "Two dragon sets and a pair of the third dragon", category: "patterns", closedHan: 2, openHan: 2 },

  { id: "ryanpeiko", name: "Ryanpeikou", detail: "Two pairs of identical runs; closed hand", category: "patterns", closedHan: 3, requiresClosed: true, incompatible: ["iipeiko"] },
  { id: "honitsu", name: "Honitsu", detail: "One suit and honours", category: "suits", closedHan: 3, openHan: 2, incompatible: ["chinitsu"] },
  { id: "junchan", name: "Junchan", detail: "Every group contains 1 or 9; no honours", category: "suits", closedHan: 3, openHan: 2, incompatible: ["chanta"] },
  { id: "renhou", name: "Renhou", detail: "Non-dealer win before your first draw", category: "situational", closedHan: 5, requiresClosed: true, winMethod: "ron", requiresDealer: false, incompatible: ["pinfu", "iipeiko", "ryanpeiko", "riichi", "double-riichi", "ippatsu", "tanyao", "ittsu", "sanshoku-doujun", "sanshoku-doukou", "toitoi", "sanankou", "sankantsu", "chanta", "junchan", "honroutou", "shousangen", "honitsu", "chinitsu"] },
  { id: "chinitsu", name: "Chinitsu", detail: "One suit, no honours", category: "suits", closedHan: 6, openHan: 5, incompatible: ["honitsu"] },

  { id: "tenhou", name: "Tenhou", detail: "Dealer wins on the opening draw", category: "yakuman", closedHan: 13, requiresClosed: true, winMethod: "tsumo", requiresDealer: true, yakuman: true },
  { id: "chiihou", name: "Chiihou", detail: "Non-dealer wins on the first draw before any call", category: "yakuman", closedHan: 13, requiresClosed: true, winMethod: "tsumo", requiresDealer: false, yakuman: true },
  { id: "kokushi", name: "Kokushi musou", detail: "Thirteen orphans; thirteen-sided wait is double", category: "yakuman", closedHan: 13, requiresClosed: true, yakuman: true, incompatible: ["suuankou", "daisangen", "shousangen", "daisuushi", "shousuushi", "suuankantsu", "sankantsu", "toitoi", "sanankou", "chiitoitsu"] },
  { id: "chuuren", name: "Chuuren poutou", detail: "Nine gates; pure nine-sided wait is double", category: "yakuman", closedHan: 13, requiresClosed: true, yakuman: true },
  { id: "ryuuiisou", name: "Ryuuiisou", detail: "All green tiles", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true },
  { id: "suuankou", name: "Suuankou", detail: "Four concealed triplets; tanki wait is double", category: "yakuman", closedHan: 13, requiresClosed: true, yakuman: true, incompatible: ["pinfu", "sanankou", "chiitoitsu", "kokushi"] },
  { id: "suuankantsu", name: "Suukantsu", detail: "Four kans", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true, incompatible: ["kokushi"] },
  { id: "chinroutou", name: "Chinroutou", detail: "All terminals", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true },
  { id: "tsuuiisou", name: "Tsuuiisou", detail: "All honours", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true },
  { id: "daisangen", name: "Daisangen", detail: "A set of all three dragons", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true, incompatible: ["kokushi", "shousangen"] },
  { id: "shousuushi", name: "Shousuushi", detail: "Three wind sets and a pair of the fourth wind", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true, incompatible: ["kokushi", "daisuushi"] },
  { id: "daisuushi", name: "Daisuushi", detail: "A set of all four winds", category: "yakuman", closedHan: 13, openHan: 13, yakuman: true, incompatible: ["kokushi", "shousuushi"] },
];

const additionalYakuConflicts: Record<string, string[]> = {
  "yakuhai-haku": ["tanyao", "pinfu", "chiitoitsu", "junchan", "chinitsu", "kokushi", "chuuren", "chinroutou"],
  "yakuhai-hatsu": ["tanyao", "pinfu", "chiitoitsu", "junchan", "chinitsu", "kokushi", "chuuren", "chinroutou"],
  "yakuhai-chun": ["tanyao", "pinfu", "chiitoitsu", "junchan", "chinitsu", "kokushi", "chuuren", "chinroutou"],
  "yakuhai-seat": ["tanyao", "pinfu", "chiitoitsu", "junchan", "chinitsu", "kokushi", "chuuren", "chinroutou"],
  "yakuhai-round": ["tanyao", "pinfu", "chiitoitsu", "junchan", "chinitsu", "kokushi", "chuuren", "chinroutou"],
  chiitoitsu: ["iipeiko", "ryanpeiko", "ittsu", "sanshoku-doujun", "sanshoku-doukou", "sankantsu", "chanta", "junchan", "shousangen", "suuankantsu", "daisangen", "shousuushi", "daisuushi", "chinroutou", "chuuren", "ryuuiisou"],
  tanyao: ["chanta", "junchan", "honroutou", "shousangen", "kokushi", "chuuren", "chinroutou", "tsuuiisou", "daisangen", "shousuushi", "daisuushi"],
  honroutou: ["pinfu", "iipeiko", "ryanpeiko", "ittsu", "sanshoku-doujun", "chanta", "junchan", "ryuuiisou"],
  toitoi: ["pinfu", "chiitoitsu", "iipeiko", "ryanpeiko", "ittsu", "sanshoku-doujun", "chanta", "junchan"],
  "sanshoku-doukou": ["pinfu", "chiitoitsu"],
  tsuuiisou: ["pinfu", "iipeiko", "ryanpeiko", "ittsu", "sanshoku-doujun", "sanshoku-doukou", "chanta", "junchan", "chinitsu", "chuuren", "chinroutou", "ryuuiisou"],
  ryuuiisou: ["chanta", "junchan", "chinroutou"],
  chuuren: ["kokushi", "suuankantsu", "daisangen", "shousuushi", "daisuushi", "tsuuiisou", "chinroutou", "ryuuiisou"],
  chinroutou: ["tsuuiisou", "ryuuiisou", "daisangen", "shousuushi", "daisuushi"],
};
for (const [id, conflicts] of Object.entries(additionalYakuConflicts)) {
  const option = MANUAL_YAKU.find((yaku) => yaku.id === id);
  if (option) option.incompatible = [...new Set([...(option.incompatible ?? []), ...conflicts])];
  for (const conflict of conflicts) {
    const other = MANUAL_YAKU.find((yaku) => yaku.id === conflict);
    if (other) other.incompatible = [...new Set([...(other.incompatible ?? []), id])];
  }
}

type YakuAvailabilityInput = Pick<ManualScoreInput, "selectedYaku" | "isClosed" | "isDealer" | "winType">;

/** Keep picker guidance and scorer validation on the same yaku rules. */
export function manualYakuUnavailableReason(id: string, input: YakuAvailabilityInput): string | null {
  const option = selectedOption(id);
  if (!option) return "Remove this unrecognised yaku.";
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
  groups: ManualGroup[];
  bonusHan: { dora: number; red: number; ura: number; nuki: number };
  doubleYakumanWaits: { kokushi: boolean; suuankou: boolean; chuuren: boolean };
  honba: number;
  riichiSticks: number;
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
  riichiSticks: number;
  totalReceived: number;
  ron: number;
  tsumo?: { dealerPays: number; nonDealerPays: number };
  yaku: { id: string; name: string; han: number }[];
  bonusHan: number;
}

function tripletFu(group: ManualGroup): number {
  const terminal = group.tileKind === "terminal-honor";
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
  return `${group.type === "kan" ? "Kan" : "Triplet"}, ${group.concealed ? "concealed" : "called"}, ${group.tileKind === "simple" ? "simple" : "terminal or honour"}`;
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

  if (selected.size !== input.selectedYaku.length) issues.push("Each yaku can only be selected once.");

  for (const [label, value] of Object.entries({
    dora: input.bonusHan.dora,
    "red dora": input.bonusHan.red,
    "ura dora": input.bonusHan.ura,
    "North bonus": input.bonusHan.nuki,
    honba: input.honba,
    "riichi sticks": input.riichiSticks,
  })) {
    if (!Number.isSafeInteger(value) || value < 0) issues.push(`${label} must be a non-negative whole number.`);
  }
  if (input.bonusHan.nuki > 4 || (input.playerCount === 4 && input.bonusHan.nuki > 0)) {
    issues.push("North bonus tiles require a three-player table, with no more than four tiles.");
  }

  if (selected.size === 0 && !(input.isClosed && input.winType === "tsumo")) issues.push("Select at least one yaku. Dora alone cannot complete a winning hand.");
  if (input.groups.length > 4) issues.push("A hand can have no more than four groups.");
  if (input.isClosed && input.groups.some((group) => !group.concealed)) issues.push("Called groups require an open hand. Change the hand to open or remove the called groups.");
  if (input.handShape === "kokushi" && input.groups.length) issues.push("Kokushi musou has no sets. Remove the listed groups.");
  if (input.riichiDeclared && !input.isClosed) issues.push("Riichi requires a closed hand.");
  if ((input.bonusHan.ura > 0) && (!input.isClosed || !input.riichiDeclared)) issues.push("Ura dora requires a closed hand with riichi.");
  if (selected.has("ippatsu") && !selected.has("riichi") && !selected.has("double-riichi")) issues.push("Ippatsu requires riichi or double riichi.");
  if (selected.has("ippatsu") && (!input.isClosed || input.groups.some((group) => !group.concealed))) issues.push("Ippatsu requires a closed hand with no calls.");
  if (selected.has("double-riichi") && !input.isClosed) issues.push("Double riichi requires a closed hand.");
  if ((selected.has("tenhou") || selected.has("chiihou")) && input.groups.length) issues.push("A first-draw yakuman cannot include a call or kan. Remove the entered groups.");
  if (needsGroupFu && selected.has("rinshan") && input.groups.every((group) => group.type !== "kan")) issues.push("Rinshan requires a kan in the winning hand.");
  if (selected.has("renhou") && input.winType !== "ron") issues.push("Renhou requires a ron win before your first draw.");

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
  if (input.pairChoice === "double-wind" && input.seatWind !== input.roundWind) {
    issues.push("A double-wind pair must match both your seat wind and the round wind.");
  }
  if (input.seatWind === input.roundWind && ["seat-wind", "round-wind"].includes(input.pairChoice ?? "")) {
    issues.push("A double-wind pair is worth 4 fu here. Choose Seat + round wind.");
  }
  if (selected.has("shousangen") && input.pairChoice !== "dragon") {
    issues.push("Shousangen needs a dragon pair.");
  }
  if (input.handShape === "kokushi" && !selected.has("kokushi")) issues.push("Select Kokushi musou for a Thirteen Orphans hand.");
  if (input.handShape !== "kokushi" && selected.has("kokushi")) issues.push("Choose Thirteen Orphans as the hand shape for Kokushi musou.");
  if (input.handShape === "chiitoitsu" && !selected.has("chiitoitsu")) issues.push("Seven pairs includes Chiitoitsu; select it as your yaku.");
  if (input.handShape !== "chiitoitsu" && selected.has("chiitoitsu")) issues.push("Choose Seven pairs as the hand shape for Chiitoitsu.");
  if (isSevenPairs && input.groups.length) issues.push("Seven pairs has no triplets, kans or group fu. Remove the listed groups.");
  if (needsGroupFu && selected.has("toitoi") && input.groups.length !== 4) issues.push("Toitoi requires four triplets or kans. Add each group to check its fu.");
  if (needsGroupFu && selected.has("sankantsu") && input.groups.filter((group) => group.type === "kan").length < 3) issues.push("Sankantsu requires at least three kans. Add each kan.");
  if (needsGroupFu && selected.has("sanankou") && input.groups.filter((group) => group.type === "triplet" && group.concealed && !(input.winType === "ron" && group.completedByRon)).length + input.groups.filter((group) => group.type === "kan" && group.concealed).length < 3) {
    issues.push("Sanankou needs at least three concealed triplets or kans. Mark calls and any triplet completed by ron correctly.");
  }
  if (needsGroupFu) {
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
      if (group.yakuId && (!requiredYakuhai.has(group.yakuId) || group.tileKind !== "terminal-honor")) {
        issues.push("Match the selected dragon or wind yaku to its honour triplet or kan, or mark this as another set.");
        break;
      }
    }
    if ([...requiredYakuhai].some((id) => !assignedYakuhai.includes(id))) {
      issues.push("Assign each selected dragon or wind set to its matching triplet or kan to count fu.");
    }
  }
  if (!needsGroupFu) {
    const remainingGroups = Math.max(0, 4 - input.groups.length);
    const kans = input.groups.filter((group) => group.type === "kan").length;
    const concealed = input.groups.filter((group) => group.concealed && !(input.winType === "ron" && group.completedByRon)).length;
    if (selected.has("rinshan") && kans + remainingGroups < 1) issues.push("Rinshan needs a kan. Correct the listed groups or deselect Rinshan.");
    if (selected.has("sankantsu") && kans + remainingGroups < 3) issues.push("Sankantsu needs three kans. Correct the listed groups or deselect Sankantsu.");
    if (selected.has("suuankantsu") && kans + remainingGroups < 4) issues.push("Suukantsu needs four kans. Correct the listed groups or deselect Suukantsu.");
    if (selected.has("sanankou") && concealed + remainingGroups < 3) issues.push("Sanankou needs three concealed groups. Correct the listed groups or deselect Sanankou.");
  }
  if (selected.has("suuankou") && input.groups.some((group) => !group.concealed || (input.winType === "ron" && group.completedByRon))) {
    issues.push("Suuankou needs concealed groups. Remove called groups or any triplet completed by ron.");
  }
  if (selected.has("suuankou") && input.winType === "ron" && (!input.doubleYakumanWaits.suuankou || input.waitType !== "tanki")) {
    issues.push("Suuankou on ron requires a pair wait. Select the double-yakuman pair-wait option.");
  }
  if (selected.has("suuankou") && input.waitType === "tanki" && !input.doubleYakumanWaits.suuankou) {
    issues.push("Double Suuankou applies to a pair wait. Select the double-yakuman pair-wait option.");
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

  const bonus = hasYakuman ? 0 : Math.max(0, input.bonusHan.dora) + Math.max(0, input.bonusHan.red) + Math.max(0, input.bonusHan.ura) + Math.max(0, input.bonusHan.nuki);
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
  const payments = scoreReady
    ? calculatePoints(han, fu, input.isDealer, input.winType, units, input.kiriageMangan ?? false, Math.max(0, input.honba), input.playerCount)
    : null;
  const pointTotal = payments?.total ?? 0;
  const sticks = payments ? Math.max(0, input.riichiSticks) * 1000 : 0;

  return {
    issues: [...new Set(issues)],
    isYakuman: hasYakuman,
    han,
    yakumanUnits: units,
    fu: requiresFu ? fuBreakdown?.total ?? null : isSevenPairs ? 25 : null,
    fuBreakdown: requiresFu ? fuBreakdown : null,
    handName: name,
    points: pointTotal,
    riichiSticks: sticks,
    totalReceived: pointTotal + sticks,
    ron: payments?.ron ?? 0,
    tsumo: payments?.tsumo,
    yaku: printedYaku,
    bonusHan: bonus,
  };
}
