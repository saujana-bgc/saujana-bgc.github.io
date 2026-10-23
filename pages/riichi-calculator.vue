<template>
  <main class="calculator-page" :class="{ 'result-panel-visible': !keyboardOpen && (entryMode !== 'tiles' || tileStep === 1) }" :style="{ '--mobile-result-panel-height': `${mobileResultPanelHeight}px` }">
    <header class="calculator-heading">
      <p class="page-eyebrow">A quick table-side guide</p>
      <h1 class="hero-title">Riichi Calculator</h1>
      <p class="calculator-description">Check a hand or enter han and fu to see the payment.</p>
      <button ref="tutorialTrigger" type="button" class="tutorial-trigger" aria-haspopup="dialog" @click="openTutorial">
        <span aria-hidden="true">▶</span> Watch guide · 90 sec
      </button>
    </header>

    <RiichiCalculatorTutorialDialog ref="tutorialDialog" />

    <div class="calculator-layout" :class="{ 'tile-entry-active': entryMode === 'tiles' && tileStep === 0 }">
      <aside ref="resultPanelRef" v-show="!keyboardOpen && (entryMode !== 'tiles' || tileStep === 1)" class="result-panel" :class="{ 'result-ready': resultReady, 'result-tsumo': resultReady && Boolean(result.tsumo), 'result-tile-incomplete': entryMode === 'tiles' && !resultReady }" aria-labelledby="result-heading">
        <p class="sr-only" aria-live="polite">{{ resultAnnouncement }}</p>
        <div class="result-inner">
          <div class="result-heading-row"><span id="result-heading" class="result-kicker">{{ resultReady ? 'Payment' : 'Score' }}</span><div class="result-actions"><button v-if="resultReady" type="button" class="reset-button" @click="copyResult">{{ copyLabel }}</button><button v-if="undoSnapshot" type="button" class="reset-button" @click="undoClear">Undo</button><button type="button" class="reset-button" @click="resetCalculator">New hand</button></div></div>
          <div v-if="resultReady && form.winType === 'ron'" class="result-amount">
            <span>{{ result.pao ? 'Total payment' : 'Discarder pays' }}</span>
            <strong>{{ formatPoints(result.points) }}</strong>
          </div>
          <div v-else-if="resultReady && form.winType === 'tsumo'" class="result-amount">
            <span>{{ result.pao ? 'Total payment' : 'You receive' }}</span>
            <strong>{{ formatPoints(result.pao ? paoTsumoTotal : result.points) }}</strong>
          </div>
          <div v-if="!resultReady" class="result-empty">
            <p>{{ entryMode === 'tiles' ? tileResultMessage : hasInteracted && directEntryIssue ? 'Review the hand value below.' : hasInteracted ? nextStepLabel : 'Enter han and fu to see the payment.' }}</p>
            <button v-if="hasInteracted && entryMode === 'hanfu' && directEntryIssue" type="button" class="next-step-button" @click="jumpToNextIssue">Review hand value</button>
            <button v-else-if="hasInteracted && canJumpToNextIssue && entryMode === 'tiles' && tileStep === 1" type="button" class="next-step-button" @click="jumpToNextIssue">{{ nextStepLabel }}</button>
          </div>

          <template v-if="resultReady">
            <div v-if="result.pao" class="payment-list pao-payment" aria-label="Pao payment">
              <h2>Pao · {{ form.winType === 'tsumo' || !result.pao.discarderPays ? 'responsible player pays' : 'split between responsible player and discarder' }}</h2>
              <p><span>Responsible player</span><strong>{{ formatPoints(result.pao.responsiblePays) }}</strong></p>
              <p v-if="result.pao.discarderPays"><span>Discarder (including honba)</span><strong>{{ formatPoints(result.pao.discarderPays) }}</strong></p>
              <template v-if="result.pao.otherTsumo">
                <h2>Other opponents · remaining yakuman</h2>
                <p v-if="isDealer || result.pao.responsibleIsDealer"><span>Each non-dealer opponent</span><strong>{{ formatPoints(result.pao.otherTsumo.nonDealerPays) }}</strong></p>
                <template v-else>
                  <p><span>Dealer</span><strong>{{ formatPoints(result.pao.otherTsumo.dealerPays) }}</strong></p>
                  <p v-if="form.playerCount === 4"><span>Other non-dealer</span><strong>{{ formatPoints(result.pao.otherTsumo.nonDealerPays) }}</strong></p>
                </template>
              </template>
            </div>
            <div v-if="result.tsumo && !result.pao" class="payment-list">
              <h2>Each opponent pays</h2>
              <p v-if="isDealer"><span>Each non-dealer</span><strong>{{ formatPoints(result.tsumo.nonDealerPays) }}</strong></p>
              <template v-else>
                <p><span>Dealer</span><strong>{{ formatPoints(result.tsumo.dealerPays) }}</strong></p>
                <p><span>{{ form.playerCount === 3 ? 'Other non-dealer' : 'Each other non-dealer' }}</span><strong>{{ formatPoints(result.tsumo.nonDealerPays) }}</strong></p>
              </template>
            </div>
            <div class="score-summary">
              <span v-if="result.isYakuman">{{ result.yakumanUnits > 1 ? `${result.yakumanUnits} × Yakuman` : 'Yakuman' }}</span>
              <template v-else><span>{{ result.han }} han<span v-if="showFu"> · {{ result.fu }} fu</span></span><span v-if="result.handName" class="limit-badge">{{ limitName(result.handName) }}</span></template>
              <button type="button" class="breakdown-button" :aria-expanded="showBreakdown" aria-controls="score-breakdown" @click="toggleBreakdown">{{ showBreakdown ? 'Hide breakdown' : 'View breakdown' }}</button>
            </div>
            <p class="payment-context">{{ form.winType === 'ron' ? 'Ron' : 'Tsumo' }} · {{ isDealer ? 'Dealer' : 'Non-dealer' }}<template v-if="form.honba"> · {{ form.honba }} honba included</template></p>
          </template>
        </div>
      </aside>

      <form class="calculator-form" aria-label="Riichi hand details" @input="hasInteracted = true" @click="hasInteracted = true" @submit.prevent>
        <div class="entry-mode" role="group" aria-label="Scoring entry method">
          <button type="button" :class="{ selected: entryMode === 'tiles' }" :aria-pressed="entryMode === 'tiles'" @click="setEntryMode('tiles')"><strong>Enter your tiles</strong><small>Tile entry · finds yaku and fu</small></button>
          <button type="button" :class="{ selected: entryMode === 'hanfu' }" :aria-pressed="entryMode === 'hanfu'" @click="setEntryMode('hanfu')"><strong>Enter han &amp; fu</strong><small>Quick · for a known score</small></button>
        </div>
        <div class="player-count-row" role="group" aria-label="Players at the table">
          <span class="field-label">Players</span>
          <div class="choice-row compact-choice" role="group" aria-label="Players at the table">
            <button type="button" class="choice-button" :class="{ selected: form.playerCount === 4 }" :aria-pressed="form.playerCount === 4" @click="form.playerCount = 4">Four player</button>
            <button type="button" class="choice-button" :class="{ selected: form.playerCount === 3 }" :aria-pressed="form.playerCount === 3" @click="form.playerCount = 3">Three player</button>
          </div>
        </div>

        <section v-if="entryMode === 'hanfu'" class="calc-section direct-entry" aria-labelledby="direct-heading">
          <div class="section-heading"><span class="step-number">1</span><div><h2 id="direct-heading">Enter the hand value</h2><p>Enter total han, including yaku and dora. Fu does not affect 5 han and above.</p></div></div>
          <div class="direct-fields">
            <div class="direct-field" :class="{ 'direct-field-invalid': directHanIssue }">
              <label for="direct-han">Total han</label>
              <p id="direct-han-hint" class="field-hint">Include yaku and bonus han. Tap a total or enter your own.</p>
              <div class="han-shortcuts" role="group" aria-label="Common han totals">
                <button v-for="han in 5" :key="han" type="button" class="choice-button" :class="{ selected: form.directHan === han }" :aria-pressed="form.directHan === han" :aria-label="`Set total to ${han} han`" @click="setDirectHanPreset(han)">{{ han }}</button>
              </div>
              <div class="stepper" role="group" aria-label="Total han"><button type="button" aria-label="Remove one han" :disabled="form.directHan <= 0" @click="adjustDirect('directHan', -1)">−</button><input id="direct-han" ref="directHanInput" v-model.number="form.directHan" type="number" inputmode="numeric" min="0" max="99" :aria-invalid="directHanIssue || undefined" :aria-describedby="directHanIssue ? 'direct-entry-error' : 'direct-han-hint'" @change="sanitizeDirect('directHan', 99)" /><button type="button" aria-label="Add one han" @click="adjustDirect('directHan', 1, 99)">+</button></div>
            </div>
            <div v-if="form.directHan > 0 && form.directHan < 5" class="direct-field" :class="{ 'direct-field-invalid': directFuIssue }"><label for="direct-fu">Fu</label><p id="direct-fu-hint" class="field-hint">Choose the rounded fu total</p><select id="direct-fu" ref="directFuInput" v-model.number="form.directFu" :aria-invalid="directFuIssue || undefined" :aria-describedby="directFuIssue ? 'direct-entry-error' : 'direct-fu-hint'"><option v-if="!directFuOptions.includes(form.directFu)" :value="form.directFu">{{ form.directFu }} fu · check selection</option><option v-for="fu in directFuOptions" :key="fu" :value="fu" :disabled="(fu === 20 && (form.winType !== 'tsumo' || form.directHan < 2 || !form.isClosed)) || (fu === 25 && (form.directHan < 2 || !form.isClosed || (form.winType === 'tsumo' && form.directHan < 3)))">{{ fu }} fu</option></select></div>
          </div>
          <div v-if="form.directHan > 0 && form.directHan < 5 && (form.directFu === 20 || form.directFu === 25)" ref="directClosedControl" class="direct-closed-control">
            <span class="field-label">Is the hand closed?</span>
            <div class="choice-row" role="group" aria-label="Is the hand closed?">
              <button type="button" class="choice-button" :class="{ selected: form.isClosed }" :aria-pressed="form.isClosed" @click="form.isClosed = true">Yes</button>
              <button type="button" class="choice-button" :class="{ selected: !form.isClosed }" :aria-pressed="!form.isClosed" @click="form.isClosed = false">No</button>
            </div>
          </div>
          <p v-if="directEntryIssue" id="direct-entry-error" class="field-problems" role="status">{{ directEntryIssue }}</p>
          <p v-else-if="form.directHan >= 5" class="field-hint">Fu is ignored at 5 han and above.</p>
          <p v-if="form.directHan >= 13" class="field-hint">For stacked yakuman, double yakuman waits or pao, enter the tiles to calculate each payment correctly.</p>
        </section>
        <div v-if="entryMode === 'tiles' && tileStep === 0 && undoSnapshot" class="tile-clear-undo">
          <button type="button" class="reset-button" @click="undoClear">Undo new hand</button>
        </div>
        <RiichiTileHandEntry
          v-if="tileEntryMounted"
          v-show="entryMode === 'tiles'"
          ref="tileEntrySection"
          :model-value="form.tileEntry"
          :stage="tileStep"
          :result-panel-visible="!keyboardOpen && tileStep === 1"
          :player-count="form.playerCount"
          :aka-dora-count="tileAkaDoraCount"
          :riichi="form.tileSituation.riichi !== 'none'"
          :tile-situation="form.tileSituation"
          :undo-context="{ tilePaoApplies: form.tilePaoApplies, tilePaoResponsibleSeat: form.tilePaoResponsibleSeat, tileRonDiscarderSeat: form.tileRonDiscarderSeat, contextRevision: tileContextRevision }"
          :physical-error="tileHandPhysicalIssue"
          :shape-error="tileShapeIssue"
          @update:model-value="form.tileEntry = $event"
          @next-step="tileStep = 1; scrollToTileDetails()"
          @previous-step="tileStep = 0; scrollToTileDetails()"
          @restore-tile-situation="restoreTileSituation"
          @new-hand="resetCalculator"
        >
          <template #win-details>
            <section class="calc-section tile-win-context" tabindex="-1" aria-labelledby="tile-win-context-heading">
              <div class="section-heading"><div><h2 id="tile-win-context-heading">Win details</h2><p>{{ tileWinningSelected ? 'Your winning tile is marked above. Tap another tile to change it.' : 'Mark the tile that completed the hand above; the payment uses these details.' }}</p></div></div>
              <span class="field-label">How did you win?</span>
              <div class="choice-row" role="group" aria-label="Winning method">
                <button v-for="option in winOptions" :key="'tile-' + option.id" type="button" class="choice-button" :class="{ selected: form.winType === option.id }" :aria-pressed="form.winType === option.id" @click="form.winType = option.id">{{ option.label }}</button>
              </div>
              <span class="field-label">Are you the dealer?</span>
              <div class="choice-row" role="group" aria-label="Dealer status">
                <button type="button" class="choice-button" :class="{ selected: isDealer }" :aria-pressed="isDealer" @click="setDealer(true)">Yes</button>
                <button type="button" class="choice-button" :class="{ selected: !isDealer }" :aria-pressed="!isDealer" @click="setDealer(false)">No</button>
              </div>
              <span class="field-label">Riichi declaration</span>
              <div class="choice-row" role="group" aria-label="Riichi declaration">
                <button v-for="option in tileRiichiOptions" :key="'context-' + option.id" type="button" class="choice-button" :class="{ selected: form.tileSituation.riichi === option.id }" :aria-pressed="form.tileSituation.riichi === option.id" :disabled="option.id !== 'none' && tileHasOpenMeld" @click="setTileRiichi(option.id)">{{ option.label }}</button>
              </div>
              <label v-if="form.tileSituation.riichi !== 'none'" class="checkbox-row"><input v-model="form.tileSituation.ippatsu" type="checkbox" :disabled="form.tileSituation.rinshan" @change="markTileContextChanged" /><span>Ippatsu · win before your next discard, with no intervening calls or kans</span></label>
              <p v-if="tileHasOpenMeld" class="field-hint">Riichi needs a closed hand. A concealed kan is allowed.</p>
            </section>
          </template>
        </RiichiTileHandEntry>
        <section v-if="entryMode !== 'tiles' || tileStep === 1" ref="winSection" class="calc-section win-section" tabindex="-1" aria-labelledby="win-heading">
          <div class="section-heading">
            <span v-if="entryMode !== 'tiles'" class="step-number">{{ entryMode === 'hanfu' ? 2 : 1 }}</span>
            <div>
              <h2 id="win-heading">{{ entryMode === 'tiles' ? 'Table and honba' : 'How did you win?' }}</h2>
              <p>{{ entryMode === 'tiles' ? 'Confirm the winds and repeat counter for this hand.' : 'Choose Ron or Tsumo and your dealer status.' }}</p>
            </div>
          </div>

          <div v-if="entryMode === 'hanfu'" class="choice-row" role="group" aria-label="Winning method">
            <button v-for="option in winOptions" :key="option.id" type="button" class="choice-button" :class="{ selected: form.winType === option.id }" :aria-pressed="form.winType === option.id" @click="form.winType = option.id">
              {{ option.label }}
            </button>
          </div>

          <template v-if="entryMode === 'hanfu'">
          <span class="field-label">Are you the dealer?</span>
          <div class="choice-row" role="group" aria-label="Dealer status">
            <button type="button" class="choice-button" :class="{ selected: isDealer }" :aria-pressed="isDealer" @click="setDealer(true)">Yes</button>
            <button type="button" class="choice-button" :class="{ selected: !isDealer }" :aria-pressed="!isDealer" @click="setDealer(false)">No</button>
          </div>
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

          <details class="hand-help"><summary>Table scoring rules</summary><p>The Saujana table uses kiriage mangan off and 4 fu for a double-wind pair. Three-player tsumo includes payments from the two opponents still at the table. Riichi sticks are collected separately and are not included in this score.</p></details>
          </details>

          <div ref="honbaSection" class="bonus-control honba-control" tabindex="-1" aria-labelledby="honba-count-label">
            <div class="bonus-copy"><label id="honba-count-label" for="honba-count">Honba · repeat counter</label><span>+300 on ron; +100 from each payer on tsumo</span></div>
            <div class="stepper" role="group" aria-label="Honba">
              <button type="button" aria-label="Remove one honba" :disabled="form.honba <= 0" @click="form.honba = Math.max(0, form.honba - 1)">−</button>
              <input id="honba-count" v-model.number="form.honba" type="number" inputmode="numeric" min="0" max="99" step="1" @change="form.honba = Math.min(99, integerAtLeastZero(form.honba))" />
              <button type="button" aria-label="Add one honba" :disabled="form.honba >= 99" @click="form.honba = Math.min(99, form.honba + 1)">+</button>
            </div>
          </div>
        </section>

        <section v-if="entryMode === 'tiles' && tileStep === 1" ref="tileDetailsSection" class="calc-section tile-situation-section" tabindex="-1" aria-labelledby="tile-situation-heading">
          <div class="section-heading"><div><h2 id="tile-situation-heading">Special circumstances</h2><p>Set nuki tiles and special win details when they apply.</p></div></div>
          <div v-if="tileWindsNeeded && needsWindsConfirmation" class="wind-prompt"><p>Confirm the winds to score any wind sets and pair correctly.</p><template v-if="!seatWindConfirmed"><span class="field-label">Your seat wind</span><div class="choice-row" role="group" aria-label="Confirm your seat wind"><button v-for="wind in promptSeatWinds" :key="wind.id" type="button" class="choice-button" @click="setSeatWind(wind.id)">{{ wind.label }}</button></div></template><template v-if="!roundWindConfirmed"><span class="field-label">Round wind</span><div class="choice-row" role="group" aria-label="Confirm round wind"><button v-for="wind in availableRoundWinds" :key="wind.id" type="button" class="choice-button" @click="setRoundWind(wind.id)">{{ wind.label }} round</button></div></template></div>
          <div v-if="form.playerCount === 3" class="tile-nuki-control"><div><label for="tile-nuki-count">North tiles extracted as nuki dora</label><small>Count each North for tile checks. Its bonus is {{ form.tileEntry.doraEntryMode === 'indicators' ? 'counted automatically.' : 'included in the total above.' }}</small></div><div class="stepper" role="group" aria-label="North tiles extracted as nuki dora"><button type="button" aria-label="Remove one North bonus tile" :disabled="form.bonusHan.nuki <= 0" @click="adjustBonus('nuki', -1)">−</button><input id="tile-nuki-count" v-model.number="form.bonusHan.nuki" type="number" inputmode="numeric" min="0" max="4" step="1" @change="sanitizeBonus('nuki', 4)" /><button type="button" aria-label="Add one North bonus tile" :disabled="form.bonusHan.nuki >= 4" @click="adjustBonus('nuki', 1, 4)">+</button></div></div>
          <div v-if="form.tileEntry.doraEntryMode === 'total'" class="tile-nuki-control"><div><label for="other-kan-count-total">Other players’ kans</label><small>Used to check first-draw wins.</small></div><div class="stepper" role="group" aria-label="Kans declared by other players"><button type="button" aria-label="Decrease other players’ kans" :disabled="form.tileEntry.otherKanCount <= 0" @click="adjustOpponentKanCount(-1)">−</button><input id="other-kan-count-total" :value="form.tileEntry.otherKanCount" type="number" inputmode="numeric" min="0" :max="4 - tileKanCount" step="1" @change="commitOpponentKanCount($event)" /><button type="button" aria-label="Increase other players’ kans" :disabled="tileKanCount + form.tileEntry.otherKanCount >= 4" @click="adjustOpponentKanCount(1)">+</button></div></div>
          <details ref="specialWinDetails" class="tile-situation-details"><summary>Special win circumstances</summary><div class="tile-situation-grid">
            <label class="checkbox-row"><input v-model="form.tileSituation.haitei" type="checkbox" :disabled="form.winType !== 'tsumo' || form.tileSituation.rinshan" @change="markTileContextChanged" /><span>Haitei · last draw</span></label>
            <label class="checkbox-row"><input v-model="form.tileSituation.houtei" type="checkbox" :disabled="form.winType !== 'ron' || form.tileSituation.chankan" @change="markTileContextChanged" /><span>Houtei · last discard</span></label>
            <label class="checkbox-row"><input v-model="form.tileSituation.rinshan" type="checkbox" :disabled="form.winType !== 'tsumo' || !tileHasKan || form.tileSituation.haitei" @change="markTileContextChanged" /><span>Rinshan · after a kan</span></label>
            <label class="checkbox-row"><input v-model="form.tileSituation.chankan" type="checkbox" :disabled="form.winType !== 'ron' || form.tileSituation.houtei" @change="markTileContextChanged" /><span>Chankan · robbed an opponent's added kan</span></label>
            <label class="checkbox-row"><input v-model="form.tileSituation.renhou" type="checkbox" :disabled="form.winType !== 'ron' || isDealer || form.tileSituation.riichi !== 'none' || tileHasOpenMeld || tileHasKan || form.tileEntry.otherKanCount > 0 || form.bonusHan.nuki > 0 || form.tileSituation.houtei || form.tileSituation.chankan" @change="markTileContextChanged" /><span>Renhou · non-dealer ron before your first draw</span></label>
            <label v-if="form.winType === 'tsumo'" class="checkbox-row"><input v-model="form.tileSituation.openingWin" type="checkbox" true-value="opening" false-value="" :disabled="form.tileSituation.riichi !== 'none' || tileHasOpenMeld || tileHasKan || form.tileEntry.otherKanCount > 0 || form.bonusHan.nuki > 0 || form.tileSituation.haitei || form.tileSituation.rinshan" @change="markTileContextChanged" /><span>{{ isDealer ? 'Tenhou · dealer’s first draw' : 'Chiihou · non-dealer’s first draw' }}</span></label>
            <p v-if="form.winType === 'tsumo'" class="field-hint">The first draw must be before any player calls or declares a kan.</p>
          </div><label class="checkbox-row"><input v-model="form.tileSituation.doubleYakuman" type="checkbox" @change="markTileContextChanged" /><span>Apply double yakuman rules</span></label><p class="field-hint">Includes thirteen-sided Kokushi, Suuankou tanki, pure Chuuren and Daisuushi.</p></details>
          <details v-if="hasTilePaoYaku" ref="paoDetails" class="tile-situation-details"><summary>Pao · liability</summary><label class="checkbox-row"><input v-model="form.tilePaoApplies" type="checkbox" @change="markTileContextChanged" /><span>Pao applies under the table rules</span></label><template v-if="form.tilePaoApplies"><p class="field-hint">Pao applies when another player supplied the final set that completed Daisangen or Daisuushi.</p><template v-if="!seatWindConfirmed"><p class="field-hint">Confirm your seat first so the responsible-player choices are correct.</p><span class="field-label">Your seat wind</span><div class="choice-row" role="group" aria-label="Confirm your seat wind for pao"><button v-for="wind in availableSeatWinds" :key="wind.id" type="button" class="choice-button" @click="setSeatWind(wind.id)">{{ wind.label }}</button></div></template><template v-else><label class="field-label">Responsible player<select v-model="form.tilePaoResponsibleSeat" class="tile-select" @change="markTileContextChanged"><option :value="null">Choose a seat</option><option v-for="wind in otherSeatWinds" :key="wind.id" :value="wind.id">{{ wind.label }}</option></select></label><label v-if="form.winType === 'ron'" class="field-label">Who discarded the winning tile?<select v-model="form.tileRonDiscarderSeat" class="tile-select" @change="markTileContextChanged"><option :value="null">Choose a seat</option><option v-for="wind in otherSeatWinds" :key="wind.id" :value="wind.id">{{ wind.label }}</option></select></label></template></template></details>
          <p v-if="tileScoreIssue" class="field-problems" role="status">{{ tileScoreIssue }}</p>
          <p class="field-hint">Payment updates as you complete these details.</p>
        </section>

        <section v-if="resultReady && showBreakdown" id="score-breakdown" ref="breakdownSection" class="calc-section score-details" tabindex="-1" aria-labelledby="breakdown-heading">
          <h2 id="breakdown-heading">Score breakdown</h2>
          <p class="score-note">{{ formatPoints(result.points) }} from the table<span v-if="form.honba">, including {{ form.honba }} honba</span>.</p>
          <div v-if="showFu && result.fuBreakdown" class="fu-breakdown">
            <h3>Fu breakdown <span>{{ result.fu }} total</span></h3>
            <p v-for="(line, index) in fuLines" :key="index"><span>{{ line.label }}</span><strong>{{ line.fu ? `+${line.fu}` : '—' }}</strong></p>
          </div>
          <div v-if="entryMode === 'hanfu'" class="result-yaku"><h3>Entered value</h3><p><span>Total han</span><strong>{{ form.directHan }} han</strong></p><p v-if="showFu"><span>Fu</span><strong>{{ result.fu }} fu</strong></p></div>
          <div v-else class="result-yaku"><h3>{{ result.isYakuman ? 'Yakuman breakdown' : 'Han breakdown' }}<label v-if="entryMode === 'tiles'" class="kanji-toggle result-kanji-toggle"><input v-model="showYakuKanji" type="checkbox" /><span>Show kanji <small lang="ja">日本語</small></span></label></h3><p v-for="(yaku, index) in result.yaku" :key="yaku.id + '-' + index"><span>{{ yaku.name }}<span v-if="showYakuKanji && (yakuKanjiNames[yaku.id] || yaku.nameJa)" class="yaku-kanji" lang="ja">{{ yakuKanjiNames[yaku.id] || yaku.nameJa }}</span></span><strong>{{ result.isYakuman ? `${yaku.han / 13} × Yakuman` : `${yaku.han} han` }}</strong></p><p v-if="result.bonusHan"><span>Bonus han</span><strong>{{ result.bonusHan }} han</strong></p></div>
        </section>
      </form>
    </div>
  </main>
