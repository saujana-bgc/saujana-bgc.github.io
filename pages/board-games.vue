<template>
  <main class="activity-page">
    <header class="page-intro">
      <h1 class="page-eyebrow">Board Games</h1>
      <p class="stats-container">From quick party games to thoughtful strategy, choose a table that suits you. We’ll help you find a game and learn as you play.</p>
      <NuxtLink class="activity-primary" to="/gatherings/" no-prefetch>See weekly gathering dates <span aria-hidden="true">→</span></NuxtLink>
      <p class="activity-welcome">We play board games and riichi mahjong at the same weekly gathering. Come on your own, watch a round or ask a host to help you join in.</p>
    </header>

    <section class="activity-content" aria-labelledby="first-game-title">
      <ActivityOverviewFeature
        src="/images/site/overview-mika-board-games.webp"
        alt="Four players write word clues together during a game of Just One."
      >
        <div class="activity-copy">
          <p class="page-eyebrow">What playing can look like</p>
          <h2 id="first-game-title">You can join with one good clue.</h2>
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
.activity-page { width: min(100% - 40px, 960px); margin: 0 auto; }
.activity-page .page-intro { padding-inline: 0; }
.activity-page .stats-container { max-width: 580px; }
.activity-primary { display: inline-flex; min-height: 48px; align-items: center; gap: 18px; margin: 22px auto 0; padding: 0 22px; border-radius: 6px; background: var(--matcha-leaf); color: white; font-weight: 650; text-decoration: none; }
.activity-welcome { max-width: 560px; margin: 12px auto 0; color: var(--muted); font-size: .9rem; line-height: 1.55; }
.activity-content { margin: 18px auto 34px; }
.activity-copy h2 { margin: 0 0 12px; color: var(--matcha-leaf); font: 400 clamp(1.8rem, 4vw, 2.6rem)/1.2 var(--font-display); }
.activity-copy p:not(.page-eyebrow) { max-width: 560px; color: var(--muted); line-height: 1.75; }
.activity-copy .page-eyebrow { justify-content: flex-start; margin-bottom: 12px; }
.activity-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 28px; }
.activity-links a { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; padding: 20px; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--surface-soft); color: var(--matcha-leaf); text-decoration: none; }
.activity-links strong { font: 400 1.25rem/1.3 var(--font-display); }
.activity-links a > span:nth-child(2) { grid-column: 1; color: var(--muted); font-size: .9rem; line-height: 1.5; }
.activity-links a > span:last-child { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
@media (max-width: 600px) { .activity-content { margin-top: 4px; } .activity-links { grid-template-columns: 1fr; gap: 10px; } }
</style>
