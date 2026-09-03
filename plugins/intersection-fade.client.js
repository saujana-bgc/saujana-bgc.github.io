import { nextTick } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view')
                io.unobserve(entry.target)
            }
        })
    }, { threshold: 0.05 })

    let rafId = 0
    const pendingRoots = new Set()

    const observeRoot = (root = document) => {
        if (!root) return
        pendingRoots.add(root)
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
            pendingRoots.forEach(target => {
                if (target.classList?.contains('fade-up') && !target.classList.contains('in-view')) {
                    io.observe(target)
                }
                target.querySelectorAll?.('.fade-up:not(.in-view)').forEach(el => io.observe(el))
            })
            pendingRoots.clear()
        })
    }

    nuxtApp.vueApp.mixin({
        mounted() {
            observeRoot(this.$el)
        },
        updated() {
            observeRoot(this.$el)
        },
    })

    nuxtApp.hook('app:mounted', () => {
        nextTick(() => observeRoot(document))
    })

    nuxtApp.hook('page:finish', () => nextTick(() => observeRoot(document)))
})
