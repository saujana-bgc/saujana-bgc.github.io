<template>
  <main class="clocktower-page">
    <header class="page-intro">
      <p class="page-eyebrow">Saujana’s Clocktower event series</p>
      <h1 class="hero-title">Only Blood in the Clocktower</h1>
      <p class="stats-container">Two players tell different stories about last night. Who do you trust? At Saujana’s Only Blood in the Clocktower gatherings, we play Blood on the Clocktower, a social mystery game with secret roles. Share clues and vote to find the Demon. You can watch first, and the Storyteller will guide you.</p>
      <a class="activity-primary" href="#next-gathering">See the next gathering <span aria-hidden="true">→</span></a>
    </header>

    <section id="what-to-expect" class="welcome-note" aria-labelledby="welcome-title">
      <ActivityOverviewFeature
        src="/images/site/overview-mika-clocktower.webp"
        alt="Mika, Nick, Jac and Tom compare stories over a Clocktower town-square mat."
      >
        <p class="page-eyebrow">Your first game</p>
        <h2 id="welcome-title">A mystery you solve together.</h2>
        <ul class="welcome-steps">
          <li><strong>At night, get clues</strong><span>Some players close their eyes while the Storyteller wakes others to share information or use an ability.</span></li>
          <li><strong>By day, compare stories</strong><span>Talk with the group, share what you learned and vote on who might be the Demon.</span></li>
          <li><strong>The Storyteller can help</strong><span>They run the game, explain your role and answer questions privately during play.</span></li>
          <li><strong>Being out doesn’t end your game</strong><span>If your character dies, you can still talk and help your team. You keep one final vote for later.</span></li>
        </ul>
        <p class="welcome-joining">You can come on your own or with a friend. Tell the host you’re new; they’ll help you decide whether to watch or play.</p>
        <a class="welcome-link" href="https://bloodontheclocktower.com/pages/how-to-play" target="_blank" rel="noopener noreferrer">Official how-to-play guide <span aria-hidden="true">↗</span></a>
      </ActivityOverviewFeature>
    </section>

    <div class="gathering-banner">
      <section id="next-gathering" class="next-night" aria-labelledby="next-night-title">
        <div class="calendar-mark" aria-hidden="true">
          <template v-if="nextGathering"><strong>{{ nextDateStamp.day }}</strong><span>{{ nextDateStamp.month }}</span></template>
          <svg v-else viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="22" height="21" rx="2"/><path d="M5 13h22M11 4v6m10-6v6m-5 6v8m-4-4h8"/></svg>
        </div>
        <div class="next-copy">
          <p class="eyebrow">Next Only Blood in the Clocktower gathering</p>
          <h2 id="next-night-title" aria-live="polite">{{ nextGathering ? formatDate(nextGathering.date) : eventLoading ? 'Checking the calendar…' : eventError ? 'Calendar unavailable' : 'No Clocktower date announced' }}</h2>
          <p v-if="nextGathering?.time">{{ nextGathering.time }}</p>
          <p v-if="nextGathering?.venue">{{ nextGathering.venue }} <a v-if="nextGathering.venue_url" :href="nextGathering.venue_url" target="_blank" rel="noopener noreferrer">Directions ↗</a></p>
          <p v-if="nextGathering?.first_timer_note">{{ nextGathering.first_timer_note }}</p>
          <p v-else-if="eventError">We couldn’t load the schedule just now.</p>
          <p v-else-if="eventLoading">Upcoming dates will appear here.</p>
          <UButton v-if="eventError" class="retry-button" type="button" @click="loadCommunityEvents">Try again</UButton>
        </div>
        <a v-if="nextGathering" class="calendar-link" :href="nextCtaHref">{{ nextCtaLabel }} <span aria-hidden="true">↗</span></a>
        <template v-else-if="!eventLoading">
          <a class="calendar-link" href="https://wa.me/saujanabgc" target="_blank" rel="noopener noreferrer">Ask about the next gathering <span aria-hidden="true">↗</span></a>
          <NuxtLink class="calendar-link" to="/gatherings/" no-prefetch>See all gatherings <span aria-hidden="true">↗</span></NuxtLink>
        </template>
      </section>
      <nav class="hero-actions" aria-label="Clocktower page links">
        <NuxtLink class="hero-tertiary" to="/only-blood-in-the-clocktower/recaps/" no-prefetch>Browse Clocktower recaps <span aria-hidden="true">→</span></NuxtLink>
      </nav>
    </div>

    <footer class="art-credit">
      <span>Blood on the Clocktower is published by <a href="https://bloodontheclocktower.com/" target="_blank" rel="noopener noreferrer">The Pandemonium Institute</a>.</span>
      <a href="https://github.com/tomozbot/botc-icons" target="_blank" rel="noopener noreferrer">Character icon credits <span aria-hidden="true">↗</span></a>
    </footer>
  </main>
