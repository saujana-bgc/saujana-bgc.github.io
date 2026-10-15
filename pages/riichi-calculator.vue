<template>
  <main class="calculator-page">
    <header class="calculator-heading">
      <p class="page-eyebrow">A quick table-side guide</p>
      <h1 class="hero-title">Riichi calculator</h1>
      <p>Choose your yaku, enter bonus han and answer a few questions to see the payment.</p>
    </header>

    <div class="calculator-layout">
      <aside class="result-panel" :class="{ 'result-ready': resultReady }" aria-labelledby="result-heading" aria-live="polite">
        <div class="result-inner">
          <div class="result-heading-row"><span id="result-heading" class="result-kicker">Your score</span><button type="button" class="reset-button" @click="resetCalculator">Start again</button></div>
          <div v-if="resultReady" class="result-amount">
            <span>{{ form.winType === 'ron' ? 'Discarder pays' : 'Total from the table' }}</span>
            <strong>{{ formatPoints(result.points) }}</strong>
            <p v-if="result.riichiSticks">+ {{ formatPoints(result.riichiSticks) }} riichi sticks</p>
            <p v-if="result.riichiSticks" class="received-total">You receive <strong>{{ formatPoints(result.totalReceived) }}</strong></p>
          </div>
          <div v-else class="result-empty">
            <span class="result-mark" aria-hidden="true">?</span>
            <p>{{ result.issues.length ? 'Fix the details below to see your score.' : 'Select at least one yaku to see your score.' }}</p>
          </div>

          <template v-if="resultReady">
            <div class="score-summary">
              <div class="score-metric"><span>Han</span><strong>{{ result.han }}<small> han</small></strong></div>
              <div class="score-metric"><span>Fu</span><strong>{{ result.isYakuman ? '—' : result.fu }}<small v-if="result.isYakuman">not needed</small></strong></div>
              <div v-if="result.handName" class="limit-badge">{{ limitName(result.handName) }}</div>
              <p v-if="result.yakumanUnits > 1" class="yakuman-note">{{ result.yakumanUnits }} yakuman units</p>
            </div>

            <div v-if="result.tsumo" class="payment-list">
              <h3>Each opponent pays</h3>
              <p v-if="form.isDealer"><span>Each non-dealer</span><strong>{{ formatPoints(result.tsumo.nonDealerPays) }}</strong></p>
              <template v-else>
                <p><span>Dealer</span><strong>{{ formatPoints(result.tsumo.dealerPays) }}</strong></p>
                <p><span>Other non-dealers</span><strong>{{ formatPoints(result.tsumo.nonDealerPays) }}</strong></p>
              </template>
            </div>
            <div v-if="result.fuBreakdown" class="fu-breakdown">
              <h3>Fu breakdown <span>{{ result.fu }} total</span></h3>
              <p v-for="line in fuLines" :key="line.label"><span>{{ line.label }}</span><strong>+{{ line.fu }}</strong></p>
            </div>
            <div class="result-yaku"><h3>Han breakdown</h3><p v-for="yaku in result.yaku" :key="yaku.id"><span>{{ yaku.name }}</span><strong>{{ yaku.han }}</strong></p><p v-if="result.bonusHan"><span>Bonus dora</span><strong>{{ result.bonusHan }}</strong></p></div>
            <p class="score-note">{{ form.winType === 'ron' ? 'The discarder pays the hand.' : 'Payments are rounded up to the next 100.' }} <template v-if="form.honba">Includes {{ form.honba }} honba.</template></p>
          </template>
          <p v-if="!resultReady && shouldShowProblems" class="result-help">{{ result.issues[0] }}</p>
        </div>
      </aside>

      <form class="calculator-form" aria-label="Riichi hand details" @submit.prevent>
        <section class="calc-section" aria-labelledby="win-heading">
          <div class="section-heading">
            <span class="step-number">1</span>
            <div>
              <h2 id="win-heading">How did you win?</h2>
              <p>These details set your seat bonuses and payment.</p>
            </div>
          </div>

          <div class="choice-row" role="group" aria-label="Winning method">
            <button v-for="option in winOptions" :key="option.id" type="button" class="choice-button" :class="{ selected: form.winType === option.id }" :aria-pressed="form.winType === option.id" @click="form.winType = option.id">
              {{ option.label }}
            </button>
          </div>

          <div class="choice-row" role="group" aria-label="Your seat wind">
            <button v-for="option in availableSeatWinds" :key="option.id" type="button" class="choice-button" :class="{ selected: form.seatWind === option.id }" :aria-pressed="form.seatWind === option.id" @click="form.seatWind = option.id">
              <span>{{ option.label }}</span><small v-if="option.id === 'east'">Dealer</small>
            </button>
          </div>
          <div class="choice-row" role="group" aria-label="Round wind">
            <button v-for="option in availableRoundWinds" :key="option.id" type="button" class="choice-button" :class="{ selected: form.roundWind === option.id }" :aria-pressed="form.roundWind === option.id" @click="form.roundWind = option.id">
              {{ option.label }} round
            </button>
          </div>

          <div class="hand-mode-row">
            <div>
              <span class="field-label">Table</span>
              <p class="field-hint">Changes available winds and optional North bonus.</p>
            </div>
            <div class="choice-row compact-choice" role="group" aria-label="Players at the table">
              <button type="button" class="choice-button" :class="{ selected: form.playerCount === 4 }" :aria-pressed="form.playerCount === 4" @click="form.playerCount = 4">Four player</button>
              <button type="button" class="choice-button" :class="{ selected: form.playerCount === 3 }" :aria-pressed="form.playerCount === 3" @click="form.playerCount = 3">Three player</button>
            </div>
          </div>
        </section>

        <section class="calc-section" aria-labelledby="yaku-heading">
          <div class="section-heading">
            <span class="step-number">2</span>
            <div>
              <h2 id="yaku-heading">Select your yaku</h2>
              <p>Tap each yaku that applies. Common yaku are open; tap a group for the rest. Han shown for a {{ isClosed ? 'closed' : 'open' }} hand.</p>
            </div>
          </div>

          <label class="search-field">
            <span class="sr-only">Find a yaku</span>
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg>
            <input v-model="yakuSearch" type="search" placeholder="Find a yaku…" autocomplete="off" />
          </label>

          <div v-if="automaticYaku.length" class="automatic-yaku" aria-live="polite">
            <span>Automatically included</span>
            <strong v-for="yaku in automaticYaku" :key="yaku.id">{{ yaku.name }} <small>+{{ yaku.han }}</small></strong>
          </div>

          <div class="yaku-groups">
            <details v-for="category in visibleCategories" :key="category.id" class="yaku-category" :open="isYakuCategoryOpen(category.id)" @toggle="toggleYakuCategory(category.id, $event)">
              <summary :id="`category-${category.id}`"><span>{{ category.label }}</span><small>{{ categorySummary(category.id) }}</small></summary>
              <div class="yaku-grid">
                <button v-for="yaku in yakuByCategory[category.id]" :key="yaku.id" type="button" class="yaku-option" :class="{ 'yaku-selected': isSelected(yaku.id), 'yaku-disabled': isDisabled(yaku.id) }" :aria-pressed="isSelected(yaku.id)" :disabled="!isSelected(yaku.id) && isDisabled(yaku.id)" :aria-describedby="`yaku-detail-${yaku.id}`" @click="toggleYaku(yaku.id)">
                  <span class="yaku-check" aria-hidden="true">{{ isSelected(yaku.id) ? '✓' : '+' }}</span>
                  <span class="yaku-copy">
                    <strong>{{ yaku.name }}</strong>
                    <small :id="`yaku-detail-${yaku.id}`">{{ yaku.detail }}</small>
                  </span>
                  <span class="yaku-han">{{ yakuHanLabel(yaku) }}</span>
                </button>
              </div>
            </details>
            <p v-if="yakuSearch && !filteredYaku.length" class="empty-search">No yaku match that search.</p>
          </div>

          <div v-if="form.handShape === 'standard' && form.selectedYaku.includes('pinfu')" class="shape-confirmation">
            <label class="checkbox-row">
              <input v-model="form.allSequencesConfirmed" type="checkbox" />
              <span>For Pinfu: I confirm all four groups are runs.</span>
            </label>
          </div>

          <div class="hand-shape-field">
            <span class="field-label">Hand shape</span>
            <div class="choice-row" role="group" aria-label="Hand shape">
              <button v-for="shape in handShapes" :key="shape.id" type="button" class="choice-button" :class="{ selected: form.handShape === shape.id }" :aria-pressed="form.handShape === shape.id" @click="setHandShape(shape.id)">{{ shape.label }}</button>
            </div>
          </div>

          <div v-if="selectedYakuman.length" class="variant-panel">
            <h3>Special waits</h3>
            <p class="field-hint">These waits double the matching yakuman on the cheat sheet.</p>
            <label v-if="form.selectedYaku.includes('kokushi')" class="checkbox-row">
              <input v-model="form.doubleYakumanWaits.kokushi" type="checkbox" @change="form.waitType = form.doubleYakumanWaits.kokushi ? 'kokushi-thirteen' : null" />
              <span>Kokushi: thirteen-sided wait <strong>(double yakuman)</strong></span>
            </label>
            <label v-if="form.selectedYaku.includes('suuankou')" class="checkbox-row">
              <input v-model="form.doubleYakumanWaits.suuankou" type="checkbox" @change="form.waitType = form.doubleYakumanWaits.suuankou ? 'tanki' : null" />
              <span>Suuankou: wait on the pair <strong>(double yakuman)</strong></span>
            </label>
            <label v-if="form.selectedYaku.includes('chuuren')" class="checkbox-row">
              <input v-model="form.doubleYakumanWaits.chuuren" type="checkbox" @change="form.waitType = form.doubleYakumanWaits.chuuren ? 'chuuren-nine' : null" />
              <span>Pure Nine Gates: nine-sided wait <strong>(double yakuman)</strong></span>
            </label>
          </div>
        </section>

        <section class="calc-section" aria-labelledby="dora-heading">
          <div class="section-heading">
            <span class="step-number">3</span>
            <div>
              <h2 id="dora-heading">Add bonus han</h2>
              <p>Count the dora tiles in your winning hand, not the indicators.</p>
            </div>
          </div>
          <div class="bonus-grid">
            <div v-for="bonus in bonusFields" :key="bonus.id" class="bonus-control">
              <div class="bonus-copy"><label :for="`bonus-${bonus.id}`">{{ bonus.label }}</label><span>{{ bonus.hint }}</span></div>
              <div class="stepper" role="group" :aria-label="bonus.label">
                <button type="button" :aria-label="`Remove one ${bonus.label.toLowerCase()}`" :disabled="form.bonusHan[bonus.id] <= 0 || (bonus.id === 'ura' && !canUseUra)" @click="adjustBonus(bonus.id, -1)">−</button>
                <input :id="`bonus-${bonus.id}`" v-model.number="form.bonusHan[bonus.id]" type="number" inputmode="numeric" min="0" step="1" :disabled="bonus.id === 'ura' && !canUseUra" :aria-describedby="bonus.id === 'ura' && !canUseUra ? 'ura-hint' : undefined" @change="sanitizeBonus(bonus.id)" />
                <button type="button" :aria-label="`Add one ${bonus.label.toLowerCase()}`" :disabled="bonus.id === 'ura' && !canUseUra" @click="adjustBonus(bonus.id, 1)">+</button>
              </div>
              <small v-if="bonus.id === 'ura' && !canUseUra" id="ura-hint" class="bonus-note">Riichi in a closed hand is needed.</small>
            </div>
            <div v-if="form.playerCount === 3" class="bonus-control">
              <div class="bonus-copy"><label for="bonus-nuki">North bonus tiles</label><span>One han per declared North tile</span></div>
              <div class="stepper" role="group" aria-label="North bonus tiles">
                <button type="button" aria-label="Remove one North bonus tile" :disabled="form.bonusHan.nuki <= 0" @click="adjustBonus('nuki', -1)">−</button>
                <input id="bonus-nuki" v-model.number="form.bonusHan.nuki" type="number" inputmode="numeric" min="0" max="4" step="1" @change="sanitizeBonus('nuki', 4)" />
                <button type="button" aria-label="Add one North bonus tile" :disabled="form.bonusHan.nuki >= 4" @click="adjustBonus('nuki', 1, 4)">+</button>
              </div>
            </div>
            <div class="bonus-control bonus-count">
              <div class="bonus-copy"><span>Total bonus han</span><span>Dora cannot make a hand valid on its own.</span></div>
              <strong>{{ result.bonusHan }}</strong>
            </div>
          </div>
        </section>

        <section v-if="needsFuQuestions" class="calc-section" aria-labelledby="fu-heading">
          <div class="section-heading">
            <span class="step-number">4</span>
            <div>
              <h2 id="fu-heading">Count your fu</h2>
              <p>Choose the pair and winning wait. Add each triplet or kan; runs are worth no fu.</p>
            </div>
          </div>

          <div class="fu-field">
            <span class="field-label">Your pair</span>
            <div class="choice-row fu-choice-grid" role="group" aria-label="Pair type">
              <button v-for="pair in availablePairOptions" :key="pair.id" type="button" class="choice-button" :class="{ selected: form.pairChoice === pair.id }" :aria-pressed="form.pairChoice === pair.id" @click="form.pairChoice = pair.id">{{ pair.label }} <small>+{{ pair.fu }} fu</small></button>
            </div>
            <p class="field-hint">A pair that is both your seat wind and round wind is 4 fu on this sheet.</p>
          </div>

          <div class="fu-field">
            <span class="field-label">Winning wait</span>
            <div class="choice-row fu-choice-grid" role="group" aria-label="Winning wait">
              <button v-for="wait in visibleWaits" :key="wait.id" type="button" class="choice-button" :class="{ selected: form.waitType === wait.id }" :aria-pressed="form.waitType === wait.id" @click="form.waitType = wait.id">{{ wait.label }} <small>{{ wait.fu ? `+${wait.fu} fu` : 'no wait fu' }}</small></button>
            </div>
          </div>

          <div v-if="form.handShape === 'standard'" class="fu-field group-builder">
            <div class="field-heading-row"><div><span class="field-label">Triplets and kans</span><p class="field-hint">Add up to four groups. A winning triplet on ron counts as open for fu only.</p></div><span class="group-count">{{ form.groups.length }} / 4</span></div>
            <div v-if="form.groups.length" class="group-list">
              <div v-for="(group, index) in form.groups" :key="group.id" class="group-row">
                <div><strong>{{ groupName(group) }}</strong><small>{{ groupFu(group) }} fu</small></div>
                <label v-if="form.winType === 'ron' && form.waitType === 'shanpon' && group.type === 'triplet' && group.concealed" class="winning-group"><input v-model="group.completedByRon" type="checkbox" /><span>Won on this triplet</span></label>
                <button type="button" class="remove-group" :aria-label="`Remove ${groupName(group)}`" @click="form.groups.splice(index, 1)">×</button>
              </div>
            </div>
            <details v-if="form.groups.length < 4" class="add-group-menu">
              <summary>Add a group</summary>
              <div class="group-option-grid">
                <button v-for="option in groupOptions" :key="option.id" type="button" @click="addGroup(option)"><strong>{{ option.label }}</strong><span>{{ option.detail }}</span><b>+{{ option.fu }} fu</b></button>
              </div>
            </details>
            <p v-else class="field-hint">That’s all four groups. Runs don’t need to be entered.</p>
          </div>
        </section>

        <details class="advanced-settings">
          <summary>More scoring details</summary>
          <div class="advanced-content">
            <div class="bonus-control">
              <div class="bonus-copy"><label for="honba-count">Honba on the table</label><span>+300 on ron, or +100 per player on tsumo</span></div>
              <div class="stepper" role="group" aria-label="Honba">
                <button type="button" aria-label="Remove one honba" :disabled="form.honba <= 0" @click="form.honba = Math.max(0, form.honba - 1)">−</button>
                <input id="honba-count" v-model.number="form.honba" type="number" inputmode="numeric" min="0" step="1" @change="form.honba = integerAtLeastZero(form.honba)" />
                <button type="button" aria-label="Add one honba" @click="form.honba += 1">+</button>
              </div>
            </div>
            <div class="bonus-control">
              <div class="bonus-copy"><label for="riichi-sticks">Riichi sticks you receive</label><span>Added to your winnings at 1,000 points per stick</span></div>
              <div class="stepper" role="group" aria-label="Riichi sticks">
                <button type="button" aria-label="Remove one riichi stick" :disabled="form.riichiSticks <= 0" @click="form.riichiSticks = Math.max(0, form.riichiSticks - 1)">−</button>
                <input id="riichi-sticks" v-model.number="form.riichiSticks" type="number" inputmode="numeric" min="0" step="1" @change="form.riichiSticks = integerAtLeastZero(form.riichiSticks)" />
                <button type="button" aria-label="Add one riichi stick" @click="form.riichiSticks += 1">+</button>
              </div>
            </div>
            <p>The Saujana table uses kiriage mangan off, and 4 fu for a double-wind pair. Riichi sticks go to the winner; other players pay the hand and any honba.</p>
          </div>
        </details>

        <section v-if="shouldShowProblems" class="validation-box" aria-live="polite" aria-labelledby="validation-heading">
          <h2 id="validation-heading">A few details to check</h2>
          <ul><li v-for="issue in result.issues" :key="issue">{{ issue }}</li></ul>
        </section>
      </form>
    </div>
  </main>
