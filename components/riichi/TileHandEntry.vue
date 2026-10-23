<template>
  <section class="calc-section tile-entry-section" :class="{ 'tile-result-visible': resultPanelVisible }" aria-labelledby="tiles-heading">
    <div class="section-heading">
      <span v-if="stage === 0" class="step-number">1</span>
      <div>
        <h2 id="tiles-heading">{{ stage === 0 ? 'Enter your tiles' : hasWinningTile ? 'Winning tile selected' : 'Choose the winning tile' }}</h2>
        <p v-if="stage === 0">Enter all 14 tiles, including any from calls. Add a kan’s extra tile afterwards, then mark the groups above.</p>
        <p v-else-if="hasWinningTile">{{ label(entry.tiles[entry.winningIndex]) }} is marked. Tap another tile to change it.</p>
        <p v-else>Tap the tile that completed your hand. It stays highlighted while you check the score.</p>
      </div>
    </div>

    <div class="tile-entry-count">
      <strong>{{ tileCountLabel }}</strong>
      <span v-if="stage === 0 && entry.tiles.length === targetCount" class="sr-only" role="status">All hand tiles entered. Continue to choose the win details.</span>
      <button v-if="!showGroupPicker && history.length" type="button" class="reset-button" @click="undo">Undo tile edit</button>
      <button v-if="stage === 0 && canClearHand" type="button" class="reset-button" @click="$emit('new-hand')">New hand</button>
      <template v-else-if="stage === 1">
        <button type="button" class="reset-button" @click="$emit('previous-step')">← Edit tiles</button>
        <button type="button" class="reset-button mobile-new-hand" @click="$emit('new-hand')">New hand</button>
      </template>
    </div>
    <div v-if="stage === 0 && entry.tiles.length >= 14" class="tile-group-builder">
      <button ref="groupTriggerButton" type="button" class="add-tile-group" :disabled="entry.tiles.length < 14 || addingKanReplacement" :aria-expanded="showGroupPicker" @click="toggleGroupPicker">{{ addingKanReplacement ? 'Finish adding the extra tile first' : groupButtonLabel }}</button>
      <p v-if="entry.melds.length >= 4" class="field-hint">You have four groups. You can still mark an added kan.</p>
      <p v-else-if="addingKanReplacement" class="field-hint">Add or cancel the extra tile before marking a call or kan.</p>
      <p v-else-if="!showGroupPicker" class="field-hint">Mark any calls or kans before removing tiles.</p>
      <template v-if="showGroupPicker">
        <p class="field-hint group-type-prompt">{{ availableMeldTypes.length > 1 ? 'Choose the call or kan type, then tap a complete group to mark it.' : availableMeldTypes.length ? 'Tap a complete group to mark it.' : 'No unmarked call or kan fits these tiles. Add the extra tile first if you need to mark a kan.' }}</p>
        <div v-if="availableMeldTypes.length > 1" class="tile-group-type-grid" role="group" aria-label="Group type">
          <button v-for="type in availableMeldTypes" :key="type.id" type="button" class="group-type-option" :class="{ selected: meldType === type.id }" :aria-pressed="meldType === type.id" @click="chooseMeld(type.id)">
            <strong>{{ type.label }}</strong>
            <span class="group-type-example" aria-hidden="true"><template v-for="(token, index) in type.example" :key="token + '-' + index"><span v-if="type.id === 'kan-closed' && (index === 0 || index === 3)" class="tile-back"></span><img v-else :src="image(token)" alt="" /></template></span>
          </button>
        </div>
        <p v-if="availableMeldTypes.length" class="group-type-help"><strong>{{ meldLabel(meldType) }}.</strong> {{ selectedMeldHelp }}</p>
        <div class="meld-shortcuts" role="group" :aria-label="`Available ${meldLabel(meldType)} groups`">
          <button v-for="option in groupShortcuts" :key="option.key" type="button" class="meld-shortcut" :aria-label="`${confirmLabel}: ${option.tokens.map(label).join(', ')}`" @click="markGroup(option.indices)">
            <span class="group-type-example" aria-hidden="true"><img v-for="(token, index) in option.tokens" :key="index" :src="image(token)" alt="" /></span>
            <span>{{ confirmLabel }}</span>
          </button>
        </div>
        <p v-if="availableMeldTypes.length" class="field-hint">Or select individual tiles in your hand below.</p>
      </template>
    </div>
    <div ref="tileHandTray" class="tile-hand-entry" :class="{ 'tile-hand-readonly': stage === 1, 'tile-hand-empty': !entry.tiles.length }" role="group" tabindex="-1" aria-label="Tiles in your hand, including the winning tile">
      <template v-for="tile in sortedTiles" :key="'tile-' + tile.token + '-' + tile.index">
        <button v-if="stage === 0 && !showGroupPicker" type="button" class="entered-tile" :class="{ 'tile-in-group': isTileGrouped(tile.index), 'tile-winning': entry.winningIndex === tile.index }" :disabled="isTileGrouped(tile.index)" :aria-label="isTileGrouped(tile.index) ? label(tile.token) + ', part of a marked group; remove its group annotation below' : (entry.winningIndex === tile.index ? label(tile.token) + ', winning tile. Remove ' + label(tile.token) : 'Remove ' + label(tile.token))" @click="removeTile(tile.index)">
          <img :src="image(tile.token)" alt="" /><span v-if="isTileGrouped(tile.index)" class="entered-tile-group">In group</span><template v-else><span v-if="entry.winningIndex === tile.index" class="entered-tile-win">Win</span><span class="entered-tile-remove" aria-hidden="true">×</span></template>
        </button>
        <button v-else-if="stage === 0" type="button" class="entered-tile" :class="{ 'tile-marked': selection.includes(tile.index), 'tile-in-group': isTileGrouped(tile.index), 'tile-winning': entry.winningIndex === tile.index }" :aria-pressed="selection.includes(tile.index)" :disabled="!canSelectTile(tile.index)" :aria-label="(selection.includes(tile.index) ? 'Deselect ' : 'Select ') + label(tile.token) + (entry.winningIndex === tile.index ? ', winning tile; cannot be part of a call' : !canSelectTile(tile.index) ? ', not available for this group' : '') + ' for group'" @click="toggleSelection(tile.index)">
          <img :src="image(tile.token)" alt="" /><span v-if="entry.winningIndex === tile.index" class="entered-tile-win">Win</span>
        </button>
        <button v-else type="button" class="entered-tile" :class="{ 'tile-marked': entry.winningIndex === tile.index, 'tile-in-group': isTileGrouped(tile.index) }" :aria-pressed="entry.winningIndex === tile.index" :disabled="isTileGrouped(tile.index)" :aria-label="label(tile.token) + (isTileGrouped(tile.index) ? ', part of a marked group' : entry.winningIndex === tile.index ? ', winning tile' : ', set as winning tile')" @click="setWinning(tile.index)">
          <img :src="image(tile.token)" alt="" />
        </button>
      </template>
      <span v-if="!entry.tiles.length" class="tile-entry-empty">Tiles appear here</span>
    </div>
    <template v-if="stage === 0 && showGroupPicker && selection.length">
      <p class="group-selection-hint" aria-live="polite">{{ groupSelectionHint }}<template v-if="hasWinningTile"> The tile marked Win cannot be part of a call.</template></p>
      <p v-if="groupError" class="field-problems" role="status">{{ groupError }}</p>
      <div class="group-selection-actions">
        <span class="group-selection-count" aria-live="polite">{{ selection.length }} selected</span>
        <button v-if="selection.length" type="button" class="reset-button" @click="clearGroupSelection">Clear</button>
        <button type="button" class="choice-button confirm-tile-group" :disabled="!canConfirmGroup" @click="confirmGroup">{{ confirmLabel }}</button>
      </div>
    </template>
    <p v-if="stage === 1 && shapeError" class="field-problems" role="status">{{ shapeError }} Tap “Edit tiles” above to correct the hand.</p>
    <p v-if="stage === 0 && (addingKanReplacement || entry.tiles.length > targetCount)" class="field-hint">{{ countHint }}</p>
    <div v-if="stage === 0 && entry.tiles.length >= targetCount && !showGroupPicker" class="tile-entry-extra-actions">
      <button v-if="!showTilePicker && !addingKanReplacement" type="button" class="reset-button" @click="editTiles">Edit tiles</button>
      <button v-if="entry.tiles.length - targetCount < 4 && !addingKanReplacement && entry.tiles.length < 18" ref="kanReplacementTriggerButton" type="button" class="reset-button" @click="startKanReplacementEntry">＋ Add an extra tile for a kan</button>
      <button v-if="addingKanReplacement" type="button" class="reset-button" @click="cancelKanReplacement">Cancel extra tile</button>
      <span v-if="addingKanReplacement" class="field-hint">Choose the extra tile below. Add one for each kan.</span>
      <span v-if="showTilePicker && !addingKanReplacement" class="field-hint">To replace a tile, tap its × above, then choose the new tile here.</span>
      <button v-if="showTilePicker && !addingKanReplacement" type="button" class="reset-button" @click="doneEditingTiles">Done editing</button>
    </div>

    <template v-if="stage === 0">
      <div v-if="entry.melds.length" class="tile-melds">
        <div v-for="(meld, index) in entry.melds" :key="'meld-' + index" class="tile-meld-row">
          <div class="group-tile-samples" aria-hidden="true">
            <template v-for="(token, tileIndex) in meld.tokens" :key="token + '-' + tileIndex">
              <span v-if="meld.type === 'kan-closed' && (tileIndex === 0 || tileIndex === 3)" class="tile-back"></span>
              <img v-else :src="image(token)" alt="" />
            </template>
          </div>
          <strong>{{ meldLabel(meld.type) }}</strong>
          <button type="button" class="remove-group" :disabled="showGroupPicker" :aria-label="'Remove ' + meldLabel(meld.type) + ' annotation; keep tiles in hand'" @click="removeMeld(index)">Remove</button>
        </div>
      </div>
      <template v-if="showTilePicker && !showGroupPicker">
      <div class="tile-suit-tabs" role="group" aria-label="Choose tiles">
        <button v-for="suit in suits" :key="suit.id" type="button" class="choice-button" :class="{ selected: activeSuit === suit.id }" :aria-pressed="activeSuit === suit.id" @click="activeSuit = suit.id">{{ suit.label }}</button>
      </div>
      <div class="tile-picker-grid" role="group" :aria-label="activeSuitLabel + ' tiles'">
        <button v-for="token in pickerTokens" :key="token" ref="tilePickerButtons" type="button" class="tile-picker-button" :disabled="!canAdd(token)" :aria-label="'Add ' + label(token) + (handCount(token) ? ', ' + handCount(token) + ' already in hand' : '')" @click="addTile(token, $event)">
          <span v-if="handCount(token)" class="tile-count-badge" aria-hidden="true">×{{ handCount(token) }}</span><img :src="image(token)" alt="" /><small>{{ pickerLabel(token) }}</small>
        </button>
      </div>
      </template>

      <details v-if="stage === 0" class="tile-entry-help">
        <summary>Calls, kans and hand options</summary>
        <p>Enter all 14 tiles first, including tiles from calls. Add one extra tile for each kan, then mark the call or kan above.</p>
        <p>Clear tile entry removes the tiles, call and kan marks, and dora markers. Win details such as riichi and dealer stay set.</p>
        <button v-if="canClearHand" type="button" class="reset-button clear-tile-entry" @click="clearTiles">Clear tile entry</button>
      </details>

      <p v-if="physicalError" class="field-problems" role="status">{{ physicalError }}</p>
      <div v-if="!showGroupPicker" class="tile-step-actions">
        <button v-if="canUseLastTile" ref="lastTileButton" type="button" class="next-step-button last-tile-shortcut" @click="useLastTileAndContinue"><img :src="image(entry.tiles.at(-1))" alt="" /><span>Win with last-entered tile · {{ label(entry.tiles.at(-1)) }} →</span></button>
        <button ref="nextStepButton" type="button" :class="canUseLastTile ? 'choice-button' : 'next-step-button'" :disabled="!canContinue" @click="$emit('next-step')">{{ canUseLastTile ? 'Choose a different winning tile →' : 'Choose win details →' }}</button>
      </div>
    </template>
    <template v-else>
      <div class="tile-melds" v-if="entry.melds.length">
        <div v-for="(meld, index) in entry.melds" :key="'win-meld-' + index" class="tile-meld-row">
          <div class="group-tile-samples" aria-hidden="true"><template v-for="(token, tileIndex) in meld.tokens" :key="token + '-' + tileIndex"><span v-if="meld.type === 'kan-closed' && (tileIndex === 0 || tileIndex === 3)" class="tile-back"></span><img v-else :src="image(token)" alt="" /></template></div>
          <strong>{{ meldLabel(meld.type) }}</strong>
        </div>
      </div>
      <slot name="win-details" />
      <div class="tile-indicators" tabindex="-1">
        <span class="field-label">Bonus han</span>
        <div class="choice-row bonus-entry-modes" role="group" aria-label="How to enter bonus han">
          <button type="button" class="choice-button" :class="{ selected: bonusEntryMode === 'total' }" :aria-pressed="bonusEntryMode === 'total'" @click="setBonusEntryMode('total')">Enter other bonus han</button>
          <button type="button" class="choice-button" :class="{ selected: bonusEntryMode === 'indicators' }" :aria-pressed="bonusEntryMode === 'indicators'" @click="setBonusEntryMode('indicators')">Count indicators</button>
        </div>
        <p class="automatic-red-dora">Red dora · {{ akaDoraCount }} han, counted automatically</p>
        <template v-if="bonusEntryMode === 'total'">
          <p id="other-bonus-han-hint" class="field-hint">Enter visible dora, ura dora and extracted North bonuses together. Red tiles are counted from your hand.</p>
          <label class="field-label" for="other-bonus-han">Other bonus han</label>
          <div class="stepper" role="group" aria-label="Other bonus han">
            <button type="button" aria-label="Remove one other bonus han" :disabled="totalBonusHan <= 0" @click="adjustTotalBonusHan(-1)">−</button>
            <input id="other-bonus-han" :value="totalBonusHan" type="number" inputmode="numeric" min="0" max="99" step="1" aria-describedby="other-bonus-han-hint" @change="setTotalBonusHan($event.target.value)" />
            <button type="button" aria-label="Add one other bonus han" :disabled="totalBonusHan >= 99" @click="adjustTotalBonusHan(1)">+</button>
          </div>
        </template>
        <template v-else>
        <span class="field-label">Dora and ura indicators <small>{{ indicatorInstructions }}</small></span>
        <div class="stepper indicator-kan-stepper" role="group" aria-label="Kans declared by other players">
          <span class="indicator-kan-label">Other players’ kans</span>
          <button type="button" aria-label="Decrease other players’ kans" :disabled="otherKanCount <= 0" @click="adjustOtherKanCount(-1)">−</button>
          <span class="indicator-kan-count" aria-live="polite">{{ otherKanCount }}</span>
          <button type="button" aria-label="Increase other players’ kans" :disabled="kanCount + otherKanCount >= 4" @click="adjustOtherKanCount(1)">+</button>
        </div>
        <p class="field-hint indicator-kan-hint">{{ indicatorRowSize }} face-up {{ indicatorRowSize === 1 ? 'marker' : 'markers' }} total, including the starting marker.</p>
        <div class="indicator-examples">
          <div class="indicator-example" aria-label="Example: 3 dots indicator makes 4 dots dora"><span>Face-up marker</span><img :src="image('p3')" alt="3 dots indicator" /><span aria-hidden="true">→</span><img :src="image('p4')" alt="4 dots dora" /><span>next tile is dora</span></div>
          <div v-if="riichi" class="indicator-example"><span>Hidden until a riichi win</span><span class="indicator-back" aria-hidden="true"></span><span>ura dora</span></div>
        </div>
        <div class="indicator-list"><span>Entered</span><div class="group-tile-samples">
          <template v-for="(indicator, index) in indicatorEntries" :key="indicator.field + '-' + indicator.index">
            <span v-if="indicator.field !== indicatorEntries[index - 1]?.field" class="indicator-category-label">{{ indicator.field === 'uraIndicators' ? 'Ura' : 'Face-up' }}</span>
            <button type="button" class="indicator-tile" :aria-label="'Remove ' + (indicator.field === 'uraIndicators' ? 'ura' : 'face-up') + ' marker ' + (indicator.index + 1) + ', ' + label(indicator.token)" @click="removeIndicator(indicator.field, indicator.index)"><img :src="image(indicator.token)" alt="" /><span aria-hidden="true">×</span></button>
          </template>
          <span class="field-hint">{{ indicatorProgress }}</span>
        </div></div>
        <p v-if="indicatorEntryComplete" ref="indicatorCompleteMessage" class="indicator-complete" role="status" tabindex="-1">All {{ riichi ? 'dora and ura dora' : 'dora' }} markers entered.</p>
        <template v-else>
          <span class="field-label indicator-active-target">Add {{ nextIndicatorCategory }} marker</span>
          <div class="tile-suit-tabs" role="group" aria-label="Choose indicator tile suit">
            <button v-for="suit in suits" :key="'indicator-' + suit.id" type="button" class="choice-button" :class="{ selected: activeSuit === suit.id }" :aria-pressed="activeSuit === suit.id" @click="activeSuit = suit.id">{{ suit.label }}</button>
          </div>
          <div class="tile-picker-grid" role="group" :aria-label="activeSuitLabel + ' indicator tiles'">
            <button v-for="token in pickerTokens" :key="'indicator-' + token" ref="indicatorPickerButtons" type="button" class="tile-picker-button" :disabled="!canAddIndicator(token)" :aria-label="'Add ' + label(token) + ' ' + nextIndicatorCategory + ' marker'" @click="addIndicator(token, $event)">
              <img :src="image(token)" alt="" /><small>{{ pickerLabel(token) }}</small>
            </button>
          </div>
        </template>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  stage: { type: Number, default: 0 },
  resultPanelVisible: { type: Boolean, default: false },
  playerCount: { type: Number, default: 4 },
  akaDoraCount: { type: Number, default: 0 },
  riichi: { type: Boolean, default: false },
  tileSituation: { type: Object, required: true },
  undoContext: { type: Object, default: () => ({}) },
  physicalError: { type: String, default: '' },
  shapeError: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'next-step', 'previous-step', 'restore-tile-situation', 'new-hand'])