</template>

<script setup>
import {
  MANUAL_YAKU,
  calculateManualHanFuScore,
} from '~/utils/scoring/manual'
import { score as scoreFullHand } from '~/utils/scoring/index'
import { parseHand } from '~/utils/scoring/hand-parser'
import { validateTileSet } from '~/utils/scoring/tile-set'
import { DEFAULT_LOCAL_YAKU } from '~/utils/scoring/types'

useHead({
  title: 'Riichi Calculator | Saujana BGC',
  bodyAttrs: { class: 'riichi-calculator-body' },
  meta: [{ name: 'description', content: 'Quickly estimate riichi mahjong han, fu and payments for ron or tsumo.' }],
})

const tileArtworkPaths = [
  ...['Man', 'Pin', 'Sou'].flatMap(suit => [
    ...Array.from({ length: 9 }, (_, index) => `/tiles/${suit}${index + 1}.svg`),
    `/tiles/${suit}5-Dora.svg`,
  ]),
  ...['Ton', 'Nan', 'Shaa', 'Pei', 'Haku', 'Hatsu', 'Chun'].map(tile => `/tiles/${tile}.svg`),
]
const tileArtworkPreloads = []
const yakuKanjiNames = {
  riichi: '立直', 'double-riichi': 'ダブル立直', ippatsu: '一発', pinfu: '平和', iipeiko: '一盃口', tanyao: '断么九', 'menzen-tsumo': '門前清自摸和',
  'yakuhai-haku': '白', 'yakuhai-hatsu': '發', 'yakuhai-chun': '中', 'yakuhai-seat': '自風牌', 'yakuhai-round': '場風牌',
  chankan: '槍槓', rinshan: '嶺上開花', haitei: '海底摸月', houtei: '河底撈魚', chiitoitsu: '七対子', ittsu: '一気通貫',
  'sanshoku-doujun': '三色同順', 'sanshoku-doukou': '三色同刻', toitoi: '対々和', sanankou: '三暗刻', sankantsu: '三槓子',
  chanta: '混全帯么九', honroutou: '混老頭', shousangen: '小三元', ryanpeiko: '二盃口', honitsu: '混一色', junchan: '純全帯么九',
  renhou: '人和', chinitsu: '清一色', tenhou: '天和', chiihou: '地和', kokushi: '国士無双', chuuren: '九蓮宝燈',
  ryuuiisou: '緑一色', suuankou: '四暗刻', suuankantsu: '四槓子', chinroutou: '清老頭', tsuuiisou: '字一色',
  daisangen: '大三元', shousuushi: '小四喜', daisuushi: '大四喜',
}

