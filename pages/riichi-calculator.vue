<template>
  <main class="calc-page" :class="{ 'has-mobile-score': !!result }">
    <header class="calc-hero fade-up">
      <h1 class="hero-title">Riichi Calculator</h1>
      <p class="calc-intro">
        Scan a photo or tap the tiles below to build your complete hand, then tap the tile you
        won on. Add any calls and dora indicators, choose Ron or Tsumo, and set the winds and
        win conditions — your score updates automatically.
      </p>
    </header>

    <section class="content-card input-card fade-up" aria-labelledby="input-heading">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Hand input</p>
          <h2 id="input-heading">The winning hand</h2>
          <p v-if="threePlayer" class="sanma-note">3-player table — 2–8 man out of play, two red fives, two payers on tsumo</p>
        </div>
      </div>

      <button type="button" class="new-hand-btn wizard-new-hand" @click="clearHand">＋ New hand</button>
      <nav class="wizard-progress" aria-label="Calculator steps">
        <span v-for="step in wizardSteps" :key="step.number" class="wizard-step" :class="{ active: wizardStep === step.number, complete: wizardStep > step.number }">
          <span>{{ step.number }}</span>{{ step.label }}
        </span>
      </nav>
      <div v-if="wizardStep === 1" class="table-format-picker">
        <p class="result-notice">Choose the table type, then continue to enter every physical tile — including tiles in called melds.</p>
        <div class="field">
          <span class="field-label">Table format</span>
          <div class="segmented-control" role="radiogroup" aria-label="Table format">
            <button type="button" role="radio" :class="{ active: !threePlayer }" :aria-checked="!threePlayer" @click="threePlayer = false">Yonma · 4 players</button>
            <button type="button" role="radio" :class="{ active: threePlayer }" :aria-checked="threePlayer" @click="threePlayer = true">Sanma · 3 players</button>
          </div>
        </div>
      </div>

      <div v-show="wizardStep === 2" class="capture-row">
        <div class="capture-buttons">
          <TileCaptureMenu
            :busy="detectingHand || detectingDora"
            @capture="scanHand"
            @camera="guidedOpen = true"
          />
        </div>
        <span v-if="warmupNote" class="warmup-note" :class="scanStatus">
          {{ warmupNote }}
        </span>
      </div>
      <p v-if="detectError" class="detect-error">{{ detectError }}</p>
      <p v-else-if="scanFeedback" class="scan-feedback">{{ scanFeedback }}</p>

      <div class="picked-rows">
        <div v-show="wizardStep === 2 || wizardStep === 4" class="picked-row hand-row" :class="{ 'needs-winner': handNeedsWinner, ready: handReady }">
          <span class="row-label">Hand <em>{{ handProgress }}</em></span>
          <div class="row-tiles">
            <span
              v-for="(tile, i) in handTiles"
              :key="`hand-${i}-${tileToText(tile)}`"
              class="hand-tile"
              :class="{ 'winning-tile-btn': winningTileIndex === i }"
            >
              <button
                type="button"
                class="tile-btn"
                :disabled="wizardStep !== 2"
                :title="wizardStep === 2 ? (winningTileIndex === i ? 'Winning tile — tap to unmark' : 'Tap to mark as winning tile') : 'Edit the hand in Step 2'"
                @click="toggleWinningTile(i)"
              >
                <TileImage :tile="tile" />
              </button>
              <i v-if="winningTileIndex === i" class="win-mark" aria-hidden="true">勝</i>
              <button
                v-if="wizardStep === 2"
                type="button"
                class="tile-remove"
                :title="`Remove ${tileToText(tile)}`"
                :aria-label="`Remove ${tileToText(tile)}`"
                @click.stop="removeHandTile(i)"
              >×</button>
            </span>
            <button
              v-if="wizardStep === 2"
              type="button"
              class="row-add"
              title="Add hand tiles"
              aria-label="Add tiles to hand"
              @click="aimPicker('hand')"
            >
              ＋
            </button>
            <span v-if="handTiles.length === 0" class="row-empty">No tiles yet — add tiles below</span>
          </div>
          <p v-if="handNeedsWinner" class="hand-guidance">Hand complete — tap the tile you won on.</p>
          <p v-else-if="handReady" class="hand-guidance ready">Ready to score.</p>
        </div>

        <div v-show="wizardStep === 2" class="picked-row">
          <span class="row-label">Dora indicators</span>
          <div class="row-tiles">
            <span
              v-for="(tile, i) in doraTiles"
              :key="`dora-${i}-${tileToText(tile)}`"
              class="hand-tile"
            >
              <button
                type="button"
                class="tile-btn"
                :title="`Remove ${tileToText(tile)}`"
                @click="removeDoraTile(i)"
              >
                <TileImage :tile="tile" />
              </button>
              <button
                type="button"
                class="tile-remove"
                :title="`Remove ${tileToText(tile)}`"
                :aria-label="`Remove dora indicator ${tileToText(tile)}`"
                @click.stop="removeDoraTile(i)"
              >×</button>
            </span>
            <button type="button" class="row-add" title="Add dora indicators" aria-label="Add dora indicators" @click="aimPicker('dora')">
              ＋
            </button>
            <span v-if="doraTiles.length === 0" class="row-empty">None</span>
          </div>
          <p class="dora-guidance">{{ doraInputGuidance }}</p>
        </div>

        <div v-show="wizardStep === 3" class="picked-row">
          <span class="row-label">Calls</span>
          <MeldBuilder
            :hand-tiles="handTiles"
            :melds="parsedMelds"
            :three-player="threePlayer"
            @update:hand-tiles="updateMeldHandTiles"
            @update:melds="updateMelds"
          />
        </div>

        <div v-show="wizardStep === 4" class="picked-row">
          <span class="row-label">Called tiles</span>
          <div class="row-tiles">
            <span v-for="(meld, meldIndex) in parsedMelds" :key="`called-${meldIndex}`" class="called-meld">
              <span v-for="(tile, tileIndex) in meld.tiles" :key="`called-${meldIndex}-${tileIndex}-${tileToText(tile)}`" class="hand-tile">
                <TileImage :tile="tile" />
              </span>
            </span>
            <span v-if="parsedMelds.length === 0" class="row-empty">None</span>
          </div>
        </div>
      </div>
      <p v-if="inputNote" class="input-note" :class="{ problem: inputNoteProblem }">{{ inputNote }}</p>

      <button
        v-if="wizardStep === 2 && !pickerExpanded && handTiles.length >= handTarget"
        id="tile-picker-summary"
        type="button"
        class="picker-collapsed"
        @click="aimPicker('hand')"
      >
        <span>Tile picker hidden</span>
        <strong>Edit tiles</strong>
      </button>

      <div v-show="wizardStep === 2" v-if="!(!pickerExpanded && handTiles.length >= handTarget)" id="tile-picker" class="tile-picker" aria-label="Tile picker">
        <p class="picker-mode-label">
          Adding to
          <button v-if="wizardStep === 2" type="button" class="picker-mode-switch" @click="aimPicker('hand')" :aria-pressed="pickerMode === 'hand'">Hand</button>
          <span v-if="wizardStep === 2" aria-hidden="true">/</span>
          <button type="button" class="picker-mode-switch" @click="aimPicker('dora')" :aria-pressed="pickerMode === 'dora'">Dora</button>
          <button v-if="handTiles.length >= handTarget" type="button" class="picker-done" @click="pickerExpanded = false">Done</button>
        </p>
        <p v-if="pickerBlockedNote" class="picker-blocked-note">{{ pickerBlockedNote }}</p>
        <div v-for="row in pickerRows" :key="row.label" class="picker-row">
          <span class="picker-row-label">{{ row.label }}</span>
          <div class="picker-row-tiles">
            <button
              v-for="code in row.codes"
              :key="code"
              type="button"
              class="picker-tile"
              :class="{ disabled: !!blockedReasons[code] }"
              :disabled="!!blockedReasons[code]"
              :title="pickerTileTitle(code)"
              :aria-disabled="!!blockedReasons[code]"
                @click="appendTile(code)"
            >
              <img :src="tileSrcByCode[code]" :alt="code" loading="lazy" decoding="async" draggable="false" />
            </button>
          </div>
        </div>
      </div>

      <div v-show="wizardStep === 4" class="option-grid">
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
        <div class="field seat-wind-field">
          <span class="field-label">Seat wind</span>
          <div class="segmented-control" role="radiogroup" aria-label="Seat wind">
            <button
              v-for="option in seatWindOptions"
              :key="option.value"
              type="button"
              role="radio"
              :class="{ active: seatWind === option.value }"
              :aria-checked="seatWind === option.value"
              @click="seatWind = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="field">
          <span class="field-label">Round wind</span>
          <div class="segmented-control" role="radiogroup" aria-label="Round wind">
            <button
              v-for="option in roundWindOptions"
              :key="option.value"
              type="button"
              role="radio"
              :class="{ active: roundWind === option.value }"
              :aria-checked="roundWind === option.value"
              @click="roundWind = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="field">
          <label for="honba">Honba</label>
          <input id="honba" v-model.number="honba" type="number" min="0" max="20" inputmode="numeric" />
        </div>
        <div v-if="threePlayer" class="field">
          <label for="nuki-dora">Nuki dora (North)</label>
          <input id="nuki-dora" v-model.number="nukiDoraCount" type="number" min="0" max="4" step="1" inputmode="numeric" />
        </div>
        <label v-if="paoEligible" class="flag active">
          <input v-model="paoResponsible" type="checkbox" />
          Responsibility payment (Pao)
        </label>
        <div v-if="paoResponsible" class="field">
          <label for="pao-responsible-seat">Responsible player</label>
          <select id="pao-responsible-seat" v-model="paoResponsibleSeat">
            <option v-for="seat in paoSeatOptions" :key="seat" :value="seat">{{ windLabel(seat) }}</option>
          </select>
        </div>
        <div v-if="paoResponsible && winType === 'ron'" class="field">
          <label for="ron-discarder-seat">Discarding player</label>
          <select id="ron-discarder-seat" v-model="ronDiscarderSeat">
            <option v-for="seat in discarderSeatOptions" :key="seat" :value="seat">{{ windLabel(seat) }}</option>
          </select>
        </div>
      </div>

      <div v-show="wizardStep === 4" class="condition-panel">
        <div class="field declaration-field">
          <span class="field-label">Declaration</span>
          <div class="segmented-control declaration-control" role="radiogroup" aria-label="Riichi declaration">
            <button
              v-for="option in declarationOptions"
              :key="option.value"
              type="button"
              role="radio"
              :class="{ active: riichiDeclaration === option.value }"
              :aria-checked="riichiDeclaration === option.value"
              :disabled="!!declarationDisabledReason(option.value)"
              :title="declarationDisabledReason(option.value) ?? ''"
              @click="riichiDeclaration = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <label
          class="flag"
          :class="{ disabled: !!flagDisabledReasons.ippatsu, active: flags.ippatsu }"
          :title="flagDisabledReasons.ippatsu ?? ''"
        >
          <input v-model="flags.ippatsu" type="checkbox" :disabled="!!flagDisabledReasons.ippatsu" />
          Ippatsu
        </label>

        <button
          type="button"
          class="special-toggle"
          :aria-expanded="specialOpen"
          @click="specialOpen = !specialOpen"
        >
          Special win
          <span v-if="activeSpecialCount">{{ activeSpecialCount }} selected</span>
          <span aria-hidden="true">{{ specialOpen ? '−' : '+' }}</span>
        </button>

        <div v-if="specialOpen" class="flag-grid special-flags">
          <label
            v-for="flag in specialFlags"
            :key="flag.key"
            class="flag"
            :class="{ disabled: !!flagDisabledReasons[flag.key], active: flags[flag.key] }"
            :title="flagDisabledReasons[flag.key] ?? ''"
          >
            <input v-model="flags[flag.key]" type="checkbox" :disabled="!!flagDisabledReasons[flag.key]" />
            {{ flag.label }}
          </label>
        </div>
      </div>
      <p v-if="wizardStep === 4 && activeFlagHint" class="flag-hint">{{ activeFlagHint }}</p>
      <div class="wizard-actions">
        <button v-if="wizardStep > 1" type="button" class="wizard-back" @click="previousWizard">← Back</button>
        <button v-if="wizardStep < 4" type="button" class="new-hand-btn" :disabled="!canAdvanceWizard" @click="advanceWizard">Continue</button>
        <button v-else type="button" class="new-hand-btn" :disabled="!handReady" @click="scrollToResult">View score</button>
      </div>
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
          <div v-if="result.points.tsumo && !result.points.responsiblePays" class="score-split">
            <div>
              <span>Dealer pays</span>
              <strong>{{ formatPoints(result.points.tsumo.dealerPays) }}</strong>
            </div>
            <div>
              <span>{{ tsumoOthersLabel }}</span>
              <strong>{{ formatPoints(result.points.tsumo.nonDealerPays) }}</strong>
            </div>
          </div>
          <p v-if="result.points.responsiblePays && !result.points.discarderPays" class="honba-note">Responsible player pays {{ formatPoints(result.points.responsiblePays) }} (pao)</p>
          <p v-else-if="result.points.responsiblePays && result.points.discarderPays" class="honba-note">
            Pao split — responsible ({{ windLabel(paoResponsibleSeat ?? seatWind) }}) pays {{ formatPoints(result.points.responsiblePays) }},
            discarder ({{ windLabel(ronDiscarderSeat ?? seatWind) }}) pays {{ formatPoints(result.points.discarderPays) }}
          </p>
        </div>

        <div class="result-columns">
          <div class="result-block">
            <h3>Yaku ({{ result.totalHan }} han)</h3>
            <ul class="yaku-list">
              <li v-for="(yaku, index) in result.yaku" :key="`${yaku.name}-${yaku.detail ?? index}`">
                <span class="yaku-ja">{{ yakuRomaji(yaku.name) }}</span>
                <span class="yaku-en">{{ yaku.name === 'yakuhai' ? yaku.detail : yakuName(yaku.name, yaku.detail) }}</span>
                <strong>{{ yaku.isYakuman ? 'yakuman' : `${yaku.han} han` }}</strong>
              </li>
              <li v-if="result.doraCount > 0">
                <span class="yaku-ja">Dora</span>
                <span class="yaku-en">Dora</span>
                <strong>{{ result.doraCount }}</strong>
              </li>
              <li v-if="result.uraDoraCount > 0">
                <span class="yaku-ja">Ura dora</span>
                <span class="yaku-en">Ura dora</span>
                <strong>{{ result.uraDoraCount }}</strong>
              </li>
              <li v-if="result.akaDoraCount > 0">
                <span class="yaku-ja">Aka dora</span>
                <span class="yaku-en">Aka dora</span>
                <strong>{{ result.akaDoraCount }}</strong>
              </li>
              <li v-if="result.nukiDoraCount > 0">
                <span class="yaku-ja">Nuki dora</span>
                <span class="yaku-en">Nuki dora</span>
                <strong>{{ result.nukiDoraCount }}</strong>
              </li>
            </ul>
          </div>

          <div class="result-block">
            <h3>Fu ({{ result.fu }} total)</h3>
            <ul class="fu-list">
              <li v-if="result.fuBreakdown.base"><span>Base</span><strong>{{ result.fuBreakdown.base }}</strong></li>
              <li v-if="result.fuBreakdown.pairFu"><span>Pair</span><strong>{{ result.fuBreakdown.pairFu }}</strong></li>
              <li v-if="result.fuBreakdown.meldFu"><span>Sets / calls</span><strong>{{ result.fuBreakdown.meldFu }}</strong></li>
              <li v-if="result.fuBreakdown.waitFu"><span>Wait</span><strong>{{ result.fuBreakdown.waitFu }}</strong></li>
              <li v-if="result.fuBreakdown.tsumoFu"><span>Tsumo</span><strong>{{ result.fuBreakdown.tsumoFu }}</strong></li>
            </ul>
          </div>
        </div>
      </template>

      <p v-else class="result-empty">Complete the hand (14 tiles, winner marked) to see the score.</p>
    </section>

    <button v-if="result" type="button" class="mobile-score-bar" @click="scrollToResult">
      <span>
        <small>{{ resultHeading }}</small>
        <strong>{{ scoreDisplay }}</strong>
      </span>
      <span>View score ↑</span>
    </button>

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
        <li>Three-player tables use 1m and 9m only in the manzu suit — 2–8 man are out of play, and up to four declared North tiles count as nuki dora.</li>
        <li>Kiriage mangan is off — mangan requires 5 han (or 4 han 40+ fu, 3 han 70+ fu).</li>
        <li>13+ han from ordinary yaku counts as a counted yakuman.</li>
        <li>Honba pay 300 all around on ron, 100 per paying player on tsumo.</li>
        <li>Double wind pairs score 4 fu.</li>
      </ul>
    </section>

    <Teleport to="body">
      <GuidedTileCapture
        v-if="guidedOpen"
        @capture="scanCameraCapture"
        @close="guidedOpen = false"
      />
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import type { Hand, Meld, Tile, WindValue } from '~/utils/scoring/types'
import { score } from '~/utils/scoring'
import { sortTiles, isAkaDora } from '~/utils/scoring/tiles'
import { validateTileSet } from '~/utils/scoring/tile-set'
import { combinedDoraIndicatorCount, doraIndicatorRowCount, splitCombinedDoraIndicators } from '~/utils/scoring/dora-indicators'
import { tileSrc } from '~/utils/tile-image'