</template>

<script setup>
import { MANUAL_YAKU, calculateManualScore } from '~/utils/scoring/manual'

useHead({
  title: 'Riichi Calculator | Saujana BGC',
  meta: [{ name: 'description', content: 'Quickly estimate riichi mahjong han, fu and payments for ron or tsumo.' }],
})

const categories = [
  { id: 'common', label: 'Everyday yaku' },
  { id: 'two-han', label: 'Two-han yaku' },
  { id: 'three-han', label: 'Three-han yaku' },
  { id: 'five-han', label: 'Five-han yaku' },
  { id: 'six-han', label: 'Six-han yaku' },
  { id: 'yakuman', label: 'Yakuman' },
]

const winOptions = [
  { id: 'ron', label: 'Ron · from a discard' },
  { id: 'tsumo', label: 'Tsumo · self-drawn' },
]
const handShapes = [
  { id: 'standard', label: 'Four groups and a pair' },
  { id: 'chiitoitsu', label: 'Seven pairs' },
  { id: 'kokushi', label: 'Thirteen orphans' },
]
const pairOptions = [
  { id: 'simple', label: 'Number tile', fu: 0 },
  { id: 'non-value-wind', label: 'Non-value wind', fu: 0 },
  { id: 'dragon', label: 'Dragon', fu: 2 },
  { id: 'seat-wind', label: 'Seat wind', fu: 2 },
  { id: 'round-wind', label: 'Round wind', fu: 2 },
  { id: 'double-wind', label: 'Seat + round wind', fu: 4 },
]
const waits = [
  { id: 'ryanmen', label: 'Two-sided', fu: 0 },
  { id: 'penchan', label: 'Edge', fu: 2 },
  { id: 'kanchan', label: 'Middle', fu: 2 },
  { id: 'tanki', label: 'Pair', fu: 2 },
  { id: 'shanpon', label: 'Triplet', fu: 0 },
]
const specialWaits = [
  { id: 'kokushi-thirteen', label: 'Thirteen-sided Kokushi wait', fu: 0 },
  { id: 'chuuren-nine', label: 'Nine-sided pure Nine Gates wait', fu: 0 },
]
const bonusFields = [
  { id: 'dora', label: 'Dora', hint: 'Each tile gives 1 han' },
  { id: 'red', label: 'Red fives', hint: 'Each red tile gives 1 han' },
  { id: 'ura', label: 'Ura dora', hint: 'Only after riichi' },
]
const groupOptions = [
  { id: 'triplet-called-simple', type: 'triplet', tileKind: 'simple', concealed: false, label: 'Called triplet · simple', detail: '2–8 tile · 2 fu' , fu: 2 },
  { id: 'triplet-called-terminal-honor', type: 'triplet', tileKind: 'terminal-honor', concealed: false, label: 'Called triplet · terminal or honour', detail: '1, 9 or honour · 4 fu', fu: 4 },
  { id: 'triplet-concealed-simple', type: 'triplet', tileKind: 'simple', concealed: true, label: 'Concealed triplet · simple', detail: '2–8 tile · 4 fu', fu: 4 },
  { id: 'triplet-concealed-terminal-honor', type: 'triplet', tileKind: 'terminal-honor', concealed: true, label: 'Concealed triplet · terminal or honour', detail: '1, 9 or honour · 8 fu', fu: 8 },
  { id: 'kan-called-simple', type: 'kan', tileKind: 'simple', concealed: false, label: 'Called kan · simple', detail: '2–8 tile · 8 fu', fu: 8 },
  { id: 'kan-called-terminal-honor', type: 'kan', tileKind: 'terminal-honor', concealed: false, label: 'Called kan · terminal or honour', detail: '1, 9 or honour · 16 fu', fu: 16 },
  { id: 'kan-concealed-simple', type: 'kan', tileKind: 'simple', concealed: true, label: 'Concealed kan · simple', detail: '2–8 tile · 16 fu', fu: 16 },
  { id: 'kan-concealed-terminal-honor', type: 'kan', tileKind: 'terminal-honor', concealed: true, label: 'Concealed kan · terminal or honour', detail: '1, 9 or honour · 32 fu', fu: 32 },
]

