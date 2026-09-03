import type { Tile } from "./types.js";

export interface RawPrediction {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_CONFIDENCE = 0.45;

export function roboflowLabelToTile(label: string): Tile {
  const suited = label.match(/^([1-9])([mps])(r?)$/);
  if (suited) {
    const value = parseInt(suited[1], 10) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    const suitChar = suited[2];
    const isAka = suited[3] === "r";
    const suit = suitChar === "m" ? "man" : suitChar === "p" ? "pin" : "sou";
    return { suit, value, ...(isAka ? { isAka: true } : {}) };
  }

  const honor = label.match(/^([1-7])z$/);
  if (honor) {
    const honorMap: Record<string, Tile> = {
      "1z": { suit: "honor", value: "east" },
      "2z": { suit: "honor", value: "south" },
      "3z": { suit: "honor", value: "west" },
      "4z": { suit: "honor", value: "north" },
      "5z": { suit: "honor", value: "haku" },
      "6z": { suit: "honor", value: "hatsu" },
      "7z": { suit: "honor", value: "chun" },
    };
    return honorMap[label];
  }

  throw new Error(`Unrecognized Roboflow tile label: "${label}"`);
}

export function parsePredictions(predictions: RawPrediction[]): Tile[] {
  const found = predictions.filter((p) => p.confidence >= MIN_CONFIDENCE);
  // Order along the photo's dominant layout axis: a hand shot as a horizontal
  // row reads left-to-right, a vertical stack reads top-to-bottom. Sorting by
  // x alone scrambles vertical stacks (all x nearly equal), and the calculator
  // relies on the order for "the last tile scanned is the winning tile".
  const xSpan = Math.max(...found.map((p) => p.x)) - Math.min(...found.map((p) => p.x));
  const ySpan = Math.max(...found.map((p) => p.y)) - Math.min(...found.map((p) => p.y));
  const vertical = ySpan > xSpan;
  return found
    .sort((a, b) =>
      vertical ? a.y - b.y || a.x - b.x : a.x - b.x || a.y - b.y)
    .map((p) => roboflowLabelToTile(p.class));
}