const winOptions = [
  { id: 'ron', label: 'Ron · from a discard' },
  { id: 'tsumo', label: 'Tsumo · self-drawn' },
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
  tileEntry: { tiles: [], melds: [], winningIndex: null, doraIndicators: [], uraIndicators: [], doraEntryMode: 'total', totalBonusHan: 0, otherKanCount: 0 },
  tileSituation: { riichi: 'none', ippatsu: false, haitei: false, houtei: false, rinshan: false, chankan: false, renhou: false, openingWin: false, doubleYakuman: false },
  tilePaoApplies: false,
  tilePaoResponsibleSeat: null,
  tileRonDiscarderSeat: null,
  bonusHan: { dora: 0, nuki: 0 },
  honba: 0,
  directHan: 0,
  directFu: 30,
})

const form = reactive(initialState())
const entryMode = ref('tiles')
const tileStep = ref(0)
const tileEntryMounted = ref(false)
const resultPanelRef = ref(null)
const mobileResultPanelHeight = ref(0)
const showYakuKanji = ref(true)
const SESSION_STORAGE_KEY = 'saujana-riichi-calculator-session-v1'
let resultPanelResizeObserver
const undoSnapshot = ref(null)
const tileContextRevision = ref(0)
const tileAkaDoraCount = computed(() => form.tileEntry.tiles.filter(token => typeof token === 'string' && token.endsWith('r')).length)
const hasInteracted = ref(false)
const showBreakdown = ref(false)
const copyLabel = ref('Copy')
const breakdownSection = ref(null)
const winSection = ref(null)
const tileEntrySection = ref(null)
const tileDetailsSection = ref(null)
const honbaSection = ref(null)
const specialWinDetails = ref(null)
const paoDetails = ref(null)
const directHanInput = ref(null)
const directFuInput = ref(null)
const directClosedControl = ref(null)
const keyboardOpen = ref(false)
const tutorialTrigger = ref(null)
const tutorialDialog = ref(null)
let nextIssueHighlightTimer
let persistTimer
let copyLabelTimer

async function openTutorial() {
  await tutorialDialog.value?.open(tutorialTrigger.value)
}

watch(form, () => { if (undoSnapshot.value) undoSnapshot.value = null }, { deep: true, flush: 'sync' })
watch(entryMode, () => { if (undoSnapshot.value) undoSnapshot.value = null }, { flush: 'sync' })

