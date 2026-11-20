<template>
  <main class="activity-page">
    <header class="page-intro">
      <h1 class="hero-title">Board Games</h1>
      <p class="stats-container">From quick party games to thoughtful strategy, choose a table that suits you. We’ll help you find a game and learn as you play.</p>
      <NuxtLink class="activity-primary" to="/gatherings/" no-prefetch>Find a gathering <span aria-hidden="true">→</span></NuxtLink>
      <nav class="quick-destinations" aria-label="Board game pages">
        <NuxtLink to="/collection/" no-prefetch>Collection</NuxtLink>
        <NuxtLink to="/playlog/" no-prefetch>Play History</NuxtLink>
      </nav>
    </header>

    <section class="activity-content" aria-labelledby="first-game-title">
      <ActivityOverviewFeature
        src="/images/site/overview-mika-board-games-1200.avif"
        src-set="/images/site/overview-mika-board-games-480.avif 480w, /images/site/overview-mika-board-games-800.avif 800w, /images/site/overview-mika-board-games-1200.avif 1200w"
        sizes="(max-width: 680px) calc(100vw - 2.5rem), (max-width: 1000px) 40vw, 384px"
        alt="Four players write word clues together during a game of Just One."
      >
        <div class="activity-copy">
          <p class="page-eyebrow">What playing can look like</p>
          <h2 id="first-game-title">Start with one good clue.</h2>
          <p>Ocean. Blue. Big. What word would you guess? In <em>Just One</em>, you write one-word clues for a teammate. Matching clues disappear, so it pays to think a little differently.</p>
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
.activity-copy h2 { margin: 0 0 12px; color: var(--matcha-leaf); font: 400 clamp(1.8rem, 4vw, 2.6rem)/1.2 var(--font-display); }
.activity-copy p:not(.page-eyebrow) { max-width: 560px; color: var(--muted); line-height: 1.75; }
.activity-copy .page-eyebrow { justify-content: flex-start; margin-bottom: 12px; }
@media (max-width: 600px) { .activity-content { margin-top: 4px; } }
</style>
