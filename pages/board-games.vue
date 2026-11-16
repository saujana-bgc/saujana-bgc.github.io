<template>
  <main class="activity-page">
    <header class="page-intro">
      <p class="page-eyebrow">Come try a game</p>
      <h1 class="hero-title">Board Games</h1>
      <p class="stats-container">If Monopoly and Uno are the games you know, you already have a starting point. Board games also include quick team challenges, creative guessing games and thoughtful strategy games. We’ll help you find one that fits.</p>
      <NuxtLink class="activity-primary" to="/gatherings/" no-prefetch>Find a gathering <span aria-hidden="true">→</span></NuxtLink>
    </header>

    <section class="activity-content" aria-labelledby="first-game-title">
      <ActivityOverviewFeature
        src="/images/site/overview-mika-board-games.webp"
        alt="Mika, Albert, Bryan and Erin play Just One with three word clues on the table."
      >
      <div class="activity-copy">
        <p class="page-eyebrow">What playing can look like</p>
        <h2 id="first-game-title">There’s more than one way to play.</h2>
        <p><strong>Work as a team.</strong> In <em>Just One</em>, everyone writes a one-word clue to help one player guess a mystery word. Matching clues cancel, so you’re trying to be helpful and original.</p>
        <p><strong>Read the room.</strong> Make a guess about what the other players are thinking, then see if the group agrees.</p>
        <p><strong>Plan a few turns ahead.</strong> Collect useful pieces, build a pattern or block another player’s route.</p>
        <p>Those are examples of the kinds of things modern board games ask you to do. At a gathering, tell a host what sounds fun. They can recommend and teach a game. Coming alone or unsure? Watch a round first.</p>
      </div>
      </ActivityOverviewFeature>
    </section>

    <nav class="activity-links" aria-label="Explore board games">
      <NuxtLink to="/collection/" no-prefetch><strong>Browse the collection</strong><span>See the games our hosts can bring to the table.</span><span aria-hidden="true">→</span></NuxtLink>
      <NuxtLink to="/playlog/" no-prefetch><strong>Explore play history</strong><span>See games played at previous gatherings.</span><span aria-hidden="true">→</span></NuxtLink>
    </nav>
  </main>
</template>

<style scoped>
.activity-page { width: min(100% - 40px, 960px); margin: 0 auto; }
.activity-page .page-intro { padding-inline: 0; }
.activity-page .stats-container { max-width: 580px; }
.activity-primary { display: inline-flex; min-height: 48px; align-items: center; gap: 18px; margin: 22px auto 0; padding: 0 22px; border-radius: 6px; background: var(--matcha-leaf); color: white; font-weight: 650; text-decoration: none; }
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
