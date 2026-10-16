<template>
  <main class="calculator-page">
    <header class="calculator-heading">
      <p class="page-eyebrow">A quick table-side guide</p>
      <h1 class="hero-title">Riichi Calculator</h1>
      <p>Check a hand or enter han and fu to see the payment.</p>
    </header>

    <div class="calculator-layout">
      <aside v-show="!keyboardOpen" class="result-panel" :class="{ 'result-ready': resultReady, 'result-tsumo': resultReady && Boolean(result.tsumo) }" aria-labelledby="result-heading" aria-live="polite">
        <div class="result-inner">
          <div class="result-heading-row"><span id="result-heading" class="result-kicker">{{ resultReady ? 'Payment' : 'Score' }}</span><div class="result-actions"><button v-if="undoSnapshot" type="button" class="reset-button" @click="undoClear">Undo</button><button type="button" class="reset-button" @click="resetCalculator">Clear hand</button></div></div>
          <div v-if="resultReady && form.winType === 'ron'" class="result-amount">
            <span>Discarder pays</span>
            <strong>{{ formatPoints(result.points) }}</strong>
          </div>
          <div v-if="!resultReady" class="result-empty">
            <p>{{ hasInteracted && entryMode === 'hanfu' && directEntryIssue ? 'Review the highlighted hand value.' : hasInteracted ? nextStepLabel : (entryMode === 'yaku' ? 'Choose how you want to enter the hand.' : 'Enter han and fu to see the payment.') }}</p>
            <button v-if="hasInteracted && entryMode === 'hanfu' && directEntryIssue" type="button" class="next-step-button" @click="jumpToNextIssue">Review hand value</button>
            <button v-else-if="hasInteracted && entryMode === 'yaku'" type="button" class="next-step-button" @click="jumpToNextIssue">Go to next step</button>
          </div>

          <template v-if="resultReady">
            <div v-if="result.tsumo" class="payment-list">
              <h3>Each opponent pays</h3>
              <p v-if="isDealer"><span>Each non-dealer</span><strong>{{ formatPoints(result.tsumo.nonDealerPays) }}</strong></p>
              <template v-else>
                <p><span>Dealer</span><strong>{{ formatPoints(result.tsumo.dealerPays) }}</strong></p>
                <p><span>{{ form.playerCount === 3 ? 'Other non-dealer' : 'Each other non-dealer' }}</span><strong>{{ formatPoints(result.tsumo.nonDealerPays) }}</strong></p>
              </template>
            </div>
            <div class="score-summary">
              <span v-if="result.isYakuman">{{ result.yakumanUnits > 1 ? `${result.yakumanUnits} × Yakuman` : 'Yakuman' }}</span>
              <template v-else><span>{{ result.han }} han<span v-if="result.fu"> · {{ result.fu }} fu</span></span><span v-if="result.handName" class="limit-badge">{{ limitName(result.handName) }}</span></template>
              <button type="button" class="breakdown-button" :aria-expanded="showBreakdown" aria-controls="score-breakdown" @click="toggleBreakdown">{{ showBreakdown ? 'Hide breakdown' : 'View breakdown' }}</button>
            </div>
            <p class="payment-context">{{ form.winType === 'ron' ? 'Ron' : 'Tsumo' }} · {{ isDealer ? 'Dealer' : 'Non-dealer' }} · {{ form.honba }} honba included</p>
          </template>
        </div>
      </aside>

      <form class="calculator-form" aria-label="Riichi hand details" @input="hasInteracted = true" @submit.prevent>
        <div class="entry-mode" role="group" aria-label="Scoring entry method">
          <button type="button" :class="{ selected: entryMode === 'yaku' }" :aria-pressed="entryMode === 'yaku'" @click="setEntryMode('yaku')"><strong>Count from yaku</strong><small>Guided · checks hand rules</small></button>
          <button type="button" :class="{ selected: entryMode === 'hanfu' }" :aria-pressed="entryMode === 'hanfu'" @click="setEntryMode('hanfu')"><strong>Enter han &amp; fu</strong><small>Quick · assumes the hand is valid</small></button>
        </div>
        <section v-if="entryMode === 'hanfu'" class="calc-section direct-entry" aria-labelledby="direct-heading">
          <div class="section-heading"><span class="step-number">1</span><div><h2 id="direct-heading">Enter the hand value</h2><p>Enter total han, including yaku and dora. Fu does not affect 5 han and above.</p></div></div>
          <div class="direct-fields">
            <div class="direct-field"><label for="direct-han">Total han</label><p class="field-hint">{{ form.directHan ? 'Include yaku and bonus han' : 'Tap + or enter the total han' }}</p><div class="stepper" role="group" aria-label="Total han"><button type="button" aria-label="Remove one han" :disabled="form.directHan <= 0" @click="adjustDirect('directHan', -1)">−</button><input id="direct-han" ref="directHanInput" v-model.number="form.directHan" type="number" inputmode="numeric" min="0" max="99" @change="sanitizeDirect('directHan', 99)" /><button type="button" aria-label="Add one han" @click="adjustDirect('directHan', 1, 99)">+</button></div></div>
            <div v-if="form.directHan > 0 && form.directHan < 5" class="direct-field"><label for="direct-fu">Fu</label><p class="field-hint">Choose the rounded fu total</p><select id="direct-fu" ref="directFuInput" v-model.number="form.directFu"><option v-if="!directFuOptions.includes(form.directFu)" :value="form.directFu">{{ form.directFu }} fu · check selection</option><option v-for="fu in directFuOptions" :key="fu" :value="fu">{{ fu }} fu</option></select></div>
          </div>
          <div v-if="form.directHan > 0 && form.directHan < 5 && [20, 25].includes(form.directFu)" class="direct-closed-control">
            <span class="field-label">Is the hand closed?</span>
            <div class="choice-row" role="group" aria-label="Is the hand closed?">
              <button type="button" class="choice-button" :class="{ selected: form.isClosed }" :aria-pressed="form.isClosed" @click="form.isClosed = true">Yes</button>
              <button type="button" class="choice-button" :class="{ selected: !form.isClosed }" :aria-pressed="!form.isClosed" @click="form.isClosed = false">No</button>
            </div>
          </div>
          <p v-if="directEntryIssue" class="field-problems" role="status">{{ directEntryIssue }}</p>
          <p v-else-if="form.directHan >= 5" class="field-hint">Fu is ignored at 5 han and above.</p>
        </section>
        <section ref="winSection" class="calc-section win-section" tabindex="-1" aria-labelledby="win-heading">
          <div class="section-heading">
            <span class="step-number">{{ entryMode === 'hanfu' ? 2 : 1 }}</span>
            <div>
              <h2 id="win-heading">How did you win?</h2>
              <p>Choose the win and dealer status.</p>
            </div>
          </div>

          <div class="choice-row" role="group" aria-label="Winning method">
            <button v-for="option in winOptions" :key="option.id" type="button" class="choice-button" :class="{ selected: form.winType === option.id }" :aria-pressed="form.winType === option.id" @click="form.winType = option.id">
              {{ option.label }}
            </button>
          </div>

          <span class="field-label">Are you the dealer?</span>
          <div class="choice-row" role="group" aria-label="Dealer status">
            <button type="button" class="choice-button" :class="{ selected: isDealer }" :aria-pressed="isDealer" @click="setDealer(true)">Yes</button>
            <button type="button" class="choice-button" :class="{ selected: !isDealer }" :aria-pressed="!isDealer" @click="setDealer(false)">No</button>
          </div>
          <p class="field-hint">Set the actual winds when fu or wind yaku needs them.</p>
          <template v-if="entryMode === 'yaku'">
            <span class="field-label">Your hand</span>
            <div class="choice-row" role="group" aria-label="Open or closed hand">
            <button type="button" class="choice-button" :class="{ selected: isClosed }" :aria-pressed="isClosed" @click="form.isClosed = true">Closed</button>
            <button type="button" class="choice-button" :class="{ selected: !isClosed }" :aria-pressed="!isClosed" @click="form.isClosed = false">Open</button>
            </div>
            <div v-if="!form.isClosed && !form.groups.some(group => !group.concealed) && selectedYakuOptions.some(yaku => yaku.requiresClosed)" class="closed-hand-correction">
              <p class="field-hint">If this was your only call and you have no open runs, mark the hand closed to score this yaku.</p>
              <button ref="closedHandCorrection" type="button" class="choice-button" @click="form.isClosed = true">Mark hand closed</button>
            </div>
            <details class="hand-help"><summary>What makes a hand open?</summary><p>Chi, pon or an open kan makes the hand open. A concealed kan stays closed. Closed tsumo adds Menzen tsumo automatically; open tsumo needs another yaku.</p></details>
          </template>

          <details class="table-settings">
          <summary>Table settings · {{ form.playerCount }} players · {{ isDealer ? 'East seat' : (seatWindConfirmed ? `${windNames[form.seatWind]} seat` : 'Seat not set') }} · {{ roundWindConfirmed ? `${windNames[form.roundWind]} round` : 'Round not set' }}</summary>
          <span class="field-label">Your seat wind</span>
          <div class="choice-row" role="group" aria-label="Your seat wind">
            <button v-for="option in availableSeatWinds" :key="option.id" type="button" class="choice-button" :class="{ selected: form.seatWind === option.id && seatWindConfirmed }" :aria-pressed="form.seatWind === option.id && seatWindConfirmed" @click="setSeatWind(option.id)">
              <span>{{ option.label }}</span><small v-if="option.id === 'east'">Dealer</small>
            </button>
          </div>
          <span class="field-label">Round wind</span>
          <div class="choice-row" role="group" aria-label="Round wind">
              <button v-for="option in availableRoundWinds" :key="option.id" type="button" class="choice-button" :class="{ selected: form.roundWind === option.id && roundWindConfirmed }" :aria-pressed="form.roundWind === option.id && roundWindConfirmed" @click="setRoundWind(option.id)">
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
          <details class="hand-help"><summary>Table scoring rules</summary><p>The Saujana table uses kiriage mangan off and 4 fu for a double-wind pair.</p></details>
          </details>

          <div ref="honbaSection" class="bonus-control honba-control" tabindex="-1" aria-labelledby="honba-count-label">
            <div class="bonus-copy"><label id="honba-count-label" for="honba-count">Honba · repeat counter</label><span>+300 on ron; +100 from each payer on tsumo</span></div>
            <div class="stepper" role="group" aria-label="Honba">
              <button type="button" aria-label="Remove one honba" :disabled="form.honba <= 0" @click="form.honba = Math.max(0, form.honba - 1)">−</button>
              <input id="honba-count" v-model.number="form.honba" type="number" inputmode="numeric" min="0" step="1" @change="form.honba = integerAtLeastZero(form.honba)" />
              <button type="button" aria-label="Add one honba" @click="form.honba += 1">+</button>
            </div>
            <ul v-if="shouldShowProblems && fieldIssues.table.length" class="field-problems"><li v-for="issue in fieldIssues.table" :key="issue">{{ issue }}</li></ul>
          </div>
        </section>

        <section v-if="entryMode === 'yaku'" class="calc-section" aria-labelledby="yaku-heading">
          <div ref="yakuSection" class="section-heading" tabindex="-1">
            <span class="step-number">2</span>
            <div>
              <h2 id="yaku-heading">Select your yaku</h2>
              <p>Tap your yaku. Han shown for your {{ isClosed ? 'closed' : 'open' }} hand.</p>
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
          <div v-if="selectedYakuOptions.length" class="selected-yaku" aria-label="Selected yaku">
            <span>Selected</span>
            <button v-for="yaku in selectedYakuOptions" :key="yaku.id" type="button" class="selected-yaku-chip" :class="{ 'chip-conflict': unavailableReasons[yaku.id] }" :aria-label="`Remove ${yaku.name}${unavailableReasons[yaku.id] ? `: ${unavailableReasons[yaku.id]}` : ''}`" @click="toggleYaku(yaku.id)"><span v-if="unavailableReasons[yaku.id]" aria-hidden="true">!</span>{{ yaku.name }} <b aria-hidden="true">×</b></button>
          </div>
          <div v-if="needsYakuWindConfirmation && needsWindsConfirmation" class="wind-prompt">
            <p>Confirm the seat and round winds to score this wind yaku.</p>
            <template v-if="!seatWindConfirmed"><span class="field-label">Your seat wind</span><div class="choice-row" role="group" aria-label="Confirm your seat wind"><button v-for="wind in promptSeatWinds" :key="wind.id" type="button" class="choice-button" @click="setSeatWind(wind.id)">{{ wind.label }}</button></div></template>
            <template v-if="!roundWindConfirmed"><span class="field-label">Round wind</span><div class="choice-row" role="group" aria-label="Confirm round wind"><button v-for="wind in availableRoundWinds" :key="wind.id" type="button" class="choice-button" @click="setRoundWind(wind.id)">{{ wind.label }}</button></div></template>
          </div>
          <p v-if="selectedYakuman.length" class="automatic-note">Yakuman sets the hand’s payment; bonus han do not add to it. Compatible yakuman can stack.</p>
          <ul v-if="shouldShowProblems && fieldIssues.yaku.length" class="field-problems"><li v-for="issue in fieldIssues.yaku" :key="issue">{{ issue }}</li></ul>

          <div class="yaku-groups">
            <details v-for="category in visibleCategories" :key="category.id" class="yaku-category" :open="isYakuCategoryOpen(category.id)" @toggle="toggleYakuCategory(category.id, $event)">
              <summary :id="`category-${category.id}`"><span>{{ category.label }}</span><small>{{ categorySummary(category.id) }}</small></summary>
              <div class="yaku-grid">
                <button v-for="yaku in yakuByCategory[category.id]" :key="yaku.id" type="button" class="yaku-option" :class="{ 'yaku-selected': isSelected(yaku.id), 'yaku-disabled': !isSelected(yaku.id) && isDisabled(yaku.id), 'yaku-conflict': isSelected(yaku.id) && isDisabled(yaku.id) }" :aria-pressed="isSelected(yaku.id)" :aria-disabled="!isSelected(yaku.id) && isDisabled(yaku.id)" :aria-describedby="`yaku-detail-${yaku.id}`" @click="toggleYaku(yaku.id)">
                  <span class="yaku-check" aria-hidden="true">{{ isSelected(yaku.id) ? '✓' : '+' }}</span>
                  <span class="yaku-copy">
                    <strong>{{ yakuDisplayName(yaku) }}</strong>
                    <small :id="`yaku-detail-${yaku.id}`">{{ yaku.detail }}<span v-if="unavailableReasons[yaku.id]" class="yaku-reason">{{ unavailableReasons[yaku.id] }}</span></small>
                  </span>
                  <span class="yaku-han">{{ yakuHanLabel(yaku) }}</span>
                </button>
              </div>
            </details>
            <p v-if="yakuSearch && !filteredYaku.length" class="empty-search">No yaku match that search.</p>
          </div>

          <p v-if="isPinfu" class="automatic-note">Pinfu includes four runs, a non-value pair and a two-sided wait. {{ form.winType === 'ron' ? '30' : '20' }} fu automatically.</p>
          <p v-else-if="form.handShape === 'chiitoitsu'" class="automatic-note">Seven Pairs: 25 fu automatically. No pair or wait questions needed.</p>

          <div v-if="hasSpecialWait" ref="specialWaitSection" class="variant-panel" tabindex="-1">
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
            <ul v-if="shouldShowProblems && fieldIssues.special.length" class="field-problems"><li v-for="issue in fieldIssues.special" :key="issue">{{ issue }}</li></ul>
          </div>
        </section>

        <section v-if="entryMode === 'yaku' && !selectedYakuman.length" ref="bonusSection" class="calc-section" tabindex="-1" aria-labelledby="dora-heading">
          <div class="section-heading">
            <span class="step-number">3</span>
            <div>
              <h2 id="dora-heading">Add bonus han</h2>
              <p>Enter your total han from dora and red fives. Add ura dora only after riichi; one tile can count for multiple bonuses.</p>
            </div>
          </div>
          <div class="bonus-grid">
            <div class="bonus-control">
              <div class="bonus-copy"><label for="bonus-dora">Total dora han</label><span>Count all dora bonuses together</span></div>
              <div class="stepper" role="group" aria-label="Total dora han">
                <button type="button" aria-label="Remove one dora han" :disabled="form.bonusHan.dora <= 0" @click="adjustBonus('dora', -1)">−</button>
                <input id="bonus-dora" v-model.number="form.bonusHan.dora" type="number" inputmode="numeric" min="0" step="1" @change="sanitizeBonus('dora')" />
                <button type="button" aria-label="Add one dora han" @click="adjustBonus('dora', 1)">+</button>
              </div>
            </div>
            <div v-if="form.playerCount === 3" class="bonus-control">
              <div class="bonus-copy"><label for="bonus-nuki">North bonus tiles</label><span>One han per declared North tile</span></div>
              <div class="stepper" role="group" aria-label="North bonus tiles">
                <button type="button" aria-label="Remove one North bonus tile" :disabled="form.bonusHan.nuki <= 0" @click="adjustBonus('nuki', -1)">−</button>
                <input id="bonus-nuki" v-model.number="form.bonusHan.nuki" type="number" inputmode="numeric" min="0" max="4" step="1" @change="sanitizeBonus('nuki', 4)" />
                <button type="button" aria-label="Add one North bonus tile" :disabled="form.bonusHan.nuki >= 4" @click="adjustBonus('nuki', 1, 4)">+</button>
              </div>
            </div>
          </div>
          <p class="field-hint">{{ result.bonusHan }} bonus han · Dora alone is not a yaku.</p>
          <ul v-if="shouldShowProblems && fieldIssues.bonus.length" class="field-problems"><li v-for="issue in fieldIssues.bonus" :key="issue">{{ issue }}</li></ul>
        </section>

        <section v-if="entryMode === 'yaku' && showFuSection" class="calc-section" aria-labelledby="fu-heading">
          <div class="section-heading">
            <span class="step-number">{{ selectedYakuman.length ? 3 : 4 }}</span>
            <div>
              <h2 id="fu-heading">{{ needsFuQuestions ? 'Count your fu' : 'Check hand details' }}</h2>
              <p>{{ needsFuQuestions ? (form.selectedYaku.includes('tanyao') && form.pairChoice === 'simple' ? 'Tanyao has a number-tile pair worth 0 fu. Choose the wait and add any triplets or kans.' : 'Choose the pair and wait. Add triplets and kans; skip runs.') : 'Fu entry is not needed. You can correct previously entered details here.' }}</p>
            </div>
          </div>

          <div v-if="showPairQuestion" ref="pairSection" class="fu-field" tabindex="-1">
            <span class="field-label">Your pair</span>
            <div v-if="needsPairWindConfirmation && needsWindsConfirmation && !needsYakuWindConfirmation" class="wind-prompt">
              <p>Confirm the seat and round winds so the pair’s fu is correct.</p>
              <template v-if="!seatWindConfirmed"><span class="field-label">Your seat wind</span><div class="choice-row" role="group" aria-label="Confirm your seat wind"><button v-for="wind in promptSeatWinds" :key="wind.id" type="button" class="choice-button" @click="setSeatWind(wind.id)">{{ wind.label }}</button></div></template>
              <template v-if="!roundWindConfirmed"><span class="field-label">Round wind</span><div class="choice-row" role="group" aria-label="Confirm round wind"><button v-for="wind in availableRoundWinds" :key="wind.id" type="button" class="choice-button" @click="setRoundWind(wind.id)">{{ wind.label }}</button></div></template>
            </div>
            <div class="choice-row fu-choice-grid" role="group" aria-label="Pair type">
              <button v-for="pair in availablePairOptions" :key="pair.id" type="button" class="choice-button" :class="{ selected: form.pairChoice === pair.id }" :aria-pressed="form.pairChoice === pair.id" @click="form.pairChoice = pair.id"><span>{{ pair.label }}</span><span v-if="pair.tiles?.length" class="tile-strip" aria-hidden="true"><img v-for="tile in pair.tiles" :key="tile" :src="`/tiles/${tile}.svg`" alt="" /></span><small>+{{ pair.fu }} fu</small></button>
            </div>
            <p v-if="form.selectedYaku.includes('tanyao')" class="field-hint">Tanyao uses only number tiles 2–8, including the pair.</p>
            <p v-else class="field-hint">A pair that is both your seat wind and round wind is 4 fu on this sheet.</p>
            <ul v-if="shouldShowProblems && fieldIssues.pair.length" class="field-problems"><li v-for="issue in fieldIssues.pair" :key="issue">{{ issue }}</li></ul>
          </div>

          <div v-if="showWaitQuestion" ref="waitSection" class="fu-field" tabindex="-1">
            <span class="field-label">Winning wait</span>
            <p class="field-hint winning-tile-hint">The gold-outlined tile completes the hand.</p>
            <p v-if="form.selectedYaku.includes('tanyao')" class="field-hint">Tanyao cannot use an edge wait because it needs a 1 or 9.</p>
            <div class="choice-row fu-choice-grid" role="group" aria-label="Winning wait">
              <button v-for="wait in availableWaitOptions" :key="wait.id" type="button" class="choice-button wait-button" :class="{ selected: form.waitType === wait.id }" :aria-pressed="form.waitType === wait.id" @click="form.waitType = wait.id"><span>{{ wait.label }}</span><span v-for="example in wait.examples" :key="example.caption" class="wait-example"><span class="tile-strip" aria-hidden="true"><img v-for="(tile, index) in example.tiles" :key="`${tile}-${index}`" :src="`/tiles/${tile}.svg`" alt="" :class="{ 'winning-tile': index === example.tiles.length - 1 }" /></span><small>{{ example.caption }}</small></span><small>{{ wait.fu ? `+${wait.fu} fu` : 'no wait fu' }}</small></button>
            </div>
            <ul v-if="shouldShowProblems && fieldIssues.wait.length" class="field-problems"><li v-for="issue in fieldIssues.wait" :key="issue">{{ issue }}</li></ul>
          </div>

          <div v-if="showGroupBuilder" ref="groupSection" class="fu-field group-builder" tabindex="-1">
            <div class="field-heading-row"><div><span class="field-label">Triplets and kans</span><p class="field-hint">Add each triplet or kan; runs do not add fu. A triplet completed by ron counts as open for fu only.<template v-if="yakuhaiChoices.length"> Mark the matching dragon or wind set.</template></p><p v-if="form.selectedYaku.includes('tanyao')" class="field-hint">For Tanyao, use simple number tiles only.</p></div><span class="group-count">{{ form.groups.length }} / 4</span></div>
            <p v-if="form.groups.some(group => !group.concealed) && selectedYakuOptions.some(yaku => yaku.requiresClosed)" class="field-problems">A called group opens the hand, which conflicts with the selected closed-only yaku. Remove the call or that yaku.</p>
            <div v-if="form.groups.length" class="group-list">
              <div v-for="(group, index) in form.groups" :key="group.id" class="group-row">
                <div class="group-row-main"><strong>{{ groupName(group) }}</strong><small>{{ groupFu(group) }} fu</small><span class="group-tile-samples" aria-hidden="true"><template v-for="(tile, tileIndex) in groupTileExamples(group)" :key="`${tile}-${tileIndex}`"><span v-if="isConcealedKanBack(group, tileIndex)" class="tile-back"></span><img v-else :src="`/tiles/${tile}.svg`" alt="" /></template></span></div>
                <label v-if="yakuhaiChoices.length || group.yakuId" class="group-yaku-choice"><span>Counts as</span><select v-model="group.yakuId" :aria-label="`Yaku set for ${groupName(group)}`"><option value="">Other set</option><option v-for="option in groupYakuOptions(group)" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
                <label v-if="form.winType === 'ron' && form.waitType === 'shanpon' && group.type === 'triplet' && group.concealed" class="winning-group"><input v-model="group.completedByRon" type="checkbox" /><span>Won on this triplet</span></label>
                <button type="button" class="remove-group" :aria-label="`Remove ${groupName(group)}`" @click="form.groups.splice(index, 1); form.groupsConfirmed = false">×</button>
              </div>
            </div>
            <button v-if="form.groups.length < 4" type="button" class="add-group-button" :aria-expanded="showGroupOptions" aria-controls="group-options" @click="showGroupOptions = !showGroupOptions"><span aria-hidden="true">＋</span>{{ form.groups.length ? 'Add another triplet or kan' : 'Add a triplet or kan' }}<span class="add-group-chevron" aria-hidden="true">{{ showGroupOptions ? '−' : '⌄' }}</span></button>
            <div v-show="showGroupOptions && form.groups.length < 4" id="group-options" class="group-option-grid">
              <div class="group-type-tabs" role="group" aria-label="Group type">
                <button v-for="type in groupTypes" :key="type.id" type="button" class="choice-button" :class="{ selected: groupTypeFilter === type.id }" :aria-pressed="groupTypeFilter === type.id" @click="groupTypeFilter = type.id">{{ type.label }}</button>
              </div>
              <button v-for="option in groupOptionsForPicker" :key="option.id" type="button" @click="addGroup(option)"><strong>{{ option.label }}</strong><span class="group-tile-samples" aria-hidden="true"><template v-for="(tile, index) in option.tileExamples" :key="`${tile}-${index}`"><span v-if="isConcealedKanOptionBack(option, index)" class="tile-back"></span><img v-else :src="`/tiles/${tile}.svg`" alt="" /></template></span><span>{{ option.detail }}</span><b>+{{ option.fu }} fu</b></button>
            </div>
            <label v-if="needsFuQuestions && form.groups.length < 4" class="checkbox-row no-sets-confirm"><input v-model="form.groupsConfirmed" type="checkbox" /><span>{{ form.groups.length ? 'I have entered all triplets and kans in my hand' : 'My hand has no triplets or kans (only runs)' }}</span></label>
            <p v-if="form.groups.length === 4" class="field-hint">That’s all four groups. Runs don’t need to be entered.</p>
            <ul v-if="shouldShowProblems && fieldIssues.groups.length" class="field-problems"><li v-for="issue in fieldIssues.groups" :key="issue">{{ issue }}</li></ul>
          </div>
        </section>

        <section v-if="resultReady && showBreakdown" id="score-breakdown" ref="breakdownSection" class="calc-section score-details" tabindex="-1" aria-labelledby="breakdown-heading">
          <h2 id="breakdown-heading">Score breakdown</h2>
          <p class="score-note">{{ formatPoints(result.points) }} from the table<span v-if="form.honba">, including {{ form.honba }} honba</span>.</p>
          <div v-if="result.fuBreakdown" class="fu-breakdown">
            <h3>Fu breakdown <span>{{ result.fu }} total</span></h3>
            <p v-for="(line, index) in fuLines" :key="index"><span>{{ line.label }}</span><strong>{{ line.fu ? `+${line.fu}` : '—' }}</strong></p>
          </div>
          <p v-else class="score-note">Fu does not affect this payment.</p>
          <div v-if="entryMode === 'hanfu'" class="result-yaku"><h3>Entered value</h3><p><span>Total han</span><strong>{{ form.directHan }} han</strong></p><p v-if="result.fu"><span>Fu</span><strong>{{ result.fu }} fu</strong></p></div>
          <div v-else class="result-yaku"><h3>{{ result.isYakuman ? 'Yakuman breakdown' : 'Han breakdown' }}</h3><p v-for="yaku in result.yaku" :key="yaku.id"><span>{{ yaku.name }}</span><strong>{{ result.isYakuman ? `${yaku.han / 13} × Yakuman` : `${yaku.han} han` }}</strong></p><p v-if="result.bonusHan"><span>Bonus han</span><strong>{{ result.bonusHan }} han</strong></p></div>
        </section>
      </form>
    </div>
  </main>
