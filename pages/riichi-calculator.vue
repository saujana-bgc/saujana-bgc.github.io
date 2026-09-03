<template>
  <main class="calc-page">
    <header class="calc-hero fade-up">
      <p class="calc-kicker">Saujana Board Game Community</p>
      <h1 class="hero-title">Riichi Calculator</h1>
      <p class="calc-intro">
        Score a riichi hand the way the league plays it: open tanyao allowed, no kiriage mangan,
        and 13+ han counts as a counted yakuman. Scan your tiles from a photo or use the guided
        camera, then correct anything manually.
      </p>
    </header>

    <section class="content-card input-card fade-up" aria-labelledby="input-heading">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Hand input</p>
          <h2 id="input-heading">The winning hand</h2>
          <p v-if="threePlayer" class="sanma-note">3-player table — 2–8 man out of play, two red fives, two payers on tsumo</p>
        </div>
        <label class="sanma-toggle">
          <input v-model="threePlayer" type="checkbox" />
          Three-player table
        </label>
      </div>

      <div class="capture-row">
        <div class="capture-buttons">
          <TileCaptureMenu
            label="Scan tiles"
            :busy="detectingHand || detectingDora"
            guided
            @capture="scanHand"
            @guided="guidedOpen = true"
          />
          <button type="button" class="new-hand-btn" @click="clearHand">＋ New hand</button>
        </div>
        <span v-if="warmupNote" class="warmup-note" :class="scanStatus">
          {{ warmupNote }}
        </span>
      </div>
      <p v-if="detectError" class="detect-error">{{ detectError }}</p>

      <div class="picked-rows">
        <div class="picked-row">
          <span class="row-label">Hand <em>{{ handProgress }}</em></span>
          <div class="row-tiles">
            <button
              v-for="(tile, i) in handTiles"
              :key="`hand-${i}-${tileToText(tile)}`"
              type="button"
              class="tile-btn"
              title="Remove tile"
              @click="removeHandTile(i)"
            >
              <TileImage :tile="tile" />
            </button>
            <button
              type="button"
              class="row-add"
              title="Add hand tiles"
              aria-label="Add tiles to hand"
              @click="aimPicker('hand')"
            >
              ＋
            </button>
            <span v-if="handTiles.length === 0" class="row-empty">No tiles yet</span>
          </div>
        </div>

        <div class="picked-row">
          <span class="row-label">Winning tile</span>
          <div class="row-tiles">
            <button v-if="winningTile" type="button" class="tile-btn" title="Clear winning tile" @click="setWinningTile(null)">
              <TileImage :tile="winningTile" />
            </button>
            <button type="button" class="row-add" title="Set the winning tile" aria-label="Add winning tile" @click="aimPicker('win')">
              ＋
            </button>
            <span v-if="!winningTile" class="row-empty">Pick the winning tile</span>
          </div>
        </div>

        <div class="picked-row">
          <span class="row-label">Melds</span>
          <MeldBuilder
            :hand-tiles="handTiles"
            :melds="parsedMelds"
            @update:hand-tiles="updateMeldHandTiles"
            @update:melds="updateMelds"
          />
        </div>

        <div class="picked-row">
          <span class="row-label">Dora indicators</span>
          <div class="row-tiles">
            <button
              v-for="(tile, i) in doraTiles"
              :key="`dora-${i}-${tileToText(tile)}`"
              type="button"
              class="tile-btn"
              title="Remove indicator"
              @click="removeDoraTile(i)"
            >
              <TileImage :tile="tile" />
            </button>
            <button type="button" class="row-add" title="Add dora indicators" aria-label="Add dora indicators" @click="aimPicker('dora')">
              ＋
            </button>
            <span v-if="doraTiles.length === 0" class="row-empty">None</span>
          </div>
        </div>
      </div>
      <p v-if="inputNote" class="input-note" :class="{ problem: inputNoteProblem }">{{ inputNote }}</p>

      <div id="tile-picker" class="tile-picker" aria-label="Tile picker">
        <div class="picker-target-line">
          <span class="picker-mode-label">Adding to <strong>{{ activePickerLabel }}</strong></span>
          <button v-if="handStarted" type="button" class="picker-collapse" @click="pickerCollapsed = true">
            Hide picker
          </button>
        </div>
        <div v-show="!pickerCollapsed">
          <div v-for="row in pickerRows" :key="row.label" class="picker-row">
            <span class="picker-row-label">{{ row.label }}</span>
            <div class="picker-row-tiles">
              <button
                v-for="code in row.codes"
                :key="code"
                type="button"
                class="picker-tile"
                :title="`Add ${code} to ${activePickerLabel}`"
                @click="appendTile(code)"
              >
                <img :src="tileSrcForCode(code)" :alt="code" draggable="false" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="field-grid">
        <div class="field field-wide">
          <label for="hand-text">Hand notation (closed tiles + winning tile)</label>
          <input
            id="hand-text"
            v-model="handText"
            type="text"
            spellcheck="false"
            placeholder="e.g. 123m456p789s234s55s"
            @input="applyHandText"
          />
          <p class="field-hint">Suit letters m / p / s / z, 0 = red five (aka). The 14th tile is the winning tile.</p>
        </div>

        <div class="field">
          <label for="win-tile-text">Winning tile</label>
          <input id="win-tile-text" v-model="winTileText" type="text" spellcheck="false" placeholder="e.g. 2z" @input="applyWinTileText" />
        </div>

        <div class="field">
          <label for="dora-text">Dora indicators</label>
          <input id="dora-text" v-model="doraText" type="text" spellcheck="false" placeholder="e.g. 1m 4z 0s" @input="applyDoraText" />
        </div>
      </div>

      <div class="option-grid">
        <div class="field win-type-field">
          <span class="field-label">Win</span>
          <div class="segmented-control" role="radiogroup" aria-label="Win type">
            <button
              v-for="option in winTypeOptions"
              :key="option.value"
              type="button"
              role="radio"
              :class="{ active: winType === option.value }"
              :aria-checked="winType === option.value"
              @click="winType = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="field">
          <label for="seat-wind">Seat wind</label>
          <select id="seat-wind" v-model="seatWind">
            <option value="east">East</option>
            <option value="south">South</option>
            <option value="west">West</option>
            <option v-if="!threePlayer" value="north">North</option>
          </select>
        </div>
        <div class="field">
          <label for="round-wind">Round wind</label>
          <select id="round-wind" v-model="roundWind">
            <option value="east">East</option>
            <option value="south">South</option>
          </select>
        </div>
        <div class="field">
          <label for="honba">Honba</label>
          <input id="honba" v-model.number="honba" type="number" min="0" max="20" inputmode="numeric" />
        </div>
      </div>

      <div class="flag-grid">
        <label
          v-for="flag in situationalFlags"
          :key="flag.key"
          class="flag"
          :class="{ disabled: !!flagDisabledReasons[flag.key], active: flags[flag.key] }"
          :title="flagDisabledReasons[flag.key] ?? ''"
        >
          <input v-model="flags[flag.key]" type="checkbox" :disabled="!!flagDisabledReasons[flag.key]" />
          {{ flag.label }}
        </label>
      </div>
