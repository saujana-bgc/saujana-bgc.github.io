<template>
  <div class="site-shell">
    <a class="skip-link" href="#page-content">Skip to content</a>
    <nav class="site-nav" aria-label="Primary navigation">
      <div class="mobile-nav-bar">
        <NuxtLink to="/" class="mobile-brand" no-prefetch @click="closeMenu">
          <img class="mobile-brand-logo" src="/favicon.ico" alt="" width="34" height="34" />
          <span class="brand-wordmark">Saujana<span class="brand-caption">Board Game Community</span></span>
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

    <div id="page-content" class="page-content" tabindex="-1">
      <slot />
    </div>

    <WhatsAppButton />

    <footer ref="footerRef" class="site-meta" aria-label="Site information">
      <p class="footer-signature">Good games. Good company. See you soon.</p>
      <span class="footer-copyright">&copy; {{ year }} SAUJANA BOARD GAME COMMUNITY</span>
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
  { name: 'Birthday Club', url: '/birthday-club' },
  { name: 'Play history', url: '/playlog' },
  { name: 'Riichi League', url: '/riichi-league' },
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
.site-meta {
  width: min(1120px, 92%);
  margin: 40px auto 0;
  padding: 22px 0 28px;
  border-top: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
}

.footer-signature {
  margin: 0 0 12px;
  color: var(--matcha-leaf);
  font-family: var(--font-display);
  font-size: 1.15rem;
}

.footer-copyright {
  color: var(--muted);
  font-size: 0.62rem;
  letter-spacing: 0.13em;
}

.last-updated {
  margin-top: 3px;
  color: var(--clay-text);
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.68;
}
</style>