</template>

<script setup>
import { MANUAL_YAKU, calculateManualHanFuScore, calculateManualScore, manualYakuUnavailableReason } from '~/utils/scoring/manual'

useHead({
  title: 'Riichi Calculator | Saujana BGC',
  bodyAttrs: { class: 'riichi-calculator-body' },
  meta: [{ name: 'description', content: 'Quickly estimate riichi mahjong han, fu and payments for ron or tsumo.' }],
})

const categories = [
  { id: 'common', label: 'Everyday yaku' },
  { id: 'yakuhai', label: 'Dragon and wind sets' },
  { id: 'patterns', label: 'Runs, triplets and pairs' },
  { id: 'suits', label: 'Suit and terminal patterns' },
  { id: 'situational', label: 'Situational yaku' },
  { id: 'yakuman', label: 'Yakuman' },
]
const yakuSearchAliases = {
  riichi: ['reach', 'ready hand'],
  'double-riichi': ['double reach', 'double riichi'],
  tanyao: ['all simples', 'no terminals or honours'],
  chiitoitsu: ['seven pairs'],
  ittsu: ['pure straight', 'straight in one suit'],
  'sanshoku-doujun': ['three colour straight', 'mixed triple sequence'],
  'sanshoku-doukou': ['three colour triplets', 'triple triplets'],
  honroutou: ['terminals and honours only', 'all terminals and honours'],
  honitsu: ['half flush', 'one suit and honours'],
  chinitsu: ['full flush', 'pure flush', 'one suit no honours'],
  renhou: ['hand of man'],
  tenhou: ['heavenly hand'],
  chiihou: ['earthly hand'],
  kokushi: ['thirteen orphans', 'thirteen terminals and honours'],
  chuuren: ['nine gates'],
  ryuuiisou: ['all green'],
  suuankou: ['four concealed triplets', 'four concealed sets'],
  suuankantsu: ['four kans', 'four quads'],
  chinroutou: ['all terminals'],
  tsuuiisou: ['all honours'],
  daisangen: ['big three dragons'],
  shousangen: ['little three dragons'],
  shousuushi: ['little four winds'],
  daisuushi: ['big four winds'],
}