const initialState = () => ({
  winType: 'ron',
  seatWind: 'south',
  roundWind: 'east',
  playerCount: 4,
  handShape: 'standard',
  selectedYaku: [],
  allSequencesConfirmed: false,
  pairChoice: null,
  waitType: null,
  groups: [],
  riichiDeclared: false,
  bonusHan: { dora: 0, red: 0, ura: 0, nuki: 0 },
  doubleYakumanWaits: { kokushi: false, suuankou: false, chuuren: false },
  honba: 0,
  riichiSticks: 0,
})

const form = reactive(initialState())
const yakuSearch = ref('')
const openYakuCategories = ref(new Set(['common']))
const categoriesBeforeSearch = ref(null)
const hasInteracted = ref(false)
let groupId = 0

const windNames = { east: 'East', south: 'South', west: 'West', north: 'North' }
const availableSeatWinds = computed(() => {
  const winds = ['east', 'south', 'west', 'north']
  return winds.filter(wind => form.playerCount === 4 || wind !== 'north').map(wind => ({ id: wind, label: windNames[wind] }))
})
const availableRoundWinds = computed(() => ['east', 'south'].map(wind => ({ id: wind, label: windNames[wind] })))
const isDealer = computed(() => form.seatWind === 'east')
const availablePairOptions = computed(() => pairOptions.filter(pair => pair.id !== 'double-wind' || form.seatWind === form.roundWind))
const isClosed = computed(() => form.handShape !== 'standard' || form.groups.every(group => group.concealed))
const isRiichi = computed(() => form.selectedYaku.includes('riichi') || form.selectedYaku.includes('double-riichi'))
const canUseUra = computed(() => isClosed.value && isRiichi.value)
const selectedYakuman = computed(() => form.selectedYaku.filter(id => MANUAL_YAKU.find(yaku => yaku.id === id)?.yakuman))
const filteredYaku = computed(() => {
  const search = yakuSearch.value.trim().toLowerCase()
  return MANUAL_YAKU.filter(yaku => !search || `${yaku.name} ${yaku.detail}`.toLowerCase().includes(search))
})
const yakuByCategory = computed(() => Object.fromEntries(categories.map(category => [category.id, filteredYaku.value.filter(yaku => yaku.category === category.id)])) )
const visibleCategories = computed(() => categories.filter(category => yakuByCategory.value[category.id]?.length))
const automaticYaku = computed(() => isClosed.value && form.winType === 'tsumo' && !selectedYakuman.value.length
  ? [{ id: 'menzen-tsumo', name: 'Menzen tsumo', han: 1 }]
  : [])
