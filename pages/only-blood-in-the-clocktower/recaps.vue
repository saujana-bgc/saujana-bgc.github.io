<template>
  <main class="clocktower-page">
    <header class="page-intro">
      <p class="page-eyebrow">Clocktower</p>
      <h1 class="hero-title">Recaps</h1>
      <p class="stats-container">Stories, results and approved photos from our Blood on the Clocktower gatherings.</p>
      <NuxtLink class="recaps-overview-link" to="/only-blood-in-the-clocktower/" no-prefetch>Clocktower overview <span aria-hidden="true">→</span></NuxtLink>
    </header>
    <section id="clocktower-archive" class="archive" aria-labelledby="archive-title">
      <header v-if="loading || error || recapSessions.length" class="archive-heading">
        <h2 id="archive-title" tabindex="-1">Gathering recaps</h2>
      </header>
      <div v-if="!loading && !error && recapSessions.length && (archiveYears.length > 1 || archiveScripts.length > 1)" class="archive-filters" aria-label="Filter gathering recaps">
        <label v-if="archiveYears.length > 1">Year<USelect class="archive-select" :model-value="selectedYear" :items="[{ label: 'All years', value: 'all' }, ...archiveYears.map(year => ({ label: String(year), value: String(year) }))]" @update:model-value="setSelectedYear" /></label>
        <label v-if="archiveScripts.length > 1">Script<USelect class="archive-select" :model-value="selectedScript" :items="[{ label: 'All scripts', value: 'all' }, ...archiveScripts.map(script => ({ label: script, value: script }))]" @update:model-value="setSelectedScript" /></label>
        <UButton v-if="selectedYear !== 'all' || selectedScript !== 'all'" class="archive-button" type="button" @click="clearArchiveFilters">Clear filters</UButton>
      </div>
      <p v-if="shareNotice" class="archive-state share-notice" role="status">{{ shareNotice }}</p>
      <p v-if="!loading && !error && recapSessions.length && (archiveYears.length > 1 || archiveScripts.length > 1)" class="filter-count" role="status">{{ filteredSessions.length }} of {{ recapSessions.length }} gatherings match these filters</p>
      <p v-if="error" class="archive-state" role="alert">{{ error }} <UButton class="archive-button" type="button" @click="loadArchive">Try again</UButton></p>
      <p v-else-if="loading" class="archive-state" role="status">Loading recaps…</p>
      <div v-else-if="!recapSessions.length" class="archive-state empty-archive">
        <span class="empty-mark" aria-hidden="true">✧</span>
        <h3>The archive is quiet for now</h3>
        <p>Gathering stories, game results and approved photos will find their place here as sessions are added.</p>
        <NuxtLink class="recaps-next-gathering" to="/gatherings/" no-prefetch>See upcoming gatherings <span aria-hidden="true">→</span></NuxtLink>
      </div>

      <p v-if="!loading && !error && recapSessions.length && !filteredSessions.length" class="archive-state" role="status">No gatherings match these filters. Adjust the year or script above.</p>
      <article v-for="session in paginatedSessions" :id="'session-' + session.id" :key="session.id" class="session-card" :class="{ 'is-latest-session': session.id === featured?.id, 'has-cover': session.id === featured?.id && Boolean(coverPhoto(session)) }">
        <div class="session-masthead">
          <div class="session-heading">
            <p class="session-kicker"><span v-if="session.id === featured?.id" class="eyebrow latest-label">Latest recap</span><time :datetime="session.session_date">{{ formatDate(session.session_date) }}</time></p>
            <h3 tabindex="-1">{{ session.teaser || session.venue || 'Saujana gathering' }}</h3>
            <p class="metadata"><template v-if="session.teaser && session.venue">{{ session.venue }} · </template><template v-if="selectedScript !== 'all'">{{ visibleGames(session).length }} of {{ session.games?.length || 0 }} games</template><template v-else>{{ session.games?.length || 0 }} game{{ session.games?.length === 1 ? '' : 's' }}</template></p>
          </div>
          <img v-if="session.id === featured?.id && coverPhoto(session)" class="session-cover" :src="photoUrls[coverPhoto(session).path]" :alt="coverPhoto(session).alt || 'Table photo from ' + formatDate(session.session_date)" loading="lazy">
        </div>
        <section v-if="session.recap" class="recap-story" aria-label="Retelling">
          <h4>Retelling</h4>
          <div class="recap-prose">
            <p v-for="(paragraph, index) in retellingParagraphs(session.recap)" :key="index">{{ paragraph }}</p>
          </div>
        </section>

        <div v-if="session.games?.length" class="game-grid">
          <article v-for="{ game, number } in visibleGames(session)" :id="game.id ? 'game-' + game.id : undefined" :key="game.id || number" class="game-recap">
            <header class="game-recap-heading">
              <div class="game-title">
                <span class="game-label">Game {{ number }}</span>
                <h4 class="game-script" tabindex="-1">{{ game.script || 'Script not recorded' }}</h4>
              </div>
              <p v-if="game.outcome" class="outcome">{{ game.outcome === 'No result' ? 'No winner' : game.outcome }}</p>
            </header>
            <ol v-if="game.players?.length" class="grimoire" aria-label="Players and characters">
              <li v-for="(player, pIndex) in game.players" :key="pIndex" class="grimoire-seat" :class="{ 'is-dead': player.died }">
                <img class="character-art" :src="characterIcon(player.character)" alt="" loading="lazy" decoding="async">
                <div class="seat-copy">
                  <span class="seat-name">{{ publicPlayerName(player, pIndex) }}</span>
                  <div class="seat-meta">
                    <span class="seat-character">{{ player.character || 'Character not recorded' }}</span>
                    <span v-if="player.died" class="death-mark">Died</span>
                  </div>
                </div>
              </li>
            </ol>
            <p v-if="game.notes" class="story-text">{{ game.notes }}</p>
          </article>
        </div>

        <details v-if="sessionPhotos(session).length" class="photo-reveal">
          <summary>Table photos · {{ sessionPhotos(session).length }}</summary>
          <div class="photo-gallery" :aria-label="'Photos from ' + formatDate(session.session_date)">
            <a v-for="photo in sessionPhotos(session)" :key="photo.path" class="photo-link" :href="photoUrls[photo.path]" target="_blank" rel="noopener noreferrer" :aria-label="'Open full-size photo from ' + formatDate(session.session_date) + ' in a new tab'">
              <img :src="photoUrls[photo.path]" :alt="photo.alt || 'Photo from this Blood on the Clocktower gathering'" loading="lazy">
            </a>
          </div>
        </details>
      </article>
      <nav v-if="pageCount > 1 && !loading && !error" class="archive-pagination" aria-label="Gathering recap pages">
        <UButton class="archive-button page-button" type="button" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">Previous</UButton>
        <span class="page-status" aria-live="polite">Page {{ currentPage }} of {{ pageCount }}</span>
        <UButton class="archive-button page-button" type="button" :disabled="currentPage === pageCount" @click="changePage(currentPage + 1)">Next</UButton>
      </nav>
      <p v-if="!loading && !error && pageCount > 1" class="pagination-count" aria-live="polite">Showing {{ rangeStart }}–{{ rangeEnd }} of {{ filteredSessions.length }} gatherings</p>
    </section>

    <section v-if="!loading && !error && recapSessions.length" class="stats" aria-labelledby="stats-title">
      <p class="eyebrow">The tally</p>
      <h2 id="stats-title">Clocktower in numbers</h2>
      <div class="stat-row">
        <div><strong>{{ statistics.sessions }}</strong><span>{{ statistics.sessions === 1 ? 'gathering' : 'gatherings' }}</span></div>
        <div><strong>{{ statistics.games }}</strong><span>{{ statistics.games === 1 ? 'game played' : 'games played' }}</span></div>
        <div><strong>{{ statistics.scripts }}</strong><span>{{ statistics.scripts === 1 ? 'script played' : 'scripts played' }}</span></div>
      </div>
    </section>
    <footer class="art-credit">
      <span>Blood on the Clocktower is published by <a href="https://bloodontheclocktower.com/" target="_blank" rel="noopener noreferrer">The Pandemonium Institute</a>.</span>
      <a href="https://github.com/tomozbot/botc-icons" target="_blank" rel="noopener noreferrer">Character icon credits <span aria-hidden="true">↗</span></a>
    </footer>
  </main>
