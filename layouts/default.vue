<template>
  <div class="site-shell">
    <a class="skip-link" href="#page-content">Skip to content</a>
    <div v-if="versionUpdateAvailable" class="version-update" role="status">
      <span>A site update is ready.</span>
      <UButton type="button" size="sm" @click="refreshToLatest">Refresh</UButton>
    </div>
    <nav v-if="!isAdminRoute" class="site-nav" aria-label="Primary navigation">
      <div class="mobile-nav-bar">
        <NuxtLink to="/" class="mobile-brand" aria-label="Saujana Board Game Community home" no-prefetch @click="closeMenu">
          <img class="mobile-brand-logo" src="/images/saujana-brand.webp" alt="" width="114" height="114" />
          <span class="brand-wordmark">Saujana<span class="brand-caption">Board Game Community</span></span>
        </NuxtLink>
        <USlideover v-model:open="menuOpen" title="Explore Saujana" description="Browse the Saujana Board Game Community website." side="right" :ui="{ content: 'bg-[var(--bg-silk)]', body: 'p-5' }">
          <template #default="{ open }">
            <UButton variant="outline" color="neutral" type="button" class="menu-toggle" :class="{ open }" aria-controls="primary-nav-links" :aria-expanded="open" :aria-label="open ? 'Close navigation menu' : 'Open navigation menu'">
              <span></span><span></span><span></span>
            </UButton>
          </template>
          <template #body>
            <UNavigationMenu id="primary-nav-links" class="mobile-navigation" :items="mobileNavigation" orientation="vertical" :ui="mobileNavigationUi" @click.capture="closeMenuOnNavigationLink" />
          </template>
        </USlideover>
      </div>
      <UNavigationMenu class="desktop-navigation" :items="navigation" orientation="horizontal" :ui="desktopNavigationUi" />
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
const riichiChildren = [
  { label: 'Scoring Calculator', to: '/riichi-calculator', prefetch: false },
  { label: 'League & Standings', to: '/riichi-league', prefetch: false },
  { label: 'Riichi Open', to: '/riichi-open', prefetch: false },
]
const navigation = [
  { label: 'Home', to: '/', prefetch: false },
  { label: 'Gatherings', to: '/gatherings', prefetch: false },
  { label: 'Birthday Club', to: '/birthday-club', prefetch: false },
  { label: 'Play History', to: '/playlog', prefetch: false },
  { label: 'Only Blood in the Clocktower', to: '/only-blood-in-the-clocktower', prefetch: false },
  { label: 'Collection', to: '/collection', prefetch: false },
  {
    label: 'Riichi Mahjong',
    type: 'trigger',
    children: riichiChildren,
  },
]
const mobileNavigation = navigation
  .map(item => ({
    ...item,
    onSelect: closeMenu,
    children: item.label === 'Riichi Mahjong'
      ? riichiChildren.map(child => ({ ...child, onSelect: closeMenu }))
      : item.children?.map(child => ({ ...child, onSelect: closeMenu })),
  }))
const desktopNavigationUi = {
  root: 'ml-auto',
  list: 'm-0 list-none items-center gap-1 p-0',
  link: 'no-underline rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--matcha-leaf)] data-[active]:text-[var(--matcha-leaf)]',
  childList: 'm-0 min-w-56 list-none rounded-xl border border-[var(--line)] bg-[var(--bg-silk)] p-2 shadow-lg',
  childLink: 'no-underline min-h-11 rounded-lg px-3 py-2 text-sm text-[var(--clay-text)] hover:bg-[var(--surface-soft)] hover:text-[var(--matcha-leaf)]',
}
const mobileNavigationUi = {
  root: 'w-full flex-col',
  list: 'm-0 w-full list-none flex-col gap-1 p-0',
  item: 'w-full',
  link: 'no-underline min-h-12 rounded-lg px-3 py-3 text-base text-[var(--clay-text)] hover:bg-[var(--surface-soft)] data-[active]:text-[var(--matcha-leaf)]',
  childList: 'm-0 ml-3 list-none border-l border-[var(--line)] p-0 pl-3',
  childLink: 'no-underline min-h-11 rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--matcha-leaf)]',
}

const { lastUpdated, versionUpdateAvailable, refreshToLatest } = useVersion()
const route = useRoute()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const isRiichiCalculatorRoute = computed(() => route.path.replace(/\/+$/, '') === '/riichi-calculator')
const year = computed(() => new Date().getFullYear())
const footerRef = ref(null)
const showVisitorCounter = ref(false)
const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}

function closeMenuOnNavigationLink(event) {
  if (event.target instanceof Element && event.target.closest('a')) closeMenu()
}

watch(() => route.fullPath, closeMenu)

onMounted(() => {
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
