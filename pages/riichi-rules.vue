<template>
  <main class="rules-page">
    <header class="page-intro rules-intro">
      <NuxtLink class="activity-parent-link" to="/riichi-mahjong/" no-prefetch>Riichi Mahjong</NuxtLink>
      <p class="page-eyebrow">Riichi Mahjong</p>
      <h1 class="hero-title">Riichi Rules</h1>
      <p class="rules-deck">Table settings for four-player riichi and three-player sanma at Saujana, with rules for the Riichi Open tournament series.</p>
      <p class="source-note">Both formats use ordinary fives. Casual games have no chombo penalties. The tournament appendix explains when formal penalties apply.</p>
      <nav class="rules-top-shortcuts" aria-label="Jump to a rules section">
        <a href="#four-player-rules">Four-player rules <span aria-hidden="true">↓</span></a>
        <a href="#three-player-rules-sanma">Sanma rules <span aria-hidden="true">↓</span></a>
        <a href="#riichi-open-tournament-rules">Tournament rules <span aria-hidden="true">↓</span></a>
      </nav>
    </header>

    <section class="table-summaries" aria-label="Riichi formats at a glance">
      <article class="table-summary" aria-labelledby="four-player-title">
        <h2 id="four-player-title">Four players</h2>
        <dl>
          <div><dt>Rounds</dt><dd>East–South</dd></div>
          <div><dt>Starting points</dt><dd>30,000</dd></div>
          <div><dt>Red fives</dt><dd>None</dd></div>
        </dl>
        <a class="beginner-guide-link" href="/guides/riichi-beginner-guide.pdf" target="_blank" rel="noopener">New to riichi? Read the beginner guide (PDF, 11 MB) ↗</a>
        <p class="beginner-guide-note">Guide correction. Temporary furiten ends on your next draw or your own tile call. If you pass after declaring riichi, it lasts for the rest of the hand.</p>
      </article>
      <article class="table-summary sanma-summary" aria-labelledby="three-player-title">
        <h2 id="three-player-title">Three players · sanma</h2>
        <dl>
          <div><dt>Rounds</dt><dd>East 1–3, South 1–3</dd></div>
          <div><dt>Starting points</dt><dd>40,000</dd></div>
          <div><dt>Tiles</dt><dd>108 · no chi</dd></div>
        </dl>
      </article>
    </section>

    <div v-if="sections.length" id="rules-contents" class="rules-layout">
      <aside class="toc-desktop" aria-label="Rules contents">
        <p>In this guide</p>
        <nav>
          <a v-for="section in sections" :key="section.id" :class="{ 'toc-topic': section.depth === 1, 'toc-subsection': section.depth === 3 }" :href="`#${section.id}`">{{ section.title }}</a>
        </nav>
      </aside>
      <details ref="mobileToc" class="toc-mobile">
        <summary>Jump to section</summary>
        <div class="rules-shortcuts" aria-label="Key sections">
          <a href="#four-player-rules" @click="closeMobileToc">Four players</a>
          <a href="#three-player-rules-sanma" @click="closeMobileToc">Three-player rules</a>
          <a href="#riichi-open-tournament-rules" @click="closeMobileToc">Riichi Open rules</a>
        </div>
        <nav aria-label="Rules contents"><a v-for="section in sections" :key="section.id" :class="{ 'toc-topic': section.depth === 1, 'toc-subsection': section.depth === 3 }" :href="`#${section.id}`" @click="closeMobileToc">{{ section.title }}</a></nav>
      </details>
      <article v-if="html" class="rules-content" v-html="html"></article>
      <p v-else-if="error" class="rules-state" role="status">{{ error }}</p>
      <p v-else class="rules-state" role="status">Loading Riichi Rules…</p>
    </div>
    <p v-else-if="error" class="rules-state" role="status">{{ error }}</p>
    <p v-else class="rules-state" role="status">Loading Riichi Rules…</p>
  </main>
</template>

<script setup>
import { marked } from 'marked'

useSeoMeta({
  title: 'Riichi Rules | Saujana BGC',
  description: 'Read Saujana rules for four-player riichi, three-player sanma and the Riichi Open tournament series.',
  ogTitle: 'Riichi Rules',
  ogDescription: 'Four-player riichi rules, three-player sanma settings and rules for the Riichi Open tournament series.',
})