const suits = [
  { id: 'man', label: 'Characters' },
  { id: 'pin', label: 'Dots' },
  { id: 'sou', label: 'Bamboo' },
  { id: 'honor', label: 'Honours' },
]
const meldTypes = [
  { id: 'chi', label: 'Chi · run', help: 'Three consecutive tiles in one suit; take one from a discard', example: ['m2', 'm3', 'm4'] },
  { id: 'pon', label: 'Pon · triplet', help: 'Three matching tiles; take one from a discard', example: ['p5', 'p5', 'p5'] },
  { id: 'kan-open', label: 'Open kan', help: 'Four matching tiles; take one from a discard', example: ['s7', 's7', 's7', 's7'] },
  { id: 'kan-closed', label: 'Concealed kan', help: 'Four matching tiles from your hand', example: ['m1', 'm1', 'm1', 'm1'] },
  { id: 'kan-added', label: 'Added kan', help: 'A fourth tile added to a pon you already called. Select all four tiles here.', example: ['p5', 'p5', 'p5', 'p5'] },
]
const windNames = ['East', 'South', 'West', 'North']
const dragonNames = ['White dragon', 'Green dragon', 'Red dragon']
const honorImages = ['Ton', 'Nan', 'Shaa', 'Pei', 'Haku', 'Hatsu', 'Chun']
const activeSuit = ref('man')
const showGroupPicker = ref(false)
const showTilePicker = ref(true)
const addingKanReplacement = ref(false)
const meldType = ref('chi')
const selection = ref([])
const history = ref([])
const bonusEntryRevision = ref(0)
const groupTriggerButton = ref(null)
const kanReplacementTriggerButton = ref(null)
const nextStepButton = ref(null)
const lastTileButton = ref(null)
const tilePickerButtons = ref([])
const indicatorPickerButtons = ref([])
const indicatorCompleteMessage = ref(null)
const tileHandTray = ref(null)
const entry = computed(() => props.modelValue)
const bonusEntryMode = computed(() => entry.value.doraEntryMode === 'indicators' ? 'indicators' : 'total')
const totalBonusHan = computed(() => {
  const value = Number(entry.value.totalBonusHan)
  return Number.isFinite(value) ? Math.min(99, Math.max(0, Math.trunc(value))) : 0
})
const hasWinningTile = computed(() => Number.isInteger(entry.value.winningIndex) && entry.value.winningIndex >= 0 && entry.value.winningIndex < entry.value.tiles.length)
const canClearHand = computed(() => Boolean(entry.value.tiles.length || entry.value.melds.length || entry.value.doraIndicators.length || entry.value.uraIndicators.length))
const kanCount = computed(() => entry.value.melds.filter(meld => meld.type.startsWith('kan')).length)
const otherKanCount = computed(() => Math.min(4 - kanCount.value, Math.max(0, Math.trunc(Number(entry.value.otherKanCount) || 0))))
const targetCount = computed(() => 14 + kanCount.value)
const indicatorEntries = computed(() => [
  ...entry.value.doraIndicators.map((token, index) => ({ token, index, field: 'doraIndicators' })),
  ...entry.value.uraIndicators.map((token, index) => ({ token, index, field: 'uraIndicators' })),
])
const indicatorRowSize = computed(() => Math.max(1, Math.min(5, 1 + kanCount.value + otherKanCount.value)))
const nextIndicatorCategory = computed(() => props.riichi && entry.value.doraIndicators.length >= indicatorRowSize.value ? 'ura dora' : 'face-up dora')
const indicatorEntryComplete = computed(() => entry.value.doraIndicators.length === indicatorRowSize.value && (!props.riichi || entry.value.uraIndicators.length === indicatorRowSize.value))
const tileCountLabel = computed(() => {
  const count = entry.value.tiles.length
  const difference = targetCount.value - count
  const noun = count === 1 ? 'tile' : 'tiles'
  if (difference === 0) return `${count} ${noun} entered · ready for win details`
  if (difference > 0) return `${count} ${noun} entered · ${difference} more needed`
  return `${count} ${noun} entered · ${Math.abs(difference)} extra ${difference === -1 ? 'tile' : 'tiles'} to match to kan calls`
})
const sortedTiles = computed(() => props.modelValue.tiles
  .map((token, index) => ({ token, index }))
  .sort((a, b) => tileOrder(a.token) - tileOrder(b.token) || (a.token.endsWith('r') ? 1 : 0) - (b.token.endsWith('r') ? 1 : 0) || a.index - b.index))
