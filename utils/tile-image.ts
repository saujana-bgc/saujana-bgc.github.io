import type { Tile, SuitedValue } from './scoring/types'

// Tile images: FluffyStuff/riichi-mahjong-tiles (CC0 public domain)
// https://github.com/FluffyStuff/riichi-mahjong-tiles
const HONOR_FILES: Record<string, string> = {
  east: 'Ton',
  south: 'Nan',
  west: 'Shaa',
  north: 'Pei',
  haku: 'Haku',
  hatsu: 'Hatsu',
  chun: 'Chun',
}

export function tileFile(tile: Tile): string {
  if (tile.suit === 'honor') return HONOR_FILES[tile.value] ?? 'Blank'
  const suit = tile.suit === 'man' ? 'Man' : tile.suit === 'pin' ? 'Pin' : 'Sou'
  if ((tile.value as SuitedValue) === 5 && tile.isAka) return `${suit}5-Dora`
  return `${suit}${tile.value}`
}

export function tileSrc(tile: Tile): string {
  return `/tiles/${tileFile(tile)}.svg`
}
