import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileScript, parse } from '@vue/compiler-sfc'
import { computed, ref, shallowRef } from 'vue'

const { descriptor } = parse(readFileSync(new URL('../pages/riichi-open/index.vue', import.meta.url), 'utf8'))
const script = compileScript(descriptor, { id: 'riichi-open-recovery' })
const HOLD = 'riichi-open-i-registration-hold'
const DRAFT = 'riichi-open-i-registration-draft'
const CONFIRMATION = 'riichi-open-i-registration-confirmation'
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

test('a cancelled registration starts a linked fresh reservation and keeps retries idempotent', async () => {
  const calls: { action: string; payload: any }[] = []
  const app = page(async (action, payload) => {
    calls.push({ action, payload })
    if (action === 'restart') return { id: 'new-hold', path: 'receipt-path', expires_at: '2026-11-14T06:30:00Z', restarted_from_registration_id: 'registration-1' }
    return summary
  })
  app.saved.set(CONFIRMATION, JSON.stringify({ reference: 'OLDREF01', status: 'cancelled', registration_id: 'registration-1', display_name: 'Player', hold_id: 'old-hold', token }))
  app.state.complete.value = true
  app.state.registrationStatus.value = 'cancelled'
  app.state.name.value = 'Player'
  app.state.event.value = { stage: 'registration', registration_open: true, capacity: 16 }

  await app.state.restartCancelledRegistration()

  const restart = calls.find(call => call.action === 'restart')!
  assert.equal(restart.payload.registration_id, 'registration-1')
  assert.equal(restart.payload.previous_token, token)
  assert.equal(restart.payload.token.length, 72)
  assert.equal(restart.payload.idempotency_key.length, 36)
  assert.equal(app.state.complete.value, false)
  assert.equal(app.state.hold.value.id, 'new-hold')
  assert.equal(app.state.hold.value.restart_registration_id, 'registration-1')
  assert.equal(JSON.parse(app.saved.get(CONFIRMATION)!).reference, 'OLDREF01')
  assert.equal(JSON.parse(app.saved.get(HOLD)!).restart_previous_token, token)
})

test('releasing a restarted reservation restores its previous cancellation and allows a fresh retry', async () => {
  const restartKeys: string[] = []
  const app = page((action, payload) => {
    if (action === 'restart') {
      restartKeys.push(payload.idempotency_key)
      return { id: 'new-hold', expires_at: '2026-11-14T06:30:00Z', restarted_from_registration_id: 'registration-1' }
    }
    if (action === 'registration_status') return { id: 'registration-1', status: 'cancelled', reference: 'OLDREF01', display_name: 'Player' }
    return action === 'cancel' ? { ok: true } : summary
  })
  app.saved.set(CONFIRMATION, JSON.stringify({ reference: 'OLDREF01', status: 'cancelled', registration_id: 'registration-1', display_name: 'Player', hold_id: 'old-hold', token }))
  app.state.complete.value = true
  app.state.registrationStatus.value = 'cancelled'
  app.state.event.value = summary.event

  await app.state.restartCancelledRegistration()
  await app.state.cancelHold()

  assert.equal(app.state.complete.value, true)
  assert.equal(app.state.registrationRef.value, 'OLDREF01')
  assert.equal(app.state.registrationStatus.value, 'cancelled')
  assert.equal(app.state.hold.value, null)
  assert.equal(app.saved.has(HOLD), false)
  assert.equal(app.saved.has(DRAFT), false)
  await app.state.restartCancelledRegistration()
  assert.equal(restartKeys.length, 2)
  assert.notEqual(restartKeys[0], restartKeys[1])
})

test('reloading during a restart restores the replacement instead of showing the old cancellation', async () => {
  const app = page(action => action === 'restart'
    ? { id: 'new-hold', expires_at: '2026-11-14T06:30:00Z', restarted_from_registration_id: 'registration-1' }
    : summary)
  app.saved.set(CONFIRMATION, JSON.stringify({ reference: 'OLDREF01', status: 'cancelled', registration_id: 'registration-1', hold_id: 'old-hold', token }))
  app.saved.set(HOLD, JSON.stringify({ ...reservation, id: 'new-hold', restart_registration_id: 'registration-1', restart_previous_token: 'b'.repeat(72) }))

  await app.mount()

  assert.equal(app.state.complete.value, false)
  assert.equal(app.state.hold.value.id, 'new-hold')
  assert.equal(app.state.hold.value.restarted_from_registration_id, 'registration-1')
  assert.equal(JSON.parse(app.saved.get(CONFIRMATION)!).reference, 'OLDREF01')
  assert.equal(app.calls.filter(call => call.action === 'restart').length, 1)
  app.unmount()
})

test('a rejected registration cannot restart itself and retains its reference', async () => {
  const app = page(() => { throw new Error('Restart must not be requested') })
  app.saved.set(CONFIRMATION, JSON.stringify({ reference: 'OLDREF01', status: 'rejected', registration_id: 'registration-1', hold_id: 'old-hold', token }))
  app.state.complete.value = true
  app.state.registrationStatus.value = 'rejected'
  app.state.registrationRef.value = 'OLDREF01'

  await app.state.restartCancelledRegistration()

  assert.equal(app.state.complete.value, true)
  assert.equal(app.state.registrationRef.value, 'OLDREF01')
  assert.equal(app.calls.some(call => call.action === 'restart'), false)
})

test('restoring an interrupted restart retries the same linked request', async () => {
  const calls: { action: string; payload: any }[] = []
  const app = page(async (action, payload) => {
    calls.push({ action, payload })
    if (action === 'restart') return { id: 'new-hold', path: 'receipt-path', expires_at: '2026-11-14T06:30:00Z', restarted_from_registration_id: 'registration-1' }
    return summary
  })
  app.saved.set(DRAFT, JSON.stringify({ mode: 'restart', registration_id: 'registration-1', previous_token: token, token: 'b'.repeat(72), idempotency_key: 'key-'.repeat(9), name: 'Player' }))

  await app.state.restoreSavedHold()

  assert.equal(calls[0].action, 'restart')
  assert.equal(calls[0].payload.registration_id, 'registration-1')
  assert.equal(calls[0].payload.idempotency_key, 'key-'.repeat(9))
  assert.equal(app.state.hold.value.id, 'new-hold')
  assert.equal(JSON.parse(app.saved.get(HOLD)!).restart_registration_id, 'registration-1')
  assert.equal(app.saved.has(DRAFT), false)
})

test('a failed restart keeps the old cancellation and idempotency draft available', async () => {
  const app = page(action => action === 'restart' ? Promise.reject(new Error('All places are currently reserved')) : summary)
  app.saved.set(CONFIRMATION, JSON.stringify({ reference: 'OLDREF01', status: 'cancelled', registration_id: 'registration-1', display_name: 'Player', hold_id: 'old-hold', token }))
  app.state.complete.value = true
  app.state.registrationStatus.value = 'cancelled'
  app.state.registrationRef.value = 'OLDREF01'
  app.state.event.value = { stage: 'registration', registration_open: true, capacity: 16 }

  await app.state.restartCancelledRegistration()

  assert.equal(app.state.complete.value, true)
  assert.equal(JSON.parse(app.saved.get(CONFIRMATION)!).reference, 'OLDREF01')
  assert.equal(JSON.parse(app.saved.get(DRAFT)!).registration_id, 'registration-1')
  assert.match(app.state.error.value, /All places/)
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