const activeSuitLabel = computed(() => suits.find(suit => suit.id === activeSuit.value)?.label ?? 'Tiles')
const pickerTiles = computed(() => activeSuit.value === 'honor'
  ? Array.from({ length: 7 }, (_, index) => 'h' + index)
  : Array.from({ length: 9 }, (_, index) => activeSuit.value[0] + (index + 1)))
const pickerTokens = computed(() => pickerTiles.value.flatMap(token => activeSuit.value !== 'honor' && token.endsWith('5') ? [token, token + 'r'] : [token]))
const countHint = computed(() => {
  const remaining = targetCount.value - entry.value.tiles.length
  if (addingKanReplacement.value) return 'Choose one extra tile for a kan. Mark the kan after you finish entering tiles.'
  if (remaining > 0 && kanCount.value) return `Add ${remaining} more ${remaining === 1 ? 'tile' : 'tiles'}, including one extra tile for each kan.`
  if (remaining > 0) return 'Add ' + remaining + (remaining === 1 ? ' more tile' : ' more tiles') + ' to continue.'
  return 'Mark a kan for each extra tile, or remove the extra tile.'
})
const selectedTokens = computed(() => selection.value.map(index => entry.value.tiles[index]).filter(Boolean))
const existingPonGroups = computed(() => entry.value.melds.filter(meld => meld.type === 'pon'))
const canConfirmGroup = computed(() => !meldTypeDisabledReason(meldType.value) && groupIsValid(meldType.value, selectedTokens.value))
const confirmLabel = computed(() => meldType.value === 'chi'
  ? 'Add chi'
  : meldType.value === 'pon'
    ? 'Add pon'
    : meldType.value === 'kan-open'
      ? 'Add open kan'
      : meldType.value === 'kan-closed'
        ? 'Add concealed kan'
        : 'Add added kan')
