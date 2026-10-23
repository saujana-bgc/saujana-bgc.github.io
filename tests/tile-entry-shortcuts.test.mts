import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileScript, parse } from '@vue/compiler-sfc'
import { computed, effectScope, nextTick, proxyRefs, reactive, ref, watch } from 'vue'

const { descriptor } = parse(readFileSync(new URL('../components/riichi/TileHandEntry.vue', import.meta.url), 'utf8'))
const script = compileScript(descriptor, { id: 'tile-entry-shortcuts' })
const component = new Function('computed', 'nextTick', 'ref', 'watch', script.content
  .replace(/^import[\s\S]*?from ['"][^'"]+['"];?\s*$/gm, '')
  .replace('export default', 'return'))(computed, nextTick, ref, watch)

const hand = ['m2', 'm3', 'm4', 'p2', 'p2', 'p3', 'p4', 'p5r', 's4', 's5', 's6', 's6', 's7', 's8']

function entry(t: { after: (callback: () => void) => void }, tiles = hand) {
  const scope = effectScope()
  t.after(() => scope.stop())
  const props = reactive({
    modelValue: { tiles: [...tiles], melds: [], winningIndex: null, doraIndicators: [], uraIndicators: [] },
    stage: 0, resultPanelVisible: false, playerCount: 4, riichi: false,
    tileSituation: { riichi: 'none', ippatsu: false, renhou: false }, physicalError: '', shapeError: '',
  })
  const events: string[] = []
  const state = scope.run(() => proxyRefs(component.setup(props, {
    expose() {},
    emit(name: string, value: unknown) {
      if (name === 'update:modelValue') props.modelValue = value as typeof props.modelValue
      else events.push(name)
    },
  })))!
  return { state, props, events }
}

test('the last-tile shortcut explicitly chooses the winner, advances once, and can be undone', t => {
  const { state, props, events } = entry(t)
  assert.equal(props.modelValue.winningIndex, null)
  state.useLastTileAndContinue()
  assert.equal(props.modelValue.winningIndex, 13)
  assert.deepEqual(events, ['next-step'])
  state.useLastTileAndContinue()
  assert.deepEqual(events, ['next-step'])
  state.undo()
  assert.equal(props.modelValue.winningIndex, null)
  assert.deepEqual(props.modelValue.tiles, hand)
})

test('the winning-tile shortcut rejects incomplete hands and physical tile errors', t => {
  const { state, props, events } = entry(t, hand.slice(0, 13))
  state.useLastTileAndContinue()
  assert.deepEqual(events, [])
  props.modelValue.tiles.push('s8')
  props.physicalError = 'A tile appears more than 4 times'
  state.useLastTileAndContinue()
  assert.equal(props.modelValue.winningIndex, null)
  assert.deepEqual(events, [])
})

test('complete chi shortcuts retain red-five identity and undo restores the hand', t => {
  const { state, props } = entry(t)
  state.toggleGroupPicker()
  const option = state.groupShortcuts.find(option => option.tokens.includes('p5r'))
  assert.ok(option)
  state.markGroup(option.indices)
  assert.equal(props.modelValue.melds.length, 1)
  assert.equal(props.modelValue.melds[0].type, 'chi')
  assert.deepEqual(props.modelValue.melds[0].tokens, ['p3', 'p4', 'p5r'])
  assert.deepEqual(props.modelValue.tiles, hand)
  state.undo()
  assert.deepEqual(props.modelValue.melds, [])
  assert.deepEqual(props.modelValue.tiles, hand)
})

test('pon shortcuts distinguish red and ordinary fives without repeating identical copies', t => {
  const { state } = entry(t, ['p5', 'p5', 'p5', 'p5r', ...hand.filter(token => token !== 'p5r').slice(0, 10)])
  state.toggleGroupPicker()
  state.chooseMeld('pon')
  assert.equal(state.groupShortcuts.length, 2)
  assert.equal(state.groupShortcuts.filter(option => option.tokens.includes('p5r')).length, 1)
})

test('kan shortcuts never offer a grouped extra tile as the winning tile', t => {
  const { state, props, events } = entry(t, ['m1', 'm1', 'm1', ...hand.slice(3), 'm1'])
  state.toggleGroupPicker()
  state.chooseMeld('kan-closed')
  state.markGroup(state.groupShortcuts[0].indices)
  assert.equal(props.modelValue.tiles.length, 15)
  assert.equal(props.modelValue.melds[0].tokens.length, 4)
  assert.equal(state.canContinue, true)
  assert.equal(state.canUseLastTile, false)
  state.useLastTileAndContinue()
  assert.deepEqual(events, [])
})

test('switching to three-player mode changes an open chi picker to an available call', async t => {
  const { state, props } = entry(t, ['m2', 'm3', 'm4', 'p5', 'p5', 'p5', 's2', 's3', 's4', 's6', 's7', 's8', 'h4', 'h4'])
  state.toggleGroupPicker()
  state.chooseMeld('chi')
  assert.equal(state.meldType, 'chi')

  props.playerCount = 3
  await nextTick()

  assert.equal(state.meldType, 'pon')
  assert.ok(state.groupShortcuts.length > 0)
  state.markGroup(state.groupShortcuts[0].indices)
  assert.equal(props.modelValue.melds[0].type, 'pon')
})

test('clearing a manual group selection returns focus to the hand', async t => {
  const { state } = entry(t)
  let focused = false
  state.tileHandTray = { querySelector: () => ({ focus: () => { focused = true } }) }
  state.selection = [0, 1]

  state.clearGroupSelection()
  await nextTick()

  assert.deepEqual(state.selection, [])
  assert.equal(focused, true)
})

test('the group picker offers no chi shortcut when three-player mode leaves no legal call', async t => {
  const { state, props } = entry(t)
  state.toggleGroupPicker()
  const chi = state.groupShortcuts[0]
  assert.ok(chi)

  props.playerCount = 3
  await nextTick()

  assert.deepEqual(state.groupShortcuts, [])
  state.markGroup(chi.indices)
  assert.deepEqual(props.modelValue.melds, [])
})