<p v-if="activeFlagHint" class="flag-hint">{{ activeFlagHint }}</p>
    </section>

    <section class="content-card result-card fade-up" aria-labelledby="result-heading" aria-live="polite">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Result<span v-if="threePlayer" class="sanma-pill">3-player</span></p>
          <h2 id="result-heading">{{ resultHeading }}</h2>
        </div>
      </div>

      <p v-if="error" class="result-error">{{ error }}</p>
      <p v-else-if="notice" class="result-notice">{{ notice }}</p>

      <template v-else-if="result">
        <div class="score-banner">
          <div class="score-main">
            <span class="score-label">{{ winType === 'tsumo' ? 'Tsumo' : 'Ron' }} · {{ windLabel(seatWind) }} seat</span>
            <strong>{{ scoreDisplay }}</strong>
            <span v-if="honba > 0" class="honba-note">includes {{ honba }} honba</span>
          </div>
          <div v-if="result.points.tsumo" class="score-split">
            <div>
              <span>Dealer pays</span>
              <strong>{{ formatPoints(result.points.tsumo.dealerPays) }}</strong>
            </div>
            <div>
              <span>{{ tsumoOthersLabel }}</span>
              <strong>{{ formatPoints(result.points.tsumo.nonDealerPays) }}</strong>
            </div>
          </div>
        </div>

        <div class="result-columns">
          <div class="result-block">
            <h3>Yaku ({{ result.totalHan }} han)</h3>
            <ul class="yaku-list">
              <li v-for="yaku in result.yaku" :key="yaku.name">
                <span class="yaku-ja">{{ yaku.nameJa }}</span>
                <span class="yaku-en">{{ yakuName(yaku.name) }}</span>
                <strong>{{ yaku.isYakuman ? 'yakuman' : `${yaku.han} han` }}</strong>
              </li>
              <li v-if="result.doraCount > 0">
                <span class="yaku-ja">ドラ</span>
                <span class="yaku-en">Dora</span>
                <strong>{{ result.doraCount }}</strong>
              </li>
              <li v-if="result.uraDoraCount > 0">
                <span class="yaku-ja">裏ドラ</span>
                <span class="yaku-en">Ura-dora</span>
                <strong>{{ result.uraDoraCount }}</strong>
              </li>
            </ul>
          </div>

          <div class="result-block">
            <h3>Fu ({{ result.fu }} total)</h3>
            <ul class="fu-list">
              <li v-if="result.fuBreakdown.base"><span>Base</span><strong>{{ result.fuBreakdown.base }}</strong></li>
              <li v-if="result.fuBreakdown.pairFu"><span>Pair</span><strong>{{ result.fuBreakdown.pairFu }}</strong></li>
              <li v-if="result.fuBreakdown.meldFu"><span>Melds</span><strong>{{ result.fuBreakdown.meldFu }}</strong></li>
              <li v-if="result.fuBreakdown.waitFu"><span>Wait</span><strong>{{ result.fuBreakdown.waitFu }}</strong></li>
              <li v-if="result.fuBreakdown.tsumoFu"><span>Tsumo</span><strong>{{ result.fuBreakdown.tsumoFu }}</strong></li>
            </ul>
          </div>
        </div>
      </template>

      <p v-else class="result-empty">Complete the hand (13 tiles + winning tile, melds included) to see the score.</p>
    </section>

    <section class="content-card rules-card fade-up" aria-labelledby="rules-heading">
      <div class="section-heading">
        <div>
          <p class="section-kicker">League settings</p>
          <h2 id="rules-heading">Rules applied</h2>
        </div>
      </div>
      <ul class="rules-list">
        <li>Open tanyao and atozuke are allowed.</li>
        <li>Three red fives on a four-player table, two on a three-player table.</li>
        <li>Three-player tables use 1s/9s man only — 2–8 man are out of play.</li>
        <li>Kiriage mangan is off — mangan requires 5 han (or 4 han 40+ fu, 3 han 70+ fu).</li>
        <li>13+ han from ordinary yaku counts as a counted yakuman.</li>
        <li>Honba pay 300 all around on ron, 100 per paying player on tsumo.</li>
        <li>Double wind pairs score 4 fu.</li>
      </ul>
    </section>

    <Teleport to="body">
      <GuidedTileCapture
        v-if="guidedOpen"
        @capture="scanGuided"
        @close="guidedOpen = false"
      />
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { Hand, Meld, Tile, WindValue } from '~/utils/scoring/types'
import { score } from '~/utils/scoring'
import { sortTiles } from '~/utils/scoring/tiles'
import { fillMissingHandWithHaku } from '~/utils/scoring/haku-fallback'
import { tileFile, tileSrc } from '~/utils/tile-image'

type FlagKey = 'riichi' | 'doubleRiichi' | 'ippatsu' | 'haitei' | 'houtei' | 'rinshan' | 'chankan'
type GuidedSectionKey = 'hand' | 'winning' | 'dora'
type GuidedSectionBox = { x: number; y: number; w: number; h: number }
interface GuidedCaptureData {
  image: string
  sections: Partial<Record<GuidedSectionKey, GuidedSectionBox>>
  imageWidth: number
  imageHeight: number
}
interface GuidedDetectionResult {
  mode: 'guided'
  hand: Tile[]
  winningTile: Tile | null
  dora: Tile[]
  melds: Meld[]
  error?: string
}

