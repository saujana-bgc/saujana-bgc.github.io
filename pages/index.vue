<template>
  <main style="width: 100%; display: flex; flex-direction: column; align-items: center;">
    <section class="hero-section fade-up">
      <div class="banner-container">
        <img
          class="hero-banner"
          src="/images/site/saujana_bgc_banner_640.avif?v=20260806-hero-v6"
          :srcset="heroImageSrcset"
          :sizes="heroImageSizes"
          alt="Saujana BG Community banner"
          width="1920"
          height="1080"
          loading="eager"
          fetchpriority="high"
        >
      </div>
    </section>

    <section v-if="posts.length" class="ig-section fade-up" style="animation-delay: 0.1s;">
      <div class="ig-header">
        <span class="ig-icon" v-html="igSvg" aria-hidden="true"></span>
        <div>
          <p class="ig-handle">@saujana.bgc</p>
          <p class="ig-sub">Recent Instagram posts</p>
        </div>
        <a href="https://www.instagram.com/saujana.bgc" target="_blank" class="ig-follow-btn">Follow</a>
      </div>

      <div class="ig-grid">
        <a
          v-for="post in posts"
          :key="post.shortcode"
          :href="post.url"
          target="_blank"
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
          <div class="ig-overlay">
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

    <section class="announcement-box fade-up" style="animation-delay: 0.2s;">
      <h2 class="hero-title" style="font-size: clamp(1.8rem, 6vw, 2.5rem); margin-bottom: 15px; padding: 0;">Board games, easy company</h2>
      <p class="porch-label">Casual afternoons, welcoming tables</p>
      <div class="first-timer-note">
        Come solo or with friends. No experience needed.
      </div>
      <p style="font-size: 1rem; font-weight: 300; line-height: 1.9; max-width: 640px; margin: 20px auto 0; opacity: 0.85;">
        Saujana Board Game Community is a casual meetup for people who want to learn a game, share a few laughs, and spend an afternoon at an easy pace.
      </p>

      <div class="welcome-note">
        <h3>Join an upcoming gathering</h3>
        <p>Check the date, venue, and headcount, then add your name when you are ready.</p>
        <a href="/gatherings">See gatherings</a>
      </div>

      <div class="expect-guide">
        <article v-for="item in expectations" :key="item.title" class="expect-card">
          <span>{{ item.step }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.copy }}</p>
        </article>
      </div>

      <div class="table-scenes" aria-label="Scenes from Saujana gatherings">
        <img src="/images/site/table_scene_1.avif" alt="Players gathered around a Saujana board game table" loading="lazy" decoding="async" width="640" height="480">
        <img src="/images/site/table_scene_2.avif" alt="Friends playing together at a Saujana gathering" loading="lazy" decoding="async" width="640" height="480">
        <img src="/images/site/table_scene_3.avif" alt="Board games prepared for a Saujana meetup" loading="lazy" decoding="async" width="640" height="480">
      </div>

      <div class="care-guide">
        <div v-for="(pillar, i) in pillars" :key="pillar.title" class="pillar" :style="{ animationDelay: (0.15 + i * 0.1) + 's' }">
          <div class="pillar-icon">{{ pillar.title.split(' ')[0] }}</div>
          <h3>{{ pillar.title.split(' ').slice(1).join(' ') }}</h3>
          <p v-html="pillar.content"></p>
        </div>
      </div>
    </section>

  </main>
</template>

<script setup>
import { instagramData } from '~/assets/data/instagram_data.js'

const heroImageSrcset = '/images/site/saujana_bgc_banner_640.avif?v=20260806-hero-v6 640w, /images/site/saujana_bgc_banner_800.avif?v=20260806-hero-v6 800w, /images/site/saujana_bgc_banner_900.avif?v=20260806-hero-v6 900w, /images/site/saujana_bgc_banner_1000.avif?v=20260806-hero-v6 1000w, /images/site/saujana_bgc_banner_1200.avif?v=20260806-hero-v6 1200w, /images/site/saujana_bgc_banner.avif?v=20260806-hero-v6 1920w'
const heroImageSizes = '(min-width: 978px) 900px, (min-width: 768px) 92vw, 90vw'

