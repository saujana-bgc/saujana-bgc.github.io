<template>
  <div class="site-shell">
    <a class="skip-link" href="#page-content">Skip to content</a>
    <div v-if="versionUpdateAvailable" class="version-update" role="status">
      <span>A site update is ready.</span>
      <button type="button" @click="refreshToLatest">Refresh</button>
    </div>
    <nav v-if="!isAdminRoute" class="site-nav" aria-label="Primary navigation">
      <div class="mobile-nav-bar">
        <NuxtLink to="/" class="mobile-brand" aria-label="Saujana Board Game Community home" no-prefetch @click="closeMenu">
          <img class="mobile-brand-logo" src="/images/saujana-brand.webp" alt="" width="114" height="114" />
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
        <div class="riichi-nav-group" :class="{ expanded: riichiMenuOpen }" @click.stop>
          <button
            ref="riichiMenuTrigger"
            type="button"
            class="nav-item riichi-nav-trigger"
            :class="{ 'router-link-exact-active': route.path.startsWith('/riichi-') }"
            aria-controls="riichi-nav-links"
            :aria-expanded="riichiMenuOpen"
            @click="riichiMenuOpen = !riichiMenuOpen"
          >
            Riichi Mahjong <span class="riichi-nav-chevron" aria-hidden="true">⌄</span>
          </button>
          <div v-show="riichiMenuOpen" id="riichi-nav-links" class="riichi-submenu">
            <NuxtLink to="/riichi-calculator" no-prefetch @click="closeMenu">Scoring Calculator</NuxtLink>
            <NuxtLink to="/riichi-league" no-prefetch @click="closeMenu">League &amp; Standings</NuxtLink>
            <NuxtLink to="/riichi-open" no-prefetch @click="closeMenu">Riichi Open</NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <div id="page-content" class="page-content" tabindex="-1">
      <slot />
    </div>

    <WhatsAppButton v-if="!isAdminRoute && !isRiichiCalculatorRoute" />

    <footer v-if="!isAdminRoute" ref="footerRef" class="site-meta" aria-label="Site information">
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
  { name: 'Play History', url: '/playlog' },
  { name: 'Only Blood in the Clocktower', url: '/only-blood-in-the-clocktower' },
  { name: 'Collection', url: '/collection' }
]

const { lastUpdated, versionUpdateAvailable, refreshToLatest } = useVersion()
const route = useRoute()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const isRiichiCalculatorRoute = computed(() => route.path.replace(/\/+$/, '') === '/riichi-calculator')
const year = computed(() => new Date().getFullYear())
const footerRef = ref(null)
const showVisitorCounter = ref(false)
const menuOpen = ref(false)
const riichiMenuOpen = ref(false)
const riichiMenuTrigger = ref(null)

function closeMenu() {
  menuOpen.value = false
  riichiMenuOpen.value = false
}

function handleMenuKeydown(event) {
  if (event.key === 'Escape' && riichiMenuOpen.value) {
    riichiMenuOpen.value = false
    riichiMenuTrigger.value?.focus()
    return
  }
  if (!menuOpen.value) return
  if (event.key === 'Escape') {
    closeMenu()
    document.querySelector('.menu-toggle')?.focus()
    return
  }
  if (event.key !== 'Tab') return
  const links = [...document.querySelectorAll('#primary-nav-links a, #primary-nav-links button:not(.menu-toggle)')]
  const toggle = document.querySelector('.menu-toggle')
  const focusable = [toggle, ...links].filter(element => element?.getClientRects().length)
  const first = focusable[0], last = focusable.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}

function closeRiichiMenuOnOutsideClick(event) {
  if (!event.target.closest('.riichi-nav-group')) riichiMenuOpen.value = false
}

watch(() => route.fullPath, closeMenu)

onMounted(() => {
  window.addEventListener('keydown', handleMenuKeydown)
  document.addEventListener('click', closeRiichiMenuOnOutsideClick)
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

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleMenuKeydown)
  document.removeEventListener('click', closeRiichiMenuOnOutsideClick)
})
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
