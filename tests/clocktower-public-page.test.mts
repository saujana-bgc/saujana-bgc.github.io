import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileScript, parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'

const { descriptor } = parse(readFileSync(new URL('../pages/only-blood-in-the-clocktower.vue', import.meta.url), 'utf8'))
const { content } = compileScript(descriptor, { id: 'clocktower-public-page' })

function page() {
  const dependencies = {
    computed, ref, onMounted() {},
    useRuntimeConfig: () => ({ public: {} }),
    useRoute: () => ({ query: {} }),
    Date: class extends Date { constructor() { super('2026-11-11T17:00:00Z') } },
  }
  const component = new Function(...Object.keys(dependencies), content.replace('export default', 'return'))(...Object.values(dependencies))
  return component.setup({}, { expose() {} })
}

const event = { id: 36, name: 'Only Blood in the Clocktower', date: '2026-11-21', venue: 'Boardroom Bandit' }
const recap = { id: 'recap', session_date: event.date, venue: event.venue, recap: 'A quiet town.', games: [{ script: 'Trouble Brewing' }] }

test('publishing a recap before its gathering date shows it without hiding the upcoming event', () => {
  const state = page()
  state.communityEvents.value = [event]
  state.sessions.value = [recap]

  assert.deepEqual(state.filteredSessions.value, [recap])
  assert.equal(state.nextGathering.value.href, '/gatherings/#gathering-36')
})

test('a same day recap takes the completed gathering off the upcoming calendar', () => {
  const state = page()
  const today = '2026-11-12'
  state.communityEvents.value = [{ ...event, date: today }, event]
  state.sessions.value = [{ ...recap, session_date: today }]

  assert.equal(state.filteredSessions.value[0].session_date, today)
  assert.equal(state.nextGathering.value.date, event.date)
})

test('a published announcement without a retelling or games remains an upcoming gathering', () => {
  const state = page()
  state.sessions.value = [{ id: 'announcement', session_date: event.date, venue: event.venue, games: [] }]

  assert.deepEqual(state.filteredSessions.value, [])
  assert.equal(state.nextGathering.value.date, event.date)
})