function restoreSessionState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? 'null')
    if (![1, 2].includes(saved?.version) || !saved.form || typeof saved.form !== 'object') return
    const savedTileEntry = saved.form.tileEntry
    const isSavedTileToken = tile => typeof tile === 'string' && /^(?:[mps][1-9]r?|h[0-6])$/.test(tile) && (!tile.endsWith('r') || tile[1] === '5')
    if (savedTileEntry !== undefined && (!savedTileEntry || typeof savedTileEntry !== 'object' || Array.isArray(savedTileEntry)
      || !Array.isArray(savedTileEntry.tiles) || !savedTileEntry.tiles.every(isSavedTileToken)
      || !Array.isArray(savedTileEntry.melds) || !savedTileEntry.melds.every(meld => meld && typeof meld === 'object' && !Array.isArray(meld)
        && ['chi', 'pon', 'kan-open', 'kan-closed', 'kan-added'].includes(meld.type)
        && Array.isArray(meld.tokens) && meld.tokens.every(isSavedTileToken)
        && (meld.tileIndices === undefined || Array.isArray(meld.tileIndices) && meld.tileIndices.every(Number.isInteger)))
      || savedTileEntry.doraIndicators !== undefined && (!Array.isArray(savedTileEntry.doraIndicators) || !savedTileEntry.doraIndicators.every(isSavedTileToken))
      || savedTileEntry.uraIndicators !== undefined && (!Array.isArray(savedTileEntry.uraIndicators) || !savedTileEntry.uraIndicators.every(isSavedTileToken)))) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
      return
    }
    const defaults = initialState()
    Object.assign(form, defaults)
    for (const key of Object.keys(defaults)) {
      if (['tileEntry', 'tileSituation', 'bonusHan'].includes(key)) continue
      if (Object.prototype.hasOwnProperty.call(saved.form, key)) form[key] = saved.form[key]
    }
    const savedBonusHan = saved.form.bonusHan && typeof saved.form.bonusHan === 'object' && !Array.isArray(saved.form.bonusHan) ? saved.form.bonusHan : {}
    form.bonusHan = { ...defaults.bonusHan, ...savedBonusHan }
    if (saved.entryMode === 'tiles' || saved.entryMode === 'hanfu') entryMode.value = saved.entryMode
    if (Number.isInteger(saved.tileStep) && [0, 1].includes(saved.tileStep)) tileStep.value = saved.tileStep
    if (savedTileEntry) {
      const restoredTiles = [...savedTileEntry.tiles]
      const restoredMelds = savedTileEntry.melds.map(meld => {
        if (Array.isArray(meld.tileIndices)) return meld
        const start = restoredTiles.length
        restoredTiles.push(...(Array.isArray(meld.tokens) ? meld.tokens : []))
        return { ...meld, tileIndices: (meld.tokens ?? []).map((_, index) => start + index) }
      })
      const restoredDoraEntryMode = savedTileEntry.doraEntryMode === 'total' || savedTileEntry.doraEntryMode === 'indicators'
        ? savedTileEntry.doraEntryMode
        : savedTileEntry.doraIndicators?.length || savedTileEntry.uraIndicators?.length ? 'indicators' : 'total'
      const storedOtherBonusHan = Number.isSafeInteger(savedTileEntry.totalBonusHan) && savedTileEntry.totalBonusHan >= 0
        ? Math.min(99, savedTileEntry.totalBonusHan)
        : 0
      const legacyRedDoraCount = saved.version === 1 && restoredDoraEntryMode === 'total'
        ? restoredTiles.filter(token => token.endsWith('r')).length
        : 0
      form.tileEntry = {
        ...initialState().tileEntry,
        ...savedTileEntry,
        doraEntryMode: restoredDoraEntryMode,
        totalBonusHan: Math.max(0, storedOtherBonusHan - legacyRedDoraCount),
        tiles: restoredTiles,
        melds: restoredMelds,
        doraIndicators: Array.isArray(saved.form.tileEntry.doraIndicators) ? saved.form.tileEntry.doraIndicators : [],
        uraIndicators: Array.isArray(saved.form.tileEntry.uraIndicators) ? saved.form.tileEntry.uraIndicators : [],
        otherKanCount: Number.isSafeInteger(savedTileEntry.otherKanCount) ? Math.min(4, Math.max(0, savedTileEntry.otherKanCount)) : 0,
      }
    }
    const savedTileSituation = saved.form.tileSituation && typeof saved.form.tileSituation === 'object' && !Array.isArray(saved.form.tileSituation) ? saved.form.tileSituation : {}
    form.tileSituation = { ...defaults.tileSituation, ...savedTileSituation }
    hasInteracted.value = Boolean(saved.hasInteracted)
    if (typeof saved.showYakuKanji === 'boolean') showYakuKanji.value = saved.showYakuKanji
  } catch {
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY) } catch { /* Storage may be unavailable. */ }
  }
}

function persistSessionState() {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      version: 2,
      form: toRaw(form),
      entryMode: entryMode.value,
      tileStep: tileStep.value,
      hasInteracted: hasInteracted.value,
      showYakuKanji: showYakuKanji.value,
    }))
  } catch { /* Storage may be unavailable or full; the calculator still works for this visit. */ }
}

function scheduleSessionPersist() {
  if (!import.meta.client) return
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(persistSessionState, 250)
}

function flushSessionPersist() {
  window.clearTimeout(persistTimer)
  persistTimer = undefined
  persistSessionState()
}

