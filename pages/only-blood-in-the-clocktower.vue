<template>
  <main class="clocktower-page">
    <header class="page-header">
      <p class="page-eyebrow">Saujana’s nights in Ravenswood Bluff</p>
      <h1>Only Blood in the Clocktower</h1>
      <p class="intro">Good games, impossible choices and the moment the town finds out.</p>
    </header>

    <section class="next-night" aria-labelledby="next-night-title">
      <div>
        <p class="eyebrow">The next gathering</p>
        <h2 id="next-night-title">{{ nextNight ? formatDate(nextNight.date) : eventLoading ? 'Checking the calendar…' : eventError ? 'Calendar unavailable' : 'The town will meet again' }}</h2>
        <p v-if="nextNight?.time || nextNight?.venue">
          <template v-if="nextNight?.time">{{ nextNight.time }}</template>
          <template v-if="nextNight?.time && nextNight?.venue"> · </template>
          <template v-if="nextNight?.venue">{{ nextNight.venue }}</template>
        </p>
        <p>{{ eventError ? 'We couldn’t check the schedule just now. Please try again.' : 'New to Clocktower? Come along. We’ll walk you through your first game.' }}</p>
      </div>
      <a class="primary-link" :href="nextNight ? `/gatherings/#gathering-${nextNight.id}` : '/gatherings/'">
        {{ nextNight ? 'See gathering details ↗' : 'See community gatherings ↗' }}
      </a>
    </section>

    <section v-if="featured" class="featured" aria-labelledby="featured-title">
      <img v-if="cover(featured)" :src="photoUrls[cover(featured)]" alt="A moment from a Saujana Clocktower gathering">
      <div>
        <p class="eyebrow">A moment from the last gathering</p>
        <h2 id="featured-title">{{ featured.teaser || 'The final reveal' }}</h2>
        <p>{{ formatDate(featured.session_date) }}<template v-if="featured.venue"> · {{ featured.venue }}</template></p>
        <details :open="isShared(featured)">
          <summary>Reveal Mika’s retelling</summary>
          <p>{{ featured.recap }}</p>
        </details>
        <button class="share-button" type="button" @click="shareSession(featured)">Copy recap link</button>
        <p v-if="shareNotices[featured.id]" role="status" class="share-feedback">{{ shareNotices[featured.id] }}</p>
      </div>
    </section>

    <section v-if="!loading && !error && pastSessions.length" class="stats" aria-labelledby="stats-title">
      <h2 id="stats-title">Stories from the circle</h2>
      <div class="stat-row">
        <div><strong>{{ statistics.sessions }}</strong><span>gatherings</span></div>
        <div><strong>{{ statistics.games }}</strong><span>games played</span></div>
        <div><strong>{{ statistics.scripts }}</strong><span>scripts explored</span></div>
      </div>
    </section>

    <section class="archive" aria-labelledby="archive-title">
      <p class="eyebrow">Past gatherings</p>
      <h2 id="archive-title">Every town has a story</h2>
      <p v-if="error" role="alert">{{ error }} <button type="button" @click="loadArchive">Try again</button></p>
      <p v-else-if="loading" role="status">Opening the grimoire…</p>
      <p v-else-if="!pastSessions.length">No past sessions logged yet. The first story is still to come.</p>

      <article v-for="session in pastSessions" :id="'session-' + session.id" :key="session.id" class="session-card">
        <div class="session-heading">
          <div>
            <p class="eyebrow">A gathering in the archive</p>
            <h3>{{ formatDate(session.session_date) }}</h3>
            <p>{{ session.venue || 'Saujana gathering' }} · {{ session.games?.length || 0 }} game{{ session.games?.length === 1 ? '' : 's' }}</p>
          </div>
          <a class="join-link" :href="nextNight ? `/gatherings/#gathering-${nextNight.id}` : '/gatherings/'">{{ nextNight ? 'See gathering details ↗' : 'See community gatherings ↗' }}</a>
        </div>

        <details v-if="session.recap" :open="isShared(session)">
          <summary>Reveal Mika’s retelling</summary>
          <p>{{ session.recap }}</p>
        </details>
        <button class="share-button" type="button" @click="shareSession(session)">Copy gathering link</button>
        <p v-if="shareNotices[session.id]" role="status" class="share-feedback">{{ shareNotices[session.id] }}</p>

        <div v-if="sessionPhotos(session).length" class="photo-gallery" :aria-label="'Photos from ' + formatDate(session.session_date)">
          <img v-for="photo in sessionPhotos(session)" :key="photo.path" :src="photoUrls[photo.path]" :alt="photo.alt || 'Photo from this Blood on the Clocktower gathering'" loading="lazy">
        </div>

        <div v-if="session.games?.length" class="game-grid">
          <details v-for="(game, index) in session.games" :key="game.id || index">
            <summary>{{ game.script || 'Custom script' }}</summary>
            <p v-if="game.outcome"><strong>Reveal the result</strong> · {{ game.outcome }}</p>
            <p v-if="game.players?.length"><strong>In the circle</strong> · {{ game.players.map(player => player.public_name || player.name).filter(Boolean).join(', ') }}</p>
            <ul><li v-for="(player, pIndex) in game.players" :key="pIndex">{{ player.public_name || player.name || 'Seat ' + (pIndex + 1) }}<template v-if="player.character"> · {{ player.character }}</template><template v-if="player.died"> · died</template></li></ul>
            <p v-if="game.notes">{{ game.notes }}</p>
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
  .filter(event => /clocktower/i.test(event.name) && event.date >= localDate)
  .sort((a, b) => a.date.localeCompare(b.date))[0])
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
  return route.query.session === session.id && Boolean(session.recap)
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
    await nextTick()
    const sharedId = route.query.session
    if (typeof sharedId === 'string') {
      document.getElementById('session-' + sharedId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

onMounted(() => {
  loadArchive()
  loadCommunityEvents()
})
</script>

<style scoped>
.clocktower-page{width:min(960px,92%);margin:auto;padding:40px 0 80px;color:var(--clay-text)}
.page-header h1{font:400 clamp(2.5rem,7vw,5rem)/1.05 var(--font-display);color:var(--matcha-leaf)}
.page-eyebrow,.eyebrow{color:var(--gold-leaf);font-size:.73rem;letter-spacing:.12em;text-transform:uppercase}
.intro{font:1.2rem/1.6 var(--font-display);color:var(--muted)}
.next-night,.featured,.stats,.session-card{background:var(--white-pure);border:1px solid var(--line);border-radius:12px;padding:clamp(20px,4vw,34px);margin:20px 0}
.next-night{display:flex;align-items:center;justify-content:space-between;gap:20px;background:var(--matcha-leaf);color:white}
.next-night .eyebrow{color:#e2c995}.next-night h2,.featured h2,.archive h2,.stats h2{font:2rem var(--font-display);margin:4px 0;color:var(--matcha-leaf)}.next-night h2{color:white}
.primary-link,.join-link{background:#e2c995;color:#263d31;padding:14px 19px;border-radius:7px;text-decoration:none;font-weight:700;white-space:nowrap}
.featured{display:grid;grid-template-columns:minmax(180px,.75fr) 1fr;gap:26px;align-items:center}.featured img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:9px}
.stat-row{display:flex;gap:40px}.stat-row div{display:grid}.stat-row strong{font:2rem var(--font-display);color:var(--matcha-leaf)}.stat-row span,.session-card p{color:var(--muted)}
.session-card{scroll-margin-top:24px}.session-heading{display:flex;justify-content:space-between;align-items:center;gap:20px}.session-card h3{font:1.55rem var(--font-display);color:var(--matcha-leaf);margin:.3rem 0}.session-card .eyebrow{margin-bottom:4px}
.game-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:14px}.game-grid details{background:var(--surface-soft);padding:14px;border-radius:8px}.game-grid summary,summary{cursor:pointer;font-weight:650}.game-grid ul{padding-left:20px;font-size:.88rem}
.photo-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:16px 0}.photo-gallery img{width:100%;height:150px;object-fit:cover;border-radius:8px;background:var(--surface-soft)}
.share-button{min-height:44px;margin-top:8px;padding:10px 14px;border:1px solid var(--matcha-leaf);border-radius:6px;background:var(--matcha-leaf);color:white;font:inherit;font-weight:650;cursor:pointer}.share-button:focus-visible,.primary-link:focus-visible,.join-link:focus-visible{outline:3px solid var(--gold-leaf);outline-offset:3px}.share-feedback{overflow-wrap:anywhere;font-size:.85rem}
.script-note{text-align:center;color:var(--muted)}.script-note a{color:var(--matcha-leaf)}
@media(max-width:650px){.clocktower-page{padding-top:20px}.next-night{align-items:flex-start;flex-direction:column}.featured{grid-template-columns:1fr}.stat-row{justify-content:space-between;gap:12px}.stat-row strong{font-size:1.7rem}.session-heading{align-items:flex-start;flex-direction:column}.photo-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
