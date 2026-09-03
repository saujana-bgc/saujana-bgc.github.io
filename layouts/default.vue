<template>
  <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
    <nav aria-label="Primary navigation">
      <div class="mobile-nav-bar">
        <NuxtLink to="/" class="mobile-brand" no-prefetch @click="closeMenu">
          <img class="mobile-brand-logo" src="/favicon.ico" alt="" width="34" height="34" />
          <span>Saujana BGC</span>
        </NuxtLink>
        <button
          type="button"
          class="menu-toggle"
          :class="{ open: menuOpen }"
          aria-controls="primary-nav-links"
          :aria-expanded="menuOpen"
          :aria-label="menuOpen ? 'Close navigation menu' : 'Open navigation menu'"
          @click="menuOpen = !menuOpen"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div v-if="menuOpen" class="mobile-nav-backdrop" aria-hidden="true" @click="closeMenu"></div>

      <div id="primary-nav-links" class="nav-links" :class="{ open: menuOpen }">
        <NuxtLink v-for="link in navigation" :key="link.name" :to="link.url" class="nav-item" no-prefetch @click="closeMenu">
          {{ link.name }}
        </NuxtLink>
      </div>
    </nav>

    <slot />

    <WhatsAppButton />

    <footer ref="footerRef">
      <span>&copy; {{ year }} SAUJANA BOARD GAME COMMUNITY</span>
      <ClientOnly v-if="showVisitorCounter">
        <LazyVisitorCounter />
      </ClientOnly>
      <div v-if="lastUpdated" class="last-updated">Site updated {{ lastUpdated }}</div>
    </footer>
  </div>
</template>

<script setup>
const navigation = [
  { name: 'Home', url: '/' },
  { name: 'Gatherings', url: '/gatherings' },
  { name: 'Playlog', url: '/playlog' },
  { name: 'Riichi League', url: '/riichi-league' },
  { name: 'Riichi Calculator', url: '/riichi-calculator' },
  { name: 'Collection', url: '/collection' }
]

const { lastUpdated } = useVersion()
const route = useRoute()

const year = computed(() => new Date().getFullYear())
const footerRef = ref(null)
const showVisitorCounter = ref(false)
const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}

function handleMenuKeydown(event) {
  if (event.key === 'Escape') closeMenu()
}

watch(() => route.fullPath, closeMenu)

onMounted(() => {
  window.addEventListener('keydown', handleMenuKeydown)
  if (!footerRef.value || showVisitorCounter.value) return
  if (!('IntersectionObserver' in window)) {
    showVisitorCounter.value = true
    return
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some(entry => entry.isIntersecting)) return
    showVisitorCounter.value = true
    observer.disconnect()
  }, { rootMargin: '300px 0px' })

  observer.observe(footerRef.value)
})

onBeforeUnmount(() => window.removeEventListener('keydown', handleMenuKeydown))
</script>

<style scoped>
.visitor-counter {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 10px;
}

.visitor-num {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--matcha-leaf);
}

.visitor-label {
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    opacity: 0.65;
}

.visitor-divider {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(107, 122, 104, 0.2);
    margin: 0 3px;
}

.last-updated {
    color: var(--clay-text);
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    opacity: 0.68;
    margin-top: 8px;
}
</style>
