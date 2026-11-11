<template>
  <main class="home">
    <section class="hero-section" aria-labelledby="home-title">
      <div class="hero-copy">
        <h1 id="home-title" class="hero-title">Pull up a chair. Let’s play.</h1>
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
      <h2 id="first-visit-title" class="hero-title story-title">Your first gathering</h2>
      <p class="section-intro">Check the date, venue and sign-up details for <NuxtLink to="/gatherings" no-prefetch>an upcoming gathering</NuxtLink>.</p>
      <div class="expect-guide">
        <article v-for="item in expectations" :key="item.title" class="expect-card">
          <h3>{{ item.title }}</h3>
          <p>{{ item.copy }}</p>
        </article>
      </div>
    </section>

    <section class="riichi-panel" aria-labelledby="riichi-title">
      <div>
        <h2 id="riichi-title" class="hero-title story-title">Explore riichi mahjong</h2>
        <p class="section-intro">Curious about Japanese mahjong? Ask the host about riichi at a gathering.</p>
      </div>
      <nav class="riichi-discovery" aria-label="Explore riichi mahjong">
        <NuxtLink class="text-link" to="/riichi-calculator" no-prefetch>Scoring calculator <span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink class="text-link" to="/riichi-league" no-prefetch>League and standings <span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink class="text-link" to="/riichi-open" no-prefetch>Riichi Open I tournament <span aria-hidden="true">→</span></NuxtLink>
      </nav>
    </section>

    <section class="home-section" aria-labelledby="name-story-title">
      <h2 id="name-story-title" class="hero-title story-title">Why Saujana?</h2>
      <p class="section-intro">In Malay, <em>saujana</em> evokes an expanse stretching as far as the eye can see. We like that sense of possibility: another game to try, another story to hear, someone new to meet.</p>
      <div class="table-scenes">
        <img src="/images/site/table_scene_1.avif" alt="A group of Saujana players holding their board games." loading="lazy" decoding="async" width="640" height="480">
        <img src="/images/site/table_scene_2.avif" alt="Saujana players posing with games at a café." loading="lazy" decoding="async" width="640" height="480">
      </div>
    </section>

    <section class="home-section" aria-labelledby="community-values-title">
      <h2 id="community-values-title" class="hero-title story-title">Good company is something we make</h2>
      <div class="care-guide">
        <div v-for="pillar in pillars" :key="pillar.title" class="pillar">
          <h3>{{ pillar.title }}</h3>
          <p>{{ pillar.content }}</p>
        </div>
      </div>
      <p class="respect-note">Everyone should feel welcome and respected. Harassment and disruptive behaviour have no place here. If something feels wrong, message an admin privately.</p>
    </section>

    <section v-if="posts.length" class="home-section" aria-labelledby="instagram-title">
      <div class="ig-header">
        <h2 id="instagram-title" class="hero-title story-title">Saujana on Instagram</h2>
        <a href="https://www.instagram.com/saujana.bgc" target="_blank" rel="noopener noreferrer" class="text-link">Visit our profile <span aria-hidden="true">↗</span></a>
      </div>

      <div class="ig-grid">
        <a
          v-for="post in posts"
          :key="post.shortcode"
          :href="post.url"
          target="_blank"
          rel="noopener noreferrer"
          class="ig-cell"
        >
          <img
            :src="getInstagramThumb(post.img)"
            :alt="post.caption || 'Instagram post'"
            width="360"
            height="360"
            loading="lazy"
            decoding="async"
          />
          <span class="ig-open" aria-hidden="true">↗</span>
          <div class="ig-overlay" aria-hidden="true">
            <span v-if="post.is_sidecar" class="ig-badge">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M3 4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2H3a1 1 0 0 1-1-1V4zm2 9v1h10V6h-1v7a1 1 0 0 1-1 1H5zm-1-2h9V4H4v7z"/></svg>
            </span>
            <span v-if="post.is_video" class="ig-badge">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84z"/></svg>
            </span>
            <p class="ig-caption">{{ post.caption }}</p>
          </div>
        </a>
      </div>
    </section>

  </main>
</template>

<script setup>
import { instagramData } from '~/assets/data/instagram_data.js'


const posts = computed(() => (instagramData?.posts ?? []).slice(0, 4))
const getInstagramThumb = (src) => `/${src.replace('images/instagram/', 'images/instagram/thumbs/')}`

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
    copy: 'Find the host when you arrive. Let us know it’s your first visit, and take a moment to settle in.'
  },
  {
    title: 'Find your game',
    copy: 'Fancy something quick, clever, or a little chaotic? Ask for a suggestion. We’ll walk you through the rules.'
  },
  {
    title: 'See where it goes',
    copy: 'Watch a round, start with something light, or settle into a longer game. You can find your pace as you go.'
  }
]
</script>

<style scoped>
.home {
  width: min(1160px, calc(100% - 40px));
  margin-inline: auto;
  padding-bottom: 12px;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
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

.hero-artwork { margin: 0; }

.hero-banner,
.table-scenes img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-card);
}

.home-section,
.riichi-panel {
  margin-top: clamp(32px, 5.5vw, 68px);
}

.home-section {
  padding-top: clamp(24px, 3.5vw, 40px);
  border-top: 1px solid var(--line);
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
  gap: 14px;
  margin-top: 20px;
}

.expect-card {
  padding: clamp(16px, 2.2vw, 26px);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--white-pure);
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
}

.riichi-discovery a:last-child { border-bottom: 0; }

.table-scenes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.care-guide { gap: 20px 28px; }

.respect-note {
  max-width: 75ch;
  margin-top: 22px;
}

.ig-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0 16px;
  margin-bottom: 14px;
}

.ig-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.ig-cell {
  position: relative;
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--radius-control);
  background: var(--surface-soft);
}

.ig-cell img { display: block; width: 100%; height: 100%; object-fit: cover; }

.ig-open {
  position: absolute;
  z-index: 1;
  top: 8px;
  right: 8px;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  background: var(--white-pure);
  color: var(--matcha-leaf);
}

.ig-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: 12px;
  background: linear-gradient(to top, rgba(25, 39, 28, .9), transparent 85%);
  opacity: 0;
  transition: opacity .2s;
}

.ig-cell:hover .ig-overlay,
.ig-cell:focus-visible .ig-overlay { opacity: 1; }

.ig-caption {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: white;
  font-size: .8rem;
  line-height: 1.4;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.ig-badge { position: absolute; top: 14px; left: 14px; color: white; }

@media (max-width: 760px) {
  .hero-section,
  .riichi-panel { grid-template-columns: minmax(0, 1fr); }
  .hero-section { gap: 22px; }
  .hero-artwork { max-width: 640px; }
}

@media (max-width: 600px) {
  .home { width: calc(100% - 32px); }
  .expect-guide,
  .care-guide { grid-template-columns: minmax(0, 1fr); }
  .table-scenes,
  .ig-grid { gap: 10px; }
  .ig-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
