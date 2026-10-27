export default defineNuxtPlugin((nuxtApp) => {
    let intersectionObserver = null
    let mutationObserver = null
    let rafId = 0
    const observed = new Set()
    const pendingRoots = new Set()

    function observeRoot(root) {
        if (!root.isConnected) return
        const elements = [...root.querySelectorAll('.fade-up:not(.in-view)')]
        if (root.matches?.('.fade-up:not(.in-view)')) elements.unshift(root)
        for (const element of elements) {
            if (!intersectionObserver) {
                element.classList.add('in-view')
            } else if (!observed.has(element)) {
                observed.add(element)
                intersectionObserver.observe(element)
            }
        }
    }

    function queueRoot(root) {
        if (root.nodeType !== 1) return
        pendingRoots.add(root)
        if (rafId) return
        rafId = requestAnimationFrame(() => {
            rafId = 0
            // A parent insertion may include children queued in the same batch.
            for (const root of pendingRoots) {
                let parent = root.parentElement
                while (parent && !pendingRoots.has(parent)) parent = parent.parentElement
                if (!parent) observeRoot(root)
            }
            pendingRoots.clear()
        })
    }

    nuxtApp.hook('app:mounted', () => {
        if ('IntersectionObserver' in window) {
            intersectionObserver = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue
                    entry.target.classList.add('in-view')
                    intersectionObserver.unobserve(entry.target)
                    observed.delete(entry.target)
                }
            }, { threshold: 0.05 })
        }

        observeRoot(document.body)
        // Only inspect inserted DOM. Vue updates such as typing or scrolling
        // no longer scan every ancestor component's entire subtree.
        mutationObserver = new MutationObserver((records) => {
            for (const record of records) {
                for (const node of record.addedNodes) queueRoot(node)
            }
            for (const element of observed) {
                if (element.isConnected) continue
                intersectionObserver.unobserve(element)
                observed.delete(element)
            }
        })
        mutationObserver.observe(document.body, { childList: true, subtree: true })
    })

    nuxtApp.vueApp.onUnmount(() => {
        if (rafId) cancelAnimationFrame(rafId)
        mutationObserver?.disconnect()
        intersectionObserver?.disconnect()
        pendingRoots.clear()
        observed.clear()
    })
})
