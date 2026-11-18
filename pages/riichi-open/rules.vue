<template>
  <main class="open-rules-page">
    <header class="rules-header">
      <NuxtLink class="back-link" to="/riichi-open/" no-prefetch>← Riichi Open I</NuxtLink>
      <p class="eyebrow">Participant guide · WRC Rules 2025</p>
      <h1>Riichi Open I rules</h1>
      <p class="rules-deck">The complete event guide, including tournament format, scoring, gameplay, penalties and table conduct.</p>
      <p class="source-note">Official WRC documents govern gameplay, scoring, conduct and penalties. The guide also sets out the event’s own format and arrangements.</p>
    </header>

    <div v-if="sections.length" class="rules-layout">
      <aside class="toc-desktop" aria-label="Rules contents">
        <p>In this guide</p>
        <nav><a v-for="section in sections" :key="section.id" :class="{ 'toc-subsection': section.depth === 3 }" :href="`#${section.id}`">{{ section.title }}</a></nav>
      </aside>
      <details class="toc-mobile">
        <summary>In this guide</summary>
        <nav aria-label="Rules contents"><a v-for="section in sections" :key="section.id" :class="{ 'toc-subsection': section.depth === 3 }" :href="`#${section.id}`">{{ section.title }}</a></nav>
      </details>
      <article v-if="html" class="rules-content" v-html="html"></article>
      <p v-else-if="error" class="rules-state" role="status">{{ error }}</p>
      <p v-else class="rules-state" role="status">Loading the event guide…</p>
    </div>
    <p v-else-if="error" class="rules-state" role="status">{{ error }}</p>
    <p v-else class="rules-state" role="status">Loading the event guide…</p>
  </main>
</template>

<script setup>
import { marked } from 'marked'

useSeoMeta({
  title: 'Riichi Open I Rules | Saujana BGC',
  description: 'Read the complete Riichi Open I participant guide, including WRC 2025 gameplay, tournament format, scoring, penalties and event arrangements.',
  ogTitle: 'Riichi Open I Rules',
  ogDescription: 'The full participant guide for Riichi Open I at Saujana.',
  ogImage: 'https://saujana-bgc.org/images/riichi-open/riichi-open-i-poster.png',
})

const { data: markdown, error } = await useAsyncData('riichi-open-rules-markdown', () => $fetch('/api/riichi-open-rules'))
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
    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line)
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
    return `<h${depth} id="${id}" tabindex="-1">${text}</h${depth}>\n`
  }
  return marked.parse(markdown.value, { renderer })
})
</script>

<style>
.open-rules-page { width: min(100% - 40px, 1120px); margin: 0 auto; padding-bottom: 50px; }
.rules-header { max-width: 780px; margin: 30px auto 34px; text-align: center; }
.back-link { display: inline-block; margin-bottom: 25px; color: var(--muted); font-size: .9rem; text-decoration: none; }
.back-link:hover { color: var(--matcha-leaf); }
.rules-header .eyebrow { margin: 0 0 12px; color: var(--matcha-leaf); font-size: .75rem; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
.rules-header h1 { margin: 0; color: var(--matcha-leaf); font: 400 clamp(2.2rem,5vw,3.35rem)/1.12 var(--font-display); }
.rules-deck { max-width: 650px; margin: 15px auto 0; color: var(--muted); font-size: 1.02rem; line-height: 1.7; }
.source-note { max-width: 690px; margin: 18px auto 0; padding: 13px 16px; border-left: 3px solid var(--gold-leaf); background: var(--surface-soft); color: var(--clay-text); font-size: .9rem; line-height: 1.55; text-align: left; }
.rules-layout { display: grid; grid-template-columns: 225px minmax(0,1fr); gap: clamp(28px,5vw,64px); align-items: start; }
.toc-desktop { position: sticky; top: 24px; max-height: calc(100vh - 48px); overflow: auto; padding: 18px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-soft); }
.toc-desktop > p { margin: 0 0 12px; color: var(--matcha-leaf); font-size: .75rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
.toc-desktop nav,.toc-mobile nav { display: grid; gap: 3px; }
.toc-desktop a,.toc-mobile a { padding: 6px 8px; border-radius: 5px; color: var(--muted); font-size: .83rem; line-height: 1.4; text-decoration: none; }
.toc-desktop a:hover,.toc-mobile a:hover { background: var(--bg-silk); color: var(--matcha-leaf); }
.toc-desktop .toc-subsection,.toc-mobile .toc-subsection { padding-left: 19px; font-size: .78rem; }
.toc-mobile { display: none; }
.rules-content { min-width: 0; color: var(--clay-text); font-size: .97rem; line-height: 1.75; overflow-wrap: anywhere; }
.rules-content > h1 { display: none; }
.rules-content h2 { margin: 2.4em 0 .75em; padding-bottom: .4em; border-bottom: 1px solid var(--line); color: var(--matcha-leaf); font: 400 clamp(1.5rem,3vw,2rem)/1.25 var(--font-display); scroll-margin-top: 24px; }
.rules-content h3 { margin: 1.8em 0 .55em; color: var(--matcha-leaf); font: 500 1.16rem/1.4 var(--font-display); scroll-margin-top: 24px; }
.rules-content p { margin: .8em 0; }
.rules-content ul,.rules-content ol { padding-left: 1.45em; }
.rules-content li { margin: .42em 0; padding-left: .12em; }
.rules-content li > ul,.rules-content li > ol { margin-block: .35em; }
.rules-content strong { color: var(--clay-text); }
.rules-content a { color: var(--matcha-leaf); text-underline-offset: 3px; }
.rules-content blockquote { margin: 1em 0; padding: .2em 1em; border-left: 3px solid var(--gold-leaf); color: var(--muted); }
.rules-content code { padding: .12em .32em; border-radius: 3px; background: var(--surface-soft); font-size: .9em; }
.rules-content table { width: 100%; margin: 1.2em 0; border-collapse: collapse; font-size: .9rem; }
.rules-content th,.rules-content td { padding: 9px 12px; border: 1px solid var(--line); text-align: left; }
.rules-content th { background: var(--surface-soft); color: var(--matcha-leaf); }
.rules-content hr { margin: 2em 0; border: 0; border-top: 1px solid var(--line); }
.rules-content :focus-visible,.toc-desktop :focus-visible,.toc-mobile :focus-visible,.back-link:focus-visible { outline: 3px solid var(--gold-leaf); outline-offset: 3px; }
.rules-state { max-width: 760px; margin: 40px auto; padding: 24px; border-radius: 8px; background: var(--surface-soft); color: var(--muted); }
@media(max-width:800px) { .rules-layout { display: block; } .toc-desktop { display: none; } .toc-mobile { display: block; margin-bottom: 22px; padding: 13px 15px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); } .toc-mobile summary { color: var(--matcha-leaf); font-weight: 700; cursor: pointer; } .toc-mobile nav { max-height: 55vh; overflow: auto; margin-top: 10px; } }
@media(max-width:600px) { .open-rules-page { width: min(100% - 28px,1120px); } .rules-header { margin: 20px auto 25px; } .rules-content { font-size: .93rem; } .rules-content th,.rules-content td { padding: 7px 8px; } }
</style>
