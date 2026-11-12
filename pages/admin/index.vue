<template>
  <section aria-labelledby="admin-dashboard-title">
    <header>
      <p class="eyebrow">Organiser workspace</p>
      <h1 id="admin-dashboard-title">Master Admin</h1>
      <p class="dashboard-lede">Manage birthdays, Clocktower recaps and the Riichi Open I tournament.</p>
    </header>

    <section
      v-for="group in adminDashboardGroups"
      :key="group.id"
      class="admin-section"
      :aria-labelledby="`dashboard-${group.id}`"
    >
      <header class="dashboard-section-heading">
        <h2 :id="`dashboard-${group.id}`">{{ group.title }}</h2>
        <UButton v-if="group.overview" :to="group.overview.to" color="neutral" variant="outline" class="dashboard-overview">
          {{ group.overview.label }} <span aria-hidden="true">→</span>
        </UButton>
      </header>

      <ul class="dashboard-grid" :class="{ 'dashboard-grid-wide': !group.overview }">
        <li v-for="item in group.links" :key="item.to">
          <NuxtLink class="admin-card dashboard-link" :to="item.to">
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div>
            <span class="dashboard-arrow" aria-hidden="true">→</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </section>
</template>

<script setup>
import { adminDashboardGroups } from '~/utils/adminNavigation.js'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Master Admin | Saujana BGC', meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }] })
</script>

<style scoped>
.dashboard-lede {
  max-width: 620px;
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.65;
}

.dashboard-section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 12px;
}

.dashboard-section-heading h2 {
  margin: 0;
  color: var(--matcha-leaf);
  font: 400 1.6rem var(--font-display);
}

.dashboard-overview {
  min-height: 44px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dashboard-grid-wide {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dashboard-link {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  height: 100%;
  padding: clamp(16px, 2.5vw, 22px);
  color: inherit;
  text-decoration: none;
}

.dashboard-link:hover,
.dashboard-link:focus-visible {
  border-color: var(--gold-leaf);
}

.dashboard-link:focus-visible {
  outline: 2px solid var(--matcha-leaf);
  outline-offset: 2px;
}

.dashboard-link h3 {
  margin: 0 0 6px;
  color: var(--matcha-leaf);
  font: 400 1.25rem/1.25 var(--font-display);
  overflow-wrap: anywhere;
}

.dashboard-link p {
  margin: 0;
  color: var(--muted);
  font-size: .875rem;
  line-height: 1.55;
}

.dashboard-arrow {
  flex: none;
  color: var(--matcha-leaf);
}

@media (max-width: 900px) {
  .dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 540px) {
  .dashboard-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