// ─── Core hand state ──────────────────────────────────────────────────────────
// The tile arrays are the source of truth; the notation fields mirror them and
// write back on input.

const handTiles = ref<Tile[]>([])
const winningTile = ref<Tile | null>(null)
const doraTiles = ref<Tile[]>([])
const melds = ref<Meld[]>([])

const handText = ref('')
const doraText = ref('')
const winTileText = ref('')
const winType = ref<'ron' | 'tsumo'>('ron')
const winTypeOptions: { label: string; value: 'ron' | 'tsumo' }[] = [
  { label: 'Ron', value: 'ron' },
  { label: 'Tsumo', value: 'tsumo' },
]
const seatWind = ref<WindValue>('south')
const roundWind = ref<WindValue>('east')
const honba = ref(0)
const threePlayer = ref(false)
const flags = reactive<Record<FlagKey, boolean>>({
  riichi: false,
  doubleRiichi: false,
  ippatsu: false,
  haitei: false,
  houtei: false,
  rinshan: false,
  chankan: false,
})

const situationalFlags: { key: FlagKey; label: string }[] = [
  { key: 'riichi', label: 'Riichi' },
  { key: 'doubleRiichi', label: 'Double riichi' },
  { key: 'ippatsu', label: 'Ippatsu' },
  { key: 'haitei', label: 'Haitei (win on last draw)' },
  { key: 'houtei', label: 'Houtei (win on last discard)' },
  { key: 'rinshan', label: 'Rinshan (after kan)' },
  { key: 'chankan', label: 'Chankan (rob a kan)' },
]

// ─── Session persistence ──────────────────────────────────────────────────────
// The whole sheet survives a refresh or a phone lock mid-game. Tiles go through
// their text notation so the stored shape stays trivially serializable.

const STORAGE_KEY = 'riichi-calculator-sheet-v1'

interface StoredSheet {
  hand: string
  win: string
  dora: string
  melds: Meld[]
  winType: 'ron' | 'tsumo'
  seatWind: WindValue
  roundWind: WindValue
  honba: number
  threePlayer: boolean
  flags: Record<FlagKey, boolean>
}