</template>

<style scoped>
.recaps-overview-link { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; color: var(--matcha-leaf); font-weight: 650; text-underline-offset: 4px; }
</style>

<script setup>
const config = useRuntimeConfig()
const route = useRoute()

function publicPlayerName(player, index) {
  const name = typeof player.public_name === 'string' ? player.public_name.trim() : ''
  return name && name !== 'Seat ' + (index + 1) ? name : 'Player ' + (index + 1)
}

const sessions = ref([])
const photoUrls = ref({})
const selectedYear = ref('all')
const selectedScript = ref('all')
const currentPage = ref(1)
const shareNotice = ref('')
const PAGE_SIZE = 3
const loading = ref(true)
const error = ref('')
const headers = {
  apikey: config.public.supabaseKey,
  'Content-Type': 'application/json',
}
// The archive endpoint already filters to published sessions.
const recapSessions = computed(() => sessions.value.filter(hasResults).sort((a, b) => String(b.session_date || '').localeCompare(String(a.session_date || ''))))
const featured = computed(() => [...recapSessions.value].sort((a, b) => b.session_date.localeCompare(a.session_date))[0])
const archiveYears = computed(() => [...new Set(recapSessions.value.map(session => session.session_date?.slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a)))
const archiveScripts = computed(() => [...new Set(recapSessions.value.flatMap(session => session.games || []).map(game => game.script).filter(Boolean))].sort((a, b) => a.localeCompare(b)))
const filteredSessions = computed(() => recapSessions.value.filter(session =>
  (selectedYear.value === 'all' || session.session_date?.startsWith(selectedYear.value)) &&
  (selectedScript.value === 'all' || session.games?.some(game => game.script === selectedScript.value)),
))
const pageCount = computed(() => Math.ceil(filteredSessions.value.length / PAGE_SIZE))
const paginatedSessions = computed(() => filteredSessions.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE))
const rangeStart = computed(() => filteredSessions.value.length ? (currentPage.value - 1) * PAGE_SIZE + 1 : 0)
const rangeEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, filteredSessions.value.length))
const statistics = computed(() => ({
  sessions: recapSessions.value.length,
  games: recapSessions.value.reduce((total, session) => total + (session.games?.length || 0), 0),
  scripts: new Set(recapSessions.value.flatMap(session => session.games || []).map(game => game.script).filter(Boolean)).size,
}))