const directFuOptions = computed(() => {
  const han = integerAtLeastZero(form.directHan)
  return [20, 25, ...Array.from({ length: 9 }, (_, index) => 30 + index * 10)]
    .filter(fu => fu !== 25 || han >= (form.winType === 'tsumo' ? 3 : 2))
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
const tileRiichiOptions = [
  { id: 'none', label: 'No riichi' },
  { id: 'riichi', label: 'Riichi · 立直' },
  { id: 'double', label: 'Double riichi' },
]
const fullScoreYakuNames = { tsumo: 'Menzen Tsumo', renho: 'Renhou', tenhou: 'Tenhou', chiihou: 'Chiihou', chuurenpoutou: 'Chuuren poutou', suukantsu: 'Suukantsu' }
const tileHandTarget = computed(() => 14 + form.tileEntry.melds.filter(meld => meld.type.startsWith('kan')).length)
const tileWinningSelected = computed(() => Number.isInteger(form.tileEntry.winningIndex) && form.tileEntry.winningIndex >= 0 && form.tileEntry.winningIndex < form.tileEntry.tiles.length)
const tileKanCount = computed(() => form.tileEntry.melds.filter(meld => meld.type.startsWith('kan')).length)
const tileWindsNeeded = computed(() => {
  if (!form.tileEntry.tiles.some(token => /^h[0-3]$/.test(token))) return false
  const parsed = parsedTileHand.value
  if (parsed.type === 'invalid' || parsed.type === 'kokushi') return false
  // Seven pairs has fixed fu and no wind yaku. Ask about winds only when a
  // standard interpretation could also score the hand.
  return parsed.type !== 'chiitoitsu' || Boolean(parsed.standardAlt?.length)
})
const tileHasKan = computed(() => tileKanCount.value > 0)
const tileHasOpenMeld = computed(() => form.tileEntry.melds.some(meld => meld.type !== 'kan-closed'))
const openDragonSetCount = computed(() => form.tileEntry.melds.filter(meld => ['pon', 'kan-open', 'kan-added'].includes(meld.type) && /^h[4-6]$/.test(meld.tokens[0]) && meld.tokens.every(token => token === meld.tokens[0])).length)
const openWindSetCount = computed(() => form.tileEntry.melds.filter(meld => ['pon', 'kan-open', 'kan-added'].includes(meld.type) && /^h[0-3]$/.test(meld.tokens[0]) && meld.tokens.every(token => token === meld.tokens[0])).length)
const hasTilePaoYaku = computed(() => {
  const counts = new Map()
  for (const token of form.tileEntry.tiles) counts.set(token, (counts.get(token) ?? 0) + 1)
  const dragonSets = ['h4', 'h5', 'h6'].filter(token => counts.get(token) >= 3).length
  const windSets = ['h0', 'h1', 'h2', 'h3'].filter(token => counts.get(token) >= 3).length
  return dragonSets === 3 && openDragonSetCount.value > 0 || windSets === 4 && openWindSetCount.value > 0
})
watch([hasTilePaoYaku, () => form.tilePaoApplies, () => form.tilePaoResponsibleSeat, () => form.tileRonDiscarderSeat], ([qualifies]) => {
  if (!qualifies) {
    form.tilePaoApplies = false
    form.tilePaoResponsibleSeat = null
    form.tileRonDiscarderSeat = null
  }
}, { immediate: true })
watch(() => [form.seatWind, form.playerCount, form.winType, form.tilePaoResponsibleSeat, form.tileRonDiscarderSeat], () => {
  if (!otherSeatWinds.value.some(wind => wind.id === form.tilePaoResponsibleSeat)) form.tilePaoResponsibleSeat = null
  if (form.winType !== 'ron' || !otherSeatWinds.value.some(wind => wind.id === form.tileRonDiscarderSeat)) form.tileRonDiscarderSeat = null
}, { flush: 'sync' })
const tileHandPhysicalIssue = computed(() => validateTileSet(
  form.tileEntry.tiles.map(tileFromToken),
  { playerCount: form.playerCount },
))
const tilePhysicalIssue = computed(() => validateTileSet(
  [
    ...form.tileEntry.tiles,
    ...(form.tileEntry.doraEntryMode === 'indicators'
      ? [...form.tileEntry.doraIndicators, ...(form.tileSituation.riichi !== 'none' ? form.tileEntry.uraIndicators : [])]
      : []),
  ].map(tileFromToken),
  { playerCount: form.playerCount, nukiDoraCount: form.bonusHan.nuki },
))
const parsedTileHand = computed(() => {
  if (form.tileEntry.tiles.length !== tileHandTarget.value || !tileWinningSelected.value || tileHandPhysicalIssue.value) return { type: 'invalid' }
  const melds = form.tileEntry.melds.map(meld => ({ tiles: meld.tokens.map(tileFromToken) }))
  const calledTileIndices = new Set(form.tileEntry.melds.flatMap(meld => meld.tileIndices ?? []))
  const closedTiles = form.tileEntry.tiles
    .filter((_, index) => index !== form.tileEntry.winningIndex && !calledTileIndices.has(index))
    .map(tileFromToken)
  const winningTile = tileFromToken(form.tileEntry.tiles[form.tileEntry.winningIndex])
  return parseHand(closedTiles, melds, winningTile)
})
const tileShapeIssue = computed(() => {
  if (form.tileEntry.tiles.length !== tileHandTarget.value || !tileWinningSelected.value || tileHandPhysicalIssue.value) return ''
  const parsed = parsedTileHand.value
  return parsed.type === 'invalid'
    ? 'These tiles do not form a valid winning hand. Check the tiles, winning tile, and call or kan marks.'
    : ''
})
const otherSeatWinds = computed(() => availableSeatWinds.value.filter(wind => wind.id !== form.seatWind))
const paoNeedsSeatConfirmation = computed(() => hasTilePaoYaku.value && form.tilePaoApplies && !seatWindConfirmed.value)
const tileResult = computed(() => {
  const issues = []
  if (form.tileEntry.tiles.length !== tileHandTarget.value) issues.push('Enter all 14 hand tiles, plus one extra tile for each kan (' + tileHandTarget.value + ' tiles total).')
  if (form.playerCount === 3 && form.tileEntry.melds.some(meld => meld.type === 'chi')) issues.push('Chi calls are not allowed in three-player mahjong.')
  if (!Number.isInteger(form.tileEntry.winningIndex) || form.tileEntry.winningIndex < 0 || form.tileEntry.winningIndex >= form.tileEntry.tiles.length) issues.push('Choose the tile that completed the hand.')
  if (form.tileSituation.riichi !== 'none' && tileHasOpenMeld.value) issues.push('Riichi requires a closed hand; only a concealed kan keeps the hand closed.')
  if (tilePhysicalIssue.value) issues.push(tilePhysicalIssue.value)
  if (tileShapeIssue.value) issues.push(tileShapeIssue.value)
  const riichi = form.tileSituation.riichi !== 'none'
  if (issues.length) return { issues, isYakuman: false, han: 0, yakumanUnits: 0, fu: null, fuBreakdown: null, points: 0, ron: 0, yaku: [], bonusHan: 0 }

  const winningTile = tileFromToken(form.tileEntry.tiles[form.tileEntry.winningIndex])
  const calledTileIndices = new Set(form.tileEntry.melds.flatMap(meld => meld.tileIndices ?? []))
  const closedTiles = form.tileEntry.tiles.filter((_, index) => index !== form.tileEntry.winningIndex && !calledTileIndices.has(index)).map(tileFromToken)
  const melds = form.tileEntry.melds.map(meld => ({
    type: meld.type,
    tiles: meld.tokens.map(tileFromToken),
    ...(meld.calledTileIndex === undefined ? {} : { calledTileIndex: meld.calledTileIndex }),
  }))
  const hand = {
    closedTiles,
    melds,
    winningTile,
    winType: form.winType,
    seatWind: form.seatWind,
    roundWind: form.roundWind,
    doraIndicators: form.tileEntry.doraEntryMode === 'indicators' ? form.tileEntry.doraIndicators.map(tileFromToken) : [],
    uraDoraIndicators: form.tileEntry.doraEntryMode === 'indicators' && riichi ? form.tileEntry.uraIndicators.map(tileFromToken) : [],
    nukiDoraCount: form.playerCount === 3 ? integerAtLeastZero(form.bonusHan.nuki) : 0,
    opponentKanCount: Math.min(4 - tileKanCount.value, integerAtLeastZero(form.tileEntry.otherKanCount)),
    riichi: form.tileSituation.riichi === 'riichi',
    doubleRiichi: form.tileSituation.riichi === 'double',
    ippatsu: riichi && form.tileSituation.ippatsu,
    haitei: form.tileSituation.haitei,
    houtei: form.tileSituation.houtei,
    rinshan: form.tileSituation.rinshan,
    chankan: form.tileSituation.chankan,
    renho: form.tileSituation.renhou,
    ...(form.tileSituation.openingWin ? { openingWin: isDealer.value ? 'tenhou' : 'chiihou' } : {}),
    honba: integerAtLeastZero(form.honba),
    ...(form.tileEntry.doraEntryMode === 'total' ? { bonusHanOverride: Math.min(99, integerAtLeastZero(form.tileEntry.totalBonusHan)) } : {}),
  }
  const rules = {
    playerCount: form.playerCount,
    doubleYakuman: form.tileSituation.doubleYakuman,
    doubleWindPairFu: 4,
    kiriagemangan: false,
    localYaku: { ...DEFAULT_LOCAL_YAKU, renho: true },
  }
  const structural = scoreFullHand(hand, rules)
  const structuralYakuman = structural.valid && structural.yaku.some(yaku => yaku.isYakuman)
  const bonusExempt = structuralYakuman || structural.yaku.some(yaku => yaku.name === 'renho')
  if (!bonusExempt && tileWindsNeeded.value && needsWindsConfirmation.value) issues.push('Confirm the seat and round winds.')
  if (!structural.valid) issues.push(structural.error || 'Check the tiles and win details.')
  if (issues.length) return { issues, isYakuman: structuralYakuman, han: structural.totalHan, yakumanUnits: structuralYakuman ? Math.round(structural.yaku.filter(yaku => yaku.isYakuman).reduce((sum, yaku) => sum + yaku.han, 0) / 13) : 0, fu: structural.fu, fuBreakdown: structural.fuBreakdown, points: 0, ron: 0, yaku: structural.yaku, bonusHan: 0 }
  const indicatorEntryMode = form.tileEntry.doraEntryMode === 'indicators'
  if (indicatorEntryMode && form.tileEntry.doraIndicators.length > 5) issues.push('At most five face-up dora indicators can be revealed.')
  const requiredIndicators = 1 + tileKanCount.value + Math.min(4 - tileKanCount.value, integerAtLeastZero(form.tileEntry.otherKanCount))
  if (indicatorEntryMode && !bonusExempt && form.tileEntry.doraIndicators.length !== requiredIndicators) issues.push(`Enter exactly ${requiredIndicators} face-up dora ${requiredIndicators === 1 ? 'indicator' : 'indicators'} for the kans at this table.`)
  if (indicatorEntryMode && !bonusExempt && riichi && form.tileEntry.uraIndicators.length !== form.tileEntry.doraIndicators.length) issues.push('Add or remove ura indicators until there is one for each face-up dora indicator.')
  if (paoNeedsSeatConfirmation.value) issues.push('Confirm your seat before choosing pao players.')
  if (hasTilePaoYaku.value && form.tilePaoApplies && !form.tilePaoResponsibleSeat) issues.push('Choose the player responsible for pao.')
  if (hasTilePaoYaku.value && form.tilePaoApplies && form.winType === 'ron' && !form.tileRonDiscarderSeat) issues.push('Choose who discarded the winning tile for pao.')
  if (issues.length) return { issues, isYakuman: structuralYakuman, han: structural.totalHan, yakumanUnits: structuralYakuman ? Math.round(structural.yaku.filter(yaku => yaku.isYakuman).reduce((sum, yaku) => sum + yaku.han, 0) / 13) : 0, fu: structural.fu, fuBreakdown: structural.fuBreakdown, points: 0, ron: 0, yaku: structural.yaku, bonusHan: 0 }
  const scoringHand = {
    ...hand,
    ...(form.tileEntry.doraEntryMode === 'total' ? {
      bonusHanOverride: Math.min(99, integerAtLeastZero(form.tileEntry.totalBonusHan) + integerAtLeastZero(structural.akaDoraCount)),
    } : {}),
    ...(hasTilePaoYaku.value && form.tilePaoApplies && form.tilePaoResponsibleSeat ? { paoResponsibleSeat: form.tilePaoResponsibleSeat } : {}),
    ...(hasTilePaoYaku.value && form.winType === 'ron' && form.tilePaoApplies && form.tileRonDiscarderSeat ? { ronDiscarderSeat: form.tileRonDiscarderSeat } : {}),
  }
  const paoChangesScore = hasTilePaoYaku.value && form.tilePaoApplies && Boolean(form.tilePaoResponsibleSeat)
  const full = paoChangesScore || form.tileEntry.doraEntryMode === 'total' ? scoreFullHand(scoringHand, rules) : structural
  const isYakuman = full.yaku.some(yaku => yaku.isYakuman)
  const bonusHan = isYakuman || bonusExempt ? 0 : indicatorEntryMode
    ? full.doraCount + full.akaDoraCount + full.uraDoraCount + full.nukiDoraCount
    : Math.min(99, integerAtLeastZero(form.tileEntry.totalBonusHan) + full.akaDoraCount)
  const yakumanUnits = Math.round(full.yaku.filter(yaku => yaku.isYakuman).reduce((sum, yaku) => sum + yaku.han, 0) / 13)
  const fu = full.fuBreakdown
  const points = full.points
  const totalPoints = points.points ?? points.total
  const handName = points.handName ?? full.handName
  return {
    issues: full.valid ? [] : [full.error || 'Check the tiles and win details.'],
    isYakuman,
    han: full.totalHan + bonusHan,
    yakumanUnits,
    fu: full.fu,
    fuBreakdown: fu ? {
      base: fu.base - (form.winType === 'ron' && !tileHasOpenMeld.value && fu.base !== 25 ? 10 : 0),
      closedRon: form.winType === 'ron' && !tileHasOpenMeld.value && fu.base !== 25 ? 10 : 0,
      tsumo: fu.tsumoFu, pair: fu.pairFu, groups: fu.meldFu, wait: fu.waitFu,
      raw: fu.base + fu.pairFu + fu.meldFu + fu.waitFu + fu.tsumoFu, total: fu.total,
    } : null,
    handName,
    points: totalPoints,
    ron: points.ron ?? totalPoints,
    tsumo: points.tsumo,
    yaku: full.yaku.filter(yaku => !isYakuman || yaku.isYakuman).map(yaku => ({ id: yaku.name, name: MANUAL_YAKU.find(option => option.id === yaku.name)?.name ?? fullScoreYakuNames[yaku.name] ?? (yaku.name === 'yakuhai' ? yaku.detail : yaku.name), nameJa: yaku.nameJa, han: yaku.han })),
    bonusHan,
    pao: points.responsiblePays === undefined ? undefined : {
      responsiblePays: points.responsiblePays,
      discarderPays: points.discarderPays,
      otherTsumo: points.otherPlayersPay ? points.tsumo : undefined,
      responsibleIsDealer: form.tilePaoResponsibleSeat === 'east',
    },
  }
})
const tileScoreIssue = computed(() => {
  const issue = tileResult.value.issues[0] ?? ''
  return issue === 'No yaku'
    ? 'Your hand has no yaku yet, so it cannot win. Dora only adds bonus points. Check whether you declared riichi, won by tsumo with a closed hand, or entered the tiles correctly.'
    : issue
})
const tileResultMessage = computed(() => {
  if (tileStep.value === 0) {
    const remaining = tileHandTarget.value - form.tileEntry.tiles.length
    if (remaining > 0) return 'Add ' + remaining + (remaining === 1 ? ' more tile' : ' more tiles') + ' to continue.'
    if (remaining < 0) return 'Remove ' + Math.abs(remaining) + (remaining === -1 ? ' tile' : ' tiles') + ' to continue.'
    return 'Choose win details to calculate the payment.'
  }
  return tileScoreIssue.value || 'Review the tile entry to calculate the payment.'
})
function tileFromToken(token) {
  if (!token) return { suit: 'honor', value: 'east' }
  if (token[0] === 'h') return { suit: 'honor', value: ['east', 'south', 'west', 'north', 'haku', 'hatsu', 'chun'][Number(token[1])] }
  return { suit: ({ m: 'man', p: 'pin', s: 'sou' })[token[0]], value: Number(token[1]), ...(token.endsWith('r') ? { isAka: true } : {}) }
}
function setTileRiichi(value) {
  markTileContextChanged()
  form.tileSituation.riichi = value
  if (value === 'none') {
    form.tileSituation.ippatsu = false
    form.tileEntry.uraIndicators = []
  }
}
function restoreTileSituation(previous) {
  if (previous?.undoContext?.contextRevision !== tileContextRevision.value) return
  if (previous?.tileSituation) Object.assign(form.tileSituation, previous.tileSituation)
  if (previous?.undoContext) {
    const { contextRevision, ...context } = previous.undoContext
    Object.assign(form, context)
  }
}
function markTileContextChanged() { tileContextRevision.value++ }
const directEntryIssue = computed(() => form.directHan > 0 ? (quickScore.value.issues[0] ?? '') : '')
const directIssueField = computed(() => {
  const issue = directEntryIssue.value
  if (/20 fu is only possible on tsumo/i.test(issue)) return 'winType'
  if (/requires at least \d+ han|needs at least \d+ han|25 fu is seven pairs/i.test(issue)) return 'han'
  if (/requires a closed hand|closed hand with pinfu/i.test(issue)) return 'closed'
  if (/fu/i.test(issue)) return 'fu'
  if (/han/i.test(issue)) return 'han'
  if (/honba/i.test(issue)) return 'honba'
  return ''
})
const directHanIssue = computed(() => directIssueField.value === 'han')
const directFuIssue = computed(() => directIssueField.value === 'fu')

const windNames = { east: 'East', south: 'South', west: 'West', north: 'North' }
const availableSeatWinds = computed(() => {
  const winds = ['east', 'south', 'west', 'north']
  return winds.filter(wind => form.playerCount === 4 || wind !== 'north').map(wind => ({ id: wind, label: windNames[wind] }))
})
const availableRoundWinds = computed(() => ['east', 'south'].map(wind => ({ id: wind, label: windNames[wind] })))
const promptSeatWinds = computed(() => availableSeatWinds.value.filter(wind => form.isDealer || wind.id !== 'east'))
const isDealer = computed(() => form.isDealer)
const seatWindConfirmed = computed(() => form.isDealer || form.seatWindConfirmed)
const roundWindConfirmed = computed(() => form.roundWindConfirmed)
const needsWindsConfirmation = computed(() => entryMode.value === 'tiles' && tileWindsNeeded.value && (!seatWindConfirmed.value || !roundWindConfirmed.value))
const result = computed(() => entryMode.value === 'tiles' ? tileResult.value : quickScore.value)
const showFu = computed(() => !result.value.isYakuman && result.value.han < 5 && Boolean(result.value.fu))
const resultReady = computed(() => result.value.issues.length === 0 && result.value.han > 0)
const canJumpToNextIssue = computed(() => entryMode.value === 'tiles' ? tileStep.value === 1 && Boolean(tileScoreIssue.value) : Boolean(directEntryIssue.value))
const nextStepLabel = computed(() => entryMode.value === 'tiles'
  ? /no yaku/i.test(tileScoreIssue.value) ? 'Review win method and riichi' : 'Review hand details'
  : 'Enter han and fu')
const paoTsumoTotal = computed(() => {
  const pao = result.value.pao
  if (form.winType !== 'tsumo' || !pao) return null
  let total = pao.responsiblePays
  if (pao.otherTsumo) {
    const otherPayers = form.playerCount - 2
    total += (isDealer.value || pao.responsibleIsDealer)
      ? pao.otherTsumo.nonDealerPays * otherPayers
      : pao.otherTsumo.dealerPays + pao.otherTsumo.nonDealerPays * (otherPayers - 1)
  }
  return total
})
const resultShareText = computed(() => {
  const score = result.value
  const method = form.winType === 'ron' ? 'Ron' : 'Tsumo'
  const seat = isDealer.value ? 'Dealer' : 'Non-dealer'
  const value = score.isYakuman
    ? (score.yakumanUnits > 1 ? `${score.yakumanUnits} × Yakuman` : 'Yakuman')
    : `${score.han} han${showFu.value ? ` ${score.fu} fu` : ''}`
  const honba = form.honba ? ` · ${form.honba} honba` : ''
  if (form.winType === 'ron') {
    const payer = score.pao
      ? `Responsible ${formatPoints(score.pao.responsiblePays)}${score.pao.discarderPays ? ` · Discarder ${formatPoints(score.pao.discarderPays)}` : ''}`
      : `Discarder pays ${formatPoints(score.points)}`
    return `${method} · ${seat} · ${value} — ${payer}${honba}`
  }
  if (score.pao?.otherTsumo) {
    const others = (isDealer.value || score.pao.responsibleIsDealer)
      ? `Each other ${formatPoints(score.pao.otherTsumo.nonDealerPays)}`
      : `Dealer ${formatPoints(score.pao.otherTsumo.dealerPays)} · Other ${formatPoints(score.pao.otherTsumo.nonDealerPays)}`
    return `${method} · ${seat} · ${value} — Responsible ${formatPoints(score.pao.responsiblePays)} · ${others}${honba}`
  }
  if (score.pao) return `${method} · ${seat} · ${value} — Responsible pays ${formatPoints(score.pao.responsiblePays)}${honba}`
  const split = isDealer.value
    ? `Each pays ${formatPoints(score.tsumo.nonDealerPays)}`
    : `Dealer ${formatPoints(score.tsumo.dealerPays)} · Others ${formatPoints(score.tsumo.nonDealerPays)}`
  return `${method} · ${seat} · ${value} — Total ${formatPoints(score.points)} · ${split}${honba}`
})
const resultAnnouncement = computed(() => {
  if (!resultReady.value) return hasInteracted.value ? entryMode.value === 'tiles' ? tileResultMessage.value : 'Enter han and fu to see the payment.' : ''
  return resultShareText.value
})
const fuLines = computed(() => {
  const breakdown = result.value.fuBreakdown
  if (!breakdown) return []
  const lines = [{ label: 'Base', fu: breakdown.base }]
  if (breakdown.closedRon) lines.push({ label: 'Closed ron', fu: breakdown.closedRon })
  if (breakdown.tsumo) lines.push({ label: 'Tsumo', fu: breakdown.tsumo })
  if (breakdown.pair) lines.push({ label: 'Value pair', fu: breakdown.pair })
  if (breakdown.groups) lines.push({ label: 'Triplets and kans', fu: breakdown.groups })
  if (breakdown.wait) lines.push({ label: 'Closed, edge or pair wait', fu: breakdown.wait })
  if (breakdown.raw !== breakdown.total) lines.push({ label: 'Rounded up', fu: breakdown.total - breakdown.raw })
  return lines
})

function setEntryMode(mode) {
  entryMode.value = mode
  if (mode === 'tiles') tileEntryMounted.value = true
  hasInteracted.value = true
  showBreakdown.value = false
}

function scrollToTileDetails() {
  nextTick(() => {
    const tileSection = tileEntrySection.value?.$el
    const target = tileStep.value === 1
      ? tileSection?.querySelector('.tile-hand-entry')
      : tileSection?.querySelector('.tile-entry-extra-actions button:not(:disabled)') ?? tileSection?.querySelector('.tile-hand-entry')
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  })
}

function setDealer(value) {
  markTileContextChanged()
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
  markTileContextChanged()
  hasInteracted.value = true
  form.seatWind = wind
  form.seatWindConfirmed = true
  form.isDealer = wind === 'east'
}

function setRoundWind(wind) {
  markTileContextChanged()
  hasInteracted.value = true
  form.roundWind = wind
  form.roundWindConfirmed = true
}

function adjustDirect(key, amount, max = Infinity) {
  form[key] = Math.min(max, Math.max(0, integerAtLeastZero(form[key]) + amount))
}

function setDirectHanPreset(han) {
  form.directHan = han
  if (han >= 5 || !window.matchMedia('(max-width: 760px)').matches) return
  nextTick(() => {
    const fuField = directFuInput.value?.closest('.direct-field')
    if (!fuField) return
    const resultPanelTop = resultPanelRef.value?.getBoundingClientRect().top ?? window.innerHeight
    if (fuField.getBoundingClientRect().bottom <= resultPanelTop - 12) return
    fuField.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  })
}

function sanitizeDirect(key, max) {
  form[key] = Math.min(max, integerAtLeastZero(form[key]))
}

async function jumpToNextIssue() {
  let target
  if (entryMode.value === 'hanfu') {
    target = ({
      han: directHanInput.value,
      fu: directFuInput.value,
      closed: directClosedControl.value?.querySelector('.choice-row[aria-label="Is the hand closed?"] button:first-child'),
      winType: winSection.value?.querySelector('[aria-label="Winning method"] button[aria-pressed="false"]'),
      honba: honbaSection.value?.querySelector('input'),
    })[directIssueField.value] ?? directHanInput.value
  } else {
    const issue = tileScoreIssue.value
    if (/ura indicators|dora indicator/i.test(issue)) {
      await nextTick()
      target = tileEntrySection.value?.$el?.querySelector('.tile-indicators')
    } else if (/no yaku/i.test(issue)) {
      target = tileEntrySection.value?.$el?.querySelector('.tile-win-context')
    } else if (/pao/i.test(issue)) {
      const details = paoDetails.value
      if (details) {
        details.open = true
        await nextTick()
        if (/confirm your seat/i.test(issue)) {
          target = details.querySelector('[aria-label="Confirm your seat wind for pao"] button')
        } else {
          const fields = details.querySelectorAll('select')
          target = /who discarded/i.test(issue) ? fields[1] ?? fields[0] : fields[0]
        }
      }
    } else if (/seat and round winds|North tiles/i.test(issue)) {
      target = tileDetailsSection.value
    } else if (/Renhou|Haitei|Houtei|Rinshan|Chankan|Tenhou|Chiihou/i.test(issue)) {
      if (specialWinDetails.value) specialWinDetails.value.open = true
      await nextTick()
      const circumstance = issue.match(/Renhou|Haitei|Houtei|Rinshan|Chankan|Tenhou|Chiihou/i)?.[0]
      const options = [...(specialWinDetails.value?.querySelectorAll('.checkbox-row') ?? [])]
      target = options.find(option => option.textContent?.toLowerCase().includes(circumstance?.toLowerCase() ?? ''))?.querySelector('input')
    } else {
      target = tileEntrySection.value?.$el?.querySelector('.tile-hand-entry')
    }
  }
  if (!target) return
  target.focus({ preventScroll: true })
  target.classList.remove('issue-target-flash')
  void target.offsetWidth
  target.classList.add('issue-target-flash')
  window.clearTimeout(nextIssueHighlightTimer)
  nextIssueHighlightTimer = window.setTimeout(() => target.classList.remove('issue-target-flash'), 1200)
  target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

async function copyResult() {
  if (!resultReady.value) return
  const text = resultShareText.value
  let copied = false
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      copied = true
    } else {
      throw new Error('Clipboard API unavailable.')
    }
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      copied = document.execCommand('copy')
      document.body.removeChild(area)
    } catch { copied = false }
  }
  copyLabel.value = copied ? 'Copied' : 'Copy failed'
  window.clearTimeout(copyLabelTimer)
  copyLabelTimer = window.setTimeout(() => { copyLabel.value = 'Copy' }, 1600)
}

