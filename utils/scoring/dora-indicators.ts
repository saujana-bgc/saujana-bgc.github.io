import type { Tile } from './types'

/**
 * A physical dora display reveals one omote indicator, plus one for every
 * declared kan. Riichi also reveals an equally-sized ura row. The calculator
 * keeps both rows in one scan/input list, ordered omote first then ura.
 */
export function doraIndicatorRowCount(kanCount: number): number {
  return Math.max(1, Math.min(5, 1 + kanCount))
}

/** Expected count in the combined input/camera guide: omote, then ura. */
export function combinedDoraIndicatorCount(kanCount: number, riichi: boolean): number {
  const rowSize = doraIndicatorRowCount(kanCount)
  return riichi ? rowSize * 2 : rowSize
}

export function splitCombinedDoraIndicators(
  indicators: Tile[],
  kanCount: number,
  riichi: boolean,
): { omote: Tile[]; ura: Tile[] } {
  const rowSize = doraIndicatorRowCount(kanCount)
  const omote = indicators.slice(0, rowSize)
  const ura = riichi ? indicators.slice(rowSize, rowSize * 2) : []
  return { omote, ura }
}