const { data: markdown, error } = await useAsyncData('riichi-open-rules-markdown', () => $fetch('/api/riichi-open-rules'))
const mobileToc = ref(null)
const slugCounts = new Map()
function slugify(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'
  const count = slugCounts.get(base) ?? 0
  slugCounts.set(base, count + 1)
  return count ? `${base}-${count}` : base
}
const sections = computed(() => {
  slugCounts.clear()
  return String(markdown.value ?? '').split('\n').flatMap((line) => {
    const match = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match) return []
    const title = match[2].replace(/\*\*/g, '').replace(/`/g, '')
    return [{ title, depth: match[1].length, id: slugify(title) }]
  })
})
const html = computed(() => {
  if (!markdown.value) return ''
  slugCounts.clear()
  const renderer = new marked.Renderer()
  renderer.heading = ({ text, depth }) => {
    const id = slugify(text.replace(/<[^>]*>/g, ''))
    const pageDepth = depth + 1
    const legacyAnchors = {
      'tournament-penalties-and-irregularities': 'penalties-and-irregularities',
      'formal-tournament-penalties': 'penalties-and-irregularities',
      '11-player-conduct': 'table-conduct',
      '12-disputes-and-rulings': '12-tournament-administration',
      'riichi-open-tournament-rules': 'riichi-open-i-event-appendix',
    }
    const legacyAnchor = legacyAnchors[id]
      ? `<span id="${legacyAnchors[id]}" class="legacy-anchor" aria-hidden="true"></span>`
      : ''
    const heading = `${legacyAnchor}<h${pageDepth} id="${id}" tabindex="-1">${text}</h${pageDepth}>`
    return depth === 1
      ? `${heading}<a class="back-to-contents" href="#rules-contents">Back to contents ↑</a>\n`
      : `${heading}\n`
  }
  return marked.parse(markdown.value, { renderer })
})
function closeMobileToc() {
  mobileToc.value.open = false
}
</script>

<style>
.beginner-guide-note { margin: .5rem 0 0; color: var(--muted); font-size: .875rem; }
.rules-page { width: min(100% - 40px, var(--content-page)); margin: 0 auto; padding-bottom: 50px; }
.rules-intro { max-width: 760px; margin-inline: auto; }
.rules-intro .hero-title { margin-inline: auto; }
.rules-back-link { margin: 0 auto 14px; }
.rules-deck { max-width: 650px; margin: 18px auto 0; color: var(--muted); font-size: 1.02rem; line-height: 1.7; }
.source-note { max-width: 690px; margin: 18px auto 0; padding: 13px 16px; border-left: 3px solid var(--gold-leaf); background: var(--surface-soft); color: var(--clay-text); font-size: .9rem; line-height: 1.55; text-align: left; }
.rules-top-shortcuts { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin: 20px auto 0; }
.rules-top-shortcuts a { display: inline-flex; align-items: center; gap: 7px; padding: 9px 13px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface-soft); color: var(--matcha-leaf); font-size: .83rem; font-weight: 650; text-decoration: none; }
.rules-top-shortcuts a:hover { border-color: var(--gold-leaf); background: var(--white-pure); }
.table-summaries { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; max-width: 900px; margin: 0 auto 30px; }
.table-summary { min-width: 0; padding: 20px 24px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.sanma-summary { background: linear-gradient(145deg,#f4f1e8 0%,var(--surface-soft) 75%); }
.table-summary h2 { margin: 0 0 12px; color: var(--matcha-leaf); font: 400 1.25rem/1.3 var(--font-display); }
.table-summary dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 0 0 12px; }
.table-summary dt { color: var(--muted); font-size: .78rem; }
.table-summary dd { margin: 3px 0 0; color: var(--clay-text); font-weight: 700; }
.table-summary > a { color: var(--matcha-leaf); font-size: .85rem; font-weight: 700; text-underline-offset: 3px; }
.table-summary > .beginner-guide-link { display: block; margin-bottom: 9px; }
.rules-layout { display: grid; grid-template-columns: 250px minmax(0,1fr); gap: clamp(28px,5vw,54px); align-items: start; }
.toc-desktop { position: sticky; top: 112px; max-height: calc(100vh - 136px); overflow: auto; padding: 18px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-soft); }
.toc-desktop > p { margin: 0 0 12px; color: var(--matcha-leaf); font-size: .75rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
.rules-shortcuts { display: grid; gap: 2px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
.rules-shortcuts a { color: var(--matcha-leaf); font-weight: 700; }
.toc-desktop nav,.toc-mobile nav { display: grid; gap: 3px; }
.toc-desktop nav a,.toc-mobile nav a,.rules-shortcuts a { padding: 6px 8px; border-radius: 5px; font-size: .83rem; line-height: 1.4; text-decoration: none; }
.toc-desktop nav a,.toc-mobile nav a { color: var(--muted); }
.toc-desktop a:hover,.toc-mobile a:hover { background: var(--bg-silk); color: var(--matcha-leaf); }
.toc-desktop .toc-subsection,.toc-mobile .toc-subsection { padding-left: 19px; font-size: .78rem; }
.toc-desktop .toc-topic,.toc-mobile .toc-topic { margin-top: 8px; color: var(--matcha-leaf); font-weight: 750; }
.toc-mobile { display: none; }
.rules-content { min-width: 0; color: var(--clay-text); font-size: .97rem; line-height: 1.75; overflow-wrap: anywhere; }
.rules-content > h2 { margin: 2.6em 0 .3em; padding-bottom: .45em; border-bottom: 2px solid var(--line); color: var(--matcha-leaf); font: 400 clamp(1.8rem,3.5vw,2.35rem)/1.2 var(--font-display); }
.back-to-contents { display: inline-block; margin-bottom: .8em; color: var(--muted); font-size: .78rem; text-underline-offset: 3px; }
.rules-content h2 { margin: 2.4em 0 .75em; padding-bottom: .4em; color: var(--matcha-leaf); font: 400 clamp(1.5rem,3vw,2rem)/1.25 var(--font-display); }
.rules-content h3 { margin: 1.8em 0 .55em; color: var(--matcha-leaf); font: 500 1.16rem/1.4 var(--font-display); }
.rules-content h4 { margin: 1.3em 0 .4em; color: var(--clay-text); font: 700 1rem/1.45 var(--font-body); }
.rules-content p { margin: .8em 0; }
.rules-content ul,.rules-content ol { padding-left: 1.45em; }
.rules-content li { margin: .42em 0; padding-left: .12em; }
.rules-content li > ul,.rules-content li > ol { margin-block: .35em; }
.rules-content strong { color: var(--clay-text); }
.rules-content a { color: var(--matcha-leaf); text-underline-offset: 3px; }
.rules-content blockquote { margin: 1em 0; padding: .2em 1em; border-left: 3px solid var(--gold-leaf); color: var(--muted); }
.rules-content code { padding: .12em .32em; border-radius: 3px; background: var(--surface-soft); font-size: .9em; }
.rules-content table { display: block; width: 100%; max-width: 100%; margin: 1.2em 0; overflow-x: auto; border-collapse: collapse; font-size: .9rem; }
.rules-content th,.rules-content td { padding: 9px 12px; border: 1px solid var(--line); text-align: left; }
.rules-content th { background: var(--surface-soft); color: var(--matcha-leaf); }
.rules-content hr { display: none; }
.rules-content :focus-visible,.toc-desktop :focus-visible,.toc-mobile :focus-visible,.rules-back-link:focus-visible,.back-to-contents:focus-visible { outline: 3px solid var(--gold-leaf); outline-offset: 3px; }
.rules-state { max-width: 760px; margin: 40px auto; padding: 24px; border-radius: 8px; background: var(--surface-soft); color: var(--muted); }
@media(max-width:800px) { .rules-page { width: min(100% - 32px,1120px); } .rules-layout { display: block; } .toc-desktop { display: none; } .toc-mobile { display: block; margin: 0 0 22px; padding: 13px 15px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); } .toc-mobile summary { color: var(--matcha-leaf); font-weight: 700; cursor: pointer; } .toc-mobile nav { max-height: 55vh; overflow: auto; margin-top: 10px; } }
@media(max-width:600px) { .rules-page { width: min(100% - 28px,1120px); } .rules-content { font-size: .93rem; } .rules-content th,.rules-content td { padding: 7px 8px; } .source-note { padding: 11px 13px; } .table-summaries { grid-template-columns: 1fr; } .table-summary { padding: 17px; } .table-summary dl { grid-template-columns: repeat(2,minmax(0,1fr)); } }
</style>
