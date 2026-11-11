import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getPublicPage, publicRoutes, siteUrl } from '../utils/siteSeo.ts'

const output = new URL('../.output/public/', import.meta.url)
const readOutput = (path: string) => readFileSync(new URL(path, output), 'utf8')
const decode = (text: string) => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
const sitemap = readOutput('sitemap.xml')
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
assert.deepEqual(locations.sort(), publicRoutes.map(path => getPublicPage(path)!.canonical).sort(), 'Sitemap must list every public canonical URL exactly once')
assert.ok(readOutput('robots.txt').includes(`Sitemap: ${siteUrl}/sitemap.xml`), 'Robots must advertise the sitemap')

for (const path of publicRoutes) {
  const page = getPublicPage(path)!
  const html = readOutput(`${path === '/' ? '' : `${path.slice(1)}/`}index.html`)
  const head = html.split('</head>')[0]
  const body = html.split('<body')[1]?.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '') ?? ''
  assert.equal(decode(head.match(/<title>([^<]+)<\/title>/)?.[1] ?? ''), page.title, `${path}: unique title in HTML`)
  assert.equal(decode(head.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? ''), page.description, `${path}: description in HTML`)
  assert.deepEqual([...head.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(match => match[1]), [page.canonical], `${path}: one canonical without query parameters`)
  assert.ok(head.includes(`<meta property="og:url" content="${page.canonical}"`), `${path}: social URL matches canonical`)
  assert.doesNotMatch(head, /<meta[^>]+(?:noindex|nofollow)/i, `${path}: public page allows indexing`)
  assert.match(body, /<h1\b[^>]*>[^<\s]/, `${path}: real heading without executing JavaScript`)
  assert.match(body, /<a\b[^>]*href="\/[^"]*"/, `${path}: crawlable internal links`)
  const structured = head.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
  assert.ok(structured, `${path}: structured data in HTML`)
  const graph = JSON.parse(structured[1])['@graph']
  assert.ok(graph.some((item: { '@type': string; url: string }) => item['@type'] === 'WebPage' && item.url === page.canonical), `${path}: structured data identifies this page`)
  assert.equal(getPublicPage(`${path === '/' ? '' : path}///`)?.canonical, page.canonical, `${path}: trailing slashes share a canonical`)
}

for (const path of ['admin', 'admin/birthday-club', 'admin/riichi-open', 'admin/only-blood-in-the-clocktower']) {
  const html = readOutput(`${path}/index.html`)
  assert.match(html.split('</head>')[0], /<meta name="robots" content="noindex, nofollow, noarchive"/, `${path}: admin stays out of search`)
}
assert.ok(readOutput('collection/index.html').includes('card-game-title'), 'Static collection includes real game cards while history loads')
assert.equal(getPublicPage('/admin'), null)
assert.equal(getPublicPage('/unknown-page'), null)
console.log(`SEO verified: ${publicRoutes.length} public pages, sitemap, canonical URLs, structured data and admin noindex in ${fileURLToPath(output)}`)
