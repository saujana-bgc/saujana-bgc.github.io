const ONE_HOUR = 60 * 60 * 1000
const CACHE_KEY = 'saujana-visitor-stats'
const SKIP_KEY = 'saujana_skip_visitor_stats'

const data = ref(null)
let loadPromise = null

function getOrCreateVisitorId() {
    let id = localStorage.getItem('saujana_visitor_id')
    if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem('saujana_visitor_id', id)
    }
    return id
}

function todayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function readCache() {
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        if (!cached || Date.now() - cached.savedAt > ONE_HOUR) return null
        return cached.stats
    } catch {
        return null
    }
}

function writeCache(stats) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), stats }))
    } catch {}
}

function shouldSkipVisitorStats() {
    if (!import.meta.client) return true

    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true

    const params = new URLSearchParams(window.location.search)
    if (params.get('skipStats') === '1') {
        try {
            localStorage.setItem(SKIP_KEY, '1')
        } catch {}
        return true
    }

    try {
        return localStorage.getItem(SKIP_KEY) === '1'
    } catch {
        return false
    }
}

async function loadVisitorStats() {
    if (!import.meta.client) return
    if (shouldSkipVisitorStats()) return

    const cached = readCache()
    if (cached) {
        data.value = cached
        return
    }

    const supabase = useSupabase()
    const visitorId = getOrCreateVisitorId()
    const now = new Date()
    const today = todayKey(now)
    const lastVisit = localStorage.getItem('saujana_last_visit')
    const visitorName = localStorage.getItem('saujana_name')?.trim() || null

    if (lastVisit !== today) {
        const { error } = await supabase.from('visitors').insert({
            visitor_id: visitorId,
            visited_at: now.toISOString(),
            name: visitorName,
        })
        if (!error) localStorage.setItem('saujana_last_visit', today)
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [{ count: daily }, { data: total }] = await Promise.all([
        supabase.from('visitors').select('*', { count: 'exact', head: true }).gte('visited_at', todayStart.toISOString()),
        supabase.rpc('get_total_unique_visitors'),
    ])

    data.value = {
        daily: daily ?? 0,
        total: total ?? 0,
    }
    writeCache(data.value)
}

export function useVisitorStats() {
    if (!loadPromise) loadPromise = loadVisitorStats()
    return { data }
}