function formatDate(value) {
  return value
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date to be announced'
}

function hasResults(session) {
  return Boolean(session.recap || session.games?.length)
}

function sessionPhotos(session) {
  return (session.games || []).flatMap(game => game.photos || [])
    .filter(photo => photo.approved && photoUrls.value[photo.path])
}

function coverPhoto(session) {
  return sessionPhotos(session).find(photo => photo.cover)
}

function retellingParagraphs(recap) {
  return recap.trim().split(/\r?\n(?:[^\S\r\n]*\r?\n)+/)
}

function visibleGames(session) {
  return (session.games || [])
    .map((game, index) => ({ game, number: index + 1 }))
    .filter(({ game }) => selectedScript.value === 'all' || game.script === selectedScript.value)
}

function characterIcon(character) {
  const file = (character || 'custom').toLowerCase().replace(/[^a-z0-9]/g, '')
  return `/images/clocktower/characters/${file}.webp`
}

function clearArchiveFilters() {
  selectedYear.value = 'all'
  selectedScript.value = 'all'
}

function setSelectedYear(year) {
  selectedYear.value = year
  currentPage.value = 1
}

function setSelectedScript(script) {
  selectedScript.value = script
  currentPage.value = 1
}

async function changePage(page) {
  currentPage.value = Math.min(Math.max(1, page), pageCount.value)
  await nextTick()
  const heading = document.getElementById('archive-title')
  heading?.scrollIntoView({ block: 'start' })
  heading?.focus({ preventScroll: true })
}

