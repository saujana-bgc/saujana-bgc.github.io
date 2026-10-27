import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileScript, parse } from '@vue/compiler-sfc'
import { transformSync } from 'esbuild'
import { computed, reactive, ref } from 'vue'
import { scoreFourPlayerTable } from '../utils/riichiOpenScoring.js'

const adminPageSource = readFileSync(new URL('../pages/admin/riichi-open.vue', import.meta.url), 'utf8')
const adminPage = compileScript(parse(adminPageSource).descriptor, { id: 'riichi-open-admin-reliability' })

function page(callAdmin: (action: string, payload: any) => Promise<any>) {
  const dependencies = {
    ref, reactive, computed, scoreFourPlayerTable,
    definePageMeta() {}, useHead() {}, useRoute: () => ({ hash: '' }),
    onMounted() {}, onBeforeUnmount() {}, onBeforeRouteLeave() {}, watch() {}, nextTick: async () => {},
    useRiichiOpen: () => ({ callAdmin, callPublic: async () => ({}) }),
  }
  const component = new Function(...Object.keys(dependencies), adminPage.content
    .replace(/^import .* from ['"][^'"]+['"];?\s*$/gm, '')
    .replace('export default', 'return'))(...Object.values(dependencies))
  return component.setup({}, { expose() {} })
}

function addDirtyRound(state: any) {
  state.data.value = {
    event: { stage: 'qualifier_1' },
    rounds: [{ id: 'round', status: 'active', draft_revision: 0, expected_tables: 1 }],
    tables: [{ id: 'table', round_id: 'round' }],
    seats: ['East', 'South', 'West', 'North'].map((seat_wind, i) => ({ table_id: 'table', participant_id: `player-${i}`, seat_wind })),
    results: [], participants: [], registrations: [],
  }
  state.scores.table = Object.fromEntries([40000, 30000, 30000, 20000].map((points, i) => [`player-${i}`, points]))
  state.sticks.table = 0
  state.savedScores.table = {}
  state.savedSticks.table = 0
}

test('a failed score flush stops after one attempt and does not record the penalty', async () => {
  const calls: string[] = []
  const state = page(async action => {
    calls.push(action)
    if (action === 'save_table') throw new Error('Temporary network failure')
    throw new Error(`Unexpected action: ${action}`)
  })
  addDirtyRound(state)

  const result = await state.act('penalty', { round_id: 'round', participant_id: 'player-0', points: 30, reason: 'Chombo' })

  assert.equal(result, null)
  assert.deepEqual(calls, ['save_table'])
  assert.equal(state.busy.value, false)
  assert.deepEqual(state.roundMutationLocks.value, [])
  assert.equal(state.tableSaveStates.table, 'error')
  assert.match(state.error.value, /Temporary network failure/)
  assert.equal(state.scores.table['player-0'], 40000)
})

test('a penalty proceeds after all dirty table scores save successfully', async () => {
  const calls: string[] = []
  const state = page(async action => {
    calls.push(action)
    if (action === 'save_table') return { draft_revision: 1 }
    if (action === 'penalty') return { draft_revision: 2 }
    if (action === 'overview') return { event: { stage: 'qualifier_1' }, registrations: [], participants: [], rounds: [], tables: [], seats: [], results: [], penalties: [], audit: [] }
    throw new Error(`Unexpected action: ${action}`)
  })
  addDirtyRound(state)

  const result = await state.act('penalty', { round_id: 'round', participant_id: 'player-0', points: 30, reason: 'Chombo' })

  assert.ok(result)
  assert.equal(calls.filter(action => action === 'save_table').length, 1)
  assert.equal(calls.filter(action => action === 'penalty').length, 1)
})

test('participant saves include the version of every field they change', async () => {
  const calls: { action: string; payload: any }[] = []
  const state = page(async (action, payload) => {
    calls.push({ action, payload })
    return {}
  })
  const person = { id: 'participant-1' }
  state.data.value = { event: { stage: 'registration' }, participants: [person], registrations: [] }
  state.savedParticipantEdits[person.id] = { display_name: 'Original', checked_in: false, is_substitute: false, eligible_for_final: true }
  state.participantEdits[person.id] = { ...state.savedParticipantEdits[person.id], display_name: 'Edited', checked_in: true }

  await state.saveParticipant(person)

  assert.deepEqual(calls[0], {
    action: 'participant_update',
    payload: {
      participant_id: person.id, display_name: 'Edited', checked_in: true,
      expected: { display_name: 'Original', checked_in: false }, reason: 'Roster update',
    },
  })
})

