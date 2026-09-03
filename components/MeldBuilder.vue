<template>
  <div class="meld-builder">
    <div v-if="melds.length" class="meld-list">
      <div v-for="(meld, index) in melds" :key="`meld-${index}`" class="meld-card">
        <div class="meld-card-tiles">
          <TileImage v-for="(tile, tileIndex) in meld.tiles" :key="tileIndex" :tile="tile" size="small" />
        </div>
        <span class="meld-type">{{ meldLabel(meld.type) }}</span>
        <button type="button" class="meld-delete" :aria-label="`Remove ${meldLabel(meld.type)}`" @click="removeMeld(index)">×</button>
      </div>
    </div>

    <button
      v-if="!active"
      type="button"
      class="declare-button"
      :disabled="handTiles.length === 0"
      @click="active = true"
    >
      + Declare Chi / Pon / Kan
    </button>

    <div v-else-if="selectedIndex === null" class="builder-panel">
      <p>Tap a tile from your hand to declare a call</p>
      <div class="selectable-tiles">
        <button
          v-for="(tile, index) in handTiles"
          :key="`select-${index}`"
          type="button"
          class="selectable-tile"
          :aria-label="`Declare a meld using tile ${index + 1}`"
          @click="selectedIndex = index"
        >
          <TileImage :tile="tile" />
        </button>
      </div>
      <button type="button" class="text-button" @click="cancel">Cancel</button>
    </div>

    <div v-else class="builder-panel options-panel">
      <div class="selected-heading">
        <span>Meld with</span>
        <TileImage v-if="selectedTile" :tile="selectedTile" size="small" />
        <button type="button" class="text-button" @click="selectedIndex = null">Change tile</button>
      </div>

      <button
        v-for="(indices, index) in possibleChis"
        :key="`chi-${index}`"
        type="button"
        class="meld-option"
        @click="commit('chi', indices)"
      >
        <span class="option-tiles">
          <span
            v-for="(tile, tileIndex) in tilesAt(indices)"
            :key="tileIndex"
            :class="{ highlighted: indices[tileIndex] === selectedIndex }"
          >
            <TileImage :tile="tile" size="small" />
          </span>
        </span>
        <span class="meld-type">Chi</span>
      </button>

      <button v-if="ponIndices" type="button" class="meld-option" @click="commit('pon', ponIndices)">
        <span class="option-tiles"><TileImage v-for="(tile, index) in paddedTiles(ponIndices, 3)" :key="index" :tile="tile" size="small" /></span>
        <span class="meld-type">Pon</span>
      </button>

      <button v-if="openKanIndices" type="button" class="meld-option" @click="commit('kan-open', openKanIndices)">
        <span class="option-tiles"><TileImage v-for="(tile, index) in paddedTiles(openKanIndices, 4)" :key="index" :tile="tile" size="small" /></span>
        <span class="meld-type">Open Kan</span>
      </button>

      <button v-if="closedKanIndices" type="button" class="meld-option" @click="commit('kan-closed', closedKanIndices)">
        <span class="option-tiles"><TileImage v-for="(tile, index) in paddedTiles(closedKanIndices, 4)" :key="index" :tile="tile" size="small" /></span>
        <span class="meld-type">Closed Kan</span>
      </button>

      <p v-if="noValidMelds" class="no-melds">
        No valid melds for this tile.
        <button type="button" class="text-button" @click="selectedIndex = null">Pick another</button>
      </p>

      <button type="button" class="text-button cancel-button" @click="cancel">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Meld, Tile } from '~/utils/scoring/types'

const props = defineProps<{
  handTiles: Tile[]
  melds: Meld[]
}>()

const emit = defineEmits<{
  'update:handTiles': [tiles: Tile[]]
  'update:melds': [melds: Meld[]]
}>()

const active = ref(false)
const selectedIndex = ref<number | null>(null)
const selectedTile = computed(() => selectedIndex.value === null ? null : props.handTiles[selectedIndex.value] ?? null)

function tilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value
}

const possibleChis = computed<number[][]>(() => {
  const selected = selectedTile.value
  const selectedIdx = selectedIndex.value
  if (!selected || selectedIdx === null || selected.suit === 'honor') return []

  const value = selected.value as number
  const sequences = [[value - 2, value - 1, value], [value - 1, value, value + 1], [value, value + 1, value + 2]]
    .filter((sequence) => sequence.every((number) => number >= 1 && number <= 9))

  const results: number[][] = []
  for (const sequence of sequences) {
    const used = [selectedIdx]
    let valid = true
    for (const number of sequence) {
      if (number === value) continue
      const index = props.handTiles.findIndex((tile, tileIndex) =>
        !used.includes(tileIndex) && tile.suit === selected.suit && tile.value === number,
      )
      if (index === -1) {
        valid = false
        break
      }
      used.push(index)
    }
    if (valid) {
      results.push([...used].sort((a, b) => Number(props.handTiles[a].value) - Number(props.handTiles[b].value)))
    }
  }
  return results
})