async function focusSharedTarget() {
  const sharedGameId = typeof route.query.game === 'string'
    ? route.query.game
    : route.hash.startsWith('#game-') ? route.hash.slice('#game-'.length) : null
  const sharedSessionId = typeof route.query.session === 'string'
    ? route.query.session
    : route.hash.startsWith('#session-') ? route.hash.slice('#session-'.length) : null
  if (typeof sharedGameId !== 'string' && typeof sharedSessionId !== 'string') return

  let session = typeof sharedSessionId === 'string'
    ? recapSessions.value.find(item => String(item.id) === sharedSessionId)
    : null
  let game = null
  if (typeof sharedGameId === 'string') {
    if (session) game = (session.games || []).find(item => String(item.id) === sharedGameId)
    if (!game) {
      session = recapSessions.value.find(item => (item.games || []).some(candidate => String(candidate.id) === sharedGameId))
      game = session?.games?.find(item => String(item.id) === sharedGameId)
    }
  }

  if (!session) {
    shareNotice.value = 'This shared gathering or game is no longer available. Browse the recaps below.'
    return
  }

  // A shared URL should remain useful even when the target is outside the active filters.
  selectedYear.value = 'all'
  selectedScript.value = 'all'
  currentPage.value = Math.floor(recapSessions.value.findIndex(item => String(item.id) === String(session.id)) / PAGE_SIZE) + 1
  await nextTick()

  const target = game ? document.getElementById('game-' + game.id) : null
  const fallback = document.getElementById('session-' + session.id)
  const element = target || fallback
  if (element) {
    element.scrollIntoView({ block: 'start' })
    element.querySelector(game && target ? '.game-script' : 'h3')?.focus({ preventScroll: true })
  }
}

async function loadArchive() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(config.public.supabaseUrl + '/functions/v1/botc-archive', {
      method: 'POST', headers, body: JSON.stringify({ action: 'public' }),
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error)
    sessions.value = body.sessions || []
    photoUrls.value = body.photo_urls || {}
    loading.value = false
    await nextTick()
    await focusSharedTarget()
  } catch {
    error.value = 'The recaps aren’t available right now.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadArchive()
})
</script>

<style scoped>
.clocktower-page {
  --ink: var(--clay-text);
  --night: var(--matcha-leaf);
  --wine: var(--matcha-leaf);
  --paper: var(--white-pure);
  --parchment: var(--surface-soft);
  --gold: var(--gold-leaf);
  --soft-ink: var(--muted);
  --rule: var(--line);
  --panel-pad: clamp(15px, 2.6vw, 34px);
  width: min(1320px, calc(100% - clamp(28px, 6vw, 88px)));
  margin-inline: auto;
  padding-bottom: 24px;
  color: var(--ink);
}
.gathering-banner {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 480px);
  overflow: hidden;
  min-height: 280px;
  align-content: center;
  gap: 10px;
  margin-bottom: var(--space-5);
  padding: clamp(24px, 3.5vw, 48px);
  border-radius: var(--radius-card);
  background: var(--surface-soft);
  color: var(--clay-text);
  box-shadow: var(--shadow-card);
}
.gathering-banner::before {
  content: '';
  position: absolute;
  z-index: 1;
  inset: 9px;
  border: 1px solid var(--line);
  border-radius: 10px;
  pointer-events: none;
}
.gathering-banner::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(90deg, var(--surface-soft) 12%, rgba(239, 238, 231, .8) 38%, transparent 78%);
}
.hero-art {
  position: absolute;
  z-index: -2;
  inset: auto 0 0 auto;
  width: min(70%, 770px);
  height: 100%;
  object-fit: cover;
  object-position: center 62%;
}
.eyebrow {
  margin: 0;
  color: var(--wine);
  font-size: .72rem;
  font-weight: 750;
  letter-spacing: .15em;
  line-height: 1.5;
  text-transform: uppercase;
}
.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0 20px; }
.hero-secondary {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  color: inherit;
  font-size: .9rem;
  font-weight: 700;
  text-decoration: none;
}
.hero-secondary { color: var(--matcha-leaf); }
.hero-secondary:hover { text-decoration: underline; text-underline-offset: 4px; }
.hero-tertiary { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; color: var(--matcha-leaf); font-size: .82rem; text-underline-offset: 4px; }
.hero-tertiary:hover { color: var(--clay-text); }
.clocktower-page :is(a, button, summary, select):focus-visible { outline: 2px solid var(--wine); outline-offset: 3px; }
.gathering-banner .hero-actions a:focus-visible { outline-color: var(--gold); }

