<template>
  <main class="activity-page">
    <header class="page-intro">
      <h1 class="hero-title">Riichi Mahjong</h1>
      <p class="stats-container">You draw a tile. Does it bring your hand closer to winning, or is it one to discard? In four-player riichi and three-player sanma, the fun is spotting which tiles fit.</p>
      <NuxtLink class="activity-primary" to="/gatherings/" no-prefetch>See weekly gathering dates <span aria-hidden="true">→</span></NuxtLink>
    </header>

    <section class="activity-content" aria-labelledby="first-hand-title">
      <ActivityOverviewFeature
        src="/images/site/overview-mika-riichi.webp"
        alt="A player holds up a mahjong tile while three friends follow the hand."
      >
        <div class="activity-copy">
          <p class="page-eyebrow">A turn at the table</p>
          <h2 id="first-hand-title">See a hand take shape, one tile at a time.</h2>
          <p>On your turn, draw one tile and discard another. You’re collecting matching sets, number runs and a pair. To win, your complete hand also needs at least one yaku, a recognised pattern or winning condition. We play both four-player riichi and three-player sanma.</p>
          <p><a class="activity-resource-link" href="/guides/riichi-beginner-guide.pdf" target="_blank" rel="noopener">New to riichi? Open our two-page beginner guide (PDF, 11 MB) <span aria-hidden="true">↗</span></a></p>
          <p><NuxtLink class="activity-resource-link" to="/riichi-rules/" no-prefetch>Read the four-player and sanma rules <span aria-hidden="true">→</span></NuxtLink></p>
          <p>Watch a hand and ask what a player is collecting, or try a turn with someone beside you to help.</p>
        </div>
      </ActivityOverviewFeature>
    </section>

    <section class="activity-tools" aria-labelledby="regular-play-title">
      <p class="page-eyebrow">For regular players</p>
      <h2 id="regular-play-title">Play, score and compete.</h2>
      <nav class="activity-links" aria-label="Riichi Mahjong tools and events">
        <NuxtLink to="/riichi-league/" no-prefetch><strong>Riichi League</strong><span>Follow the season standings and weekly results.</span><span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink to="/riichi-calculator/" no-prefetch><strong>Riichi Calculator</strong><span>Check a hand or calculate ron and tsumo payments.</span><span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink to="/riichi-open/" no-prefetch><strong>Riichi Open</strong><span>See tournament standings and event information.</span><span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink to="/riichi-rules/" no-prefetch><strong>Riichi Rules</strong><span>Read our table rules and Riichi Open series rules.</span><span aria-hidden="true">→</span></NuxtLink>
      </nav>
    </section>
  </main>
</template>

<style scoped>
.activity-page { width: min(100% - 40px, 960px); margin: 0 auto; }
.activity-page .page-intro { padding-inline: 0; }
.activity-page .stats-container { max-width: 580px; }
.activity-primary { display: inline-flex; min-height: 48px; align-items: center; gap: 18px; margin: 22px auto 0; padding: 0 22px; border-radius: 6px; background: var(--matcha-leaf); color: white; font-weight: 650; text-decoration: none; }
.activity-content { margin: 18px auto 34px; }
.quick-destinations { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px 18px; margin: 14px auto 0; }
.quick-destinations a { display: inline-flex; min-height: 40px; align-items: center; gap: 7px; color: var(--matcha-leaf); font-size: .88rem; font-weight: 650; text-underline-offset: 4px; }
.activity-copy h2,.activity-tools h2 { margin: 0 0 12px; color: var(--matcha-leaf); font: 400 clamp(1.8rem, 4vw, 2.6rem)/1.2 var(--font-display); }
.activity-copy p:not(.page-eyebrow) { max-width: 560px; color: var(--muted); line-height: 1.75; }
.activity-resource-link { color: var(--matcha-leaf); text-underline-offset: 4px; }
.activity-copy .page-eyebrow,.activity-tools > .page-eyebrow { justify-content: flex-start; margin-bottom: 12px; }
.activity-tools { margin-bottom: 28px; }
.activity-tools .activity-links { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.activity-links a { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; padding: 20px; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--surface-soft); color: var(--matcha-leaf); text-decoration: none; }
.activity-links strong { font: 400 1.25rem/1.3 var(--font-display); }
.activity-links a > span:nth-child(2) { grid-column: 1; color: var(--muted); font-size: .9rem; line-height: 1.5; }
.activity-links a > span:last-child { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
@media (max-width: 600px) { .activity-content { margin-top: 4px; } .activity-links { grid-template-columns: 1fr; gap: 10px; } }
</style>
