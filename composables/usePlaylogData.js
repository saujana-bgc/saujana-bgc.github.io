const TTL = 24 * 60 * 60 * 1000
const CACHE_KEY = 'saujana-playlog-cache-v3'
const loadPromises = new WeakMap()

// Rows are replaced as a snapshot, never edited in place by consumers.
function readCache() {
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        if (!cached || Date.now() - cached.savedAt > TTL) return null
        return cached.rows
    } catch {
        return null
    }
}

function writeCache(rows) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), rows }))
    } catch {}
}

async function loadPlaylog({ data, isPending, isError }, forceRefresh = false) {
    const cached = forceRefresh ? null : readCache()
    if (cached) {
        data.value = cached
        isError.value = false
        isPending.value = false
        return
    }

    try {
        const supabase = useSupabase()
        const pageSize = 500
        const rows = []
        let offset = 0
        while (true) {
            const { data: page, error, count } = await supabase
                .from('playlog')
                .select('game, date, players', { count: 'exact' })
                .order('date', { ascending: false })
                .order('id')
                .range(offset, offset + pageSize - 1)

            if (error) throw error
            const batch = page ?? []
            rows.push(...batch)
            offset += batch.length
            if (!batch.length || (count !== null && count !== undefined && offset >= count) || batch.length < pageSize) break
        }
        data.value = rows
        writeCache(data.value)
        isError.value = false
    } catch {
        isError.value = true
        return
    } finally {
        isPending.value = false
    }
}

export function usePlaylogData() {
    const nuxtApp = useNuxtApp()
    const data = useState('saujana-playlog-data', () => [])
    const isPending = useState('saujana-playlog-pending', () => true)
    const isError = useState('saujana-playlog-error', () => false)
    const state = { data, isPending, isError }

    function startLoad(forceRefresh = false) {
        const existing = loadPromises.get(nuxtApp)
        if (existing && !forceRefresh) return existing
        const promise = loadPlaylog(state, forceRefresh)
        loadPromises.set(nuxtApp, promise)
        return promise
    }

    // Keep the initial HTML and hydration state identical. Live history is
    // shared between client pages and starts loading only after mounting.
    onMounted(() => {
        startLoad()
    })

    function retry() {
        if (isPending.value) return loadPromises.get(nuxtApp) ?? startLoad(true)
        isPending.value = true
        isError.value = false
        return startLoad(true)
    }

    return { data, isPending, isError, retry }
}