const doubleWaits = computed(() => selectedYakuman.value.flatMap(id => {
  if (id === 'kokushi' && form.doubleYakumanWaits.kokushi) return ['kokushi-thirteen']
  if (id === 'suuankou' && form.doubleYakumanWaits.suuankou) return ['tanki']
  if (id === 'chuuren' && form.doubleYakumanWaits.chuuren) return ['chuuren-nine']
  return []
}))
const visibleWaits = computed(() => [...waits, ...specialWaits.filter(wait => doubleWaits.value.includes(wait.id))])
const needsFuQuestions = computed(() => {
  const selected = form.selectedYaku.map(id => MANUAL_YAKU.find(yaku => yaku.id === id)).filter(Boolean)
  const yakumanUnits = selected.filter(yaku => yaku.yakuman).reduce((total, yaku) => {
    const doubled = (yaku.id === 'kokushi' && form.doubleYakumanWaits.kokushi)
      || (yaku.id === 'suuankou' && form.doubleYakumanWaits.suuankou)
      || (yaku.id === 'chuuren' && form.doubleYakumanWaits.chuuren)
    return total + (doubled ? 2 : 1)
  }, 0)
  if (yakumanUnits || form.handShape === 'kokushi') return false
  const han = selected.reduce((sum, yaku) => sum + (isClosed.value ? yaku.closedHan : (yaku.openHan ?? yaku.closedHan)), 0)
    + automaticYaku.value.reduce((sum, yaku) => sum + yaku.han, 0)
    + Math.max(0, Number(form.bonusHan.dora) || 0) + Math.max(0, Number(form.bonusHan.red) || 0) + Math.max(0, Number(form.bonusHan.ura) || 0) + Math.max(0, Number(form.bonusHan.nuki) || 0)
  return form.handShape === 'chiitoitsu' ? han < 5 : han < 5
})

