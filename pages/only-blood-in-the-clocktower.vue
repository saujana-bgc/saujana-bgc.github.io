<template>
  <main class="clocktower-page">
    <header class="page-header">
      <img class="hero-art" src="/images/clocktower-night.svg" alt="" width="640" height="500" fetchpriority="high">
      <div class="hero-copy">
        <p class="eyebrow hero-kicker">Saujana · Ravenswood Bluff</p>
        <h1>Only Blood <em>in the Clocktower</em></h1>
        <p class="intro">Good games, impossible choices and the moment the town finds out.</p>
        <div class="hero-links">
          <a class="hero-primary" href="#next-gathering">Find the next game <span aria-hidden="true">↓</span></a>
          <a class="hero-secondary" href="#clocktower-archive">Browse the archive <span aria-hidden="true">↘</span></a>
        </div>
      </div>
    </header>

    <section id="next-gathering" class="next-night" aria-labelledby="next-night-title">
      <span class="calendar-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="22" height="21" rx="2"/><path d="M5 13h22M11 4v6m10-6v6m-5 6v8m-4-4h8"/></svg>
      </span>
      <div class="next-copy">
        <p class="eyebrow">The next gathering</p>
        <h2 id="next-night-title">{{ nextNight ? formatDate(nextNight.date) : nextSession ? formatDate(nextSession.session_date) : eventLoading ? 'Checking the calendar…' : eventError ? 'Calendar unavailable' : 'The town will meet again' }}</h2>
        <p v-if="nextNight?.time || nextNight?.venue || nextSession?.session_time || nextSession?.venue">
          <template v-if="nextNight?.time || nextSession?.session_time">{{ nextNight?.time || nextSession?.session_time }}</template>
          <template v-if="(nextNight?.time || nextSession?.session_time) && (nextNight?.venue || nextSession?.venue)"> · </template>
          <template v-if="nextNight?.venue || nextSession?.venue">{{ nextNight?.venue || nextSession?.venue }}</template>
        </p>
        <p>{{ nextSession?.first_timer_note || (eventError ? 'We couldn’t check the schedule just now. Please try again.' : 'New to Clocktower? Come along. We’ll walk you through your first game.') }}</p>
      </div>
      <a class="primary-link" :href="gatheringHref">
        {{ nextNight ? 'See gathering details ↗' : nextSession?.signup_url ? 'Save your place ↗' : 'See community gatherings ↗' }}
      </a>
    </section>

    <section v-if="featured" class="featured" :class="{ 'has-cover': cover(featured) }" aria-labelledby="featured-title">
      <figure v-if="cover(featured)" class="featured-photo">
        <img :src="photoUrls[cover(featured)]" alt="A moment from a Saujana Clocktower gathering" loading="lazy">
      </figure>
      <div class="featured-copy">
        <p class="eyebrow"><span aria-hidden="true">✦</span> From the storyteller’s desk</p>
        <h2 id="featured-title">{{ featured.teaser || 'The final reveal' }}</h2>
        <p class="metadata">{{ formatDate(featured.session_date) }}<template v-if="featured.venue"> · {{ featured.venue }}</template></p>
        <details v-if="featured.recap" class="recap-reveal" :open="isShared(featured)">
          <summary>Reveal Mika’s retelling</summary>
          <p>{{ featured.recap }}</p>
        </details>
        <a v-else class="text-link" :href="'#session-' + featured.id">View gathering <span aria-hidden="true">↓</span></a>
        <button v-if="featured.recap" class="share-button" type="button" @click="shareSession(featured)">Copy recap link</button>
        <p v-if="shareNotices[featured.id]" role="status" class="share-feedback">{{ shareNotices[featured.id] }}</p>
      </div>
    </section>

    <section v-if="!loading && !error && pastSessions.length" class="stats" aria-labelledby="stats-title">
      <p class="eyebrow">The tally</p>
      <h2 id="stats-title">Stories from the circle</h2>
      <div class="stat-row">
        <div><strong>{{ statistics.sessions }}</strong><span>gatherings</span></div>
        <div><strong>{{ statistics.games }}</strong><span>games played</span></div>
        <div><strong>{{ statistics.scripts }}</strong><span>scripts explored</span></div>
      </div>
    </section>

    <section id="clocktower-archive" class="archive" aria-labelledby="archive-title">
      <header class="archive-heading">
        <p class="eyebrow">Past gatherings</p>
        <h2 id="archive-title">Every town has a story</h2>
        <p v-if="pastSessions.length" class="metadata">Game results and retellings stay tucked away until you reveal them.</p>
      </header>
      <p v-if="error" class="archive-state" role="alert">{{ error }} <button class="share-button" type="button" @click="loadArchive">Try again</button></p>
      <p v-else-if="loading" class="archive-state" role="status">Opening the grimoire…</p>
      <div v-else-if="!pastSessions.length" class="archive-state empty-archive">
        <span class="empty-mark" aria-hidden="true">✧</span>
        <h3>The first story is still to come.</h3>
        <p>After a gathering, look here for Mika’s retelling, game results and photos from the table.</p>
      </div>

      <article v-for="session in pastSessions" :id="'session-' + session.id" :key="session.id" class="session-card">
        <div class="session-heading">
          <div>
            <h3>{{ formatDate(session.session_date) }}</h3>
            <p class="metadata">{{ session.venue || 'Saujana gathering' }} · {{ session.games?.length || 0 }} game{{ session.games?.length === 1 ? '' : 's' }}</p>
          </div>
          <button class="share-button" type="button" @click="shareSession(session)">Copy gathering link</button>
        </div>
        <p v-if="shareNotices[session.id]" role="status" class="share-feedback">{{ shareNotices[session.id] }}</p>

        <details v-if="session.recap" class="recap-reveal" :open="isShared(session)">
          <summary>Reveal Mika’s retelling</summary>
          <p>{{ session.recap }}</p>
        </details>

        <div v-if="sessionPhotos(session).length" class="photo-gallery" :aria-label="'Photos from ' + formatDate(session.session_date)">
          <img v-for="photo in sessionPhotos(session)" :key="photo.path" :src="photoUrls[photo.path]" :alt="photo.alt || 'Photo from this Blood on the Clocktower gathering'" loading="lazy">
        </div>

        <div v-if="session.games?.length" class="game-grid">
          <details v-for="(game, index) in session.games" :id="game.id ? 'game-' + game.id : undefined" :key="game.id || index" :open="isSharedGame(session, game)">
            <summary>
              <span class="game-label">Game {{ index + 1 }}</span>
              <span>{{ game.script || 'Custom script' }}</span>
            </summary>
            <p v-if="game.outcome" class="outcome">{{ game.outcome }}</p>
            <ul v-if="game.players?.length" class="roster"><li v-for="(player, pIndex) in game.players" :key="pIndex">{{ player.public_name || player.name || 'Seat ' + (pIndex + 1) }}<template v-if="player.character"> · {{ player.character }}</template><template v-if="player.died"> · died</template></li></ul>
            <p v-if="game.notes" class="story-text">{{ game.notes }}</p>
            <button v-if="game.id" class="share-button" type="button" @click="shareGame(session, game)">Copy game link</button>
            <p v-if="shareNotices[game.id]" role="status" class="share-feedback">{{ shareNotices[game.id] }}</p>
          </details>
        </div>
      </article>
    </section>
    <p class="script-note">Curious how the game works? <a href="https://bloodontheclocktower.com/pages/how-to-play" target="_blank" rel="noopener noreferrer">Read the official guide ↗</a></p>
  </main>