type FlagKey = 'riichi' | 'doubleRiichi' | 'ippatsu' | 'haitei' | 'houtei' | 'rinshan' | 'chankan'
type CameraSectionKey = 'hand' | 'winning' | 'dora'
type CameraSectionBox = { x: number; y: number; w: number; h: number }
interface CameraCaptureData {
  image: string
  sections: Partial<Record<CameraSectionKey, CameraSectionBox>>
  imageWidth: number
  imageHeight: number
}
interface CameraDetectionResult {
  mode: 'guided'
  hand: Tile[]
  winningTile: Tile | null
  dora: Tile[]
  melds: Meld[]
  error?: string
}

// ─── Core hand state ──────────────────────────────────────────────────────────
// The hand row always holds the complete closed set INCLUDING the winning tile
// (14 on an open hand, adjusted for melds/kans). The winning tile is not a
// separate tile: it is one of the hand tiles, marked by index. The scoring
// engine still wants (closedTiles, winningTile) split, computed on the fly.

const handTiles = ref<Tile[]>([])
const winningTileIndex = ref<number | null>(null)
const doraTiles = ref<Tile[]>([])
const melds = ref<Meld[]>([])
const wizardStep = ref(1)
const wizardSteps = [
  { number: 1, label: 'Table' },
  { number: 2, label: 'Tiles' },
  { number: 3, label: 'Calls' },
  { number: 4, label: 'Win & score' },
] as const

