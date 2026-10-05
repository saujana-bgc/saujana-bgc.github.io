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

  </div>
</template>

<script setup>
const navigation = [
  { name: 'Home', url: '/' },
  { name: 'Gatherings', url: '/gatherings' },
  { name: 'Birthday Club', url: '/birthday-club' },
  { name: 'Playlog', url: '/playlog' },
  { name: 'Riichi League', url: '/riichi-league' },
  { name: 'Collection', url: '/collection' }
]

const route = useRoute()

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
})

onBeforeUnmount(() => window.removeEventListener('keydown', handleMenuKeydown))
</script>

<style scoped>
</style>