</template>

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
// The archive endpoint already filters to published sessions.
const recapSessions = computed(() => sessions.value.filter(hasResults).sort((a, b) => String(b.session_date || '').localeCompare(String(a.session_date || ''))))
const nextNight = computed(() => communityEvents.value
  .filter(event => /clocktower/i.test(event.name) && (
    event.date > localDate || (event.date === localDate && !recapSessions.value.some(session =>
      session.session_date === event.date && (!session.venue || !event.venue || session.venue.trim().toLowerCase() === event.venue.trim().toLowerCase()),
    ))
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
      venue_url: event.venue_url,
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
const nextCtaLabel = computed(() => {
  if (nextGathering.value?.signup_url) return 'See details and sign up'
  return nextGathering.value?.href?.endsWith('/') ? 'See all gatherings' : 'See gathering details'
})
const featured = computed(() => [...recapSessions.value].sort((a, b) => b.session_date.localeCompare(a.session_date))[0])
const nextDateStamp = computed(() => {
  if (!nextGathering.value) return null
  const date = new Date(nextGathering.value.date + 'T12:00:00')
  return {
    day: date.toLocaleDateString('en-MY', { day: 'numeric' }),
    month: date.toLocaleDateString('en-MY', { month: 'short' }),
  }
})
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
  const sharedGameId = route.query.game
  const sharedSessionId = route.query.session
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

async function loadCommunityEvents() {
  eventLoading.value = true
  eventError.value = false
  try {
    const { data, error: loadError } = await useSupabase()
      .from('events')
      .select('id,name,date,time,venue,venue_url')
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

onMounted(() => {
  loadArchive()
  loadCommunityEvents()
  const hasLegacyRecapHash = route.hash.startsWith('#clocktower-archive') || route.hash.startsWith('#session-') || route.hash.startsWith('#game-')
  const hasLegacyRecapQuery = typeof route.query.game === 'string' || typeof route.query.session === 'string'
  if (hasLegacyRecapHash || hasLegacyRecapQuery) {
    useRouter().replace({
      path: '/only-blood-in-the-clocktower/recaps/',
      query: route.query,
      hash: route.hash,
    })
  }
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
  --panel-pad: clamp(15px, 2.6vw, 34px);
  width: min(1320px, calc(100% - clamp(28px, 6vw, 88px)));
  margin-inline: auto;
  padding-bottom: 24px;
  color: var(--ink);
}
.clocktower-page .page-intro { max-width: 960px; margin-inline: auto; padding-inline: 0; }
.clocktower-page .stats-container { max-width: 580px; }
.activity-primary { display: inline-flex; min-height: 48px; align-items: center; gap: 18px; margin: 22px auto 0; padding: 0 22px; border-radius: 6px; background: var(--wine); color: #fffaf5; font-weight: 700; text-decoration: none; }
.activity-primary:hover { background: #5b303a; }
.activity-primary:focus-visible { outline: 2px solid var(--wine); outline-offset: 3px; }
.gathering-banner {
  position: relative;
  isolation: isolate;
  display: grid;
  max-width: 960px;
  margin-inline: auto;
  gap: 12px;
  margin-bottom: var(--space-5);
  padding: 0;
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
.hero-secondary { color: var(--wine); }
.hero-secondary:hover { text-decoration: underline; text-underline-offset: 4px; }
.hero-tertiary { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; color: var(--wine); font-size: .9rem; font-weight: 700; text-underline-offset: 4px; }
.hero-tertiary:hover { color: var(--ink); }
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
.next-copy a { color: var(--wine); text-underline-offset: 3px; }
.calendar-link { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: var(--wine); font-size: .84rem; font-weight: 700; text-decoration: none; white-space: nowrap; }
.calendar-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.retry-button { justify-self: start; min-height: 40px; margin-top: 8px; padding: 7px 11px; border: 1px solid #b99577; border-radius: 6px; background: transparent; color: var(--wine); font: inherit; font-size: .85rem; font-weight: 700; cursor: pointer; }
.retry-button:focus-visible { outline: 2px solid var(--wine); outline-offset: 2px; }
.welcome-note {
  max-width: 960px;
  margin: 0 auto clamp(26px, 4vw, 48px);
  padding: clamp(19px, 3vw, 28px) 0;
  border-block: 1px solid #dfd0be;
  background: transparent;
}
.welcome-note h2 { margin: 0 0 12px; color: var(--ink); font: 400 clamp(1.8rem, 4vw, 2.6rem)/1.2 var(--font-display); }
.welcome-steps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; margin: 0; padding: 0; list-style: none; }
.welcome-joining { margin: 14px 0 0; color: var(--soft-ink); font-size: .9rem; line-height: 1.5; }
.welcome-steps li { display: grid; gap: 2px; color: var(--soft-ink); font-size: .9rem; line-height: 1.5; }
.welcome-steps strong { color: var(--ink); }
.welcome-link { display: inline-flex; align-items: center; justify-self: start; align-self: center; gap: 8px; min-height: 44px; padding: 9px 13px; border: 1px solid #b99577; border-radius: 6px; color: var(--wine); font-size: .86rem; font-weight: 700; text-decoration: none; }
.welcome-link:hover { background: #fffaf2; }

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
.archive-filters select { min-height: 42px; padding: 7px 32px 7px 10px; border: 1px solid #d3bdb1; border-radius: 6px; background: var(--paper); color: var(--ink); font: inherit; }
.archive-state { margin: 0; color: var(--soft-ink); }
.empty-archive { text-align: center; background: linear-gradient(var(--paper), #f7efe3); }
.empty-mark { margin: 0 auto 12px; font-size: 1.7rem; }
.empty-archive h3, .session-card h3 { margin: 0; color: var(--ink); font: 400 clamp(1.25rem, 3vw, 1.75rem)/1.2 var(--font-display); }
.empty-archive p { max-width: 60ch; margin: 8px auto 0; }
.session-card { margin: 0 0 14px; border-inline-start: 3px solid #b28869; box-shadow: 0 6px 20px #35282b08; }
.session-card.is-latest-session { border-inline-start-color: var(--wine); background: linear-gradient(110deg, #f8eee6, var(--paper) 70%); box-shadow: 0 9px 26px #34212512; }
.session-masthead { display: grid; gap: 16px 28px; align-items: center; }
.has-cover .session-masthead { grid-template-columns: minmax(0, 1fr) minmax(240px, 34%); }
.session-kicker { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin: 0 0 6px; color: var(--soft-ink); font-size: .82rem; }
.latest-label { padding: 3px 8px; border-radius: 4px; background: #efe0d6; letter-spacing: .09em; }
.session-cover { display: block; width: 100%; max-height: 200px; aspect-ratio: 16 / 9; border-radius: 8px; background: var(--parchment); object-fit: cover; }
.game-grid { display: grid; gap: 12px; margin-top: 18px; }
.game-recap { min-width: 0; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 8px; background: #f8f1e8; }
.game-recap-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 16px; }
.game-title { display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.game-label { color: var(--wine); font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; }
.game-script { margin: 0; font: 400 1.12rem/1.3 var(--font-display); }
.outcome { margin: 0; padding: 4px 9px; border-radius: 5px; background: #eee0d5; color: #63323d; font-size: .84rem; font-weight: 700; }
.grimoire { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 10px; margin: 12px 0 0; padding: 0; list-style: none; }
.grimoire-seat { position: relative; isolation: isolate; display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 8px; align-items: center; min-height: 88px; overflow: hidden; padding: 10px; border: 1px solid #806274; border-radius: 9px; background: radial-gradient(ellipse at 42% 50%, #493141 0%, #291d29 68%); color: #fff5e9; box-shadow: inset 0 0 0 3px #e6be8512, 0 5px 16px #21171d20; }
.grimoire-seat::after { position: absolute; z-index: -1; inset: 5px; border: 1px solid #e6be8524; border-radius: 5px; content: ''; pointer-events: none; }
.grimoire-seat.is-dead { background: radial-gradient(ellipse at 42% 50%, #553039 0%, #301c25 70%); }
.character-art { display: block; width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 3px 8px #120b1690); }
.seat-copy { display: grid; gap: 4px; min-width: 0; }
.seat-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.seat-name { min-width: 0; color: #fff5e9; font: 400 1.05rem/1.2 var(--font-display); overflow-wrap: anywhere; }
.seat-character { min-width: 0; overflow-wrap: anywhere; color: #e9d7ca; font-size: .82rem; }
.death-mark { padding: 2px 5px; border: 1px solid #efa6a455; border-radius: 4px; background: #873e4b40; color: #ffd9c7; font-size: .65rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.art-credit { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 8px; margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--rule); color: var(--soft-ink); font-size: .72rem; }
.art-credit a { color: var(--wine); text-underline-offset: 3px; }
.art-credit a:focus-visible { outline: 2px solid var(--wine); outline-offset: 3px; }
.photo-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 8px; margin: 16px 0 0; }
.photo-reveal { margin-top: 12px; padding: 2px 12px; border: 1px solid var(--rule); border-radius: 8px; background: #f8f1e8; }
.photo-reveal summary { position: relative; list-style: none; }
.photo-reveal summary::after { content: ''; position: absolute; right: 3px; top: 50%; width: 8px; height: 8px; border: solid var(--wine); border-width: 0 1.5px 1.5px 0; transform: translateY(-70%) rotate(45deg); }
.photo-reveal .photo-gallery { margin: 4px 0 12px; }
.photo-link { display: block; overflow: hidden; border-radius: 7px; background: var(--parchment); }
.photo-gallery img { display: block; width: 100%; max-height: 300px; object-fit: cover; background: var(--parchment); transition: transform .2s ease; }
.photo-link:hover img { transform: scale(1.025); }
.archive-button { min-height: 44px; padding: 7px 11px; border: 1px solid #d3bdb1; border-radius: 6px; background: transparent; color: var(--wine); font: 700 .85rem var(--font-body); cursor: pointer; }

@media (min-width: 861px) {
  .recap-story { grid-template-columns: 105px minmax(0, 1fr); gap: 20px; }
}
@media (max-width: 760px) {
  .gathering-banner { min-height: 0; padding: 0; }
  .hero-actions { gap: 0 14px; }
  .stats { grid-template-columns: 1fr; text-align: center; gap: 2px; }
  .stat-row { grid-column: 1; grid-row: auto; margin-top: 10px; }
  .stat-row div:first-child { border: 0; }
  .has-cover .session-masthead { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .gathering-banner { padding: 0; }
  .next-night { grid-template-columns: auto minmax(0, 1fr); gap: 11px; align-items: start; }
  .next-copy { min-width: 0; }
  .next-copy p:not(.eyebrow) { overflow-wrap: anywhere; }
  .calendar-mark { width: 50px; height: 58px; }
  .calendar-mark strong { font-size: 1.5rem; }
  .archive-filters label { flex: 1 1 112px; min-width: 0; }
  .welcome-steps { grid-template-columns: minmax(0, 1fr); }
  .recap-prose { font-size: .96rem; }
  .photo-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .photo-gallery img { max-height: 180px; }
}
</style>