function adjustBonus(id, amount, max = Infinity) {
  form.bonusHan[id] = Math.min(max, Math.max(0, integerAtLeastZero(form.bonusHan[id]) + amount))
}

function sanitizeBonus(id, max = Infinity) {
  form.bonusHan[id] = Math.min(max, integerAtLeastZero(form.bonusHan[id]))
}

function adjustOpponentKanCount(amount) {
  setOpponentKanCount(integerAtLeastZero(form.tileEntry.otherKanCount) + amount)
}

function commitOpponentKanCount(event) {
  setOpponentKanCount(event.target.value)
  event.target.value = String(form.tileEntry.otherKanCount)
}

function setOpponentKanCount(value) {
  const count = Math.min(4 - tileKanCount.value, integerAtLeastZero(value))
  if (form.tileEntry.otherKanCount === count) return
  form.tileEntry.otherKanCount = count
  markTileContextChanged()
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
  const previousHand = JSON.parse(JSON.stringify({ form: toRaw(form), entryMode: entryMode.value, tileStep: tileStep.value }))
  undoSnapshot.value = null
  const table = { playerCount: form.playerCount, seatWind: form.seatWind, seatWindConfirmed: form.seatWindConfirmed, roundWind: form.roundWind, roundWindConfirmed: form.roundWindConfirmed, isDealer: form.isDealer, honba: form.honba }
  const currentEntryMode = entryMode.value
  Object.assign(form, initialState(), table)
  entryMode.value = currentEntryMode
  tileStep.value = 0
  hasInteracted.value = false
  showBreakdown.value = false
  await nextTick()
  tileEntrySection.value?.resetForNewHand()
  undoSnapshot.value = previousHand
  await focusAfterHandChange()
}

