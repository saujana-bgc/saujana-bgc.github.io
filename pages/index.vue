<template>
  <main style="width: 100%; display: flex; flex-direction: column; align-items: center;">
    <section class="hero-section fade-up">
      <div class="hero-copy">
        <p class="page-eyebrow">Saujana Board Game Community</p>
        <h1>Good games.<br><em>Even better company.</em></h1>
        <p class="hero-description">Slow afternoons, a new favourite game, and a place at the table. Come as you are. We’ll teach you the rest.</p>
        <div class="hero-actions">
          <NuxtLink to="/gatherings" class="primary-link" no-prefetch>Find a gathering <span aria-hidden="true">↗</span></NuxtLink>
          <NuxtLink to="/collection" class="text-link" no-prefetch>Explore the collection <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <p class="hero-footnote"><span aria-hidden="true"></span> New faces always welcome</p>
      </div>
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

    <div class="welcome-strip"><span>Come solo or bring a friend</span><span>Learn as you play</span><span>Stay for the company</span></div>

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
          <div class="pillar-icon" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</div>
          <h3>{{ pillar.title.split(' ').slice(1).join(' ') }}</h3>
          <p v-html="pillar.content"></p>
        </div>
      </div>
    </section>

    <section v-if="posts.length" class="ig-section fade-up" style="animation-delay: 0.1s;">
      <div class="ig-header">
        <span class="ig-icon" v-html="igSvg" aria-hidden="true"></span>
        <div>
          <p class="ig-sub">The community, lately</p>
          <h2 class="ig-handle">Life around the table</h2>
        </div>
        <a href="https://www.instagram.com/saujana.bgc" target="_blank" rel="noopener noreferrer" class="ig-follow-btn">Follow along ↗</a>
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

  </main>
</template>

<script setup>
import { instagramData } from '~/assets/data/instagram_data.js'

