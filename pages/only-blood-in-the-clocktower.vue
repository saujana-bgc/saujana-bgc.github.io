<template>
  <main class="clocktower-page">
    <header class="page-header">
      <img class="hero-art" src="/images/clocktower-night.svg" alt="" width="640" height="500" fetchpriority="high">
      <div class="hero-copy">
        <h1>Only Blood <em>in the Clocktower</em></h1>
        <p class="intro">Blood on the Clocktower is a social game of hidden roles. Talk, share clues and vote to find the Demon. New players are welcome; we’ll explain as you play.</p>
        <div class="hero-links">
          <a class="hero-primary" :href="nextCtaHref">
            {{ nextGathering ? (nextGathering.signup_url ? 'Save your place' : 'See gathering details') : 'See all gatherings' }}
            <span aria-hidden="true">↗</span>
          </a>
          <a class="hero-secondary" :href="heroSecondaryHref">
            {{ heroSecondaryLabel }} <span aria-hidden="true">↓</span>
          </a>
        </div>
        <a v-if="nextGathering && pastSessions.length" class="hero-tertiary" href="#clocktower-archive">Browse past games <span aria-hidden="true">↓</span></a>
      </div>
      <section id="next-gathering" class="next-night" aria-labelledby="next-night-title">
        <div class="calendar-mark" aria-hidden="true">
          <template v-if="nextGathering"><strong>{{ nextDateStamp.day }}</strong><span>{{ nextDateStamp.month }}</span></template>
          <svg v-else viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="22" height="21" rx="2"/><path d="M5 13h22M11 4v6m10-6v6m-5 6v8m-4-4h8"/></svg>
        </div>
        <div class="next-copy">
          <p class="eyebrow">The next gathering</p>
          <h2 id="next-night-title" aria-live="polite">{{ nextGathering ? formatDate(nextGathering.date) : eventLoading ? 'Checking the calendar…' : eventError ? 'Calendar unavailable' : 'No Clocktower date announced' }}</h2>
          <p v-if="nextGathering?.time || nextGathering?.venue"><template v-if="nextGathering?.time">{{ nextGathering.time }}</template><template v-if="nextGathering?.time && nextGathering?.venue"> · </template><template v-if="nextGathering?.venue">{{ nextGathering.venue }}</template></p>
          <p v-if="nextGathering?.first_timer_note">{{ nextGathering.first_timer_note }}</p>
          <p v-else-if="eventError">We couldn’t load the schedule just now.</p>
          <p v-else-if="eventLoading">Upcoming dates will appear here.</p>
          <UButton v-if="eventError" class="retry-button" type="button" @click="loadCommunityEvents">Try again</UButton>
        </div>
        <a v-if="nextGathering" class="calendar-link" :href="nextCtaHref">{{ nextGathering.signup_url ? 'Save your place' : 'See gathering details' }} <span aria-hidden="true">↗</span></a>
        <a v-else-if="!eventLoading" class="calendar-link" href="/gatherings/">See all gatherings <span aria-hidden="true">↗</span></a>
      </section>
      <span class="hero-caption" aria-hidden="true">Ravenswood Bluff <span>✦</span> After dark</span>
    </header>

    <section id="what-to-expect" class="welcome-note" aria-labelledby="welcome-title">
      <div class="welcome-body">
        <p class="eyebrow">New to the game?</p>
        <h2 id="welcome-title">Your first game</h2>
        <ul class="welcome-steps">
          <li><strong>Before you arrive</strong><span>Check the gathering’s time, venue and any event-specific costs. Follow its signup details; mark yourself tentative if you’re still deciding.</span></li>
          <li><strong>When you arrive</strong><span>Come solo or bring a friend. The host will help you find a seat and explain what you need as you play.</span></li>
        </ul>
        <a class="welcome-link" href="https://bloodontheclocktower.com/pages/how-to-play" target="_blank" rel="noopener noreferrer">Optional: read the official guide <span aria-hidden="true">↗</span></a>
      </div>
    </section>

    <section id="clocktower-archive" class="archive" aria-labelledby="archive-title">
      <header class="archive-heading">
        <p class="eyebrow">Past gatherings</p>
        <h2 id="archive-title">The story so far</h2>
        <p v-if="pastSessions.length" class="metadata">Game results and retellings stay tucked away until you reveal them.</p>
      </header>
      <div v-if="!loading && !error && pastSessions.length && (archiveYears.length > 1 || archiveScripts.length > 1)" class="archive-filters" aria-label="Filter past gatherings">
        <label v-if="archiveYears.length > 1">Year<USelect class="archive-select" v-model="selectedYear" :items="[{ label: 'All years', value: 'all' }, ...archiveYears.map(year => ({ label: String(year), value: String(year) }))]" /></label>
        <label v-if="archiveScripts.length > 1">Script<USelect class="archive-select" v-model="selectedScript" :items="[{ label: 'All scripts', value: 'all' }, ...archiveScripts.map(script => ({ label: script, value: script }))]" /></label>
        <UButton v-if="selectedYear !== 'all' || selectedScript !== 'all'" class="share-button" type="button" @click="clearArchiveFilters">Clear filters</UButton>
      </div>
      <p v-if="!loading && !error && pastSessions.length" class="filter-count" role="status">Showing {{ filteredSessions.length }} of {{ pastSessions.length }} gatherings</p>
      <p v-if="error" class="archive-state" role="alert">{{ error }} <UButton class="share-button" type="button" @click="loadArchive">Try again</UButton></p>
      <p v-else-if="loading" class="archive-state" role="status">Opening the grimoire…</p>
      <div v-else-if="!pastSessions.length" class="archive-state empty-archive">
        <span class="empty-mark" aria-hidden="true">✧</span>
        <h3>No recaps yet</h3>
        <p>Mika’s retellings, game results and approved photos will appear here after a gathering.</p>
      </div>

      <p v-if="!loading && !error && pastSessions.length && !filteredSessions.length" class="archive-state" role="status">No gatherings match these filters. <UButton class="share-button" type="button" @click="clearArchiveFilters">Clear filters</UButton></p>
      <article v-for="session in filteredSessions" :id="'session-' + session.id" :key="session.id" class="session-card" :class="{ 'is-latest-session': session.id === featured?.id }">
        <p v-if="session.id === featured?.id" class="eyebrow latest-label">Latest gathering</p>
        <img v-if="session.id === featured?.id && coverPhoto(session)" class="session-cover" :src="photoUrls[coverPhoto(session).path]" :alt="'Approved table photo from ' + formatDate(session.session_date)" loading="lazy">
        <div class="session-heading">
          <div>
            <p class="eyebrow"><time :datetime="session.session_date">{{ formatDate(session.session_date) }}</time></p>
            <h3 tabindex="-1">{{ session.teaser || session.venue || 'Saujana gathering' }}</h3>
            <p class="metadata"><template v-if="session.teaser && session.venue">{{ session.venue }} · </template><template v-if="selectedScript !== 'all'">{{ visibleGames(session).length }} of {{ session.games?.length || 0 }} games</template><template v-else>{{ session.games?.length || 0 }} game{{ session.games?.length === 1 ? '' : 's' }}</template></p>
          </div>
          <UButton class="share-button" type="button" @click="shareSession(session)">Share</UButton>
        </div>
        <div v-if="shareNotices[session.id]" class="share-feedback" role="status">
          {{ shareNotices[session.id] }}
          <UButton v-if="shareLinks[session.id]" class="share-copy-link" type="button" @click="copyShareLink(session.id)">Copy link</UButton>
        </div>

        <details v-if="session.recap" class="recap-reveal">
          <summary>Reveal Mika’s retelling</summary>
          <p>{{ session.recap }}</p>
        </details>

        <div v-if="session.games?.length" class="game-grid">
          <details v-for="{ game, number } in visibleGames(session)" :id="game.id ? 'game-' + game.id : undefined" :key="game.id || number">
            <summary>
              <span class="game-label">Game {{ number }}</span>
              <span class="game-script">{{ game.script || 'Script not recorded' }}</span>
              <span class="game-reveal-label"><span class="when-closed">Reveal spoilers</span><span class="when-open">Hide spoilers</span></span>
            </summary>
            <p v-if="game.outcome" class="outcome">{{ game.outcome }}</p>
            <ol v-if="game.players?.length" class="grimoire" aria-label="Players and characters">
              <li v-for="(player, pIndex) in game.players" :key="pIndex" class="grimoire-seat" :class="{ 'is-dead': player.died }">
                <span class="seat-number" aria-hidden="true">{{ String(pIndex + 1).padStart(2, '0') }}</span>
                <span class="seat-name">{{ player.public_name || player.name || 'Seat ' + (pIndex + 1) }}</span>
                <span v-if="player.character" class="seat-character">{{ player.character }}</span>
                <span v-if="player.died" class="death-mark">Died</span>
              </li>
            </ol>
            <p v-if="game.notes" class="story-text">{{ game.notes }}</p>
            <UButton v-if="game.id" class="share-button" type="button" @click="shareGame(session, game)">Share game link</UButton>
            <div v-if="shareNotices[game.id]" class="share-feedback" role="status">
              {{ shareNotices[game.id] }}
              <UButton v-if="shareLinks[game.id]" class="share-copy-link" type="button" @click="copyShareLink(game.id)">Copy link</UButton>
            </div>
          </details>
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
    </section>

    <section v-if="!loading && !error && pastSessions.length" class="stats" aria-labelledby="stats-title">
      <p class="eyebrow">The tally</p>
      <h2 id="stats-title">Clocktower in numbers</h2>
      <div class="stat-row">
        <div><strong>{{ statistics.sessions }}</strong><span>gatherings</span></div>
        <div><strong>{{ statistics.games }}</strong><span>games played</span></div>
        <div><strong>{{ statistics.scripts }}</strong><span>scripts explored</span></div>
      </div>
    </section>
  </main>