const selectedMeldHelp = computed(() => meldTypes.find(type => type.id === meldType.value)?.help ?? '')
const groupSelectionTarget = computed(() => meldType.value === 'chi' || meldType.value === 'pon' ? 3 : 4)
const groupSelectionHint = computed(() => {
  const message = {
    chi: 'Select three consecutive tiles for a chi call',
    pon: 'Select three matching tiles for a pon call',
    'kan-open': 'Select four matching tiles for an open kan',
    'kan-closed': 'Select four matching tiles for a concealed kan',
  }[meldType.value] ?? 'Select the tiles for this group'
  const matchingTip = meldType.value !== 'chi'
    ? ' Tap one tile to select its matching copies.'
    : ''
  return `${message} (${selection.value.length}/${groupSelectionTarget.value}). Unavailable tiles are disabled.${matchingTip}`
})
const groupButtonLabel = computed(() => showGroupPicker.value
  ? 'Cancel group'
  : entry.value.melds.length >= 4
    ? '＋ Mark an added kan'
    : '＋ Add a called group or kan')
const groupError = computed(() => {
  if (!selection.value.length) return ''
  const needed = meldType.value === 'chi' || meldType.value === 'pon' ? 3 : 4
  if (selectedTokens.value.length !== needed) return ''
  return groupIsValid(meldType.value, selectedTokens.value) ? '' : meldType.value === 'chi'
    ? 'Chi needs three consecutive tiles in one suit.'
    : 'This group needs matching tiles.'
})
const indicatorInstructions = computed(() => `Include markers revealed by other players’ kans. Enter face-up markers first, then ura, using the marker tiles.`)
const indicatorProgress = computed(() => props.riichi
  ? `${entry.value.doraIndicators.length} face-up · ${entry.value.uraIndicators.length} ura`
  : `${entry.value.doraIndicators.length} face-up markers`)
const canContinue = computed(() => entry.value.tiles.length === targetCount.value && entry.value.tiles.length > 0 && !props.physicalError && !showGroupPicker.value && !addingKanReplacement.value)
const canUseLastTile = computed(() => canContinue.value && !hasWinningTile.value && !isTileGrouped(entry.value.tiles.length - 1))
const groupShortcuts = computed(() => {
  if (meldTypeDisabledReason(meldType.value)) return []
  const seen = new Set()
  return candidateTileSets(meldType.value).flatMap(indices => {
    const tokens = indices.map(index => entry.value.tiles[index])
    const key = [...tokens].sort().join(',')
    if (seen.has(key)) return []
    seen.add(key)
    return [{ key, tokens, indices }]
  })
})
const availableMeldTypes = computed(() => meldTypes.filter(type => !meldTypeDisabledReason(type.id)))

defineExpose({ resetForNewHand, restoreAfterUndo })

watch(() => props.playerCount, count => {
  if (count === 3 && activeSuit.value === 'man') activeSuit.value = 'pin'
}, { immediate: true })
watch(availableMeldTypes, types => {
  if (!showGroupPicker.value || types.some(type => type.id === meldType.value)) return
  meldType.value = types[0]?.id ?? meldType.value
  selection.value = []
})
watch(() => [entry.value.tiles.length, targetCount.value], ([count, target]) => {
  showTilePicker.value = count < target
}, { immediate: true })

