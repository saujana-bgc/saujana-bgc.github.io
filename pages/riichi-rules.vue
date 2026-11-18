<template>
  <main class="rules-page">
    <header class="page-intro rules-intro">
      <NuxtLink class="context-link rules-back-link" to="/riichi-mahjong/" no-prefetch>← Riichi Mahjong</NuxtLink>
      <p class="page-eyebrow">WRC Rules 2025 · Four-player play</p>
      <h1 class="hero-title">Riichi Rules</h1>
      <p class="rules-deck">The four-player rules used at Saujana, based on WRC Rules 2025 and its official clarification.</p>
      <p class="source-note">WRC Rules 2025, its penalties and official clarification govern gameplay, scoring, conduct and penalties. Riichi Open I arrangements appear in the appendix.</p>
    </header>

    <section class="table-summary" aria-labelledby="table-summary-title">
      <h2 id="table-summary-title">Table at a glance</h2>
      <dl>
        <div><dt>Players</dt><dd>Four</dd></div>
        <div><dt>Rounds</dt><dd>East–South</dd></div>
        <div><dt>Starting points</dt><dd>30,000</dd></div>
        <div><dt>Red fives</dt><dd>None</dd></div>
      </dl>
    </section>

    <div v-if="sections.length" id="rules-contents" class="rules-layout">
      <aside class="toc-desktop" aria-label="Rules contents">
        <p>In this guide</p>
        <div class="rules-shortcuts" aria-label="Key sections">
          <a href="#1-basic-settings">Table settings</a>
          <a href="#6-hand-scoring">Scoring</a>
          <a href="#penalties-and-irregularities">Penalties</a>
          <a href="#riichi-open-i-event-appendix">Open I appendix</a>
        </div>
        <nav>
          <a v-for="section in sections" :key="section.id" :class="{ 'toc-topic': section.depth === 1, 'toc-subsection': section.depth === 3 }" :href="`#${section.id}`">{{ section.title }}</a>
        </nav>
      </aside>
      <details ref="mobileToc" class="toc-mobile">
        <summary>Jump to section</summary>
        <div class="rules-shortcuts" aria-label="Key sections">
          <a href="#1-basic-settings" @click="closeMobileToc">Table settings</a>
          <a href="#6-hand-scoring" @click="closeMobileToc">Scoring</a>
          <a href="#penalties-and-irregularities" @click="closeMobileToc">Penalties</a>
          <a href="#riichi-open-i-event-appendix" @click="closeMobileToc">Open I appendix</a>
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
  description: 'Read Saujana’s four-player riichi rules, based on WRC Rules 2025, with tournament arrangements in a Riichi Open I appendix.',
  ogTitle: 'Riichi Rules',
  ogDescription: 'The riichi rules used at Saujana, based on WRC Rules 2025.',
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
    const heading = `<h${pageDepth} id="${id}" tabindex="-1">${text}</h${pageDepth}>`
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
.rules-page { width: min(100% - 40px, 1120px); margin: 0 auto; padding-bottom: 50px; }
.rules-intro { max-width: 760px; margin-inline: auto; }
.rules-intro .hero-title { margin-inline: auto; }
.rules-back-link { margin: 0 auto 14px; }
.rules-deck { max-width: 650px; margin: 18px auto 0; color: var(--muted); font-size: 1.02rem; line-height: 1.7; }
.source-note { max-width: 690px; margin: 18px auto 0; padding: 13px 16px; border-left: 3px solid var(--gold-leaf); background: var(--surface-soft); color: var(--clay-text); font-size: .9rem; line-height: 1.55; text-align: left; }
.table-summary { max-width: 760px; margin: 0 auto 30px; padding: 20px 24px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.table-summary h2 { margin: 0 0 12px; color: var(--matcha-leaf); font: 400 1.25rem/1.3 var(--font-display); }
.table-summary dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 0; }
.table-summary dt { color: var(--muted); font-size: .78rem; }
.table-summary dd { margin: 3px 0 0; color: var(--clay-text); font-weight: 700; }
.rules-layout { display: grid; grid-template-columns: 250px minmax(0,1fr); gap: clamp(28px,5vw,54px); align-items: start; }
.toc-desktop { position: sticky; top: 24px; max-height: calc(100vh - 48px); overflow: auto; padding: 18px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-soft); }
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
.rules-content > h2 { margin: 2.6em 0 .3em; padding-bottom: .45em; border-bottom: 2px solid var(--line); color: var(--matcha-leaf); font: 400 clamp(1.8rem,3.5vw,2.35rem)/1.2 var(--font-display); scroll-margin-top: 24px; }
.back-to-contents { display: inline-block; margin-bottom: .8em; color: var(--muted); font-size: .78rem; text-underline-offset: 3px; }
.rules-content h2 { margin: 2.4em 0 .75em; padding-bottom: .4em; border-bottom: 1px solid var(--line); color: var(--matcha-leaf); font: 400 clamp(1.5rem,3vw,2rem)/1.25 var(--font-display); scroll-margin-top: 24px; }
.rules-content h3 { margin: 1.8em 0 .55em; color: var(--matcha-leaf); font: 500 1.16rem/1.4 var(--font-display); scroll-margin-top: 24px; }
.rules-content h4 { margin: 1.3em 0 .4em; color: var(--clay-text); font: 700 1rem/1.45 var(--font-body); scroll-margin-top: 24px; }
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
.rules-content hr { margin: 2em 0; border: 0; border-top: 1px solid var(--line); }
.rules-content :focus-visible,.toc-desktop :focus-visible,.toc-mobile :focus-visible,.rules-back-link:focus-visible,.back-to-contents:focus-visible { outline: 3px solid var(--gold-leaf); outline-offset: 3px; }
.rules-state { max-width: 760px; margin: 40px auto; padding: 24px; border-radius: 8px; background: var(--surface-soft); color: var(--muted); }
@media(max-width:800px) { .rules-page { width: min(100% - 32px,1120px); } .rules-layout { display: block; } .toc-desktop { display: none; } .toc-mobile { display: block; margin: 0 0 22px; padding: 13px 15px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); } .toc-mobile summary { color: var(--matcha-leaf); font-weight: 700; cursor: pointer; } .toc-mobile nav { max-height: 55vh; overflow: auto; margin-top: 10px; } .table-summary dl { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media(max-width:600px) { .rules-page { width: min(100% - 28px,1120px); } .rules-content { font-size: .93rem; } .rules-content th,.rules-content td { padding: 7px 8px; } .source-note { padding: 11px 13px; } }
</style>