const matchingIndices = computed<number[]>(() => {
  const selected = selectedTile.value
  const selectedIdx = selectedIndex.value
  if (!selected || selectedIdx === null) return []
  const matches = [selectedIdx]
  for (let index = 0; index < props.handTiles.length && matches.length < 4; index++) {
    if (index !== selectedIdx && tilesEqual(props.handTiles[index], selected)) matches.push(index)
  }
  return matches
})

const ponIndices = computed(() => matchingIndices.value.length >= 2 ? matchingIndices.value.slice(0, 3) : null)
const openKanIndices = computed(() => matchingIndices.value.length >= 3 ? matchingIndices.value.slice(0, 4) : null)
const closedKanIndices = computed(() => matchingIndices.value.length >= 2 ? matchingIndices.value.slice(0, 4) : null)
const noValidMelds = computed(() => !!selectedTile.value
  && possibleChis.value.length === 0
  && !ponIndices.value
  && !openKanIndices.value
  && !closedKanIndices.value)

function tilesAt(indices: number[]): Tile[] {
  return indices.map((index) => props.handTiles[index])
}

function cloneTile(tile: Tile): Tile {
  return tile.suit === 'honor'
    ? { suit: tile.suit, value: tile.value }
    : { suit: tile.suit, value: tile.value }
}

function paddedTiles(indices: number[], count: number): Tile[] {
  const tiles = tilesAt(indices)
  while (tiles.length < count && tiles[0]) tiles.push(cloneTile(tiles[0]))
  return tiles
}

function commit(type: Meld['type'], indices: number[]) {
  const count = type === 'pon' ? 3 : type.startsWith('kan') ? 4 : indices.length
  const tiles = paddedTiles(indices, count)
  if (!tiles.length) return
  emit('update:handTiles', props.handTiles.filter((_, index) => !indices.includes(index)))
  emit('update:melds', [...props.melds, { type, tiles: tiles as Meld['tiles'] }])
  cancel()
}

function removeMeld(index: number) {
  const meld = props.melds[index]
  if (!meld) return
  emit('update:handTiles', [...props.handTiles, ...meld.tiles])
  emit('update:melds', props.melds.filter((_, meldIndex) => meldIndex !== index))
}

function meldLabel(type: Meld['type']): string {
  return ({ chi: 'Chi', pon: 'Pon', 'kan-open': 'Open Kan', 'kan-closed': 'Closed Kan', 'kan-added': 'Kan' })[type]
}

function cancel() {
  active.value = false
  selectedIndex.value = null
}

watch(() => props.handTiles.length, (length) => {
  if (selectedIndex.value !== null && selectedIndex.value >= length) selectedIndex.value = null
  if (length === 0 && active.value) cancel()
})
</script>

<style scoped>
.meld-builder,
.meld-list {
  display: grid;
  gap: 8px;
  width: 100%;
}

.meld-card,
.meld-option {
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  padding: 9px 11px;
  border: 1px solid rgba(101, 119, 99, 0.18);
  border-radius: 12px;
  background: rgba(255, 253, 249, 0.72);
}

.meld-card-tiles,
.option-tiles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}

.meld-type {
  margin-left: auto;
  padding: 4px 7px;
  color: var(--matcha-leaf);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  border: 1px solid rgba(101, 119, 99, 0.18);
  border-radius: 7px;
  background: rgba(101, 119, 99, 0.07);
  white-space: nowrap;
}

.meld-delete {
  padding: 5px;
  color: var(--clay-text);
  font: inherit;
  font-size: 1rem;
  line-height: 1;
  border: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0.55;
}

.declare-button {
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  color: var(--clay-text);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid rgba(101, 119, 99, 0.2);
  border-radius: 12px;
  background: rgba(255, 253, 249, 0.7);
  cursor: pointer;
}

.declare-button:hover:not(:disabled),
.meld-option:hover {
  color: var(--matcha-leaf);
  border-color: var(--matcha-leaf);
}

.declare-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.builder-panel {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(101, 119, 99, 0.18);
  border-radius: 14px;
  background: rgba(101, 119, 99, 0.06);
}

.builder-panel > p,
.selected-heading > span:first-child {
  margin: 0;
  color: var(--clay-text);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  opacity: 0.7;
}

.selectable-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.selectable-tile {
  padding: 0;
  line-height: 0;
  border: 1px solid rgba(101, 119, 99, 0.18);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.selectable-tile:hover {
  border-color: var(--gold-leaf);
  transform: translateY(-2px);
}

.selected-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(101, 119, 99, 0.12);
}

.selected-heading .text-button {
  margin-left: auto;
}

.meld-option {
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.option-tiles > .highlighted {
  display: flex;
  border-radius: 4px;
  outline: 2px solid var(--gold-leaf);
}

.text-button {
  justify-self: start;
  padding: 0;
  color: var(--clay-text);
  font: inherit;
  font-size: 0.7rem;
  border: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0.65;
}

.text-button:hover {
  color: var(--gold-leaf);
  opacity: 1;
}

.no-melds {
  color: #8a3b3b !important;
  line-height: 1.5;
  opacity: 0.9 !important;
}

.no-melds .text-button {
  margin-left: 4px;
  text-decoration: underline;
}

.cancel-button {
  margin-top: 2px;
}
</style>
