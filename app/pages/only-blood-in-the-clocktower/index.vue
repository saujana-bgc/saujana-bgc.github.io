<template>
  <main class="clocktower-page">
    <header class="page-intro">
      <h1 class="hero-title">Only Blood in the Clocktower</h1>
      <p class="stats-container">The town is full of stories. Who do you trust? In <em>Blood on the Clocktower</em>, compare clues and help the town find the Demon.</p>
    </header>

    <div class="gathering-banner">
      <section id="next-gathering" class="next-night" aria-labelledby="next-night-title">
        <div class="calendar-mark" aria-hidden="true">
          <template v-if="nextGathering"><strong>{{ nextDateStamp.day }}</strong><span>{{ nextDateStamp.month }}</span></template>
          <svg v-else viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="22" height="21" rx="2"/><path d="M5 13h22M11 4v6m10-6v6m-5 6v8m-4-4h8"/></svg>
        </div>
        <div class="next-copy">
          <p class="eyebrow">Next Clocktower gathering</p>
          <h2 id="next-night-title" aria-live="polite">{{ nextGathering ? formatDate(nextGathering.date) : calendarLoading ? 'Checking the calendar…' : eventError || archiveError ? 'Calendar unavailable' : 'No Clocktower date announced' }}</h2>
          <p v-if="nextGathering?.time">{{ formatGatheringTime(nextGathering.time) }}</p>
          <p v-if="nextGathering?.venue">{{ nextGathering.venue }} <a v-if="nextGathering.venue_url" :href="nextGathering.venue_url" target="_blank" rel="noopener noreferrer">Directions <UIcon name="i-lucide-map-pin" aria-hidden="true" /></a></p>
          <p v-if="nextGathering?.first_timer_note">{{ nextGathering.first_timer_note }}</p>
          <p v-else-if="(eventError || archiveError) && !nextGathering">We couldn’t confirm the schedule just now.</p>
          <p v-else-if="calendarLoading">Upcoming dates will appear here.</p>
          <UButton v-if="(eventError || archiveError) && !nextGathering" class="retry-button" type="button" @click="retryGatheringSources">Try again</UButton>
        </div>
        <a v-if="nextGathering" class="calendar-link" :class="{ 'calendar-link-primary': nextGathering.signup_url }" :href="nextCtaHref">{{ nextCtaLabel }} <span aria-hidden="true">↗</span></a>
        <template v-else-if="!calendarLoading">
          <a class="calendar-link" href="https://wa.me/saujanabgc" target="_blank" rel="noopener noreferrer">Ask about the next gathering <span aria-hidden="true">↗</span></a>
          <NuxtLink class="calendar-link" to="/gatherings/" no-prefetch>Find a gathering <span aria-hidden="true">↗</span></NuxtLink>
        </template>
      </section>
    </div>
    <p class="activity-welcome clocktower-event-welcome">Board games and riichi mahjong are included too. New to Clocktower? The Storyteller will help you get started.</p>
    <nav class="clocktower-page-links" aria-label="Clocktower page links">
      <NuxtLink class="hero-tertiary" to="/only-blood-in-the-clocktower/recaps/" no-prefetch>Browse Clocktower recaps <span aria-hidden="true">→</span></NuxtLink>
    </nav>

    <section id="what-to-expect" class="welcome-note" aria-labelledby="welcome-title">
      <ActivityOverviewFeature
        src="/images/site/overview-mika-clocktower-1200.avif"
        src-set="/images/site/overview-mika-clocktower-480.avif 480w, /images/site/overview-mika-clocktower-800.avif 800w, /images/site/overview-mika-clocktower-1200.avif 1200w"
        sizes="(max-width: 680px) calc(100vw - 2.5rem), (max-width: 1000px) 40vw, 384px"
        alt="Four players compare stories over a Blood on the Clocktower town-square mat."
      >
        <p class="page-eyebrow">Your first game</p>
        <h2 id="welcome-title">A mystery you solve together.</h2>
        <ul class="welcome-steps">
          <li><strong>At night, get clues</strong><span>Some players close their eyes while the Storyteller wakes others to share information or use an ability.</span></li>
          <li><strong>By day, compare stories</strong><span>Talk with the group, share what you learned and vote on who might be the Demon.</span></li>
          <li><strong>The Storyteller can help</strong><span>They run the game, explain your role and answer questions privately during play.</span></li>
          <li><strong>Being out doesn’t end your game</strong><span>If your character dies, you can still talk and help your team. You keep one final vote for later.</span></li>
        </ul>
        <p class="welcome-joining">Come on your own or with a friend. Tell the Storyteller you’re new, and they’ll help you decide whether to watch or play.</p>
        <a class="welcome-link" href="https://bloodontheclocktower.com/pages/how-to-play" target="_blank" rel="noopener noreferrer">Official how-to-play guide <span aria-hidden="true">↗</span></a>
      </ActivityOverviewFeature>
    </section>

    <footer class="art-credit">
      <span>Blood on the Clocktower is published by <a href="https://bloodontheclocktower.com/" target="_blank" rel="noopener noreferrer">The Pandemonium Institute</a>.</span>
      <a href="https://github.com/tomozbot/botc-icons" target="_blank" rel="noopener noreferrer">Character icon credits <span aria-hidden="true">↗</span></a>
    </footer>
  </main>
