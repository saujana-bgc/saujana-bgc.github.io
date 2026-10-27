import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileScript, parse } from '@vue/compiler-sfc'
import { computed, ref, shallowRef } from 'vue'

const { descriptor } = parse(readFileSync(new URL('../pages/riichi-open/index.vue', import.meta.url), 'utf8'))
const script = compileScript(descriptor, { id: 'riichi-open-recovery' })
const HOLD = 'riichi-open-i-registration-hold'
const DRAFT = 'riichi-open-i-registration-draft'
const token = 'a'.repeat(72)
const reservation = { id: 'hold-1', token, idempotency_key: 'key-'.repeat(9), name: 'Player' }
const summary = { event: { stage: 'registration', capacity: 16, registration_open: true }, registrations: [], active_holds: 0 }

function page(handler: (action: string, payload: any) => any = () => summary) {
  const saved = new Map<string, string>()
  const calls: { action: string; payload: any }[] = []
  const intervals = new Map<number, { callback: () => void; delay: number }>()
  const windowEvents = new Map<string, () => void>()
  const documentEvents = new Map<string, () => void>()
  const document = { visibilityState: 'visible', addEventListener: (name: string, callback: () => void) => documentEvents.set(name, callback), removeEventListener: (name: string) => documentEvents.delete(name) }
  let mounted: () => Promise<void>
  let unmounted: () => void
  let timer = 0
  const dependencies = {
    ref, shallowRef, computed, watch() {}, nextTick: async () => {}, useHead() {},
    onMounted: (callback: typeof mounted) => { mounted = callback },
    onBeforeUnmount: (callback: typeof unmounted) => { unmounted = callback },
    useRoute: () => ({ query: {}, path: '/riichi-open' }), useRouter: () => ({}),
    useRiichiOpen: () => ({ callPublic: async (action: string, payload: any) => { calls.push({ action, payload }); return handler(action, payload) } }),
    sessionStorage: { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) },
    window: {
      confirm: () => true,
      setInterval: (callback: () => void, delay: number) => { intervals.set(++timer, { callback, delay }); return timer },
      clearInterval: (id: number) => intervals.delete(id),
      addEventListener: (name: string, callback: () => void) => windowEvents.set(name, callback),
      removeEventListener: (name: string) => windowEvents.delete(name),
    },
    document,
  }
  const component = new Function(...Object.keys(dependencies), script.content.replace('export default', 'return'))(...Object.values(dependencies))
  const state = component.setup({}, { expose() {} })
  return { state, saved, storage: dependencies.sessionStorage, calls, intervals, windowEvents, documentEvents, document, mount: () => mounted(), unmount: () => unmounted() }
}

test('an incomplete saved hold still offers release when its ownership credentials survive', async () => {
  const app = page(action => action === 'cancel' ? { ok: true } : summary)
  app.saved.set(HOLD, JSON.stringify({ id: reservation.id, token }))
  await app.state.restoreSavedHold()
  assert.equal(app.state.restoreFailed.value, true)
  assert.equal(app.state.savedHoldCanRelease.value, true)
  await app.state.releaseSavedHold()
  assert.deepEqual(app.calls.find(call => call.action === 'cancel')?.payload, { hold_id: reservation.id, token })
  assert.equal(app.saved.has(HOLD), false)
  assert.equal(app.state.restoreFailed.value, false)
})

test('release uses the same saved draft fallback as restoration', async () => {
  const app = page(action => action === 'cancel' ? { ok: true } : summary)
  app.saved.set(DRAFT, JSON.stringify({ id: reservation.id, token }))
  await app.state.restoreSavedHold()
  await app.state.releaseSavedHold()
  assert.equal(app.calls.filter(call => call.action === 'cancel').length, 1)
  assert.equal(app.saved.has(DRAFT), false)
})

