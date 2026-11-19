import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { useAdminAuth } from '../composables/useAdminAuth.js'

const source = readFileSync(new URL('../composables/useAdminAuth.js', import.meta.url), 'utf8')
  .replace('export function useAdminAuth', 'function useAdminAuth')
  .replaceAll('import.meta.client', 'true')

const admin = { app_metadata: { role: 'birthday_admin' } }
const credentials = (aal: string) => ({
  access_token: `header.${Buffer.from(JSON.stringify({ aal })).toString('base64url')}.signature`,
  refresh_token: `refresh-${aal}`,
  user: admin,
})

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

function loadAuth(request: (path: string, options: RequestInit) => Response, localStorage = storage()) {
  const sessionStorage = storage()
  const window = { localStorage, sessionStorage, addEventListener() {} }
  const useRuntimeConfig = () => ({ public: { supabaseUrl: 'https://example.test', supabaseKey: 'test-key' } })
  const useState = (_key: string, init: () => unknown) => ({ value: init() })
  const computed = (get: () => unknown) => ({ get value() { return get() } })
  const fetch = (url: string, options: RequestInit) => Promise.resolve(request(url.split('/auth/v1/')[1], options))
  const makeAuth = new Function('useRuntimeConfig', 'useState', 'computed', 'window', 'fetch', `${source}\nreturn useAdminAuth()`)
  const auth: ReturnType<typeof useAdminAuth> = makeAuth(useRuntimeConfig, useState, computed, window, fetch)
  return { auth, localStorage, sessionStorage }
}

test('first sign-in uses the user profile for factors and remembers only a verified session', async () => {
  let challenges = 0
  const { auth, localStorage, sessionStorage } = loadAuth((path, options) => {
    switch (path) {
      case 'token?grant_type=password': return Response.json(credentials('aal1'))
      case 'user': return Response.json(admin)
      case 'factors':
        assert.equal(options.method, 'POST')
        return Response.json({ id: 'new-factor', totp: { qr_code: '<svg/>', secret: 'SETUPKEY' } })
      case 'factors/new-factor/challenge': return Response.json({ id: `challenge-${++challenges}` })
      case 'factors/new-factor/verify': {
        const body = JSON.parse(String(options.body))
        assert.equal(body.challenge_id, `challenge-${challenges}`)
        return challenges === 1 ? new Response(null, { status: 422 }) : Response.json(credentials('aal2'))
      }
      default: throw new Error(`Unexpected request for ${path}`)
    }
  })

  assert.equal(await auth.login('admin', 'test-password', true), true)
  assert.equal(auth.isAuthenticated.value, false)
  assert.equal(auth.mfaQrCode.value, 'data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E')
  assert.equal(localStorage.getItem('saujana_admin_session'), null)
  assert.equal(await auth.verifyMfa('000001'), false)
  assert.equal(await auth.verifyMfa('000002'), true)
  assert.equal(auth.isAuthenticated.value, true)
  assert.equal(auth.mfaQrCode.value, '')
  assert.equal(sessionStorage.getItem('saujana_admin_session'), null)
  assert.equal(JSON.parse(localStorage.getItem('saujana_admin_session')!).refresh_token, 'refresh-aal2')

  const reopened = loadAuth(path => {
    assert.equal(path, 'user')
    return Response.json(admin)
  }, localStorage)
  assert.equal(await reopened.auth.restoreSession(), true)
})

test('an enrolled organiser can sign in without creating another factor', async () => {
  const { auth, localStorage, sessionStorage } = loadAuth(path => {
    switch (path) {
      case 'token?grant_type=password': return Response.json(credentials('aal1'))
      case 'user': return Response.json({ ...admin, factors: [{ id: 'existing', factor_type: 'totp', status: 'verified' }] })
      case 'factors/existing/challenge': return Response.json({ id: 'challenge' })
      case 'factors/existing/verify': return Response.json(credentials('aal2'))
      default: throw new Error(`Unexpected request for ${path}`)
    }
  })
  assert.equal(await auth.login('admin', 'test-password'), true)
  assert.equal(auth.mfaQrCode.value, '')
  assert.equal(await auth.verifyMfa('000001'), true)
  assert.equal(localStorage.getItem('saujana_admin_session'), null)
  assert.ok(sessionStorage.getItem('saujana_admin_session'))
})

test('a saved password-only session is cleared and never restored as admin', async () => {
  const localStorage = storage()
  localStorage.setItem('saujana_admin_session', JSON.stringify(credentials('aal1')))
  const { auth } = loadAuth(() => assert.fail('Password-only session must not be refreshed'), localStorage)
  assert.equal(await auth.restoreSession(), false)
  assert.equal(auth.isAuthenticated.value, false)
  assert.equal(localStorage.getItem('saujana_admin_session'), null)
})
