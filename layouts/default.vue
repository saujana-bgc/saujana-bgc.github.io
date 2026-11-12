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
            <nav id="primary-nav-links" class="mobile-navigation" aria-label="Explore Saujana" @click.capture="closeMenuOnNavigationLink">
              <template v-for="item in navigation" :key="item.id">
                <section v-if="item.children" class="mobile-navigation-group" :aria-labelledby="`mobile-navigation-heading-${item.id}`">
                  <h2 :id="`mobile-navigation-heading-${item.id}`">{{ item.label }}</h2>
                  <NuxtLink v-for="child in item.children" :key="child.to" class="mobile-navigation-child" :class="{ 'is-current': isCurrentDestination(child.to) }" :to="child.to" :aria-current="isCurrentDestination(child.to) ? 'page' : undefined" no-prefetch>{{ child.label }}</NuxtLink>
                </section>
                <NuxtLink v-else class="mobile-navigation-link" :class="{ 'is-current': isCurrentDestination(item.to) }" :to="item.to" :aria-current="isCurrentDestination(item.to) ? 'page' : undefined" no-prefetch>{{ item.label }}</NuxtLink>
              </template>
            </nav>
          </template>
        </USlideover>
      </div>
      <UNavigationMenu as="div" class="desktop-navigation" :items="navigation" orientation="horizontal" :ui="desktopNavigationUi" />
    </nav>

    <div id="page-content" class="page-content" tabindex="-1">
      <slot />
    </div>

    <footer v-if="!isAdminRoute" ref="footerRef" class="site-meta" aria-label="Site information">
      <p class="footer-signature">Come Away with Saujana</p>
      <nav class="footer-pillars" aria-label="Explore Saujana">
        <NuxtLink to="/gatherings" no-prefetch>Gatherings</NuxtLink>
        <NuxtLink to="/collection" no-prefetch>Collection</NuxtLink>
        <NuxtLink to="/riichi-league" no-prefetch>Riichi League</NuxtLink>
        <NuxtLink to="/only-blood-in-the-clocktower" no-prefetch>Clocktower</NuxtLink>
        <a href="https://wa.me/saujanabgc" target="_blank" rel="noopener noreferrer">Say hello on WhatsApp <span aria-hidden="true">↗</span></a>
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
const route = useRoute()
const navigation = computed(() => [
  { id: 'gatherings', label: 'Gatherings', to: '/gatherings', prefetch: false },
  {
    id: 'board-games',
    label: 'Board Games',
    type: 'trigger',
    active: ['/collection', '/playlog'].includes(route.path.replace(/\/+$/, '')),
    children: [
      { label: 'Collection', to: '/collection', prefetch: false },
      { label: 'Play History', to: '/playlog', prefetch: false },
    ],
  },
  {
    id: 'riichi',
    label: 'Riichi Mahjong',
    type: 'trigger',
    active: ['/riichi-league', '/riichi-calculator', '/riichi-open'].includes(route.path.replace(/\/+$/, '')),
    children: [
      { label: 'Riichi League', to: '/riichi-league', prefetch: false },
      { label: 'Riichi Calculator', to: '/riichi-calculator', prefetch: false },
      { label: 'Riichi Open I', to: '/riichi-open', prefetch: false },
    ],
  },
  { id: 'clocktower', label: 'Clocktower', to: '/only-blood-in-the-clocktower', prefetch: false },
  { id: 'birthday-club', label: 'Birthday Club', to: '/birthday-club', prefetch: false },
])
const desktopNavigationUi = {
  root: 'ml-auto',
  list: 'm-0 list-none items-center gap-1 p-0',
  link: 'no-underline rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--matcha-leaf)] data-[active]:text-[var(--matcha-leaf)]',
  childList: 'm-0 min-w-56 list-none rounded-xl border border-[var(--line)] bg-[var(--bg-silk)] p-2 shadow-lg',
  childLink: 'no-underline min-h-11 rounded-lg px-3 py-2 text-sm text-[var(--clay-text)] hover:bg-[var(--surface-soft)] hover:text-[var(--matcha-leaf)]',
}

const { lastUpdated, versionUpdateAvailable, refreshToLatest } = useVersion()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const year = computed(() => new Date().getFullYear())
const footerRef = ref(null)
const showVisitorCounter = ref(false)
const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}

function isCurrentDestination(destination) {
  return route.path.replace(/\/+$/, '') === destination
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

.mobile-navigation { display: grid; gap: 8px; }
.mobile-navigation-link,
.mobile-navigation-child { display: flex; min-height: 44px; align-items: center; border-radius: var(--radius-control); color: var(--clay-text); text-decoration: none; }
.mobile-navigation-link { padding: 0 12px; font-size: 1rem; font-weight: 600; }
.mobile-navigation-child { padding: 0 12px; color: var(--muted); font-size: .92rem; }
.mobile-navigation-link:hover,
.mobile-navigation-child:hover { background: var(--surface-soft); color: var(--matcha-leaf); }
.mobile-navigation-link.is-current,
.mobile-navigation-child.is-current { background: var(--surface-soft); color: var(--matcha-leaf); font-weight: 700; }
.mobile-navigation-group { padding: 8px 0; border-top: 1px solid var(--line); }
.mobile-navigation-group h2 { margin: 0; padding: 4px 12px; color: var(--matcha-leaf); font-size: .76rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.mobile-navigation :focus-visible { outline: 3px solid var(--matcha-leaf); outline-offset: 2px; }

</style>