test('unreadable saved details have an explicit local reset without issuing a server cancellation', async () => {
  const app = page()
  app.saved.set(HOLD, '{broken json')
  await app.state.restoreSavedHold()
  assert.equal(app.state.savedHoldCanDiscard?.value, true)
  await app.state.clearSavedHoldDetails()
  assert.equal(app.saved.has(HOLD), false)
  assert.equal(app.state.restoreFailed.value, false)
  assert.equal(app.calls.some(call => call.action === 'cancel'), false)
})

test('a network failure preserves recoverable credentials and never offers to discard them', async () => {
  const app = page(() => { throw new Error('Offline') })
  app.saved.set(DRAFT, JSON.stringify(reservation))
  await app.state.restoreSavedHold()
  assert.equal(app.state.restoreFailed.value, true)
  assert.equal(app.state.savedHoldCanDiscard?.value ?? false, false)
  assert.equal(app.saved.get(DRAFT), JSON.stringify(reservation))
})

test('restoring an accepted draft saves the hold before clearing the draft', async () => {
  const app = page(() => ({ id: reservation.id, expires_at: '2026-11-14T06:30:00Z', path: 'receipt' }))
  app.saved.set(DRAFT, JSON.stringify(reservation))
  await app.state.restoreSavedHold()
  assert.equal(app.state.hold.value.token, token)
  assert.equal(app.saved.has(HOLD), true)
  assert.equal(app.saved.has(DRAFT), false)
})

test('leaving during the initial summary request cannot attach polling after unmount', async () => {
  let resolve!: (value: typeof summary) => void
  const response = new Promise<typeof summary>(done => { resolve = done })
  const app = page(() => response)
  const mounting = app.mount()
  app.unmount()
  resolve(summary)
  await mounting
  assert.equal(app.intervals.size, 0)
  assert.equal(app.windowEvents.size, 0)
  assert.equal(app.documentEvents.size, 0)
})

test('background tabs skip polling and refresh availability and the clock on becoming visible', async () => {
  const app = page()
  await app.mount()
  app.document.visibilityState = 'hidden'
  const count = app.calls.length
  app.intervals.forEach(timer => { if (timer.delay === 30000) timer.callback() })
  await Promise.resolve()
  assert.equal(app.calls.length, count)
  app.state.now.value = 0
  app.document.visibilityState = 'visible'
  app.documentEvents.get('visibilitychange')!()
  await Promise.resolve()
  assert.equal(app.calls.length, count + 1)
  assert.ok(app.state.now.value > 0)
  app.unmount()
  assert.equal(app.intervals.size, 0)
  assert.equal(app.documentEvents.size, 0)
})

test('duplicate reservation submissions issue only one request', async () => {
  let resolve!: (value: object) => void
  const response = new Promise(done => { resolve = done })
  const app = page(action => action === 'reserve' ? response : summary)
  app.state.name.value = 'Player'
  const first = app.state.reservePlace()
  const second = app.state.reservePlace()
  const requests = app.calls.filter(call => call.action === 'reserve').length
  resolve({ id: reservation.id, expires_at: '2026-11-14T06:30:00Z' })
  await Promise.all([first, second])
  assert.equal(requests, 1)
})

test('blocked browser storage still allows public details to load and prevents an unrecoverable reservation', async () => {
  const app = page()
  app.storage.getItem = () => { throw new Error('Storage is blocked') }
  app.storage.removeItem = () => { throw new Error('Storage is blocked') }
  await app.mount()
  assert.equal(app.state.publicLoaded.value, true)
  assert.equal(app.state.registrationStorageUnavailable.value, true)
  app.state.name.value = 'Player'
  await app.state.reservePlace()
  assert.equal(app.calls.filter(call => call.action === 'reserve').length, 0)
  app.unmount()
})

test('empty receipt files are rejected before upload', () => {
  const app = page()
  const target = { files: [{ type: 'image/png', size: 0 }], value: 'empty.png' }
  app.state.chooseReceipt({ target })
  assert.equal(app.state.receipt.value, null)
  assert.equal(target.value, '')
  assert.ok(app.state.error.value)
})
