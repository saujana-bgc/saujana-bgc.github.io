<template>
  <div class="site-shell">
    <a class="skip-link" href="#page-content">Skip to content</a>
    <div v-if="versionUpdateAvailable" class="version-update" role="status">
      <span>A site update is ready.</span>
      <UButton type="button" size="sm" @click="refreshToLatest">Refresh</UButton>
    </div>
    <nav v-if="!isAdminRoute" class="site-nav" aria-label="Primary navigation">
      <div class="mobile-nav-bar">
        <NuxtLink to="/" class="mobile-brand" no-prefetch @click="closeMenu">
          <img class="mobile-brand-logo brand-mark" src="/images/saujana-brand.webp" alt="" width="114" height="114" />
          <span class="brand-wordmark">Saujana<span class="brand-caption">Board Game Community</span></span>
        </NuxtLink>
        <USlideover v-model:open="menuOpen" title="Explore Saujana" description="Find gatherings, games, and community resources." side="right" :ui="{ content: 'bg-[var(--bg-silk)]', body: 'p-5' }">
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

    <WhatsAppButton v-if="!isAdminRoute && !isRiichiCalculatorRoute" :in-content="isBrowseRoute" />

    <footer v-if="!isAdminRoute" ref="footerRef" class="site-meta" aria-label="Site information">
      <p class="footer-signature">Come Away with Saujana</p>
      <nav class="footer-pillars" aria-label="Community pillars">
        <NuxtLink v-for="pillar in communityPillars" :key="pillar.id" :to="pillar.links[0].to" no-prefetch>
          {{ pillar.id === 'riichi' ? 'Riichi League' : pillar.label }}
        </NuxtLink>
      </nav>
      <span class="footer-copyright">&copy; {{ year }} Saujana Board Game Community</span>
      <ClientOnly v-if="showVisitorCounter">
        <LazyVisitorCounter />
      </ClientOnly>
      <div v-if="lastUpdated" class="last-updated">Site updated {{ lastUpdated }}</div>
    </footer>
  </div>
</template>

<script setup>
import { communityPillars } from '~/utils/communityPillars'

const route = useRoute()
const navigation = computed(() => [
  { label: 'Home', to: '/', prefetch: false },
  { label: 'Gatherings', to: '/gatherings', prefetch: false },
  ...communityPillars.map(({ label, links }) => {
    if (links.length === 1) return { label, to: links[0].to, prefetch: false }
    return {
      label,
      type: 'trigger',
      active: links.some(link => link.to === route.path.replace(/\/+$/, '')),
      children: links.map(link => ({ ...link, prefetch: false })),
    }
  }),
  { label: 'Birthday Club', to: '/birthday-club', prefetch: false },
])
const mobileNavigation = computed(() => navigation.value.map(item => ({
  ...item,
  onSelect: item.to ? closeMenu : undefined,
  children: item.children?.map(child => ({ ...child, onSelect: closeMenu })),
})))
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
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const isRiichiCalculatorRoute = computed(() => route.path.replace(/\/+$/, '') === '/riichi-calculator')
const isBrowseRoute = computed(() => ['/collection', '/playlog'].includes(route.path.replace(/\/+$/, '')))
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
  width: min(1160px, calc(100% - 40px));
  margin: 24px auto 0;
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

.footer-pillars {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  column-gap: 20px;
  margin-bottom: 8px;
  font-size: .85rem;
}

.footer-pillars a {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: var(--matcha-leaf);
}

.footer-copyright {
  color: var(--muted);
  font-size: 0.72rem;
  letter-spacing: 0.09em;
}

.last-updated {
  margin-top: 3px;
  color: var(--muted);
  font-size: 0.68rem;
  letter-spacing: 0.02em;
}

</style>