async function undoClear() {
  if (!undoSnapshot.value) return
  const previousHand = undoSnapshot.value
  undoSnapshot.value = null
  Object.assign(form, previousHand.form)
  entryMode.value = previousHand.entryMode
  tileStep.value = previousHand.tileStep ?? 0
  hasInteracted.value = true
  await nextTick()
  tileEntrySection.value?.restoreAfterUndo(tileStep.value)
  await focusAfterHandChange()
}

async function focusAfterHandChange() {
  await nextTick()
  let focusTarget
  if (entryMode.value === 'hanfu') focusTarget = directHanInput.value
  else if (entryMode.value === 'tiles') {
    const root = tileEntrySection.value?.$el
    focusTarget = tileStep.value === 0
      ? root?.querySelector('.tile-picker-grid button:not(:disabled)') ?? root?.querySelector('.entered-tile:not(:disabled)') ?? root?.querySelector('.tile-hand-entry')
      : root?.querySelector('.tile-hand-entry')
  } else focusTarget = directHanInput.value
  focusTarget?.focus({ preventScroll: true })
  focusTarget?.scrollIntoView({ block: 'start', behavior: 'auto' })
}

function updateKeyboardState() {
  const viewport = window.visualViewport
  const activeElement = document.activeElement
  const editingText = activeElement instanceof HTMLElement && activeElement.matches('input, textarea, select, [contenteditable="true"]')
  keyboardOpen.value = Boolean(window.matchMedia('(max-width: 760px)').matches && viewport && viewport.scale === 1 && editingText && window.innerHeight - viewport.height > 140)
}

function updateMobileResultPanelHeight() {
  mobileResultPanelHeight.value = resultPanelRef.value?.getBoundingClientRect().height ?? 0
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
  markTileContextChanged()
}, { flush: 'sync' })
watch(() => form.bonusHan.nuki, markTileContextChanged, { flush: 'sync' })

watch(() => form.winType, winType => {
  markTileContextChanged()
  if (winType !== 'tsumo') { form.tileSituation.haitei = false; form.tileSituation.rinshan = false }
  if (winType !== 'ron') { form.tileSituation.houtei = false; form.tileSituation.chankan = false; form.tileSituation.renhou = false }
  if (winType !== 'tsumo') form.tileSituation.openingWin = false
}, { flush: 'sync' })
watch([() => form.seatWind, () => form.isDealer], ([wind], [previousWind]) => {
  if (wind !== previousWind) form.tileSituation.openingWin = false
  if (wind === 'east' || isDealer.value) form.tileSituation.renhou = false
}, { flush: 'sync' })
watch(() => form.tileSituation.rinshan, value => {
  if (value) { form.tileSituation.ippatsu = false; form.tileSituation.haitei = false; form.tileSituation.openingWin = false }
}, { flush: 'sync' })
watch(() => form.tileSituation.haitei, value => { if (value) { form.tileSituation.rinshan = false; form.tileSituation.openingWin = false } }, { flush: 'sync' })
watch(() => form.tileSituation.chankan, value => { if (value) { form.tileSituation.houtei = false; form.tileSituation.renhou = false } }, { flush: 'sync' })
watch(() => form.tileSituation.houtei, value => { if (value) { form.tileSituation.chankan = false; form.tileSituation.renhou = false } }, { flush: 'sync' })
watch(() => form.tileSituation.riichi, value => { if (value !== 'none') { form.tileSituation.renhou = false; form.tileSituation.openingWin = false } }, { flush: 'sync' })
watch(() => [tileHasOpenMeld.value, tileHasKan.value, form.tileEntry.otherKanCount > 0, form.bonusHan.nuki > 0], ([hasOpenMeld, hasKan, hasOpponentKan, hasNuki]) => {
  if (hasOpenMeld) {
    form.tileSituation.riichi = 'none'
    form.tileSituation.ippatsu = false
    form.tileSituation.renhou = false
    form.tileEntry.uraIndicators = []
  }
  if (hasKan || hasOpponentKan || hasNuki) {
    form.tileSituation.renhou = false
  }
  if (hasKan) {
    form.tileSituation.openingWin = false
  }
  if (hasOpenMeld || hasKan || hasOpponentKan || hasNuki) form.tileSituation.openingWin = false
}, { flush: 'sync' })
watch(() => tileHasKan.value, value => { if (!value) form.tileSituation.rinshan = false }, { flush: 'sync' })

watch(() => [form.winType, form.isClosed], () => { hasInteracted.value = true }, { flush: 'sync' })
watch([form, entryMode, tileStep, hasInteracted, showYakuKanji], scheduleSessionPersist, { deep: true, flush: 'post' })

onMounted(() => {
  for (const src of tileArtworkPaths) {
    const image = new Image()
    image.decoding = 'async'
    image.fetchPriority = 'low'
    image.src = src
    tileArtworkPreloads.push(image)
  }
  restoreSessionState()
  tileEntryMounted.value = entryMode.value === 'tiles'
  nextTick(updateMobileResultPanelHeight)
  if ('ResizeObserver' in window && resultPanelRef.value) {
    resultPanelResizeObserver = new ResizeObserver(updateMobileResultPanelHeight)
    resultPanelResizeObserver.observe(resultPanelRef.value)
  }
  window.visualViewport?.addEventListener('resize', updateKeyboardState)
  window.addEventListener('resize', updateKeyboardState)
  window.addEventListener('resize', updateMobileResultPanelHeight)
  window.addEventListener('pagehide', flushSessionPersist)
})
onBeforeUnmount(() => {
  window.clearTimeout(nextIssueHighlightTimer)
  window.clearTimeout(copyLabelTimer)
  window.clearTimeout(persistTimer)
  flushSessionPersist()
  resultPanelResizeObserver?.disconnect()
  window.visualViewport?.removeEventListener('resize', updateKeyboardState)
  window.removeEventListener('resize', updateKeyboardState)
  window.removeEventListener('resize', updateMobileResultPanelHeight)
  window.removeEventListener('pagehide', flushSessionPersist)
})

</script>