test('a stale participant save reloads the latest row and preserves the organiser conflict', async () => {
  const current = { id: 'participant-1', registration_id: 'registration-1', display_name: 'Organiser A', active: true, checked_in: false, is_substitute: false, eligible_for_final: true }
  const state = page(async action => {
    if (action === 'participant_update') throw new Error('Participant changed in another session; reload the roster before saving')
    if (action === 'overview') return {
      event: { stage: 'registration' }, registrations: [{ id: 'registration-1', display_name: 'Organiser B', private_note: '' }],
      participants: [{ ...current, display_name: 'Organiser B' }], rounds: [], tables: [], seats: [], results: [], penalties: [], audit: [],
    }
    throw new Error(`Unexpected action: ${action}`)
  })
  const person = { id: current.id }
  state.data.value = { event: { stage: 'registration' }, participants: [current], registrations: [], rounds: [], tables: [], seats: [], results: [], penalties: [], audit: [] }
  state.savedParticipantEdits[person.id] = { display_name: 'Original', checked_in: false, is_substitute: false, eligible_for_final: true }
  state.participantEdits[person.id] = { ...state.savedParticipantEdits[person.id], display_name: 'Organiser A' }

  await state.saveParticipant(person)

  assert.deepEqual(state.participantConflicts[person.id], ['display_name'])
  assert.equal(state.participantEdits[person.id].display_name, 'Organiser A')
  assert.equal(state.savedParticipantEdits[person.id].display_name, 'Organiser B')
  assert.equal(state.participantSaveStates[person.id], '')
  assert.match(state.error.value, /Another organiser changed this participant/)
})

const adminFunctionSource = readFileSync(new URL('../supabase/functions/riichi-open-admin/index.ts', import.meta.url), 'utf8')
const adminFunction = transformSync(adminFunctionSource.replace(/^import .*\r?\n/, ''), { loader: 'ts', format: 'esm' }).code

function adminHandler(rpc: (name: string, args: any) => Promise<any>) {
  let handler!: (request: Request) => Promise<Response>
  const client = {
    from(table: string) {
      const query: any = { select() { return query }, eq() { return query }, single() { return query }, then(resolve: (value: object) => unknown) {
        return Promise.resolve({ data: table === 'riichi_open_events' ? { id: 'event-1', stage: 'registration' } : null, error: null }).then(resolve)
      } }
      return query
    },
    rpc,
  }
  new Function('Deno', 'serviceClient', 'adminUser', 'eventSlug', 'reply', 'safeMessage', adminFunction)(
    { serve(callback: typeof handler) { handler = callback } }, () => client, async () => ({ id: 'organiser-1' }), 'riichi-open-i',
    (_request: Request, status: number, body: unknown) => Response.json(body, { status }), (error: Error) => error.message,
  )
  return (body: object) => handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ action: 'participant_update', participant_id: 'participant-1', ...body }) }))
}

test('participant rename uses one atomic compare-and-update RPC and reports database failure', async () => {
  const calls: { name: string; args: any }[] = []
  const request = adminHandler(async (name, args) => {
    calls.push({ name, args })
    return { data: null, error: new Error('Linked registration could not be updated') }
  })

  const response = await request({ display_name: '  New Name  ', checked_in: true, expected: { display_name: 'Old Name', checked_in: false } })

  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, 'Linked registration could not be updated')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'admin_update_riichi_open_participant')
  assert.deepEqual(calls[0].args, {
    p_event_id: 'event-1', p_participant_id: 'participant-1',
    p_patch: { display_name: 'New Name', checked_in: true },
    p_expected: { display_name: 'Old Name', checked_in: false }, p_actor: 'organiser-1', p_reason: null,
  })
})

test('participant updates reject empty changes before calling the database', async () => {
  let rpcCalls = 0
  const request = adminHandler(async () => { rpcCalls++; return { data: null, error: null } })
  const response = await request({ unrelated: 'ignored' })
  assert.equal(response.status, 400)
  assert.equal(rpcCalls, 0)
})

test('the admin endpoint returns a conflict for a stale participant version', async () => {
  const request = adminHandler(async () => ({ data: null, error: new Error('Participant changed in another session; reload the roster before saving') }))
  const response = await request({ display_name: 'New Name', expected: { display_name: 'Old Name' } })
  assert.equal(response.status, 409)
  assert.match((await response.json()).error, /Participant changed in another session/)
})

test('marking an already-ineligible participant as a substitute preserves the expected field set', async () => {
  const calls: { name: string; args: any }[] = []
  const request = adminHandler(async (name, args) => { calls.push({ name, args }); return { data: null, error: null } })
  const response = await request({ is_substitute: true, expected: { is_substitute: false } })

  assert.equal(response.status, 200)
  assert.equal(calls[0].args.p_patch.is_substitute, true)
  assert.deepEqual(calls[0].args.p_expected, { is_substitute: false })
  assert.equal('eligible_for_final' in calls[0].args.p_patch, false)
})
