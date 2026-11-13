<template>
  <main class="home">
    <section class="hero-section" aria-labelledby="home-title">
      <div class="hero-copy">
        <h1 id="home-title" class="hero-title">Come Play with Saujana</h1>
        <p>Join us for board games, riichi mahjong, or Blood on the Clocktower. Coming on your own? You’re welcome to watch a round before joining in.</p>
        <div class="hero-actions">
          <NuxtLink class="hero-gatherings-link" to="/gatherings" no-prefetch>Find a gathering <span aria-hidden="true">→</span></NuxtLink>
          <a class="text-link" href="#first-visit">What to expect <span aria-hidden="true">↓</span></a>
        </div>
      </div>
      <figure class="hero-artwork">
        <img
          class="hero-banner"
          src="/images/site/saujana-home-hero.webp"
          alt="A collage of Saujana players at board game and riichi mahjong gatherings."
          width="1671"
          height="941"
          loading="eager"
          fetchpriority="high"
        >
      </figure>
    </section>

    <section class="next-gathering" :class="{ 'next-gathering-loading': gatheringStatus === 'loading' }" aria-label="Next gathering" :aria-busy="gatheringStatus === 'loading'">
      <template v-if="nextGathering">
      <div>
        <p class="next-gathering-label">Next gathering</p>
        <h2 id="next-gathering-title" class="next-gathering-title">{{ nextGathering.name }}</h2>
        <div class="next-gathering-details">
          <span class="gathering-detail">
            <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17"/></svg>
            {{ formatGatheringDate(nextGathering.date) }}
          </span>
          <span class="gathering-detail">
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></svg>
            {{ nextGathering.time }}
          </span>
          <span class="gathering-detail">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></svg>
            {{ nextGathering.venue }}
          </span>
          <a v-if="nextGathering.venue_url" class="gathering-detail gathering-directions" :href="nextGathering.venue_url" target="_blank" rel="noopener noreferrer">Directions <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <NuxtLink class="next-gathering-link" :to="`/gatherings#gathering-${nextGathering.id}`" no-prefetch>
        See gathering details <span aria-hidden="true">→</span>
      </NuxtLink>
      </template>
      <div v-else class="next-gathering-empty" role="status">
        <p v-if="gatheringStatus === 'loading'">Checking the calendar…</p>
        <p v-else-if="gatheringStatus === 'unavailable'">The calendar isn’t available just now.</p>
        <p v-else>No date has been announced yet.</p>
        <NuxtLink class="text-link" to="/gatherings" no-prefetch>Browse gatherings <span aria-hidden="true">→</span></NuxtLink>
      </div>
    </section>

    <section id="first-visit" class="home-section" aria-labelledby="first-visit-title" tabindex="-1">
      <div class="first-visit-layout">
        <div class="first-visit-copy">
          <h2 id="first-visit-title" class="hero-title story-title">Your first gathering</h2>
          <p class="section-intro">Your first game or your hundredth, you’re welcome here. Questions before you come? <a href="https://wa.me/saujanabgc" target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>. <NuxtLink to="/gatherings" no-prefetch>See dates, venues and sign-up details</NuxtLink>.</p>
        </div>
        <img
          class="first-visit-photo"
          src="/images/site/first-gathering-cafe.webp"
          alt="Saujana players chatting around a café table scattered with cards and tokens."
          width="1200"
          height="900"
          loading="lazy"
          decoding="async"
        >
        <div class="expect-guide">
          <article v-for="item in expectations" :key="item.title" class="expect-card">
            <svg class="guide-icon" aria-hidden="true" viewBox="0 0 24 24"><path :d="item.icon"/></svg>
            <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.copy }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="community-pillars" class="home-section" aria-labelledby="community-pillars-title" tabindex="-1">
      <h2 id="community-pillars-title" class="hero-title story-title">What We Play</h2>
      <div class="community-pillars">
        <article v-for="pillar in communityPillars" :key="pillar.id" class="community-card">
          <div class="community-card-image-frame" :class="{ 'is-rotated': pillar.id === 'board-games' }">
            <img
              class="community-card-image"
              :src="`/images/site/what-we-play-${pillar.id}.webp`"
              :alt="pillar.image.alt"
              :width="pillar.image.width"
              :height="pillar.image.height"
              loading="lazy"
              decoding="async"
            >
          </div>
          <h3>{{ pillar.label }}</h3>
          <p>{{ pillar.description }}</p>
          <ul>
            <li v-for="link in pillar.links" :key="link.to">
              <NuxtLink class="text-link" :to="link.to" no-prefetch>
                {{ link.label }} <span aria-hidden="true">→</span>
              </NuxtLink>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section class="social-note" aria-label="Follow Saujana on Instagram">
      <div>
        <h2 class="story-title">A little look around</h2>
        <p>Photos and recaps from the community</p>
      </div>
      <SocialLink channel="instagram" label="See gathering photos on Instagram" />
    </section>

    <section class="home-section" aria-labelledby="community-values-title">
      <h2 id="community-values-title" class="hero-title story-title">Good company is something we make</h2>
      <p class="section-intro">In Malay, <em>saujana</em> evokes an expanse as far as the eye can see. To us, it’s another game to try, another story to hear, someone new to meet.</p>
      <div class="care-guide">
        <div v-for="value in communityValues" :key="value.title" class="pillar">
          <svg class="pillar-icon" aria-hidden="true" viewBox="0 0 24 24"><path :d="value.icon"/></svg>
          <h3>{{ value.title }}</h3>
          <p>{{ value.content }}</p>
        </div>
      </div>
      <p id="respect-at-table" class="respect-note"><strong>Respect at the table.</strong> Everyone should feel welcome and respected. Harassment and disruptive behaviour have no place here. If something feels wrong, <a href="https://wa.me/saujanabgc" target="_blank" rel="noopener noreferrer">message an admin privately on WhatsApp</a>.</p>
    </section>

  </main>
