<template>
  <main class="rules-home">
    <header class="rules-intro">
      <p class="eyebrow">Saujana · Japanese mahjong</p>
      <h1>Riichi rules at Saujana</h1>
      <p class="intro-copy">The table setting depends on the session. Here’s a quick guide to our published formats, with the complete Riichi Open I rules available below.</p>
    </header>

    <section class="format-grid" aria-label="Published riichi formats">
      <article class="format-card league-card">
        <p class="card-kicker">Weekly play</p>
        <h2>Riichi League</h2>
        <p class="card-lede">League settings for regular four-player and three-player matches.</p>
        <dl class="facts">
          <div><dt>Four-player</dt><dd>East–South · 25,000 starting points</dd></div>
          <div><dt>Red fives</dt><dd>One each in man, pin and sou</dd></div>
          <div><dt>Three-player</dt><dd>Separate sanma format · no chi · nuki-dora</dd></div>
          <div><dt>League score</dt><dd>Finishing place determines league points</dd></div>
        </dl>
        <NuxtLink class="text-link" to="/riichi-league/" no-prefetch>League details and full table rules <span aria-hidden="true">→</span></NuxtLink>
      </article>

      <article class="format-card open-card">
        <p class="card-kicker">Tournament · 14 November 2026</p>
        <h2>Riichi Open I</h2>
        <p class="card-lede">A four-player event using WRC Rules 2025 and its official clarification.</p>
        <dl class="facts">
          <div><dt>Format</dt><dd>Two qualifying East–South hanchans, then a final</dd></div>
          <div><dt>Starting points</dt><dd>30,000 · no red fives</dd></div>
          <div><dt>Tournament score</dt><dd>WRC points formula with uma</dd></div>
          <div><dt>Event clock</dt><dd>75 minutes per hanchan</dd></div>
        </dl>
        <NuxtLink class="text-link" to="/riichi-open/rules/" no-prefetch>Read the full Riichi Open I rules <span aria-hidden="true">→</span></NuxtLink>
      </article>
    </section>

    <aside class="host-note">
      <span class="note-mark" aria-hidden="true">東</span>
      <div><h2>Joining a casual table?</h2><p>Casual sessions may use a different format. Ask the host before the first hand which player count and table settings apply.</p></div>
    </aside>

    <nav class="more-links" aria-label="More Riichi Mahjong pages">
      <NuxtLink to="/riichi-mahjong/" no-prefetch>Riichi Mahjong overview</NuxtLink>
      <NuxtLink to="/riichi-calculator/" no-prefetch>Score calculator</NuxtLink>
      <NuxtLink to="/riichi-open/" no-prefetch>Riichi Open event</NuxtLink>
    </nav>
  </main>
</template>

<script setup>
useSeoMeta({
  title: 'Riichi House Rules | Saujana BGC',
  description: 'Compare the riichi mahjong settings used at Saujana, including Riichi League and Riichi Open I, and find the full event rules.',
  ogTitle: 'Riichi Rules at Saujana',
  ogDescription: 'A clear guide to Riichi League and Riichi Open I table settings.',
})
</script>

<style scoped>
.rules-home { width: min(100% - 40px, 1040px); margin: 0 auto; padding-bottom: 34px; }
.rules-intro { max-width: 720px; margin: 44px auto 38px; text-align: center; }
.eyebrow,.card-kicker { margin: 0 0 12px; color: var(--matcha-leaf); font-size: .75rem; font-weight: 750; letter-spacing: .13em; text-transform: uppercase; }
.rules-intro h1 { margin: 0; color: var(--matcha-leaf); font: 400 clamp(2.25rem, 6vw, 3.6rem)/1.12 var(--font-display); letter-spacing: -.035em; }
.intro-copy { max-width: 610px; margin: 18px auto 0; color: var(--muted); font-size: 1.05rem; line-height: 1.75; }
.format-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }
.format-card { display: flex; flex-direction: column; min-height: 100%; padding: clamp(22px,4vw,34px); border: 1px solid var(--line); border-radius: 12px; background: var(--surface-soft); }
.open-card { background: linear-gradient(145deg,#f4f1e8 0%,var(--surface-soft) 75%); }
.format-card h2 { margin: 0; color: var(--matcha-leaf); font: 400 clamp(1.7rem,3vw,2.2rem)/1.2 var(--font-display); }
.card-lede { min-height: 3em; margin: 10px 0 20px; color: var(--muted); line-height: 1.6; }
.facts { display: grid; gap: 0; margin: 0 0 20px; }
.facts div { display: grid; grid-template-columns: 108px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); }
.facts dt { color: var(--muted); font-size: .84rem; }
.facts dd { margin: 0; color: var(--clay-text); font-size: .92rem; font-weight: 600; line-height: 1.5; }
.text-link { display: inline-flex; align-items: center; gap: 10px; width: fit-content; margin-top: auto; padding-top: 12px; color: var(--matcha-leaf); font-weight: 700; text-decoration-thickness: 1px; text-underline-offset: 4px; }
.text-link:focus-visible,.more-links a:focus-visible { outline: 3px solid var(--gold-leaf); outline-offset: 4px; border-radius: 3px; }
.host-note { display: flex; gap: 18px; align-items: flex-start; max-width: 760px; margin: 30px auto 22px; padding: 20px 24px; border-left: 3px solid var(--gold-leaf); background: var(--surface-soft); }
.note-mark { color: var(--matcha-leaf); font: 400 1.8rem/1 var(--font-display); }
.host-note h2 { margin: 0 0 5px; color: var(--matcha-leaf); font: 400 1.3rem/1.3 var(--font-display); }
.host-note p { margin: 0; color: var(--muted); line-height: 1.6; }
.more-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 24px; padding-top: 14px; }
.more-links a { color: var(--muted); font-size: .88rem; text-underline-offset: 3px; }
@media(max-width:700px) { .rules-intro { margin: 32px auto 26px; } .format-grid { grid-template-columns: 1fr; gap: 12px; } .card-lede { min-height: 0; } .facts div { grid-template-columns: 96px 1fr; } .host-note { margin-top: 20px; padding: 17px; } }
</style>