function update(change) {
  const next = {
    ...props.modelValue,
    tiles: [...props.modelValue.tiles],
    melds: props.modelValue.melds.map(meld => ({ ...meld, tokens: [...meld.tokens] })),
    doraIndicators: [...props.modelValue.doraIndicators],
    uraIndicators: [...props.modelValue.uraIndicators],
  }
  change(next)
  emit('update:modelValue', next)
  return next
}
function setBonusEntryMode(mode) {
  if (mode !== 'total' && mode !== 'indicators') return
  if (entry.value.doraEntryMode !== mode) bonusEntryRevision.value++
  update(next => { next.doraEntryMode = mode })
}
function setTotalBonusHan(value) {
  const parsed = Number(value)
  const total = Number.isFinite(parsed) ? Math.min(99, Math.max(0, Math.trunc(parsed))) : 0
  if (entry.value.totalBonusHan !== total) bonusEntryRevision.value++
  update(next => { next.totalBonusHan = total })
}
function adjustTotalBonusHan(amount) {
  setTotalBonusHan(totalBonusHan.value + amount)
}
function adjustOtherKanCount(amount) {
  const count = Math.min(4 - kanCount.value, Math.max(0, otherKanCount.value + amount))
  if (entry.value.otherKanCount === count) return
  snapshot()
  update(next => { next.otherKanCount = count })
}
function cloneEntry(source = entry.value) {
  return {
    ...source,
    tiles: [...source.tiles],
    melds: source.melds.map(meld => ({ ...meld, tokens: [...meld.tokens] })),
    doraIndicators: [...source.doraIndicators],
    uraIndicators: [...source.uraIndicators],
  }
}
function snapshot(source = entry.value) {
  const previous = cloneEntry(source)
  previous.tileSituation = { ...props.tileSituation }
  previous.undoContext = { ...props.undoContext }
  previous.bonusEntryRevision = bonusEntryRevision.value
  history.value.push(previous)
  if (history.value.length > 30) history.value.shift()
}
function tileFace(token) { return token.endsWith('r') ? token.slice(0, -1) : token }
function tileOrder(token) {
  if (token[0] === 'h') return 60 + Number(token[1])
  return ({ m: 0, p: 20, s: 40 })[token[0]] + Number(token[1])
}
function handCount(token) {
  return entry.value.tiles.filter(item => item === token).length
}
function tileSuit(token) { return ({ m: 'man', p: 'pin', s: 'sou' })[token[0]] ?? 'honor' }
function image(token) {
  if (token[0] === 'h') return '/tiles/' + honorImages[Number(token[1])] + '.svg'
  const suit = token[0] === 'm' ? 'Man' : token[0] === 'p' ? 'Pin' : 'Sou'
  return '/tiles/' + suit + token[1] + (token.endsWith('r') ? '-Dora' : '') + '.svg'
}
function label(token) {
  if (token[0] === 'h') return dragonNames[Number(token[1]) - 4] ?? windNames[Number(token[1])]
  return (token.endsWith('r') ? 'Red five' : token[1] + '') + ' ' + suits.find(suit => suit.id === tileSuit(token))?.label
}
function pickerLabel(token) {
  return token[0] === 'h' ? label(token) : token.endsWith('r') ? 'Red 5' : token[1]
}
function allTokens() {
  const indicators = bonusEntryMode.value === 'indicators'
    ? [...entry.value.doraIndicators, ...(props.riichi ? entry.value.uraIndicators : [])]
    : []
  return [...entry.value.tiles, ...indicators]
}
function countFace(token) { return allTokens().filter(item => tileFace(item) === tileFace(token)).length }
function countRedSuit(token) { return allTokens().filter(item => item.endsWith('r') && item[0] === token[0]).length }
function canAdd(token) {
  if (entry.value.tiles.length >= 18) return false
  if (entry.value.tiles.length >= targetCount.value && !addingKanReplacement.value) return false
  if (countFace(token) >= 4) return false
  if (token.endsWith('r') && countRedSuit(token) >= 1) return false
  if (props.playerCount === 3 && (token[0] === 'm' && (Number(token[1]) !== 1 && Number(token[1]) !== 9) || token === 'm5r')) return false
  return true
}
function canAddIndicator(token) {
  const maxIndicators = indicatorRowSize.value * (props.riichi ? 2 : 1)
  if (indicatorEntries.value.length >= maxIndicators) return false
  if (props.riichi && entry.value.doraIndicators.length >= indicatorRowSize.value && entry.value.uraIndicators.length >= entry.value.doraIndicators.length) return false
  if (countFace(token) >= 4) return false
  if (token.endsWith('r') && countRedSuit(token) >= 1) return false
  if (props.playerCount === 3 && (token[0] === 'm' && (Number(token[1]) !== 1 && Number(token[1]) !== 9) || token === 'm5r')) return false
  return true
}
function addTile(token, event) {
  if (!canAdd(token)) return
  const trigger = event?.currentTarget
  snapshot()
  const next = update(next => { next.tiles.push(token) })
  if (addingKanReplacement.value) {
    addingKanReplacement.value = false
    showTilePicker.value = false
    nextTick(() => groupTriggerButton.value?.focus())
  }
  else if (next.tiles.length >= targetCount.value) {
    showTilePicker.value = false
    nextTick(() => (canUseLastTile.value ? lastTileButton.value : canContinue.value ? nextStepButton.value : tileHandTray.value)?.focus())
  } else {
    nextTick(() => {
      if (trigger?.disabled) focusFirstEnabled(tilePickerButtons.value)
    })
  }
}
function startKanReplacementEntry() {
  if (entry.value.tiles.length >= 18 || entry.value.tiles.length - targetCount.value >= 4) return
  addingKanReplacement.value = true
  showTilePicker.value = true
  nextTick(() => focusFirstEnabled(tilePickerButtons.value))
}
function cancelKanReplacement() {
  addingKanReplacement.value = false
  showTilePicker.value = false
  nextTick(() => kanReplacementTriggerButton.value?.focus())
}
function doneEditingTiles() {
  showTilePicker.value = false
  nextTick(() => tileHandTray.value?.focus())
}
function editTiles() {
  showTilePicker.value = true
  nextTick(() => focusFirstRemovableTile())
}
function addIndicator(token, event) {
  if (!canAddIndicator(token)) return
  const trigger = event?.currentTarget
  const completesIndicatorEntry = props.riichi
    ? entry.value.doraIndicators.length >= indicatorRowSize.value && entry.value.uraIndicators.length + 1 >= indicatorRowSize.value
    : entry.value.doraIndicators.length + 1 >= indicatorRowSize.value
  snapshot()
  update(next => {
    const rowSize = indicatorRowSize.value
    const target = props.riichi && next.doraIndicators.length >= rowSize ? 'uraIndicators' : 'doraIndicators'
    next[target].push(token)
  })
  nextTick(() => {
    if (completesIndicatorEntry) {
      indicatorCompleteMessage.value?.focus()
    } else if (trigger?.disabled && !focusFirstEnabled(indicatorPickerButtons.value)) {
      document.querySelector('.tile-indicators')?.focus()
    }
  })
}
function removeIndicator(field, index) {
  snapshot()
  update(next => { next[field].splice(index, 1) })
  nextTick(() => (document.querySelector('.indicator-tile') ?? document.querySelector('.tile-indicators'))?.focus())
}
function removeTile(index) {
  if (isTileGrouped(index)) return
  snapshot()
  selection.value = selection.value
    .filter(selectedIndex => selectedIndex !== index)
    .map(selectedIndex => selectedIndex > index ? selectedIndex - 1 : selectedIndex)
  update(next => {
    next.tiles.splice(index, 1)
    next.melds = next.melds.map(meld => ({ ...meld, tileIndices: (meld.tileIndices ?? []).map(tileIndex => tileIndex > index ? tileIndex - 1 : tileIndex) }))
    if (next.winningIndex === index) next.winningIndex = null
    else if (next.winningIndex > index) next.winningIndex--
  })
  showTilePicker.value = true
  nextTick(() => {
    if (!focusFirstEnabled(tilePickerButtons.value)) tileHandTray.value?.focus()
  })
}
function clearTiles() {
  if (showGroupPicker.value) {
    cancelGroupDraft()
  }
  snapshot()
  selection.value = []
  showGroupPicker.value = false
  showTilePicker.value = true
  addingKanReplacement.value = false
  update(next => { next.tiles = []; next.melds = []; next.winningIndex = null; next.doraIndicators = []; next.uraIndicators = []; next.totalBonusHan = 0; next.otherKanCount = 0 })
}
function resetForNewHand() {
  history.value = []
  selection.value = []
  showGroupPicker.value = false
  showTilePicker.value = true
  addingKanReplacement.value = false
}
function restoreAfterUndo(stage = 0) {
  history.value = []
  selection.value = []
  showGroupPicker.value = false
  addingKanReplacement.value = false
  showTilePicker.value = stage === 0 && entry.value.tiles.length < targetCount.value
}
function undo() {
  const previous = history.value.pop()
  if (!previous) return
  const { tileSituation, undoContext, bonusEntryRevision: previousBonusRevision, ...previousEntry } = previous
  const contextChanged = undoContext?.contextRevision !== props.undoContext?.contextRevision
  const preserveCurrentBonusEntry = previousBonusRevision !== bonusEntryRevision.value
  const currentBonusEntry = preserveCurrentBonusEntry
    ? { totalBonusHan: entry.value.totalBonusHan, doraEntryMode: entry.value.doraEntryMode }
    : {}
  const restoresRiichiContext = undoContext?.contextRevision === props.undoContext?.contextRevision
    && tileSituation?.riichi !== undefined
    && tileSituation.riichi !== 'none'
  // Undo restores the tile edit, while table context and bonus mode may have
  // changed since the snapshot. Keep later context changes and restore ura
  // only when the same riichi context is being restored.
  if (!props.riichi && !restoresRiichiContext) previousEntry.uraIndicators = []
  if (contextChanged) previousEntry.otherKanCount = entry.value.otherKanCount
  if (preserveCurrentBonusEntry && entry.value.doraEntryMode === 'total') {
    previousEntry.doraIndicators = entry.value.doraIndicators
    if (!restoresRiichiContext) {
      previousEntry.uraIndicators = props.riichi ? entry.value.uraIndicators : []
    }
  }
  update(next => Object.assign(next, previousEntry, currentBonusEntry))
  selection.value = []
  showGroupPicker.value = false
  addingKanReplacement.value = false
  showTilePicker.value = previousEntry.tiles.length < 14 + previousEntry.melds.filter(meld => meld.type.startsWith('kan')).length
  if (tileSituation || undoContext) emit('restore-tile-situation', { tileSituation, undoContext })
  nextTick(() => focusFirstRemovableTile() || tileHandTray.value?.focus())
}
function setWinning(index) { snapshot(); update(next => { next.winningIndex = index }) }
function useLastTileAndContinue() {
  if (!canUseLastTile.value) return
  setWinning(entry.value.tiles.length - 1)
  emit('next-step')
}
function markGroup(indices) {
  if (!showGroupPicker.value || meldTypeDisabledReason(meldType.value) || !candidateTileSets(meldType.value).some(candidate => candidate.length === indices.length && candidate.every((index, position) => index === indices[position]))) return
  selection.value = [...indices]
  confirmGroup()
}
function toggleGroupPicker() {
  if (showGroupPicker.value) {
    cancelGroupDraft()
    nextTick(() => groupTriggerButton.value?.focus())
    return
  }
  showGroupPicker.value = true
  selection.value = []
  const firstCompatible = meldTypes.find(type => !meldTypeDisabledReason(type.id))
  if (firstCompatible) meldType.value = firstCompatible.id
}
function cancelGroupDraft() {
  selection.value = []
  showGroupPicker.value = false
  nextTick(() => groupTriggerButton.value?.focus())
}
function chooseMeld(type) { meldType.value = type; selection.value = [] }
function clearGroupSelection() {
  selection.value = []
  nextTick(() => focusFirstRemovableTile() || groupTriggerButton.value?.focus())
}
function toggleSelection(index) {
  if (!canSelectTile(index)) return
  if (selection.value.includes(index)) {
    selection.value = selection.value.filter(item => item !== index)
    return
  }
  if (selection.value.length >= groupSelectionTarget.value) return
  const autoMatch = meldType.value !== 'chi' && selection.value.length === 0
  if (!autoMatch) {
    selection.value = [...selection.value, index]
    return
  }
  const candidate = candidateTileSets(meldType.value).find(indices => indices.includes(index))
  if (candidate) selection.value = candidate
}
function groupIsValid(type, tokens) {
  const needed = type === 'chi' || type === 'pon' ? 3 : 4
  if (tokens.length !== needed) return false
  if (type === 'chi') {
    if (tokens.some(token => token[0] === 'h' || token[0] !== tokens[0][0])) return false
    const values = tokens.map(token => Number(tileFace(token)[1])).sort((a, b) => a - b)
    return values[1] === values[0] + 1 && values[2] === values[1] + 1
  }
  return tokens.every(token => tileFace(token) === tileFace(tokens[0]))
}
function confirmGroup() {
  if (!canConfirmGroup.value) return
  snapshot()
  const indices = [...selection.value].sort((a, b) => a - b)
  const tokens = indices.map(index => entry.value.tiles[index])
  update(next => {
    if (meldType.value === 'kan-added') {
      const matchingPonIndex = next.melds.findIndex(meld => meld.type === 'pon' && (meld.tileIndices ?? []).every(tileIndex => indices.includes(tileIndex)))
      if (matchingPonIndex >= 0) {
        next.melds[matchingPonIndex] = { ...next.melds[matchingPonIndex], type: 'kan-added', tokens, tileIndices: indices, calledTileIndex: 0 }
        next.otherKanCount = Math.min(4 - next.melds.filter(meld => meld.type.startsWith('kan')).length, next.otherKanCount ?? 0)
        return
      }
    }
    const meld = { type: meldType.value, tokens, tileIndices: indices }
    if (meldType.value === 'chi' || meldType.value === 'pon' || meldType.value === 'kan-open' || meldType.value === 'kan-added') meld.calledTileIndex = 0
    next.melds.push(meld)
    next.otherKanCount = Math.min(4 - next.melds.filter(group => group.type.startsWith('kan')).length, next.otherKanCount ?? 0)
  })
  selection.value = []
  showGroupPicker.value = false
  nextTick(() => groupTriggerButton.value?.focus())
}
function focusFirstEnabled(buttons) {
  const target = buttons.find(button => button && !button.disabled)
  target?.focus()
  return Boolean(target)
}
function focusFirstRemovableTile() {
  const target = tileHandTray.value?.querySelector('.entered-tile:not(:disabled)')
  target?.focus()
  return Boolean(target)
}
function removeMeld(index) {
  snapshot()
  selection.value = []
  update(next => {
    next.melds.splice(index, 1)
    next.otherKanCount = Math.min(4 - next.melds.filter(group => group.type.startsWith('kan')).length, next.otherKanCount ?? 0)
  })
  showTilePicker.value = true
  nextTick(() => groupTriggerButton.value?.focus())
}
function isTileGrouped(index) { return entry.value.melds.some(meld => (meld.tileIndices ?? []).includes(index)) }
function canSelectTile(index) {
  if (selection.value.includes(index)) return true
  if (index === entry.value.winningIndex || selection.value.length >= groupSelectionTarget.value) return false
  return candidateTileSets(meldType.value).some(indices => indices.includes(index) && selection.value.every(selected => indices.includes(selected)))
}
function meldTypeDisabledReason(type) {
  if (props.playerCount === 3 && type === 'chi') return 'Not used in 3-player'
  if (entry.value.melds.length >= 4 && type !== 'kan-added') return 'Four groups already marked'
  if (!hasGroupCandidate(type)) return type === 'kan-added' ? 'No four matching tiles available' : 'No matching tiles available'
  return ''
}
function hasGroupCandidate(type) {
  return candidateTileSets(type).length > 0
}
function candidateTileSets(type) {
  const ponIndices = new Set(existingPonGroups.value.flatMap(meld => meld.tileIndices ?? []))
  const unavailable = new Set(entry.value.melds.flatMap(meld => meld.tileIndices ?? []))
  const indices = entry.value.tiles.map((_, index) => index).filter(index => {
    if (index === entry.value.winningIndex) return false
    if (!unavailable.has(index)) return true
    return type === 'kan-added' && ponIndices.has(index)
  })
  const size = type === 'chi' || type === 'pon' ? 3 : 4
  const candidates = []
  function collect(start, picked) {
    if (picked.length === size) {
      const tokens = picked.map(index => entry.value.tiles[index])
      if (!groupIsValid(type, tokens)) return
      if (type === 'kan-added') {
        const selectedPonGroups = existingPonGroups.value.filter(meld => (meld.tileIndices ?? []).some(index => picked.includes(index)))
        if (selectedPonGroups.length > 1) return
        if (selectedPonGroups.length === 1 && !(selectedPonGroups[0].tileIndices ?? []).every(index => picked.includes(index))) return
        if (entry.value.melds.length >= 4 && selectedPonGroups.length !== 1) return
      }
      candidates.push(picked)
      return
    }
    for (let i = start; i <= indices.length - (size - picked.length); i++) collect(i + 1, [...picked, indices[i]])
  }
  collect(0, [])
  return candidates
}
function meldLabel(type) { return meldTypes.find(option => option.id === type)?.label ?? 'Group' }
</script>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.section-heading { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.section-heading h2 { margin: 0; color: var(--matcha-leaf); font-size: 1.08rem; letter-spacing: -.015em; }
.section-heading p { margin: 4px 0 0; color: var(--muted); font-size: .78rem; line-height: 1.45; }
.tile-entry-help { margin: 11px 0 0; }
.tile-entry-help summary { min-height: 36px; display: flex; align-items: center; color: var(--matcha-leaf); font-size: .75rem; font-weight: 700; cursor: pointer; }
.tile-entry-help p { margin: 2px 0 8px; color: var(--muted); font-size: .76rem; line-height: 1.45; }
.clear-tile-entry { margin: 0 0 8px; }
.step-number { display: grid; flex: 0 0 28px; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: var(--matcha-leaf); color: white; font-size: .75rem; font-weight: 750; }
.tile-entry-count { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; }
.tile-entry-count strong { margin-right: auto; color: var(--matcha-leaf); font-size: .82rem; }
.tile-entry-count .reset-button { min-height: 40px; padding-inline: 8px; }
.tile-entry-count .mobile-new-hand { display: none; }
.tile-entry-extra-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; }
.tile-entry-extra-actions .field-hint { flex-basis: 100%; margin: 0; }
.tile-hand-entry { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 4px; min-height: 58px; align-items: center; padding: 7px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); scroll-margin-top: 100px; }
.entered-tile { position: relative; min-width: 0; min-height: 52px; padding: 2px; border: 1px solid var(--line); border-radius: 5px; background: var(--white-pure); cursor: pointer; }
.entered-tile img { display: block; width: 100%; height: 45px; object-fit: contain; }
.entered-tile > span { position: absolute; inset: -5px -3px auto auto; display: grid; width: 18px; height: 18px; place-items: center; border-radius: 50%; background: var(--clay-text); color: white; font-size: 13px; line-height: 1; }
.entered-tile > .entered-tile-group { inset: auto 1px 1px; display: block; width: auto; padding: 1px 2px; border-radius: 3px; background: #edf1e9; color: var(--matcha-leaf); font-size: .48rem; font-weight: 750; line-height: 1.2; text-align: center; }
.entered-tile > .entered-tile-win { inset: -5px auto auto -3px; width: auto; min-width: 26px; padding: 2px 4px; border: 1px solid white; background: var(--gold-leaf); color: #302a1d; font-size: .58rem; font-weight: 800; line-height: 1.15; }
.entered-tile.tile-winning { outline: 2px solid var(--gold-leaf); outline-offset: 1px; }
.entered-tile.tile-marked { outline: 2px solid var(--gold-leaf); outline-offset: 1px; background: #f3ead4; }
.entered-tile.tile-in-group { opacity: .55; cursor: not-allowed; }
.tile-hand-readonly .entered-tile { cursor: pointer; }
.tile-entry-empty { grid-column: 1 / -1; padding: 15px 7px; color: var(--muted); font-size: .78rem; text-align: center; }
.tile-suit-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; margin: 11px 0 8px; }
.tile-suit-tabs .choice-button { min-height: 44px; padding-inline: 4px; font-size: .72rem; }
.tile-picker-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(52px, 1fr)); gap: 6px; }
.tile-picker-button { position: relative; min-width: 0; min-height: 72px; display: grid; justify-items: center; align-content: center; gap: 1px; padding: 4px; border: 1px solid var(--line); border-radius: 7px; background: var(--white-pure); cursor: pointer; }
.tile-count-badge { position: absolute; top: 2px; right: 3px; z-index: 1; min-width: 17px; padding: 1px 3px; border-radius: 8px; background: #edf1e9; color: var(--matcha-leaf); font-size: .62rem; font-weight: 750; line-height: 1.25; text-align: center; }
.tile-picker-button img { display: block; width: 29px; height: 39px; aspect-ratio: 3 / 4; object-fit: contain; }
.tile-picker-button small { color: var(--muted); font-size: .75rem; line-height: 1.2; text-align: center; }
.tile-picker-button:disabled { opacity: .35; cursor: not-allowed; }
.aka-toggle { margin-top: 8px; }
.tile-melds { display: grid; gap: 7px; margin-top: 10px; }
.tile-meld-row { display: flex; align-items: center; gap: 9px; min-width: 0; padding: 6px 8px; border: 1px solid var(--line); border-radius: 7px; background: var(--white-pure); }
.tile-meld-row > strong { flex: 1; min-width: 0; color: var(--matcha-leaf); font-size: .78rem; }
.tile-meld-row .group-tile-samples { margin: 0; }
.tile-group-builder { margin-top: 11px; }
.group-selection-actions { display: flex; align-items: center; gap: 8px; }
.group-selection-count { margin-right: auto; color: var(--muted); font-size: .74rem; font-weight: 650; }
.add-tile-group { width: 100%; min-height: 52px; padding: 8px 12px; border: 1px solid var(--matcha-leaf); border-radius: 8px; background: #edf1e9; color: var(--matcha-leaf); font: inherit; font-size: .84rem; font-weight: 750; text-align: left; cursor: pointer; }
.tile-group-type-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.meld-shortcuts { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px; }
.meld-shortcut { display: grid; justify-items: center; align-content: center; gap: 4px; min-height: 64px; padding: 8px; border: 1px solid var(--line); border-radius: 7px; background: var(--white-pure); color: var(--matcha-leaf); font: inherit; font-size: .78rem; cursor: pointer; }
.meld-shortcut:hover { border-color: var(--matcha-leaf); background: #edf1e9; }
.meld-shortcut:focus-visible { outline: 2px solid var(--matcha-leaf); outline-offset: 2px; }
.group-type-option { min-width: 0; min-height: 78px; display: grid; grid-template-columns: minmax(0, 1fr); justify-items: center; align-content: center; gap: 4px; padding: 7px; border: 1px solid var(--line); border-radius: 7px; background: var(--white-pure); color: var(--clay-text); text-align: center; cursor: pointer; }
.group-type-option.selected { border-color: var(--matcha-leaf); background: #edf1e9; color: var(--matcha-leaf); }
.group-type-option:disabled { opacity: .5; cursor: not-allowed; }
.group-disabled-reason { color: var(--muted); font-size: .68rem; line-height: 1.3; }
.group-type-option strong { font-size: .73rem; line-height: 1.3; }
.group-type-example { display: inline-flex; align-items: flex-end; justify-content: center; gap: 1px; min-height: 28px; }
.group-type-example img, .group-type-example .tile-back { display: block; width: 20px; height: 28px; object-fit: contain; }
.group-type-example .tile-back { flex: 0 0 auto; border: 1px solid #536c58; border-radius: 2px; background: repeating-linear-gradient(135deg, #93a78b 0 2px, #849b7d 2px 4px); box-shadow: inset 0 0 0 2px #f7f5eb; }
.group-type-help, .group-type-prompt { margin: 5px 0 8px; color: var(--muted); font-size: .76rem; line-height: 1.4; }
.winning-tile-next { display: block; width: 100%; min-height: 42px; margin-top: 6px; padding: 7px 10px; border: 1px dashed var(--matcha-leaf); border-radius: 7px; background: #f5f7f2; color: var(--matcha-leaf); font-size: .74rem; font-weight: 650; cursor: pointer; }
.winning-tile-next[aria-pressed="true"] { border-style: solid; background: #edf1e9; }
.confirm-tile-group { flex: 1; min-height: 44px; margin: 0; }
.tile-step-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 13px; }
.last-tile-shortcut { display: flex; align-items: center; justify-content: center; gap: 8px; }
.last-tile-shortcut img { flex: 0 0 auto; width: 25px; height: 34px; object-fit: contain; }
.tile-step-actions .next-step-button { min-width: min(100%, 220px); }
.field-problems { margin: 9px 0 0; color: #823f38; font-size: .78rem; }
.field-label { display: block; margin: 12px 0 5px; color: var(--clay-text); font-size: .76rem; font-weight: 700; }
.field-label small { display: block; margin-top: 2px; color: var(--muted); font-size: .68rem; font-weight: 500; }
.field-hint { margin: 7px 0; color: var(--muted); font-size: .74rem; line-height: 1.45; }
.choice-button, .reset-button, .next-step-button { min-height: 44px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--white-pure); color: var(--clay-text); font: inherit; font-size: .74rem; font-weight: 650; cursor: pointer; }
.choice-button.selected { border-color: var(--matcha-leaf); background: #edf1e9; color: var(--matcha-leaf); }
.choice-button:disabled, .reset-button:disabled, .next-step-button:disabled { opacity: .5; cursor: not-allowed; }
.choice-button:focus-visible, .group-type-option:focus-visible, .reset-button:focus-visible, .next-step-button:focus-visible, .entered-tile:focus-visible, .tile-picker-button:focus-visible, .add-tile-group:focus-visible, .remove-group:focus-visible { outline: 2px solid var(--matcha-leaf); outline-offset: 2px; }
.reset-button { min-height: 40px; color: var(--matcha-leaf); }
.next-step-button { background: var(--matcha-leaf); color: white; font-weight: 750; }
.bonus-entry-modes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 6px; }
.automatic-red-dora { margin: 7px 0 3px; color: var(--matcha-leaf); font-size: .74rem; font-weight: 650; }
.stepper { display: flex; align-items: center; width: fit-content; min-height: 44px; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; }
.stepper button { width: 44px; height: 44px; border: 0; background: var(--surface-soft); color: var(--matcha-leaf); font: 600 1.1rem var(--font-body); cursor: pointer; }
.stepper button:disabled { opacity: .4; cursor: not-allowed; }
.stepper input { width: 64px; height: 44px; padding: 4px; border: 0; border-radius: 0; background: white; color: var(--clay-text); text-align: center; font-size: 16px; font-variant-numeric: tabular-nums; }
.stepper input::-webkit-inner-spin-button, .stepper input::-webkit-outer-spin-button { appearance: none; margin: 0; }
.stepper input[type=number] { appearance: textfield; }
.stepper button:focus-visible, .stepper input:focus-visible { position: relative; outline: 2px solid var(--matcha-leaf); outline-offset: -2px; }
.indicator-kan-stepper { gap: 0; margin-top: 8px; }
.indicator-kan-label { padding: 0 10px; color: var(--clay-text); font-size: .74rem; font-weight: 650; }
.indicator-kan-count { display: grid; width: 38px; height: 44px; place-items: center; background: white; color: var(--clay-text); font-variant-numeric: tabular-nums; }
.indicator-kan-hint { margin: 4px 0 0; }
.checkbox-row { display: flex; align-items: flex-start; gap: 8px; margin-top: 8px; color: var(--clay-text); font-size: .76rem; line-height: 1.4; }
.checkbox-row input { flex: 0 0 auto; width: 18px; height: 18px; margin: 0; accent-color: var(--matcha-leaf); }
.tile-select { display: block; width: 100%; min-height: 44px; margin-top: 5px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--white-pure); color: var(--clay-text); font: inherit; font-size: 16px; }
.group-tile-samples { display: inline-flex; align-items: flex-end; gap: 2px; min-height: 28px; }
.group-tile-samples img { display: block; width: 18px; height: 26px; object-fit: contain; }
.group-tile-samples .tile-back { display: block; width: 18px; height: 26px; flex: 0 0 auto; border: 1px solid #536c58; border-radius: 2px; background: repeating-linear-gradient(135deg, #93a78b 0 2px, #849b7d 2px 4px); box-shadow: inset 0 0 0 2px #f7f5eb; }
.remove-group { flex: 0 0 auto; min-width: 58px; height: 40px; padding: 0 7px; border: 1px solid var(--line); border-radius: 7px; background: white; color: #824249; font-size: .68rem; font-weight: 700; cursor: pointer; }
.remove-group:disabled { opacity: .5; cursor: not-allowed; }
.add-tile-group { text-align: left; }
.add-tile-group:disabled { opacity: .55; cursor: not-allowed; }
.tile-indicators { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); scroll-margin-top: 130px; }
.indicator-examples { display: grid; gap: 2px; margin: 7px 0 10px; }
.indicator-example { display: flex; align-items: center; gap: 6px; min-height: 34px; margin: 0; color: var(--muted); font-size: .68rem; }
.indicator-example > span:first-child { min-width: 112px; }
.indicator-example img { width: 20px; height: 28px; object-fit: contain; }
.indicator-back { display: block; width: 20px; height: 28px; flex: 0 0 auto; border: 1px solid #536c58; border-radius: 3px; background: repeating-linear-gradient(135deg, #93a78b 0 2px, #849b7d 2px 4px); box-shadow: inset 0 0 0 2px #f7f5eb; }
.indicator-list { display: grid; grid-template-columns: 62px minmax(0, 1fr); align-items: center; gap: 7px; min-height: 40px; color: var(--muted); font-size: .74rem; }
.indicator-list .group-tile-samples { flex-wrap: wrap; }
.indicator-list .group-tile-samples .field-hint { margin: 0; }
.indicator-category-label { align-self: center; margin-left: 3px; color: var(--matcha-leaf); font-size: .64rem; font-weight: 750; }
.indicator-stage-actions { display: flex; flex-wrap: wrap; margin: 5px 0 8px; }
.indicator-complete { align-self: center; flex: 1 1 100%; margin: 0 0 4px; color: var(--matcha-leaf); font-weight: 700; }
.indicator-active-target { margin-top: 9px; }
.indicator-tile { position: relative; display: grid; flex: 0 0 44px; width: 44px; height: 48px; place-items: center; padding: 2px; border: 1px solid var(--line); border-radius: 5px; background: white; cursor: pointer; }
.indicator-tile img { display: block; width: 28px; height: 39px; object-fit: contain; }
.indicator-tile > span { position: absolute; inset: -6px -6px auto auto; display: grid; width: 22px; height: 22px; place-items: center; border: 1px solid var(--line); border-radius: 50%; background: white; color: #824249; font-size: .85rem; line-height: 1; }
.tile-step-actions { width: 100%; }
.tile-step-actions .next-step-button { width: 100%; }
@media (max-width: 760px) {
  .tile-entry-section { scroll-margin-top: 88px; }
  .tile-indicators { scroll-margin-top: 88px; }
  .tile-entry-section > .section-heading { margin-bottom: 7px; }
  .tile-entry-count { gap: 4px; margin-bottom: 6px; }
  .tile-entry-empty { padding: 8px 6px; }
  .tile-entry-count .mobile-new-hand { display: inline-flex; }
  .tile-hand-entry { min-height: 112px; align-content: start; }
  .tile-hand-entry.tile-hand-empty { min-height: 112px; }
  .tile-hand-readonly .entered-tile { min-height: 46px; }
  .tile-hand-readonly .entered-tile img { width: 28px; height: 37px; margin-inline: auto; }
  .tile-picker-grid { padding: 6px; border: 1px solid var(--line); border-radius: 9px; background: rgb(255 255 255 / 97%); }
  .tile-result-visible .group-selection-actions { bottom: calc(var(--mobile-result-panel-height, 0px) + 16px + env(safe-area-inset-bottom)); }
  .group-selection-actions { position: sticky; bottom: calc(8px + env(safe-area-inset-bottom)); z-index: 3; justify-content: space-between; padding: 7px; border: 1px solid var(--line); border-radius: 8px; background: var(--white-pure); box-shadow: 0 3px 12px rgb(39 49 39 / 14%); }
  .group-selection-actions .reset-button { flex: 0 0 auto; }
  .tile-group-builder { margin-top: 5px; }
  .group-selection-hint { margin: 7px 0; }
}
@media (max-width: 380px) {
  .tile-hand-readonly .entered-tile img { width: 25px; height: 34px; }
  .indicator-example { gap: 4px; font-size: .62rem; }
  .indicator-example > span:first-child { min-width: 100px; }
  .tile-suit-tabs { gap: 3px; }
  .tile-suit-tabs .choice-button { font-size: .75rem; }
  .tile-picker-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
  .tile-picker-button small { max-width: 100%; font-size: .72rem; overflow-wrap: anywhere; }
}
</style>