<style scoped>
:global(body.riichi-calculator-body) { overflow-x: clip; }
.calculator-page { width: min(1140px, 92%); margin: 0 auto; padding: 0 0 52px; color: var(--clay-text); }
.calculator-page .calculator-heading { width: 100%; max-width: 700px; margin: 0 auto 22px; padding: 8px 0 0; text-align: center; }
.calculator-heading .page-eyebrow { margin-bottom: 14px; }
.calculator-heading .hero-title { font-size: clamp(2.25rem, 5.3vw, 3.7rem); }
.calculator-heading > .calculator-description { max-width: 580px; margin: 14px auto 0; color: var(--muted); font-size: .95rem; line-height: 1.7; }
.tutorial-trigger { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 44px; margin-top: 14px; padding: 9px 15px; border: 1px solid var(--matcha-leaf); border-radius: 7px; background: var(--matcha-leaf); color: var(--white-pure); font: 650 .82rem var(--font-body); cursor: pointer; transition: background-color .18s, border-color .18s; }
.tutorial-trigger:hover { border-color: #293e32; background: #293e32; }
.tutorial-trigger > span { font-size: .68rem; }
.tutorial-trigger:focus-visible { outline: 3px solid var(--gold-leaf); outline-offset: 3px; }
.calculator-layout { display: grid; grid-template-areas: "form result"; grid-template-columns: minmax(0, 1fr) minmax(290px, 345px); align-items: start; gap: 22px; }
.calculator-layout.tile-entry-active { grid-template-areas: "form"; grid-template-columns: minmax(0, 1fr); max-width: 920px; margin-inline: auto; }
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
.player-count-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 5px 2px 11px; }
.player-count-row > .field-label { margin: 0; }
.player-count-row .choice-button { min-height: 40px; padding-block: 6px; }
.tile-win-context { scroll-margin-top: 130px; }
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
.han-shortcuts { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; margin: 4px 0; }
.han-shortcuts .choice-button { min-height: 44px; padding: 8px 4px; }
.direct-field > label { color: var(--matcha-leaf); font-size: .84rem; font-weight: 700; }
.direct-field select { min-height: 48px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 7px; background: white; color: var(--clay-text); font: inherit; }
.direct-field-invalid > label { color: #823f38; }
.direct-field-invalid .stepper, .direct-field-invalid select { border-color: #a35c50; box-shadow: 0 0 0 1px #a35c50; }
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
.kanji-toggle { min-height: 44px; display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; color: var(--matcha-leaf); font-size: .78rem; font-weight: 650; cursor: pointer; }
.kanji-toggle input { width: 18px; height: 18px; margin: 0; accent-color: var(--matcha-leaf); }
.kanji-toggle small { margin-left: 3px; color: var(--muted); font-size: .78rem; font-weight: 500; }
.yaku-kanji { margin-left: 6px; color: var(--muted); font-family: "Yu Gothic", "Meiryo", sans-serif; font-size: .9em; font-weight: 600; white-space: nowrap; }
.result-yaku h3 .result-kanji-toggle { margin: -8px 0 -8px auto; font-size: .68rem; }
.result-yaku h3 .result-kanji-toggle small { font-size: .68rem; }
.tile-situation-section > .field-label { margin-top: 13px; }
.tile-clear-undo { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.tile-situation-section > .choice-row { margin-top: 5px; }
.tile-situation-details { margin-top: 10px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.tile-situation-details > summary { min-height: 38px; display: flex; align-items: center; color: var(--matcha-leaf); font-size: .78rem; font-weight: 700; cursor: pointer; }
.tile-situation-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 10px; }
.tile-select { display: block; width: 100%; min-height: 44px; margin-top: 5px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--white-pure); color: var(--clay-text); font: inherit; font-size: 16px; }
.tile-step-actions { display: flex; justify-content: flex-start; margin-top: 8px; }
.tile-situation-section .choice-button:disabled { opacity: .48; cursor: not-allowed; }
.tile-nuki-control { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; padding: 10px 0; border-top: 1px solid var(--line); }
.tile-nuki-control > div:first-child { display: grid; gap: 3px; }
.tile-nuki-control label { color: var(--clay-text); font-size: .76rem; font-weight: 700; }
.tile-nuki-control small { color: var(--muted); font-size: .68rem; }
.tile-nuki-control .stepper { flex: 0 0 auto; }
.automatic-yaku { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-top: 13px; padding: 10px 12px; border: 1px solid #cfd8cc; border-radius: 7px; background: #eff3ec; font-size: .74rem; }
.automatic-yaku > span { width: 100%; color: var(--muted); font-size: .68rem; }
.automatic-yaku strong { color: var(--matcha-leaf); }
.automatic-yaku strong small { opacity: .75; }
.tsumo-search-help { align-items: flex-start; }
.tsumo-search-help p { flex: 1 1 100%; margin: 0; color: var(--clay-text); line-height: 1.5; }
.selected-yaku { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.selected-yaku > span { margin-right: 3px; color: var(--muted); font-size: .68rem; }
.selected-yaku-chip { min-height: 36px; display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border: 1px solid #cfd8cc; border-radius: 999px; background: #eff3ec; color: var(--matcha-leaf); font-size: .73rem; cursor: pointer; }
.selected-yaku-chip b { font-size: .85rem; }
.yaku-groups { display: grid; gap: 18px; margin-top: 20px; }
.yaku-category { min-width: 0; }
.yaku-category > summary { min-height: 42px; display: flex; align-items: center; gap: 12px; padding: 0 2px; color: var(--matcha-leaf); font-size: .78rem; font-weight: 750; letter-spacing: .025em; cursor: pointer; }
.yaku-category > summary::before { content: '+'; font-size: 1rem; }
.yaku-category[open] > summary::before { content: '−'; }
.yaku-category > summary::marker { color: var(--gold-leaf); }
.yaku-category > summary small { margin-left: auto; color: var(--muted); font-size: .67rem; font-weight: 500; letter-spacing: 0; }
.yaku-category[open] > summary { margin-bottom: 9px; }
.yaku-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.yaku-option { position: relative; min-width: 0; min-height: 64px; display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; background: white; color: inherit; text-align: left; cursor: pointer; }
.yaku-option:hover:not([aria-disabled="true"]) { border-color: var(--matcha-leaf); }
.yaku-option.yaku-selected { border-color: #8a9c8a; background: #edf1e9; box-shadow: inset 3px 0 var(--matcha-leaf); }
.yaku-option.yaku-disabled { background: #f6f5f1; cursor: not-allowed; }
.yaku-option.yaku-conflict, .selected-yaku-chip.chip-conflict { border-color: #a35c50; background: #fff3ef; }
.yaku-reason { display: block; margin-top: 5px; color: #823f38; }
.yaku-check { width: 21px; height: 21px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 5px; color: var(--muted); font-size: .8rem; }
.yaku-selected .yaku-check { border-color: var(--matcha-leaf); background: var(--matcha-leaf); color: white; font-weight: 750; }
.yaku-copy { min-width: 0; }
.yaku-copy strong { display: block; color: var(--matcha-leaf); font-size: .78rem; line-height: 1.3; }
.yaku-copy small { display: block; margin-top: 2px; color: var(--muted); font-size: .72rem; line-height: 1.4; }
.yaku-han { color: var(--gold-leaf); font-size: .72rem; font-weight: 750; white-space: nowrap; }
.empty-search { margin: 0; color: var(--muted); font-size: .84rem; }
.variant-panel { display: grid; gap: 10px; margin-top: 17px; padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.pao-control, .rule-confirmation { display: grid; gap: 8px; margin-top: 12px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.pao-control .checkbox-row { margin: 0; }
.pao-payment { border-color: var(--gold-leaf); }
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
.result-panel { position: sticky; top: 105px; max-height: calc(100vh - 125px); overflow: auto; border: 1px solid #cdd5c9; border-radius: 12px; background: var(--white-pure); box-shadow: 0 12px 32px rgba(44,55,40,.08); }
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
.payment-list h2, .fu-breakdown h3, .result-yaku h3 { display: flex; justify-content: space-between; gap: 10px; margin: 0 0 5px; color: var(--matcha-leaf); font-size: .76rem; }
.fu-breakdown h3 span { color: var(--muted); font-weight: 500; }
.payment-list p, .fu-breakdown p, .result-yaku p { display: flex; justify-content: space-between; gap: 12px; margin: 0; padding: 5px 0; border-bottom: 1px solid #eeece4; color: var(--muted); font-size: .875rem; line-height: 1.4; }
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
  .calculator-page { width: min(620px, calc(100% - 24px)); padding-bottom: calc(24px + env(safe-area-inset-bottom)); }
  .calculator-page.result-panel-visible { padding-bottom: calc(min(35vh, 250px) + 24px + env(safe-area-inset-bottom)); }
  .calculator-page .calculator-heading { margin: 0 auto 10px; padding-top: 0; }
  .calculator-heading .page-eyebrow { margin: 0 0 2px; font-size: .65rem; }
  .calculator-heading .hero-title { font-size: clamp(1.65rem, 7vw, 2.25rem); line-height: 1.1; }
  .calculator-heading > .calculator-description { margin-top: 4px; font-size: .76rem; line-height: 1.4; }
  .tutorial-trigger { margin-top: 8px; }
  .calculator-layout { display: flex; flex-direction: column; gap: 12px; }
  .calculator-form, .result-panel { width: 100%; box-sizing: border-box; }
  .result-panel { position: fixed; inset: auto 10px calc(8px + env(safe-area-inset-bottom)); z-index: 20; width: min(620px, calc(100% - 20px)); max-height: min(35vh, 250px); overflow: auto; margin: 0 auto; box-shadow: 0 8px 28px rgba(44,55,40,.2); }
  .result-inner { padding: 12px 15px; }
  .result-tile-incomplete .result-inner { padding: 7px 12px; }
  .result-tile-incomplete .result-heading-row { display: none; }
  .result-heading-row { align-items: center; }
  .result-amount { margin: 8px 0; }
  .result-amount > strong { display: inline; margin-right: 7px; font-size: 1.45rem; }
  .result-amount > span { display: inline; font-size: .72rem; margin-right: 7px; }
  .result-empty { margin: 3px 0 0; gap: 5px; }
  .result-empty p { flex-basis: auto; }
  .result-tile-incomplete .result-empty { align-items: center; }
  .result-tile-incomplete .result-empty p { font-size: .72rem; line-height: 1.3; }
  .score-summary { padding: 3px 0 0; margin-top: 7px; font-size: .75rem; }
  .payment-list { margin-top: 5px; }
  .payment-list p { padding: 3px 0; }
  .payment-list p strong { font-size: 1rem; }
  .result-tsumo .payment-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 10px; }
  .result-tsumo .payment-list h2 { display: none; }
  .result-tsumo .pao-payment h2 { display: flex; grid-column: 1 / -1; }
  .result-tsumo .payment-list p { display: grid; justify-items: center; gap: 1px; padding: 2px 0; border: 0; font-size: .875rem; text-align: center; }
  .result-tsumo .payment-list p strong { font-size: 1rem; }
  .result-tsumo .payment-list p:only-of-type { grid-column: 1 / -1; }
  .payment-context { font-size: .72rem; }
  .score-details { scroll-margin-top: 300px; }
  .entry-mode { gap: 6px; }
  .entry-mode button { min-height: 58px; padding: 7px 9px; }
  .entry-mode strong { font-size: .75rem; }
  .entry-mode small { font-size: .72rem; line-height: 1.35; }
  .player-count-row { margin-block: 2px 7px; }
  .player-count-row .choice-button { min-height: 40px; padding: 6px 8px; font-size: .68rem; }
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
  .win-section .section-heading { margin-bottom: 9px; }
  .win-section > .choice-row { margin-block: 6px; }
  .win-section .hand-mode-row { margin-top: 9px; padding-top: 8px; }
  .win-section .table-settings { margin-top: 9px; padding-top: 5px; }
  .win-section .hand-help summary { min-height: 32px; }
  .tile-situation-grid { grid-template-columns: minmax(0, 1fr); }
  .yaku-grid { grid-template-columns: minmax(0, 1fr); }
  .yaku-copy strong { font-size: .94rem; }
  .yaku-copy small { font-size: .875rem; }
  .fu-choice-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .win-section, .fu-field, .variant-panel, .section-heading[tabindex], .calc-section[tabindex], .honba-control, .tile-win-context { scroll-margin-top: 92px; }
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
  .reset-button { padding-inline: 7px; font-size: .72rem; }
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
  .tutorial-trigger { transition: none; }
  .issue-target-flash { animation: none; }
}
</style>