</template>

<script setup>
import { communityPillars } from '~/utils/communityPillars'

const nextGathering = ref(null)
const gatheringStatus = ref('loading')

onMounted(async () => {
  try {
    const { data, error } = await useSupabase()
      .from('events')
      .select('id,name,date,time,venue,venue_url')
      .gte('date', new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()))
      .order('date', { ascending: true })
      .limit(1)

    if (error) throw error
    nextGathering.value = data?.[0] ?? null
    gatheringStatus.value = 'ready'
  } catch {
    gatheringStatus.value = 'unavailable'
  }
})

function formatGatheringDate(dateValue) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const communityValues = [
  {
    title: 'Help someone feel welcome',
    icon: 'M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6a7.5 7.5 0 1 1 17-3.5Z',
    content: 'If you notice someone new, introduce yourself and let them know they’re welcome to join a game.'
  },
  {
    title: 'Stay curious',
    icon: 'M12 3a7 7 0 0 0-4 12.7c.7.5 1 1 1 1.8h6c0-.8.3-1.3 1-1.8A7 7 0 0 0 12 3ZM9.5 20h5M10 17.5h4',
    content: 'Ask questions, try an unfamiliar game, and give each other time to learn. Nobody needs to get every rule right on the first go.'
  },
  {
    title: 'Care for the table',
    icon: 'M12 21s8-4 8-11V5l-8-3-8 3v5c0 7 8 11 8 11Z M9 12l2 2 4-4',
    content: 'Handle the games with care, order something at the venue, and lend a hand packing up. Keep your sign-up current so the host can plan for everyone.'
  }
]

const expectations = [
  {
    title: 'Find us',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
    copy: 'When you arrive, ask for Saujana BGC. If you can’t find us, message us on WhatsApp.'
  },
  {
    title: 'Choose a game',
    icon: 'M3 7h18v13H3zM7 7V4h10v3M8 12h8M8 16h5',
    copy: 'Tell us what you enjoy. We’ll suggest a game and explain the rules as you play.'
  },
  {
    title: 'Join at your pace',
    icon: 'M3 5h18v12H3zM8 21h8m-4-4v4M10 9l5 2-5 2z',
    copy: 'Watch a round first, or join a table whenever you feel ready.'
  }
]
</script>

<style scoped>
.home {
  width: min(1160px, calc(100% - 40px));
  min-width: 0;
  margin-inline: auto;
  padding-bottom: 12px;
}

.home > * { min-width: 0; }

.hero-section {
  padding: clamp(24px, 5vw, 56px) 0;
  border-bottom: 1px solid var(--line);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.04fr);
  align-items: center;
  gap: clamp(24px, 3vw, 36px);
}

.hero-copy h1 {
  max-width: 15ch;
  font-size: clamp(2.35rem, 5vw, 4.5rem);
}

.hero-copy p {
  max-width: 46ch;
  margin: 18px 0 0;
  color: var(--muted);
  font-size: clamp(1rem, 1.8vw, 1.2rem);
  line-height: 1.65;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 22px;
  margin-top: 28px;
}

.hero-gatherings-link,
.text-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  color: var(--matcha-leaf);
  font-size: .95rem;
  font-weight: 600;
  text-underline-offset: .2em;
}

.text-link:hover { text-decoration-thickness: 2px; }

.hero-gatherings-link {
  min-height: 48px;
  padding-inline: 18px;
  border-radius: var(--radius-control);
  background: var(--matcha-leaf);
  color: var(--white-pure);
  text-decoration: none;
}

.hero-gatherings-link:hover { background: #293d31; }

.hero-artwork {
  position: relative;
  width: 100%;
  min-width: 0;
  margin: 0;
}

.hero-banner {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-card);
}

.next-gathering {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  margin-top: clamp(24px, 4vw, 40px);
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}

.next-gathering { min-height: 124px; }
.next-gathering-empty { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; }
.next-gathering-empty p { margin: 0; color: var(--muted); }

