const lastUpdated = ref('')
const lastChecked = ref(0)
const versionUpdateAvailable = ref(false)
const THROTTLE_MS = 5 * 60 * 1000
let listenerAttached = false
let pendingVersion = ''

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
            pendingVersion = String(v)
            versionUpdateAvailable.value = true
            if (!hasUnsubmittedFormEdits()) refreshToLatest()
        } else {
            localStorage.setItem('saujana_version', String(v))
        }
    } catch {}
}

function hasUnsubmittedFormEdits() {
    return [...document.querySelectorAll('input, textarea, select, [contenteditable="true"]')].some((field) => {
        if (field.isContentEditable) return true
        if (field.type === 'file') return Boolean(field.files?.length)
        if (field.disabled || field.type === 'submit' || field.type === 'button' || field.type === 'reset') return false
        if (field.type === 'checkbox' || field.type === 'radio') return field.checked !== field.defaultChecked
        if (field.tagName === 'SELECT') return [...field.options].some(option => option.selected !== option.defaultSelected)
        return field.value !== field.defaultValue
    })
}

function refreshToLatest() {
    if (pendingVersion) localStorage.setItem('saujana_version', pendingVersion)
    window.location.reload()
}

export function useVersion() {
    if (!listenerAttached && typeof document !== 'undefined') {
        listenerAttached = true
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') fetchVersion()
        })
    }
    return { lastUpdated, fetchVersion, versionUpdateAvailable, refreshToLatest }
}