function makeScoreInput() {
  const pairOption = pairOptions.find(pair => pair.id === form.pairChoice)
  return {
    selectedYaku: form.selectedYaku,
    isClosed: isClosed.value,
    isDealer: isDealer.value,
    seatWind: form.seatWind,
    roundWind: form.roundWind,
    winType: form.winType,
    playerCount: form.playerCount,
    handShape: form.handShape,
    riichiDeclared: isRiichi.value,
    pairFu: pairOption?.fu ?? null,
    pairChoice: form.pairChoice,
    pairIsValue: pairOption ? pairOption.fu > 0 : null,
    waitType: form.waitType,
    groups: form.groups,
    allSequencesConfirmed: form.allSequencesConfirmed,
    bonusHan: form.bonusHan,
    doubleYakumanWaits: form.doubleYakumanWaits,
    honba: integerAtLeastZero(form.honba),
    riichiSticks: integerAtLeastZero(form.riichiSticks),
    kiriageMangan: false,
  }
}

const result = computed(() => calculateManualScore(makeScoreInput()))
const resultReady = computed(() => result.value.issues.length === 0 && result.value.han > 0)
const shouldShowProblems = computed(() => hasInteracted.value && result.value.issues.length > 0)

const fuLines = computed(() => {
  const breakdown = result.value.fuBreakdown
  if (!breakdown) return []
  const lines = [{ label: 'Winning hand', fu: breakdown.base }]
  if (breakdown.closedRon) lines.push({ label: 'Closed ron', fu: breakdown.closedRon })
  if (breakdown.tsumo) lines.push({ label: 'Self-draw', fu: breakdown.tsumo })
  if (breakdown.pair) lines.push({ label: `Pair · ${pairOptions.find(pair => pair.id === form.pairChoice)?.label}`, fu: breakdown.pair })
  form.groups.forEach((group, index) => {
    const fu = groupFu(group)
    if (fu) lines.push({ label: groupName(group), fu })
  })
  if (breakdown.wait) lines.push({ label: `Wait · ${waits.find(wait => wait.id === form.waitType)?.label ?? 'special'}`, fu: breakdown.wait })
  if (breakdown.raw < breakdown.total) lines.push({ label: `Round ${breakdown.raw} up to the next 10`, fu: 0 })
  return lines
})

function yakuHanLabel(yaku) {
  if (yaku.yakuman) return 'Yakuman'
  return yaku.openHan !== undefined && yaku.openHan !== yaku.closedHan
    ? `${yaku.closedHan} / ${yaku.openHan} han`
    : `${yaku.closedHan} han`
}

function isYakuCategoryOpen(categoryId) {
  return openYakuCategories.value.has(categoryId)
}

function toggleYakuCategory(categoryId, event) {
  const expanded = new Set(openYakuCategories.value)
  if (event.target.open) expanded.add(categoryId)
  else expanded.delete(categoryId)
  openYakuCategories.value = expanded
}

function categoryOptionCount(categoryId) {
  return MANUAL_YAKU.filter(yaku => yaku.category === categoryId).length
}

function selectedYakuCount(categoryId) {
  return form.selectedYaku.filter(id => MANUAL_YAKU.find(yaku => yaku.id === id)?.category === categoryId).length
}

function categorySummary(categoryId) {
  const selected = selectedYakuCount(categoryId)
  return selected ? `${selected} selected` : `${categoryOptionCount(categoryId)} yaku`
}

function isSelected(id) {
  if (id === 'chiitoitsu') return form.handShape === 'chiitoitsu'
  if (id === 'kokushi') return form.handShape === 'kokushi'
  return form.selectedYaku.includes(id)
}

function isDisabled(id) {
  if (id === 'chiitoitsu') return form.handShape !== 'standard' && form.handShape !== 'chiitoitsu'
  if (id === 'kokushi') return form.handShape !== 'standard' && form.handShape !== 'kokushi'
  if (form.handShape === 'chiitoitsu' && ['pinfu', 'iipeiko', 'ryanpeiko', 'toitoi', 'sanankou', 'suuankou', 'chiitoitsu'].includes(id)) return true
  if (form.handShape === 'kokushi' && id !== 'kokushi') return true
  const selected = new Set(form.selectedYaku)
  if (id === 'double-riichi' && selected.has('riichi')) return true
  if (id === 'riichi' && selected.has('double-riichi')) return true
  const option = MANUAL_YAKU.find(yaku => yaku.id === id)
  return option?.incompatible?.some(other => selected.has(other)) ?? false
}

function toggleYaku(id) {
  hasInteracted.value = true
  if (isSelected(id)) {
    form.selectedYaku = form.selectedYaku.filter(selected => selected !== id)
    if (id === 'chiitoitsu' || id === 'kokushi') form.handShape = 'standard'
    if (id === 'pinfu') form.allSequencesConfirmed = false
    return
  }
  if (isDisabled(id)) return
  if (id === 'chiitoitsu' || id === 'kokushi') setHandShape(id)
  else form.selectedYaku.push(id)
}