</template>

<script setup>
const config = useRuntimeConfig()
const route = useRoute()
const sessions = ref([])
const photoUrls = ref({})
const shareNotices = ref({})
const loading = ref(true)
const error = ref('')
const eventLoading = ref(true)
const eventError = ref(false)
const communityEvents = ref([])
const headers = {
  apikey: config.public.supabaseKey,
  Authorization: 'Bearer ' + config.public.supabaseKey,
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
const gatheringHref = computed(() => nextNight.value
  ? `/gatherings/#gathering-${nextNight.value.id}`
  : nextSession.value?.signup_url || '/gatherings/')
const featured = computed(() => pastSessions.value.find(session => session.featured_game_id || session.recap || session.teaser))
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

function cover(session) {
  const photos = sessionPhotos(session)
  return (photos.find(photo => photo.cover) || photos[0])?.path
}

function isShared(session) {
  return route.query.session === session.id && !route.query.game && Boolean(session.recap)
}

function isSharedGame(session, game) {
  return route.query.game === game.id && (!route.query.session || route.query.session === session.id)
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
        return
      }
    }
    if (typeof sharedId === 'string') {
      document.getElementById('session-' + sharedId)?.scrollIntoView({ block: 'start' })
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
  try {
    await navigator.clipboard.writeText(link.toString())
    shareNotices.value = { ...shareNotices.value, [session.id]: 'Recap link copied.' }
  } catch {
    shareNotices.value = { ...shareNotices.value, [session.id]: link.toString() }
  }
}