const winOptions = [
  { id: 'ron', label: 'Ron · from a discard' },
  { id: 'tsumo', label: 'Tsumo · self-drawn' },
]
const pairOptions = [
  { id: 'simple', label: 'Number tile', fu: 0, tiles: ['Man5'] },
  { id: 'non-value-wind', label: 'Other wind', fu: 0 },
  { id: 'dragon', label: 'Dragon', fu: 2, tiles: ['Haku', 'Hatsu', 'Chun'] },
  { id: 'seat-wind', label: 'Seat wind', fu: 2 },
  { id: 'round-wind', label: 'Round wind', fu: 2 },
  { id: 'double-wind', label: 'Seat + round wind', fu: 4 },
]
const waits = [
  { id: 'ryanmen', label: 'Two-sided', examples: [{ tiles: ['Man2', 'Man3', 'Man1'], caption: '1 completes' }, { tiles: ['Man2', 'Man3', 'Man4'], caption: '4 completes' }], fu: 0 },
  { id: 'penchan', label: 'Edge', examples: [{ tiles: ['Man1', 'Man2', 'Man3'], caption: '1–2 wait for 3' }, { tiles: ['Man8', 'Man9', 'Man7'], caption: '8–9 wait for 7' }], fu: 2 },
  { id: 'kanchan', label: 'Middle', examples: [{ tiles: ['Man2', 'Man4', 'Man3'], caption: '2–4 wait for 3' }], fu: 2 },
  { id: 'tanki', label: 'Pair wait', examples: [{ tiles: ['Man5', 'Man5'], caption: '5 completes the pair' }], fu: 2 },
  { id: 'shanpon', label: 'Triplet wait', examples: [{ tiles: ['Man5', 'Man5', 'Man7', 'Man7', 'Man5'], caption: '5 completes 55' }, { tiles: ['Man5', 'Man5', 'Man7', 'Man7', 'Man7'], caption: '7 completes 77' }], fu: 0 },
]
const groupOptions = [
  { id: 'triplet-called-simple', type: 'triplet', tileKind: 'simple', concealed: false, label: 'Called triplet · simple', detail: '2–8 tile · 2 fu', tileExamples: ['Man5', 'Man5', 'Man5'], fu: 2 },
  { id: 'triplet-called-terminal-honor', type: 'triplet', tileKind: 'terminal-honor', concealed: false, label: 'Called triplet · terminal or honour', detail: '1, 9 or honour · 4 fu', tileExamples: ['Man1', 'Man1', 'Man1'], fu: 4 },
  { id: 'triplet-concealed-simple', type: 'triplet', tileKind: 'simple', concealed: true, label: 'Concealed triplet · simple', detail: '2–8 tile · 4 fu', tileExamples: ['Man5', 'Man5', 'Man5'], fu: 4 },
  { id: 'triplet-concealed-terminal-honor', type: 'triplet', tileKind: 'terminal-honor', concealed: true, label: 'Concealed triplet · terminal or honour', detail: '1, 9 or honour · 8 fu', tileExamples: ['Man1', 'Man1', 'Man1'], fu: 8 },
  { id: 'kan-called-simple', type: 'kan', tileKind: 'simple', concealed: false, label: 'Called kan · simple', detail: '2–8 tile · 8 fu', tileExamples: ['Man5', 'Man5', 'Man5', 'Man5'], fu: 8 },
  { id: 'kan-called-terminal-honor', type: 'kan', tileKind: 'terminal-honor', concealed: false, label: 'Called kan · terminal or honour', detail: '1, 9 or honour · 16 fu', tileExamples: ['Man1', 'Man1', 'Man1', 'Man1'], fu: 16 },
  { id: 'kan-concealed-simple', type: 'kan', tileKind: 'simple', concealed: true, label: 'Concealed kan · simple', detail: '2–8 tile · 16 fu', tileExamples: ['Man5', 'Man5', 'Man5', 'Man5'], fu: 16 },
  { id: 'kan-concealed-terminal-honor', type: 'kan', tileKind: 'terminal-honor', concealed: true, label: 'Concealed kan · terminal or honour', detail: '1, 9 or honour · 32 fu', tileExamples: ['Man1', 'Man1', 'Man1', 'Man1'], fu: 32 },
]
const groupTypes = [
  { id: 'triplet', label: 'Triplet' },
  { id: 'kan', label: 'Kan' },
]

