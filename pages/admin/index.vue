<template>
  <section>
    <p class="eyebrow">Organiser workspace</p>
    <h1>Master Admin</h1>
    <p class="admin-lede">Choose a page to manage the community calendar, Clocktower recaps, or Riichi Open I.</p>
    <div v-for="group in groups" :key="group.name" class="admin-section" :class="{ 'riichi-links': group.name === 'Riichi Open' }">
      <h2 class="admin-group-title">{{ group.name }}</h2>
      <div class="admin-grid">
        <NuxtLink v-for="item in group.items" :key="item.id" class="admin-card admin-link-card" :to="item.to">
          <h2>{{ item.title }}</h2><p>{{ item.description }}</p><span>Open page →</span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import { adminDashboardLinks } from '~/utils/adminNavigation.js'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Master Admin | Saujana BGC', meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }] })
const groups = computed(() => ['Community', 'Riichi Open'].map(name => ({ name, items: adminDashboardLinks.filter(item => item.group === name) })))
</script>

<style scoped>
.admin-lede{color:var(--muted);max-width:620px;line-height:1.65}.admin-group-title{font:1.6rem var(--font-display);color:var(--matcha-leaf);margin:0 0 -8px}
.admin-section.riichi-links .admin-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); }
.admin-link-card { min-height: 150px; }
.admin-link-card h2 { overflow-wrap: anywhere; }
</style>
