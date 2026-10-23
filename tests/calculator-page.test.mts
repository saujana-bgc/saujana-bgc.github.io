import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import * as vue from 'vue'
import { renderToString } from '@vue/server-renderer'
import { MANUAL_YAKU, calculateManualHanFuScore } from '../utils/scoring/manual.ts'
import { score as scoreFullHand } from '../utils/scoring/index.ts'
import { parseHand } from '../utils/scoring/hand-parser.ts'
import { validateTileSet } from '../utils/scoring/tile-set.ts'
import { DEFAULT_LOCAL_YAKU } from '../utils/scoring/types.ts'

// Compile the real page so assertions cover both its computed state and template.
const { descriptor } = parse(readFileSync(new URL('../pages/riichi-calculator.vue', import.meta.url), 'utf8'))
const script = compileScript(descriptor, { id: 'calculator-test' })
const template = compileTemplate({
  source: descriptor.template!.content, filename: 'riichi-calculator.vue', id: 'calculator-test',
  compilerOptions: { bindingMetadata: script.bindings },
})
assert.deepEqual(template.errors, [])
const dependencies = {
  ref: vue.ref, computed: vue.computed, reactive: vue.reactive, watch: vue.watch, nextTick: vue.nextTick, toRaw: vue.toRaw,
  MANUAL_YAKU, calculateManualHanFuScore, scoreFullHand, parseHand, validateTileSet, DEFAULT_LOCAL_YAKU,
  useHead() {}, onMounted() {}, onBeforeUnmount() {},
}
const component = new Function(...Object.keys(dependencies), script.content
  .replace(/^import[\s\S]*?from ['"][^'"]+['"];?\s*$/gm, '')
  .replaceAll('import.meta.client', 'false')
  .replace('export default', 'return'))(...Object.values(dependencies))
const render = new Function('Vue', template.code
  .replace(/^import \{([^}]+)\} from "vue"/m, (_, helpers) => `const {${helpers.replaceAll(' as ', ': ')}} = Vue`)
  .replace('export function render', 'return function render'))(vue)

function page(t: { after: (callback: () => void) => void }) {
  const scope = vue.effectScope()
  t.after(() => scope.stop())
  const state = scope.run(() => vue.proxyRefs(component.setup({}, { expose() {} })))!
  const html = () => renderToString(vue.createSSRApp({
    components: { RiichiTileHandEntry: { render: () => null } },
    setup: () => () => render({}, [], {}, state),
  }))
  return { state, html }
}

test('tile fu disappears at 5 total han including dora and returns below the limit', async t => {
  const { state, html } = page(t)
  state.form.tileEntry = {
    tiles: ['m2', 'm3', 'm4', 'p3', 'p4', 'p5', 's4', 's5', 's6', 's6', 's7', 's8', 'p2', 'p2'],
    melds: [], winningIndex: 11, doraIndicators: ['m1'], uraIndicators: ['h0'], doraEntryMode: 'indicators',
  }
  state.setTileRiichi('riichi')
  state.tileStep = 1
  state.showBreakdown = true
  assert.equal(state.resultReady, true)
  assert.equal(state.result.han, 4)
  assert.match(await html(), /30 fu/)
  assert.match(await html(), /class="fu-breakdown"/)
  assert.match(state.resultShareText, /30 fu/)

  state.form.tileEntry.doraIndicators = ['p1'] // Two pair tiles are now dora.
  assert.equal(state.result.han, 5)
  assert.equal(state.result.points, 8000)
  assert.doesNotMatch(await html(), /30 fu\b|class="fu-breakdown"/)
  assert.doesNotMatch(state.resultShareText, /\bfu\b/)
  assert.doesNotMatch(state.resultAnnouncement, /\bfu\b/)

  state.form.tileEntry.doraIndicators = ['m1']
  assert.equal(state.result.han, 4)
  assert.match(await html(), /30 fu/)
  assert.match(state.resultShareText, /30 fu/)
})

test('quick entry hides fu controls and result details at every limit', async t => {
  const { state, html } = page(t)
  state.setEntryMode('hanfu')
  state.showBreakdown = true
  state.form.directHan = 4
  assert.match(await html(), /id="direct-fu"/)
  assert.match(await html(), /30 fu/)
  for (const han of [5, 6, 8, 11, 13]) {
    state.form.directHan = han
    assert.equal(state.resultReady, true)
    assert.doesNotMatch(await html(), /id="direct-fu"|30 fu\b|<span>Fu<\/span>/)
    assert.doesNotMatch(state.resultShareText, /\bfu\b/)
  }
})

test('quick-entry errors point to the field that can resolve them', t => {
  const { state } = page(t)
  state.setEntryMode('hanfu')
  state.form.directHan = 2
  state.form.directFu = 25
  state.form.winType = 'tsumo'
  assert.match(state.directEntryIssue, /needs at least 3 han/i)
  assert.equal(state.directIssueField, 'han')

  state.form.directHan = 3
  state.form.directFu = 20
  state.form.winType = 'ron'
  assert.match(state.directEntryIssue, /only possible on tsumo/i)
  assert.equal(state.directIssueField, 'winType')

  state.form.winType = 'tsumo'
  state.form.isClosed = false
  assert.match(state.directEntryIssue, /requires a closed hand/i)
  assert.equal(state.directIssueField, 'closed')
})

test('quick entry asks whether the hand is closed only for 20 or 25 fu', async t => {
  const { state, html } = page(t)
  state.setEntryMode('hanfu')
  state.form.directHan = 2
  assert.doesNotMatch(await html(), /class="direct-closed-control"/)

  state.form.directFu = 20
  assert.match(await html(), /class="direct-closed-control"/)
  state.form.directFu = 25
  assert.match(await html(), /class="direct-closed-control"/)

  state.form.directFu = 30
  assert.doesNotMatch(await html(), /class="direct-closed-control"/)
})

test('yakuman breakdown excludes bonus han and superseded regular yaku', async t => {
  const { state, html } = page(t)
  state.form.tileEntry = {
    tiles: ['m1', 'm9', 'p1', 'p9', 's1', 's9', 'h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'm1'],
    melds: [], winningIndex: 13, doraIndicators: ['m9'], uraIndicators: ['p9'],
  }
  state.setTileRiichi('riichi')
  state.tileStep = 1
  state.showBreakdown = true
  assert.equal(state.resultReady, true)
  assert.equal(state.result.isYakuman, true)
  assert.equal(state.result.bonusHan, 0)
  assert.equal(state.result.han, 13)
  assert.deepEqual(state.result.yaku.map(yaku => yaku.id), ['kokushi'])
  assert.doesNotMatch(await html(), /Bonus han|0\.0769|30 fu\b|class="fu-breakdown"/)
  assert.doesNotMatch(state.resultShareText, /\bfu\b/)
})