const parsedMelds = computed(() => melds.value)

const winningTile = computed<Tile | null>(() =>
  winningTileIndex.value !== null ? handTiles.value[winningTileIndex.value] ?? null : null)

/** Closed-set size including the winning tile: 14 minus 3 per meld. */
const handTarget = computed(() => 14 - 3 * parsedMelds.value.length)
const entryPhysicalReady = computed(() => handTiles.value.length >= 14 && handTiles.value.length <= 18)
const handEntryLimit = computed(() =>
  wizardStep.value === 2 && parsedMelds.value.length === 0 ? 18 : handTarget.value)

/** Hand tiles minus the winning-tile instance — what the scorer calls closedTiles. */
const closedHandTiles = computed(() =>
  winningTileIndex.value === null
    ? handTiles.value
    : handTiles.value.filter((_, i) => i !== winningTileIndex.value))

const winType = ref<'ron' | 'tsumo'>('ron')
const winTypeOptions: { label: string; value: 'ron' | 'tsumo' }[] = [
  { label: 'Ron', value: 'ron' },
  { label: 'Tsumo', value: 'tsumo' },
]
const seatWind = ref<WindValue>('south')
const roundWind = ref<WindValue>('east')
const windOptions: { label: string; value: WindValue }[] = [
  { label: 'East', value: 'east' },
  { label: 'South', value: 'south' },
  { label: 'West', value: 'west' },
  { label: 'North', value: 'north' },
]
// Three-player tables have no North seat; the round is always East or South.
const seatWindOptions = computed(() =>
  threePlayer.value ? windOptions.filter((w) => w.value !== 'north') : windOptions)
const roundWindOptions = windOptions.filter((w) => w.value === 'east' || w.value === 'south')
const honba = ref(0)
const threePlayer = ref(false)
const nukiDoraCount = ref(0)
const paoResponsible = ref(false)
// Pao liability needs the actual seats so a pao ron can be split between the
// responsible player and the discarder when they differ.
const paoResponsibleSeat = ref<WindValue | null>(null)
const ronDiscarderSeat = ref<WindValue | null>(null)
const flags = reactive<Record<FlagKey, boolean>>({
  riichi: false,
  doubleRiichi: false,
  ippatsu: false,
  haitei: false,
  houtei: false,
  rinshan: false,
  chankan: false,
})

const specialFlags: { key: FlagKey; label: string }[] = [
  { key: 'haitei', label: 'Haitei (win on last draw)' },
  { key: 'houtei', label: 'Houtei (win on last discard)' },
  { key: 'rinshan', label: 'Rinshan (after kan)' },
  { key: 'chankan', label: 'Chankan (rob a kan)' },
]

type RiichiDeclaration = 'none' | 'riichi' | 'doubleRiichi'
const declarationOptions: { label: string; value: RiichiDeclaration }[] = [
  { label: 'None', value: 'none' },
  { label: 'Riichi', value: 'riichi' },
  { label: 'Double', value: 'doubleRiichi' },
]

const riichiDeclaration = computed<RiichiDeclaration>({
  get: () => flags.doubleRiichi ? 'doubleRiichi' : flags.riichi ? 'riichi' : 'none',
  set: (value) => {
    flags.riichi = value === 'riichi'
    flags.doubleRiichi = value === 'doubleRiichi'
  },
})
// ─── Session persistence ──────────────────────────────────────────────────────
// The whole sheet survives a refresh or a phone lock mid-game. Tiles are plain
// { suit, value, isAka? } objects and serialize to JSON directly.

