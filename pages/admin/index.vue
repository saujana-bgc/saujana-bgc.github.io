<template>
  <section>
    <p class="eyebrow">Organiser workspace</p>
    <h1>Master admin</h1>
    <p class="admin-lede">Choose a page to manage the community calendar or Riichi Open I.</p>
    <div v-for="group in groups" :key="group.name" class="admin-section">
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
import { adminNavigation } from '~/utils/adminNavigation.js'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Master admin | Saujana BGC', meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }] })
const groups = computed(() => ['Community', 'Riichi Open'].map(name => ({ name, items: adminNavigation.filter(item => item.group === name) })))
</script>

<style scoped>
.admin-lede{color:var(--muted);max-width:620px;line-height:1.65}.admin-group-title{font:1.6rem var(--font-display);color:var(--matcha-leaf);margin:0 0 -8px}
</style>