.next-night, .session-card, .archive-state {
  border: 1px solid var(--rule);
  border-radius: 12px;
  background: var(--paper);
}
.next-night {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 12px 16px;
  margin: 0;
  padding: clamp(16px, 2.2vw, 24px);
  border-top: 2px solid var(--gold-leaf);
  background: var(--white-pure);
  box-shadow: var(--shadow-card);
  z-index: 1;
}
.next-night .calendar-link { grid-column: 2; justify-self: start; min-height: 46px; padding: 0 14px; border-radius: 6px; background: var(--wine); color: var(--white-pure); white-space: normal; }
.calendar-mark, .empty-mark {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--wine);
}
.calendar-mark svg { width: 25px; }
.calendar-mark {
  align-content: center;
  gap: 3px;
  width: 68px;
  height: 72px;
  border-radius: 8px;
  background: var(--paper);
}
.calendar-mark strong { font: 400 1.9rem/1 var(--font-display); }
.calendar-mark span { font-size: .66rem; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
.next-night h2, .archive h2, .stats h2 {
  margin: 3px 0 7px;
  color: var(--ink);
  font: 400 clamp(1.55rem, 3.5vw, 2.5rem)/1.14 var(--font-display);
  letter-spacing: -.025em;
}
.next-night h2 { font-size: clamp(1.35rem, 3vw, 1.95rem); }
.next-copy p:not(.eyebrow) { margin: 3px 0 0; color: var(--soft-ink); font-size: .91rem; }
.next-copy a { color: var(--wine); text-underline-offset: 3px; }
.calendar-link { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: var(--wine); font-size: .84rem; font-weight: 700; text-decoration: none; white-space: nowrap; }
.calendar-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.retry-button { justify-self: start; min-height: 40px; margin-top: 8px; padding: 7px 11px; border: 1px solid var(--line); border-radius: 6px; background: transparent; color: var(--wine); font: inherit; font-size: .85rem; font-weight: 700; cursor: pointer; }
.retry-button:focus-visible { outline: 2px solid var(--wine); outline-offset: 2px; }
.welcome-note {
  display: grid;
  grid-template-columns: minmax(155px, .75fr) minmax(0, 2.8fr) auto;
  align-items: start;
  gap: 14px clamp(16px, 2.6vw, 36px);
  margin: 0 0 clamp(26px, 4vw, 48px);
  padding: clamp(19px, 3vw, 28px) 0;
  border-block: 1px solid var(--line);
  background: transparent;
}
.welcome-note h2 { margin: 4px 0 6px; color: var(--ink); font: 400 clamp(1.45rem, 3vw, 2rem)/1.15 var(--font-display); letter-spacing: -.025em; }
.welcome-steps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; margin: 0; padding: 0; list-style: none; }
.welcome-steps li { display: grid; gap: 2px; color: var(--soft-ink); font-size: .9rem; line-height: 1.5; }
.welcome-steps strong { color: var(--ink); }
.welcome-link { display: inline-flex; align-items: center; justify-self: start; align-self: center; gap: 8px; min-height: 44px; padding: 9px 13px; border: 1px solid var(--line); border-radius: 6px; color: var(--wine); font-size: .86rem; font-weight: 700; text-decoration: none; }
.welcome-link:hover { background: var(--surface-soft); }

.metadata { margin: 4px 0 0; color: var(--soft-ink); font-size: .92rem; overflow-wrap: anywhere; }
.filter-count { margin: 12px 0; color: var(--soft-ink); font-size: .84rem; }
.session-card h3 { overflow-wrap: break-word; }
.script-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; padding: 0; list-style: none; }
.script-tags li { padding: 4px 9px; border: 1px solid var(--rule); border-radius: 5px; color: var(--wine); font-size: .75rem; overflow-wrap: anywhere; }
.recap-story { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; margin-top: 18px; padding: 16px 0; border-block: 1px solid var(--rule); }
.recap-story h4 { margin: 0; color: var(--wine); font: 400 1.2rem/1.4 var(--font-display); }
.recap-prose, .story-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.recap-prose { max-width: 106ch; font-size: 1.02rem; line-height: 1.65; }
.recap-prose p { margin: 0; }
.recap-prose p + p { margin-top: .75em; }
.story-text { margin: 12px 0 0; }