</template>

<script setup>
const config = useRuntimeConfig()
const route = useRoute()
const sessions = ref([])
const photoUrls = ref({})
const shareNotices = ref({})
const shareLinks = ref({})
const selectedYear = ref('all')
const selectedScript = ref('all')
const loading = ref(true)
const error = ref('')
const eventLoading = ref(true)
const eventError = ref(false)
const communityEvents = ref([])
const headers = {
  apikey: config.public.supabaseKey,
  'Content-Type': 'application/json',
}
const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())
const pastSessions = computed(() => sessions.value.filter(session =>
  (session.session_date < localDate || (session.session_date === localDate && hasResults(session))) && (session.recap || session.games?.length),
))
const nextNight = computed(() => communityEvents.value
  .filter(event => /clocktower/i.test(event.name) && event.date >= localDate && !sessions.value.some(session =>
    session.session_date === event.date && session.games?.length && (!session.venue || !event.venue || session.venue.trim().toLowerCase() === event.venue.trim().toLowerCase()),
  ))
  .sort((a, b) => a.date.localeCompare(b.date))[0])
const nextSession = computed(() => sessions.value
  .filter(session => session.session_date >= localDate && !hasResults(session))
  .sort((a, b) => a.session_date.localeCompare(b.session_date))[0])
const nextGathering = computed(() => {
  const event = nextNight.value
  const session = nextSession.value
  if (event && session && event.date === session.session_date && (!event.venue || !session.venue || event.venue.trim().toLowerCase() === session.venue.trim().toLowerCase())) {
    return {
      date: event.date,
      time: event.time || session.session_time,
      venue: event.venue || session.venue,
      first_timer_note: session.first_timer_note,
      signup_url: session.signup_url,
      href: `/gatherings/#gathering-${event.id}`,
    }
  }
  if (event && (!session || event.date <= session.session_date)) {
    return { ...event, href: `/gatherings/#gathering-${event.id}` }
  }
  if (session) {
    return {
      date: session.session_date,
      time: session.session_time,
      venue: session.venue,
      first_timer_note: session.first_timer_note,
      signup_url: session.signup_url,
      href: session.signup_url || '/gatherings/',
    }
  }
  return null
})
const nextCtaHref = computed(() => nextGathering.value?.signup_url || nextGathering.value?.href || '/gatherings/')
const heroSecondaryHref = '#what-to-expect'
const heroSecondaryLabel = 'First time? Start here'
const featured = computed(() => [...pastSessions.value].sort((a, b) => b.session_date.localeCompare(a.session_date))[0])
const nextDateStamp = computed(() => {
  if (!nextGathering.value) return null
  const date = new Date(nextGathering.value.date + 'T12:00:00')
  return {
    day: date.toLocaleDateString('en-MY', { day: 'numeric' }),
    month: date.toLocaleDateString('en-MY', { month: 'short' }),
  }
})
const archiveYears = computed(() => [...new Set(pastSessions.value.map(session => session.session_date?.slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a)))
const archiveScripts = computed(() => [...new Set(pastSessions.value.flatMap(session => session.games || []).map(game => game.script).filter(Boolean))].sort((a, b) => a.localeCompare(b)))
const filteredSessions = computed(() => pastSessions.value.filter(session =>
  (selectedYear.value === 'all' || session.session_date?.startsWith(selectedYear.value)) &&
  (selectedScript.value === 'all' || session.games?.some(game => game.script === selectedScript.value)),
))
const statistics = computed(() => ({
  sessions: pastSessions.value.length,
  games: pastSessions.value.reduce((total, session) => total + (session.games?.length || 0), 0),
  scripts: new Set(pastSessions.value.flatMap(session => session.games || []).map(game => game.script).filter(Boolean)).size,
}))

function formatDate(value) {
  return value
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
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

function visibleGames(session) {
  return (session.games || [])
    .map((game, index) => ({ game, number: index + 1 }))
    .filter(({ game }) => selectedScript.value === 'all' || game.script === selectedScript.value)
}

function clearArchiveFilters() {
  selectedYear.value = 'all'
  selectedScript.value = 'all'
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
    const sharedGameId = route.query.game
    const sharedId = route.query.session
    if (typeof sharedGameId === 'string') {
      const sharedSession = typeof sharedId === 'string' ? document.getElementById('session-' + sharedId) : null
      const target = sharedSession
        ? [...sharedSession.querySelectorAll('.game-grid details')].find(game => game.id === 'game-' + sharedGameId)
        : document.getElementById('game-' + sharedGameId)
      if (target) {
        target.scrollIntoView({ block: 'start' })
        target.querySelector('summary')?.focus({ preventScroll: true })
        return
      }
      const fallback = typeof sharedId === 'string' ? document.getElementById('session-' + sharedId) : null
      if (fallback) {
        fallback.scrollIntoView({ block: 'start' })
        fallback.querySelector('h3')?.focus({ preventScroll: true })
        return
      }
      error.value = 'This shared gathering or game is no longer available. Browse other gatherings below.'
      await nextTick()
      document.querySelector('.archive-state[role="alert"]')?.scrollIntoView({ block: 'center' })
      document.querySelector('.archive-state[role="alert"]')?.setAttribute('tabindex', '-1')
      document.querySelector('.archive-state[role="alert"]')?.focus({ preventScroll: true })
      return
    }
    if (typeof sharedId === 'string') {
      const target = document.getElementById('session-' + sharedId)
      if (target) {
        target.scrollIntoView({ block: 'start' })
        target.querySelector('h3')?.focus({ preventScroll: true })
      } else {
        error.value = 'This shared gathering is no longer available. Browse other gatherings below.'
      }
    }
  } catch {
    error.value = 'We couldn’t load the session archive. Please try again.'
  } finally {
    loading.value = false
  }
}

async function loadCommunityEvents() {
  eventLoading.value = true
  eventError.value = false
  try {
    const { data, error: loadError } = await useSupabase()
      .from('events')
      .select('id,name,date,time,venue')
      .gte('date', localDate)
      .order('date', { ascending: true })
    if (loadError) throw loadError
    communityEvents.value = data ?? []
  } catch {
    eventError.value = true
  } finally {
    eventLoading.value = false
  }
}

async function shareSession(session) {
  const link = new URL('/only-blood-in-the-clocktower/', window.location.origin)
  link.searchParams.set('session', session.id)
  const nativeShare = Boolean(navigator.share)
  try {
    if (nativeShare) await navigator.share({ title: 'Only Blood in the Clocktower', url: link.toString() })
    else await navigator.clipboard.writeText(link.toString())
    shareNotices.value = { ...shareNotices.value, [session.id]: nativeShare ? 'Recap shared.' : 'Recap link copied.' }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    showShareFallback(session.id, link)
  }
}

async function shareGame(session, game) {
  const link = new URL('/only-blood-in-the-clocktower/', window.location.origin)
  link.searchParams.set('session', session.id)
  link.searchParams.set('game', game.id)
  const nativeShare = Boolean(navigator.share)
  try {
    if (nativeShare) await navigator.share({ title: 'Blood on the Clocktower · ' + game.script, url: link.toString() })
    else await navigator.clipboard.writeText(link.toString())
    shareNotices.value = { ...shareNotices.value, [game.id]: nativeShare ? 'Game link shared.' : 'Game link copied.' }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    showShareFallback(game.id, link)
  }
}

function showShareFallback(id, link) {
  shareLinks.value = { ...shareLinks.value, [id]: link.toString() }
  shareNotices.value = { ...shareNotices.value, [id]: 'Sharing didn’t work. Copy the link instead.' }
}

async function copyShareLink(id) {
  try {
    await navigator.clipboard.writeText(shareLinks.value[id])
    shareLinks.value = { ...shareLinks.value, [id]: '' }
    shareNotices.value = { ...shareNotices.value, [id]: 'Link copied.' }
  } catch {
    shareNotices.value = { ...shareNotices.value, [id]: 'Couldn’t copy the link. Check your browser’s clipboard permissions.' }
  }
}

onMounted(() => {
  loadArchive()
  loadCommunityEvents()
})
</script>

<style scoped>
.clocktower-page {
  --ink: #35282b;
  --night: #21171d;
  --wine: var(--saujana-clocktower-accent);
  --paper: #fffcf6;
  --parchment: #f3ebdd;
  --gold: #e6be85;
  --soft-ink: #6b5755;
  --rule: #e3d6c6;
  --panel-pad: clamp(20px, 4vw, 38px);
  width: min(1120px, 94%);
  margin: auto;
  padding: clamp(18px, 3vw, 34px) 0 64px;
  color: var(--ink);
}
.clocktower-page > .page-header {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(320px, .92fr);
  grid-template-areas: "copy date";
  align-items: center;
  overflow: hidden;
  min-height: 430px;
  gap: clamp(20px, 3vw, 44px);
  padding: clamp(34px, 4.5vw, 56px);
  text-align: left;
  border-radius: 16px;
  background: radial-gradient(ellipse at 77% 44%, #533132, var(--night) 74%);
  color: #fff5e6;
  box-shadow: 0 16px 36px #34212523;
}
.page-header::before {
  content: '';
  position: absolute;
  z-index: 1;
  inset: 9px;
  border: 1px solid #e6be854d;
  border-radius: 10px;
  pointer-events: none;
}
.page-header::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(90deg, var(--night) 12%, #21171deb 31%, #21171d91 52%, transparent 73%);
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
.hero-copy { grid-area: copy; max-width: 620px; z-index: 1; }
.hero-caption {
  position: absolute;
  right: 26px;
  bottom: 20px;
  padding: 4px 8px;
  border-radius: 3px;
  background: #21171de0;
  color: #f1d8b6;
  font-size: .65rem;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.hero-caption span { margin-inline: 5px; color: var(--gold); }
.eyebrow {
  margin: 0;
  color: var(--wine);
  font-size: .72rem;
  font-weight: 750;
  letter-spacing: .15em;
  line-height: 1.5;
  text-transform: uppercase;
}
.page-header h1 {
  margin: 0 0 18px;
  font: 400 clamp(2.7rem, 6.25vw, 5rem)/1.02 var(--font-display);
  letter-spacing: -.055em;
}
.page-header h1 em { display: block; color: #efd0a4; }
.intro { max-width: 37ch; margin: 0; color: #e1d0c8; font-size: clamp(.97rem, 1.6vw, 1.1rem); }
.hero-links { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; margin-top: 26px; }
.hero-primary, .hero-secondary {
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
.hero-primary { padding: 10px 16px; border-radius: 6px; }
.hero-primary { background: var(--gold); color: var(--night); }
.hero-primary:hover { background: #f0d1a4; }
.hero-date { font-size: .78em; font-weight: 650; }
.hero-secondary { color: #f2e3da; }
.hero-secondary:hover { text-decoration: underline; text-underline-offset: 4px; }
.hero-tertiary { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; margin-top: 9px; color: #e1d0c8; font-size: .82rem; text-underline-offset: 4px; }
.hero-tertiary:hover { color: #fff5e6; }
.clocktower-page :is(a, button, summary, select):focus-visible { outline: 2px solid var(--wine); outline-offset: 3px; }
.page-header a:focus-visible { outline-color: var(--gold); }

.next-night, .session-card, .archive-state {
  border: 1px solid var(--rule);
  border-radius: 12px;
  background: var(--paper);
}
.next-night {
  grid-area: date;
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 12px 16px;
  margin: 0;
  padding: clamp(16px, 2.2vw, 24px);
  border-top: 2px solid #af8053;
  background: #fffcf6f5;
  box-shadow: 0 12px 30px #120d1226;
  z-index: 1;
}
.next-night .calendar-link { grid-column: 2; justify-self: start; min-height: 46px; padding: 0 14px; border-radius: 6px; background: var(--wine); color: #fffaf5; white-space: normal; }
.calendar-mark, .empty-mark {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 1px solid #d8c4af;
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
.calendar-link { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: var(--wine); font-size: .84rem; font-weight: 700; text-decoration: none; white-space: nowrap; }
.calendar-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.retry-button { justify-self: start; min-height: 40px; margin-top: 8px; padding: 7px 11px; border: 1px solid #b99577; border-radius: 6px; background: transparent; color: var(--wine); font: inherit; font-size: .85rem; font-weight: 700; cursor: pointer; }
.retry-button:focus-visible { outline: 2px solid var(--wine); outline-offset: 2px; }
.welcome-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px 32px;
  margin: 0 0 clamp(30px, 4.7vw, 54px);
  padding: clamp(19px, 3vw, 28px) 0;
  border-block: 1px solid #dfd0be;
  background: transparent;
}
.welcome-note > div { max-width: 68ch; }
.welcome-note h2 { margin: 4px 0 6px; color: var(--ink); font: 400 clamp(1.45rem, 3vw, 2rem)/1.15 var(--font-display); letter-spacing: -.025em; }
.welcome-steps { display: grid; gap: 11px; margin: 12px 0 14px; padding: 0; list-style: none; }
.welcome-steps li { display: grid; gap: 2px; color: var(--soft-ink); font-size: .9rem; line-height: 1.5; }
.welcome-steps strong { color: var(--ink); }
.welcome-link { display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: 0 0 auto; min-height: 44px; padding: 9px 13px; border: 1px solid #b99577; border-radius: 6px; color: var(--wine); font-size: .86rem; font-weight: 700; text-decoration: none; }
.welcome-link:hover { background: #fffaf2; }

.metadata { margin: 4px 0 0; color: var(--soft-ink); font-size: .92rem; overflow-wrap: anywhere; }
.filter-count { margin: 12px 0; color: var(--soft-ink); font-size: .84rem; }
.session-card h3 { overflow-wrap: anywhere; }
.script-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; padding: 0; list-style: none; }
.script-tags li { padding: 4px 9px; border: 1px solid var(--rule); border-radius: 5px; color: var(--wine); font-size: .75rem; overflow-wrap: anywhere; }
.recap-reveal { margin-top: 14px; padding-inline: 12px; border: 1px solid var(--rule); border-radius: 7px; background: #f5ece5; }
.recap-reveal summary { color: var(--wine); font-size: .9rem; }
.recap-reveal p, .story-text { max-width: 68ch; white-space: pre-wrap; overflow-wrap: anywhere; }
.recap-reveal p { margin: 6px 0 12px; }

.stats {
  display: grid;
  grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 0 16px;
  margin: 0 0 clamp(32px, 5vw, 62px);
  padding: 18px var(--panel-pad);
  border: 1px solid #e6be8538;
  border-radius: 10px;
  background: #33232b;
}
.stats .eyebrow { grid-column: 1; align-self: end; color: var(--gold); }
.stats h2 { grid-column: 1; align-self: start; color: #fff5e6; font-size: clamp(1.4rem, 3vw, 1.9rem); }
.stat-row { grid-column: 2; grid-row: 1 / 3; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); text-align: center; }
.stat-row div { display: grid; gap: 4px; padding: 4px 6px; border-left: 1px solid #e6be8540; }
.stat-row strong { color: #f2d6ad; font: 400 clamp(1.65rem, 4vw, 2.55rem)/1 var(--font-display); }
.stat-row span { color: #e5d4c6; font-size: .81rem; line-height: 1.3; }

.clocktower-page .archive-heading { margin-bottom: 18px; padding: 0; text-align: left; }
.archive-state, .session-card { padding: var(--panel-pad); }
.archive-filters { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; margin: 0 0 14px; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 9px; background: var(--parchment); }
.archive-filters label { display: grid; gap: 4px; min-width: min(100%, 190px); color: var(--soft-ink); font-size: .76rem; font-weight: 700; }
.archive-filters select { min-height: 42px; padding: 7px 32px 7px 10px; border: 1px solid #d3bdb1; border-radius: 6px; background: var(--paper); color: var(--ink); font: inherit; }
.archive-state { margin: 0; color: var(--soft-ink); }
.empty-archive { text-align: center; background: linear-gradient(var(--paper), #f7efe3); }
.empty-mark { margin: 0 auto 12px; font-size: 1.7rem; }
.empty-archive h3, .session-card h3 { margin: 0; color: var(--ink); font: 400 clamp(1.25rem, 3vw, 1.75rem)/1.2 var(--font-display); }
.empty-archive p { max-width: 42ch; margin: 8px auto 0; }
.session-card { margin: 0 0 14px; border-inline-start: 3px solid #b28869; box-shadow: 0 6px 20px #35282b08; }
.session-card.is-latest-session { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); column-gap: clamp(18px, 3vw, 34px); border-inline-start-color: var(--wine); background: linear-gradient(110deg, #f8eee6, var(--paper) 70%); box-shadow: 0 9px 26px #34212512; }
.latest-label { margin-bottom: 5px; }
.is-latest-session > .latest-label { grid-column: 1 / -1; }
.session-cover { display: block; width: 100%; max-height: 320px; margin: 0 0 14px; aspect-ratio: 16 / 7; border-radius: 7px; background: var(--parchment); object-fit: cover; }
.is-latest-session > .session-cover { grid-column: 2; grid-row: 2 / span 4; height: 100%; max-height: 360px; margin: 0; aspect-ratio: 4 / 3; }
.session-card h3 { margin-top: 3px; }
.session-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 18px; }
.session-heading > div { flex: 1 1 110px; min-width: 0; }
.is-latest-session > .session-heading { grid-column: 1; align-items: flex-start; }
.is-latest-session > .share-feedback,
.is-latest-session > .recap-reveal,
.is-latest-session > .game-grid,
.is-latest-session > .photo-reveal { grid-column: 1 / -1; }
.game-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 10px; margin-top: 14px; align-items: start; }
.game-grid details { min-width: 0; padding: 2px 14px; border: 1px solid var(--rule); border-radius: 8px; background: #f8f1e8; }
.game-grid details[open] { grid-column: 1 / -1; padding-bottom: 10px; border-color: #cdb3a4; }
.clocktower-page summary { min-height: 44px; padding: 9px 25px 7px 0; cursor: pointer; font-weight: 700; overflow-wrap: anywhere; }
.game-grid summary { display: grid; gap: 2px; padding-block: 11px; }
.game-grid summary, .recap-reveal summary { position: relative; list-style: none; }
.clocktower-page summary::-webkit-details-marker { display: none; }
.game-grid summary::after, .recap-reveal summary::after { content: ''; position: absolute; right: 3px; top: 50%; width: 8px; height: 8px; border: solid var(--wine); border-width: 0 1.5px 1.5px 0; transform: translateY(-70%) rotate(45deg); }
.recap-reveal summary { display: flex; align-items: center; }
.clocktower-page details[open] > summary::after { transform: translateY(-25%) rotate(225deg); }
.game-label { color: var(--wine); font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; }
.game-script { font: 400 1.12rem/1.3 var(--font-display); }
.game-reveal-label { color: var(--soft-ink); font-size: .73rem; font-weight: 600; }
.when-open, details[open] > summary .when-closed { display: none; }
details[open] > summary .when-open { display: inline; }
.outcome { display: inline-block; margin: 7px 0 0; padding: 4px 9px; border-radius: 5px; background: #eee0d5; color: #63323d; font-weight: 700; }
.grimoire { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); gap: 7px; margin: 12px 0; padding: 0; list-style: none; }
.grimoire-seat { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; gap: 3px 8px; align-items: center; min-height: 56px; padding: 8px 10px; border: 1px solid var(--rule); border-radius: 7px; background: var(--paper); }
.seat-number { grid-row: span 2; display: grid; place-items: center; width: 26px; height: 26px; border: 1px solid #d8c4af; border-radius: 50%; color: var(--wine); font-size: .66rem; font-weight: 750; }
.seat-name { min-width: 0; overflow-wrap: anywhere; font-weight: 700; }
.seat-character { grid-column: 2; color: var(--soft-ink); font-size: .8rem; overflow-wrap: anywhere; }
.death-mark { grid-column: 3; grid-row: 1 / 3; padding: 3px 6px; border: 1px solid #743c4640; border-radius: 4px; color: var(--wine); font-size: .68rem; font-weight: 750; text-transform: uppercase; }
.grimoire-seat.is-dead { background: #f1e7e2; }
.photo-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 8px; margin: 16px 0 0; }
.photo-reveal { margin-top: 12px; padding: 2px 12px; border: 1px solid var(--rule); border-radius: 8px; background: #f8f1e8; }
.photo-reveal summary { position: relative; list-style: none; }
.photo-reveal summary::after { content: ''; position: absolute; right: 3px; top: 50%; width: 8px; height: 8px; border: solid var(--wine); border-width: 0 1.5px 1.5px 0; transform: translateY(-70%) rotate(45deg); }
.photo-reveal .photo-gallery { margin: 4px 0 12px; }
.photo-link { display: block; overflow: hidden; border-radius: 7px; background: var(--parchment); }
.photo-gallery img { display: block; width: 100%; max-height: 300px; object-fit: cover; background: var(--parchment); transition: transform .2s ease; }
.photo-link:hover img { transform: scale(1.025); }
.share-button { min-height: 44px; padding: 7px 11px; border: 1px solid #d3bdb1; border-radius: 6px; background: transparent; color: var(--wine); font: 700 .85rem var(--font-body); cursor: pointer; }
.share-button:hover { background: #743c460a; border-color: var(--wine); }
.game-grid .share-button { margin-top: 7px; }
.share-feedback { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin: 8px 0 0; color: var(--soft-ink); overflow-wrap: anywhere; font-size: .85rem; }
.share-copy-link { min-height: 36px; padding: 5px 9px; border: 1px solid #d3bdb1; border-radius: 5px; background: transparent; color: var(--wine); font: 700 .8rem var(--font-body); cursor: pointer; }
.next-night, .archive, .session-card, .game-grid details { scroll-margin-top: 86px; }

@media (max-width: 760px) {
  .clocktower-page > .page-header { grid-template-columns: minmax(0, 1fr); grid-template-areas: "copy" "date"; gap: 22px; min-height: 0; padding: 28px 22px 26px; }
  .page-header::after { background: linear-gradient(180deg, var(--night) 14%, #21171def 42%, #21171db8 75%, #21171d30 100%); }
  .hero-art { inset: 105px 0 auto auto; z-index: 0; width: min(82%, 370px); height: 320px; max-height: none; object-fit: cover; object-position: right center; opacity: .42; }
  .hero-caption { display: none; }
  .next-night { margin: 0; }
  .page-header h1 { font-size: clamp(2.2rem, 8.9vw, 4rem); }
  .hero-links { margin-top: 18px; gap: 6px 10px; }
  .hero-primary, .hero-secondary { font-size: .8rem; }
  .hero-primary { padding-inline: 10px; }
  .stats { grid-template-columns: 1fr; text-align: center; gap: 2px; }
  .stat-row { grid-column: 1; grid-row: auto; margin-top: 10px; }
  .stat-row div:first-child { border: 0; }
}
@media (max-width: 560px) {
  .clocktower-page > .page-header { padding: 22px 18px; gap: 18px; }
  .page-header h1 { font-size: clamp(2rem, 8.2vw, 3rem); }
  .intro { max-width: 31ch; font-size: .91rem; line-height: 1.5; }
  .hero-links { margin-top: 12px; }
  .hero-secondary { font-size: .76rem; }
  .next-night { grid-template-columns: auto minmax(0, 1fr); gap: 11px; align-items: start; }
  .next-copy { min-width: 0; }
  .next-copy p:not(.eyebrow) { overflow-wrap: anywhere; }
  .calendar-mark { width: 50px; height: 58px; }
  .calendar-mark strong { font-size: 1.5rem; }
  .archive-filters label { flex: 1 1 112px; min-width: 0; }
  .welcome-note { align-items: flex-start; flex-direction: column; gap: 13px; }
  .next-night .calendar-link { grid-column: 2; }
  .session-heading { align-items: flex-start; }
  .session-heading > div { flex-basis: 180px; }
  .session-heading .share-button { flex: 0 0 auto; }
  .photo-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .photo-gallery img { max-height: 180px; }
}
@media (max-width: 760px) {
  .session-card.is-latest-session { grid-template-columns: minmax(0, 1fr); row-gap: 0; }
  .is-latest-session > .session-cover { grid-column: 1; grid-row: auto; height: auto; max-height: 260px; margin: 0 0 12px; aspect-ratio: 16 / 9; }
  .is-latest-session > .session-heading { grid-column: 1; grid-row: auto; display: block; }
  .is-latest-session > .latest-label,
  .is-latest-session > .share-feedback,
  .is-latest-session > .recap-reveal,
  .is-latest-session > .game-grid,
  .is-latest-session > .photo-reveal { grid-column: 1; }
  .is-latest-session > .session-heading .share-button { margin-top: 8px; }
}
</style>
