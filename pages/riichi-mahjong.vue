<template>
  <main class="activity-page">
    <header class="page-intro">
      <p class="page-eyebrow">Japanese mahjong</p>
      <h1 class="hero-title">Riichi Mahjong</h1>
      <p class="stats-container">Riichi is a Japanese version of mahjong, usually played by four people. Players draw and discard tiles while building a winning hand, a set of groups and a pair. You can learn the flow by watching a hand at the table.</p>
      <NuxtLink class="activity-primary" to="/gatherings/?game=riichi" no-prefetch>Find a riichi gathering <span aria-hidden="true">→</span></NuxtLink>
    </header>

    <section class="activity-content" aria-labelledby="first-hand-title">
      <figure class="activity-art">
        <img src="/images/site/what-we-play-riichi.webp" alt="An illustration of players moving yellow-backed mahjong tiles around a green table." width="900" height="600" loading="lazy">
      </figure>
      <div class="activity-copy">
        <p class="page-eyebrow">A turn at the table</p>
        <h2 id="first-hand-title">Draw a tile. Choose what to keep.</h2>
        <p>On your turn, draw a tile and discard one. You’re trying to make groups, such as three tiles in number order from the same suit, plus a pair. When your tiles make a complete hand, you can win.</p>
        <p>There are more rules for calling tiles and scoring, but you don’t need to memorize them to visit. Watch a hand and ask a player what they’re collecting. If you decide to try a turn, someone at the table can guide you through it.</p>
      </div>
    </section>

    <section class="activity-tools" aria-labelledby="regular-play-title">
      <p class="page-eyebrow">For regular players</p>
      <h2 id="regular-play-title">Play, score and compete.</h2>
      <nav class="activity-links" aria-label="Riichi Mahjong tools and events">
        <NuxtLink to="/riichi-league/" no-prefetch><strong>Riichi League</strong><span>Follow the season standings and weekly results.</span><span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink to="/riichi-calculator/" no-prefetch><strong>Riichi Calculator</strong><span>Check a hand or calculate ron and tsumo payments.</span><span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink to="/riichi-open/" no-prefetch><strong>Riichi Open I</strong><span>See tournament information and event updates.</span><span aria-hidden="true">→</span></NuxtLink>
      </nav>
    </section>
  </main>
</template>

<style scoped>
.activity-page { width: min(100% - 40px, 960px); margin: 0 auto; }
.activity-page .page-intro { padding-inline: 0; }
.activity-page .stats-container { max-width: 580px; }
.activity-primary { display: inline-flex; min-height: 48px; align-items: center; gap: 18px; margin: 22px auto 0; padding: 0 22px; border-radius: 6px; background: var(--matcha-leaf); color: white; font-weight: 650; text-decoration: none; }
.activity-content { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 300px); align-items: center; gap: clamp(24px, 6vw, 72px); margin: 18px auto 34px; }
.activity-copy h2,.activity-tools h2 { margin: 0 0 12px; color: var(--matcha-leaf); font: 400 clamp(1.8rem, 4vw, 2.6rem)/1.2 var(--font-display); }
.activity-copy p:not(.page-eyebrow) { max-width: 560px; color: var(--muted); line-height: 1.75; }
.activity-copy .page-eyebrow,.activity-tools > .page-eyebrow { justify-content: flex-start; margin-bottom: 12px; }
.activity-art { margin: 0; }
.activity-art img { display: block; width: 100%; max-height: 300px; border-radius: var(--radius-card); object-fit: cover; }
.activity-tools { margin-bottom: 28px; }
.activity-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.activity-links a { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; padding: 20px; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--surface-soft); color: var(--matcha-leaf); text-decoration: none; }
.activity-links strong { font: 400 1.25rem/1.3 var(--font-display); }
.activity-links a > span:nth-child(2) { grid-column: 1; color: var(--muted); font-size: .9rem; line-height: 1.5; }
.activity-links a > span:last-child { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
@media (max-width: 600px) { .activity-content { grid-template-columns: 1fr; gap: 12px; margin-top: 4px; } .activity-content .activity-art { order: 2; } .activity-art img { max-height: 210px; } .activity-links { grid-template-columns: 1fr; gap: 10px; } }
</style>