const STORAGE_KEY = 'riichi-calculator-sheet-v3'

interface StoredSheet {
  hand: Tile[]
  winIndex: number | null
  dora: Tile[]
  uraDora?: Tile[]
  melds: Meld[]
  winType: 'ron' | 'tsumo'
  seatWind: WindValue
  roundWind: WindValue
  honba: number
  threePlayer: boolean
  nukiDoraCount?: number
  paoResponsible?: boolean
  paoResponsibleSeat?: WindValue | null
  ronDiscarderSeat?: WindValue | null
  flags: Record<FlagKey, boolean>
}

function saveSheet() {
  if (import.meta.server) return
  const sheet: StoredSheet = {
    hand: handTiles.value,
    winIndex: winningTileIndex.value,
    dora: doraTiles.value,
    melds: melds.value,
    winType: winType.value,
    seatWind: seatWind.value,
    roundWind: roundWind.value,
    honba: honba.value,
    threePlayer: threePlayer.value,
    nukiDoraCount: nukiDoraCount.value,
    paoResponsible: paoResponsible.value,
    paoResponsibleSeat: paoResponsibleSeat.value,
    ronDiscarderSeat: ronDiscarderSeat.value,
    flags: { ...flags },
  }
  try {
    if (handTiles.value.length || melds.value.length || doraTiles.value.length) {
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
    handTiles.value = Array.isArray(sheet.hand) ? sortTiles(sheet.hand) : []
    // The winner is one of the restored hand tiles; the stored index points at
    // the sorted hand as saved. Re-locate it by identity after re-sorting.
    const restoredWinner = sheet.winIndex !== null && sheet.hand
      ? sheet.hand[sheet.winIndex] ?? null
      : null
    winningTileIndex.value = restoredWinner
      ? handTiles.value.findIndex((t) => tilesEqualValue(t, restoredWinner) && isAkaDora(t) === isAkaDora(restoredWinner))
      : null
    if (winningTileIndex.value === -1) winningTileIndex.value = null
    // Older saved hands kept ura-dora separately. Merge it into the unified
    // Dora list so existing hands continue to score with every indicator.
    doraTiles.value = [
      ...(Array.isArray(sheet.dora) ? sheet.dora : []),
      ...(Array.isArray(sheet.uraDora) ? sheet.uraDora : []),
    ].slice(0, MAX_DORA_INDICATORS)
    melds.value = Array.isArray(sheet.melds) ? sheet.melds : []
    winType.value = sheet.winType === 'tsumo' ? 'tsumo' : 'ron'
    seatWind.value = sheet.seatWind ?? 'south'
    roundWind.value = sheet.roundWind ?? 'east'
    honba.value = Number(sheet.honba) || 0
    threePlayer.value = !!sheet.threePlayer
    nukiDoraCount.value = clampNukiDora(sheet.nukiDoraCount)
    paoResponsible.value = !!sheet.paoResponsible
    paoResponsibleSeat.value = sheet.paoResponsibleSeat ?? null
    ronDiscarderSeat.value = sheet.ronDiscarderSeat ?? null
    if (sheet.flags) {
      for (const key of Object.keys(flags) as FlagKey[]) flags[key] = !!sheet.flags[key]
      if (flags.doubleRiichi) flags.riichi = false
    }
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
  const numText = match[1]
  const suitChar = match[2]
  if (numText === undefined || suitChar === undefined) return null
  const num = Number(numText)
  const suit = SUIT_MAP[suitChar]
  if (suit === 'honor') {
    const honorValue = num >= 1 && num <= HONOR_VALUES.length ? HONOR_VALUES[num - 1] : undefined
    return honorValue ? { suit, value: honorValue } : null
  }
  if (!suit) return null
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

function windLabel(w: WindValue): string {
  return w.charAt(0).toUpperCase() + w.slice(1)
}

// ─── Tile picker ──────────────────────────────────────────────────────────────
// One shared picker sits directly under the hand; the dora row's ＋ switches
// it to indicator mode. No collapse/mode chrome — it's always visible.

type PickerMode = 'hand' | 'dora'
const pickerMode = ref<PickerMode>('hand')

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

// Resolved once per pickerRows change instead of per tile per render.
const tileSrcByCode = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const row of pickerRows.value) {
    for (const code of row.codes) {
      const tile = parseTile(code)
      map[code] = tile ? tileSrc(tile) : ''
    }
  }
  return map
})

function toggleWinningTile(index: number) {
  setWinningTile(winningTileIndex.value === index ? null : index)
}

