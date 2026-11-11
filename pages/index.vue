<template>
  <main class="home">
    <section class="hero-section" aria-labelledby="home-title">
      <div class="hero-copy">
        <h1 id="home-title" class="hero-title">Come play with Saujana</h1>
        <p>Join us for board games and riichi mahjong. Come on your own or bring a friend. We’ll teach you the rules.</p>
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

    <section id="first-visit" class="home-section" aria-labelledby="first-visit-title" tabindex="-1">
      <div class="first-visit-layout">
        <div class="first-visit-copy">
          <h2 id="first-visit-title" class="hero-title story-title">Your first gathering</h2>
          <p class="section-intro">New to Saujana? Here’s how a first visit can go. <NuxtLink to="/gatherings" no-prefetch>See dates, venues and sign-up details</NuxtLink>.</p>
          <div class="expect-guide">
            <article v-for="item in expectations" :key="item.title" class="expect-card">
              <h3>{{ item.title }}</h3>
              <p>{{ item.copy }}</p>
            </article>
          </div>
        </div>
        <img class="first-visit-photo" src="/images/site/table_scene_2.avif" alt="Saujana players sharing a game at a café." loading="lazy" decoding="async" width="640" height="480">
      </div>
    </section>

    <section class="riichi-panel" aria-labelledby="riichi-title">
      <div>
        <h2 id="riichi-title" class="hero-title story-title">Explore riichi mahjong</h2>
        <p class="section-intro">Curious about Japanese mahjong? Explore our tools, league standings and tournament.</p>
      </div>
      <nav class="riichi-discovery" aria-label="Explore riichi mahjong">
        <NuxtLink class="text-link" to="/riichi-calculator" no-prefetch>Scoring calculator <span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink class="text-link" to="/riichi-league" no-prefetch>League and standings <span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink class="text-link" to="/riichi-open" no-prefetch>Riichi Open I tournament <span aria-hidden="true">→</span></NuxtLink>
      </nav>
    </section>

    <section class="home-section" aria-labelledby="community-values-title">
      <h2 id="community-values-title" class="hero-title story-title">Good company is something we make</h2>
      <p class="section-intro">In Malay, <em>saujana</em> evokes an expanse stretching as far as the eye can see. We like that sense of possibility: another game to try, another story to hear, someone new to meet.</p>
      <div class="care-guide">
        <div v-for="pillar in pillars" :key="pillar.title" class="pillar">
          <h3>{{ pillar.title }}</h3>
          <p>{{ pillar.content }}</p>
        </div>
      </div>
      <p class="respect-note">Everyone should feel welcome and respected. Harassment and disruptive behaviour have no place here. If something feels wrong, <a href="https://wa.me/saujanabgc" target="_blank" rel="noopener noreferrer">message an admin privately on WhatsApp</a>.</p>
    </section>

    <section class="social-note" aria-label="Follow Saujana on Instagram">
      <p>Photos and recaps from the community</p>
      <a class="text-link" href="https://www.instagram.com/saujana.bgc" target="_blank" rel="noopener noreferrer">See Saujana on Instagram <span aria-hidden="true">↗</span></a>
    </section>

  </main>
</template>

<script setup>
const pillars = [
  {
    title: 'Make the first hello',
    content: 'Notice someone new? Introduce yourself and invite them into a game. A small welcome makes arriving alone much easier.'
  },
  {
    title: 'Stay curious',
    content: 'Ask questions, try an unfamiliar game, and give each other time to learn. Nobody needs to get every rule right on the first go.'
  },
  {
    title: 'Care for the table',
    content: 'Handle the games with care, order something at the venue, and lend a hand packing up. Keep your sign-up current so the host can plan for everyone.'
  }
]

const expectations = [
  {
    title: 'Say hello',
    copy: 'Find the host, mention it’s your first visit, and take a moment to settle in.'
  },
  {
    title: 'Find your game',
    copy: 'Tell us what you enjoy. We’ll suggest a game and walk you through the rules.'
  },
  {
    title: 'See where it goes',
    copy: 'Watch a round or join in. Take your time finding your pace.'
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
  display: grid;
  grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr);
  align-items: center;
  gap: clamp(28px, 6vw, 80px);
}

.hero-copy h1 {
  max-width: 14ch;
  font-size: clamp(2.45rem, 5.5vw, 4.8rem);
}

.hero-copy p {
  max-width: 37ch;
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
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr);
  align-items: center;
  gap: clamp(24px, 4vw, 48px);
}

.story-title { font-size: clamp(1.7rem, 4vw, 2.55rem); }

.section-intro {
  max-width: 64ch;
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.7;
}

.section-intro a { color: var(--matcha-leaf); }

.expect-guide,
.care-guide {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 20px;
}

.expect-card {
  padding: 4px clamp(14px, 2.2vw, 26px) 4px 0;
}

.expect-card + .expect-card {
  padding-left: clamp(14px, 2.2vw, 26px);
  border-left: 1px solid var(--line);
}

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
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  align-items: center;
  gap: 12px 28px;
  padding: clamp(20px, 4vw, 40px);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--lavender-mist);
}

.riichi-discovery {
  display: grid;
}

.riichi-discovery a {
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  text-decoration: none;
}

.riichi-discovery a:last-child { border-bottom: 0; }

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

.care-guide { gap: 20px 28px; }

.respect-note {
  max-width: 75ch;
  margin-top: 22px;
}

.respect-note a { color: var(--matcha-leaf); }

@media (max-width: 900px) {
  .hero-section,
  .riichi-panel,
  .first-visit-layout { grid-template-columns: minmax(0, 1fr); }
  .hero-section { gap: 16px; }
  .hero-artwork { max-width: none; }
}

@media (max-width: 600px) {
  .home { width: calc(100% - 32px); }
  .hero-copy,
  .hero-copy h1 { min-width: 0; max-width: 100%; }
  .expect-guide,
  .care-guide { grid-template-columns: minmax(0, 1fr); }
  .expect-card,
  .expect-card + .expect-card {
    padding: 14px 0;
    border-left: 0;
  }
  .expect-card + .expect-card { border-top: 1px solid var(--line); }
  .first-visit-layout { gap: 18px; }
}
</style>