function setHandShape(shape) {
  hasInteracted.value = true
  form.handShape = shape
  form.groups = []
  form.pairChoice = null
  form.waitType = null
  form.allSequencesConfirmed = false
  form.selectedYaku = form.selectedYaku.filter(id => !['chiitoitsu', 'kokushi'].includes(id))
  if (shape === 'chiitoitsu' || shape === 'kokushi') form.selectedYaku.push(shape === 'chiitoitsu' ? 'chiitoitsu' : 'kokushi')
  if (shape === 'chiitoitsu') openYakuCategories.value = new Set([...openYakuCategories.value, 'two-han'])
  if (shape === 'kokushi') openYakuCategories.value = new Set([...openYakuCategories.value, 'yakuman'])
  if (shape !== 'kokushi') form.doubleYakumanWaits.kokushi = false
}

function groupName(group) {
  return `${group.type === 'kan' ? 'Kan' : 'Triplet'} · ${group.concealed ? 'concealed' : 'called'} · ${group.tileKind === 'simple' ? 'simple' : 'terminal or honour'}`
}

function groupFu(group) {
  const terminal = group.tileKind === 'terminal-honor'
  if (group.type === 'kan') return group.concealed ? (terminal ? 32 : 16) : (terminal ? 16 : 8)
  if (group.concealed && !(form.winType === 'ron' && group.completedByRon)) return terminal ? 8 : 4
  return terminal ? 4 : 2
}

function addGroup(option) {
  hasInteracted.value = true
  if (form.groups.length >= 4 || form.handShape !== 'standard') return
  form.groups.push({ id: ++groupId, type: option.type, tileKind: option.tileKind, concealed: option.concealed, completedByRon: false })
}

function adjustBonus(id, amount, max = Infinity) {
  form.bonusHan[id] = Math.min(max, Math.max(0, integerAtLeastZero(form.bonusHan[id]) + amount))
}

function sanitizeBonus(id, max = Infinity) {
  form.bonusHan[id] = Math.min(max, integerAtLeastZero(form.bonusHan[id]))
}

function integerAtLeastZero(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0
}

function formatPoints(value) {
  return `${Number(value).toLocaleString('en-MY')} pts`
}

function limitName(name) {
  return ({
    mangan: 'Mangan', haneman: 'Haneman', baiman: 'Baiman',
    sanbaiman: 'Sanbaiman', yakuman: 'Yakuman', 'kazoe-yakuman': 'Counted yakuman',
  })[name] ?? name
}

function resetCalculator() {
  Object.assign(form, initialState())
  yakuSearch.value = ''
  hasInteracted.value = false
}

watch(() => form.playerCount, players => {
  if (players === 3 && form.seatWind === 'north') form.seatWind = 'south'
  if (players === 4) return
  form.bonusHan.nuki = Math.min(4, integerAtLeastZero(form.bonusHan.nuki))
}, { flush: 'sync' })

watch(isClosed, closed => {
  if (!closed) form.bonusHan.ura = 0
})

watch(isRiichi, riichi => {
  if (!riichi) form.bonusHan.ura = 0
})

watch(() => [form.seatWind, form.roundWind], () => {
  if (form.pairChoice === 'double-wind' && form.seatWind !== form.roundWind) form.pairChoice = null
})

watch(() => yakuSearch.value.trim(), (search, previousSearch) => {
  if (search && !previousSearch) categoriesBeforeSearch.value = new Set(openYakuCategories.value)
  if (!search && previousSearch && categoriesBeforeSearch.value) {
    openYakuCategories.value = categoriesBeforeSearch.value
    categoriesBeforeSearch.value = null
    return
  }
  if (search) openYakuCategories.value = new Set(filteredYaku.value.map(yaku => yaku.category))
})
</script>

