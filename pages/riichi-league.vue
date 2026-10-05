<template>
  <main class="league-page">
    <header class="league-hero fade-up">
      <h1 class="hero-title">Riichi League</h1>
      <p class="league-intro">Season standings, weekly results, and every score on the road to the final table.</p>

      <div class="season-switcher">
        <label class="league-field-label" for="season-select">Season</label>
        <select class="league-control" id="season-select" v-model="selectedSeasonId" :disabled="isSubmittingScore">
          <option v-for="item in seasons" :key="item.id" :value="item.id">
            Season {{ item.number }}
          </option>
        </select>
      </div>
      <nav class="league-shortcuts" aria-label="League sections">
        <a class="league-button" href="#standings-heading">Standings</a>
        <a class="league-button" href="#weeks-heading">Weekly results</a>
        <button class="league-button league-button-primary" v-if="entryWeek" type="button" :disabled="isSubmittingScore" @click="goToEntry">Add a table</button>
      </nav>
    </header>

    <section class="season-card fade-up" aria-labelledby="season-heading">
      <div class="season-heading">
        <div>
          <span class="status-pill" :class="`status-${seasonStatus}`">{{ statusLabel }}</span>
          <h2 id="season-heading">{{ selectedSeason.name }}</h2>
          <p>{{ formatDate(selectedSeason.startDate, true) }} – {{ formatDate(selectedSeason.endDate, true) }}</p>
        </div>
        <div class="prize-card">
          <span>Season prize</span>
          <strong>{{ selectedSeason.prize.title }}</strong>
          <small>{{ selectedSeason.prize.description }}</small>
        </div>
      </div>

      <div class="season-stats" aria-label="Season format">
        <div>
          <strong>{{ completedWeeks.length }}</strong>
          <span>of {{ selectedSeason.totalWeeks }} weeks played</span>
        </div>
        <div>
          <strong>{{ selectedSeason.bestResultsCount }}</strong>
          <span>highest-scoring league days included</span>
        </div>
        <div>
          <strong>{{ selectedSeason.supportedTableSizes.join(' or ') }}</strong>
          <span>players per table</span>
        </div>
      </div>
    </section>

    <section class="content-card standings-card fade-up" aria-labelledby="standings-heading">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Season table</p>
          <h2 id="standings-heading">Standings</h2>
        </div>
        <p>
          Each calendar day produces one result per player: their highest league-point score that day. The season
          total adds together their {{ selectedSeason.bestResultsCount }} highest-scoring daily results.
        </p>
      </div>

      <label class="standing-search">
        <span class="league-field-label">Find a player</span>
        <input class="league-control" v-model="standingQuery" type="search" placeholder="Search standings" autocomplete="off">
      </label>
      <p v-if="!filteredStandings.length" role="status">No players match “{{ standingQuery }}”.</p>
      <div class="standings-table-wrap">
        <table class="standings-table">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Player</th>
              <th scope="col">Sessions</th>
              <th scope="col">1sts</th>
              <th scope="col">2nds</th>
              <th scope="col">High game</th>
              <th scope="col">Season total (best {{ selectedSeason.bestResultsCount }} days)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="player in filteredStandings" :key="player.id">
              <td><span class="rank-medal" :class="`rank-${player.rank}`">{{ player.rank }}</span></td>
              <th scope="row">{{ player.name }}</th>
              <td>{{ player.played }}</td>
              <td>{{ player.wins }}</td>
              <td>{{ player.seconds }}</td>
              <td>{{ player.highestFinalScore === null ? '—' : numberFormat(player.highestFinalScore) }}</td>
              <td><strong :class="scoreClass(player.bestTotal)">{{ scoreDisplay(player.bestTotal) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="standings-cards">
        <article v-for="player in mobileStandings" :key="`card-${player.id}`" class="standing-player">
          <span class="rank-medal" :class="`rank-${player.rank}`">{{ player.rank }}</span>
          <div>
            <h3>{{ player.name }}</h3>
            <p>
              {{ player.played }} {{ player.played === 1 ? 'session' : 'sessions' }} ·
              {{ player.wins }} 1st · {{ player.seconds }} 2nd
            </p>
          </div>
          <strong :class="scoreClass(player.bestTotal)">{{ scoreDisplay(player.bestTotal) }}<small>league pts</small></strong>
        </article>
      </div>
      <button v-if="!standingQuery && filteredStandings.length > 10" type="button" class="standings-toggle league-button" :aria-expanded="showAllStandings" @click="showAllStandings = !showAllStandings">
        {{ showAllStandings ? 'Show top 10' : `Show all ${filteredStandings.length} players` }}
      </button>
    </section>

    <section class="content-card weeks-card fade-up" aria-labelledby="weeks-heading">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Round by round</p>
          <h2 id="weeks-heading">Weekly results</h2>
        </div>
        <p>Select a week to see its schedule or completed table results.</p>
      </div>

      <label class="mobile-week-select">
        <span class="league-field-label">Session</span>
        <select class="league-control" v-model="selectedWeekId" :disabled="isSubmittingScore">
          <option v-for="week in selectedWeeks" :key="week.id" :value="week.id">Week {{ week.weekNumber }} · {{ formatDate(week.date) }} · {{ week.tables.length ? 'Results' : 'Scheduled' }}</option>
        </select>
      </label>
      <div class="week-picker" role="list" aria-label="League weeks">
        <button
          v-for="week in selectedWeeks"
          :key="week.id"
          type="button"
          :class="{ active: selectedWeekId === week.id, completed: week.status === 'completed' || week.tables.length > 0 }"
          :aria-pressed="selectedWeekId === week.id"
          :disabled="isSubmittingScore"
          @click="selectedWeekId = week.id"
        >
          <span>Week {{ week.weekNumber }}</span>
          <strong>{{ shortDate(week.date) }}</strong>
          <small>{{ week.tables.length ? 'Results' : 'Scheduled' }}</small>
        </button>
      </div>

      <article v-if="selectedWeek" class="week-detail">
        <div class="week-detail-head">
          <div>
            <span class="status-pill" :class="`status-${selectedWeek.status}`">{{ humanize(selectedWeek.status) }}</span>
            <h3>Week {{ selectedWeek.weekNumber }}</h3>
            <p>{{ formatDate(selectedWeek.date, true) }}</p>
          </div>
          <dl>
            <div>
              <dt>Time</dt>
              <dd>{{ timeRange(selectedWeek) }}</dd>
            </div>
            <div>
              <dt>Venue</dt>
              <dd>{{ selectedWeek.location || 'To be announced' }}</dd>
            </div>
          </dl>
        </div>

        <section v-if="!isScoreEntryClosed" id="score-entry" class="score-entry" aria-labelledby="score-entry-heading">
          <div class="score-entry-heading">
            <div>
              <p class="section-kicker">{{ editingTable ? `Editing Table ${editingTable.tableNumber}` : 'Add a table' }}</p>
              <h4 id="score-entry-heading" tabindex="-1">Week {{ selectedWeek.weekNumber }} · {{ editingTable ? 'Edit results' : 'Add results' }}</h4>
            </div>
            <p>{{ editingTable ? 'Update the players or final points. Standings recalculate when you save.' : 'Anyone can submit a complete table. Saved results appear in the league immediately.' }}</p>
          </div>

          <form class="score-entry-form" @submit.prevent="submitMatch">
            <div class="score-entry-options">
              <label>
                <span class="league-field-label">Table size</span>
                <select class="league-control" v-model.number="scoreForm.tableSize" :disabled="isSubmittingScore || Boolean(editingTable)">
                  <option v-for="size in selectedSeason.supportedTableSizes" :key="size" :value="size">{{ size }} players · {{ seatNames(size).join(', ') }}</option>
                </select>
              </label>
              <p class="score-entry-auto">
                Enter players top to bottom by seat: East, South, West{{ scoreForm.tableSize === 4 ? ', North' : '' }}. Equal points are ranked by this order. Table number is assigned automatically; enter results by {{ formatDate(scoreEntryCutoffDate, true) }}.
              </p>
            </div>

            <div class="score-entry-rows">
              <div v-for="(row, index) in scoreForm.results" :key="index" class="score-entry-row">
                <LeaguePlayerPicker
                  :id="`league-player-${index}`" :key="`${selectedWeekId}-${formResetKey}-${index}`"
                  v-model="row.playerName" :label="`${seatNames(scoreForm.tableSize)[index]} seat`"
                  :names="selectedSeason.players.map(player => player.displayName)"
                  :excluded="scoreForm.results.filter((_, other) => other !== index).map(item => item.playerName)"
                  :disabled="isSubmittingScore"
                />
                <label>
                  <span class="league-field-label">Final points</span>
                  <input class="league-control" v-model.number="row.finalPoints" type="number" min="-50000" max="200000" step="100" placeholder="e.g. 25000" :disabled="isSubmittingScore" required>
                </label>
              </div>
            </div>
            <div class="score-entry-footer">
              <div>
                <p v-if="duplicatePlayerName" class="score-entry-message" role="alert">{{ duplicatePlayerName }} is entered more than once.</p>
                <p v-if="scoreEntryMessage" class="score-entry-message" role="status">{{ scoreEntryMessage }}</p>
              </div>
              <div class="score-entry-actions">
                <button type="button" class="score-entry-reset league-button" :disabled="isSubmittingScore" @click="resetScoreForm">
                  {{ editingTable ? 'Reset changes' : 'Reset' }}
                </button>
                <button type="submit" class="score-entry-submit league-button league-button-primary" :disabled="isScoreEntryClosed || isSubmittingScore || Boolean(duplicatePlayerName)">
                  {{ isSubmittingScore ? (editingTable ? 'Updating results…' : 'Saving results…') : (editingTable ? 'Update table results' : 'Save table results') }}
                </button>
                <button v-if="editingTable" type="button" class="score-entry-reset league-button" :disabled="isSubmittingScore" @click="cancelEditTable">Cancel edit</button>
              </div>
            </div>
          </form>
        </section>

        <template v-if="selectedWeek.tables.length">
          <section v-for="table in selectedWeek.tables" :key="table.id" class="table-result">
            <div class="table-title">
              <h4>Table {{ table.tableNumber }}</h4>
              <div class="table-metadata">
                <span>{{ table.results.length }} players</span>
                <span v-if="table.submittedAt">Submitted {{ formatSubmissionTime(table.submittedAt) }}</span>
                <div v-if="canManageResults" class="table-actions">
                  <button type="button" class="league-button table-action-button" :disabled="isSubmittingScore" @click="editTable(table)">Edit</button>
                  <button type="button" class="league-button table-action-button" :disabled="isSubmittingScore" @click="deleteTable(table)">Delete</button>
                </div>
              </div>
            </div>

            <div class="result-table-wrap">
              <table class="result-table">
                <thead>
                  <tr>
                    <th scope="col">Place</th>
                    <th scope="col">Seat</th>
                    <th scope="col">Player</th>
                    <th scope="col">Final points</th>
                    <th scope="col">League score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="result in sortedResults(table.results)" :key="result.playerId">
                    <td><span class="place-marker">{{ ordinal(result.placement) }}</span></td>
                    <td>{{ seatLabel(result.seatWind) }}</td>
                    <th scope="row">{{ playerName(result.playerId) }}</th>
                    <td>{{ numberFormat(result.finalPoints) }}</td>
                    <td><strong :class="scoreClass(leagueScore(result, table))">{{ scoreDisplay(leagueScore(result, table)) }}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="result-cards">
              <article v-for="result in sortedResults(table.results)" :key="`result-${result.playerId}`">
                <span class="place-marker">{{ ordinal(result.placement) }}</span>
                <div>
                  <h5>{{ playerName(result.playerId) }}</h5>
                  <p>{{ result.seatWind ? `${seatLabel(result.seatWind)} seat · ` : '' }}{{ numberFormat(result.finalPoints) }} pts</p>
                </div>
                <strong :class="scoreClass(leagueScore(result, table))">{{ scoreDisplay(leagueScore(result, table)) }}<small>league pts</small></strong>
              </article>
            </div>
          </section>
        </template>

        <div v-else class="scheduled-state">
          <span aria-hidden="true">東</span>
          <div>
            <h4>Results will appear here</h4>
            <p>This round is scheduled for {{ formatDate(selectedWeek.date, true) }}. Scores and standings will update when the tables are complete.</p>
          </div>
        </div>

        <p v-if="selectedWeek.notes" class="week-notes">{{ selectedWeek.notes }}</p>
      </article>
    </section>

    <section class="rules-card fade-up" aria-labelledby="scoring-heading">
      <div>
        <p class="section-kicker">How scoring works</p>
        <h2 id="scoring-heading">Placement decides the score</h2>
        <p>
          Scores are based only on finishing position. Final mahjong points are recorded for the match result,
          but no uma or oka is added to the league standings.
        </p>
        <button type="button" class="rules-button league-button league-button-primary" @click="openRules">
          View full table rules
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <div class="placement-scoring">
        <div>
          <span>Four-player</span>
          <strong>1st 10 · 2nd 6 · 3rd 3 · 4th 0</strong>
        </div>
        <div>
          <span>Three-player</span>
          <strong>1st 9 · 2nd 5 · 3rd 0</strong>
        </div>
      </div>
    </section>

    <dialog
      ref="rulesDialog"
      class="rules-dialog"
      aria-labelledby="rules-dialog-title"
      @click="closeRulesFromBackdrop"
      @close="onRulesClosed"
    >
      <div class="rules-dialog-shell">
        <header class="rules-dialog-header">
          <div>
            <p class="section-kicker">Saujana Riichi League</p>
            <h2 id="rules-dialog-title">Table Rules</h2>
            <p>
              Riichi League is intended to be friendly and accessible. We follow standard Japanese Riichi
              Mahjong rules, with the settings below.
            </p>
          </div>
          <button type="button" class="rules-close" aria-label="Close table rules" @click="closeRules">×</button>
        </header>

        <div class="rules-dialog-content">
          <section>
            <h3>Basic Settings</h3>
            <ul>
              <li>Four-player matches are played as East–South games.</li>
              <li>Each player starts with 25,000 points.</li>
              <li>Open tanyao is allowed.</li>
              <li>Atozuke is allowed.</li>
              <li>
                Four-player matches use three red fives:
                <ul>
                  <li>One red 5-man</li>
                  <li>One red 5-pin</li>
                  <li>One red 5-sou</li>
                </ul>
              </li>
              <li>A valid yaku is required to win.</li>
              <li>Dora and red fives do not count as yaku by themselves.</li>
            </ul>
          </section>

          <section>
            <h3>Three-player Matches</h3>
            <p>
              Three-player matches use the same rules as four-player matches wherever possible, with these
              differences:
            </p>
            <ul>
              <li>The 2-man through 8-man tiles are removed, leaving 108 tiles.</li>
              <li>Chi is not allowed.</li>
              <li>
                Nuki-dora is allowed. A North tile may be declared and set aside as one dora, then replaced with
                a draw from the dead wall. North may also be kept and used as an ordinary honour tile.
              </li>
              <li>Two red fives are used: one red 5-pin and one red 5-sou.</li>
              <li>
                The manzu dora cycle runs directly between 1-man and 9-man: 1-man indicates 9-man, and 9-man
                indicates 1-man.
              </li>
              <li>Matches are East–South games consisting of East 1–3 and South 1–3.</li>
              <li>Ron scoring uses the normal four-player formulas.</li>
              <li>
                For tsumo, each opponent makes their normal four-player payment. The absent fourth player’s share
                is not compensated.
              </li>
              <li>Honba payments remain 300 points for ron and 100 points from each opponent for tsumo.</li>
              <li>
                Standard 3,000-point noten payments apply:
                <ul>
                  <li>One tenpai player receives 1,500 points from each opponent.</li>
                  <li>Two tenpai players each receive 1,500 points from the noten player.</li>
                </ul>
              </li>
              <li>
                All yaku, fu, limits, riichi rules, dealer repeats and other table rules remain unchanged unless
                physically impossible with three players.
              </li>
            </ul>
          </section>

          <section>
            <h3>Draws and Calls</h3>
            <ul>
              <li>Subject to the three-player differences above, standard chi, pon, kan, riichi, tsumo and ron rules apply.</li>
              <li>
                Kan-dora is used. After an open kan, the new dora indicator is revealed after the kan declarer
                draws their replacement tile and discards. If the replacement tile wins by rinshan kaihou, the
                new indicator is not revealed. After a concealed or added kan, the new indicator is revealed
                immediately.
              </li>
              <li>Abortive draws are not used.</li>
              <li>Nine terminals and honours does not end the hand.</li>
              <li>Four first-turn wind discards do not end the hand.</li>
              <li>Four riichi declarations do not end the hand.</li>
              <li>The final discard may be won by ron, but cannot be called for chi, pon or kan.</li>
              <li>
                Multiple ron is allowed. Each valid winner receives the normal ron payment from the discarder,
                and each receives the full honba payment. Riichi sticks go to the valid winner closest to the
                discarder in turn order.
              </li>
            </ul>
          </section>

          <section>
            <h3>Dealer and Match Progression</h3>
            <ul>
              <li>The dealer continues after winning a hand.</li>
              <li>The dealer continues after an exhaustive draw when tenpai.</li>
              <li>One honba is added after each dealer repeat or exhaustive draw.</li>
              <li>Riichi sticks remain on the table until collected by the next winner.</li>
              <li>Four-player matches normally end after South 4.</li>
              <li>Three-player matches normally end after South 3.</li>
              <li>The leading dealer may choose to end the match after winning the final scheduled hand.</li>
            </ul>
          </section>

          <section>
            <h3>Exhaustive Draws</h3>
            <ul>
              <li>Standard 3,000-point noten payments apply.</li>
              <li>Players may choose whether to reveal a tenpai hand.</li>
              <li>A player who declares tenpai must show a valid tenpai hand.</li>
              <li>The dealer continues only if tenpai.</li>
            </ul>
          </section>

          <section>
            <h3>Scoring</h3>
            <ul>
              <li>Standard Japanese hand scoring is used.</li>
              <li>Kiriage mangan is not used.</li>
              <li>Thirteen or more han counts as one yakuman.</li>
              <li>Nagashi mangan is allowed.</li>
              <li>Pao applies to Daisangen and Daisuushii.</li>
            </ul>
            <p class="rules-note">
              When players are unsure about scoring, the table may use a trusted scoring app or ask the organiser
              for help.
            </p>
          </section>

          <section class="league-points-section">
            <h3>League Points</h3>
            <p>Final mahjong points determine finishing position.</p>
            <p>No uma or oka is added to league standings. League points are awarded only according to placement.</p>
            <p>
              For each calendar day, the game awarding a player their highest league-point score becomes that
              player’s daily result. Playing additional games cannot reduce a daily result already earned.
            </p>
            <p>
              A player’s season total is the sum of their eight highest-scoring daily results. If they have played
              on fewer than eight league days, every daily result earned so far is included.
            </p>
            <div class="league-points-tables">
              <table>
                <caption>Four-player matches</caption>
                <thead>
                  <tr><th scope="col">Placement</th><th scope="col">League points</th></tr>
                </thead>
                <tbody>
                  <tr><td>1st</td><td>10</td></tr>
                  <tr><td>2nd</td><td>6</td></tr>
                  <tr><td>3rd</td><td>3</td></tr>
                  <tr><td>4th</td><td>0</td></tr>
                </tbody>
              </table>
              <table>
                <caption>Three-player matches</caption>
                <thead>
                  <tr><th scope="col">Placement</th><th scope="col">League points</th></tr>
                </thead>
                <tbody>
                  <tr><td>1st</td><td>9</td></tr>
                  <tr><td>2nd</td><td>5</td></tr>
                  <tr><td>3rd</td><td>0</td></tr>
                </tbody>
              </table>
            </div>
            <p class="rules-note">
              Final mahjong scores are still recorded for match records and standings tie-breaks.
            </p>
            <div class="tie-break-rules">
              <h4>Tied league points</h4>
              <ol>
                <li>The player who attended more league sessions ranks higher.</li>
                <li>If still tied, the player with more 1st-place finishes ranks higher.</li>
                <li>If still tied, the player with more 2nd-place finishes ranks higher.</li>
                <li>If still tied, the higher single-game final score achieved during the season ranks higher.</li>
                <li>
                  If players remain tied, they share the position or may play a deciding playoff game if both agree.
                </li>
              </ol>
            </div>
          </section>

          <section>
            <h3>Mistakes and Disputes</h3>
            <p>This is a friendly community league, and many players are still learning.</p>
            <ul>
              <li>Minor mistakes should be corrected where possible without disrupting the hand.</li>
              <li>Players should point out errors politely.</li>
              <li>Serious errors may result in a dead hand or a replay of the hand.</li>
              <li>The organiser may decide the fairest solution based on the situation.</li>
              <li>Where the rules are unclear, the organiser’s decision is final.</li>
              <li>Honest mistakes should be treated as learning opportunities, not reasons for arguments.</li>
            </ul>
          </section>

          <section>
            <h3>Table Conduct</h3>
            <ul>
              <li>Calls and win declarations should be made clearly.</li>
              <li>Discards should remain in order.</li>
              <li>Players should not reveal concealed information.</li>
              <li>Spectators should not comment on active hands.</li>
              <li>No collusion, signalling or intentional stalling.</li>
              <li>Please be patient with newer players.</li>
            </ul>
          </section>
        </div>
      </div>
    </dialog>
  </main>
</template>

<script setup>
import leagueData from '~/assets/data/riichi_league.json'
import { onMounted } from 'vue'

useHead({
  meta: [
    { name: 'description', content: 'Saujana Riichi League season standings, weekly schedules, and table results.' },
  ],
})

const normalizedSeasons = leagueData.seasons ?? [{
  ...leagueData.season,
  players: leagueData.players,
  weeks: leagueData.weeks,
}]

const seasons = ref(normalizedSeasons)
const selectedSeasonId = ref(seasons.value[0]?.id ?? '')
const selectedWeekId = ref('')
const rulesDialog = ref(null)

const selectedSeason = computed(() => seasons.value.find(item => item.id === selectedSeasonId.value) ?? seasons.value[0])
const selectedWeeks = computed(() => [...(selectedSeason.value?.weeks ?? [])].sort((a, b) => a.weekNumber - b.weekNumber))
const completedWeeks = computed(() => selectedWeeks.value.filter(week => week.status === 'completed' || week.tables?.length))
const selectedWeek = computed(() => selectedWeeks.value.find(week => week.id === selectedWeekId.value) ?? selectedWeeks.value[0])
const latestSessionForToday = computed(() => {
  const datedWeeks = [...selectedWeeks.value].sort((a, b) => a.date.localeCompare(b.date))
  return datedWeeks.filter(week => week.date <= currentKualaLumpurDate.value).at(-1) ?? datedWeeks[0]
})
const currentKualaLumpurDate = ref(kualaLumpurDate())
const scoreEntryCutoffDate = computed(() => selectedWeek.value?.date ? addCalendarDays(selectedWeek.value.date, 3) : '')
const isScoreEntryClosed = computed(() => Boolean(scoreEntryCutoffDate.value)
  && currentKualaLumpurDate.value > scoreEntryCutoffDate.value)
const canManageResults = computed(() => Boolean(selectedWeek.value?.date)
  && currentKualaLumpurDate.value <= addCalendarDays(selectedWeek.value.date, 3))
const isSubmittingScore = ref(false)
const editingTableId = ref('')
const editingTable = computed(() => selectedWeek.value?.tables.find(table => table.id === editingTableId.value) ?? null)
const scoreEntryMessage = ref('')
const formResetKey = ref(0)
const scoreDrafts = new Map()
const standingQuery = ref('')
const showAllStandings = ref(false)
const filteredStandings = computed(() => standings.value.filter(player => player.name.toLocaleLowerCase().includes(standingQuery.value.trim().toLocaleLowerCase())))
const mobileStandings = computed(() => showAllStandings.value || standingQuery.value ? filteredStandings.value : filteredStandings.value.slice(0, 10))
const entryWeek = computed(() => selectedWeeks.value.find(week => week.date <= currentKualaLumpurDate.value && addCalendarDays(week.date, 3) >= currentKualaLumpurDate.value)
  ?? selectedWeeks.value.find(week => week.date > currentKualaLumpurDate.value))
async function goToEntry() {
  selectedWeekId.value = entryWeek.value.id
  await nextTick()
  document.getElementById('score-entry-heading')?.focus()
  document.getElementById('score-entry')?.scrollIntoView({ block: 'start' })
}
let dateRefresh
const scoreForm = ref({
  tableSize: selectedSeason.value?.supportedTableSizes?.includes(4) ? 4 : selectedSeason.value?.supportedTableSizes?.[0] ?? 4,
  results: [],
})
const duplicatePlayerName = computed(() => {
  const seen = new Set()
  for (const row of scoreForm.value.results) {
    const normalizedName = String(row.playerName ?? '').trim().toLocaleLowerCase()
    if (!normalizedName) continue
    if (seen.has(normalizedName)) return String(row.playerName).trim()
    seen.add(normalizedName)
  }
  return ''
})

const seatNames = size => Number(size) === 3 ? ['East', 'South', 'West'] : ['East', 'South', 'West', 'North']

const seasonStatus = computed(() => {
  if (completedWeeks.value.length === selectedWeeks.value.length) return 'completed'
  if (completedWeeks.value.length) return 'active'
  return selectedSeason.value.status
})

const statusLabel = computed(() => ({
  active: 'In progress',
  upcoming: 'Upcoming',
  completed: 'Completed',
}[seasonStatus.value] ?? humanize(seasonStatus.value)))

const playerMap = computed(() => new Map((selectedSeason.value.players ?? []).map(player => [player.id, player])))

const standings = computed(() => {
  const records = new Map()
  for (const player of selectedSeason.value.players ?? []) {
    records.set(player.id, {
      id: player.id,
      name: player.displayName,
      dailyResults: new Map(),
      highestFinalScore: null,
    })
  }

  for (const week of completedWeeks.value) {
    for (const table of week.tables ?? []) {
      for (const result of table.results ?? []) {
        const player = records.get(result.playerId)
        if (!player) continue
        const score = leagueScore(result, table)
        const finalPoints = Number(result.finalPoints) || 0
        const dailyResult = {
          score,
          placement: Number(result.placement),
          finalPoints,
        }
        const existingDailyResult = player.dailyResults.get(week.date)

        if (!existingDailyResult || compareGameResults(dailyResult, existingDailyResult) < 0) {
          player.dailyResults.set(week.date, dailyResult)
        }

        player.highestFinalScore = player.highestFinalScore === null
          ? finalPoints
          : Math.max(player.highestFinalScore, finalPoints)
      }
    }
  }

  const rankedPlayers = [...records.values()]
    .map((player) => {
      const countedResults = [...player.dailyResults.values()]
      const scores = countedResults.map(result => result.score)

      return {
        id: player.id,
        name: player.name,
        played: countedResults.length,
        wins: countedResults.filter(result => result.placement === 1).length,
        seconds: countedResults.filter(result => result.placement === 2).length,
        highestFinalScore: player.highestFinalScore,
        bestTotal: [...scores]
          .sort((a, b) => b - a)
          .slice(0, selectedSeason.value.bestResultsCount)
          .reduce((sum, score) => sum + score, 0),
      }
    })
    .sort((a, b) => compareStandingPlayers(a, b) || a.name.localeCompare(b.name))

  let previousPlayer = null
  return rankedPlayers.map((player, index) => {
    const rank = previousPlayer && compareStandingPlayers(player, previousPlayer) === 0
      ? previousPlayer.rank
      : index + 1
    const rankedPlayer = { ...player, rank }
    previousPlayer = rankedPlayer
    return rankedPlayer
  })
})

watch(selectedSeasonId, () => {
  selectedWeekId.value = latestSessionForToday.value?.id ?? ''
}, { immediate: true })

watch(selectedWeekId, (next, previous) => {
  if (previous) scoreDrafts.set(previous, {
    tableSize: scoreForm.value.tableSize,
    results: scoreForm.value.results.map(row => ({ ...row })),
  })
  const draft = scoreDrafts.get(next)
  resetScoreForm()
  if (draft) scoreForm.value = draft
})

watch(() => scoreForm.value.tableSize, (size) => {
  const currentRows = scoreForm.value.results
  scoreForm.value.results = Array.from({ length: Number(size) }, (_, index) => ({
    playerName: currentRows[index]?.playerName ?? '',
    finalPoints: currentRows[index]?.finalPoints ?? null,
  }))
})

onMounted(async () => {
  dateRefresh = setInterval(() => {
    currentKualaLumpurDate.value = kualaLumpurDate()
  }, 60_000)
  scoreForm.value.results = createEmptyResults(scoreForm.value.tableSize)
  await loadLeagueFromSupabase()
})

async function loadLeagueFromSupabase() {
  try {
    const supabase = useSupabase()
    const [seasonResponse, playerResponse, weekResponse, matchResponse, resultResponse] = await Promise.all([
      supabase.from('riichi_league_seasons').select('*').order('season_number').range(0, 9999),
      supabase.from('riichi_league_players').select('*').order('display_name').range(0, 9999),
      supabase.from('riichi_league_weeks').select('*').order('week_number').range(0, 9999),
      supabase.from('riichi_league_matches').select('*').order('table_number').range(0, 9999),
      supabase.from('riichi_league_results').select('*').range(0, 9999),
    ])
    const responses = [seasonResponse, playerResponse, weekResponse, matchResponse, resultResponse]
    const failed = responses.find(response => response.error)
    if (failed) throw failed.error

    const playerRows = playerResponse.data ?? []
    const weekRows = weekResponse.data ?? []
    const matchRows = matchResponse.data ?? []
    const resultRows = resultResponse.data ?? []
    const playersBySeason = groupBy(playerRows, 'season_id')
    const matchesByWeek = groupBy(matchRows, 'week_id')
    const resultsByMatch = groupBy(resultRows, 'match_id')

    const loadedSeasons = (seasonResponse.data ?? []).map((season) => {
      const players = (playersBySeason.get(season.id) ?? []).map(player => ({
        id: player.id,
        displayName: player.display_name,
      }))
      const weeks = (weekRows.filter(week => week.season_id === season.id)).map((week) => {
        const tables = (matchesByWeek.get(week.id) ?? []).map((match) => ({
          id: match.id,
          tableNumber: match.table_number,
          submittedAt: match.submitted_at,
          results: (resultsByMatch.get(match.id) ?? []).map(result => ({
            playerId: result.player_id,
            finalPoints: result.final_points,
            placement: result.placement,
            seatWind: result.seat_wind,
          })),
        }))
        return {
          ...week.metadata,
          id: week.id,
          weekNumber: week.week_number,
          date: week.event_date,
          status: week.status === 'completed' ? 'completed' : tables.length ? 'active' : week.status,
          tables,
        }
      })

      return {
        ...season.metadata,
        id: season.id,
        number: season.season_number,
        name: season.name,
        startDate: season.start_date,
        endDate: season.end_date,
        status: season.status,
        totalWeeks: season.total_weeks,
        bestResultsCount: season.best_results_count,
        supportedTableSizes: season.supported_table_sizes,
        scoring: season.scoring,
        players,
        weeks,
      }
    })

    if (!loadedSeasons.length) return
    seasons.value = loadedSeasons
    selectedWeekId.value = latestSessionForToday.value?.id ?? ''
    if (!loadedSeasons.some(season => season.id === selectedSeasonId.value)) {
      selectedSeasonId.value = loadedSeasons[0].id
    }
  } catch (error) {
    console.error('Could not load Riichi League data from Supabase:', error)
    scoreEntryMessage.value = 'Live league data is unavailable right now. Please try again later.'
  }
}

function groupBy(rows, key) {
  const grouped = new Map()
  for (const row of rows) {
    const values = grouped.get(row[key]) ?? []
    values.push(row)
    grouped.set(row[key], values)
  }
  return grouped
}

function createEmptyResults(size) {
  return Array.from({ length: Number(size) }, (_, index) => ({
    playerName: '',
    finalPoints: null,
  }))
}

function resetScoreForm() {
  scoreDrafts.delete(selectedWeekId.value)
  editingTableId.value = ''
  formResetKey.value += 1
  const sizes = selectedSeason.value?.supportedTableSizes ?? [4]
  const tableSize = sizes.includes(4) ? 4 : sizes[0]
  scoreForm.value = {
    tableSize,
    results: createEmptyResults(tableSize),
  }
  scoreEntryMessage.value = ''
}

function editTable(table) {
  if (!canManageResults.value || isSubmittingScore.value) return
  editingTableId.value = table.id
  scoreForm.value = {
    tableSize: table.results.length,
    results: seatOrderedResults(table).map(result => ({
      playerName: playerName(result.playerId),
      finalPoints: result.finalPoints,
    })),
  }
  scoreEntryMessage.value = ''
  nextTick(() => {
    document.getElementById('score-entry-heading')?.focus()
    document.getElementById('score-entry')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  })
}

function seatOrderedResults(table) {
  const seatOrder = ['east', 'south', 'west', 'north']
  return [...table.results].sort((a, b) => {
    const aSeat = seatOrder.indexOf(String(a.seatWind ?? '').toLowerCase())
    const bSeat = seatOrder.indexOf(String(b.seatWind ?? '').toLowerCase())
    if (aSeat >= 0 && bSeat >= 0) return aSeat - bSeat
    if (aSeat >= 0) return -1
    if (bSeat >= 0) return 1
    return Number(a.placement) - Number(b.placement)
  })
}

function cancelEditTable() {
  resetScoreForm()
}

async function deleteTable(table) {
  if (!canManageResults.value || isSubmittingScore.value) return
  if (!window.confirm(`Delete Table ${table.tableNumber}? Its results will be removed from the standings.`)) return

  isSubmittingScore.value = true
  scoreEntryMessage.value = ''
  try {
    const { error } = await useSupabase().rpc('delete_riichi_match', { p_match_id: table.id })
    if (error) throw error
    if (editingTableId.value === table.id) resetScoreForm()
    await loadLeagueFromSupabase()
    scoreEntryMessage.value = `Table ${table.tableNumber} deleted. Standings have been updated.`
  } catch (error) {
    console.error('Could not delete Riichi League results:', error)
    scoreEntryMessage.value = 'Could not delete these results. Please try again.'
  } finally {
    isSubmittingScore.value = false
  }
}

async function submitMatch() {
  if (!selectedWeek.value || isSubmittingScore.value) return
  if (isScoreEntryClosed.value) {
    scoreEntryMessage.value = `Results closed on ${formatDate(scoreEntryCutoffDate.value, true)}.`
    return
  }

  const results = scoreForm.value.results.map(row => ({
    player_name: String(row.playerName ?? '').trim(),
    final_points: Number(row.finalPoints),
  }))
  const playerNames = results.map(result => result.player_name)
  const validPoints = scoreForm.value.results.every(row => row.finalPoints !== null && row.finalPoints !== '')
    && results.every(result => Number.isInteger(result.final_points)
    && result.final_points >= -50000 && result.final_points <= 200000)

  if (playerNames.some(name => !name || name.length > 80)) {
    scoreEntryMessage.value = 'Enter a player name (80 characters or fewer) for every player.'
    return
  }
  if (duplicatePlayerName.value) {
    scoreEntryMessage.value = `${duplicatePlayerName.value} is entered more than once.`
    return
  }
  if (!validPoints) {
    scoreEntryMessage.value = 'Enter a whole number of final points for every player.'
    return
  }

  isSubmittingScore.value = true
  scoreEntryMessage.value = ''
  try {
    const rpc = useSupabase()
    const { data: tableNumber, error } = editingTable.value
      ? await rpc.rpc('update_riichi_match', {
          p_match_id: editingTable.value.id,
          p_results: results,
        })
      : await rpc.rpc('submit_riichi_match', {
          p_week_id: selectedWeek.value.id,
          p_results: results,
        })
    if (error) throw error
    const wasEditing = Boolean(editingTable.value)
    const updatedTableNumber = editingTable.value?.tableNumber
    await loadLeagueFromSupabase()
    resetScoreForm()
    scoreEntryMessage.value = wasEditing
      ? `Table ${updatedTableNumber} updated. Standings have been updated.`
      : `Table ${tableNumber} saved. Standings have been updated.`
  } catch (error) {
    console.error('Could not save Riichi League results:', error)
    scoreEntryMessage.value = 'Could not save these results. Check the player names and scores, then try again.'
  } finally {
    isSubmittingScore.value = false
  }
}

function playerName(playerId) {
  return playerMap.value.get(playerId)?.displayName ?? 'Unknown player'
}

function seatLabel(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : '—'
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addCalendarDays(value, days) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

function kualaLumpurDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function formatDate(value, includeYear = false) {
  if (!value) return 'To be announced'
  return new Intl.DateTimeFormat('en-MY', {
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(parseDate(value))
}

function formatSubmissionTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function shortDate(value) {
  return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short' }).format(parseDate(value))
}

function timeRange(week) {
  if (!week.startTime) return 'To be announced'
  const start = formatTime(week.startTime)
  return week.endTime ? `${start}–${formatTime(week.endTime)}` : start
}

function formatTime(value) {
  const [hours, minutes] = value.split(':').map(Number)
  return new Date(2000, 0, 1, hours, minutes)
    .toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })
    .toUpperCase()
}

function humanize(value = '') {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ')
}

function sortedResults(results = []) {
  return [...results].sort((a, b) => a.placement - b.placement)
}

function leagueScore(result, table) {
  const playerCount = table.results?.length
  const scoringKey = playerCount === 3 ? 'threePlayer' : playerCount === 4 ? 'fourPlayer' : null
  const placementKey = ['first', 'second', 'third', 'fourth'][Number(result.placement) - 1]
  if (!scoringKey || !placementKey) return 0
  return Number(selectedSeason.value.scoring[scoringKey]?.[placementKey]) || 0
}

function compareGameResults(a, b) {
  return b.score - a.score
    || a.placement - b.placement
    || b.finalPoints - a.finalPoints
}

function compareStandingPlayers(a, b) {
  const highScoreDifference = a.highestFinalScore === b.highestFinalScore
    ? 0
    : (b.highestFinalScore ?? Number.NEGATIVE_INFINITY)
      - (a.highestFinalScore ?? Number.NEGATIVE_INFINITY)

  return b.bestTotal - a.bestTotal
    || b.played - a.played
    || b.wins - a.wins
    || b.seconds - a.seconds
    || highScoreDifference
}

function scoreDisplay(value) {
  const score = Number(value) || 0
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}

function scoreClass(value) {
  return Number(value) >= 0 ? 'score-positive' : 'score-negative'
}

function numberFormat(value) {
  return new Intl.NumberFormat('en-MY').format(Number(value) || 0)
}

function ordinal(value) {
  const suffix = value === 1 ? 'st' : value === 2 ? 'nd' : value === 3 ? 'rd' : 'th'
  return `${value}${suffix}`
}

function openRules() {
  rulesDialog.value?.showModal()
  document.body.style.overflow = 'hidden'
}

function closeRules() {
  rulesDialog.value?.close()
}

function closeRulesFromBackdrop(event) {
  if (event.target === rulesDialog.value) closeRules()
}

function onRulesClosed() {
  document.body.style.overflow = ''
}

onBeforeUnmount(() => {
  clearInterval(dateRefresh)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.league-page {
  width: min(100% - 24px, 1060px);
  padding: 0 0 36px;
}

.league-hero {
  width: 100%;
  padding: 30px 16px 34px;
}

.league-kicker,
.section-kicker {
  margin: 0 0 10px;
  color: var(--gold-leaf);
  font-size: .65rem;
  font-weight: 700;
  letter-spacing: 2.1px;
  text-transform: uppercase;
}

.league-intro {
  max-width: 590px;
  margin: 18px auto 0;
  font-size: clamp(.9rem, 2vw, 1rem);
  line-height: 1.75;
  opacity: .78;
}

.season-switcher {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
  padding: 7px 8px 7px 15px;
  border: 1px solid rgba(101, 119, 99, .14);
  border-radius: 999px;
  background: rgba(255, 253, 249, .72);
}

.season-switcher label {
  color: var(--matcha-leaf);
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.season-switcher select {
  padding: 7px 30px 7px 12px;
  color: var(--clay-text);
  font: inherit;
  font-size: .75rem;
  font-weight: 700;
  border: 0;
  border-radius: 999px;
  outline: none;
  background: var(--lavender-mist);
}

.season-card,
.content-card,
.rules-card {
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 24px;
  border: 1px solid rgba(185, 139, 104, .18);
  background: rgba(255, 253, 249, .92);
  box-shadow: 0 18px 48px rgba(74, 68, 61, .09);
}

.season-card {
  padding: clamp(24px, 5vw, 46px);
  border-radius: var(--radius-card);
  background:
    radial-gradient(circle at 92% 8%, rgba(212, 206, 223, .5), transparent 32%),
    linear-gradient(145deg, rgba(255,253,249,.98), rgba(246,236,231,.92));
  box-shadow: inset 0 3px 0 var(--gold-leaf), 0 18px 48px rgba(74, 68, 61, .09);
}

.season-heading {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 24px;
}

.status-pill {
  display: inline-flex;
  padding: 6px 10px;
  color: var(--matcha-leaf);
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  border-radius: 999px;
  background: var(--lavender-mist);
}

.status-active,
.status-completed {
  color: #fff;
  background: var(--matcha-leaf);
}

.season-heading h2,
.section-heading h2,
.rules-card h2 {
  margin: 12px 0 7px;
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.6rem, 4vw, 2.25rem);
  font-style: italic;
  font-weight: 400;
}

.season-heading > div > p {
  margin: 0;
  font-size: .83rem;
  opacity: .7;
}

.prize-card {
  display: grid;
  min-width: 220px;
  padding: 18px 20px;
  border-radius: 18px;
  background: rgba(255, 253, 249, .72);
  box-shadow: inset 0 2px 0 var(--gold-leaf);
}

.prize-card span,
.prize-card small {
  font-size: .61rem;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  opacity: .6;
}

.prize-card strong {
  margin: 6px 0;
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: 1.12rem;
  font-style: italic;
  font-weight: 400;
}

.prize-card small {
  max-width: 190px;
  line-height: 1.45;
  letter-spacing: .4px;
  text-transform: none;
}

.season-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 34px;
}

.season-stats div {
  display: grid;
  gap: 3px;
  padding: 15px 16px;
  border: 1px solid rgba(101, 119, 99, .1);
  border-radius: 15px;
  background: rgba(255, 255, 255, .48);
}

.season-stats strong {
  color: var(--matcha-leaf);
  font-size: 1.12rem;
}

.season-stats span {
  font-size: .62rem;
  line-height: 1.45;
  opacity: .64;
}

.content-card {
  padding: clamp(24px, 5vw, 46px);
  border-radius: var(--radius-card);
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 25px;
}

.section-heading h2 {
  margin: 0;
}

.section-heading > p {
  max-width: 360px;
  margin: 0 0 3px;
  font-size: .76rem;
  line-height: 1.6;
  text-align: right;
  opacity: .65;
}

.standings-table-wrap,
.result-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(101, 119, 99, .12);
  border-radius: 18px;
}

.standings-table,
.result-table {
  width: 100%;
  border-collapse: collapse;
}

.standings-table thead,
.result-table thead {
  background: linear-gradient(135deg, var(--rose-dust), var(--lavender-mist));
}

.standings-table th,
.standings-table td,
.result-table th,
.result-table td {
  padding: 14px 15px;
  border-bottom: 1px solid rgba(101, 119, 99, .1);
  font-size: .78rem;
  text-align: right;
  white-space: nowrap;
}

.standings-table th:first-child,
.standings-table td:first-child,
.standings-table th:nth-child(2),
.standings-table td:nth-child(2),
.result-table th:first-child,
.result-table td:first-child,
.result-table th:nth-child(2),
.result-table td:nth-child(2) {
  text-align: left;
}

.standings-table thead th,
.result-table thead th {
  color: var(--matcha-leaf);
  font-size: .58rem;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.standings-table tbody tr:last-child > *,
.result-table tbody tr:last-child > * {
  border-bottom: 0;
}

.rank-medal,
.place-marker {
  display: inline-grid;
  place-items: center;
  min-width: 29px;
  height: 29px;
  padding: 0 4px;
  box-sizing: border-box;
  color: var(--matcha-leaf);
  font-size: .7rem;
  font-weight: 700;
  border-radius: 50%;
  background: var(--lavender-mist);
}

.rank-1 {
  color: #7b5738;
  background: #f1dca4;
}

.rank-2 {
  color: #64686c;
  background: #e1e4e7;
}

.rank-3 {
  color: #81553d;
  background: #e4bca7;
}

.score-positive {
  color: var(--matcha-leaf);
}

.score-negative {
  color: #a35663;
}

.standings-cards,
.result-cards {
  display: none;
}

.week-picker {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.week-picker button {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 12px 8px;
  color: var(--clay-text);
  font: inherit;
  text-align: left;
  border: 1px solid rgba(101, 119, 99, .13);
  border-radius: 14px;
  cursor: pointer;
  background: rgba(246, 236, 231, .42);
  transition: transform .2s, border-color .2s, background .2s;
}

.week-picker button:hover {
  transform: translateY(-2px);
  border-color: rgba(101, 119, 99, .32);
}

.week-picker button.completed {
  background: rgba(236, 233, 241, .75);
}

.week-picker button.active {
  color: #fff;
  border-color: var(--matcha-leaf);
  background: var(--matcha-leaf);
  box-shadow: 0 7px 18px rgba(101,119,99,.2);
}

.week-picker span,
.week-picker small {
  overflow: hidden;
  font-size: .55rem;
  letter-spacing: .9px;
  text-overflow: ellipsis;
  text-transform: uppercase;
  opacity: .65;
}

.week-picker strong {
  font-size: .78rem;
}

.week-detail {
  margin-top: 24px;
  padding-top: 28px;
  border-top: 1px solid rgba(101, 119, 99, .12);
}

.week-detail-head {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: clamp(28px, 8vw, 90px);
  align-items: end;
}

.week-detail-head h3 {
  margin: 9px 0 2px;
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: 1.65rem;
  font-style: italic;
  font-weight: 400;
}

.week-detail-head p {
  margin: 0;
  font-size: .75rem;
  opacity: .64;
}

.week-detail dl {
  display: grid;
  grid-template-columns: .75fr 1.5fr;
  gap: 10px;
  margin: 0;
}

.week-detail dl div {
  padding: 12px 14px;
  border-radius: 13px;
  background: var(--rose-dust);
}

.week-detail dt {
  margin-bottom: 5px;
  color: var(--matcha-leaf);
  font-size: .55rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.week-detail dd {
  margin: 0;
  font-size: .72rem;
  font-weight: 700;
  line-height: 1.45;
}

.table-result {
  margin-top: 28px;
}

.table-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.table-title h4 {
  margin: 0;
  color: var(--matcha-leaf);
  font-size: .75rem;
  letter-spacing: 1.3px;
  text-transform: uppercase;
}

.table-metadata {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.table-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.table-action-button {
  min-height: 38px !important;
  padding: 6px 13px !important;
  font-size: .8rem !important;
}

.table-metadata span {
  font-size: .65rem;
  opacity: .55;
}

.scheduled-state {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 28px;
  padding: 22px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(246,236,231,.7), rgba(236,233,241,.7));
}

.scheduled-state > span {
  display: grid;
  place-items: center;
  flex: 0 0 50px;
  height: 50px;
  color: var(--matcha-leaf);
  font-family: serif;
  font-size: 1.45rem;
  border: 1px solid rgba(101, 119, 99, .15);
  border-radius: 13px;
  background: rgba(255, 253, 249, .72);
}

.scheduled-state h4 {
  margin: 0 0 6px;
  color: var(--matcha-leaf);
  font-size: .9rem;
}

.scheduled-state p,
.week-notes {
  margin: 0;
  font-size: .76rem;
  line-height: 1.65;
  opacity: .7;
}

.week-notes {
  margin-top: 18px;
}

.score-entry {
  margin-top: 28px;
  padding: 22px;
  border: 1px solid rgba(101, 119, 99, .14);
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(246, 236, 231, .56), rgba(236, 233, 241, .6));
}

.score-entry-heading,
.score-entry-footer {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
}

.score-entry-heading h4 {
  margin: 0;
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: 1.35rem;
  font-style: italic;
  font-weight: 400;
}

.score-entry-heading > p {
  max-width: 300px;
  margin: 0;
  font-size: .7rem;
  line-height: 1.6;
  text-align: right;
  opacity: .65;
}

.score-entry-form {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.score-entry-options {
  display: grid;
  grid-template-columns: minmax(180px, .6fr) 1fr;
  align-items: end;
  gap: 10px;
}

.score-entry-row label,
.score-entry-options label {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.score-entry-row label > span,
.score-entry-options label > span {
  color: var(--matcha-leaf);
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: .8px;
  text-transform: uppercase;
}

.score-entry-options label > span small {
  font-size: inherit;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  opacity: .65;
}

.score-entry-row input,
.score-entry-row select,
.score-entry-options input,
.score-entry-options select {
  box-sizing: border-box;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  color: var(--clay-text);
  font: inherit;
  font-size: .72rem;
  border: 1px solid rgba(101, 119, 99, .2);
  border-radius: 10px;
  background: rgba(255, 253, 249, .88);
}

.score-entry-rows {
  display: grid;
  gap: 8px;
}

.score-entry-row {
  display: grid;
  grid-template-columns: 1.5fr .9fr;
  align-items: start;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(101, 119, 99, .1);
  border-radius: 13px;
  background: rgba(255, 253, 249, .55);
}

.score-entry-footer {
  align-items: center;
}

.score-entry-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.score-entry-message {
  margin: 0;
  color: var(--matcha-leaf);
  font-size: .7rem;
  line-height: 1.5;
}

.score-entry-auto {
  margin: 0;
  font-size: .62rem;
  line-height: 1.5;
  opacity: .65;
}

.score-entry-submit {
  min-height: 42px;
  padding: 0 18px;
  color: #fff;
  font: inherit;
  font-size: .7rem;
  font-weight: 700;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  background: var(--matcha-leaf);
}

.score-entry-reset {
  min-height: 42px;
  padding: 0 16px;
  color: var(--matcha-leaf);
  font: inherit;
  font-size: .7rem;
  font-weight: 700;
  border: 1px solid rgba(101, 119, 99, .25);
  border-radius: 999px;
  cursor: pointer;
  background: rgba(255, 253, 249, .72);
}

.score-entry-reset:disabled {
  cursor: wait;
  opacity: .65;
}

.score-entry-submit:disabled {
  cursor: wait;
  opacity: .65;
}

.score-entry-submit:focus-visible,
.score-entry-reset:focus-visible,
.score-entry input:focus-visible,
.score-entry select:focus-visible {
  outline: 3px solid var(--gold-leaf);
  outline-offset: 2px;
}

.rules-card {
  display: grid;
  grid-template-columns: 1.35fr .65fr;
  align-items: center;
  gap: 28px;
  padding: clamp(24px, 5vw, 40px);
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(237,218,209,.72), rgba(236,233,241,.78));
}

.rules-card h2 {
  margin-top: 0;
  font-size: 1.45rem;
}

.rules-card p {
  margin: 0;
  font-size: .78rem;
  line-height: 1.75;
  opacity: .75;
}

.rules-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 11px 16px;
  color: #fff;
  font: inherit;
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .4px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  background: var(--matcha-leaf);
  box-shadow: 0 7px 18px rgba(101, 119, 99, .2);
  transition: transform .2s, box-shadow .2s;
}

.rules-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(101, 119, 99, .26);
}

.rules-button:focus-visible,
.rules-close:focus-visible {
  outline: 3px solid var(--gold-leaf);
  outline-offset: 3px;
}

.rules-button span {
  font-size: 1rem;
  line-height: 1;
}

.placement-scoring {
  display: grid;
  gap: 9px;
}

.placement-scoring div {
  display: grid;
  gap: 5px;
  padding: 14px 16px;
  border: 1px solid rgba(101,119,99,.12);
  border-radius: 14px;
  background: rgba(255,253,249,.6);
}

.placement-scoring span {
  color: var(--gold-leaf);
  font-size: .56rem;
  font-weight: 700;
  letter-spacing: 1.3px;
  text-transform: uppercase;
}

.placement-scoring strong {
  color: var(--matcha-leaf);
  font-size: .82rem;
  line-height: 1.5;
}

.rules-dialog {
  width: min(calc(100% - 32px), 880px);
  max-height: min(88vh, 920px);
  padding: 0;
  color: var(--clay-text);
  border: 1px solid rgba(185, 139, 104, .25);
  border-radius: 28px;
  background: #fffdf9;
  box-shadow: 0 28px 90px rgba(50, 46, 42, .3);
}

.rules-dialog::backdrop {
  background: rgba(48, 45, 41, .58);
  backdrop-filter: blur(4px);
}

.rules-dialog-shell {
  max-height: min(88vh, 920px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.rules-dialog-header {
  position: sticky;
  z-index: 2;
  top: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px 24px;
  border-bottom: 1px solid rgba(101, 119, 99, .12);
  background:
    radial-gradient(circle at 88% 10%, rgba(212, 206, 223, .55), transparent 34%),
    rgba(255, 253, 249, .96);
  backdrop-filter: blur(12px);
}

.rules-dialog-header h2 {
  margin: 0 0 8px;
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.75rem, 4vw, 2.35rem);
  font-style: italic;
  font-weight: 400;
}

.rules-dialog-header > div > p:last-child {
  max-width: 650px;
  margin: 0;
  font-size: .78rem;
  line-height: 1.65;
  opacity: .72;
}

.rules-close {
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  height: 38px;
  padding: 0 0 3px;
  color: var(--matcha-leaf);
  font: inherit;
  font-size: 1.55rem;
  line-height: 1;
  border: 1px solid rgba(101, 119, 99, .16);
  border-radius: 50%;
  cursor: pointer;
  background: rgba(255, 253, 249, .82);
}

.rules-dialog-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 12px 32px 34px;
}

.rules-dialog-content section {
  padding: 24px 22px 22px 0;
  border-bottom: 1px solid rgba(101, 119, 99, .11);
}

.rules-dialog-content section:nth-child(even) {
  padding-right: 0;
  padding-left: 22px;
  border-left: 1px solid rgba(101, 119, 99, .11);
}

.rules-dialog-content section:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.rules-dialog-content h3 {
  margin: 0 0 13px;
  color: var(--matcha-leaf);
  font-size: .72rem;
  letter-spacing: 1.35px;
  text-transform: uppercase;
}

.rules-dialog-content p,
.rules-dialog-content li {
  font-size: .74rem;
  line-height: 1.65;
}

.rules-dialog-content p {
  margin: 0 0 10px;
}

.rules-dialog-content ul {
  margin: 0;
  padding-left: 18px;
}

.rules-dialog-content li {
  margin-bottom: 6px;
}

.rules-dialog-content li::marker {
  color: var(--gold-leaf);
}

.rules-dialog-content li ul {
  margin-top: 6px;
}

.rules-note {
  margin-top: 15px !important;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--rose-dust);
}

.tie-break-rules {
  margin-top: 16px;
  padding: 16px 18px;
  border: 1px solid rgba(101, 119, 99, .12);
  border-radius: 14px;
  background: rgba(236, 233, 241, .55);
}

.tie-break-rules h4 {
  margin: 0 0 10px;
  color: var(--matcha-leaf);
  font-size: .66rem;
  letter-spacing: 1.1px;
  text-transform: uppercase;
}

.tie-break-rules ol {
  margin: 0;
  padding-left: 20px;
}

.tie-break-rules li::marker {
  color: var(--matcha-leaf);
  font-weight: 700;
}

.league-points-section {
  grid-column: 1 / -1;
  padding-right: 0 !important;
  padding-left: 0 !important;
  border-left: 0 !important;
}

.league-points-tables {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 16px;
}

.league-points-tables table {
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(101, 119, 99, .12);
  border-radius: 14px;
  border-collapse: separate;
  border-spacing: 0;
}

.league-points-tables caption {
  padding: 11px 13px;
  color: var(--matcha-leaf);
  font-size: .68rem;
  font-weight: 700;
  text-align: left;
  background: var(--lavender-mist);
}

.league-points-tables th,
.league-points-tables td {
  padding: 8px 13px;
  font-size: .7rem;
  text-align: left;
  border-bottom: 1px solid rgba(101, 119, 99, .09);
}

.league-points-tables th {
  color: var(--matcha-leaf);
  font-size: .56rem;
  letter-spacing: .9px;
  text-transform: uppercase;
}

.league-points-tables th:last-child,
.league-points-tables td:last-child {
  text-align: right;
}

.league-points-tables tbody tr:last-child td {
  border-bottom: 0;
}

@media (max-width: 760px) {
  .league-page {
    width: min(100% - 16px, 560px);
  }

  .league-hero {
    padding-top: 30px;
  }

  .season-card,
  .content-card {
    border-radius: 24px;
  }

  .season-heading {
    grid-template-columns: 1fr;
  }

  .prize-card {
    min-width: 0;
  }

  .season-stats {
    grid-template-columns: 1fr 1fr;
  }

  .section-heading {
    display: block;
  }

  .section-heading > p {
    margin-top: 8px;
    text-align: left;
  }

  .standings-table-wrap,
  .result-table-wrap {
    display: none;
  }

  .standings-cards,
  .result-cards {
    display: grid;
    gap: 8px;
  }

  .standing-player,
  .result-cards article {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 13px;
    border: 1px solid rgba(101, 119, 99, .1);
    border-radius: 14px;
    background: rgba(246, 236, 231, .38);
  }

  .standing-player h3,
  .result-cards h5 {
    margin: 0 0 3px;
    font-size: .78rem;
  }

  .standing-player p,
  .result-cards p {
    margin: 0;
    font-size: .62rem;
    opacity: .6;
  }

  .standing-player > strong,
  .result-cards article > strong {
    font-size: .8rem;
  }

  .week-picker {
    display: flex;
    margin-right: calc(clamp(24px, 5vw, 46px) * -1);
    padding-right: clamp(24px, 5vw, 46px);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .week-picker::-webkit-scrollbar {
    display: none;
  }

  .week-picker button {
    flex: 0 0 92px;
  }

  .week-detail-head {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .week-detail dl {
    grid-template-columns: 1fr;
  }

  .score-entry {
    padding: 16px;
  }

  .score-entry-heading,
  .score-entry-footer {
    display: grid;
    align-items: start;
  }

  .score-entry-heading > p {
    text-align: left;
  }

  .score-entry-options {
    grid-template-columns: 1fr;
  }

  .score-entry-row {
    grid-template-columns: 1fr;
  }

  .score-entry-actions {
    width: 100%;
  }

  .score-entry-actions button {
    flex: 1;
  }

  .score-entry-submit {
    width: auto;
  }

  .rules-card {
    grid-template-columns: 1fr;
    border-radius: 24px;
  }

  .rules-dialog {
    width: calc(100% - 16px);
    max-height: calc(100vh - 16px);
    border-radius: 22px;
  }

  .rules-dialog-shell {
    max-height: calc(100vh - 16px);
  }

  .rules-dialog-header {
    padding: 22px 20px 19px;
  }

  .rules-dialog-content {
    grid-template-columns: 1fr;
    padding: 6px 20px 24px;
  }

  .rules-dialog-content section,
  .rules-dialog-content section:nth-child(even) {
    padding: 20px 0;
    border-bottom: 1px solid rgba(101, 119, 99, .11);
    border-left: 0;
  }

  .rules-dialog-content section:last-child {
    border-bottom: 0;
  }

  .league-points-tables {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 390px) {
  .season-stats {
    grid-template-columns: 1fr;
  }
}
/* Comfortable touch targets and shortcuts shared across screen sizes. */
.league-shortcuts { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 22px; }
.league-shortcuts a, .league-shortcuts button, .standings-toggle { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 8px 16px; border: 1px solid #9ba995; border-radius: 999px; background: #fffdf9; color: #41513d; font: inherit; font-size: .9rem; text-decoration: none; cursor: pointer; }
.league-shortcuts button { background: var(--matcha-leaf); color: white; }
#standings-heading, #weeks-heading, #score-entry { scroll-margin-top: 90px; }
.standing-search { display: grid; gap: 6px; max-width: 340px; margin: 18px 0; font-size: .85rem; }
.standing-search input, .mobile-week-select select { width: 100%; box-sizing: border-box; min-height: 48px; padding: 10px 12px; border: 1px solid #9ba995; border-radius: 10px; background: #fffdf9; color: var(--clay-text); font: inherit; font-size: 16px; }
.mobile-week-select, .standings-toggle { display: none; }
.score-entry-row input, .score-entry-options select { font-size: 16px; min-height: 48px; }
.score-entry-row label > span, .score-entry-options label > span { font-size: .8rem; letter-spacing: 0; text-transform: none; }
.score-entry-heading > p, .score-entry-auto, .score-entry-message { font-size: .85rem; opacity: 1; }
.score-entry-submit, .score-entry-reset { min-height: 48px; font-size: .9rem; }
.score-entry { margin-bottom: 28px; }
.standing-player small, .result-cards article > strong small { display: block; font-size: .65rem; font-weight: 400; white-space: nowrap; }
.table-title { gap: 12px; }
.table-metadata { gap: 4px 12px; }
.table-metadata span { font-size: .75rem; opacity: .85; }
@media (max-width: 760px) {
  .season-card, .content-card, .rules-card { padding: 20px 16px; }
  .season-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .season-stats > div { padding: 12px 8px; }
  .season-stats span { font-size: .75rem; line-height: 1.45; opacity: .85; }
  .league-hero { padding: 30px 8px 24px; }
  .league-intro, .section-heading > p, .rules-card > div > p { font-size: .9rem; opacity: .85; }
  .mobile-week-select { display: grid; gap: 8px; margin: 18px 0; font-size: .9rem; }
  .week-picker { display: none; }
  .standings-toggle { display: flex; width: 100%; margin-top: 14px; }
  .standing-search { max-width: none; }
  .standing-player, .result-cards article { gap: 10px; padding: 12px; }
  .standing-player > div, .result-cards article > div { min-width: 0; overflow-wrap: anywhere; }
  .standing-player h3, .result-cards h5 { font-size: 1rem; }
  .standing-player p, .result-cards p { font-size: .8rem; opacity: .85; }
  .standing-player > strong, .result-cards article > strong { font-size: 1.15rem; text-align: right; }
  .score-entry { padding: 14px 10px; }
  .score-entry-row { padding: 12px 10px; gap: 14px; }
  .score-entry-heading > p { max-width: none; }
  .score-entry-actions { flex-wrap: wrap; }
  .score-entry-actions button { white-space: nowrap; }
  .table-title { align-items: start; }
  .table-metadata { flex-direction: column; align-items: end; text-align: right; }
}
/* Shared typography and controls also style the player-picker component. */
.league-page {
  --league-border: rgba(101, 119, 99, .35);
  --league-muted: #68665d;
  --league-label-size: .8125rem;
  --league-body-size: .875rem;
  --league-detail-size: .8125rem;
}
.league-page :deep(.league-field-label) {
  display: block;
  margin: 0;
  color: var(--matcha-leaf);
  font-family: 'Quicksand', sans-serif;
  font-size: var(--league-label-size);
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: 0;
  text-transform: none;
}
.league-page :deep(.league-control) {
  box-sizing: border-box;
  width: 100%;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid var(--league-border);
  border-radius: 10px;
  background: var(--white-pure);
  color: var(--clay-text);
  font-family: 'Quicksand', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0;
}
.league-page :deep(.league-control::placeholder) { color: var(--league-muted); opacity: 1; }
.league-page :deep(.league-button) {
  box-sizing: border-box;
  min-height: 48px;
  padding: 10px 18px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--league-border);
  border-radius: 999px;
  background: var(--white-pure);
  color: var(--matcha-leaf);
  font-family: 'Quicksand', sans-serif;
  font-size: var(--league-body-size);
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: 0;
  text-transform: none;
  text-decoration: none;
  cursor: pointer;
  box-shadow: none;
}
.league-page :deep(.league-button-primary) { background: var(--matcha-leaf); border-color: var(--matcha-leaf); color: var(--white-pure); }
.league-page :deep(.league-button:hover:not(:disabled)) { background: var(--rose-dust); }
.league-page :deep(.league-button-primary:hover:not(:disabled)) { background: #526450; border-color: #526450; }
.league-page :deep(.league-button:disabled), .league-page :deep(.league-control:disabled) { opacity: .6; cursor: not-allowed; }
.league-page :deep(.league-control:focus-visible), .league-page :deep(.league-button:focus-visible) { outline: 3px solid var(--gold-leaf); outline-offset: 3px; }
.league-page :deep(.league-field-hint),
.score-entry-heading > p, .score-entry-auto, .score-entry-message,
.table-metadata span, .standing-player p, .result-cards p,
.week-notes, .scheduled-state p, .season-stats span, .prize-card small {
  font-size: var(--league-detail-size);
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0;
  color: var(--league-muted);
  opacity: 1;
}
.score-entry-message { color: var(--matcha-leaf); font-weight: 700; }
.standing-search, .mobile-week-select { gap: 6px; }
.standings-table td, .standings-table tbody th, .result-table td, .result-table tbody th { font-size: var(--league-body-size); }
.standings-table thead th, .result-table thead th, .section-kicker, .table-title h4 { font-size: .75rem; letter-spacing: .06em; }
.season-switcher .league-control { width: auto; min-width: 120px; }
.season-switcher { gap: 10px; padding: 0; background: transparent; }
.standing-player > strong, .result-cards article > strong { font-variant-numeric: tabular-nums; }
.standing-player small, .result-cards article > strong small { font-size: .75rem; color: var(--league-muted); }
</style>
