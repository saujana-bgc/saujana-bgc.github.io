import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileScript, parse } from '@vue/compiler-sfc'
import { computed, ref, shallowRef } from 'vue'

const { descriptor } = parse(readFileSync(new URL('../pages/riichi-open/index.vue', import.meta.url), 'utf8'))
const script = compileScript(descriptor, { id: 'riichi-guide-loading' })

function guide() {
  let loads = 0
  let shouldFail = false
  const dependencies = {
    ref, shallowRef, computed, watch() {}, onMounted() {}, onBeforeUnmount() {}, useHead() {},
    useRoute: () => ({ query: {}, path: '/riichi-open' }), useRouter: () => ({}), useRiichiOpen: () => ({}),
    fetch: async () => ({ ok: !shouldFail, text: async () => '## Tournament rules' }),
    loadMarked: async () => { loads++; return { marked: { parse: (text: string) => `<h2>${text}</h2>` } } },
    loadSanitizer: async () => { loads++; return { default: { sanitize: (html: string) => html } } },
    DOMParser: class { parseFromString(html: string) { return { body: { innerHTML: html, querySelectorAll: () => [] } } } },
  }
  const component = new Function(...Object.keys(dependencies), script.content
    .replace("import('marked')", 'loadMarked()')
    .replace("import('dompurify')", 'loadSanitizer()')
    .replace('export default', 'return'))(...Object.values(dependencies))
  return { state: component.setup({}, { expose() {} }), loads: () => loads, fail: (value: boolean) => { shouldFail = value } }
}

test('guide libraries load on demand, concurrent opens share the active load, and the guide renders', async () => {
  const { state, loads } = guide()
  assert.equal(loads(), 0)
  assert.equal(state.guideHtml.value, '')
  const loading = state.loadGuide()
  assert.equal(state.guideLoading.value, true)
  await state.loadGuide()
  await loading
  assert.equal(loads(), 2)
  assert.equal(state.guideLoading.value, false)
  assert.equal(state.guideError.value, '')
  assert.equal(state.guideHtml.value, '<h2>## Tournament rules</h2>')
  assert.deepEqual(state.guideSections.value, [{ id: 'guide-tournament-rules', title: 'Tournament rules' }])
})

test('a failed guide request clears loading and can be retried', async () => {
  const app = guide()
  app.fail(true)
  await app.state.loadGuide()
  assert.equal(app.state.guideLoading.value, false)
  assert.ok(app.state.guideError.value.includes('could not be loaded'))
  assert.equal(app.state.guideMarkdown.value, '')
  app.fail(false)
  await app.state.loadGuide()
  assert.equal(app.state.guideError.value, '')
  assert.ok(app.state.guideHtml.value)
})
