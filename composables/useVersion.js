const lastUpdated = ref('')
const lastChecked = ref(0)
const THROTTLE_MS = 5 * 60 * 1000
let listenerAttached = false

async function fetchVersion() {
    const now = Date.now()
    if (lastChecked.value > 0 && now - lastChecked.value < THROTTLE_MS) return
    lastChecked.value = now

    try {
        const res = await fetch(`/version.json?t=${now}`)
        const { v } = await res.json()

        if (v && v !== 'dev') {
            const d = new Date(Number(v))
            const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
            lastUpdated.value = `${date}, ${time}`
        }

        const stored = localStorage.getItem('saujana_version')
        if (stored && stored !== String(v)) {
            localStorage.setItem('saujana_version', String(v))
            window.location.reload()
        } else {
            localStorage.setItem('saujana_version', String(v))
        }
    } catch {}
}

export function useVersion() {
    if (!listenerAttached && typeof document !== 'undefined') {
        listenerAttached = true
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') fetchVersion()
        })
    }
    return { lastUpdated, fetchVersion }
}