const initialState = () => ({
  winType: 'ron',
  seatWind: 'south',
  seatWindConfirmed: false,
  roundWind: 'east',
  roundWindConfirmed: false,
  playerCount: 4,
  isDealer: false,
  isClosed: true,
  handShape: 'standard',
  selectedYaku: [],
  pairChoice: null,
  waitType: null,
  groups: [],
  bonusHan: { dora: 0, nuki: 0 },
  doubleYakumanWaits: { kokushi: false, suuankou: false, chuuren: false },
  honba: 0,
  directHan: 0,
  directFu: 30,
  groupsConfirmed: false,
})

const form = reactive(initialState())
const entryMode = ref('yaku')
const undoSnapshot = ref(null)
const standardHandDraft = ref(null)
const yakuSearch = ref('')
const openYakuCategories = ref(new Set(['common']))
const categoriesBeforeSearch = ref(null)
const hasInteracted = ref(false)
const showBreakdown = ref(false)
const showGroupOptions = ref(false)
const groupTypeFilter = ref('triplet')
const breakdownSection = ref(null)
const winSection = ref(null)
const yakuSection = ref(null)
const pairSection = ref(null)
const waitSection = ref(null)
const groupSection = ref(null)
const specialWaitSection = ref(null)
const bonusSection = ref(null)
const honbaSection = ref(null)
const directHanInput = ref(null)
const directFuInput = ref(null)
const closedHandCorrection = ref(null)
const keyboardOpen = ref(false)
let groupId = 0
let nextIssueHighlightTimer

watch(form, () => { undoSnapshot.value = null }, { deep: true, flush: 'sync' })
watch(entryMode, () => { undoSnapshot.value = null }, { flush: 'sync' })

const directFuOptions = computed(() => {
  const han = integerAtLeastZero(form.directHan)
  return [20, 25, ...Array.from({ length: 9 }, (_, index) => 30 + index * 10)]
    .filter(fu => (fu !== 20 || form.winType === 'tsumo') && (fu !== 25 || han >= 2) && (fu !== 20 || han >= 2))
})
const quickScore = computed(() => calculateManualHanFuScore({
  han: form.directHan,
  fu: form.directFu,
  isClosed: form.isClosed,
  isDealer: isDealer.value,
  winType: form.winType,
  playerCount: form.playerCount,
  honba: integerAtLeastZero(form.honba),
  kiriageMangan: false,
}))
const directEntryIssue = computed(() => form.directHan > 0 ? (quickScore.value.issues[0] ?? '') : '')

const windNames = { east: 'East', south: 'South', west: 'West', north: 'North' }
const windTileNames = { east: 'Ton', south: 'Nan', west: 'Shaa', north: 'Pei' }
const availableSeatWinds = computed(() => {
  const winds = ['east', 'south', 'west', 'north']
  return winds.filter(wind => form.playerCount === 4 || wind !== 'north').map(wind => ({ id: wind, label: windNames[wind] }))
})
const availableRoundWinds = computed(() => ['east', 'south'].map(wind => ({ id: wind, label: windNames[wind] })))
const promptSeatWinds = computed(() => availableSeatWinds.value.filter(wind => form.isDealer || wind.id !== 'east'))
const seatWindName = computed(() => windNames[form.seatWind])
const roundWindName = computed(() => windNames[form.roundWind])
const isDealer = computed(() => form.isDealer)
const availablePairOptions = computed(() => pairOptions
  .filter(pair => !form.selectedYaku.includes('tanyao') || pair.id === 'simple')
  .filter(pair => !seatWindConfirmed.value || !roundWindConfirmed.value || (form.seatWind === form.roundWind
    ? !['seat-wind', 'round-wind'].includes(pair.id)
    : pair.id !== 'double-wind'))
  .map(pair => ({
    ...pair,
    label: pair.id === 'seat-wind' ? (seatWindConfirmed.value ? `${seatWindName.value} · seat wind` : 'Seat wind')
      : pair.id === 'round-wind' ? (roundWindConfirmed.value ? `${roundWindName.value} · round wind` : 'Round wind')
        : pair.id === 'double-wind' ? (seatWindConfirmed.value && roundWindConfirmed.value ? `${seatWindName.value} + ${roundWindName.value} wind pair` : 'Seat + round wind')
          : pair.id === 'non-value-wind' ? seatWindConfirmed.value && roundWindConfirmed.value ? Object.keys(windNames)
            .filter(wind => wind !== form.seatWind && wind !== form.roundWind)
            .map(wind => windNames[wind]).join(' or ') || 'Other wind' : 'Other wind'
            : pair.label,
    tiles: pair.id === 'seat-wind' ? (seatWindConfirmed.value ? [windTileNames[form.seatWind]] : [])
      : pair.id === 'round-wind' ? (roundWindConfirmed.value ? [windTileNames[form.roundWind]] : [])
        : pair.id === 'double-wind' ? seatWindConfirmed.value && roundWindConfirmed.value ? [...new Set([windTileNames[form.seatWind], windTileNames[form.roundWind]])] : []
          : pair.id === 'non-value-wind' ? seatWindConfirmed.value && roundWindConfirmed.value ? Object.keys(windNames)
            .filter(wind => wind !== form.seatWind && wind !== form.roundWind)
            .map(wind => windTileNames[wind]) : []
            : pair.tiles,
  })))
const groupOptionsForPicker = computed(() => groupOptions.filter(option => option.type === groupTypeFilter.value && (!form.selectedYaku.includes('tanyao') || option.tileKind === 'simple')))
const isClosed = computed(() => form.isClosed)
const isPinfu = computed(() => form.selectedYaku.includes('pinfu'))
const availableWaitOptions = computed(() => waits
  .filter(wait => !form.selectedYaku.includes('tanyao') || wait.id !== 'penchan' || form.waitType === 'penchan')
  .map(wait => form.selectedYaku.includes('tanyao') && wait.id === 'ryanmen'
    ? { ...wait, examples: [
      { tiles: ['Man3', 'Man4', 'Man2'], caption: '2 completes' },
      { tiles: ['Man3', 'Man4', 'Man5'], caption: '5 completes' },
    ] }
    : wait))
const isRiichi = computed(() => form.selectedYaku.includes('riichi') || form.selectedYaku.includes('double-riichi'))
const selectedYakuman = computed(() => form.selectedYaku.filter(id => MANUAL_YAKU.find(yaku => yaku.id === id)?.yakuman))
const selectedYakuOptions = computed(() => form.selectedYaku.map(id => MANUAL_YAKU.find(yaku => yaku.id === id)).filter(Boolean))
const unavailableReasons = computed(() => Object.fromEntries(MANUAL_YAKU.map(yaku => [yaku.id, yakuUnavailableReason(yaku.id)])))
const yakuhaiChoices = computed(() => {
  const selected = form.selectedYaku.filter(id => id.startsWith('yakuhai-'))
  const hasDoubleWind = selected.includes('yakuhai-seat') && selected.includes('yakuhai-round') && form.seatWind === form.roundWind
  return [
    ...selected.filter(id => !(hasDoubleWind && ['yakuhai-seat', 'yakuhai-round'].includes(id))).map(id => ({ id, label: MANUAL_YAKU.find(yaku => yaku.id === id)?.name ?? id })),
    ...(hasDoubleWind ? [{ id: 'yakuhai-double-wind', label: 'Seat + round wind set' }] : []),
  ]
})
const hasSpecialWait = computed(() => selectedYakuman.value.some(id => ['kokushi', 'suuankou', 'chuuren'].includes(id)))
const filteredYaku = computed(() => {
  const search = yakuSearch.value.trim().toLowerCase()
  return MANUAL_YAKU.filter(yaku => !search || `${yaku.name} ${yaku.detail} ${(yakuSearchAliases[yaku.id] ?? []).join(' ')}`.toLowerCase().includes(search))
})
const yakuByCategory = computed(() => Object.fromEntries(categories.map(category => [category.id, filteredYaku.value.filter(yaku => yaku.category === category.id)])) )
const visibleCategories = computed(() => categories.filter(category => yakuByCategory.value[category.id]?.length))
const automaticYaku = computed(() => isClosed.value && form.winType === 'tsumo' && !selectedYakuman.value.length
  ? [{ id: 'menzen-tsumo', name: 'Menzen tsumo', han: 1 }]
  : [])

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
    bonusHan: form.bonusHan,
    doubleYakumanWaits: form.doubleYakumanWaits,
    honba: integerAtLeastZero(form.honba),
    kiriageMangan: false,
  }
}