<style scoped>
.calculator-page { width: min(1140px, 92%); margin: 0 auto; padding: 0 0 52px; color: var(--clay-text); }
.calculator-heading { max-width: 700px; margin: 0 auto 32px; padding: 8px 0 0 !important; text-align: center; }
.calculator-heading .page-eyebrow { margin-bottom: 14px; }
.calculator-heading .hero-title { font-size: clamp(2.25rem, 5.3vw, 3.7rem); }
.calculator-heading > p:last-child { max-width: 580px; margin: 14px auto 0; color: var(--muted); font-size: .95rem; line-height: 1.7; }
.calculator-layout { display: grid; grid-template-areas: "form result"; grid-template-columns: minmax(0, 1fr) minmax(290px, 345px); align-items: start; gap: 22px; }
.calculator-form { grid-area: form; min-width: 0; display: grid; gap: 16px; }
.result-panel { grid-area: result; }
.calc-section, .advanced-settings, .validation-box { min-width: 0; padding: clamp(18px, 3vw, 25px); border: 1px solid var(--line); border-radius: 11px; background: var(--white-pure); box-shadow: var(--shadow-card); }
.section-heading { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
.step-number { flex: 0 0 29px; width: 29px; height: 29px; display: grid; place-items: center; border-radius: 8px; background: var(--surface-soft); color: var(--matcha-leaf); font-size: .77rem; font-weight: 750; }
.section-heading h2 { margin: 0; color: var(--matcha-leaf); font-size: 1.08rem; letter-spacing: -.015em; }
.section-heading p, .field-hint { margin: 4px 0 0; color: var(--muted); font-size: .78rem; line-height: 1.55; }
.choice-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.choice-button { min-height: 42px; padding: 8px 13px; border: 1px solid var(--line); border-radius: 7px; background: #fff; color: var(--clay-text); font-size: .8rem; line-height: 1.35; cursor: pointer; transition: background-color .16s, border-color .16s, color .16s; }
.choice-button:hover { border-color: var(--matcha-leaf); }
.choice-button.selected { border-color: var(--matcha-leaf); background: var(--matcha-leaf); color: white; }
.choice-button > span, .choice-button > small { display: block; }
.choice-button > small { margin-top: 2px; font-size: .65rem; opacity: .75; }
.hand-mode-row, .field-heading-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 18px; padding-top: 15px; border-top: 1px solid var(--line); }
.field-label, .bonus-copy label, .bonus-copy > span:first-child { color: var(--matcha-leaf); font-size: .8rem; font-weight: 700; }
.compact-choice { margin: 0; }
.hand-shape-field { margin-top: 22px; }
.hand-shape-field > .choice-row { margin-bottom: 0; }
.shape-confirmation { margin-top: 16px; padding: 12px 14px; border-radius: 8px; background: var(--surface-soft); }
.checkbox-row { display: flex; align-items: flex-start; gap: 9px; color: var(--clay-text); font-size: .79rem; line-height: 1.55; cursor: pointer; }
.checkbox-row > input { flex: 0 0 auto; width: 17px; height: 17px; margin: 2px 0 0; accent-color: var(--matcha-leaf); }
.search-field { min-height: 46px; display: flex; align-items: center; gap: 10px; padding: 0 12px; border: 1px solid var(--line); border-radius: 7px; background: #fff; }
.search-field:focus-within { outline: 2px solid var(--matcha-leaf); outline-offset: 2px; }
.search-field svg { flex: 0 0 19px; width: 19px; fill: none; stroke: var(--muted); stroke-width: 1.7; }
.search-field input { width: 100%; min-width: 0; min-height: 44px; padding: 6px 0; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-size: .88rem; }
.automatic-yaku { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-top: 13px; padding: 10px 12px; border: 1px solid #cfd8cc; border-radius: 7px; background: #eff3ec; font-size: .74rem; }
.automatic-yaku > span { width: 100%; color: var(--muted); font-size: .68rem; }
.automatic-yaku strong { color: var(--matcha-leaf); }
.automatic-yaku strong small { opacity: .75; }
.yaku-groups { display: grid; gap: 18px; margin-top: 20px; }
.yaku-category { min-width: 0; }
.yaku-category > summary { min-height: 42px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 2px; color: var(--matcha-leaf); font-size: .78rem; font-weight: 750; letter-spacing: .025em; cursor: pointer; }
.yaku-category > summary::marker { color: var(--gold-leaf); }
.yaku-category > summary small { color: var(--muted); font-size: .67rem; font-weight: 500; letter-spacing: 0; }
.yaku-category[open] > summary { margin-bottom: 9px; }
.yaku-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.yaku-option { position: relative; min-width: 0; min-height: 64px; display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; background: white; color: inherit; text-align: left; cursor: pointer; }
.yaku-option:hover:not(:disabled) { border-color: var(--matcha-leaf); }
.yaku-option.yaku-selected { border-color: #8a9c8a; background: #edf1e9; box-shadow: inset 3px 0 var(--matcha-leaf); }
.yaku-option.yaku-disabled { opacity: .48; cursor: not-allowed; }
.yaku-check { width: 21px; height: 21px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 5px; color: var(--muted); font-size: .8rem; }
.yaku-selected .yaku-check { border-color: var(--matcha-leaf); background: var(--matcha-leaf); color: white; font-weight: 750; }
.yaku-copy { min-width: 0; }
.yaku-copy strong { display: block; color: var(--matcha-leaf); font-size: .78rem; line-height: 1.3; }
.yaku-copy small { display: block; margin-top: 2px; color: var(--muted); font-size: .66rem; line-height: 1.35; }
.yaku-han { color: var(--gold-leaf); font-size: .67rem; font-weight: 750; white-space: nowrap; }
.empty-search { margin: 0; color: var(--muted); font-size: .84rem; }
.variant-panel { display: grid; gap: 10px; margin-top: 17px; padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.variant-panel h3 { margin: 0; color: var(--matcha-leaf); font-size: .83rem; }
.variant-panel .field-hint { margin-top: -8px; }
.variant-panel .checkbox-row + .checkbox-row { padding-top: 8px; border-top: 1px solid var(--line); }
.bonus-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.bonus-control { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; min-width: 0; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
.bonus-copy { display: grid; gap: 3px; min-width: 0; }
.bonus-copy label { cursor: pointer; }
.bonus-copy > span:not(:first-child), .bonus-note { color: var(--muted); font-size: .68rem; line-height: 1.4; }
.bonus-count { background: var(--surface-soft); }
.bonus-count > strong { color: var(--matcha-leaf); font-size: 1.35rem; }
.stepper { display: flex; align-items: center; min-height: 40px; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; }
.stepper button { width: 38px; height: 40px; border: 0; background: var(--surface-soft); color: var(--matcha-leaf); font: 600 1.1rem var(--font-body); cursor: pointer; }
.stepper button:disabled { opacity: .4; cursor: not-allowed; }
.stepper input { width: 45px; height: 40px; padding: 4px; border: 0; border-radius: 0; background: white; color: var(--clay-text); text-align: center; font-size: .95rem; font-variant-numeric: tabular-nums; }
.stepper input::-webkit-inner-spin-button, .stepper input::-webkit-outer-spin-button { appearance: none; margin: 0; }
.stepper input[type=number] { appearance: textfield; }
.bonus-note { flex: 1 0 100%; margin-top: -6px; }
.fu-field + .fu-field { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line); }
.fu-choice-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.fu-choice-grid .choice-button { min-height: 52px; }
.fu-choice-grid .choice-button small { text-align: left; }
.group-count { color: var(--muted); font-size: .78rem; font-variant-numeric: tabular-nums; }
.group-list { display: grid; gap: 7px; margin: 13px 0; }
.group-row { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 7px; background: var(--surface-soft); }
.group-row > div { flex: 1; min-width: 0; }
.group-row > div > strong, .group-row > div > small { display: block; }
.group-row > div > strong { color: var(--matcha-leaf); font-size: .76rem; overflow-wrap: anywhere; }
.group-row > div > small { color: var(--muted); font-size: .68rem; }
.winning-group { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: .68rem; }
.winning-group input { accent-color: var(--matcha-leaf); }
.remove-group { flex: 0 0 32px; width: 32px; height: 34px; border: 1px solid var(--line); border-radius: 6px; background: white; color: #824249; font-size: 1.1rem; cursor: pointer; }
.add-group-menu { margin-top: 13px; }
.add-group-menu > summary, .advanced-settings > summary { min-height: 44px; display: flex; align-items: center; gap: 7px; color: var(--matcha-leaf); font-size: .8rem; font-weight: 700; cursor: pointer; }
.add-group-menu > summary::marker, .advanced-settings > summary::marker { color: var(--gold-leaf); }
.group-option-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 8px; }
.group-option-grid button { min-height: 59px; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 3px 8px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 7px; background: white; color: var(--clay-text); text-align: left; cursor: pointer; }
.group-option-grid button:hover { border-color: var(--matcha-leaf); }
.group-option-grid button strong { color: var(--matcha-leaf); font-size: .72rem; }
.group-option-grid button span { color: var(--muted); font-size: .66rem; }
.group-option-grid button b { grid-column: 2; grid-row: 1 / span 2; color: var(--gold-leaf); font-size: .68rem; white-space: nowrap; }
.advanced-settings { padding: 8px 20px; }
.advanced-settings[open] { padding-bottom: 18px; }
.advanced-content { display: grid; gap: 10px; }
.advanced-content > p { margin: 3px 0 0; color: var(--muted); font-size: .72rem; line-height: 1.55; }
.validation-box { border-color: #d5b5a8; background: #fbf5f1; }
.validation-box h2 { margin: 0 0 8px; color: #823f38; font-size: .88rem; }
.validation-box ul { display: grid; gap: 6px; margin: 0; padding-left: 19px; color: #70423c; font-size: .78rem; line-height: 1.5; }
.result-panel { position: sticky; top: 105px; overflow: hidden; border: 1px solid #cdd5c9; border-radius: 12px; background: var(--white-pure); box-shadow: 0 12px 32px rgba(44,55,40,.08); }
.result-inner { padding: 22px; }
.result-ready { border-color: var(--matcha-leaf); }
.result-heading-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.result-kicker { color: var(--muted); font-size: .71rem; font-weight: 650; letter-spacing: .11em; text-transform: uppercase; }
.reset-button { min-height: 38px; padding: 6px 9px; border: 1px solid var(--line); border-radius: 6px; background: white; color: var(--matcha-leaf); font-size: .69rem; cursor: pointer; }
.result-amount { margin: 19px 0 17px; }
.result-amount > span { display: block; color: var(--muted); font-size: .8rem; }
.result-amount > strong { display: block; margin: 2px 0; color: var(--matcha-leaf); font-size: clamp(2rem, 4vw, 2.8rem); font-variant-numeric: tabular-nums; letter-spacing: -.045em; line-height: 1.15; }
.result-amount > p { margin: 4px 0 0; color: var(--muted); font-size: .76rem; }
.received-total { padding-top: 11px; border-top: 1px solid var(--line); }
.received-total strong { color: var(--matcha-leaf); font-size: .95rem; }
.result-empty { display: flex; align-items: center; gap: 11px; margin: 17px 0; color: var(--muted); }
.result-mark { flex: 0 0 32px; width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 50%; color: var(--matcha-leaf); font-family: var(--font-display); }
.result-empty p { margin: 0; font-size: .81rem; line-height: 1.55; }
.score-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 12px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.score-metric { flex: 1; min-width: 65px; display: grid; gap: 2px; }
.score-metric > span { color: var(--muted); font-size: .69rem; }
.score-metric > strong { color: var(--matcha-leaf); font-size: 1.05rem; font-variant-numeric: tabular-nums; }
.score-metric > strong small { font-size: .62rem; font-weight: 500; }
.limit-badge { padding: 5px 9px; border-radius: 5px; background: #eee9d9; color: #695b3c; font-size: .68rem; font-weight: 750; }
.yakuman-note { flex-basis: 100%; margin: 0; color: var(--muted); font-size: .69rem; }
.payment-list, .fu-breakdown, .result-yaku { margin-top: 15px; }
.payment-list h3, .fu-breakdown h3, .result-yaku h3 { display: flex; justify-content: space-between; gap: 10px; margin: 0 0 5px; color: var(--matcha-leaf); font-size: .76rem; }
.fu-breakdown h3 span { color: var(--muted); font-weight: 500; }
.payment-list p, .fu-breakdown p, .result-yaku p { display: flex; justify-content: space-between; gap: 12px; margin: 0; padding: 5px 0; border-bottom: 1px solid #eeece4; color: var(--muted); font-size: .72rem; line-height: 1.4; }
.payment-list p strong, .fu-breakdown p strong, .result-yaku p strong { color: var(--clay-text); font-variant-numeric: tabular-nums; white-space: nowrap; }
.score-note, .result-help { margin: 14px 0 0; color: var(--muted); font-size: .68rem; line-height: 1.55; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.choice-button:focus-visible, .yaku-option:focus-visible, .stepper button:focus-visible, .group-option-grid button:focus-visible, .remove-group:focus-visible, .reset-button:focus-visible, summary:focus-visible { outline: 2px solid var(--matcha-leaf); outline-offset: 2px; }
@media (max-width: 900px) {
  .calculator-layout { grid-template-columns: minmax(0, 1fr) minmax(260px, 300px); gap: 14px; }
  .result-inner { padding: 17px; }
}
@media (max-width: 760px) {
  .calculator-page { width: min(620px, calc(100% - 24px)); padding-bottom: 38px; }
  .calculator-heading { margin-bottom: 20px; }
  .calculator-layout { grid-template-areas: "result" "form"; grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .result-panel { position: sticky; top: 78px; z-index: 5; }
  .result-inner { padding: 12px 15px; }
  .result-heading-row { align-items: center; }
  .result-amount { margin: 8px 0; }
  .result-amount > strong { display: inline; margin-right: 7px; font-size: 1.45rem; }
  .result-amount > span { display: inline; font-size: .72rem; margin-right: 7px; }
  .result-amount > p { display: inline; font-size: .7rem; }
  .received-total { padding-left: 9px; border-top: 0; border-left: 1px solid var(--line); }
  .result-empty { margin: 7px 0 0; }
  .result-empty .result-mark { display: none; }
  .score-summary { padding: 7px 0; }
  .score-metric { display: flex; align-items: baseline; gap: 6px; }
  .score-metric > strong { font-size: .88rem; }
  .limit-badge { margin-left: auto; }
  .payment-list, .fu-breakdown, .result-yaku, .score-note { display: none; }
  .yaku-grid { grid-template-columns: minmax(0, 1fr); }
  .fu-choice-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bonus-grid { grid-template-columns: minmax(0, 1fr); }
  .group-option-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .choice-button { transition: none; }
}
</style>
