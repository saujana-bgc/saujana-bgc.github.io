const STORAGE_KEY = 'saujana_birthday_admin_session'
const ADMIN_EMAIL = 'birthday-calendar-admin@saujana-bgc.com'
const REQUIRED_ROLE = 'birthday_admin'

export function useBirthdayAdmin() {
  const config = useRuntimeConfig()
  const session = ref(null)
  const storageType = ref(null)

  const isAuthenticated = computed(() => Boolean(session.value?.access_token))

  function getStorage(type) {
    if (!import.meta.client) return null
    return type === 'local' ? window.localStorage : window.sessionStorage
  }

  function clearStoredSessions() {
    if (!import.meta.client) return
    window.localStorage.removeItem(STORAGE_KEY)
    window.sessionStorage.removeItem(STORAGE_KEY)
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
      const rawSession = getStorage(type)?.getItem(STORAGE_KEY)
      if (!rawSession) continue

      try {
        return { session: JSON.parse(rawSession), type }
      } catch {
        getStorage(type)?.removeItem(STORAGE_KEY)
      }
    }

    return null
  }

  async function authRequest(path, options = {}) {
    return fetch(`${config.public.supabaseUrl}/auth/v1/${path}`, {
      ...options,
      headers: {
        apikey: config.public.supabaseKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }

  async function validateSession(candidate) {
    const response = await authRequest('user', {
      headers: { Authorization: `Bearer ${candidate.access_token}` },
    })

    if (!response.ok) return false
    const user = await response.json()
    return user.app_metadata?.role === REQUIRED_ROLE
  }

  async function refreshSession() {
    if (!session.value?.refresh_token) return false

    const response = await authRequest('token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.value.refresh_token }),
    })

    if (!response.ok) {
      logout()
      return false
    }

    const nextSession = await response.json()
    if (nextSession.user?.app_metadata?.role !== REQUIRED_ROLE) {
      logout()
      return false
    }

    saveSession(nextSession, storageType.value ?? 'session')
    return true
  }

  async function restoreSession() {
    const stored = loadStoredSession()
    if (!stored?.session?.access_token) return false

    session.value = stored.session
    storageType.value = stored.type

    const expiresSoon = Number(stored.session.expires_at ?? 0) <= Math.floor(Date.now() / 1000) + 30
    if (expiresSoon && !(await refreshSession())) return false

    if (!(await validateSession(session.value))) {
      if (!(await refreshSession()) || !(await validateSession(session.value))) {
        logout()
        return false
      }
    }

    return true
  }

  async function login(username, password, rememberMe) {
    if (username.trim().toLowerCase() !== 'admin') return false

    const response = await authRequest('token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN_EMAIL, password }),
    })

    if (!response.ok) return false

    const nextSession = await response.json()
    if (nextSession.user?.app_metadata?.role !== REQUIRED_ROLE) return false

    saveSession(nextSession, rememberMe ? 'local' : 'session')
    return true
  }

  function logout() {
    clearStoredSessions()
    session.value = null
    storageType.value = null
  }

  async function fetchBirthdays() {
    if (!session.value?.access_token) throw new Error('Not authenticated')

    const query = new URLSearchParams({
      select: 'id,name,birth_month,birth_day,allow_public_greeting,created_at',
      order: 'birth_month.asc,birth_day.asc,name.asc',
    })

    const request = () => fetch(
      `${config.public.supabaseUrl}/rest/v1/birthday_greetings?${query}`,
      {
        headers: {
          apikey: config.public.supabaseKey,
          Authorization: `Bearer ${session.value.access_token}`,
        },
      },
    )

    let response = await request()
    if (response.status === 401 && await refreshSession()) response = await request()
    if (!response.ok) throw new Error('Could not load birthdays')
    return response.json()
  }

  return {
    isAuthenticated,
    login,
    logout,
    restoreSession,
    fetchBirthdays,
  }
}