const result = computed(() => {
  if (entryMode.value === 'yaku') return calculateManualScore(makeScoreInput())
  return quickScore.value
})
const resultReady = computed(() => entryMode.value === 'yaku'
  ? result.value.issues.length === 0 && result.value.han > 0 && !needsSetConfirmation.value && !needsWindsConfirmation.value
  : result.value.issues.length === 0 && result.value.han > 0)
const shouldShowProblems = computed(() => entryMode.value === 'yaku' && hasInteracted.value && result.value.issues.some(issue => !/^Choose your pair|^Choose the wait|^Select at least one yaku/.test(issue)))
const needsSetConfirmation = computed(() => entryMode.value === 'yaku' && needsFuQuestions.value && form.groups.length < 4 && !form.groupsConfirmed)
const needsFuQuestions = computed(() => !result.value.isYakuman && result.value.han > 0 && result.value.han < 5 && form.handShape === 'standard' && !isPinfu.value)
const showPairQuestion = computed(() => (needsFuQuestions.value && !(form.selectedYaku.includes('tanyao') && form.pairChoice === 'simple')) || fieldIssues.value.pair.some(issue => !issue.startsWith('Choose your pair')))
const showWaitQuestion = computed(() => needsFuQuestions.value || fieldIssues.value.wait.some(issue => !issue.startsWith('Choose the wait')))
const showGroupBuilder = computed(() => needsFuQuestions.value || form.groups.length > 0 || fieldIssues.value.groups.length > 0)
const showFuSection = computed(() => showPairQuestion.value || showWaitQuestion.value || showGroupBuilder.value)
const needsYakuWindConfirmation = computed(() => form.selectedYaku.some(id => ['yakuhai-seat', 'yakuhai-round'].includes(id)))
const needsPairWindConfirmation = computed(() => needsFuQuestions.value && !form.selectedYaku.includes('tanyao') && ['seat-wind', 'round-wind', 'double-wind'].includes(form.pairChoice))
const tableWindsNeeded = computed(() => needsPairWindConfirmation.value || needsYakuWindConfirmation.value)
const seatWindConfirmed = computed(() => form.isDealer || form.seatWindConfirmed)
const roundWindConfirmed = computed(() => form.roundWindConfirmed)
const needsWindsConfirmation = computed(() => tableWindsNeeded.value && (!seatWindConfirmed.value || !roundWindConfirmed.value))
const fieldIssues = computed(() => {
  const fields = { yaku: [], pair: [], wait: [], groups: [], special: [], bonus: [], table: [] }
  for (const issue of result.value.issues) {
    if (/^North bonus/.test(issue)) fields.bonus.push(issue)
    else if (/^(dora|North bonus) must be/.test(issue)) fields.bonus.push(issue)
    else if (/^honba must be/.test(issue)) fields.table.push(issue)
    else if (/^Suuankou on ron|^Suuankou needs a pair wait|^Double (Suuankou|Kokushi|Nine Gates)/.test(issue)) fields.special.push(issue)
    else if (/^Choose your pair/.test(issue) && needsWindsConfirmation.value) continue
    else if (/^Choose your pair|^Tanyao needs a number-tile pair|^Pinfu needs a non-value pair|^A double-wind pair|^A double-wind pair is|^Shousangen needs a dragon pair/.test(issue)) fields.pair.push(issue)
    else if (/^Choose the wait|^Pinfu needs a two-sided wait|^Tanyao cannot use an edge wait/.test(issue)) fields.wait.push(issue)
    else if (/group|\btriplet\b|\bkan\b|requires a kan|winning-triplet|yakuhai|Tanyao cannot include terminal or honour triplets and kans/i.test(issue)) fields.groups.push(issue)
    else fields.yaku.push(issue)
  }
  return fields
})
const nextIssueTarget = computed(() => {
  if (entryMode.value === 'hanfu') return { label: directEntryIssue.value || 'Enter han and fu', target: directFuInput.value ?? directHanInput.value }
  if (fieldIssues.value.yaku.some(issue => /requires a closed hand/i.test(issue)) && closedHandCorrection.value) return { label: 'Mark the hand closed', target: closedHandCorrection.value }
  if (fieldIssues.value.yaku.length || (form.selectedYaku.length === 0 && automaticYaku.value.length === 0)) return { label: 'Choose or fix a yaku', target: yakuSection.value }
  if (needsWindsConfirmation.value) return { label: 'Confirm the seat and round winds', target: needsYakuWindConfirmation.value ? yakuSection.value : pairSection.value }
  if (fieldIssues.value.special.length) return { label: 'Check the special wait', target: specialWaitSection.value }
  if (fieldIssues.value.bonus.length) return { label: 'Check bonus han', target: bonusSection.value }
  if (fieldIssues.value.table.length) return { label: 'Check table counters', target: honbaSection.value }
  if (fieldIssues.value.pair.length || (needsFuQuestions.value && !form.pairChoice)) return { label: 'Choose your pair', target: pairSection.value }
  if (fieldIssues.value.wait.length || (needsFuQuestions.value && !form.waitType)) return { label: 'Choose your winning wait', target: waitSection.value }
  if (fieldIssues.value.groups.length) return { label: 'Add or fix a triplet or kan', target: groupSection.value }
  if (needsSetConfirmation.value) return { label: form.groups.length ? 'Confirm the group list is complete' : 'Confirm there are no triplets or kans', target: groupSection.value }
  return null
})
const nextStepLabel = computed(() => nextIssueTarget.value?.label ?? 'Review the highlighted details below.')

const fuLines = computed(() => {
  const breakdown = result.value.fuBreakdown
  if (!breakdown) return []
  const lines = [{ label: 'Winning hand', fu: breakdown.base }]
  if (breakdown.closedRon) lines.push({ label: 'Closed ron', fu: breakdown.closedRon })
  if (breakdown.tsumo) lines.push({ label: 'Self-draw', fu: breakdown.tsumo })
  if (breakdown.pair) lines.push({ label: `Pair · ${pairOptions.find(pair => pair.id === form.pairChoice)?.label}`, fu: breakdown.pair })
  form.groups.forEach(group => {
    const fu = groupFu(group)
    if (fu) lines.push({ label: groupName(group), fu })
  })
  if (breakdown.wait) lines.push({ label: `Wait · ${waits.find(wait => wait.id === form.waitType)?.label ?? 'special'}`, fu: breakdown.wait })
  if (breakdown.raw < breakdown.total) lines.push({ label: `Round ${breakdown.raw} up to the next 10`, fu: 0 })
  return lines
})

function yakuHanLabel(yaku) {
  if (yaku.yakuman) return 'Yakuman'
  if (!isClosed.value && yaku.requiresClosed) return 'Closed only'
  return `${isClosed.value ? yaku.closedHan : (yaku.openHan ?? yaku.closedHan)} han`
}

const yakuEnglishNames = {
  riichi: 'Ready hand', 'double-riichi': 'Double ready hand', ippatsu: 'One-shot', pinfu: 'All sequences', iipeiko: 'Pure double sequence',
  tanyao: 'All simples', 'yakuhai-haku': 'White dragon', 'yakuhai-hatsu': 'Green dragon', 'yakuhai-chun': 'Red dragon',
  'yakuhai-seat': 'Seat wind', 'yakuhai-round': 'Round wind', chankan: 'Robbing a kan', rinshan: 'After a kan', haitei: 'Last-tile draw', houtei: 'Last discard',
  chiitoitsu: 'Seven pairs', ittsu: 'Pure straight', 'sanshoku-doujun': 'Mixed triple sequence', 'sanshoku-doukou': 'Triple triplets', toitoi: 'All triplets',
  sanankou: 'Three concealed triplets', sankantsu: 'Three kans', chanta: 'Outside hand', honroutou: 'Terminals and honours', shousangen: 'Little three dragons',
  ryanpeiko: 'Twice pure double sequence', honitsu: 'Half flush', junchan: 'Terminals in every group', chinitsu: 'Full flush', tenhou: 'Heavenly hand', chiihou: 'Earthly hand',
  kokushi: 'Thirteen orphans', chuuren: 'Nine gates', ryuuiisou: 'All green', suuankou: 'Four concealed triplets', suuankantsu: 'Four kans', chinroutou: 'All terminals',
  tsuuiisou: 'All honours', daisangen: 'Big three dragons', shousuushi: 'Little four winds', daisuushi: 'Big four winds',
}
function yakuDisplayName(yaku) {
  const english = yakuEnglishNames[yaku.id]
  return english && english !== yaku.name ? `${yaku.name} · ${english}` : yaku.name
}

function setEntryMode(mode) {
  entryMode.value = mode
  hasInteracted.value = true
  if (mode === 'hanfu') showBreakdown.value = false
}

function setDealer(value) {
  hasInteracted.value = true
  form.isDealer = value
  if (value) {
    form.seatWind = 'east'
    form.seatWindConfirmed = true
  } else if (form.seatWind === 'east') {
    form.seatWind = 'south'
    form.seatWindConfirmed = false
  }
}

function setSeatWind(wind) {
  hasInteracted.value = true
  form.seatWind = wind
  form.seatWindConfirmed = true
  form.isDealer = wind === 'east'
}

function setRoundWind(wind) {
  hasInteracted.value = true
  form.roundWind = wind
  form.roundWindConfirmed = true
}

function adjustDirect(key, amount, max = Infinity) {
  form[key] = Math.min(max, Math.max(0, integerAtLeastZero(form[key]) + amount))
}

