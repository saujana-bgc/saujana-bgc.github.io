// Physical tile-set validation, shared by the calculator UI.
//
// These are physical-set rules the scoring engine can't infer: each face
// exists 4× in a set (a red five and an ordinary five are the same physical
// tile number and share one pool), fives of a suit carry at most one red copy,
// and the sanma set drops 2m–8m plus the red 5m. Yaku or hand-structure rules
// are deliberately not a concern here — the scorer reports those.

import type { Tile } from "./types";
import { isAkaDora } from "./tiles";

export interface TileSetRules {
  /** 3-player sets have no 2m–8m, no red 5m, and only two red fives (5p/5s). */
  playerCount: 3 | 4;
  /** North tiles declared as nuki dora in sanma; they consume real North tiles. */
  nukiDoraCount?: number;
}

/**
 * Returns a human-readable problem with the combined physical tile set
 * (closed hand, meld tiles, winning tile, dora indicators), or null when legal.
 */
export function validateTileSet(allTiles: Tile[], rules: TileSetRules): string | null {
  const sanma = rules.playerCount === 3;
  const counts = new Map<string, number>();
  const akaPerSuit = new Map<string, number>();
  let akaTotal = 0;
  for (const tile of allTiles) {
    const key = `${tile.suit}:${tile.value}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (isAkaDora(tile)) {
      akaTotal++;
      akaPerSuit.set(tile.suit, (akaPerSuit.get(tile.suit) ?? 0) + 1);
    }
    if (sanma && tile.suit === "man") {
      // The sanma set removes the red 5-man along with the manzu middle tiles:
      // only 5-pin and 5-sou have red copies at a three-player table.
      if (tile.isAka) {
        return `${tileLabel(tile)} isn't in play on a three-player table (no red five-man in sanma).`;
      }
      if (typeof tile.value === "number" && tile.value >= 2 && tile.value <= 8) {
        return `${tileLabel(tile)} isn't in play on a three-player table (2–8 man removed).`;
      }
    }
  }
  for (const count of akaPerSuit.values()) {
    if (count > 1) return "Only one red five per suit exists.";
  }
  for (const count of counts.values()) {
    if (count > 4) return "A tile appears more than 4 times — check the hand.";
  }
  if (sanma && (counts.get("honor:north") ?? 0) + (rules.nukiDoraCount ?? 0) > 4) {
    return "Nuki dora and North tiles in the hand or indicators cannot exceed the four North tiles in the set.";
  }
  const akaMax = sanma ? 2 : 3;
  if (akaTotal > akaMax) return `Only ${akaMax} red fives exist on this table.`;
  return null;
}

function tileLabel(tile: Tile): string {
  if (tile.suit === "honor") return "North";
  return `${tile.isAka ? 0 : tile.value}${tile.suit[0]}`;
}