.next-gathering-label {
  margin: 0 0 4px;
  color: var(--matcha-leaf);
  font-size: .78rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.next-gathering-title {
  margin: 0;
  color: var(--matcha-leaf);
  font: 400 clamp(1.25rem, 2.4vw, 1.65rem)/1.25 var(--font-display);
}

.next-gathering-details {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 18px;
  margin: 5px 0 0;
  color: var(--muted);
  font-size: .92rem;
  line-height: 1.5;
}

.gathering-detail { display: inline-flex; min-width: 0; align-items: center; gap: 7px; }
.gathering-detail:last-child { overflow-wrap: anywhere; }
.gathering-directions { color: var(--matcha-leaf); text-underline-offset: 3px; }
.gathering-detail svg, .guide-icon, .pillar-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.65;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.gathering-detail svg { color: var(--matcha-leaf); }

.next-gathering-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  color: var(--matcha-leaf);
  font-weight: 700;
  text-underline-offset: .2em;
}

.home-section {
  margin-top: clamp(48px, 7vw, 80px);
  padding-top: clamp(28px, 4vw, 44px);
  border-top: 1px solid var(--line);
}

#first-visit {
  padding: clamp(20px, 3vw, 32px);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface-soft);
}

.first-visit-layout {
  display: grid;
  grid-template-areas: "copy copy" "photo steps";
  grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 20px 28px;
}
.first-visit-copy { grid-area: copy; }
.first-visit-photo {
  grid-area: photo;
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-card);
}
.first-visit-layout > .expect-guide { grid-area: steps; width: 100%; }

.story-title { font-size: clamp(1.7rem, 4vw, 2.55rem); }

.section-intro {
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.7;
}

.section-intro a { color: var(--matcha-leaf); }

.expect-guide,
.care-guide {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin-top: 20px;
}

.expect-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 0;
}

.expect-card + .expect-card {
  border-top: 1px solid var(--line);
}

.guide-icon, .pillar-icon { color: var(--gold-leaf); margin-top: 2px; }

.expect-card h3,
.pillar h3 {
  margin: 0 0 6px;
  color: var(--matcha-leaf);
  font: 400 1.25rem/1.3 var(--font-display);
}

.expect-card p,
.pillar p,
.respect-note {
  margin: 0;
  color: var(--muted);
  font-size: .95rem;
  line-height: 1.65;
}

.community-pillars {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(12px, 2vw, 24px);
  margin-top: 20px;
}

.community-card {
  min-width: 0;
  padding: 8px 0;
}

.community-card-image-frame {
  --image-ratio: 1.5;
  position: relative;
  aspect-ratio: var(--image-ratio);
  overflow: hidden;
  border-radius: var(--radius-card);
  margin-bottom: 16px;
}

.community-card-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.community-card-image-frame.is-rotated .community-card-image {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(100% / var(--image-ratio));
  height: calc(100% * var(--image-ratio));
  transform: translate(-50%, -50%) rotate(-90deg);
}

.community-card h3 {
  margin: 0;
  color: var(--matcha-leaf);
  font: 400 1.4rem/1.3 var(--font-display);
}

.community-card p {
  margin: 8px 0 12px;
  color: var(--muted);
  font-size: .95rem;
}

.community-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.community-card li { border-top: 1px solid var(--line); }

.community-card .text-link {
  display: flex;
  justify-content: space-between;
  min-height: 44px;
}

.community-card .text-link span { flex-shrink: 0; }
.social-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
  margin-top: clamp(28px, 4vw, 48px);
  padding: 16px 0 4px;
  border-top: 1px solid var(--line);
}

.social-note p {
  margin: 4px 0 0;
  color: var(--muted);
  line-height: 1.5;
}

.social-note h2 { margin: 0; color: var(--matcha-leaf); font: 400 1.35rem/1.3 var(--font-display); }

.care-guide { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px 28px; }
.pillar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  align-items: start;
  gap: 6px 12px;
  min-width: 0;
}

.pillar h3 { margin: 0; }
.pillar p { grid-column: 2; }

.respect-note {
  margin-top: 22px;
}

.respect-note a { color: var(--matcha-leaf); }

@media (min-width: 901px) {
  .hero-copy p { max-width: none; }
  .pillar p { grid-column: 1 / -1; }
}

@media (max-width: 900px) {
  .hero-section { grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); gap: 20px; }
  .hero-artwork { max-width: 100%; }
}

@media (max-width: 700px) {
  .hero-section { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .hero-artwork { max-width: none; }
}

@media (max-width: 700px) {
  .community-pillars { grid-template-columns: minmax(0, 1fr); }
  .community-card-image-frame { --image-ratio: 2; }
}

@media (max-width: 600px) {
  .home { width: calc(100% - 32px); }
  .hero-section { padding-top: 12px; border-bottom: 0; }
  .hero-copy,
  .hero-copy h1 { min-width: 0; max-width: 100%; }
  .first-visit-layout { grid-template-areas: "copy" "photo" "steps"; grid-template-columns: minmax(0, 1fr); gap: 18px; }
  .care-guide { grid-template-columns: minmax(0, 1fr); }
  .next-gathering { align-items: flex-start; padding: 18px; }
  .next-gathering-link { width: 100%; }
  .hero-artwork { max-width: 420px; margin-inline: auto; }
}
</style>
