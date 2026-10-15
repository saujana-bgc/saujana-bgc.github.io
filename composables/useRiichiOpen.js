export function useRiichiOpen() {
  const config = useRuntimeConfig()
  const auth = useAdminAuth()
  const base = `${config.public.supabaseUrl}/functions/v1`

  async function callPublic(action, payload = {}) {
    return call(`${base}/riichi-open-public`, action, payload, false)
  }

  async function callAdmin(action, payload = {}) {
    return call(`${base}/riichi-open-admin`, action, payload, true)
  }

  async function call(url, action, payload, privateRequest) {
    const headers = { apikey: config.public.supabaseKey, 'Content-Type': 'application/json' }
    if (privateRequest) {
      if (!auth.session.value?.access_token) throw new Error('Please sign in again.')
      headers.Authorization = `Bearer ${auth.session.value.access_token}`
    } else headers.Authorization = `Bearer ${config.public.supabaseKey}`

    const response = privateRequest
      ? await auth.authenticatedFetch(url, { method: 'POST', headers, body: JSON.stringify({ action, ...payload }) })
      : await fetch(url, { method: 'POST', headers, body: JSON.stringify({ action, ...payload }) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || 'The request could not be completed.')
    return body
  }

  return { callPublic, callAdmin }
}