function saveSheet() {
  if (import.meta.server) return
  const sheet: StoredSheet = {
    hand: handToText(),
    win: winningTile.value ? tileToText(winningTile.value) : '',
    dora: doraText.value,
    melds: melds.value,
    winType: winType.value,
    seatWind: seatWind.value,
    roundWind: roundWind.value,
    honba: honba.value,
    threePlayer: threePlayer.value,
    flags: { ...flags },
  }
  try {
    if (handTiles.value.length || melds.value.length || doraTiles.value.length || winningTile.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage unavailable (private mode, quota) — persistence is best-effort.
  }
}

function restoreSheet() {
  if (import.meta.server) return false
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
  if (!raw) return false
  try {
    const sheet = JSON.parse(raw) as StoredSheet
    handTiles.value = sortTiles(parseTileList(sheet.hand ?? ''))
    winningTile.value = sheet.win ? parseTile(sheet.win) : null
    doraTiles.value = parseTileList(sheet.dora ?? '').slice(0, 12)
    melds.value = Array.isArray(sheet.melds) ? sheet.melds : []
    winType.value = sheet.winType === 'tsumo' ? 'tsumo' : 'ron'
    seatWind.value = sheet.seatWind ?? 'south'
    roundWind.value = sheet.roundWind ?? 'east'
    honba.value = Number(sheet.honba) || 0
    threePlayer.value = !!sheet.threePlayer
    if (sheet.flags) {
      for (const key of Object.keys(flags) as FlagKey[]) flags[key] = !!sheet.flags[key]
    }
    syncHandText()
    syncDoraText()
    return handTiles.value.length > 0 || melds.value.length > 0 || doraTiles.value.length > 0
  } catch {
    return false
  }
}

// ─── Tile notation helpers ────────────────────────────────────────────────────

const SUIT_MAP: Record<string, Tile['suit']> = { m: 'man', p: 'pin', s: 'sou', z: 'honor' }
const HONOR_VALUES = ['east', 'south', 'west', 'north', 'haku', 'hatsu', 'chun'] as const

function parseTile(token: string): Tile | null {
  const match = token.trim().toLowerCase().match(/^([0-9])([mpsz])$/)
  if (!match) return null
  const num = Number(match[1])
  const suit = SUIT_MAP[match[2]]
  if (suit === 'honor') {
    if (num === 0) return null
    return { suit, value: HONOR_VALUES[num - 1] }
  }
  return num === 0 ? { suit, value: 5, isAka: true } : { suit, value: num as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }
}

function tileToText(tile: Tile): string {
  if (tile.suit === 'honor') return `${HONOR_VALUES.indexOf(tile.value) + 1}z`
  return `${tile.isAka ? 0 : tile.value}${tile.suit[0]}`
}

function tilesEqualValue(a: Tile, b: Tile): boolean {
  if (a.suit !== b.suit) return false
  if (a.suit === 'honor' && b.suit === 'honor') return a.value === b.value
  if (a.suit !== 'honor' && b.suit !== 'honor') return a.value === b.value
  return false
}

function parseTileList(text: string): Tile[] {
  const tiles: Tile[] = []
  // Runs of digits followed by a suit letter: 123m456p789s11z, 0 = red five
  for (const [, digits, suit] of text.toLowerCase().matchAll(/([0-9]+)([mpsz])/g)) {
    for (const digit of digits) {
      const tile = parseTile(`${digit}${suit}`)
      if (tile) tiles.push(tile)
    }
  }
  return tiles
}

function windLabel(w: WindValue): string {
  return w.charAt(0).toUpperCase() + w.slice(1)
}

// ─── Text ↔ array sync ────────────────────────────────────────────────────────

function handToText(): string {
  return [...handTiles.value, ...(winningTile.value ? [winningTile.value] : [])].map(tileToText).join('')
}

function applyHandText() {
  const tiles = parseTileList(handText.value)
  if (tiles.length > 13) {
    handTiles.value = sortTiles(tiles.slice(0, 13))
    winningTile.value = tiles[13]
  } else {
    handTiles.value = sortTiles(tiles)
    winningTile.value = null
  }
  winTileText.value = winningTile.value ? tileToText(winningTile.value) : ''
}

function applyDoraText() {
  doraTiles.value = parseTileList(doraText.value).slice(0, 12)
}

function applyWinTileText() {
  winningTile.value = winTileText.value.trim() ? parseTile(winTileText.value) : null
}

function syncHandText() {
  handText.value = handToText()
  winTileText.value = winningTile.value ? tileToText(winningTile.value) : ''
}

function syncDoraText() {
  doraText.value = doraTiles.value.map(tileToText).join(' ')
}

// ─── Tile picker ──────────────────────────────────────────────────────────────

type PickerMode = 'hand' | 'win' | 'dora'
const pickerMode = ref<PickerMode>('hand')
const pickerCollapsed = ref(true)
const pickerModeLabels: Record<PickerMode, string> = {
  hand: 'Hand',
  win: 'Winning tile',
  dora: 'Dora indicators',
}
const activePickerLabel = computed(() => pickerModeLabels[pickerMode.value])

// One row per suit; sanma drops the middle man tiles and the red man.
const pickerRows = computed(() => {
  const rows: { label: string; codes: string[] }[] = []
  const manCodes = threePlayer.value ? ['1m', '9m'] : ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '0m']
  rows.push({ label: 'Man', codes: manCodes })
  rows.push({ label: 'Pin', codes: ['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '0p'] })
  rows.push({ label: 'Sou', codes: ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '0s'] })
  rows.push({ label: 'Honors', codes: ['1z', '2z', '3z', '4z', '5z', '6z', '7z'] })
  return rows
})

function tileSrcForCode(code: string): string {
  const tile = parseTile(code)
  return tile ? tileSrc(tile) : ''
}

function aimPicker(mode: PickerMode) {
  pickerMode.value = mode
  pickerCollapsed.value = false
  document.getElementById('tile-picker')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function appendTile(code: string) {
  const tile = parseTile(code)
  if (!tile) return
  if (pickerMode.value === 'hand') {
    handTiles.value = sortTiles([...handTiles.value, tile])
    syncHandText()
  } else if (pickerMode.value === 'win') {
    setWinningTile(tile)
    // The winning row only ever holds one tile — done picking, close the picker.
    pickerCollapsed.value = true
  } else {
    doraTiles.value = [...doraTiles.value, tile].slice(0, 12)
    syncDoraText()
  }
}

function removeHandTile(index: number) {
  handTiles.value = handTiles.value.filter((_, i) => i !== index)
  syncHandText()
}

function removeDoraTile(index: number) {
  doraTiles.value = doraTiles.value.filter((_, i) => i !== index)
  syncDoraText()
}

function setWinningTile(tile: Tile | null) {
  winningTile.value = tile
  syncHandText()
}

const parsedMelds = computed(() => melds.value)

function updateMeldHandTiles(tiles: Tile[]) {
  handTiles.value = sortTiles(tiles)
  syncHandText()
}

function updateMelds(nextMelds: Meld[]) {
  melds.value = nextMelds
}

// ─── Gentle progress / validation ─────────────────────────────────────────────
// While the hand is still being assembled, say what's missing instead of
// erroring. Only a *complete-looking* hand that can't score is a real error.

const handStarted = computed(() =>
  handTiles.value.length > 0 || melds.value.length > 0 || doraTiles.value.length > 0 || !!winningTile.value)

const handProgress = computed(() => {
  const kans = parsedMelds.value.filter((m) => m.type.startsWith('kan')).length
  const target = 13 + kans - parsedMelds.value.filter((m) => !m.type.startsWith('kan')).length * 3
  const count = handTiles.value.length
  return melds.value.length > 0 || kans > 0
    ? `${count} tiles${kans ? ` +${kans} kan` : ''}`
    : `${count} / 13`
})

const inputNoteProblem = computed(() =>
  error.value !== null && handComplete.value)

const inputNote = computed(() => {
  // Surface the scoring error inline next to the rows only once the sheet
  // looks complete — before that the result card's progress text covers it.
  if (inputNoteProblem.value && error.value) return error.value
  return null
})

const handComplete = computed(() => {
  const kans = parsedMelds.value.filter((m) => m.type.startsWith('kan')).length
  const totalTiles = handTiles.value.length + parsedMelds.value.reduce((sum, m) => sum + m.tiles.length, 0)
  return totalTiles === 13 + kans && !!winningTile.value
})

// ─── New hand ─────────────────────────────────────────────────────────────────

function clearHand() {
  handTiles.value = []
  winningTile.value = null
  doraTiles.value = []
  melds.value = []
  handText.value = ''
  winTileText.value = ''
  doraText.value = ''
  winType.value = 'ron'
  honba.value = 0
  for (const key of Object.keys(flags) as FlagKey[]) flags[key] = false
  detectError.value = null
  pickerMode.value = 'hand'
  pickerCollapsed.value = true
}

// ─── Smart flag validation ────────────────────────────────────────────────────

// A hand is "open" if any called meld other than a closed kan is present.
const isOpenHand = computed(() => parsedMelds.value.some((m) => m.type !== 'kan-closed'))

const flagDisabledReasons = computed<Record<FlagKey, string | undefined>>(() => {
  const reasons: Record<FlagKey, string | undefined> = {}
  if (isOpenHand.value) {
    reasons.riichi = 'Riichi needs a fully closed hand'
    reasons.doubleRiichi = 'Double riichi needs a fully closed hand'
    reasons.ippatsu = 'Ippatsu needs riichi on a closed hand'
  }
  if (!flags.riichi && !flags.doubleRiichi) {
    reasons.ippatsu = 'Ippatsu needs riichi declared'
  }
  if (winType.value !== 'tsumo') {
    reasons.haitei = 'Haitei is a win on the last drawn tile (tsumo only)'
    reasons.rinshan = 'Rinshan is a win on a replacement draw (tsumo only)'
  }
  if (winType.value !== 'ron') {
    reasons.houtei = 'Houtei is a win on the last discard (ron only)'
    reasons.chankan = 'Chankan is a ron off a kan extension'
  }
  return reasons
})

// Disable-dependent flags clear themselves when their precondition is lost
// (e.g. declaring a meld after ticking riichi).
watch(flagDisabledReasons, (reasons) => {
  for (const key of Object.keys(flags) as FlagKey[]) {
    if (flags[key] && reasons[key]) flags[key] = false
  }
})

// Double riichi implies riichi.
watch(() => flags.doubleRiichi, (on) => {
  if (on) flags.riichi = true
})

const activeFlagHint = computed(() => {
  for (const flag of situationalFlags) {
    if (flags[flag.key] && flagDisabledReasons.value[flag.key]) {
      return `${flag.label}: ${flagDisabledReasons.value[flag.key]}`
    }
  }
  return null
})

// ─── Remote detection (tile-detect-api on Vercel) ─────────────────────────────

const detectingHand = ref(false)
const detectingDora = ref(false)
const guidedOpen = ref(false)
const detectError = ref<string | null>(null)
const scanStatus = ref<'idle' | 'ready' | 'failed'>('idle')

const warmupNote = computed(() => {
  if (scanStatus.value === 'ready') return 'Scanner ready'
  if (scanStatus.value === 'failed') return 'Scanner unavailable — enter tiles manually'
  return ''
})

const config = useRuntimeConfig()
const DETECT_URL = config.public.tileDetectUrl as string

// Restore a saved sheet (if any) before the first render settles, then persist
// every subsequent change. Saving is debounced-free: the state is tiny.
const restored = ref(false)

onMounted(() => {
  restored.value = restoreSheet()
  if (restored.value) {
    // Re-validate restored flags against the restored hand (e.g. a stored open
    // hand can't keep riichi).
    for (const key of Object.keys(flags) as FlagKey[]) {
      if (flags[key] && flagDisabledReasons.value[key]) flags[key] = false
    }
  }

  fetch(DETECT_URL, { method: 'GET' })
    .then((res) => { scanStatus.value = res.ok ? 'ready' : 'failed' })
    .catch(() => { scanStatus.value = 'failed' })
})

watch(
  () => [
    handTiles.value,
    winningTile.value,
    doraTiles.value,
    melds.value,
    winType.value,
    seatWind.value,
    roundWind.value,
    honba.value,
    threePlayer.value,
    { ...flags },
  ],
  () => {
    if (restored.value) saveSheet()
  },
  { deep: true },
)

async function requestDetection(payload: Record<string, unknown>): Promise<Record<string, any>> {
  const res = await fetch(DETECT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const responseText = await res.text()
  let data: Record<string, any>
  try {
    data = responseText ? JSON.parse(responseText) : {}
  } catch {
    throw new Error(`Detection service returned an invalid response (${res.status})`)
  }
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Detection request failed (${res.status})`)
  }
  return data
}

async function detectOnServer(base64: string): Promise<Tile[]> {
  const data = await requestDetection({ image: base64 })
  if (!Array.isArray(data.tiles)) {
    throw new Error('Detection service returned no tile list')
  }
  return data.tiles as Tile[]
}

async function scanHand(base64: string) {
  detectingHand.value = true
  detectError.value = null
  try {
    const tiles = await detectOnServer(base64)
    if (tiles.length < 1) {
      detectError.value = 'No tiles detected. Try better lighting or a closer shot.'
      return
    }
    if (tiles.length > 20) {
      detectError.value = 'Too many tiles detected. Crop the photo to the hand, or use Guided scan.'
      return
    }
    // A gallery photo is assumed to be a complete 14-tile shot: the last tile
    // scanned is the winning tile, the rest form the concealed hand. The haku
    // fill tops the hand up when the detector drops a tile or two.
    const winningTileScanned = tiles[tiles.length - 1]
    const handScanned = tiles.slice(0, -1)
    const kans = parsedMelds.value.filter((m) => m.type.startsWith('kan')).length
    handTiles.value = sortTiles(fillMissingHandWithHaku(handScanned, 13 - 3 * (parsedMelds.value.length - kans)))
    winningTile.value = winningTileScanned
    syncHandText()
    scanStatus.value = 'ready'
  } catch (err) {
    scanStatus.value = 'failed'
    detectError.value = err instanceof Error && err.message
      ? `${err.message} Please enter the tiles manually.`
      : 'Detection failed. Please enter the tiles manually.'
  } finally {
    detectingHand.value = false
  }
}

async function scanGuided(capture: GuidedCaptureData) {
  guidedOpen.value = false
  const scansHand = !!capture.sections.hand || !!capture.sections.winning
  const scansDora = !!capture.sections.dora
  detectingHand.value = scansHand
  detectingDora.value = scansDora
  detectError.value = null

  try {
    const data = await requestDetection({
      image: capture.image,
      sections: capture.sections,
      imageWidth: capture.imageWidth,
      imageHeight: capture.imageHeight,
    }) as unknown as GuidedDetectionResult

    if (data.mode !== 'guided' || !Array.isArray(data.hand) || !Array.isArray(data.dora)) {
      throw new Error('Detection service returned an invalid guided-scan result')
    }

    const foundCount = data.hand.length
      + data.dora.length
      + (data.winningTile ? 1 : 0)
      + (Array.isArray(data.melds) ? data.melds.reduce((count, meld) => count + meld.tiles.length, 0) : 0)
    if (foundCount === 0) {
      detectError.value = 'No tiles detected in the selected regions. Try better lighting or move closer.'
      scanStatus.value = 'ready'
      return
    }

    if (capture.sections.hand && Array.isArray(data.melds)) {
      melds.value = data.melds
    }
    if (capture.sections.hand && data.hand.length > 0) {
      const detectedMelds = Array.isArray(data.melds) ? data.melds : parsedMelds.value
      const kans = detectedMelds.filter((meld) => meld.type.startsWith('kan')).length
      const target = 13 - 3 * (detectedMelds.length - kans)
      handTiles.value = sortTiles(fillMissingHandWithHaku(data.hand, target))
      syncHandText()
    }
    if (capture.sections.winning && data.winningTile) {
      winningTile.value = data.winningTile
      syncHandText()
    }
    if (capture.sections.dora && data.dora.length > 0) {
      doraTiles.value = sortTiles(data.dora.slice(0, 12))
      syncDoraText()
    }
    scanStatus.value = 'ready'
  } catch (err) {
    scanStatus.value = 'failed'
    detectError.value = err instanceof Error && err.message
      ? `${err.message} Please enter the tiles manually.`
      : 'Guided detection failed. Please enter the tiles manually.'
  } finally {
    detectingHand.value = false
    detectingDora.value = false
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const YAKU_EN: Record<string, string> = {
  riichi: 'Riichi',
  'double-riichi': 'Double riichi',
  ippatsu: 'Ippatsu',
  tsumo: 'Fully concealed hand',
  pinfu: 'Pinfu',
  tanyao: 'All simples',
  yakuhai: 'Yakuhai (value triplet)',
  'sanshoku-doujun': 'Three coloured sequences',
  ittsu: 'Pure straight',
  toitoi: 'All triplets',
  sanankou: 'Three concealed triplets',
  honitsu: 'Half flush',
  chinitsu: 'Full flush',
  chanta: 'Terminals or honors in every set',
  junchan: 'Terminals in every set',
  honroutou: 'All terminals and honors',
  shousangen: 'Little three dragons',
  sankantsu: 'Three kans',
  ryanpeikou: 'Two pairs of identical sequences',
  iipeiko: 'Identical sequences',
  'sanshoku-doukou': 'Three coloured triplets',
  chiitoitsu: 'Seven pairs',
  haitei: 'Last tile draw',
  houtei: 'Last discard',
  rinshan: 'After a kan',
  chankan: 'Robbing a kan',
  nagashi: 'Nagashi mangan',
  kokushi: 'Kokushi musou',
}

const HAND_NAMES: Record<string, string> = {
  mangan: 'Mangan',
  haneman: 'Haneman',
  baiman: 'Baiman',
  sanbaiman: 'Sanbaiman',
  yakuman: 'Yakuman',
  'kazoe-yakuman': 'Kazoe yakuman',
}

interface ScoreState {
  result: ReturnType<typeof score> | null
  error: string | null
  // Neutral "keep going" guidance shown while the sheet is mid-assembly.
  notice: string | null
}

// Physical-set validation the scoring engine can't know about: tile copy
// limits and the sanma tile-set restrictions from the league rules.
function validateTileSet(allTiles: Tile[]): string | null {
  const counts = new Map<string, number>()
  const akaPerSuit = new Map<string, number>()
  let akaTotal = 0
  for (const tile of allTiles) {
    const key = `${tile.suit}:${tile.value}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
    if (tile.isAka) {
      akaTotal++
      akaPerSuit.set(tile.suit, (akaPerSuit.get(tile.suit) ?? 0) + 1)
    }
    if (threePlayer.value && tile.suit === 'man' && typeof tile.value === 'number' && tile.value >= 2 && tile.value <= 8) {
      return `${tileToText(tile)} isn't in play on a three-player table (2–8 man removed).`
    }
  }
  for (const count of counts.values()) {
    if (count > 4) return 'A tile appears more than 4 times — check the hand.'
  }
  const akaMax = threePlayer.value ? 2 : 3
  if (akaTotal > akaMax) return `Only ${akaMax} red fives exist on this table.`
  for (const count of akaPerSuit.values()) {
    if (count > 1) return 'Only one red five per suit exists.'
  }
  return null
}

const scoreState = computed<ScoreState>(() => {
  const melds = parsedMelds.value

  if (handTiles.value.length === 0 && melds.length === 0) {
    return { result: null, error: null, notice: null }
  }

  if (!winningTile.value) {
    return {
      result: null,
      error: null,
      notice: `Add the winning tile — tap ＋ on the winning row (now ${handProgress.value}).`,
    }
  }

  const numKans = melds.filter((m) => m.type.startsWith('kan')).length
  const totalTiles = handTiles.value.length + melds.reduce((sum, m) => sum + m.tiles.length, 0)
  if (totalTiles !== 13 + numKans) {
    // Incomplete hands are progress, not errors. If the user picked the
    // winning tile but is mid-entry, nudge them back to the hand row.
    return {
      result: null,
      error: null,
      notice: handTiles.value.length < 13 + numKans
        ? `Hand holds ${totalTiles} of ${13 + numKans} tiles — add ${13 + numKans - totalTiles} more.`
        : `Hand holds ${totalTiles} tiles — ${totalTiles - (13 + numKans)} too many. Remove some hand tiles.`,
    }
  }

  const allTiles: Tile[] = [
    ...handTiles.value,
    winningTile.value,
    ...melds.flatMap((m) => [...m.tiles]),
  ]
  const setProblem = validateTileSet(allTiles)
  if (setProblem) return { result: null, error: setProblem, notice: null }

  const hand: Hand = {
    closedTiles: handTiles.value,
    melds,
    winningTile: winningTile.value,
    winType: winType.value,
    seatWind: seatWind.value,
    roundWind: roundWind.value,
    doraIndicators: doraTiles.value,
    riichi: flags.riichi,
    doubleRiichi: flags.doubleRiichi,
    ippatsu: flags.ippatsu,
    haitei: flags.haitei,
    houtei: flags.houtei,
    rinshan: flags.rinshan,
    chankan: flags.chankan,
    honba: honba.value,
  }

  const result = score(hand, {
    playerCount: threePlayer.value ? 3 : 4,
    akaDoraCount: threePlayer.value ? 2 : 3,
  })

  if (!result.valid) {
    return { result: null, error: result.error ?? 'This hand cannot be scored.', notice: null }
  }

  return { result, error: null, notice: null }
})

const result = computed(() => scoreState.value.result)
const error = computed(() => scoreState.value.error)
const notice = computed(() => scoreState.value.notice)

const resultHeading = computed(() => {
  if (error.value) return 'Check the hand'
  const r = result.value
  if (!r) return 'Score'
  return r.handName ? HAND_NAMES[r.handName] : `${r.totalHan} han · ${r.fu} fu`
})

const scoreDisplay = computed(() => {
  const r = result.value
  if (!r) return ''
  const pts = r.points
  if (winType.value === 'tsumo' && pts.tsumo) {
    if (seatWind.value === 'east') {
      return `${formatPoints(pts.tsumo.dealerPays)} from each`
    }
    return `${formatPoints(pts.tsumo.dealerPays + pts.tsumo.nonDealerPays * (threePlayer.value ? 1 : 2))} total`
  }
  return pts.ron ? `${formatPoints(pts.ron)} points` : ''
})

const tsumoOthersLabel = computed(() =>
  threePlayer.value ? 'Each other pays' : 'Each non-dealer pays',
)

function formatPoints(n: number): string {
  return n.toLocaleString('en-US')
}

function yakuName(name: string): string {
  return YAKU_EN[name] ?? name
}
</script>

<style scoped>
.calc-page {
  width: min(100% - 24px, 1060px);
  padding: 0 0 36px;
}

.calc-hero {
  width: 100%;
  padding: clamp(44px, 8vw, 78px) 16px 34px;
  text-align: center;
}

.calc-kicker,
.section-kicker {
  margin: 0 0 10px;
  color: var(--gold-leaf);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 2.1px;
  text-transform: uppercase;
}

.calc-intro {
  max-width: 590px;
  margin: 18px auto 0;
  font-size: clamp(0.9rem, 2vw, 1rem);
  line-height: 1.75;
  opacity: 0.78;
}

.content-card {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 24px;
  padding: clamp(18px, 4.5vw, 40px);
  border: 1px solid rgba(185, 139, 104, 0.18);
  border-radius: 28px;
  background: rgba(255, 253, 249, 0.92);
  box-shadow: 0 18px 48px rgba(74, 68, 61, 0.09);
}

.input-card {
  background:
    radial-gradient(circle at 92% 8%, rgba(212, 206, 223, 0.5), transparent 32%),
    linear-gradient(145deg, rgba(255, 253, 249, 0.98), rgba(246, 236, 231, 0.92));
}

.section-heading {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 16px;
}

.section-heading h2 {
  margin: 12px 0 7px;
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.5rem, 4vw, 2.1rem);
  font-style: italic;
  font-weight: 400;
}

.sanma-note {
  margin: 0;
  color: var(--gold-leaf);
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.5;
}

.sanma-pill {
  display: inline-block;
  margin-left: 8px;
  padding: 3px 8px;
  color: #fff;
  font-size: 0.56rem;
  letter-spacing: 1px;
  border-radius: 999px;
  background: var(--gold-leaf);
  vertical-align: middle;
}

.sanma-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  color: var(--matcha-leaf);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid rgba(101, 119, 99, 0.14);
  border-radius: 999px;
  background: rgba(255, 253, 249, 0.72);
  cursor: pointer;
  min-height: 44px;
}

.capture-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 20px;
}

