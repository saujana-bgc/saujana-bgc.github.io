const STORAGE_KEY = 'saujana_admin_session'
const LEGACY_STORAGE_KEY = 'saujana_birthday_admin_session'
const ADMIN_EMAIL = 'birthday-calendar-admin@saujana-bgc.com'
const REQUIRED_ROLE = 'birthday_admin'
const AUTH_REQUEST_TIMEOUT_MS = 8000
let sharedRefreshPromise = null
let authRevision = 0

export function useAdminAuth() {
  const config = useRuntimeConfig()
  const session = useState('saujana-admin-session', () => null)
  const storageType = useState('saujana-admin-storage-type', () => null)
  const isRestoring = useState('saujana-admin-restoring', () => true)
  const mfaRequired = useState('saujana-admin-mfa-required', () => false)
  const mfaQrCode = useState('saujana-admin-mfa-qr-code', () => '')
  const mfaFactorId = useState('saujana-admin-mfa-factor-id', () => '')
  const mfaChallengeId = useState('saujana-admin-mfa-challenge-id', () => '')
  const rememberAfterMfa = useState('saujana-admin-remember-after-mfa', () => false)
  const isAuthenticated = computed(() => Boolean(session.value?.access_token))

  function getStorage(type) {
    if (!import.meta.client) return null
    return type === 'local' ? window.localStorage : window.sessionStorage
  }

  function clearStoredSessions() {
    if (!import.meta.client) return
    for (const storage of [window.localStorage, window.sessionStorage]) {
      storage.removeItem(STORAGE_KEY)
      storage.removeItem(LEGACY_STORAGE_KEY)
    }
  }

  function saveSession(nextSession, type) {
    const expiresAt = nextSession.expires_at
      ?? Math.floor(Date.now() / 1000) + Number(nextSession.expires_in ?? 3600)
    const storedSession = { ...nextSession, expires_at: expiresAt }
    clearStoredSessions()
    getStorage(type)?.setItem(STORAGE_KEY, JSON.stringify(storedSession))
    session.value = storedSession
    storageType.value = type
  }

  function loadStoredSession() {
    if (!import.meta.client) return null
    for (const type of ['local', 'session']) {
      const storage = getStorage(type)
      for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
        const raw = storage?.getItem(key)
        if (!raw) continue
        try {
          return { session: JSON.parse(raw), type, legacy: key === LEGACY_STORAGE_KEY }
        } catch {
          storage?.removeItem(key)
        }
      }
    }
    return null
  }

  async function authRequest(path, options = {}) {
    const controller = new AbortController()
    let timeout
    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort()
        reject(new Error('Authentication request timed out.'))
      }, AUTH_REQUEST_TIMEOUT_MS)
    })
    try {
      const request = fetch(`${config.public.supabaseUrl}/auth/v1/${path}`, {
          ...options,
          signal: controller.signal,
          headers: {
            apikey: config.public.supabaseKey,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        })
      return await Promise.race([request, timeoutPromise])
    } finally {
      clearTimeout(timeout)
    }
  }

  async function validateSession(candidate) {
    if (!candidate?.access_token) return false
    if (jwtClaims(candidate.access_token)?.aal !== 'aal2') return false
    const response = await authRequest('user', {
      headers: { Authorization: `Bearer ${candidate.access_token}` },
    })
    if (!response.ok) return false
    const user = await response.json()
    return user.app_metadata?.role === REQUIRED_ROLE
  }

  function jwtClaims(token) {
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    } catch {
      return null
    }
  }

  async function mfaRequest(path, accessToken, options = {}) {
    return authRequest(`factors${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
    })
  }

  async function prepareMfa(nextSession, rememberMe) {
    const response = await mfaRequest('', nextSession.access_token)
    if (!response.ok) throw new Error('Authenticator setup is unavailable. Please try again.')
    const factorList = await response.json()
    const verifiedFactor = (factorList.totp ?? []).find(factor => factor.status === 'verified')
    let factor = verifiedFactor

    if (!factor) {
      const enrollResponse = await mfaRequest('', nextSession.access_token, {
        method: 'POST',
        body: JSON.stringify({ factor_type: 'totp', friendly_name: 'Saujana organiser' }),
      })
      if (!enrollResponse.ok) throw new Error('Could not set up an authenticator. Please try again.')
      factor = await enrollResponse.json()
      mfaQrCode.value = factor.totp?.qr_code ?? ''
    } else {
      mfaQrCode.value = ''
    }

    const challengeResponse = await mfaRequest(`/${factor.id}/challenge`, nextSession.access_token, { method: 'POST' })
    if (!challengeResponse.ok) throw new Error('Could not start authenticator verification. Please try again.')
    const challenge = await challengeResponse.json()
    session.value = nextSession
    mfaFactorId.value = factor.id
    mfaChallengeId.value = challenge.id
    rememberAfterMfa.value = rememberMe
    mfaRequired.value = true
    isRestoring.value = false
  }

  async function verifyMfa(code) {
    const pendingSession = session.value
    if (!pendingSession?.access_token || !mfaFactorId.value || !mfaChallengeId.value) return false
    const response = await mfaRequest(`/${mfaFactorId.value}/verify`, pendingSession.access_token, {
      method: 'POST',
      body: JSON.stringify({ challenge_id: mfaChallengeId.value, code: code.trim() }),
    })
    if (!response.ok) return false
    const verifiedSession = await response.json()
    if (jwtClaims(verifiedSession.access_token)?.aal !== 'aal2' || verifiedSession.user?.app_metadata?.role !== REQUIRED_ROLE) return false
    saveSession(verifiedSession, rememberAfterMfa.value ? 'local' : 'session')
    mfaRequired.value = false
    mfaFactorId.value = ''
    mfaChallengeId.value = ''
    mfaQrCode.value = ''
    return true
  }

  async function cancelMfa() {
    await logout()
    mfaRequired.value = false
    mfaFactorId.value = ''
    mfaChallengeId.value = ''
    mfaQrCode.value = ''
  }

  async function refreshSession() {
    if (!session.value?.refresh_token) return false
    if (sharedRefreshPromise) return sharedRefreshPromise
    const revision = authRevision
    sharedRefreshPromise = (async () => {
      const response = await authRequest('token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: session.value.refresh_token }),
      })
      if (!response.ok) {
        if (revision === authRevision) {
          clearStoredSessions()
          session.value = null
          storageType.value = null
        }
        return false
      }
      const nextSession = await response.json()
      if (nextSession.user?.app_metadata?.role !== REQUIRED_ROLE || jwtClaims(nextSession.access_token)?.aal !== 'aal2') {
        if (revision === authRevision) {
          clearStoredSessions()
          session.value = null
          storageType.value = null
        }
        return false
      }
      if (revision !== authRevision) return false
      saveSession(nextSession, storageType.value ?? 'session')
      return true
    })()
    try { return await sharedRefreshPromise } finally { sharedRefreshPromise = null }
  }

  async function restoreSession() {
    const revision = authRevision
    isRestoring.value = true
    try {
      if (isAuthenticated.value) {
        const valid = await validateSession(session.value)
        if (revision !== authRevision) return isAuthenticated.value
        if (valid) return true
        if (revision === authRevision) {
          session.value = null
          storageType.value = null
        }
      }
      const stored = loadStoredSession()
      if (!stored?.session?.access_token) return false
      let candidate = stored.session
      const expiresSoon = Number(candidate.expires_at ?? 0) <= Math.floor(Date.now() / 1000) + 30
      if (expiresSoon) {
        const response = await authRequest('token?grant_type=refresh_token', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: candidate.refresh_token }),
        })
        if (revision !== authRevision) return isAuthenticated.value
        if (!response.ok) {
          clearStoredSessions()
          return false
        }
        candidate = await response.json()
        if (candidate.user?.app_metadata?.role !== REQUIRED_ROLE) {
          clearStoredSessions()
          return false
        }
      } else if (!(await validateSession(candidate))) {
        const response = await authRequest('token?grant_type=refresh_token', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: candidate.refresh_token }),
        })
        if (revision !== authRevision) return isAuthenticated.value
        if (!response.ok) {
          clearStoredSessions()
          return false
        }
        candidate = await response.json()
        if (revision !== authRevision) return isAuthenticated.value
        const valid = candidate.user?.app_metadata?.role === REQUIRED_ROLE && await validateSession(candidate)
        if (revision !== authRevision) return isAuthenticated.value
        if (!valid) {
          clearStoredSessions()
          return false
        }
      }
      if (revision !== authRevision) return isAuthenticated.value
      saveSession(candidate, stored.type)
      return true
    } catch (error) {
      // A failed session check must never leave token-shaped state authenticated.
      if (revision === authRevision) {
        session.value = null
        storageType.value = null
      }
      throw error
    } finally {
      isRestoring.value = false
    }
  }

  function cancelRestore() {
    authRevision += 1
    session.value = null
    storageType.value = null
    isRestoring.value = false
  }

  async function login(username, password, rememberMe = true) {
    if (username.trim().toLowerCase() !== 'admin') return false
    const revision = ++authRevision
    const response = await authRequest('token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN_EMAIL, password }),
    })
    if (!response.ok) return false
    const nextSession = await response.json()
    if (nextSession.user?.app_metadata?.role !== REQUIRED_ROLE) return false
    if (revision !== authRevision) return false
    await prepareMfa(nextSession, rememberMe)
    return true
  }

  async function logout() {
    authRevision += 1
    const token = session.value?.access_token
    if (token) {
      try {
        await authRequest('logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      } catch { /* Local sign-out must still complete when the network is unavailable. */ }
    }
    clearStoredSessions()
    session.value = null
    storageType.value = null
    if (import.meta.client) window.dispatchEvent(new CustomEvent('saujana-admin-logout'))
  }

  async function authenticatedFetch(path, options = {}) {
    if (!session.value?.access_token) throw new Error('Not authenticated')
    const request = (accessToken) => fetch(path, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
    })

    let accessToken = session.value.access_token
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await request(accessToken)
      if (response.status !== 401) return response

      const currentToken = session.value?.access_token
      if (currentToken && currentToken !== accessToken) {
        accessToken = currentToken
        continue
      }

      if (attempt === 0) {
        const refreshed = await refreshSession()
        const refreshedToken = session.value?.access_token
        if (refreshedToken && (refreshed || refreshedToken !== accessToken)) {
          accessToken = refreshedToken
          continue
        }
      }

      if (session.value?.access_token && session.value.access_token !== accessToken) {
        accessToken = session.value.access_token
        continue
      }

      await logout()
      throw new Error('Your session has expired. Please sign in again.')
    }

    throw new Error('Your session changed while this request was being sent. Please try again.')
  }

  if (import.meta.client && !window.__saujanaAdminStorageListener) {
    window.__saujanaAdminStorageListener = true
    window.addEventListener('storage', (event) => {
      if (![STORAGE_KEY, LEGACY_STORAGE_KEY].includes(event.key)) return
      const stored = loadStoredSession()
      if (stored?.session?.access_token) {
        authRevision += 1
        session.value = stored.session
        storageType.value = stored.type
        isRestoring.value = false
        return
      }
      if (!event.newValue) {
        authRevision += 1
        session.value = null
        storageType.value = null
      }
    })
  }

  return { session, isAuthenticated, isRestoring, mfaRequired, mfaQrCode, login, verifyMfa, cancelMfa, logout, restoreSession, cancelRestore, refreshSession, authenticatedFetch }
}
