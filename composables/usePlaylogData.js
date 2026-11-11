const TTL = 24 * 60 * 60 * 1000
const CACHE_KEY = 'saujana-playlog-cache-v3'

// Rows are replaced as a snapshot, never edited in place by consumers.
const data = shallowRef([])
const isPending = ref(true)
const isError = ref(false)
let loadPromise = null

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

async function loadPlaylog() {
    const cached = readCache()
    if (cached) {
        data.value = cached
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
        loadPromise = null
    } finally {
        isPending.value = false
    }
}

export function usePlaylogData() {
    // Keep the initial HTML and hydration state identical. Live history is
    // shared between client pages and starts loading only after mounting.
    onMounted(() => {
        if (!loadPromise) loadPromise = loadPlaylog()
    })
    return { data, isPending, isError }
}
