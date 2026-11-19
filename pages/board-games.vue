<template>
  <main class="activity-page">
    <header class="page-intro">
      <h1 class="hero-title">Board Games</h1>
      <p class="stats-container">From quick party games to thoughtful strategy, choose a table that suits you. We’ll help you find a game and learn as you play.</p>
      <NuxtLink class="activity-primary" to="/gatherings/" no-prefetch>Find a gathering <span aria-hidden="true">→</span></NuxtLink>
    </header>

    <section class="activity-content" aria-labelledby="first-game-title">
      <ActivityOverviewFeature
        src="/images/site/overview-mika-board-games.webp"
        alt="Four players write word clues together during a game of Just One."
      >
        <div class="activity-copy">
          <p class="page-eyebrow">What playing can look like</p>
          <h2 id="first-game-title">Start with one good clue.</h2>
          <p>Ocean. Blue. Big. What word would you guess? In <em>Just One</em>, you write one-word clues for a teammate. Matching clues disappear, so it pays to think a little differently.</p>
        </div>
      </ActivityOverviewFeature>
    </section>

    <nav class="activity-links" aria-label="Explore board games">
      <NuxtLink to="/collection/" no-prefetch><strong>Browse the collection</strong><span>See the games our hosts can bring to the table.</span><span aria-hidden="true">→</span></NuxtLink>
      <NuxtLink to="/playlog/" no-prefetch><strong>Play History</strong><span>See games played at previous gatherings.</span><span aria-hidden="true">→</span></NuxtLink>
    </nav>
  </main>
</template>

<style scoped>
.activity-page { width: min(100% - 40px, var(--content-stack)); margin: 0 auto; }
.activity-page .page-intro { padding-inline: 0; }
.activity-page .stats-container { max-width: 580px; }
.activity-content { margin: 18px auto 34px; }
.quick-destinations { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px 18px; margin: 14px auto 0; }
.quick-destinations a { display: inline-flex; min-height: 40px; align-items: center; gap: 7px; color: var(--matcha-leaf); font-size: .88rem; font-weight: 650; text-underline-offset: 4px; }
.activity-copy h2 { margin: 0 0 12px; color: var(--matcha-leaf); font: 400 clamp(1.8rem, 4vw, 2.6rem)/1.2 var(--font-display); }
.activity-copy p:not(.page-eyebrow) { max-width: 560px; color: var(--muted); line-height: 1.75; }
.activity-copy .page-eyebrow { justify-content: flex-start; margin-bottom: 12px; }
@media (max-width: 600px) { .activity-content { margin-top: 4px; } }
</style>
