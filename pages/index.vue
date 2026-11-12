<template>
  <main class="home">
    <section class="hero-section" aria-labelledby="home-title">
      <div class="hero-copy">
        <h1 id="home-title" class="hero-title">Come play with Saujana</h1>
        <p>Board games and riichi mahjong, with help learning the rules. Come solo or bring a friend.</p>
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

    <section class="next-gathering" aria-labelledby="next-gathering-title" aria-live="polite">
      <div>
        <p class="next-gathering-label">Something to look forward to</p>
        <h2 id="next-gathering-title" class="next-gathering-title">{{ nextGathering ? nextGathering.name : 'Find your next gathering' }}</h2>
        <div v-if="nextGathering" class="next-gathering-details">
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
        </div>
        <p v-else class="next-gathering-details">See upcoming dates, venues and sign-up details.</p>
      </div>
      <NuxtLink class="next-gathering-link" :to="nextGathering ? `/gatherings#gathering-${nextGathering.id}` : '/gatherings'" no-prefetch>
        {{ nextGathering ? 'See gathering details' : 'See upcoming gatherings' }} <span aria-hidden="true">→</span>
      </NuxtLink>
    </section>

    <section id="first-visit" class="home-section" aria-labelledby="first-visit-title" tabindex="-1">
      <div class="first-visit-layout">
        <div class="first-visit-copy">
          <h2 id="first-visit-title" class="hero-title story-title">Your first gathering</h2>
          <p class="section-intro">New to Saujana? Here’s how a first visit can go. <NuxtLink to="/gatherings" no-prefetch>See dates, venues and sign-up details</NuxtLink>.</p>
        </div>
        <img class="first-visit-photo" src="/images/site/first-gathering-cafe.webp" alt="Saujana players chatting around a café table scattered with cards and tokens." loading="lazy" decoding="async" width="1200" height="900">
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

    <section class="home-section" aria-labelledby="community-values-title">
      <h2 id="community-values-title" class="hero-title story-title">Good company is something we make</h2>
      <p class="section-intro">In Malay, <em>saujana</em> evokes an expanse as far as the eye can see. To us, it’s another game to try, another story to hear, someone new to meet.</p>
      <div class="care-guide">
        <div v-for="pillar in pillars" :key="pillar.title" class="pillar">
          <svg class="pillar-icon" aria-hidden="true" viewBox="0 0 24 24"><path :d="pillar.icon"/></svg>
          <h3>{{ pillar.title }}</h3>
          <p>{{ pillar.content }}</p>
        </div>
      </div>
      <p class="respect-note">Everyone should feel welcome and respected. Harassment and disruptive behaviour have no place here. If something feels wrong, <a href="https://wa.me/saujanabgc" target="_blank" rel="noopener noreferrer">message an admin privately on WhatsApp</a>.</p>
    </section>

    <section class="riichi-panel" aria-labelledby="riichi-title">
      <div>
        <h2 id="riichi-title" class="hero-title story-title">Explore riichi mahjong</h2>
        <p class="section-intro">Curious about Japanese mahjong? Explore our tools, league standings and tournament.</p>
      </div>
      <nav class="riichi-discovery" aria-label="Explore riichi mahjong">
        <NuxtLink class="text-link" to="/riichi-calculator" no-prefetch><svg class="link-icon" aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2"/></svg>Riichi mahjong calculator <span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink class="text-link" to="/riichi-league" no-prefetch><svg class="link-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 20V11m8 9V4m8 16v-6M2 20h20"/><path d="m4 8 6-4 6 5 5-5"/></svg>Riichi mahjong league <span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink class="text-link" to="/riichi-open" no-prefetch><svg class="link-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>Riichi Open I <span aria-hidden="true">→</span></NuxtLink>
      </nav>
    </section>

    <section class="social-note" aria-label="Follow Saujana on Instagram">
      <p>Photos and recaps from the community</p>
      <a class="text-link" href="https://www.instagram.com/saujana.bgc" target="_blank" rel="noopener noreferrer">See Saujana on Instagram <span aria-hidden="true">↗</span></a>
    </section>

  </main>
</template>

<script setup>
const nextGathering = ref(null)

onMounted(async () => {
  const { data, error } = await useSupabase()
    .from('events')
    .select('id,name,date,time,venue')
    .gte('date', new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()))
    .order('date', { ascending: true })
    .limit(1)

  if (!error) nextGathering.value = data?.[0] ?? null
})

function formatGatheringDate(dateValue) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

const pillars = [
  {
    title: 'Make the first hello',
    icon: 'M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6a7.5 7.5 0 1 1 17-3.5Z',
    content: 'Notice someone new? Introduce yourself and invite them into a game. A small welcome makes arriving alone much easier.'
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
    title: 'Say hello',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
    copy: 'Find the host, mention it’s your first visit, and take a moment to settle in.'
  },
  {
    title: 'Find your game',
    icon: 'M3 7h18v13H3zM7 7V4h10v3M8 12h8M8 16h5',
    copy: 'Tell us what you enjoy. We’ll suggest a game and walk you through the rules.'
  },
  {
    title: 'Watch or join in',
    icon: 'M3 5h18v12H3zM8 21h8m-4-4v4M10 9l5 2-5 2z',
    copy: 'Watch a round or play at your own pace.'
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
  padding: clamp(20px, 4vw, 40px);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface-soft);
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
  gap: 6px 18px;
  margin-top: 24px;
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
  margin-top: clamp(20px, 3vw, 36px);
  padding: 18px 22px;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--lavender-mist);
}

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
.gathering-detail svg, .guide-icon, .pillar-icon, .link-icon {
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

.first-visit-photo {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-card);
  object-fit: cover;
}

.home-section,
.riichi-panel {
  margin-top: clamp(32px, 5.5vw, 68px);
}

.home-section {
  padding-top: clamp(24px, 3.5vw, 40px);
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
.first-visit-photo { grid-area: photo; }
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

.riichi-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 12px 28px;
  padding: clamp(20px, 4vw, 40px);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--lavender-mist);
}

.riichi-discovery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.riichi-discovery a {
  min-height: 56px;
  justify-content: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  text-decoration: none;
}

.riichi-discovery a:hover { background: rgba(255, 254, 250, .65); }
.riichi-discovery a span { margin-left: auto; }
.link-icon { color: var(--gold-leaf); }

.first-visit-photo {
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

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
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

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
  .hero-section,
  .riichi-panel { grid-template-columns: minmax(0, 1fr); }
  .hero-section { gap: 16px; }
  .hero-artwork { max-width: none; }
}

@media (max-width: 600px) {
  .home { width: calc(100% - 32px); }
  .hero-copy,
  .hero-copy h1 { min-width: 0; max-width: 100%; }
  .first-visit-layout { grid-template-areas: "copy" "photo" "steps"; grid-template-columns: minmax(0, 1fr); gap: 18px; }
  .care-guide, .riichi-discovery { grid-template-columns: minmax(0, 1fr); }
  .riichi-discovery { gap: 0; }
  .riichi-discovery a { border: 0; border-bottom: 1px solid var(--line); border-radius: 0; padding-inline: 0; }
  .riichi-discovery a:last-child { border-bottom: 0; }
  .next-gathering { align-items: flex-start; padding: 18px; }
  .next-gathering-link { width: 100%; }
  .hero-artwork { max-width: 420px; margin-inline: auto; }
}
</style>
