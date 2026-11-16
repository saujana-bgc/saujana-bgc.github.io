<template>
  <section aria-labelledby="visitor-names-title">
    <header>
      <p class="eyebrow">For community organisers</p>
      <h1 id="visitor-names-title">Visitor names</h1>
      <p class="page-intro">Each name appears once for every day they visited in the past seven days, Kuala Lumpur time.</p>
    </header>

    <section v-if="loadError" class="admin-card result-state" role="alert">
      <h2>We couldn’t load visitor names.</h2>
      <p>{{ loadError }}</p>
      <UButton class="admin-primary" type="button" @click="loadVisitors">Try again</UButton>
    </section>

    <section v-else class="admin-card results" aria-label="Recent visitor names" aria-live="polite">
      <p v-if="isLoading" class="result-state">Loading visitor names…</p>
      <p v-else-if="!visitors.length" class="result-state">No named visitors in the past seven days.</p>
      <div v-else class="visit-days">
        <div v-for="[date, names] in visitorsByDate" :key="date">
          <h2><time :datetime="date">{{ visitDateLabel(date) }}</time></h2>
          <ul>
            <li v-for="name in names" :key="name">{{ name }}</li>
          </ul>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
definePageMeta({ layout: 'admin' })
useHead({
  title: 'Visitor Names | Saujana BGC',
  meta: [
    { name: 'robots', content: 'noindex, nofollow, noarchive' },
    { name: 'description', content: 'Recent named visitors for Saujana organisers.' },
  ],
})

const auth = useAdminAuth()
const visitors = ref([])
const isLoading = ref(true)
const loadError = ref('')
const visitDateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'full',
  timeZone: 'UTC',
})

const visitorsByDate = computed(() => {
  const dates = new Map()
  for (const { name, visited_on: date } of visitors.value) {
    if (!dates.has(date)) dates.set(date, [])
    dates.get(date).push(name)
  }
  return dates
})

function visitDateLabel(date) {
  return visitDateFormatter.format(new Date(date))
}

async function loadVisitors() {
  isLoading.value = true
  loadError.value = ''

  try {
    const config = useRuntimeConfig()
    const response = await auth.authenticatedFetch(`${config.public.supabaseUrl}/rest/v1/rpc/get_recent_named_visitors_by_date`, {
      method: 'POST',
      headers: {
        apikey: config.public.supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    if (!response.ok) throw new Error('Could not load visitor names')
    visitors.value = await response.json()
  } catch {
    loadError.value = 'Please try again.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadVisitors)
</script>

<style scoped>
.page-intro {
  max-width: 620px;
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.65;
}

.results,
.result-state {
  margin-top: 24px;
}

.result-state h2,
.visit-days h2 {
  margin: 0 0 8px;
  color: var(--matcha-leaf);
  font: 400 1.35rem var(--font-display);
}

.result-state p {
  color: var(--muted);
}

.visit-days {
  display: grid;
  gap: 24px;
}

.results ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.results li {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--matcha-leaf);
  overflow-wrap: anywhere;
}
</style>