const posts = computed(() => (instagramData?.posts ?? []).slice(0, 4))
const getInstagramThumb = (src) => `/${src.replace('images/instagram/', 'images/instagram/thumbs/')}`

const igSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="28" height="28"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>`

const pillars = [
  {
    title: '🍃 Stewardship',
    content: 'We support the venues that host us and leave each space ready for the next group.'
  },
  {
    title: '✨ Spirit of Play',
    content: 'We play for the shared moment. RSVP thoughtfully, be patient with rules, and help pack up when you can.'
  },
  {
    title: '🛡️ Respect',
    content: 'Harassment and disruptive behavior are not tolerated. Message an admin privately if anything feels off.'
  }
]

const expectations = [
  {
    step: 'Arrive',
    title: 'Arrive easy',
    copy: 'Say hi, order from the venue, and take a few minutes to settle in.'
  },
  {
    step: 'Learn',
    title: 'Find a fit',
    copy: 'Hosts and regulars can suggest a game that matches the group.'
  },
  {
    step: 'Play',
    title: 'Play your way',
    copy: 'Start light, watch a round, or join a deeper game if it feels right.'
  }
]
</script>

<style scoped>
/* --- PORCH LABEL --- */
.porch-label {
    display: inline-block;
    margin-top: 12px;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    font-weight: 600;
    color: var(--gold-leaf);
    opacity: 0.9;
}

/* --- HERO & BANNER --- */
.hero-section {
    width: 90%;
    max-width: 900px;
    padding-top: clamp(14px, 2vw, 22px);
    text-align: center;
    box-sizing: border-box;
}

.banner-container {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
}

.hero-banner {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(74, 68, 63, 0.12);
    border: 4px solid var(--white-pure);
    margin: 0 auto;
    transition: box-shadow 0.4s;
}

.hero-banner:hover {
    box-shadow: 0 18px 50px rgba(74, 68, 63, 0.16);
}

/* --- MAIN CONTENT CARD --- */
.announcement-box {
    background: var(--white-pure);
    border-radius: 35px;
    padding: var(--section-pad);
    box-shadow: inset 0 3px 0 var(--gold-leaf), 0 20px 60px rgba(160, 100, 110, 0.1);
    border: 1px solid rgba(201, 190, 239, 0.12);
    max-width: 900px; width: 90%; margin: 30px auto; text-align: center;
    box-sizing: border-box;
}

.welcome-note {
    margin: 34px auto 0;
    max-width: 660px;
    padding: 26px;
    border-radius: 24px;
    background: linear-gradient(135deg, var(--rose-dust), var(--lavender-mist));
    box-shadow: inset 0 3px 0 var(--gold-leaf);
}

.welcome-note h3 {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    color: var(--matcha-leaf);
    font-size: 1.35rem;
    margin: 0 0 10px;
}

.welcome-note p {
    margin: 0 auto;
    max-width: 560px;
    font-size: 0.95rem;
    line-height: 1.8;
    opacity: 0.86;
}

.welcome-note a {
    display: inline-block;
    margin-top: 18px;
    color: var(--matcha-leaf);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    text-decoration: none;
    border-bottom: 1px solid var(--gold-leaf);
}

.first-timer-note {
    margin: 18px auto 0;
    max-width: 620px;
    padding: 14px 18px;
    border-radius: 999px;
    background: rgba(237, 232, 245, 0.72);
    color: var(--matcha-leaf);
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 1.6;
    box-shadow: inset 0 0 0 1px rgba(107, 122, 104, 0.08);
}

.expect-guide {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    margin-top: 28px;
    text-align: left;
}

.expect-card {
    padding: 22px;
    border-radius: 20px;
    border: 1px solid rgba(107, 122, 104, 0.1);
    background: rgba(255,255,255,0.72);
}

.expect-card span {
    color: var(--gold-leaf);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-transform: uppercase;
}

.expect-card h3 {
    margin: 8px 0;
    color: var(--matcha-leaf);
    font-size: 0.98rem;
}

.expect-card p {
    margin: 0;
    font-size: 0.84rem;
    line-height: 1.7;
    opacity: 0.78;
}

.table-scenes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 30px;
    border-radius: 22px;
    overflow: hidden;
}

.table-scenes img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    display: block;
}

/* --- PILLARS --- */
.care-guide {
    display: grid; grid-template-columns: 1fr;
    gap: 20px; text-align: left; margin-top: 40px;
    padding-top: 40px; border-top: 1px solid rgba(107, 122, 104, 0.1);
}

.pillar {
    background: var(--rose-dust);
    border-radius: 20px;
    padding: 28px;
    border-top: none;
    box-shadow: inset 0 3px 0 var(--gold-leaf), 0 4px 16px rgba(160, 100, 120, 0.06);
    transition: transform 0.35s ease, box-shadow 0.35s ease;
    animation: fadeSlideUp 0.65s ease both;
}

.pillar:nth-child(2) {
    background: var(--lavender-mist);
    box-shadow: inset 0 3px 0 var(--lavender-mid), 0 4px 16px rgba(140, 120, 190, 0.08);
}

.pillar:hover {
    transform: translateY(-4px);
    box-shadow: inset 0 3px 0 var(--gold-leaf), 0 14px 36px rgba(160, 100, 120, 0.12);
}

.pillar:nth-child(2):hover {
    box-shadow: inset 0 3px 0 var(--lavender-mid), 0 14px 36px rgba(140, 120, 190, 0.13);
}

.pillar-icon {
    font-size: 1.6rem;
    margin-bottom: 12px;
}

.pillar h3 {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    color: var(--matcha-leaf);
    font-size: 1.15rem;
    margin: 0 0 10px;
}

.pillar p { font-size: 0.9rem; line-height: 1.7; margin: 0; opacity: 0.85; }

@media (max-width: 767px) {
    .care-guide { margin-top: 24px; padding-top: 24px; gap: 16px; }
}

@media (min-width: 768px) {
    .hero-section { width: 92%; }
    .announcement-box { border-radius: 50px; width: 92%; }
    .expect-guide { grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .table-scenes img { height: 190px; }
    .care-guide { grid-template-columns: repeat(3, 1fr); gap: 30px; }
    .pillar { padding: 35px; border-radius: 24px; }
}

/* --- INSTAGRAM SECTION --- */
.ig-section {
    width: 90%;
    max-width: 900px;
    margin: 20px auto 0;
    background: var(--white-pure);
    border-radius: 35px;
    padding: var(--section-pad);
    box-shadow: inset 0 3px 0 #B48682, 0 20px 60px rgba(122, 92, 76, 0.1);
    border: 1px solid rgba(201, 190, 239, 0.12);
    box-sizing: border-box;
}

.ig-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 22px;
}

.ig-icon {
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, #B48682, #7C8475);
    border-radius: 12px;
    padding: 8px;
    color: white;
    flex-shrink: 0;
}

.ig-handle {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--clay-text);
    margin: 0;
}

.ig-sub {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--matcha-leaf);
    margin: 3px 0 0;
}

.ig-follow-btn {
    margin-left: auto;
    background: linear-gradient(135deg, #B48682, #7C8475);
    color: white;
    border-radius: 40px;
    padding: 8px 22px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    text-decoration: none;
    transition: opacity 0.25s, transform 0.25s;
    flex-shrink: 0;
}

.ig-follow-btn:hover {
    opacity: 0.88;
    transform: translateY(-2px);
}

.ig-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    border-radius: 16px;
    overflow: hidden;
}

.ig-cell {
    position: relative;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    display: block;
    background: var(--rose-dust);
}

.ig-cell img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
}

.ig-cell:hover img {
    transform: scale(1.04);
}

.ig-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(74, 68, 63, 0.72) 0%, transparent 55%);
    opacity: 0;
    transition: opacity 0.3s ease;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 12px;
    box-sizing: border-box;
}

.ig-cell:hover .ig-overlay {
    opacity: 1;
}

.ig-caption {
    color: white;
    font-size: 0.72rem;
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.ig-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    color: white;
    display: flex;
    align-items: center;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}

@media (min-width: 540px) {
    .ig-grid { grid-template-columns: repeat(4, 1fr); }
    .ig-section { border-radius: 50px; width: 92%; }
}

</style>