</template>

<script setup>
import { formatGatheringDate, getGatheringDateStamp, getKualaLumpurDate } from '~/utils/gatheringDates'
import { formatGatheringTime } from '~/utils/gatheringTime'

const config = useRuntimeConfig()
const route = useRoute()

const sessions = ref([])
const archiveError = ref(false)
const archiveLoading = ref(true)
const eventLoading = ref(true)
const eventError = ref(false)
const communityEvents = ref([])
const headers = {
  apikey: config.public.supabaseKey,
  'Content-Type': 'application/json',
}
const localDate = getKualaLumpurDate()
// The archive endpoint already filters to published sessions.
const filteredSessions = computed(() => sessions.value
  .filter(hasResults)
  .sort((a, b) => String(b.session_date || '').localeCompare(String(a.session_date || ''))))
const nextNight = computed(() => communityEvents.value
  .filter(event => /clocktower/i.test(event.name) && (
    event.date > localDate || (event.date === localDate && !filteredSessions.value.some(session =>
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
const calendarLoading = computed(() => eventLoading.value || archiveLoading.value)
const nextCtaHref = computed(() => nextGathering.value?.signup_url || nextGathering.value?.href || '/gatherings/')
const nextCtaLabel = computed(() => {
  if (nextGathering.value?.signup_url) return 'Sign up with the organiser'
  return nextGathering.value?.href?.endsWith('/') ? 'Find a gathering' : 'See gathering details'
})
const nextDateStamp = computed(() => {
  if (!nextGathering.value) return null
  return getGatheringDateStamp(nextGathering.value.date)
})
function formatDate(value) {
  return formatGatheringDate(value, { weekday: true })
}

function hasResults(session) {
  return Boolean(session.recap || session.games?.length)
}

async function loadArchive() {
  archiveLoading.value = true
  archiveError.value = false
  try {
    const response = await fetch(config.public.supabaseUrl + '/functions/v1/botc-archive', {
      method: 'POST', headers, body: JSON.stringify({ action: 'public' }),
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error)
    sessions.value = body.sessions || []
  } catch {
    archiveError.value = true
  } finally {
    archiveLoading.value = false
  }
}

async function retryGatheringSources() {
  await Promise.all([loadArchive(), loadCommunityEvents()])
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
  --ink: var(--clay-text);
  --night: var(--matcha-leaf);
  --wine: var(--matcha-leaf);
  --paper: var(--white-pure);
  --parchment: var(--surface-soft);
  --gold: var(--gold-leaf);
  --soft-ink: var(--muted);
  --rule: var(--line);
  --panel-pad: clamp(15px, 2.6vw, 34px);
  width: min(var(--content-page), calc(100% - var(--page-gutter) * 2));
  margin-inline: auto;
  padding-bottom: 24px;
  color: var(--ink);
}
.clocktower-page .page-intro { max-width: 960px; margin-inline: auto; padding-inline: 0; }
.clocktower-page .page-intro h1 { max-width: 820px; margin-inline: auto; font-size: clamp(2.45rem, 7vw, 4.25rem); line-height: 1.08; }
.clocktower-page .stats-container { max-width: 580px; }
.activity-primary { display: inline-flex; min-height: 48px; align-items: center; gap: 18px; margin: 22px auto 0; padding: 0 22px; border-radius: 6px; background: var(--wine); color: var(--white-pure); font-weight: 700; text-decoration: none; }
.activity-welcome { max-width: 580px; margin: 12px auto 0; color: var(--soft-ink); font-size: .9rem; line-height: 1.55; }
.clocktower-page-links { max-width: 960px; margin: 0 auto 20px; }
.activity-primary:hover { filter: brightness(.92); }
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
  border-top: 2px solid var(--gold-leaf);
  background: var(--white-pure);
  box-shadow: var(--shadow-card);
  z-index: 1;
}
.next-night .calendar-link { grid-column: 2; justify-self: start; min-height: 46px; padding: 0 14px; border-radius: 6px; background: var(--wine); color: var(--white-pure); white-space: normal; }
.next-night .calendar-link-primary { background: var(--matcha-leaf); }
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
.next-copy a { display: inline-flex; align-items: center; min-height: 44px; color: var(--wine); text-underline-offset: 3px; vertical-align: middle; }
.calendar-link { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: var(--wine); font-size: .84rem; font-weight: 700; text-decoration: none; white-space: nowrap; }
.calendar-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.retry-button { justify-self: start; min-height: 40px; margin-top: 8px; padding: 7px 11px; border: 1px solid var(--line); border-radius: 6px; background: transparent; color: var(--wine); font: inherit; font-size: .85rem; font-weight: 700; cursor: pointer; }
.retry-button:focus-visible { outline: 2px solid var(--wine); outline-offset: 2px; }
.welcome-note {
  max-width: 960px;
  margin: 0 auto clamp(26px, 4vw, 48px);
  padding: clamp(19px, 3vw, 28px) 0;
  background: transparent;
}
.welcome-note h2 { margin: 0 0 12px; color: var(--ink); font: 400 clamp(1.8rem, 4vw, 2.6rem)/1.2 var(--font-display); }
.welcome-steps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; margin: 0; padding: 0; list-style: none; }
.welcome-joining { margin: 14px 0 0; color: var(--soft-ink); font-size: .9rem; line-height: 1.5; }
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
.empty-mark { margin: 0 auto 12px; font-size: 1.7rem; }
.empty-archive h3, .session-card h3 { margin: 0; color: var(--ink); font: 400 clamp(1.25rem, 3vw, 1.75rem)/1.2 var(--font-display); }
.empty-archive p { max-width: 60ch; margin: 8px auto 0; }
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
.grimoire-seat.is-dead { background: var(--rose-dust); }
.character-art { display: block; width: 58px; height: 58px; object-fit: contain; filter: drop-shadow(0 3px 8px rgba(44, 55, 40, .18)); }
.seat-copy { display: grid; gap: 4px; min-width: 0; }
.seat-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.seat-name { min-width: 0; color: var(--matcha-leaf); font: 400 1.05rem/1.2 var(--font-display); overflow-wrap: anywhere; }
.seat-character { min-width: 0; overflow-wrap: anywhere; color: var(--muted); font-size: .82rem; }
.death-mark { padding: 2px 5px; border: 1px solid var(--blush-petal); border-radius: 4px; background: var(--rose-dust); color: var(--clay-text); font-size: .65rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.art-credit { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 8px; margin-top: 24px; padding-top: 14px; color: var(--soft-ink); font-size: .72rem; }
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