.capture-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.new-hand-btn {
  padding: 11px 18px;
  color: var(--clay-text);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid rgba(185, 139, 104, 0.4);
  border-radius: 999px;
  background: rgba(255, 253, 249, 0.85);
  cursor: pointer;
  min-height: 44px;
}

.new-hand-btn:hover {
  border-color: var(--gold-leaf);
  color: var(--gold-leaf);
}

.warmup-note {
  font-size: 0.72rem;
  opacity: 0.6;
}

.warmup-note.failed {
  color: #8a3b3b;
  opacity: 0.85;
}

.warmup-note.ready {
  color: var(--matcha-leaf);
  opacity: 0.85;
}

.detect-error {
  margin: 10px 0 0;
  padding: 10px 14px;
  color: #8a3b3b;
  font-size: 0.8rem;
  line-height: 1.5;
  border-radius: 12px;
  background: rgba(178, 58, 72, 0.08);
}

.picker-row {
  display: grid;
  grid-template-columns: 44px 1fr;
  align-items: center;
  gap: 8px;
}

.picker-row-label {
  color: var(--clay-text);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.6;
}

.picker-row-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.picker-tile {
  padding: 3px;
  border: 1px solid rgba(101, 119, 99, 0.18);
  border-radius: 9px;
  background: rgba(255, 253, 249, 0.95);
  cursor: pointer;
  line-height: 0;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.picker-tile:hover {
  transform: translateY(-2px);
  border-color: var(--gold-leaf);
}

.picker-tile:active {
  transform: scale(0.95);
}

.picker-tile img {
  width: 36px;
  height: 50px;
  display: block;
}

.picker-hint {
  margin: 8px 2px 0;
  font-size: 0.7rem;
  opacity: 0.55;
}

.tile-picker {
  display: grid;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(101, 119, 99, 0.06);
}

.picker-target-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.picker-mode-label {
  color: var(--clay-text);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  opacity: 0.75;
}

.picker-target-line strong {
  letter-spacing: 0;
  text-transform: none;
  opacity: 1;
}

.picker-collapse {
  padding: 4px 10px;
  color: var(--clay-text);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  border: 1px solid rgba(101, 119, 99, 0.16);
  border-radius: 999px;
  background: rgba(255, 253, 249, 0.8);
  cursor: pointer;
  min-height: 30px;
}

.picker-collapse:hover {
  border-color: var(--gold-leaf);
  color: var(--gold-leaf);
}

.picked-rows {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.picked-row {
  display: grid;
  grid-template-columns: 130px 1fr;
  align-items: start;
  gap: 12px;
}

.row-label {
  padding-top: 8px;
  color: var(--clay-text);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  opacity: 0.7;
}

.row-label em {
  font-style: normal;
  opacity: 0.55;
}

.row-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 40px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(101, 119, 99, 0.05);
}

.tile-btn {
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  transition: transform 0.12s ease;
}

.tile-btn:hover {
  transform: translateY(-2px);
}

.row-empty {
  align-self: center;
  font-size: 0.75rem;
  opacity: 0.45;
}

.row-add {
  align-self: center;
  width: 34px;
  height: 34px;
  padding: 0;
  color: var(--matcha-leaf);
  font: inherit;
  font-size: 1.15rem;
  line-height: 1;
  border: 1px dashed rgba(101, 119, 99, 0.35);
  border-radius: 9px;
  background: rgba(255, 253, 249, 0.85);
  cursor: pointer;
  transition: border-color 0.12s ease, transform 0.12s ease;
}

.row-add:hover {
  border-color: var(--gold-leaf);
  transform: translateY(-2px);
}

.input-note {
  margin: 10px 2px 0;
  color: var(--clay-text);
  font-size: 0.78rem;
  line-height: 1.5;
  opacity: 0.75;
}

.input-note.problem {
  color: #8a3b3b;
  opacity: 0.9;
}

.meld-group {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.meld-group small {
  font-size: 0.6rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  opacity: 0.55;
}

.meld-remove {
  display: inline-flex;
  gap: 1px;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 20px;
  margin-top: 22px;
}

.field-wide {
  grid-column: 1 / -1;
}

.field label,
.field-label {
  display: block;
  margin-bottom: 6px;
  color: var(--clay-text);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  opacity: 0.75;
}

.field input,
.field textarea,
.field select {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 14px;
  color: var(--clay-text);
  font: inherit;
  font-size: 0.9rem;
  border: 1px solid rgba(101, 119, 99, 0.2);
  border-radius: 14px;
  outline: none;
  background: rgba(255, 253, 249, 0.85);
  resize: vertical;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  border-color: var(--gold-leaf);
}

.field-hint {
  margin: 6px 0 0;
  font-size: 0.72rem;
  line-height: 1.5;
  opacity: 0.6;
}

.field-hint code {
  padding: 1px 5px;
  border-radius: 6px;
  background: rgba(101, 119, 99, 0.1);
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: 22px;
}

.segmented-control {
  display: flex;
  min-height: 45px;
  border: 1px solid rgba(101, 119, 99, 0.2);
  border-radius: 14px;
  background: rgba(255, 253, 249, 0.85);
  overflow: hidden;
}

.segmented-control button {
  flex: 1;
  padding: 11px 12px;
  color: var(--clay-text);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.segmented-control button + button {
  border-left: 1px solid rgba(101, 119, 99, 0.14);
}

.segmented-control button.active {
  color: #fff;
  background: var(--matcha-leaf);
}

.flag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.flag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  color: var(--clay-text);
  font-size: 0.74rem;
  border: 1px solid rgba(101, 119, 99, 0.14);
  border-radius: 999px;
  background: rgba(255, 253, 249, 0.72);
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.15s ease, border-color 0.15s ease;
}

.flag.active {
  border-color: var(--matcha-leaf);
  background: rgba(101, 119, 99, 0.1);
  font-weight: 700;
}

.flag.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.flag input {
  accent-color: var(--matcha-leaf);
}

.flag-hint {
  margin: 8px 2px 0;
  font-size: 0.72rem;
  color: #8a3b3b;
  opacity: 0.8;
}

.result-error {
  margin: 14px 0 0;
  padding: 12px 16px;
  color: #8a3b3b;
  font-size: 0.88rem;
  line-height: 1.6;
  border-radius: 14px;
  background: rgba(178, 58, 72, 0.08);
}

.result-notice {
  margin: 14px 0 0;
  padding: 12px 16px;
  color: var(--clay-text);
  font-size: 0.88rem;
  line-height: 1.6;
  border-radius: 14px;
  background: rgba(101, 119, 99, 0.07);
}

.result-empty {
  margin: 14px 0 0;
  font-size: 0.88rem;
  opacity: 0.6;
}

.score-banner {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 18px;
  margin-top: 18px;
  padding: 20px 22px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 88% 20%, rgba(212, 206, 223, 0.45), transparent 40%),
    linear-gradient(145deg, rgba(255, 253, 249, 0.98), rgba(246, 236, 231, 0.9));
  box-shadow: inset 0 3px 0 var(--gold-leaf);
}

.score-label {
  display: block;
  margin-bottom: 4px;
  color: var(--gold-leaf);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
}

.score-main strong {
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 400;
}

.honba-note {
  display: block;
  margin-top: 4px;
  font-size: 0.7rem;
  opacity: 0.55;
}

.score-split {
  display: flex;
  gap: 18px;
}

.score-split span {
  display: block;
  margin-bottom: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  opacity: 0.6;
}

.score-split strong {
  color: var(--clay-text);
  font-size: 1.05rem;
}

.result-columns {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 24px;
  margin-top: 24px;
}

.result-block h3 {
  margin: 0 0 10px;
  color: var(--clay-text);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  opacity: 0.7;
}

.yaku-list,
.fu-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.yaku-list li,
.fu-list li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 9px 2px;
  border-bottom: 1px dashed rgba(101, 119, 99, 0.16);
  font-size: 0.85rem;
}

.yaku-list li:last-child,
.fu-list li:last-child {
  border-bottom: 0;
}

.yaku-ja {
  min-width: 4.2em;
  color: var(--gold-leaf);
  font-weight: 700;
}

.yaku-en {
  flex: 1;
}

.fu-list span {
  flex: 1;
}

.rules-list {
  margin: 14px 0 0;
  padding: 0 0 0 18px;
  font-size: 0.86rem;
  line-height: 1.9;
  opacity: 0.8;
}

@media (max-width: 760px) {
  .capture-buttons {
    width: 100%;
  }

  .capture-buttons > * {
    flex: 1 1 45%;
  }

  .field-grid,
  .result-columns,
  .score-banner {
    grid-template-columns: 1fr;
  }

  .option-grid {
    grid-template-columns: 1fr 1fr;
  }

  .score-split {
    justify-content: flex-start;
  }

  .section-heading {
    grid-template-columns: 1fr;
  }

  .picked-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .row-label {
    padding-top: 0;
  }

  .picker-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .picker-row-label {
    padding-top: 2px;
  }

  .picker-tile img {
    width: 40px;
    height: 56px;
  }
}

@media (max-width: 390px) {
  .picker-tile img {
    width: 34px;
    height: 48px;
  }
}
</style>