function sanitizeDirect(key, max) {
  form[key] = Math.min(max, integerAtLeastZero(form[key]))
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

function jumpToNextIssue() {
  const target = nextIssueTarget.value?.target
  if (!target) return
  target?.focus({ preventScroll: true })
  target.classList.remove('issue-target-flash')
  void target.offsetWidth
  target.classList.add('issue-target-flash')
  window.clearTimeout(nextIssueHighlightTimer)
  nextIssueHighlightTimer = window.setTimeout(() => target.classList.remove('issue-target-flash'), 1200)
  target?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

function isSelected(id) {
  if (id === 'chiitoitsu') return form.handShape === 'chiitoitsu'
  if (id === 'kokushi') return form.handShape === 'kokushi'
  return form.selectedYaku.includes(id)
}

function isDisabled(id) {
  const option = MANUAL_YAKU.find(yaku => yaku.id === id)
  if (option && yakuUnavailableReason(id)) return true
  if (id === 'chiitoitsu') return form.handShape !== 'standard' && form.handShape !== 'chiitoitsu'
  if (id === 'kokushi') return form.handShape !== 'standard' && form.handShape !== 'kokushi'
  if (form.handShape === 'chiitoitsu' && ['pinfu', 'iipeiko', 'ryanpeiko', 'toitoi', 'sanankou', 'suuankou', 'chiitoitsu'].includes(id)) return true
  if (form.handShape === 'kokushi' && id !== 'kokushi') return true
  return false
}

function yakuUnavailableReason(id) {
  const option = MANUAL_YAKU.find(yaku => yaku.id === id)
  if (!option) return null
  if (id === 'chiitoitsu' && form.handShape === 'kokushi') return 'Choose a standard hand before selecting Seven Pairs.'
  if (id === 'kokushi' && form.handShape === 'chiitoitsu') return 'Choose a standard hand before selecting Kokushi.'
  if (form.handShape === 'kokushi' && id !== 'kokushi') return 'Kokushi has no sets; remove it to select another yaku.'
  if (form.handShape === 'chiitoitsu' && ['pinfu', 'iipeiko', 'ryanpeiko', 'toitoi', 'sanankou', 'suuankou'].includes(id)) return 'This hand is set as Seven Pairs.'
  return manualYakuUnavailableReason(id, { selectedYaku: form.selectedYaku, isClosed: isClosed.value, isDealer: isDealer.value, winType: form.winType })
}

function toggleYaku(id) {
  hasInteracted.value = true
  if (isSelected(id)) {
    if (id === 'chiitoitsu' || id === 'kokushi') {
      setHandShape('standard')
      return
    }
    form.selectedYaku = form.selectedYaku.filter(selected => selected !== id)
    if (id === 'kokushi' || id === 'suuankou' || id === 'chuuren') {
      form.doubleYakumanWaits[id] = false
      if (['kokushi-thirteen', 'chuuren-nine'].includes(form.waitType)) form.waitType = null
    }
    return
  }
  if (isDisabled(id)) return
  if (id === 'chiitoitsu' || id === 'kokushi') setHandShape(id)
  else {
    form.selectedYaku.push(id)
    if (id === 'tanyao' && !form.pairChoice) form.pairChoice = 'simple'
  }
}

function setHandShape(shape) {
  hasInteracted.value = true
  if (shape === form.handShape) return
  if (form.handShape === 'standard') {
    standardHandDraft.value = JSON.parse(JSON.stringify({
      groups: form.groups,
      pairChoice: form.pairChoice,
      waitType: form.waitType,
      groupsConfirmed: form.groupsConfirmed,
    }))
  }
  const restoredStandard = shape === 'standard' ? standardHandDraft.value : null
  form.handShape = shape
  form.groups = restoredStandard?.groups ?? []
  showGroupOptions.value = false
  form.pairChoice = restoredStandard?.pairChoice ?? null
  form.waitType = restoredStandard?.waitType ?? null
  form.groupsConfirmed = restoredStandard?.groupsConfirmed ?? false
  form.selectedYaku = form.selectedYaku.filter(id => !['chiitoitsu', 'kokushi'].includes(id))
  if (shape === 'chiitoitsu' || shape === 'kokushi') form.selectedYaku.push(shape === 'chiitoitsu' ? 'chiitoitsu' : 'kokushi')
  if (shape === 'standard') standardHandDraft.value = null
  if (shape === 'chiitoitsu') openYakuCategories.value = new Set([...openYakuCategories.value, 'patterns'])
  if (shape === 'kokushi') openYakuCategories.value = new Set([...openYakuCategories.value, 'yakuman'])
  if (shape !== 'kokushi') form.doubleYakumanWaits.kokushi = false
}

function groupName(group) {
  return `${group.type === 'kan' ? 'Kan' : 'Triplet'} · ${group.concealed ? 'concealed' : 'called'} · ${group.tileKind === 'simple' ? 'simple' : 'terminal or honour'}`
}

function groupYakuOptions(group) {
  const assignedElsewhere = new Set(form.groups.filter(other => other.id !== group.id).map(other => other.yakuId).filter(Boolean))
  const options = yakuhaiChoices.value.filter(option => !assignedElsewhere.has(option.id) || option.id === group.yakuId)
  if (group.yakuId && !options.some(option => option.id === group.yakuId)) {
    const label = group.yakuId === 'yakuhai-double-wind' ? 'Seat + round wind set (update)' : `${MANUAL_YAKU.find(yaku => yaku.id === group.yakuId)?.name ?? 'Set'} (update)`
    options.push({ id: group.yakuId, label })
  }
  return options
}

function groupFu(group) {
  const terminal = group.tileKind === 'terminal-honor'
  if (group.type === 'kan') return group.concealed ? (terminal ? 32 : 16) : (terminal ? 16 : 8)
  if (group.concealed && !(form.winType === 'ron' && group.completedByRon)) return terminal ? 8 : 4
  return terminal ? 4 : 2
}

function groupTileExamples(group) {
  return groupOptions.find(option => option.type === group.type && option.tileKind === group.tileKind && option.concealed === group.concealed)?.tileExamples ?? []
}

function isConcealedKanBack(group, index) {
  return group.type === 'kan' && group.concealed && (index === 0 || index === 3)
}

function isConcealedKanOptionBack(option, index) {
  return option.type === 'kan' && option.concealed && (index === 0 || index === 3)
}

function addGroup(option) {
  hasInteracted.value = true
  if (form.groups.length >= 4 || form.handShape !== 'standard') return
  if (!option.concealed) form.isClosed = false
  form.groups.push({ id: ++groupId, type: option.type, tileKind: option.tileKind, concealed: option.concealed, completedByRon: false, yakuId: null })
  form.groupsConfirmed = false
  showGroupOptions.value = false
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

async function resetCalculator() {
  const previousHand = JSON.parse(JSON.stringify({ form: toRaw(form), entryMode: entryMode.value, standardHandDraft: standardHandDraft.value }))
  undoSnapshot.value = null
  const table = { playerCount: form.playerCount, seatWind: form.seatWind, seatWindConfirmed: form.seatWindConfirmed, roundWind: form.roundWind, roundWindConfirmed: form.roundWindConfirmed, isDealer: form.isDealer, honba: form.honba }
  const currentEntryMode = entryMode.value
  Object.assign(form, initialState(), table)
  standardHandDraft.value = null
  entryMode.value = currentEntryMode
  yakuSearch.value = ''
  categoriesBeforeSearch.value = null
  openYakuCategories.value = new Set(['common'])
  hasInteracted.value = false
  showBreakdown.value = false
  showGroupOptions.value = false
  await nextTick()
  undoSnapshot.value = previousHand
  const focusTarget = entryMode.value === 'hanfu' ? directHanInput.value : winSection.value
  focusTarget?.focus({ preventScroll: true })
  focusTarget?.scrollIntoView({ block: 'start', behavior: 'auto' })
}

async function undoClear() {
  if (!undoSnapshot.value) return
  const previousHand = undoSnapshot.value
  undoSnapshot.value = null
  Object.assign(form, previousHand.form)
  entryMode.value = previousHand.entryMode
  standardHandDraft.value = previousHand.standardHandDraft ?? null
  hasInteracted.value = true
  await nextTick()
  const focusTarget = entryMode.value === 'hanfu' ? directHanInput.value : winSection.value
  focusTarget?.focus({ preventScroll: true })
  focusTarget?.scrollIntoView({ block: 'start', behavior: 'auto' })
}

function updateKeyboardState() {
  const viewport = window.visualViewport
  keyboardOpen.value = Boolean(viewport && window.innerHeight - viewport.height > 140)
}

async function toggleBreakdown() {
  showBreakdown.value = !showBreakdown.value
  if (showBreakdown.value) {
    await nextTick()
    breakdownSection.value?.focus({ preventScroll: true })
    breakdownSection.value?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }
}

watch(() => form.playerCount, players => {
  if (players === 3 && form.seatWind === 'north') { form.seatWind = 'south'; form.seatWindConfirmed = false }
  form.bonusHan.nuki = players === 4 ? 0 : Math.min(4, integerAtLeastZero(form.bonusHan.nuki))
}, { flush: 'sync' })

watch(() => [form.seatWind, form.roundWind], () => {
  if (form.pairChoice === 'double-wind' && form.seatWind !== form.roundWind) form.pairChoice = null
  if (form.seatWind === form.roundWind && ['seat-wind', 'round-wind'].includes(form.pairChoice)) form.pairChoice = 'double-wind'
})

watch(() => [form.winType, form.waitType], () => {
  if (form.winType !== 'ron' || form.waitType !== 'shanpon') form.groups.forEach(group => { group.completedByRon = false })
}, { flush: 'sync' })

watch(() => [form.winType, form.isClosed], () => { hasInteracted.value = true }, { flush: 'sync' })

onMounted(() => {
  window.visualViewport?.addEventListener('resize', updateKeyboardState)
  window.addEventListener('resize', updateKeyboardState)
})
onBeforeUnmount(() => {
  window.clearTimeout(nextIssueHighlightTimer)
  window.visualViewport?.removeEventListener('resize', updateKeyboardState)
  window.removeEventListener('resize', updateKeyboardState)
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
:global(body.riichi-calculator-body) { overflow-x: clip; }
.calculator-page { width: min(1140px, 92%); margin: 0 auto; padding: 0 0 52px; color: var(--clay-text); }
.calculator-heading { max-width: 700px; margin: 0 auto 22px; padding: 8px 0 0 !important; text-align: center; }
.calculator-heading .page-eyebrow { margin-bottom: 14px; }
.calculator-heading .hero-title { font-size: clamp(2.25rem, 5.3vw, 3.7rem); }
.calculator-heading > p:last-child { max-width: 580px; margin: 14px auto 0; color: var(--muted); font-size: .95rem; line-height: 1.7; }
.calculator-layout { display: grid; grid-template-areas: "form result"; grid-template-columns: minmax(0, 1fr) minmax(290px, 345px); align-items: start; gap: 22px; }
.calculator-form { grid-area: form; min-width: 0; display: grid; gap: 16px; }
.result-panel { grid-area: result; }
.calc-section { min-width: 0; padding: clamp(18px, 3vw, 25px); border: 1px solid var(--line); border-radius: 11px; background: var(--white-pure); box-shadow: var(--shadow-card); }
.win-section { scroll-margin-top: 220px; }
.section-heading { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
.step-number { flex: 0 0 29px; width: 29px; height: 29px; display: grid; place-items: center; border-radius: 8px; background: var(--surface-soft); color: var(--matcha-leaf); font-size: .77rem; font-weight: 750; }
.section-heading h2 { margin: 0; color: var(--matcha-leaf); font-size: 1.08rem; letter-spacing: -.015em; }
.section-heading p, .field-hint { margin: 4px 0 0; color: var(--muted); font-size: .78rem; line-height: 1.55; }
.choice-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.choice-button { min-height: 42px; padding: 8px 13px; border: 1px solid var(--line); border-radius: 7px; background: #fff; color: var(--clay-text); font-size: .8rem; line-height: 1.35; cursor: pointer; transition: background-color .16s, border-color .16s, color .16s; }
.choice-button:hover { border-color: var(--matcha-leaf); }
.choice-button.selected { border-color: var(--matcha-leaf); background: var(--matcha-leaf); color: white; }
.wait-button.selected .wait-example, .wait-button.selected .wait-example small { color: white; }
.wait-button.selected .tile-strip { padding: 2px; border-radius: 3px; background: white; }
.choice-button > span, .choice-button > small { display: block; }
.choice-button > small { margin-top: 2px; font-size: .65rem; opacity: .75; }
.hand-mode-row, .field-heading-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 18px; padding-top: 15px; border-top: 1px solid var(--line); }
.field-label, .bonus-copy label, .bonus-copy > span:first-child { color: var(--matcha-leaf); font-size: .8rem; font-weight: 700; }
.compact-choice { margin: 0; }
.table-settings { margin-top: 18px; padding-top: 10px; border-top: 1px solid var(--line); }
.table-settings > summary { min-height: 44px; color: var(--matcha-leaf); font-size: .75rem; cursor: pointer; }
.table-settings[open] > summary { margin-bottom: 10px; }
.wind-prompt { margin-top: 14px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.wind-prompt > p { margin: 0 0 8px; color: var(--muted); font-size: .76rem; line-height: 1.5; }
.wind-prompt .choice-row { margin: 7px 0 11px; }
.wind-prompt .choice-row:last-child { margin-bottom: 0; }
.hand-help { margin-top: 12px; color: var(--muted); font-size: .76rem; line-height: 1.5; }
.hand-help summary { min-height: 40px; display: flex; align-items: center; color: var(--matcha-leaf); font-weight: 650; cursor: pointer; }
.hand-help p { margin: 3px 0 0; }
.entry-mode { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.entry-mode button { min-height: 60px; display: grid; align-content: center; gap: 3px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 9px; background: var(--white-pure); color: var(--clay-text); text-align: left; cursor: pointer; }
.entry-mode button.selected { border-color: var(--matcha-leaf); background: #edf1e9; box-shadow: inset 0 0 0 1px var(--matcha-leaf); }
.entry-mode strong { color: var(--matcha-leaf); font-size: .8rem; }
.entry-mode small { color: var(--muted); font-size: .69rem; }
.direct-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.direct-field { display: grid; align-content: start; gap: 4px; min-width: 0; }
.direct-field > label { color: var(--matcha-leaf); font-size: .84rem; font-weight: 700; }
.direct-field select { min-height: 48px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 7px; background: white; color: var(--clay-text); font: inherit; }
.direct-closed-control { margin-top: 14px; }
.no-sets-confirm { margin-top: 13px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 7px; background: #faf9f6; }
.automatic-note { margin: 14px 0 0; padding: 10px 12px; border-radius: 7px; background: var(--surface-soft); color: var(--matcha-leaf); font-size: .78rem; line-height: 1.55; }
.field-problems { display: grid; gap: 5px; margin: 10px 0 0; padding-left: 18px; color: #823f38; font-size: .78rem; line-height: 1.5; }
.closed-hand-correction { display: grid; justify-items: start; gap: 8px; margin: 10px 0 0; }
.closed-hand-correction .field-hint { margin: 0; }
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
.selected-yaku { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.selected-yaku > span { margin-right: 3px; color: var(--muted); font-size: .68rem; }
.selected-yaku-chip { min-height: 36px; display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border: 1px solid #cfd8cc; border-radius: 999px; background: #eff3ec; color: var(--matcha-leaf); font-size: .73rem; cursor: pointer; }
.selected-yaku-chip b { font-size: .85rem; }
.yaku-groups { display: grid; gap: 18px; margin-top: 20px; }
.yaku-category { min-width: 0; }
.yaku-category > summary { min-height: 42px; display: flex; align-items: center; gap: 12px; padding: 0 2px; color: var(--matcha-leaf); font-size: .78rem; font-weight: 750; letter-spacing: .025em; cursor: pointer; }
.yaku-category > summary::before { content: '+'; font-size: 1rem; }
.yaku-category[open] > summary::before { content: '−'; }
.yaku-category > summary small { margin-left: auto; }
.yaku-category > summary::marker { color: var(--gold-leaf); }
.yaku-category > summary small { color: var(--muted); font-size: .67rem; font-weight: 500; letter-spacing: 0; }
.yaku-category[open] > summary { margin-bottom: 9px; }
.yaku-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.yaku-option { position: relative; min-width: 0; min-height: 64px; display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; background: white; color: inherit; text-align: left; cursor: pointer; }
.yaku-option:hover:not([aria-disabled="true"]) { border-color: var(--matcha-leaf); }
.yaku-option.yaku-selected { border-color: #8a9c8a; background: #edf1e9; box-shadow: inset 3px 0 var(--matcha-leaf); }
.yaku-option.yaku-disabled { background: #f6f5f1; cursor: not-allowed; }
.yaku-option.yaku-conflict, .selected-yaku-chip.chip-conflict { border-color: #a35c50; background: #fff3ef; }
.yaku-reason { display: block; margin-top: 5px; color: #823f38; }
.selected-yaku-chip.chip-conflict { border-color: #a35c50; background: #fff3ef; }
.yaku-check { width: 21px; height: 21px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 5px; color: var(--muted); font-size: .8rem; }
.yaku-selected .yaku-check { border-color: var(--matcha-leaf); background: var(--matcha-leaf); color: white; font-weight: 750; }
.yaku-copy { min-width: 0; }
.yaku-copy strong { display: block; color: var(--matcha-leaf); font-size: .78rem; line-height: 1.3; }
.yaku-copy small { display: block; margin-top: 2px; color: var(--muted); font-size: .72rem; line-height: 1.4; }
.yaku-han { color: var(--gold-leaf); font-size: .72rem; font-weight: 750; white-space: nowrap; }
.empty-search { margin: 0; color: var(--muted); font-size: .84rem; }
.variant-panel { display: grid; gap: 10px; margin-top: 17px; padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.variant-panel h3 { margin: 0; color: var(--matcha-leaf); font-size: .83rem; }
.variant-panel .field-hint { margin-top: -8px; }
.variant-panel .checkbox-row + .checkbox-row { padding-top: 8px; border-top: 1px solid var(--line); }
.bonus-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.bonus-control { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; min-width: 0; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
.bonus-copy { display: grid; gap: 3px; min-width: 0; }
.bonus-copy label { cursor: pointer; }
.bonus-copy > span:not(:first-child) { color: var(--muted); font-size: .68rem; line-height: 1.4; }
.stepper { display: flex; align-items: center; min-height: 44px; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; }
.stepper button { width: 44px; height: 44px; border: 0; background: var(--surface-soft); color: var(--matcha-leaf); font: 600 1.1rem var(--font-body); cursor: pointer; }
.stepper button:disabled { opacity: .4; cursor: not-allowed; }
.stepper input { width: 48px; height: 44px; padding: 4px; border: 0; border-radius: 0; background: white; color: var(--clay-text); text-align: center; font-size: .95rem; font-variant-numeric: tabular-nums; }
.stepper input::-webkit-inner-spin-button, .stepper input::-webkit-outer-spin-button { appearance: none; margin: 0; }
.stepper input[type=number] { appearance: textfield; }
.fu-field + .fu-field { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--line); }
.fu-field { scroll-margin-top: 130px; }
.variant-panel, .section-heading[tabindex], .calc-section[tabindex], .honba-control { scroll-margin-top: 130px; }
.fu-choice-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.fu-choice-grid .choice-button { min-height: 52px; }
.fu-choice-grid .choice-button small { text-align: left; }
.fu-choice-grid .wait-button { min-height: 112px; align-content: center; }
.choice-button > .wait-example { display: grid; justify-items: center; gap: 2px; margin: 4px 0 2px; color: var(--muted); font-size: .7rem; line-height: 1.35; font-variant-numeric: tabular-nums; }
.tile-strip { display: inline-flex; align-items: flex-end; justify-content: center; gap: 2px; min-height: 32px; }
.choice-button .tile-strip { display: inline-flex; }
.tile-strip img { display: block; width: 21px; height: 29px; object-fit: contain; }
.tile-strip img.winning-tile { outline: 2px solid var(--gold-leaf); outline-offset: 1px; border-radius: 2px; filter: drop-shadow(0 2px 0 var(--gold-leaf)); transform: translateY(-2px); }
.winning-tile-hint { margin-bottom: 7px; }
.group-count { color: var(--muted); font-size: .78rem; font-variant-numeric: tabular-nums; }
.group-list { display: grid; gap: 7px; margin: 13px 0; }
.group-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 12px; min-width: 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 7px; background: var(--surface-soft); }
.group-row-main { flex: 1; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 2px 8px; }
.group-row-main > strong, .group-row-main > small { display: block; }
.group-row-main > strong { color: var(--matcha-leaf); font-size: .76rem; overflow-wrap: anywhere; }
.group-row-main > small { color: var(--muted); font-size: .68rem; }
.group-row-main .group-tile-samples { grid-column: 2; grid-row: 1 / span 2; display: inline-flex; align-items: flex-end; gap: 1px; }
.group-yaku-choice { display: grid; gap: 3px; min-width: 130px; color: var(--muted); font-size: .65rem; }
.group-yaku-choice select { min-height: 35px; max-width: 190px; padding: 4px 7px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--clay-text); font: inherit; }
.winning-group { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: .68rem; }
.winning-group input { accent-color: var(--matcha-leaf); }
.remove-group { flex: 0 0 32px; width: 32px; height: 34px; border: 1px solid var(--line); border-radius: 6px; background: white; color: #824249; font-size: 1.1rem; cursor: pointer; }
.add-group-button { width: 100%; min-height: 50px; display: flex; align-items: center; justify-content: flex-start; gap: 9px; margin-top: 13px; padding: 10px 13px; border: 1px solid var(--matcha-leaf); border-radius: 8px; background: #edf1e9; color: var(--matcha-leaf); font: 700 .8rem var(--font-body); text-align: left; cursor: pointer; }
.add-group-button:hover { background: #e4ebdf; }
.add-group-button:focus-visible { outline: 2px solid var(--gold-leaf); outline-offset: 2px; }
.add-group-button > span:first-child { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 50%; background: var(--matcha-leaf); color: white; font-size: 1rem; }
.add-group-button .add-group-chevron { margin-left: auto; color: var(--muted); font-size: 1rem; }
.group-option-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 8px; }
.group-type-tabs { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.group-type-tabs .choice-button { min-height: 44px; }
.group-option-grid button { min-height: 68px; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; grid-template-rows: auto auto; align-items: center; gap: 3px 8px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 7px; background: white; color: var(--clay-text); text-align: left; cursor: pointer; }
.group-option-grid button:hover { border-color: var(--matcha-leaf); }
.group-option-grid button strong { color: var(--matcha-leaf); font-size: .72rem; }
.group-option-grid button > span:not(.group-tile-samples) { color: var(--muted); font-size: .72rem; }
.group-option-grid button .group-tile-samples { grid-column: 2; grid-row: 1 / span 2; display: inline-flex; align-items: flex-end; gap: 1px; }
.group-tile-samples img { width: 16px; height: 23px; object-fit: contain; }
.group-tile-samples .tile-back { width: 16px; height: 23px; flex: 0 0 auto; border: 1px solid #536c58; border-radius: 2px; background: repeating-linear-gradient(135deg, #93a78b 0 2px, #849b7d 2px 4px); box-shadow: inset 0 0 0 2px #f7f5eb; }
.group-option-grid button b { grid-column: 3; grid-row: 1 / span 2; color: var(--gold-leaf); font-size: .72rem; white-space: nowrap; }
.honba-control { margin-top: 18px; }
.honba-control .field-problems { flex-basis: 100%; }
.result-panel { position: sticky; top: 105px; overflow: hidden; border: 1px solid #cdd5c9; border-radius: 12px; background: var(--white-pure); box-shadow: 0 12px 32px rgba(44,55,40,.08); }
.result-inner { padding: 22px; }
.result-ready { border-color: var(--matcha-leaf); }
.result-heading-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.result-kicker { color: var(--muted); font-size: .71rem; font-weight: 650; letter-spacing: .11em; text-transform: uppercase; }
.result-actions { display: flex; gap: 6px; }
.reset-button { min-height: 38px; padding: 6px 9px; border: 1px solid var(--line); border-radius: 6px; background: white; color: var(--matcha-leaf); font-size: .69rem; cursor: pointer; }
.result-amount { margin: 19px 0 17px; }
.result-amount > span { display: block; color: var(--muted); font-size: .8rem; }
.result-amount > strong { display: block; margin: 2px 0; color: var(--matcha-leaf); font-size: clamp(2rem, 4vw, 2.8rem); font-variant-numeric: tabular-nums; letter-spacing: -.045em; line-height: 1.15; }
.result-empty { display: flex; flex-wrap: wrap; align-items: center; gap: 11px; margin: 17px 0; color: var(--muted); }
.result-empty p { flex: 1 1 100%; margin: 0; font-size: .81rem; line-height: 1.55; }
.next-step-button { min-height: 44px; padding: 5px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface-soft); color: var(--matcha-leaf); font-size: .72rem; font-weight: 700; cursor: pointer; }
.score-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 10px 0 0; margin-top: 10px; border-top: 1px solid var(--line); font-size: .8rem; color: var(--matcha-leaf); }
.payment-context { margin: 3px 0 0; color: var(--muted); font-size: .72rem; line-height: 1.4; }
.breakdown-button { margin-left: auto; min-height: 44px; padding: 4px 0 4px 6px; border: 0; background: transparent; color: var(--matcha-leaf); font-size: .72rem; text-decoration: underline; cursor: pointer; }
.score-details { scroll-margin-top: 130px; }
.score-details h2 { margin: 0; color: var(--matcha-leaf); font-size: 1.08rem; }
.limit-badge { padding: 5px 9px; border-radius: 5px; background: #eee9d9; color: #695b3c; font-size: .68rem; font-weight: 750; }
.payment-list, .fu-breakdown, .result-yaku { margin-top: 15px; }
.payment-list h3, .fu-breakdown h3, .result-yaku h3 { display: flex; justify-content: space-between; gap: 10px; margin: 0 0 5px; color: var(--matcha-leaf); font-size: .76rem; }
.fu-breakdown h3 span { color: var(--muted); font-weight: 500; }
.payment-list p, .fu-breakdown p, .result-yaku p { display: flex; justify-content: space-between; gap: 12px; margin: 0; padding: 5px 0; border-bottom: 1px solid #eeece4; color: var(--muted); font-size: .72rem; line-height: 1.4; }
.payment-list p strong, .fu-breakdown p strong, .result-yaku p strong { color: var(--clay-text); font-variant-numeric: tabular-nums; white-space: nowrap; }
.score-note { margin: 14px 0 0; color: var(--muted); font-size: .72rem; line-height: 1.55; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.choice-button:focus-visible, .yaku-option:focus-visible, .selected-yaku-chip:focus-visible, .stepper button:focus-visible, .group-option-grid button:focus-visible, .remove-group:focus-visible, .reset-button:focus-visible, .breakdown-button:focus-visible, .next-step-button:focus-visible, summary:focus-visible { outline: 2px solid var(--matcha-leaf); outline-offset: 2px; }
.issue-target-flash { animation: issue-target-pulse 1.1s ease-out; border-radius: 9px; }
@keyframes issue-target-pulse { from { box-shadow: 0 0 0 3px rgba(53, 76, 62, .32); } to { box-shadow: 0 0 0 0 rgba(53, 76, 62, 0); } }
@media (max-width: 900px) {
  .calculator-layout { grid-template-columns: minmax(0, 1fr) minmax(260px, 300px); gap: 14px; }
  .result-inner { padding: 17px; }
}
@media (max-width: 760px) {
  .calculator-page { width: min(620px, calc(100% - 24px)); padding-bottom: calc(108px + env(safe-area-inset-bottom)); }
  .calculator-heading { margin: 0 auto 10px; padding-top: 0 !important; }
  .calculator-heading .page-eyebrow { margin: 0 0 2px; font-size: .65rem; }
  .calculator-heading .hero-title { font-size: clamp(1.65rem, 7vw, 2.25rem); line-height: 1.1; }
  .calculator-heading > p:last-child { margin-top: 4px; font-size: .76rem; line-height: 1.4; }
  .calculator-layout { display: flex; flex-direction: column; gap: 12px; }
  .calculator-form, .result-panel { width: 100%; box-sizing: border-box; }
  .result-panel { position: fixed; inset: auto 10px calc(8px + env(safe-area-inset-bottom)); z-index: 20; width: min(620px, calc(100% - 20px)); max-height: min(35vh, 250px); overflow: auto; margin: 0 auto; box-shadow: 0 8px 28px rgba(44,55,40,.2); }
  .result-inner { padding: 12px 15px; }
  .result-heading-row { align-items: center; }
  .result-amount { margin: 8px 0; }
  .result-amount > strong { display: inline; margin-right: 7px; font-size: 1.45rem; }
  .result-amount > span { display: inline; font-size: .72rem; margin-right: 7px; }
  .result-empty { margin: 7px 0 0; }
  .result-empty p { flex-basis: auto; }
  .score-summary { padding: 3px 0 0; margin-top: 7px; font-size: .75rem; }
  .payment-list { margin-top: 5px; }
  .payment-list p { padding: 3px 0; }
  .payment-list p strong { font-size: 1rem; }
  .result-tsumo .payment-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 10px; }
  .result-tsumo .payment-list h3 { display: none; }
  .result-tsumo .payment-list p { display: grid; justify-items: center; gap: 1px; padding: 2px 0; border: 0; font-size: .68rem; text-align: center; }
  .result-tsumo .payment-list p strong { font-size: 1rem; }
  .result-tsumo .payment-list p:only-of-type { grid-column: 1 / -1; }
  .payment-context { font-size: .72rem; }
  .score-details { scroll-margin-top: 300px; }
  .entry-mode { gap: 6px; }
  .entry-mode button { min-height: 58px; padding: 7px 9px; }
  .entry-mode strong { font-size: .75rem; }
  .entry-mode small { font-size: .72rem; line-height: 1.35; }
  .field-hint, .group-count, .group-row-main > small, .group-option-grid button > span:not(.group-tile-samples), .group-yaku-choice { font-size: .76rem; }
  .calc-section { padding: 15px; }
  .choice-row { gap: 7px; }
  .choice-button { min-height: 48px; padding: 8px 11px; }
  .reset-button { min-height: 44px; }
  .selected-yaku-chip { min-height: 44px; }
  .table-settings > summary, .yaku-category > summary { min-height: 48px; }
  .remove-group { flex-basis: 44px; width: 44px; height: 44px; }
  .group-option-grid button { min-height: 76px; }
  .next-step-button, .breakdown-button { min-height: 44px; }
  .direct-fields { grid-template-columns: minmax(0, 1fr); }
  .direct-field .stepper { justify-content: space-between; width: 100%; }
  .direct-field .stepper input { flex: 1; }
  .no-sets-confirm { min-height: 48px; align-items: center; }
  .yaku-grid { grid-template-columns: minmax(0, 1fr); }
  .yaku-copy strong { font-size: .94rem; }
  .yaku-copy small { font-size: .875rem; }
  .fu-choice-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .win-section, .fu-field, .variant-panel, .section-heading[tabindex], .calc-section[tabindex], .honba-control { scroll-margin-top: 92px; }
  .bonus-grid { grid-template-columns: minmax(0, 1fr); }
  .group-option-grid { grid-template-columns: minmax(0, 1fr); }
  .group-type-tabs { grid-column: auto; }
  .group-option-grid button { grid-template-columns: minmax(0, 1fr) auto auto; }
  .search-field input, .stepper input, .direct-field select { font-size: 16px; }
}
@media (max-width: 380px) {
  .result-panel { inset-inline: 6px; width: calc(100% - 12px); }
  .result-inner { padding: 10px 12px; }
  .result-amount > strong { font-size: 1.25rem; }
  .result-amount > span { font-size: .66rem; }
  .reset-button { padding-inline: 7px; font-size: .64rem; }
  .fu-choice-grid .wait-button { min-height: 100px; }
  .tile-strip img { width: 18px; height: 25px; }
}
@media (min-width: 381px) and (max-width: 760px) {
  .tile-strip img { width: 26px; height: 36px; }
  .group-tile-samples img { width: 20px; height: 29px; }
  .group-tile-samples .tile-back { width: 20px; height: 29px; }
}
@media (prefers-reduced-motion: reduce) {
  .choice-button { transition: none; }
  .issue-target-flash { animation: none; }
}
</style>