.stats {
  display: grid;
  grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 0 16px;
  margin: 0 0 clamp(32px, 5vw, 62px);
  padding: 18px var(--panel-pad);
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-soft);
}
.stats .eyebrow { grid-column: 1; align-self: end; color: var(--gold); }
.stats h2 { grid-column: 1; align-self: start; color: var(--matcha-leaf); font-size: clamp(1.4rem, 3vw, 1.9rem); }
.stat-row { grid-column: 2; grid-row: 1 / 3; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); text-align: center; }
.stat-row div { display: grid; gap: 4px; padding: 4px 6px; border-left: 1px solid var(--line); }
.stat-row strong { color: var(--gold-leaf); font: 400 clamp(1.65rem, 4vw, 2.55rem)/1 var(--font-display); }
.stat-row span { color: var(--muted); font-size: .81rem; line-height: 1.3; }

.archive-heading { margin-bottom: 18px; }
.archive-state, .session-card { padding: var(--panel-pad); }
.archive-filters { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 9px; background: var(--parchment); }
.share-notice { margin-bottom: 12px; }
.archive-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; margin: 22px 0 0; }
.page-status { min-width: 104px; color: var(--soft-ink); font-size: .88rem; font-variant-numeric: tabular-nums; text-align: center; }
.page-button { min-width: 104px; }
.archive-button:disabled { opacity: .5; cursor: not-allowed; }
.pagination-count { margin: 10px 0 0; color: var(--soft-ink); font-size: .8rem; text-align: center; }
.archive-filters label { display: grid; gap: 4px; min-width: min(100%, 190px); color: var(--soft-ink); font-size: .76rem; font-weight: 700; }
.archive-filters select { min-height: 42px; padding: 7px 32px 7px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--paper); color: var(--ink); font: inherit; }
.archive-state { margin: 0; color: var(--soft-ink); }
.empty-archive { text-align: center; background: linear-gradient(var(--paper), var(--surface-soft)); }
.empty-archive { padding-block: clamp(28px, 4vw, 46px); }
.empty-mark { margin: 0 auto 12px; font-size: 1.7rem; }
.empty-archive h3, .session-card h3 { margin: 0; color: var(--ink); font: 400 clamp(1.25rem, 3vw, 1.75rem)/1.2 var(--font-display); }
.empty-archive p { max-width: 60ch; margin: 8px auto 0; }
.recaps-next-gathering { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin-top: 14px; color: var(--matcha-leaf); font-weight: 650; text-underline-offset: 4px; }
.session-card { margin: 0 0 14px; border-inline-start: 3px solid var(--gold-leaf); box-shadow: var(--shadow-card); }
.session-card.is-latest-session { border-inline-start-color: var(--matcha-leaf); background: linear-gradient(110deg, var(--lavender-mist), var(--paper) 70%); box-shadow: var(--shadow-card); }
.session-masthead { display: grid; gap: 16px 28px; align-items: center; }
.has-cover .session-masthead { grid-template-columns: minmax(0, 1fr) minmax(240px, 34%); }
.session-kicker { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin: 0 0 6px; color: var(--soft-ink); font-size: .82rem; }
.latest-label { padding: 3px 8px; border-radius: 4px; background: var(--lavender-mist); letter-spacing: .09em; }
.session-cover { display: block; width: 100%; max-height: 200px; aspect-ratio: 16 / 9; border-radius: 8px; background: var(--parchment); object-fit: cover; }
.game-grid { display: grid; gap: 12px; margin-top: 18px; }
.game-recap { min-width: 0; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 8px; background: var(--surface-soft); }
.game-recap-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 16px; }
.game-title { display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.game-label { color: var(--wine); font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; }
.game-script { margin: 0; font: 400 1.12rem/1.3 var(--font-display); }
.outcome { margin: 0; padding: 4px 9px; border-radius: 5px; background: var(--lavender-mist); color: var(--matcha-leaf); font-size: .84rem; font-weight: 700; }
.grimoire { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 10px; margin: 12px 0 0; padding: 0; list-style: none; }
.grimoire-seat { position: relative; isolation: isolate; display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 8px; align-items: center; min-height: 88px; overflow: hidden; padding: 10px; border: 1px solid var(--line); border-radius: 9px; background: var(--white-pure); color: var(--clay-text); box-shadow: var(--shadow-card); }
.grimoire-seat::after { position: absolute; z-index: -1; inset: 5px; border: 1px solid var(--line); border-radius: 5px; content: ''; pointer-events: none; }
.grimoire-seat.is-dead { background: var(--rose-dust); }
.character-art { display: block; width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 3px 8px rgba(44, 55, 40, .18)); }
.seat-copy { display: grid; gap: 4px; min-width: 0; }
.seat-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.seat-name { min-width: 0; color: var(--matcha-leaf); font: 400 1.05rem/1.2 var(--font-display); overflow-wrap: anywhere; }
.seat-character { min-width: 0; overflow-wrap: anywhere; color: var(--muted); font-size: .82rem; }
.death-mark { padding: 2px 5px; border: 1px solid var(--blush-petal); border-radius: 4px; background: var(--rose-dust); color: var(--clay-text); font-size: .65rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.art-credit { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 8px; margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--rule); color: var(--soft-ink); font-size: .72rem; }
.art-credit a { color: var(--wine); text-underline-offset: 3px; }
.art-credit a:focus-visible { outline: 2px solid var(--wine); outline-offset: 3px; }
.photo-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 8px; margin: 16px 0 0; }
.photo-reveal { margin-top: 12px; padding: 2px 12px; border: 1px solid var(--rule); border-radius: 8px; background: var(--surface-soft); }
.photo-reveal summary { position: relative; list-style: none; }
.photo-reveal summary::after { content: ''; position: absolute; right: 3px; top: 50%; width: 8px; height: 8px; border: solid var(--wine); border-width: 0 1.5px 1.5px 0; transform: translateY(-70%) rotate(45deg); }
.photo-reveal .photo-gallery { margin: 4px 0 12px; }
.photo-link { display: block; overflow: hidden; border-radius: 7px; background: var(--parchment); }
.photo-gallery img { display: block; width: 100%; max-height: 300px; object-fit: cover; background: var(--parchment); transition: transform .2s ease; }
.photo-link:hover img { transform: scale(1.025); }
.archive-button { min-height: 44px; padding: 7px 11px; border: 1px solid var(--line); border-radius: 6px; background: transparent; color: var(--wine); font: 700 .85rem var(--font-body); cursor: pointer; }

