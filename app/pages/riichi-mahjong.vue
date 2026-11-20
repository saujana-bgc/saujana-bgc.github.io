<template>
  <main class="activity-page">
    <header class="page-intro">
      <h1 class="hero-title">Riichi Mahjong</h1>
      <p class="stats-container">You draw a tile. Does it bring your hand closer to winning, or is it one to discard? In four-player riichi and three-player sanma, the fun is spotting which tiles fit.</p>
      <NuxtLink class="activity-primary" to="/gatherings/" no-prefetch>Find a gathering <span aria-hidden="true">→</span></NuxtLink>
      <nav class="quick-destinations" aria-label="Riichi Mahjong pages">
        <NuxtLink to="/riichi-rules/" no-prefetch>Riichi Rules</NuxtLink>
        <NuxtLink to="/riichi-calculator/" no-prefetch>Riichi Calculator</NuxtLink>
        <NuxtLink to="/riichi-league/" no-prefetch>Riichi League</NuxtLink>
        <NuxtLink to="/riichi-open/" no-prefetch>Riichi Open I results</NuxtLink>
      </nav>
    </header>

    <section class="activity-content" aria-labelledby="first-hand-title">
      <ActivityOverviewFeature
        src="/images/site/overview-mika-riichi-1200.avif"
        src-set="/images/site/overview-mika-riichi-480.avif 480w, /images/site/overview-mika-riichi-800.avif 800w, /images/site/overview-mika-riichi-1200.avif 1200w"
        sizes="(max-width: 680px) calc(100vw - 2.5rem), (max-width: 1000px) 40vw, 384px"
        alt="A player holds up a mahjong tile while three friends follow the hand."
      >
        <div class="activity-copy">
          <p class="page-eyebrow">A turn at the table</p>
          <h2 id="first-hand-title">Watch a hand take shape, one tile at a time.</h2>
          <p>On your turn, draw one tile and discard another. You’re collecting matching sets, number runs and a pair. To win, your complete hand also needs at least one yaku, a recognised pattern or winning condition. We play both four-player riichi and three-player sanma.</p>
          <p><a class="activity-resource-link" href="/guides/riichi-beginner-guide.pdf" target="_blank" rel="noopener">New to riichi? Open our two-page beginner guide (PDF, 9.1 MB) <span aria-hidden="true">↗</span></a></p>
          <p>Watch a hand and ask what a player is collecting, or try a turn with someone beside you to help.</p>
        </div>
      </ActivityOverviewFeature>
    </section>

  </main>
</template>

<style scoped>
.activity-page { width: min(100% - 40px, var(--content-stack)); margin: 0 auto; }
.activity-page .page-intro { padding-inline: 0; }
.activity-page .stats-container { max-width: 580px; }
.activity-content { margin: 18px auto 34px; }
.quick-destinations { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px 18px; margin: 14px auto 0; }
.quick-destinations a { display: inline-flex; min-height: 44px; align-items: center; gap: 7px; padding: 0 12px; border: 1px solid var(--line); border-radius: 6px; background: var(--white-pure); color: var(--matcha-leaf); font-size: .88rem; font-weight: 650; text-decoration: none; }
.quick-destinations a:hover { background: var(--surface-soft); }
.quick-destinations a:focus-visible { outline: 2px solid var(--gold-leaf); outline-offset: 2px; }
.activity-copy h2,.activity-tools h2 { margin: 0 0 12px; color: var(--matcha-leaf); font: 400 clamp(1.8rem, 4vw, 2.6rem)/1.2 var(--font-display); }
.activity-copy p:not(.page-eyebrow) { max-width: 560px; color: var(--muted); line-height: 1.75; }
.activity-resource-link { color: var(--matcha-leaf); text-underline-offset: 4px; }
.activity-copy .page-eyebrow,.activity-tools > .page-eyebrow { justify-content: flex-start; margin-bottom: 12px; }
.activity-tools { margin-bottom: 28px; }
@media (max-width: 600px) { .activity-content { margin-top: 4px; } }
</style>
