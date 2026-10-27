import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileScript, parse } from '@vue/compiler-sfc'
import { computed, effectScope, ref, shallowRef, watch } from 'vue'

const { descriptor } = parse(readFileSync(new URL('../pages/collection.vue', import.meta.url), 'utf8'))
const script = compileScript(descriptor, { id: 'collection-performance' })
const games = Array.from({ length: 120 }, (_, index) => ({
  name: `Game ${String(index).padStart(3, '0')}`, players: '2-4P', weight: 2,
  categories: [index % 3 === 0 ? 'Card Game' : 'Deduction'],
  designers: [index % 2 === 0 ? 'Ada' : 'Ben'],
}))

function collection(t: { after: (callback: () => void) => void }) {
  const rows = shallowRef([
    { game: 'Game 002', date: '2026-10-20' },
    { game: 'Game 003', date: '2026-10-21' },
    { game: 'Game 002', date: '2026-10-19' },
  ])
  const dependencies = {
    ref, computed, collectionDataSimple: { games, total: games.length, date: '20 Oct 2026' },
    usePlaylogData: () => ({ data: rows, isPending: ref(false), isError: ref(false) }),
    useHead() {}, onMounted() {}, onUnmounted() {}, watch() {}, nextTick() {},
  }
  const component = new Function(...Object.keys(dependencies), script.content
    .replace(/^import .* from ['"][^'"]+['"];?\s*$/gm, '')
    .replace('export default', 'return'))(...Object.values(dependencies))
  const scope = effectScope()
  t.after(() => scope.stop())
  const state = scope.run(() => component.setup({}, { expose() {} }))!
  state.viewportWidth.value = 1200
  state.viewportHeight.value = 800
  state.gridTop.value = 500
  return { state, rows, scope }
}

test('pixel scrolling within a virtual window leaves the rendered card list unchanged', t => {
  const { state, scope } = collection(t)
  state.scrollY.value = 4000
  const initial = state.virtualGames.value
  assert.equal(initial[0].name, 'Game 012')
  let updates = 0
  scope.run(() => watch(state.virtualGames, () => { updates++ }, { flush: 'sync' }))
  for (let pixel = 1; pixel <= 100; pixel++) state.scrollY.value = 4000 + pixel
  assert.equal(updates, 0, 'unchanged row boundaries should not update the card list')
  assert.equal(state.virtualGames.value, initial)
  state.scrollY.value = 4550
  assert.equal(updates, 1)
  assert.equal(state.virtualGames.value[0].name, 'Game 016')
})

test('search and category filters retain cached sort orders and return matching games', t => {
  const { state } = collection(t)
  const alphabetical = state.gamesByName.value
  const recent = state.gamesByPlayed.value
  state.search.value = '  ADA  '
  state.selectedCategories.value = ['Card Game']
  assert.deepEqual(state.displayedGames.value.map(game => game.name), games.filter((_, i) => i % 6 === 0).map(game => game.name))
  state.currentSort.value = 'played'
  state.search.value = 'game 00'
  state.selectedCategories.value = []
  assert.deepEqual(state.displayedGames.value.slice(0, 2).map(game => game.name), ['Game 003', 'Game 002'])
  assert.equal(state.gamesByName.value, alphabetical)
  assert.equal(state.gamesByPlayed.value, recent)
  state.currentSort.value = 'surprise'
  assert.ok(state.displayedGames.value.every(game => !['Game 002', 'Game 003'].includes(game.name)))
})

test('filter changes and replacement play history refresh cards even at unchanged row boundaries', t => {
  const { state, rows } = collection(t)
  const initial = state.virtualGames.value
  state.search.value = 'Ada'
  assert.notEqual(state.virtualGames.value, initial)
  assert.ok(state.virtualGames.value.every(game => game.designers.includes('Ada')))
  rows.value = [{ game: 'Game 000', date: '2026-10-27' }]
  assert.equal(state.virtualGames.value[0].stats.count, 1)
  assert.equal(state.virtualGames.value[1].stats.count, 0)
  state.search.value = 'no matching title'
  assert.deepEqual(state.virtualGames.value, [])
  assert.equal(state.topSpacerHeight.value, 0)
  assert.equal(state.bottomSpacerHeight.value, 0)
})

test('resizing and scrolling to the end preserves bounded rendering and spacer geometry', t => {
  const { state } = collection(t)
  state.viewportWidth.value = 600
  state.scrollY.value = 100000
  assert.equal(state.virtualGames.value.length, 16)
  assert.equal(state.virtualGames.value.at(-1).name, 'Game 119')
  assert.equal(state.bottomSpacerHeight.value, 0)
  assert.equal(state.topSpacerHeight.value, 52 * 446)
  state.viewportHeight.value = 1200
  assert.equal(state.virtualGames.value.length, 18)
  assert.equal(state.virtualGames.value.at(-1).name, 'Game 119')
})