@media (min-width: 861px) {
  .recap-story { grid-template-columns: 105px minmax(0, 1fr); gap: 20px; }
}
@media (max-width: 950px) {
  .welcome-note { grid-template-columns: minmax(145px, .8fr) minmax(0, 2fr); }
  .welcome-link { grid-column: 2; }
}
@media (max-width: 760px) {
  .gathering-banner { min-height: 0; padding: 22px; }
  .gathering-banner::after { background: linear-gradient(90deg, var(--surface-soft), rgba(239, 238, 231, .8)); }
  .hero-art { width: min(100%, 420px); }
  .hero-actions { gap: 0 14px; }
  .stats { grid-template-columns: 1fr; text-align: center; gap: 2px; }
  .stat-row { grid-column: 1; grid-row: auto; margin-top: 10px; }
  .stat-row div:first-child { border: 0; }
  .has-cover .session-masthead { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .gathering-banner { padding: 18px; }
  .next-night { grid-template-columns: auto minmax(0, 1fr); gap: 11px; align-items: start; }
  .next-copy { min-width: 0; }
  .next-copy p:not(.eyebrow) { overflow-wrap: anywhere; }
  .calendar-mark { width: 50px; height: 58px; }
  .calendar-mark strong { font-size: 1.5rem; }
  .archive-filters label { flex: 1 1 112px; min-width: 0; }
  .welcome-note, .welcome-steps { grid-template-columns: minmax(0, 1fr); }
  .welcome-link { grid-column: 1; }
  .recap-prose { font-size: .96rem; }
  .photo-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .photo-gallery img { max-height: 180px; }
}
</style>
