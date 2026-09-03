const TTL = 24 * 60 * 60 * 1000
const CACHE_KEY = 'saujana-playlog-cache-v2'

const data = ref([])
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
    if (!import.meta.client) {
        isPending.value = false
        return
    }

    const cached = readCache()
    if (cached) {
        data.value = cached
        isPending.value = false
        return
    }

    try {
        const supabase = useSupabase()
        const { data: rows, error } = await supabase
            .from('playlog')
            .select('game, date, players')
            .order('date', { ascending: false })

        if (error) throw error
        data.value = rows ?? []
        writeCache(data.value)
        isError.value = false
    } catch {
        isError.value = true
    } finally {
        isPending.value = false
    }
}

export function usePlaylogData() {
    if (!loadPromise) loadPromise = loadPlaylog()
    return { data, isPending, isError }
}