async function aimPicker(mode: PickerMode) {
  pickerMode.value = mode
  pickerExpanded.value = true
  await nextTick()
  document.getElementById('tile-picker')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// ─── Picker validation ────────────────────────────────────────────────────────
// Only physical-set rules are enforced: each face exists 4× in a set, fives of
// a suit share one pool (3 ordinary + 1 red), dora indicators consume real
// tiles too, and the hand row holds exactly the closed-set size (14 by
// default). Yaku or hand-structure rules are deliberately not picker concerns
// — the scorer reports those once the hand is complete.

const MAX_DORA_INDICATORS = 10

function countInMelds(face: Tile): number {
  return melds.value.reduce(
    (sum, meld) => sum + meld.tiles.filter((t) => t.suit === face.suit && t.value === face.value).length,
    0,
  )
}

/** Every copy of a face shares the same four-tile physical-set limit. */
function countFaceInUse(face: Tile): number {
  const sameFace = (tile: Tile) => tile.suit === face.suit && tile.value === face.value
  return handTiles.value.filter(sameFace).length
    + countInMelds(face)
    + doraTiles.value.filter(sameFace).length
}

function blockedReasonFor(code: string): string | null {
  const tile = parseTile(code)
  if (!tile) return null

  // Dora indicators are real tiles taken from the wall: a face can appear at
  // most 4 times across hand + winning tile + melds + dora combined.
  if (pickerMode.value === 'dora') {
    if (doraTiles.value.length >= MAX_DORA_INDICATORS) {
      return `Dora indicator limit reached (${MAX_DORA_INDICATORS})`
    }
    const used = countFaceInUse(tile)
    if (used >= 4) {
      return `All four ${code} are already in use (hand, calls and dora count together)`
    }
    return null
  }

  // Hand mode uses the same physical-set count, including every dora indicator.
  if (countFaceInUse(tile) >= 4) {
    return `All four ${code} are already in use (hand, calls and dora count together)`
  }
  if (handTiles.value.length >= handEntryLimit.value) {
    return `Hand is full (${handEntryLimit.value} tiles) — remove a tile or declare a call`
  }
  return null
}

/** Reason each picker code is currently unpickable, or null when allowed.
 * Memoizes blockedReasonFor once per state change; the template used to call
 * it four times per tile per render. */
const blockedReasons = computed<Record<string, string | null>>(() => {
  const map: Record<string, string | null> = {}
  for (const row of pickerRows.value) {
    for (const code of row.codes) map[code] = blockedReasonFor(code)
  }
  return map
})

const pickerBlockedNote = computed(() => {
  // Surface the first blocked reason so the disabled tiles explain themselves.
  for (const row of pickerRows.value) {
    for (const code of row.codes) {
      const reason = blockedReasons.value[code]
      if (reason) return reason
    }
  }
  return null
})

function pickerTileTitle(code: string): string {
  const reason = blockedReasons.value[code]
  return reason ? reason : `Add ${code} to the ${pickerMode.value === 'hand' ? 'hand' : 'dora indicators'}`
}

function appendTile(code: string) {
  if (pickerMode.value === 'hand' && wizardStep.value !== 2) return
  const reason = blockedReasonFor(code)
  if (reason) return
  const tile = parseTile(code)
  if (!tile) return
  if (pickerMode.value === 'hand') {
    const winner = winningTile.value
    handTiles.value = sortTiles([...handTiles.value, tile])
    if (winner) winningTileIndex.value = handTiles.value.indexOf(winner)
  } else {
    doraTiles.value = [...doraTiles.value, tile].slice(0, MAX_DORA_INDICATORS)
  }
}

function removeHandTile(index: number) {
  handTiles.value = handTiles.value.filter((_, i) => i !== index)
  if (winningTileIndex.value !== null) {
    if (index === winningTileIndex.value) winningTileIndex.value = null
    else if (index < winningTileIndex.value) winningTileIndex.value--
  }
}

function removeDoraTile(index: number) {
  doraTiles.value = doraTiles.value.filter((_, i) => i !== index)
}

/** Mark the hand tile at `index` as the winning tile (or clear the mark). */
function setWinningTile(index: number | null) {
  winningTileIndex.value = index
}

function updateMeldHandTiles(tiles: Tile[]) {
  // Capture the winning-tile object before re-sorting — the old index points
  // at a different tile after the sort. (If the winner itself moved into the
  // meld, the mark is cleared.)
  const winner = winningTileIndex.value !== null ? handTiles.value[winningTileIndex.value] ?? null : null
  handTiles.value = sortTiles(tiles)
  const newIndex = winner ? handTiles.value.indexOf(winner) : -1
  winningTileIndex.value = newIndex >= 0 ? newIndex : null
}

function updateMelds(nextMelds: Meld[]) {
  melds.value = nextMelds
}

// ─── Gentle progress / validation ─────────────────────────────────────────────
// While the hand is still being assembled, say what's missing instead of
// erroring. Only a *complete-looking* hand that can't score is a real error.

const handProgress = computed(() => {
  const count = handTiles.value.length
  if (wizardStep.value === 2 && parsedMelds.value.length === 0) {
    return count < 14 ? `${14 - count} tile${14 - count === 1 ? '' : 's'} to enter` : `${count} physical tiles entered`
  }
  const remaining = handTarget.value - count
  if (remaining > 0) return `${remaining} tile${remaining === 1 ? '' : 's'} remaining`
  if (remaining < 0) return `${Math.abs(remaining)} too many`
  return winningTileIndex.value === null ? 'complete · tap winner' : 'ready'
})

const handNeedsWinner = computed(() => wizardStep.value === 2
  && handTiles.value.length === handTarget.value && winningTileIndex.value === null)

const handReady = computed(() => wizardStep.value === 4
  && handTiles.value.length === handTarget.value && winningTileIndex.value !== null)

const doraInputGuidance = computed(() => {
  const omoteCount = doraIndicatorRowCount(parsedMelds.value.filter((meld) => meld.type.startsWith('kan')).length)
  const visible = `${omoteCount} omote indicator${omoteCount === 1 ? '' : 's'}`
  return (flags.riichi || flags.doubleRiichi)
    ? `Enter or scan ${visible} first, then the same number of ura indicators.`
    : `Enter or scan ${visible}. Ura indicators are revealed only after riichi.`
})

const canAdvanceWizard = computed(() =>
  wizardStep.value !== 2 || (entryPhysicalReady.value && winningTile.value !== null))

function advanceWizard() {
  if (!canAdvanceWizard.value || wizardStep.value >= 4) return
  wizardStep.value++
  if (wizardStep.value === 4) pickerMode.value = 'dora'
}

function previousWizard() {
  if (wizardStep.value > 1) wizardStep.value--
}

watch(
  () => [handTiles.value.length, handTarget.value] as const,
  ([count, target], [previousCount]) => {
    if (count < target) {
      pickerExpanded.value = true
      return
    }
    if (count === target && previousCount < target) {
      pickerExpanded.value = false
      nextTick(() => {
        document.querySelector('.hand-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  },
)

const inputNoteProblem = computed(() =>
  error.value !== null && handComplete.value)

const inputNote = computed(() => {
  // Surface the scoring error inline next to the rows only once the sheet
  // looks complete — before that the result card's progress text covers it.
  if (inputNoteProblem.value && error.value) return error.value
  return null
})

const handComplete = computed(() =>
  handTiles.value.length === handTarget.value && winningTileIndex.value !== null)

// ─── New hand ─────────────────────────────────────────────────────────────────

function clearHand() {
  handTiles.value = []
  winningTileIndex.value = null
  doraTiles.value = []
  melds.value = []
  winType.value = 'ron'
  honba.value = 0
  nukiDoraCount.value = 0
  paoResponsible.value = false
  paoResponsibleSeat.value = null
  ronDiscarderSeat.value = null
  for (const key of Object.keys(flags) as FlagKey[]) flags[key] = false
  detectError.value = null
  scanFeedback.value = null
  pickerMode.value = 'hand'
  pickerExpanded.value = true
  specialOpen.value = false
  wizardStep.value = 1
}

// ─── Smart flag validation ────────────────────────────────────────────────────

// A hand is "open" if any called meld other than a closed kan is present.
const isOpenHand = computed(() => parsedMelds.value.some((m) => m.type !== 'kan-closed'))

// Rinshan kaihou needs an actual declared kan (any kan representation).
function hasDeclaredKanMeld(melds: Meld[]): boolean {
  return melds.some((m) => m.type === 'kan-open' || m.type === 'kan-closed' || m.type === 'kan-added')
}

const flagDisabledReasons = computed<Partial<Record<FlagKey, string>>>(() => {
  const reasons: Partial<Record<FlagKey, string>> = {}
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
  if (!hasDeclaredKanMeld(parsedMelds.value)) {
    reasons.rinshan = 'Rinshan needs a declared kan'
  }
  if (winType.value !== 'ron') {
    reasons.houtei = 'Houtei is a win on the last discard (ron only)'
    reasons.chankan = 'Chankan is a ron off a kan extension'
  }
  if (flags.haitei) reasons.rinshan = 'Rinshan cannot be combined with Haitei'
  if (flags.rinshan) reasons.haitei = 'Haitei cannot be combined with Rinshan'
  if (flags.houtei) reasons.chankan = 'Chankan cannot be combined with Houtei'
  if (flags.chankan) reasons.houtei = 'Houtei cannot be combined with Chankan'
  return reasons
})

// Disable-dependent flags clear themselves when their precondition is lost
// (e.g. declaring a meld after ticking riichi).
watch(flagDisabledReasons, (reasons) => {
  for (const key of Object.keys(flags) as FlagKey[]) {
    if (flags[key] && reasons[key]) flags[key] = false
  }
})

function declarationDisabledReason(value: RiichiDeclaration): string | undefined {
  return value === 'none' ? undefined : flagDisabledReasons.value[value]
}

const activeSpecialCount = computed(() =>
  specialFlags.filter((flag) => flags[flag.key]).length)

const activeFlagHint = computed(() => {
  const displayedFlags = [{ key: 'ippatsu' as const, label: 'Ippatsu' }, ...specialFlags]
  for (const flag of displayedFlags) {
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
const scanFeedback = ref<string | null>(null)
const scanStatus = ref<'idle' | 'ready' | 'failed'>('idle')
const pickerExpanded = ref(true)
const specialOpen = ref(false)

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
  const hadSavedSheet = restoreSheet()
  restored.value = true
  if (hadSavedSheet) {
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

// Every sheet edit replaces array refs or writes flag properties, so watching
// the sources directly (reactive objects are watched deeply by default) fires
// on exactly the same changes the previous deep array-spread watcher did.
watch(
  [handTiles, winningTileIndex, doraTiles, melds, winType, seatWind, roundWind, honba, threePlayer, nukiDoraCount, paoResponsible, paoResponsibleSeat, ronDiscarderSeat, flags],
  () => {
    if (restored.value) saveSheet()
  },
)

function clampNukiDora(value: unknown): number {
  return Math.min(4, Math.max(0, Math.trunc(Number(value) || 0)))
}

watch(nukiDoraCount, (count) => {
  const clamped = clampNukiDora(count)
  if (count !== clamped) nukiDoraCount.value = clamped
})

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

async function detectOnServer(base64: string, expectedCount: number): Promise<Tile[]> {
  const data = await requestDetection({ image: base64, expectedCount })
  if (!Array.isArray(data.tiles)) {
    throw new Error('Detection service returned no tile list')
  }
  return data.tiles as Tile[]
}

function detectedHandMessage(count: number, target: number): string {
  if (count === target) return `${count} tiles detected — review the hand and winning tile below.`
  if (count < target) {
    const missing = target - count
    return `${count} of ${target} tiles detected — add ${missing} tile${missing === 1 ? '' : 's'} manually or scan again.`
  }
  const extra = count - target
  return `${count} tiles detected — remove ${extra} extra tile${extra === 1 ? '' : 's'} before scoring.`
}

async function scanHand(base64: string) {
  detectingHand.value = true
  detectError.value = null
  scanFeedback.value = null
  try {
    const tiles = await detectOnServer(base64, handTarget.value)
    if (tiles.length < 1) {
      detectError.value = 'No tiles detected. Try better lighting or a closer shot.'
      return
    }
    if (tiles.length > 20) {
      detectError.value = 'Too many tiles detected. Crop the photo to the hand, or use Camera Scan.'
      return
    }
    // A gallery photo is assumed to be a complete hand shot. Keep every tile
    // the scanner actually found and surface any shortfall for manual review;
    // never invent placeholder tiles for a missed detection.
    const winningTileScanned = tiles.at(-1) ?? null
    const target = handTarget.value
    handTiles.value = sortTiles(tiles)
    winningTileIndex.value = winningTileScanned ? handTiles.value.indexOf(winningTileScanned) : null
    scanFeedback.value = detectedHandMessage(tiles.length, target)
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

async function scanCameraCapture(capture: CameraCaptureData) {
  guidedOpen.value = false
  const scansHand = !!capture.sections.hand || !!capture.sections.winning
  const scansDora = !!capture.sections.dora
  const kanCount = parsedMelds.value.filter((meld) => meld.type.startsWith('kan')).length
  const doraCount = combinedDoraIndicatorCount(kanCount, flags.riichi || flags.doubleRiichi)
  detectingHand.value = scansHand
  detectingDora.value = scansDora
  detectError.value = null
  scanFeedback.value = null

  try {
    const data = await requestDetection({
      image: capture.image,
      sections: capture.sections,
      imageWidth: capture.imageWidth,
      imageHeight: capture.imageHeight,
      // The hand region holds the closed set minus the separate winning tile;
      // the API uses it as a count hint with one corrective retry.
      handCount: capture.sections.hand
        ? handTarget.value - (capture.sections.winning ? 1 : 0)
        : undefined,
      // The dora guide contains a known number of tiles: omote first, then
      // ura after riichi. Supplying it avoids the detector guessing from a
      // short, wide row where the count heuristic is least reliable.
      doraCount: scansDora ? doraCount : undefined,
    }) as unknown as CameraDetectionResult

    if (data.mode !== 'guided' || !Array.isArray(data.hand) || !Array.isArray(data.dora)) {
      throw new Error('Detection service returned an invalid camera-scan result')
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
    if (scansHand && (data.hand.length > 0 || data.winningTile)) {
      const scannedHand = data.winningTile && capture.sections.winning
        ? [...data.hand, data.winningTile]
        : data.hand
      handTiles.value = sortTiles(scannedHand)
      if (data.winningTile && capture.sections.winning) {
        winningTileIndex.value = handTiles.value.indexOf(data.winningTile)
      } else {
        winningTileIndex.value = null
      }
      scanFeedback.value = data.winningTile
        ? detectedHandMessage(scannedHand.length, handTarget.value)
        : 'Hand scanned, but no winning tile was detected in its region — tap the tile you won on.'
    }
    if (capture.sections.dora && data.dora.length > 0) {
      doraTiles.value = sortTiles(data.dora.slice(0, MAX_DORA_INDICATORS))
      if (!scanFeedback.value) {
        scanFeedback.value = `${doraTiles.value.length} dora indicator${doraTiles.value.length === 1 ? '' : 's'} detected — review below.`
      }
    }
    scanStatus.value = 'ready'
  } catch (err) {
    scanStatus.value = 'failed'
    detectError.value = err instanceof Error && err.message
      ? `${err.message} Please enter the tiles manually.`
      : 'Camera scan failed. Please enter the tiles manually.'
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
  yakuhai: 'Yakuhai',
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

const YAKU_ROMAJI: Record<string, string> = {
  riichi: 'Riichi', 'double-riichi': 'Daburu riichi', ippatsu: 'Ippatsu', tsumo: 'Menzen tsumo',
  pinfu: 'Pinfu', tanyao: 'Tanyao', yakuhai: 'Yakuhai', chiitoitsu: 'Chiitoitsu',
  iipeiko: 'Iipeikou', ryanpeiko: 'Ryanpeikou', 'sanshoku-doujun': 'Sanshoku doujun',
  'sanshoku-doukou': 'Sanshoku doukou', ittsu: 'Ittsu', chanta: 'Chanta', junchan: 'Junchan',
  honitsu: 'Honitsu', chinitsu: 'Chinitsu', toitoi: 'Toitoi', sanankou: 'Sanankou',
  sankantsu: 'Sankantsu', honroutou: 'Honroutou', shousangen: 'Shousangen',
  haitei: 'Haitei raoyue', houtei: 'Houtei raoyui', rinshan: 'Rinshan kaihou', chankan: 'Chankan',
  nagashi: 'Nagashi mangan', kokushi: 'Kokushi musou', daisangen: 'Daisangen',
  shousuushi: 'Shousuushii', daisuushi: 'Daisuushii', suuankou: 'Suuankou',
  tsuuiisou: 'Tsuuiisou', ryuuiisou: 'Ryuuiisou', chinroutou: 'Chinroutou',
  suukantsu: 'Suukantsu', chuurenpoutou: 'Chuuren poutou', renho: 'Renhou',
  iipinmoyue: 'Iipin moyue', chuupinraoyui: 'Chuupin raoyui', daisharin: 'Daisharin',
  daishichi: 'Daishichisei', sanrenkou: 'Sanrenkou', suurenkou: 'Suurenkou',
  uumensai: 'Uumensai', iisousanjun: 'Iisou sanjun',
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
// limits and the sanma tile-set restrictions from the league rules. The pure
// validator lives in utils/scoring/tile-set.ts so it can be regression-tested.
function validateTileSetLocal(allTiles: Tile[], nukiCount = 0): string | null {
  return validateTileSet(allTiles, {
    playerCount: threePlayer.value ? 3 : 4,
    nukiDoraCount: nukiCount,
  })
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
      notice: `Tap one of the ${handTiles.value.length || handTarget.value} hand tiles to mark the winning tile.`,
    }
  }

  const numKans = melds.filter((m) => m.type.startsWith('kan')).length
  const doraIndicators = splitCombinedDoraIndicators(
    doraTiles.value,
    numKans,
    flags.riichi || flags.doubleRiichi,
  )
  // Kans add a physical tile to their meld, so the whole hand is 14 + kans.
  const targetTotal = 14 + numKans
  const totalTiles = handTiles.value.length + melds.reduce((sum, m) => sum + m.tiles.length, 0)
  if (totalTiles !== targetTotal) {
    // Incomplete hands are progress, not errors. If the user marked the
    // winning tile but is mid-entry, nudge them back to the hand row.
    return {
      result: null,
      error: null,
      notice: totalTiles < targetTotal
        ? `Hand holds ${totalTiles} of ${targetTotal} tiles — add ${targetTotal - totalTiles} more.`
        : `Hand holds ${totalTiles} tiles — ${totalTiles - targetTotal} too many. Remove some hand tiles.`,
    }
  }

  const allTiles: Tile[] = [
    ...handTiles.value,
    ...melds.flatMap((m) => [...m.tiles]),
    ...doraTiles.value,
  ]
  const setProblem = validateTileSetLocal(allTiles, nukiDoraCount.value)
  if (setProblem) return { result: null, error: setProblem, notice: null }

  const hand: Hand = {
    closedTiles: closedHandTiles.value,
    melds,
    winningTile: winningTile.value,
    winType: winType.value,
    seatWind: seatWind.value,
    roundWind: roundWind.value,
    doraIndicators: doraIndicators.omote,
    uraDoraIndicators: doraIndicators.ura,
    riichi: flags.riichi,
    doubleRiichi: flags.doubleRiichi,
    ippatsu: flags.ippatsu,
    haitei: flags.haitei,
    houtei: flags.houtei,
    rinshan: flags.rinshan,
    chankan: flags.chankan,
    honba: honba.value,
    nukiDoraCount: threePlayer.value ? nukiDoraCount.value : 0,
    paoResponsibleSeat: paoResponsible.value ? (paoResponsibleSeat.value ?? undefined) : undefined,
    // A pao ron needs a discarder; default to the responsible player (the common case) if unset.
    ronDiscarderSeat: winType.value === 'ron' && paoResponsible.value
      ? (ronDiscarderSeat.value ?? paoResponsibleSeat.value ?? undefined)
      : undefined,
  }

  const result = score(hand, {
    playerCount: threePlayer.value ? 3 : 4,
    akaDoraCount: threePlayer.value ? 2 : 3,
    doubleYakuman: true,
  })

  if (!result.valid) {
    return { result: null, error: result.error ?? 'This hand cannot be scored.', notice: null }
  }

  return { result, error: null, notice: null }
})

const result = computed(() => scoreState.value.result)
const error = computed(() => scoreState.value.error)
const notice = computed(() => scoreState.value.notice)
const paoEligible = computed(() => !!result.value?.yaku.some((yaku) =>
  yaku.name === 'daisangen' || yaku.name === 'daisuushi'))

// Seats that can be pao-responsible or the ron discarder: anyone at the table
// except the winner (sanma tables have no North seat).
function tableSeats(): WindValue[] {
  const seats: WindValue[] = threePlayer.value ? ['east', 'south', 'west'] : ['east', 'south', 'west', 'north']
  return seats.filter((seat) => seat !== seatWind.value)
}

const paoSeatOptions = computed<WindValue[]>(() => tableSeats())
const discarderSeatOptions = computed<WindValue[]>(() =>
  winType.value === 'ron' ? tableSeats() : [])

function firstSeat(seats: WindValue[]): WindValue | null {
  return seats[0] ?? null
}

function resetPaoSeats() {
  paoResponsibleSeat.value = null
  ronDiscarderSeat.value = null
}

watch(paoEligible, (eligible) => {
  if (!eligible) {
    paoResponsible.value = false
    resetPaoSeats()
  }
})

// Ticking pao pre-fills the responsible player (and the discarder for ron)
// with the first valid seat — usually the same player, the common pao case.
watch(paoResponsible, (on) => {
  if (!on) {
    resetPaoSeats()
    return
  }
  paoResponsibleSeat.value = paoResponsibleSeat.value ?? firstSeat(paoSeatOptions.value)
  if (winType.value === 'ron') {
    ronDiscarderSeat.value = ronDiscarderSeat.value ?? paoResponsibleSeat.value
  }
})

// A seat choice can become impossible (winner seat changed, table switched to
// sanma); fall back to a valid seat when that happens.
watch([paoSeatOptions, discarderSeatOptions], () => {
  if (!paoResponsible.value) return
  if (paoResponsibleSeat.value && !paoSeatOptions.value.includes(paoResponsibleSeat.value)) {
    paoResponsibleSeat.value = firstSeat(paoSeatOptions.value)
  }
  if (winType.value === 'ron' && ronDiscarderSeat.value && !discarderSeatOptions.value.includes(ronDiscarderSeat.value)) {
    ronDiscarderSeat.value = firstSeat(discarderSeatOptions.value)
  }
})

const resultHeading = computed(() => {
  if (error.value) return 'Check the hand'
  const r = result.value
  if (!r) return 'Score'
  const scoredHan = r.totalHan + r.doraCount + r.akaDoraCount + r.uraDoraCount + r.nukiDoraCount
  return r.handName ? HAND_NAMES[r.handName] : `${scoredHan} han · ${r.fu} fu`
})

const scoreDisplay = computed(() => {
  const r = result.value
  if (!r) return ''
  const pts = r.points
  if (pts.responsiblePays) {
    return pts.discarderPays
      ? `${formatPoints(pts.responsiblePays + pts.discarderPays)} points · pao split`
      : `${formatPoints(pts.responsiblePays)} points · pao`
  }
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

function scrollToResult() {
  document.querySelector('.result-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatPoints(n: number): string {
  return n.toLocaleString('en-US')
}

function yakuName(name: string, detail?: string): string {
  const label = YAKU_EN[name] ?? name
  return detail ? `${label} — ${detail}` : label
}

function yakuRomaji(name: string): string {
  return YAKU_ROMAJI[name] ?? name
}
</script>

<style scoped>
.calc-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  align-items: start;
  gap: 0 24px;
  width: min(100% - 24px, 1240px);
  padding: 0 0 36px;
}

.calc-hero {
  grid-column: 1 / -1;
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

.wizard-progress,
.wizard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 18px 0;
}

.wizard-new-hand {
  display: block;
  margin: 18px 0 10px auto;
}

.wizard-back {
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

.wizard-back:hover {
  color: var(--matcha-leaf);
  border-color: var(--matcha-leaf);
}

.table-format-picker {
  display: grid;
  gap: 12px;
  margin: 18px 0;
}

.wizard-step {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 7px 9px;
  color: var(--clay-text);
  font: inherit;
  font-size: 0.66rem;
  font-weight: 700;
  border: 1px solid rgba(101, 119, 99, 0.2);
  border-radius: 999px;
  background: transparent;
  opacity: 0.55;
}

.wizard-step > span {
  display: grid;
  width: 17px;
  height: 17px;
  place-items: center;
  color: white;
  font-size: 0.58rem;
  border-radius: 50%;
  background: var(--clay-text);
}

.wizard-step.active,
.wizard-step.complete {
  color: var(--matcha-leaf);
  border-color: var(--matcha-leaf);
  opacity: 1;
}

.wizard-step.active > span,
.wizard-step.complete > span {
  background: var(--matcha-leaf);
}

.wizard-actions {
  justify-content: space-between;
  margin-top: 24px;
}

.result-card {
  position: sticky;
  top: 86px;
}

.rules-card {
  grid-column: 1 / -1;
  /* Skip layout/paint while scrolled out of view; auto remembers the real
     height once rendered so the scrollbar doesn't jump. */
  content-visibility: auto;
  contain-intrinsic-size: auto 480px;
}

.mobile-score-bar {
  display: none;
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

.scan-feedback {
  margin: 10px 0 0;
  padding: 10px 14px;
  color: var(--matcha-leaf);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.5;
  border-radius: 12px;
  background: rgba(101, 119, 99, 0.08);
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
  /* Let rapid taps register instead of triggering double-tap zoom on mobile */
  touch-action: manipulation;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.picker-tile:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--gold-leaf);
}

.picker-tile:active:not(:disabled) {
  transform: scale(0.95);
}

.picker-tile:disabled {
  cursor: not-allowed;
  opacity: 0.3;
  filter: grayscale(0.9);
}

.picker-blocked-note {
  margin: 0 0 6px;
  color: #8a3b3b;
  font-size: 0.72rem;
  line-height: 1.4;
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

.picker-collapsed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 12px;
  padding: 13px 16px;
  color: var(--clay-text);
  font: inherit;
  font-size: 0.72rem;
  border: 1px dashed rgba(101, 119, 99, 0.25);
  border-radius: 14px;
  background: rgba(101, 119, 99, 0.05);
  cursor: pointer;
}

.picker-collapsed strong {
  color: var(--matcha-leaf);
}

.picker-mode-label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--clay-text);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  opacity: 0.75;
}

.picker-done {
  margin-left: auto;
  padding: 3px 10px;
  color: var(--matcha-leaf);
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.picker-mode-switch {
  padding: 3px 10px;
  color: var(--clay-text);
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid rgba(101, 119, 99, 0.22);
  border-radius: 999px;
  background: rgba(255, 253, 249, 0.85);
  cursor: pointer;
  touch-action: manipulation;
}

.picker-mode-switch[aria-pressed='true'] {
  color: var(--matcha-leaf);
  border-color: var(--matcha-leaf);
  background: rgba(255, 253, 249, 1);
}

.picker-mode-switch:hover {
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

.hand-row.needs-winner .row-tiles {
  outline: 2px solid var(--gold-leaf);
  outline-offset: 2px;
  background: rgba(185, 139, 104, 0.08);
}

.hand-row.ready .row-tiles {
  outline: 1px solid rgba(101, 119, 99, 0.45);
  outline-offset: 2px;
}

.hand-guidance {
  grid-column: 2;
  margin: -4px 2px 0;
  color: var(--gold-leaf);
  font-size: 0.74rem;
  font-weight: 700;
}

.hand-guidance.ready {
  color: var(--matcha-leaf);
}

.dora-guidance {
  grid-column: 2;
  margin: -4px 2px 0;
  color: var(--clay-text);
  font-size: 0.7rem;
  line-height: 1.45;
  opacity: 0.68;
}

.tile-btn {
  position: relative;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  /* Let rapid taps register instead of triggering double-tap zoom on mobile */
  touch-action: manipulation;
  transition: transform 0.12s ease;
}

.tile-btn:hover {
  transform: translateY(-2px);
}

/* Hand tile wrapper: tile button + corner remove × */
.hand-tile {
  position: relative;
  display: inline-flex;
  line-height: 0;
}

/* The marked winning tile inside the hand row */
.hand-tile.winning-tile-btn {
  outline: 2px solid var(--gold-leaf);
  outline-offset: 1px;
  border-radius: 7px;
}

.win-mark {
  position: absolute;
  bottom: -6px;
  right: -6px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  color: #fff;
  font-size: 0.55rem;
  font-style: normal;
  font-weight: 700;
  line-height: 1;
  border-radius: 50%;
  background: var(--gold-leaf);
  box-shadow: 0 1px 4px rgba(74, 68, 61, 0.4);
}

.tile-remove {
  position: absolute;
  top: -7px;
  left: -7px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  padding: 0;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  border: 0;
  border-radius: 50%;
  background: #a34d4d;
  box-shadow: 0 1px 4px rgba(74, 68, 61, 0.4);
  cursor: pointer;
  touch-action: manipulation;
}

.tile-remove:hover {
  background: #8a3b3b;
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
  touch-action: manipulation;
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

.option-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  grid-auto-flow: dense;
  gap: 14px;
  margin-top: 22px;
}

/* Four wind buttons don't fit a single ~160px grid column (the segmented
   control clips its overflow), so the seat-wind control takes two columns. */
.seat-wind-field {
  grid-column: span 2;
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

.segmented-control button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.condition-panel {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  align-items: end;
  gap: 12px;
  margin-top: 18px;
}

.declaration-control button {
  padding-inline: 8px;
}

.condition-panel > .flag {
  margin: 0;
}

.special-toggle {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 14px;
  color: var(--clay-text);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  text-align: left;
  border: 1px solid rgba(101, 119, 99, 0.14);
  border-radius: 12px;
  background: rgba(255, 253, 249, 0.6);
  cursor: pointer;
}

.special-toggle span:first-of-type {
  margin-left: auto;
  font-size: 0.64rem;
  font-weight: 400;
  opacity: 0.65;
}

.special-toggle span:last-child {
  margin-left: auto;
  font-size: 1rem;
}

.special-toggle span + span {
  margin-left: 0;
}

.special-flags {
  grid-column: 1 / -1;
  margin-top: 0;
  padding: 4px 2px;
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

@media (max-width: 1000px) {
  .calc-page {
    display: block;
    width: min(100% - 24px, 820px);
  }

  .result-card {
    position: static;
  }
}

@media (max-width: 760px) {
  .calc-page.has-mobile-score {
    padding-bottom: 104px;
  }

  .capture-buttons {
    width: 100%;
  }

  .capture-buttons > * {
    flex: 1 1 45%;
  }

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

  .hand-guidance {
    grid-column: 1;
  }

  .condition-panel {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .condition-panel > .flag {
    justify-content: center;
  }

  .mobile-score-bar {
    position: fixed;
    right: 72px;
    bottom: 12px;
    left: 12px;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 13px 16px;
    color: #fff;
    font: inherit;
    text-align: left;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 16px;
    background: rgba(85, 105, 82, 0.96);
    box-shadow: 0 12px 32px rgba(55, 62, 52, 0.28);
    cursor: pointer;
  }

  .mobile-score-bar small,
  .mobile-score-bar strong {
    display: block;
  }

  .mobile-score-bar small {
    margin-bottom: 2px;
    font-size: 0.62rem;
    text-transform: uppercase;
    opacity: 0.75;
  }

  .mobile-score-bar strong {
    font-size: 1rem;
  }

  .mobile-score-bar > span:last-child {
    font-size: 0.7rem;
    font-weight: 700;
    white-space: nowrap;
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