async function shareGame(session, game) {
  const link = new URL('/only-blood-in-the-clocktower/', window.location.origin)
  link.searchParams.set('session', session.id)
  link.searchParams.set('game', game.id)
  try {
    await navigator.clipboard.writeText(link.toString())
    shareNotices.value = { ...shareNotices.value, [game.id]: 'Game link copied.' }
  } catch {
    shareNotices.value = { ...shareNotices.value, [game.id]: link.toString() }
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
  --night: #211a20;
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
  align-items: center;
  overflow: hidden;
  min-height: 436px;
  padding: clamp(32px, 4vw, 54px) clamp(28px, 6vw, 74px);
  text-align: left;
  border-radius: 16px;
  background: radial-gradient(ellipse at 78% 40%, #432c34, var(--night) 72%);
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
  background: linear-gradient(90deg, var(--night) 10%, #211a20f2 32%, #211a20ad 47%, transparent 69%);
}
.hero-art {
  position: absolute;
  z-index: -2;
  inset: auto 0 0 auto;
  width: min(66%, 700px);
  height: 100%;
  object-fit: cover;
  object-position: center 57%;
}
.hero-copy { max-width: 620px; }
.eyebrow {
  margin: 0;
  color: var(--wine);
  font-size: .72rem;
  font-weight: 750;
  letter-spacing: .15em;
  line-height: 1.5;
  text-transform: uppercase;
}
.hero-kicker { display: flex; align-items: center; gap: 10px; color: var(--gold); }
.hero-kicker::before { content: ''; width: 24px; border-top: 1px solid currentColor; }
.page-header h1 {
  margin: 13px 0 18px;
  font: 400 clamp(2.7rem, 6.25vw, 5rem)/1.02 var(--font-display);
  letter-spacing: -.055em;
}
.page-header h1 em { display: block; color: #efd0a4; }
.intro { max-width: 37ch; margin: 0; color: #e1d0c8; font-size: clamp(.97rem, 1.6vw, 1.1rem); }
.hero-links { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; margin-top: 26px; }
.hero-primary, .hero-secondary, .primary-link, .text-link {
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
.hero-primary, .primary-link { padding: 10px 16px; border-radius: 6px; }
.hero-primary { background: var(--gold); color: var(--night); }
.hero-primary:hover { background: #f0d1a4; }
.hero-secondary { color: #f2e3da; }
.hero-secondary:hover, .text-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.clocktower-page :is(a, button, summary):focus-visible { outline: 2px solid var(--wine); outline-offset: 4px; }
.page-header a:focus-visible { outline-color: var(--gold); }

.next-night, .featured, .session-card, .archive-state {
  border: 1px solid var(--rule);
  border-radius: 12px;
  background: var(--paper);
}
.next-night {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px clamp(15px, 3vw, 25px);
  margin: 20px 0 clamp(32px, 5vw, 58px);
  padding: clamp(18px, 3vw, 27px) var(--panel-pad);
  background: var(--parchment);
}
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
.next-night h2, .featured h2, .archive h2, .stats h2 {
  margin: 3px 0 7px;
  color: var(--ink);
  font: 400 clamp(1.55rem, 3.5vw, 2.5rem)/1.14 var(--font-display);
  letter-spacing: -.025em;
}
.next-night h2 { font-size: clamp(1.35rem, 3vw, 1.95rem); }
.next-copy p:not(.eyebrow) { margin: 3px 0 0; color: var(--soft-ink); font-size: .91rem; }
.primary-link { background: var(--wine); color: #fff8ee; text-align: center; }
.primary-link:hover { background: #5b3039; }
.text-link { color: var(--wine); }

.featured {
  position: relative;
  display: grid;
  overflow: hidden;
  margin: 0 0 26px;
  background: #f5eae4;
}
.featured:not(.has-cover)::before {
  content: '';
  position: absolute;
  inset: -110px -36px auto auto;
  width: 330px;
  aspect-ratio: 1;
  border: 1px solid #743c4624;
  border-radius: 50%;
  box-shadow: 0 0 0 10px #f5eae4, 0 0 0 11px #743c4621, 0 0 0 32px #f5eae4, 0 0 0 33px #743c4619;
  pointer-events: none;
}
.featured.has-cover { grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); }
.featured-photo { position: relative; min-height: 260px; margin: 0; background: var(--parchment); }
.featured-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.featured-copy { position: relative; min-width: 0; padding: var(--panel-pad); }
.featured-copy .eyebrow span { margin-right: 6px; }
.metadata { margin: 4px 0 0; color: var(--soft-ink); font-size: .92rem; }
.recap-reveal { margin-top: 14px; }
.recap-reveal summary { color: var(--wine); }
.recap-reveal p, .story-text { max-width: 68ch; white-space: pre-wrap; overflow-wrap: anywhere; }
.recap-reveal p { margin: 6px 0 12px; }

.stats {
  display: grid;
  grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 0 16px;
  margin: 0 0 clamp(32px, 5vw, 62px);
  padding: 18px var(--panel-pad);
  border-block: 1px solid var(--rule);
}
.stats .eyebrow { grid-column: 1; align-self: end; }
.stats h2 { grid-column: 1; align-self: start; font-size: clamp(1.4rem, 3vw, 1.9rem); }
.stat-row { grid-column: 2; grid-row: 1 / 3; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); text-align: center; }
.stat-row div { display: grid; gap: 4px; padding: 4px 6px; border-left: 1px solid var(--rule); }
.stat-row strong { color: var(--wine); font: 400 clamp(1.65rem, 4vw, 2.55rem)/1 var(--font-display); }
.stat-row span { color: var(--soft-ink); font-size: .81rem; line-height: 1.3; }

.clocktower-page .archive-heading { margin-bottom: 18px; padding: 0; text-align: left; }
.archive-state, .session-card { padding: var(--panel-pad); }
.archive-state { margin: 0; color: var(--soft-ink); }
.empty-archive { text-align: center; background: linear-gradient(var(--paper), #f7efe3); }
.empty-mark { margin: 0 auto 12px; font-size: 1.7rem; }
.empty-archive h3, .session-card h3 { margin: 0; color: var(--ink); font: 400 clamp(1.25rem, 3vw, 1.75rem)/1.2 var(--font-display); }
.empty-archive p { max-width: 42ch; margin: 8px auto 0; }
.session-card { margin: 0 0 14px; box-shadow: 0 6px 20px #35282b08; }
.session-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 18px; }
.game-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 10px; margin-top: 14px; align-items: start; }
.game-grid details { min-width: 0; padding: 4px 14px 10px; border: 1px solid var(--rule); border-radius: 8px; background: #f8f1e8; }
.game-grid details[open] { border-color: #cdb3a4; }
.clocktower-page summary { min-height: 44px; padding: 9px 25px 7px 0; cursor: pointer; font-weight: 700; overflow-wrap: anywhere; }
.game-grid summary { display: grid; gap: 2px; }
.game-grid summary, .recap-reveal summary { position: relative; list-style: none; }
.clocktower-page summary::-webkit-details-marker { display: none; }
.game-grid summary::after, .recap-reveal summary::after { content: ''; position: absolute; right: 3px; top: 50%; width: 8px; height: 8px; border: solid var(--wine); border-width: 0 1.5px 1.5px 0; transform: translateY(-70%) rotate(45deg); }
.recap-reveal summary { display: inline-flex; align-items: center; }
.clocktower-page details[open] > summary::after { transform: translateY(-25%) rotate(225deg); }
.game-label { color: var(--wine); font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; }
.outcome { display: inline-block; margin: 7px 0 0; padding: 4px 9px; border-radius: 5px; background: #eee0d5; color: #63323d; font-weight: 700; }
.roster { margin: 10px 0; padding-left: 20px; font-size: .9rem; overflow-wrap: anywhere; }
.photo-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 8px; margin: 16px 0 0; }
.photo-gallery img { width: 100%; aspect-ratio: 4 / 3; max-height: 210px; object-fit: cover; border-radius: 7px; background: var(--parchment); }
.share-button { min-height: 44px; padding: 7px 11px; border: 1px solid #d3bdb1; border-radius: 6px; background: transparent; color: var(--wine); font: 700 .85rem var(--font-body); cursor: pointer; }
.share-button:hover { background: #743c460a; border-color: var(--wine); }
.game-grid .share-button { margin-top: 7px; }
.share-feedback { margin: 8px 0 0; color: var(--soft-ink); overflow-wrap: anywhere; font-size: .85rem; }
.script-note { margin: 25px 0 0; text-align: center; color: var(--soft-ink); font-size: .9rem; }
.script-note a { color: var(--wine); text-underline-offset: 3px; }
.next-night, .archive, .session-card, .game-grid details { scroll-margin-top: 86px; }

@media (max-width: 760px) {
  .clocktower-page > .page-header { min-height: 0; padding: 29px 24px 182px; }
  .page-header::after { background: linear-gradient(180deg, var(--night) 15%, #211a20f5 33%, #211a2085 59%, transparent 78%); }
  .hero-art { width: min(100%, 480px); height: auto; max-height: 100%; object-fit: contain; object-position: right bottom; }
  .page-header h1 { font-size: clamp(2.25rem, 8.9vw, 4rem); }
  .hero-links { margin-top: 18px; }
  .stats { grid-template-columns: 1fr; text-align: center; gap: 2px; }
  .stat-row { grid-column: 1; grid-row: auto; margin-top: 10px; }
  .stat-row div:first-child { border: 0; }
}
@media (max-width: 560px) {
  .clocktower-page > .page-header { padding-bottom: 152px; }
  .next-night { grid-template-columns: minmax(0, 1fr); }
  .calendar-mark { display: none; }
  .next-night .primary-link { justify-self: start; }
  .featured.has-cover { grid-template-columns: minmax(0, 1fr); }
  .featured-photo { min-height: 0; aspect-ratio: 16 / 10; }
  .photo-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