const heroImageSrcset = '/images/site/saujana_bgc_banner_640.avif?v=20260806-hero-v6 640w, /images/site/saujana_bgc_banner_800.avif?v=20260806-hero-v6 800w, /images/site/saujana_bgc_banner_900.avif?v=20260806-hero-v6 900w, /images/site/saujana_bgc_banner_1000.avif?v=20260806-hero-v6 1000w, /images/site/saujana_bgc_banner_1200.avif?v=20260806-hero-v6 1200w, /images/site/saujana_bgc_banner.avif?v=20260806-hero-v6 1920w'
const heroImageSizes = '(min-width: 1200px) 580px, (min-width: 900px) 48vw, 92vw'

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
.hero-section { width: min(1200px, 92%); display: grid; grid-template-columns: 1fr 1.05fr; align-items: center; gap: clamp(28px, 5vw, 72px); padding: 68px 0 52px; }
.hero-copy .page-eyebrow { justify-content: flex-start; font-size: .6rem; }
.hero-copy .page-eyebrow::before, .hero-copy .page-eyebrow::after { display: none; }
.hero-copy h1 { font-family: var(--font-display); font-size: clamp(2.8rem, 4.7vw, 4.4rem); color: var(--matcha-leaf); font-weight: 400; letter-spacing: -.055em; line-height: 1.12; margin: 0; text-wrap: balance; }
.hero-copy h1 em { color: #798064; font-weight: 400; }
.hero-description { max-width: 400px; margin: 24px 0 28px; font-size: 1rem; color: var(--muted); line-height: 1.85; }
.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 22px; }
.primary-link { display: inline-flex; align-items: center; justify-content: space-between; gap: 26px; min-height: 48px; padding: 13px 22px; border-radius: 6px; background: var(--matcha-leaf); color: white; font-size: .82rem; text-decoration: none; transition: background .2s; }
.primary-link:hover { background: #243a2d; }
.text-link { display: inline-flex; gap: 14px; padding: 12px 0; color: var(--matcha-leaf); font-size: .8rem; text-decoration: none; border-bottom: 1px solid var(--line); }
.hero-footnote { display: flex; align-items: center; gap: 8px; margin: 25px 0 0; color: var(--muted); font-size: .73rem; }
.hero-footnote span { width: 5px; height: 5px; border-radius: 50%; background: #798064; }
.banner-container { min-width: 0; padding: 10px; border: 1px solid var(--line); border-radius: 60px 60px 12px 12px; background: #ece8dd; overflow: hidden; }
.hero-banner { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: contain; border-radius: 52px 52px 6px 6px; }
.welcome-strip { display: flex; flex-wrap: wrap; justify-content: center; gap: 18px 64px; width: min(1200px,92%); padding: 22px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); color: var(--muted); font-size: .67rem; letter-spacing: .1em; text-transform: uppercase; }
.welcome-strip span { display: flex; align-items: center; gap: 14px; }
.welcome-strip span::before { content: '✧'; color: var(--gold-leaf); }
.announcement-box { width: min(1120px,92%); margin: 72px auto 0; text-align: center; }
.porch-label { font-size: .65rem; text-transform: uppercase; letter-spacing: .15em; color: var(--gold-leaf); }
.first-timer-note { margin: 18px auto 0; color: var(--matcha-leaf); font-size: .9rem; }
.welcome-note { margin: 32px auto; max-width: 760px; padding: 28px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.welcome-note h3 { font-family: var(--font-display); font-size: 1.5rem; font-weight: 400; color: var(--matcha-leaf); margin: 0 0 10px; }
.welcome-note p { font-size: .9rem; color: var(--muted); margin: 0; }
.welcome-note a { display: inline-block; color: var(--matcha-leaf); font-size: .8rem; margin-top: 16px; }
.expect-guide { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 32px; text-align: left; margin: 44px 0 32px; }
.expect-card { padding: 12px 0; border-top: 1px solid var(--line); }
.expect-card span { color: var(--gold-leaf); font-size: .65rem; letter-spacing: .12em; text-transform: uppercase; }
.expect-card h3 { font-family: var(--font-display); font-size: 1.5rem; font-weight: 400; color: var(--matcha-leaf); margin: 12px 0; }
.expect-card p { color: var(--muted); font-size: .9rem; line-height: 1.8; margin: 0; }
.table-scenes { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 16px; }
.table-scenes img { width: 100%; height: 230px; object-fit: cover; border-radius: 8px; }
.care-guide { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 32px; text-align: left; margin-top: 40px; padding: 32px 0; border-top: 1px solid var(--line); }
.pillar-icon { color: var(--gold-leaf); font-size: .7rem; letter-spacing: .1em; }
.pillar h3 { font-family: var(--font-display); font-size: 1.3rem; font-weight: 400; color: var(--matcha-leaf); margin: 12px 0; }
.pillar p { font-size: .85rem; line-height: 1.8; color: var(--muted); margin: 0; }
.ig-section { width: min(1120px,92%); margin: 44px auto 20px; padding: 36px 0 0; border-top: 1px solid var(--line); }
.ig-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.ig-icon { display: none; }
.ig-handle { font-family: var(--font-display); font-weight: 400; font-size: clamp(1.5rem,3vw,2rem); color: var(--matcha-leaf); margin: 6px 0 0; }
.ig-sub { font-size: .62rem; text-transform: uppercase; letter-spacing: .15em; color: var(--gold-leaf); margin: 0; }
.ig-follow-btn { margin-left: auto; color: var(--matcha-leaf); font-size: .8rem; text-decoration: none; border-bottom: 1px solid var(--line); padding: 12px 0; white-space: nowrap; }
.ig-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
.ig-cell { position: relative; aspect-ratio: 1; overflow: hidden; display: block; border-radius: 6px; background: var(--surface-soft); }
.ig-cell img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .4s; }
.ig-cell:hover img { transform: scale(1.04); }
.ig-overlay { position: absolute; inset: 0; background: linear-gradient(to top,rgba(25,39,28,.85),transparent 90%); opacity: 0; transition: opacity .2s; display: flex; align-items: flex-end; padding: 16px; }
.ig-cell:hover .ig-overlay, .ig-cell:focus-visible .ig-overlay { opacity: 1; }
.ig-caption { color: white; font-size: .75rem; line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.ig-badge { position: absolute; top: 10px; right: 10px; color: white; }
@media (max-width: 899px) {
 .hero-section { grid-template-columns: 1fr; gap: 32px; padding: 40px 0 32px; }
 .hero-copy { max-width: 640px; }
 .hero-copy h1 { font-size: clamp(2.65rem,7vw,4rem); }
 .hero-description { max-width: 540px; }
 .banner-container { border-radius: 80px 80px 10px 10px; }
 .hero-banner { aspect-ratio: 16 / 9; border-radius: 72px 72px 5px 5px; }
 .welcome-strip { gap: 12px 24px; font-size: .6rem; }
 .announcement-box { margin-top: 44px; }
}
@media (max-width: 600px) {
 .expect-guide, .care-guide { grid-template-columns: 1fr; gap: 22px; }
 .care-guide { margin-top: 28px; }
 .pillar { padding-bottom: 10px; }
 .table-scenes { gap: 8px; }
 .table-scenes img { height: 130px; }
 .ig-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
 .welcome-note { padding: 24px 18px; }
 .ig-header { gap: 8px; }
 .ig-follow-btn { font-size: .72rem; }
}
</style>
