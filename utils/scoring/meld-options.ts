// Pure meld-declaration helpers shared by the MeldBuilder UI.
//
// The meld builder's mental model: the player taps the tile in their hand that
// they claimed from another player's discard, and the calculator offers every
// complete meld that tile can anchor. Every option references the ACTUAL tile
// objects from the hand — no reconstruction from suit/value — so a held red
// five (isAka) keeps its identity when it moves into a meld, and the claimed
// discard can be an aka five simply because the player entered and tapped the
// red copy (0p) rather than an ordinary one.
//
// Meld tile order is: claimed discard first (index `calledTileIndex`), then the
// tiles taken from the hand. A concealed kan has no called tile.

import type { Meld, Tile } from "./types";
import { isSuited, tilesEqual } from "./tiles";

/** A complete meld the player can declare using the selected hand tile as the claimed discard. */
export interface MeldOption {
  type: Meld["type"];
  /** The actual tile objects from the hand, in meld order. aka identity is preserved by reference. */
  tiles: Tile[];
  /** Positions of `tiles` within the source hand. */
  indices: number[];
  /** Position within `tiles` of the tile claimed from a discard; absent for a concealed kan. */
  calledTileIndex?: number;
}

export interface FindMeldOptionsConfig {
  /** Chi exists only in four-player games. */
  allowChi: boolean;
}

function tilesAt(handTiles: Tile[], indices: number[]): Tile[] {
  return indices.map((index) => {
    const tile = handTiles[index];
    if (!tile) throw new Error(`meld option references missing hand tile at ${index}`);
    return tile;
  });
}

/** Chi options anchored on the selected tile: the discard the player claimed, plus the two completes. */
function findChiOptions(handTiles: Tile[], selectedIdx: number): MeldOption[] {
  const selected = handTiles[selectedIdx];
  if (!selected || !isSuited(selected)) return [];

  const value = selected.value;
  const sequences = [
    [value - 2, value - 1, value],
    [value - 1, value, value + 1],
    [value, value + 1, value + 2],
  ].filter((sequence) => sequence.every((number) => number >= 1 && number <= 9));

  const results: MeldOption[] = [];
  for (const sequence of sequences) {
    const indices = [selectedIdx];
    let valid = true;
    for (const number of sequence) {
      if (number === value) continue;
      const index = handTiles.findIndex(
        (tile, tileIndex) =>
          tileIndex !== selectedIdx &&
          !indices.includes(tileIndex) &&
          isSuited(tile) &&
          tile.suit === selected.suit &&
          tile.value === number,
      );
      if (index === -1) {
        valid = false;
        break;
      }
      indices.push(index);
    }
    if (valid) {
      // The first tile the player selected is the discard they called.
      results.push({ type: "chi", indices, tiles: tilesAt(handTiles, indices), calledTileIndex: 0 });
    }
  }
  return results;
}

/** Indices of the selected tile plus up to `count - 1` further identical copies (aka-agnostic:
 * a pon of 5-pin may legitimately mix the red copy with ordinary ones). */
function identicalIndices(handTiles: Tile[], selectedIdx: number, count: number): number[] {
  const selected = handTiles[selectedIdx];
  if (!selected) return [];
  const matches = [selectedIdx];
  for (let index = 0; index < handTiles.length && matches.length < count; index++) {
    if (index !== selectedIdx && tilesEqual(handTiles[index], selected)) matches.push(index);
  }
  return matches.length === count ? matches : [];
}

/**
 * Every complete meld that can be declared using `handTiles[selectedIdx]` as the
 * claimed discard. Options carry the hand's actual tile objects, so held aka
 * fives stay aka and ordinary fives stay ordinary.
 */
export function findMeldOptions(
  handTiles: Tile[],
  selectedIdx: number,
  config: FindMeldOptionsConfig,
): MeldOption[] {
  const selected = handTiles[selectedIdx];
  if (!selected) return [];

  const options: MeldOption[] = [];
  if (config.allowChi) options.push(...findChiOptions(handTiles, selectedIdx));

  const ponIndices = identicalIndices(handTiles, selectedIdx, 3);
  if (ponIndices.length === 3) {
    options.push({ type: "pon", indices: ponIndices, tiles: tilesAt(handTiles, ponIndices), calledTileIndex: 0 });
  }
  const kanIndices = identicalIndices(handTiles, selectedIdx, 4);
  if (kanIndices.length === 4) {
    options.push({ type: "kan-open", indices: [...kanIndices], tiles: tilesAt(handTiles, [...kanIndices]), calledTileIndex: 0 });
    options.push({ type: "kan-closed", indices: [...kanIndices], tiles: tilesAt(handTiles, [...kanIndices]) });
  }
  return options;
}

/** Convert a chosen option into the stored Meld record. */
export function meldFromOption(option: MeldOption): Meld {
  return option.calledTileIndex === undefined
    ? { type: option.type, tiles: option.tiles as Meld["tiles"] }
    : { type: option.type, tiles: option.tiles as Meld["tiles"], calledTileIndex: option.calledTileIndex };
}

/**
 * Undo a declared meld: its actual tiles (aka identity included) go back to the
 * concealed hand and the meld disappears. Returns null for an out-of-range index.
 */
export function removeMeldAt(
  handTiles: Tile[],
  melds: Meld[],
  index: number,
): { handTiles: Tile[]; melds: Meld[] } | null {
  const meld = melds[index];
  if (!meld) return null;
  return {
    handTiles: [...handTiles, ...meld.tiles],
    melds: melds.filter((_, meldIndex) => meldIndex !== index),
  };
}
