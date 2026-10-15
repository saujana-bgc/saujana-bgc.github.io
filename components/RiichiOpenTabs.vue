<template>
  <nav class="riichi-tabs" aria-label="Riichi Open pages">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      :aria-current="isCurrent(tab.to) ? 'page' : undefined"
      :class="{ active: isCurrent(tab.to) }"
    >
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>

<script setup>
const route = useRoute()
const tabs = [
  { label: 'Registration', to: '/riichi-open' },
  { label: 'Standings', to: '/riichi-open/standings' },
]

function isCurrent(path) {
  return route.path.replace(/\/+$/, '') === path
}
</script>

<style scoped>
.riichi-tabs {
  display: flex;
  gap: 8px;
  width: 100%;
  margin: 20px auto 0;
  border-bottom: 1px solid var(--line);
}

.riichi-tabs a {
  position: relative;
  padding: 12px 16px;
  color: var(--muted);
  font-size: .88rem;
  font-weight: 600;
  text-decoration: none;
  transition: color .18s ease;
}

.riichi-tabs a::after {
  position: absolute;
  right: 14px;
  bottom: -1px;
  left: 14px;
  height: 2px;
  background: var(--gold-leaf);
  content: '';
  transform: scaleX(0);
  transition: transform .18s ease;
}

.riichi-tabs a:hover,
.riichi-tabs a.active {
  color: var(--matcha-leaf);
}

.riichi-tabs a.active::after {
  transform: scaleX(1);
}

.riichi-tabs a:focus-visible {
  outline: 2px solid var(--gold-leaf);
  outline-offset: -3px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .riichi-tabs a,
  .riichi-tabs a::after {
    transition: none;
  }
}
</style>
