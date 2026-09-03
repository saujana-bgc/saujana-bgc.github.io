<template>
  <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
    <header class="fade-up">
      <h1 class="hero-title">Gatherings</h1>
      <div class="stats-container">Dates, venues, and sign-ups for upcoming play.</div>
    </header>

    <main style="width: 100%; display: flex; flex-direction: column; align-items: center;">

      <section class="first-time-panel fade-up" aria-label="First time guidance">
        <h2>First time?</h2>
        <p>Come solo, watch first, or join a taught game. Add your name so the host can plan the room.</p>
      </section>

      <div class="tabs fade-up">
        <button :class="['tab', activeTab === 'present' ? 'tab-active' : '']" @click="switchTab('present')">
          Upcoming
        </button>
        <button :class="['tab', activeTab === 'past' ? 'tab-active' : '']" @click="switchTab('past')">
          Past
        </button>
      </div>

      <div
        v-for="(event, index) in currentEvents"
        :key="event.id"
        class="event-card fade-up"
        :class="{ 'event-card-collapsed': activeTab === 'past' && !expandedEvents.has(event.id) }"
        :style="{ transitionDelay: (index * 0.07) + 's' }"
      >
        <div v-if="getVenueImage(event.venue)" class="event-image-wrap">
          <img
            :src="getVenueImage(event.venue)"
            :alt="event.venue"
            class="event-image"
            width="1536"
            height="1024"
            :loading="index === 0 && activeTab === 'present' ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 && activeTab === 'present' ? 'high' : 'auto'"
            decoding="async"
          />
          <div class="event-image-content">
            <div class="event-image-copy">
              <span class="date-badge event-image-date">🌿 {{ formatDate(event.date) }}</span>
              <h2 class="hero-title event-image-title">{{ event.name }}</h2>
            </div>
            <div class="event-image-details" aria-label="Gathering details">
              <div class="event-detail">
                <span class="event-detail-label">Time</span>
                <span class="event-detail-value">{{ event.time }}</span>
              </div>
              <div class="event-detail event-detail-venue">
                <span class="event-detail-label">Venue</span>
                <span class="event-detail-value">{{ event.venue }}</span>
              </div>
              <a v-if="event.venue_url" :href="event.venue_url" target="_blank" rel="noopener noreferrer" class="event-directions" aria-label="Open directions">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z"/>
                  <circle cx="12" cy="10" r="2.4"/>
                </svg>
                <span>Directions</span>
              </a>
            </div>
          </div>
        </div>

        <div v-else class="event-heading">
          <span class="date-badge">🌿 {{ formatDate(event.date) }}</span>
          <h2 class="hero-title">{{ event.name }}</h2>
          <div class="event-heading-details">
            <span>{{ event.time }}</span>
            <span>{{ event.venue }}</span>
            <a v-if="event.venue_url" :href="event.venue_url" target="_blank" rel="noopener noreferrer">Directions</a>
          </div>
        </div>

        <button v-if="activeTab === 'past' && !expandedEvents.has(event.id)" class="expand-bar" @click="toggleEvent(event.id)">
          <span>View details</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
        </button>

        <template v-if="activeTab !== 'past' || expandedEvents.has(event.id)">
          <div class="event-description">
            {{ event.description }}
          </div>

          <div class="attendees-section">
            <div v-if="activeTab === 'present'" class="signup-intro">
              <h3>Add your name</h3>
              <p>A nickname is fine. If you are tentative, mention it in notes.</p>
            </div>

            <div v-if="canEditEvent(event)" class="attendees-actions attendees-actions-primary">
              <button v-if="!newRows[event.id]" @click="addRow(event.id)" class="btn-add">Add me</button>
              <template v-else>
                <button @click="saveNewRow(event.id)" class="btn-save">Save</button>
                <button @click="cancelNewRow(event.id)" class="btn-cancel">Cancel</button>
              </template>
            </div>

            <div class="attendees-header">
              <h3 class="attendees-title">Who's coming</h3>
              <div class="attendees-stats">
                <div class="stat-pill">
                  <span class="stat-num">{{ attendeesByEvent[event.id]?.length ?? 0 }}</span>
                  <span class="stat-lbl">coming</span>
                </div>
                <div class="stat-pill">
                  <span class="stat-num">RM {{ totalSpent(event.id).toFixed(2) }}</span>
                  <span class="stat-lbl">total spent</span>
                </div>
                <div class="stat-pill">
                  <span class="stat-num">RM {{ avgSpent(event.id).toFixed(2) }}</span>
                  <span class="stat-lbl">avg per person</span>
                </div>
                <div v-if="canEditEvent(event)" class="stat-pill stat-pill-min">
                  <span class="stat-num">RM10</span>
                  <span class="stat-lbl">min / person</span>
                </div>
              </div>
            </div>

            <div v-if="canEditEvent(event)" class="attendees-notice">
              <p class="notice-intro">A few details help the host plan games and support the venue.</p>
              <ul>
                <li><strong>Minimum spend of RM10 per person.</strong> Everyone orders so we can keep using the space comfortably.</li>
                <li>One person per row. For a +1, add a separate row (e.g. <em>Adam's +1 (Eve)</em>) and include their spend.</li>
                <li>After ordering, update your spend and pay at the counter.</li>
              </ul>
            </div>

            <div class="attendees-table-wrap">
              <table class="attendees-table">
                <thead>
                  <tr>
                    <th @mouseenter="showTooltip($event, 'Name or nickname for planning.')" @mouseleave="hideTooltip">Name</th>
                    <th @mouseenter="showTooltip($event, 'Expected arrival time. Leave blank if unsure.')" @mouseleave="hideTooltip">ETA</th>
                    <th @mouseenter="showTooltip($event, 'Minimum spend is RM10 per person. Update this after ordering.')" @mouseleave="hideTooltip">
                      Spent (RM)<br><span class="th-sub">min. RM10</span>
                    </th>
                    <th @mouseenter="showTooltip($event, 'Games you may bring.')" @mouseleave="hideTooltip">Games</th>
                    <th @mouseenter="showTooltip($event, 'Tentative, TBC, or anything useful for the host.')" @mouseleave="hideTooltip">Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="canEditEvent(event) && newRows[event.id]" :ref="el => setNewRowRef(event.id, el)" class="new-row">
                    <td><input v-model="newRows[event.id].name" class="cell-input" :class="{ 'input-error': nameErrors[event.id] }" placeholder="Your name *" autocomplete="off" @focus="showNameAutocomplete($event, newRows[event.id])" @input="onNewNameInput($event, event.id)" @blur="hideNameAutocompleteSoon" /></td>
                    <td><input v-model="newRows[event.id].eta" type="time" class="cell-input" :min="eventStartTime(event) || undefined" @change="validateEtaForEvent(event, newRows[event.id])" /></td>
                    <td><input v-model="newRows[event.id].amount_spent" type="number" step="0.01" min="10" class="cell-input cell-number" /></td>
                    <td><textarea v-model="newRows[event.id].bringing_games" class="cell-input cell-area" placeholder="Game title(s)" rows="1" @input="autoResize" /></td>
                    <td><textarea v-model="newRows[event.id].notes" class="cell-input cell-area" placeholder="Notes" rows="1" @input="autoResize" /></td>
                    <td></td>
                  </tr>
                  <tr v-for="attendee in attendeesByEvent[event.id] ?? []" :key="attendee.id">
                    <td>
                      <input v-model="attendee.name" class="cell-input" autocomplete="off" :readonly="!canEditEvent(event)" @focus="showNameAutocomplete($event, attendee)" @input="showNameAutocomplete($event, attendee)" @blur="onExistingNameBlur(attendee, event)" />
                    </td>
                    <td>
                      <input v-model="attendee.eta" type="time" class="cell-input" :min="eventStartTime(event) || undefined" :readonly="!canEditEvent(event)" @change="validateEtaForEvent(event, attendee)" @blur="saveAttendee(attendee, event)" />
                    </td>
                    <td>
                      <input v-model="attendee.amount_spent" type="number" step="0.01" min="10" class="cell-input cell-number" :readonly="!canEditEvent(event)" @blur="saveAttendee(attendee, event)" />
                    </td>
                    <td>
                      <textarea v-model="attendee.bringing_games" class="cell-input cell-area" placeholder="—" rows="1" :readonly="!canEditEvent(event)" @input="autoResize" @blur="saveAttendee(attendee, event)" />
                    </td>
                    <td>
                      <textarea v-model="attendee.notes" class="cell-input cell-area" placeholder="—" rows="1" :readonly="!canEditEvent(event)" @input="autoResize" @blur="saveAttendee(attendee, event)" />
                    </td>
                    <td class="td-delete">
                      <button v-if="canEditEvent(event)" class="btn-delete" @click="confirmDelete(attendee, event.id, event)" title="Remove">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" style="width:0.85em;height:0.85em"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile cards -->
            <div class="attendees-cards">
              <div v-if="canEditEvent(event) && newRows[event.id]" :ref="el => setNewCardRef(event.id, el)" class="attendee-card new-card">
                <div class="card-header">
                  <input v-model="newRows[event.id].name" class="card-name-input" :class="{ 'input-error': nameErrors[event.id] }" placeholder="Your name *" autocomplete="off" @focus="showNameAutocomplete($event, newRows[event.id])" @input="onNewNameInput($event, event.id)" @blur="hideNameAutocompleteSoon" />
                </div>
                <div class="card-field">
                  <span class="card-label">ETA</span>
                  <input v-model="newRows[event.id].eta" type="time" class="card-value-input" :min="eventStartTime(event) || undefined" @change="validateEtaForEvent(event, newRows[event.id])" />
                </div>
                <div class="card-field">
                  <span class="card-label">Spent (RM)</span>
                  <input v-model="newRows[event.id].amount_spent" type="number" step="0.01" min="10" class="card-value-input" />
                </div>
                <div class="card-field">
                  <span class="card-label">Bringing</span>
                  <textarea v-model="newRows[event.id].bringing_games" class="card-value-input card-area" placeholder="Game title(s)" rows="1" @input="autoResize" />
                </div>
                <div class="card-field">
                  <span class="card-label">Notes</span>
                  <textarea v-model="newRows[event.id].notes" class="card-value-input card-area" placeholder="Notes" rows="1" @input="autoResize" />
                </div>
              </div>
              <div v-for="attendee in attendeesByEvent[event.id] ?? []" :key="attendee.id" class="attendee-card">
                <div class="card-header">
                  <input v-model="attendee.name" class="card-name-input" autocomplete="off" :readonly="!canEditEvent(event)" @focus="showNameAutocomplete($event, attendee)" @input="showNameAutocomplete($event, attendee)" @blur="onExistingNameBlur(attendee, event)" />
                  <button v-if="canEditEvent(event)" class="btn-delete" @click="confirmDelete(attendee, event.id, event)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" style="width:0.85em;height:0.85em"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg></button>
                </div>
                <div class="card-field">
                  <span class="card-label">ETA</span>
                  <input v-model="attendee.eta" type="time" class="card-value-input" :min="eventStartTime(event) || undefined" :readonly="!canEditEvent(event)" @change="validateEtaForEvent(event, attendee)" @blur="saveAttendee(attendee, event)" />
                </div>
                <div class="card-field">
                  <span class="card-label">Spent (RM)</span>
                  <input v-model="attendee.amount_spent" type="number" step="0.01" min="10" class="card-value-input" :readonly="!canEditEvent(event)" @blur="saveAttendee(attendee, event)" />
                </div>
                <div class="card-field">
                  <span class="card-label">Bringing</span>
                  <textarea v-model="attendee.bringing_games" class="card-value-input card-area" placeholder="—" rows="1" :readonly="!canEditEvent(event)" @input="autoResize" @blur="saveAttendee(attendee, event)" />
                </div>
                <div class="card-field">
                  <span class="card-label">Notes</span>
                  <textarea v-model="attendee.notes" class="card-value-input card-area" placeholder="—" rows="1" :readonly="!canEditEvent(event)" @input="autoResize" @blur="saveAttendee(attendee, event)" />
                </div>
              </div>
            </div>

          </div>

          <button v-if="activeTab === 'past'" class="collapse-bar" @click="toggleEvent(event.id)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M14.78 11.78a.75.75 0 0 1-1.06 0L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd"/></svg>
            <span>Collapse</span>
          </button>
        </template>
      </div>

      <Teleport to="body">
        <div v-if="tooltip.visible" class="tooltip-fixed" :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }">
          {{ tooltip.text }}
        </div>
      </Teleport>

      <Teleport to="body">
        <div
          v-if="nameAutocomplete.visible && filteredNameOptions.length"
          class="name-autocomplete"
          :style="{ top: nameAutocomplete.y + 'px', left: nameAutocomplete.x + 'px', width: nameAutocomplete.width + 'px' }"
        >
          <button
            v-for="name in filteredNameOptions"
            :key="name"
            class="name-autocomplete-option"
            type="button"
            @pointerdown.prevent="selectNameOption(name)"
          >{{ name }}</button>
        </div>
      </Teleport>

      <Teleport to="body">
        <div class="toast-container">
          <div v-for="toast in toasts" :key="toast.id" class="toast">{{ toast.message }}</div>
        </div>
      </Teleport>

      <div v-if="pendingDelete" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal-box">
          <p class="modal-msg">Remove <strong>{{ pendingDelete.attendee.name }}</strong> from the list?</p>
          <div class="modal-actions">
            <button class="btn-modal-cancel" @click="cancelDelete">Keep them</button>
            <button class="btn-modal-delete" @click="doDelete">Remove</button>
          </div>
        </div>
      </div>

      <div class="pagination fade-up" v-if="totalCurrentPages > 1">
        <button class="page-btn" :disabled="currentPage === 1" @click="prevPage">← Prev</button>
        <span class="page-info">{{ currentPage }} / {{ totalCurrentPages }}</span>
        <button class="page-btn" :disabled="currentPage === totalCurrentPages" @click="nextPage">Next →</button>
      </div>

      <template v-if="loading">
        <div class="loading-copy">Loading gatherings...</div>
        <div class="event-card" v-for="n in 2" :key="'skel-'+n" style="pointer-events: none;">
          <div class="skel" style="width: 32%; margin-bottom: 18px;"></div>
          <div class="skel" style="width: 55%; height: 30px; margin-bottom: 14px;"></div>
          <div class="skel" style="margin-bottom: 8px;"></div>
          <div class="skel" style="width: 80%; margin-bottom: 30px;"></div>
          <div class="skel" style="height: 110px; border-radius: 20px; margin-bottom: 0;"></div>
        </div>
      </template>

      <div v-if="!loading && currentEvents.length === 0" class="empty-state fade-up">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" style="width:1em;height:1em;font-size:2rem;margin-bottom:15px;display:block;color:var(--matcha-leaf);opacity:0.5"><path d="M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.2c-6.3-.3-12.6-.5-19-.5z"/></svg>
        <p>No gatherings are listed right now.<br>Check back soon for the next date.</p>
      </div>
    </main>
  </div>
</template>

<script setup>
const supabase = useSupabase()

const PAGE_SIZE = 10
const MINIMUM_SPEND = 10
const loadingTab = ref(null)
const loading = computed(() => loadingTab.value === activeTab.value)
const presentEventsList = ref([])
const pastEventsList = ref([])
const presentLoaded = ref(false)
const pastEventsByPage = reactive({})
const pastLoadedPages = reactive(new Set())
const pastTotalCount = ref(0)
const attendeesByEvent = reactive({})
const savedPayloads = new Map()
const attendeeEventIds = new Set()
const newRows = reactive({})
const newRowRefs = new Map()
const newCardRefs = new Map()
const nameErrors = reactive({})
const attendeeNameOptions = ref([])
const nameAutocomplete = reactive({ visible: false, row: null, x: 0, y: 0, width: 240 })
const pendingDelete = ref(null)
const tooltip = reactive({ visible: false, text: '', x: 0, y: 0 })
const toasts = ref([])
let toastIdCounter = 0

function showToast(message, duration = 3000) {
    const id = ++toastIdCounter
    toasts.value.push({ id, message })
    setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, duration)
}

function showTooltip(e, text) {
    const rect = e.target.getBoundingClientRect()
    tooltip.text = text
    tooltip.x = rect.left + rect.width / 2
    tooltip.y = rect.top - 8
    tooltip.visible = true
}

function hideTooltip() {
    tooltip.visible = false
}

function isPlusOneName(name) {
    return /(?:\+1|\bplus[\s-]*one\b)/i.test(name)
}

function mergeAttendeeNameOptions(names) {
    const unique = new Map(attendeeNameOptions.value.map(name => [name.toLowerCase(), name]))

    for (const value of names) {
        const name = String(value ?? '').trim()
        if (name && !isPlusOneName(name)) unique.set(name.toLowerCase(), name)
    }

    attendeeNameOptions.value = [...unique.values()].sort((a, b) => a.localeCompare(b))
}

const filteredNameOptions = computed(() => {
    const value = String(nameAutocomplete.row?.name ?? '').trim().toLowerCase()
    return attendeeNameOptions.value
        .filter(name => {
            const option = name.toLowerCase()
            return option !== value && (!value || option.includes(value))
        })
        .slice(0, 10)
})

function showNameAutocomplete(e, row) {
    if (e.target.readOnly) return
    const rect = e.target.getBoundingClientRect()
    const width = Math.min(Math.max(220, rect.width), window.innerWidth - 28)
    nameAutocomplete.row = row
    nameAutocomplete.x = Math.max(14, Math.min(rect.left, window.innerWidth - width - 14))
    nameAutocomplete.y = rect.bottom + 6
    nameAutocomplete.width = width
    nameAutocomplete.visible = true
}

function hideNameAutocompleteSoon() {
    setTimeout(() => { nameAutocomplete.visible = false }, 120)
}

function selectNameOption(name) {
    if (nameAutocomplete.row) nameAutocomplete.row.name = name
    nameAutocomplete.visible = false
}

function onNewNameInput(e, eventId) {
    nameErrors[eventId] = false
    showNameAutocomplete(e, newRows[eventId])
}

function onExistingNameBlur(attendee, event) {
    hideNameAutocompleteSoon()
    saveAttendee(attendee, event)
}
const activeTab = ref('present')
const presentPage = ref(1)
const pastPage = ref(1)
const expandedEvents = reactive(new Set())

const presentEvents = computed(() => presentEventsList.value)
const pastEvents = computed(() => pastEventsList.value)

const currentPage = computed(() => activeTab.value === 'present' ? presentPage.value : pastPage.value)
const totalCurrentPages = computed(() => {
    const total = activeTab.value === 'present' ? presentEvents.value.length : pastTotalCount.value
    return Math.max(1, Math.ceil(total / PAGE_SIZE))
})

const currentEvents = computed(() => {
    const list = activeTab.value === 'present' ? presentEvents.value : pastEvents.value
    if (activeTab.value === 'past') return list
    const start = (currentPage.value - 1) * PAGE_SIZE
    return list.slice(start, start + PAGE_SIZE)
})

function switchTab(tab) {
    activeTab.value = tab
    presentPage.value = 1
    pastPage.value = 1
    loadEventsForTab(tab).catch(() => showToast('Gatherings are taking longer to load.'))
    resizeAllAreas()
}

function toggleEvent(eventId) {
    if (expandedEvents.has(eventId)) {
        expandedEvents.delete(eventId)
    } else {
        expandedEvents.add(eventId)
        resizeAllAreas()
    }
}

function prevPage() {
    if (activeTab.value === 'present') {
        presentPage.value--
    } else {
        pastPage.value--
        loadEventsForTab('past').catch(() => showToast('Gatherings are taking longer to load.'))
    }
}

function nextPage() {
    if (activeTab.value === 'present') {
        presentPage.value++
    } else {
        pastPage.value++
        loadEventsForTab('past').catch(() => showToast('Gatherings are taking longer to load.'))
    }
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-')
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getVenueImage(venue) {
    if (!venue) return null
    const v = venue.toLowerCase()
    if (v.includes('manna')) return '/images/venues/manna.avif'
    if (v.includes('eleven')) return '/images/venues/eleven_at_saujana.avif'
    if (v.includes('bandit')) return '/images/venues/bandit.avif'
    if (v.includes('vanilla')) return '/images/venues/vanilla.avif'
    if (v.includes('starbucks oasis damansara')) return '/images/venues/starbucks-oasis.avif'
    if (v.includes("mcdonald's mutiara damansara")) return '/images/venues/mcdcurve.avif'
    return null
}

function eventTags(event) {
    const tags = ['Open table', 'Casual pace']
    if (event.venue) tags.push('Cozy venue')
    return tags
}

function totalSpent(eventId) {
    return (attendeesByEvent[eventId] ?? []).reduce((sum, a) => sum + (parseFloat(a.amount_spent) || 0), 0)
}

function avgSpent(eventId) {
    const list = attendeesByEvent[eventId] ?? []
    return list.length ? totalSpent(eventId) / list.length : 0
}

function todayIso() {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    date.setHours(0, 0, 0, 0)
    return date
}

function canEditEvent(event) {
    if (!event?.date) return false
    const cutoff = parseLocalDate(todayIso())
    cutoff.setDate(cutoff.getDate() - 2)
    return parseLocalDate(event.date) >= cutoff
}

function eventStartTime(event) {
    const time = String(event?.time ?? '')
    const match = time.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/i)
    if (!match) return ''

    let hours = Number(match[1])
    const minutes = Number(match[2] ?? '0')
    const meridiem = match[3]?.toLowerCase()

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59) return ''
    if (meridiem) {
        if (hours < 1 || hours > 12) return ''
        if (meridiem === 'am') hours = hours === 12 ? 0 : hours
        else hours = hours === 12 ? 12 : hours + 12
    } else if (hours > 23) {
        return ''
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function validateEtaForEvent(event, attendee) {
    const startTime = eventStartTime(event)
    if (!startTime || !attendee?.eta || attendee.eta >= startTime) return true

    const prev = attendee.id ? savedPayloads.get(attendee.id) : null
    attendee.eta = prev?.eta || ''
    showToast(`ETA cannot be earlier than ${startTime}.`)
    return false
}

function findEventById(eventId) {
    return [...presentEventsList.value, ...pastEventsList.value].find(event => event.id === eventId)
}

async function getPresentEvents() {
    const { data: events } = await supabase
        .from('events')
        .select('id,name,date,description,venue,venue_url,time')
        .gte('date', todayIso())
        .order('date', { ascending: true })

    presentEventsList.value = events ?? []
    presentLoaded.value = true
    await getAttendeesForEvents(presentEventsList.value)
}

async function getPastEvents(page = pastPage.value) {
    if (pastLoadedPages.has(page)) {
        if (page === pastPage.value) pastEventsList.value = pastEventsByPage[page] ?? []
        await getAttendeesForEvents(pastEventsByPage[page] ?? [])
        return
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data: events, count } = await supabase
        .from('events')
        .select('id,name,date,description,venue,venue_url,time', { count: 'exact' })
        .lt('date', todayIso())
        .order('date', { ascending: false })
        .range(from, to)

    pastEventsByPage[page] = events ?? []
    if (page === pastPage.value) pastEventsList.value = pastEventsByPage[page]
    pastTotalCount.value = count ?? pastTotalCount.value
    pastLoadedPages.add(page)
    await getAttendeesForEvents(pastEventsByPage[page])
}

async function getAttendeesForEvents(events) {
    for (const event of events) {
        if (!attendeesByEvent[event.id]) attendeesByEvent[event.id] = []
    }

    const ids = events
        .map(event => event.id)
        .filter(id => !attendeeEventIds.has(id))

    if (!ids.length) return

    const { data: attendees } = await supabase
        .from('attendees')
        .select('id,event_id,name,eta,amount_spent,bringing_games,notes')
        .in('event_id', ids)
        .order('id', { ascending: true })

    const grouped = {}
    for (const attendee of attendees ?? []) {
        if (!grouped[attendee.event_id]) grouped[attendee.event_id] = []
        grouped[attendee.event_id].push(attendee)
        savedPayloads.set(attendee.id, buildPayload(attendee))
    }
    mergeAttendeeNameOptions((attendees ?? []).map(attendee => attendee.name))

    for (const event of events) {
        attendeesByEvent[event.id] = grouped[event.id] ?? []
        attendeeEventIds.add(event.id)
    }
}

async function loadEventsForTab(tab) {
    if (tab === 'present' && presentLoaded.value) return
    if (tab === 'past' && pastLoadedPages.has(pastPage.value)) {
        pastEventsList.value = pastEventsByPage[pastPage.value] ?? []
        await getAttendeesForEvents(pastEventsList.value)
        return
    }

    loadingTab.value = tab
    if (tab === 'past') pastEventsList.value = []
    try {
        if (tab === 'present') await getPresentEvents()
        else await getPastEvents()
    } finally {
        if (loadingTab.value === tab) loadingTab.value = null
        resizeAllAreas()
    }
}

async function getAttendeeNameOptions() {
    const { data } = await supabase
        .from('attendees')
        .select('name')
        .order('name', { ascending: true })

    mergeAttendeeNameOptions((data ?? []).map(attendee => attendee.name))
}

function buildPayload(attendee) {
    return {
        name: attendee.name,
        eta: attendee.eta || null,
        amount_spent: attendee.amount_spent !== '' && attendee.amount_spent !== null ? parseFloat(attendee.amount_spent) : null,
        bringing_games: attendee.bringing_games || null,
        notes: attendee.notes || null,
    }
}

function validateMinimumSpend(attendee) {
    const amount = attendee.amount_spent
    if (amount === '' || amount === null || amount === undefined) return true

    const numericAmount = Number(amount)
    if (Number.isFinite(numericAmount) && numericAmount >= MINIMUM_SPEND) return true

    showToast('Minimum spend is RM10 when an amount is entered.')
    return false
}

async function saveAttendee(attendee, event = null) {
    const attendeeEvent = event ?? findEventById(attendee.event_id)
    if (!canEditEvent(attendeeEvent)) return
    const prev = savedPayloads.get(attendee.id)

    if (!attendee.name?.trim()) {
        attendee.name = prev?.name || ''
        showToast('Please add a name.')
        return
    }
    if (!validateEtaForEvent(attendeeEvent, attendee)) return
    if (!validateMinimumSpend(attendee)) {
        attendee.amount_spent = prev?.amount_spent ?? null
        return
    }
    const payload = buildPayload(attendee)
    if (prev && JSON.stringify(payload) === JSON.stringify(prev)) return
    const { error } = await supabase.from('attendees').update(payload).eq('id', attendee.id)
    if (error) {
        if (prev) Object.assign(attendee, prev)
        showToast('Could not save. Please try again.')
        return
    }
    savedPayloads.set(attendee.id, payload)
    if (attendee.name) localStorage.setItem('saujana_name', attendee.name)
    mergeAttendeeNameOptions([attendee.name])
    showToast('Saved.')
}

function confirmDelete(attendee, eventId, event = null) {
    if (!canEditEvent(event ?? findEventById(eventId))) {
        showToast('This gathering can no longer be edited.')
        return
    }
    pendingDelete.value = { attendee, eventId, event }
}

function cancelDelete() {
    pendingDelete.value = null
}

function autoResize(e) {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
}

async function doDelete() {
    if (!pendingDelete.value) return
    const { attendee, eventId, event } = pendingDelete.value
    if (!canEditEvent(event ?? findEventById(eventId))) {
        pendingDelete.value = null
        showToast('This gathering can no longer be edited.')
        return
    }

    const { error } = await supabase.from('attendees').delete().eq('id', attendee.id)
    if (error) {
        pendingDelete.value = null
        showToast('Could not remove this name. Please try again.')
        return
    }
    attendeesByEvent[eventId] = attendeesByEvent[eventId].filter(a => a.id !== attendee.id)
    pendingDelete.value = null
}

function setNewRowRef(eventId, el) {
    if (el) newRowRefs.set(eventId, el)
    else newRowRefs.delete(eventId)
}

function setNewCardRef(eventId, el) {
    if (el) newCardRefs.set(eventId, el)
    else newCardRefs.delete(eventId)
}

function isVisible(el) {
    return Boolean(el?.offsetParent)
}

async function scrollToNewRow(eventId) {
    await nextTick()
    const target = [newCardRefs.get(eventId), newRowRefs.get(eventId)].find(isVisible)
        ?? newCardRefs.get(eventId)
        ?? newRowRefs.get(eventId)

    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })

    const input = target?.querySelector('input, textarea')
    input?.focus({ preventScroll: true })
}

async function addRow(eventId) {
    if (!canEditEvent(findEventById(eventId))) {
        showToast('This gathering can no longer be edited.')
        return
    }

    const savedName = localStorage.getItem('saujana_name') || ''
    newRows[eventId] = { name: savedName, eta: '', amount_spent: null, bringing_games: '', notes: '' }
    await scrollToNewRow(eventId)
}

function cancelNewRow(eventId) {
    delete newRows[eventId]
    delete nameErrors[eventId]
    newRowRefs.delete(eventId)
    newCardRefs.delete(eventId)
}

async function saveNewRow(eventId) {
    const event = findEventById(eventId)
    if (!canEditEvent(event)) {
        showToast('This gathering can no longer be edited.')
        return
    }

    const row = newRows[eventId]
    if (!row.name.trim()) {
        nameErrors[eventId] = true
        return
    }
    nameErrors[eventId] = false
    if (!validateEtaForEvent(event, row)) return
    if (!validateMinimumSpend(row)) return

    const { data } = await supabase
        .from('attendees')
        .insert({
            event_id: eventId,
            name: row.name.trim(),
            eta: row.eta || null,
            amount_spent: row.amount_spent ? parseFloat(row.amount_spent) : null,
            bringing_games: row.bringing_games || null,
            notes: row.notes || null,
        })
        .select()
        .single()

    if (data) {
        if (!attendeesByEvent[eventId]) attendeesByEvent[eventId] = []
        attendeesByEvent[eventId].push(data)
        savedPayloads.set(data.id, buildPayload(data))
        localStorage.setItem('saujana_name', data.name)
        mergeAttendeeNameOptions([data.name])
        showToast(`You're on the list, ${data.name}.`)
        delete newRows[eventId]
    } else {
        showToast('Could not save. Please try again.')
    }
}

function resizeAllAreas() {
    nextTick(() => {
        document.querySelectorAll('.cell-area, .card-area').forEach(el => {
            el.style.height = 'auto'
            el.style.height = el.scrollHeight + 'px'
        })
    })
}

function onKeydown(e) { if (e.key === 'Escape') cancelDelete() }

onMounted(async () => {
    document.addEventListener('keydown', onKeydown)
    try {
        await Promise.all([
            loadEventsForTab('present'),
            getAttendeeNameOptions(),
        ])
    } catch {
        showToast('Gatherings are taking longer to load.')
    }
})

onUnmounted(() => document.removeEventListener('keydown', onKeydown))

watch([attendeesByEvent, newRows], resizeAllAreas, { deep: true, flush: 'post' })
</script>

<style scoped>
/* --- TABS --- */
.tabs {
    display: flex;
    gap: 10px;
    margin: 10px auto 20px;
    background: var(--white-pure);
    border-radius: 40px;
    padding: 6px;
    box-shadow: 0 4px 16px rgba(160, 100, 110, 0.08);
    width: fit-content;
}

.tab {
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    border: none;
    border-radius: 30px;
    padding: 10px 22px;
    cursor: pointer;
    background: transparent;
    color: inherit;
    opacity: 0.45;
    transition: opacity 0.2s, background 0.2s, color 0.2s;
}

.tab-active {
    background: linear-gradient(135deg, var(--rose-dust), var(--lavender-mist));
    opacity: 1;
    color: var(--matcha-leaf);
    box-shadow: inset 0 2px 0 var(--gold-leaf);
}

.first-time-panel {
    width: 90%;
    max-width: 860px;
    box-sizing: border-box;
    margin: 0 auto 18px;
    padding: 22px clamp(20px, 4vw, 34px);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: inset 0 3px 0 var(--gold-leaf), 0 12px 32px rgba(160, 100, 110, 0.08);
    text-align: center;
}

.first-time-panel h2 {
    margin: 0 0 8px;
    color: var(--matcha-leaf);
    font-family: 'Playfair Display', serif;
    font-size: 1.35rem;
    font-style: italic;
    font-weight: 400;
}

.first-time-panel p {
    margin: 0 auto;
    max-width: 680px;
    font-size: 0.92rem;
    line-height: 1.75;
    opacity: 0.82;
}

/* --- PAGINATION --- */
.pagination {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 0 auto 30px;
}

.page-btn {
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    border: none;
    border-radius: 20px;
    padding: 8px 20px;
    cursor: pointer;
    background: var(--lavender-mist);
    color: var(--matcha-leaf);
    transition: opacity 0.2s, transform 0.2s;
}

.page-btn:disabled { opacity: 0.3; cursor: default; transform: none; }
.page-btn:not(:disabled):hover { opacity: 0.8; transform: translateY(-1px); }

.page-info {
    font-size: 0.7rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    opacity: 0.5;
}

/* --- EVENT CARDS --- */
.event-card {
    background: var(--white-pure);
    border-radius: 35px;
    padding: var(--section-pad);
    margin-bottom: 30px;
    box-shadow: inset 0 3px 0 var(--gold-leaf), 0 15px 40px rgba(160, 100, 110, 0.1);
    border: 1px solid rgba(201, 190, 239, 0.12);
    max-width: 850px;
    width: 90%;
    text-align: left;
    box-sizing: border-box;
    transition: transform 0.35s ease, box-shadow 0.35s ease;
    overflow: hidden;
    position: relative;
}

.event-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--gold-leaf);
    z-index: 2;
    pointer-events: none;
}

.event-card:hover {
    transform: translateY(-4px);
    box-shadow: inset 0 3px 0 var(--gold-leaf), 0 22px 55px rgba(160, 100, 110, 0.14);
}

.event-card-collapsed { padding-bottom: calc(var(--section-pad) * 0.75); }

.expand-bar, .collapse-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-top: 20px;
    padding: 12px 20px 0;
    border: none;
    border-top: 1px solid rgba(107, 122, 104, 0.12);
    border-radius: 0;
    font-family: inherit;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    cursor: pointer;
    background: transparent;
    color: var(--matcha-leaf);
    opacity: 0.62;
    transition: opacity 0.2s, color 0.2s, transform 0.2s;
}

.expand-bar svg, .collapse-bar svg {
    color: var(--gold-leaf);
    transition: transform 0.2s ease;
}

.expand-bar {
    position: relative;
}

.expand-bar::before {
    content: "";
    position: absolute;
    top: -1px;
    left: 50%;
    width: 84px;
    height: 1px;
    transform: translateX(-50%);
    background: linear-gradient(to right, transparent, var(--gold-leaf), transparent);
    opacity: 0.75;
}

.expand-bar:hover, .collapse-bar:hover {
    opacity: 0.95;
    color: var(--clay-text);
}

.expand-bar:hover svg { transform: translateY(1px); }
.collapse-bar:hover svg { transform: translateY(-1px); }

.event-image-wrap {
    margin-bottom: 18px;
    height: 235px;
    overflow: hidden;
    position: relative;
    border-radius: 28px;
    border: 1px solid rgba(201, 190, 239, 0.2);
    box-shadow: 0 18px 42px rgba(74, 68, 63, 0.14);
    isolation: isolate;
}

.event-image-wrap::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
        linear-gradient(to top, rgba(33, 30, 27, 0.82), rgba(48, 43, 39, 0.3) 58%, rgba(48, 43, 39, 0.08)),
        radial-gradient(circle at 82% 74%, rgba(248, 236, 215, 0.22), transparent 34%),
        linear-gradient(135deg, rgba(107, 122, 104, 0.24), rgba(176, 80, 112, 0.12));
    z-index: 1;
    pointer-events: none;
}

.event-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}

.event-image-content {
    position: absolute;
    left: clamp(20px, 5vw, 42px);
    right: clamp(20px, 5vw, 42px);
    top: clamp(16px, 4vw, 28px);
    bottom: clamp(16px, 4vw, 26px);
    z-index: 2;
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 8px;
}

.event-image-copy {
    max-width: 680px;
}

.date-badge.event-image-date {
    display: block;
    color: rgba(255, 255, 255, 0.86);
    margin-bottom: 4px;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.28);
}

.event-card .event-image-title {
    color: white;
    margin: 0;
    max-width: 680px;
    font-size: clamp(1.36rem, 4.2vw, 1.82rem);
    line-height: 1.08;
    padding-bottom: 0.06em;
    text-shadow: 0 3px 18px rgba(0, 0, 0, 0.38);
}

.event-image-details {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 16px;
    width: min(100%, 680px);
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.34);
}

.event-detail {
    min-width: 0;
}

.event-detail-venue {
    flex: 1 1 260px;
}

.event-detail-label {
    display: block;
    margin-bottom: 2px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 1.7px;
    line-height: 1.2;
    text-transform: uppercase;
}

.event-detail-value {
    display: block;
    color: rgba(255, 255, 255, 0.95);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.28;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.26);
}

.event-detail-venue .event-detail-value {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}

.event-directions {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 22px;
    padding: 0 0 2px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.54);
    color: white;
    text-decoration: none;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 1.7px;
    text-transform: uppercase;
    transition: border-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
}

.event-directions svg {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
}

.event-directions:hover {
    color: var(--gold-leaf);
    border-color: var(--gold-leaf);
}

.event-heading {
    margin-bottom: 8px;
}

.event-heading-details {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: -2px 0 18px;
    padding: 12px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(237, 213, 200, 0.55), rgba(237, 232, 245, 0.72));
    color: var(--matcha-leaf);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
}

.event-heading-details span,
.event-heading-details a {
    color: inherit;
    text-decoration: none;
    opacity: 0.82;
}

.event-description {
    margin-bottom: 18px;
    font-size: 0.98rem;
    font-weight: 300;
    line-height: 1.7;
    opacity: 0.85;
}

.event-card:hover .event-image {
    transform: scale(1.04);
}

@media (max-width: 640px) {
    .event-image-wrap {
        height: auto;
        min-height: 0;
    }

    .event-image {
        position: absolute;
        inset: 0;
    }

    .event-image-content {
        position: relative;
        left: auto;
        right: auto;
        top: auto;
        bottom: auto;
        min-height: 255px;
        padding: 18px;
        box-sizing: border-box;
        gap: 8px;
    }

    .event-card .event-image-title {
        font-size: clamp(1.28rem, 7vw, 1.62rem);
        line-height: 1.12;
    }

    .event-image-details {
        align-items: flex-start;
        gap: 7px 14px;
        padding-top: 8px;
    }

    .event-detail {
        flex: 1 1 108px;
    }

    .event-detail-venue {
        flex-basis: 100%;
    }

    .event-detail-venue .event-detail-value {
        -webkit-line-clamp: 3;
    }

    .event-detail-value {
        font-size: 0.76rem;
    }
}

@media (min-width: 768px) {
    .event-image-wrap {
        height: 265px;
        border-radius: 36px;
    }
}

.date-badge {
    font-size: 0.7rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--matcha-leaf);
    margin-bottom: 15px;
    display: block;
    font-weight: 700;
}

.event-card .hero-title {
    font-size: clamp(1.6rem, 6vw, 2.2rem);
    margin-bottom: 15px;
}

.event-card .event-image-title {
    font-size: clamp(1.36rem, 4.2vw, 1.82rem);
    line-height: 1.08;
    margin-bottom: 0;
}

.empty-state {
    text-align: center;
    opacity: 0.5;
    margin-top: 50px;
    padding: 0 20px;
    font-size: 0.95rem;
    line-height: 1.7;
}

.loading-copy {
    margin: 16px 0 18px;
    color: var(--matcha-leaf);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    opacity: 0.58;
}

@media (min-width: 768px) {
    .event-card { border-radius: 50px; margin-bottom: 50px; }
}

/* --- ATTENDEES SECTION --- */
.attendees-section {
    margin-top: 30px;
    padding-top: 30px;
    border-top: 1px solid rgba(107, 122, 104, 0.1);
}

.signup-intro {
    margin-bottom: 16px;
    padding: 22px;
    border-radius: 22px;
    background: linear-gradient(135deg, rgba(237, 213, 200, 0.42), rgba(237, 232, 245, 0.62));
    box-shadow: inset 0 3px 0 var(--gold-leaf);
}

.signup-intro h3 {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    color: var(--matcha-leaf);
    font-size: 1.2rem;
    margin: 0 0 8px;
}

.signup-intro p {
    margin: 0;
    max-width: 620px;
    font-size: 0.9rem;
    line-height: 1.75;
    opacity: 0.82;
}

.attendees-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 20px;
}

.attendees-title {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 1.1rem;
    color: var(--matcha-leaf);
    margin: 0;
}

.attendees-stats {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.stat-pill {
    background: var(--lavender-mist);
    border-radius: 20px;
    padding: 6px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
}

.stat-num {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--matcha-leaf);
}

.stat-lbl {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    opacity: 0.6;
}

/* --- ATTENDEES NOTICE --- */
.attendees-notice {
    margin-bottom: 16px;
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(201, 190, 239, 0.18), rgba(237, 213, 200, 0.18));
    border-left: 3px solid var(--gold-leaf);
    border-radius: 12px;
    font-size: 0.82rem;
    line-height: 1.7;
    opacity: 0.85;
}

.notice-intro {
    margin: 0 0 10px;
    font-style: italic;
    opacity: 0.75;
}

.attendees-notice ul {
    margin: 0;
    padding-left: 18px;
}

.attendees-notice li {
    margin-bottom: 4px;
}

.attendees-notice li:last-child { margin-bottom: 0; }

/* --- ATTENDEES TABLE --- */
.attendees-table-wrap {
    overflow-x: auto;
    border-radius: 16px;
    border: 1px solid rgba(201, 190, 239, 0.25);
}

.attendees-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    table-layout: fixed;
}

.th-sub {
    display: block;
    font-size: 0.55rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.6;
    font-weight: 500;
    margin-top: 2px;
    color: #b05070;
}

.stat-pill-min {
    background: linear-gradient(135deg, var(--rose-dust), var(--blush-petal));
    border: 1px solid rgba(176, 80, 112, 0.15);
}

.stat-pill-min .stat-num {
    color: #b05070;
}

.attendees-table th:nth-child(2),
.attendees-table td:nth-child(2) { width: 95px; }
.attendees-table th:nth-child(3),
.attendees-table td:nth-child(3) { width: 80px; }
.attendees-table th:nth-child(6),
.attendees-table td:nth-child(6) { width: 36px; }

.attendees-table thead tr {
    background: linear-gradient(135deg, var(--rose-dust), var(--lavender-mist));
}

.attendees-table th {
    padding: 10px 12px;
    text-align: center;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 1.8px;
    font-weight: 700;
    color: var(--matcha-leaf);
    opacity: 0.8;
    position: relative;
    cursor: help;
}

.tooltip-fixed {
    position: fixed;
    transform: translate(-50%, -100%);
    background: rgba(60, 55, 50, 0.92);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0.2px;
    line-height: 1.55;
    padding: 9px 13px;
    border-radius: 10px;
    width: 210px;
    text-align: left;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
}

.name-autocomplete {
    position: fixed;
    z-index: 9999;
    max-width: calc(100vw - 28px);
    max-height: min(280px, calc(100vh - 28px));
    overflow-y: auto;
    border: 1px solid rgba(107, 122, 104, 0.16);
    border-radius: 12px;
    background: var(--white-pure);
    box-shadow: 0 12px 34px rgba(74, 68, 63, 0.16);
    padding: 6px;
    box-sizing: border-box;
}

.name-autocomplete-option {
    display: block;
    width: 100%;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--clay-text);
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 1.35;
    text-align: left;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
    padding: 8px 10px;
    cursor: pointer;
}

.name-autocomplete-option:hover,
.name-autocomplete-option:focus {
    background: rgba(201, 190, 239, 0.22);
    color: var(--matcha-leaf);
    outline: none;
}

.attendees-table td {
    padding: 4px 6px;
    border-top: 1px solid rgba(201, 190, 239, 0.18);
    word-break: break-word;
    overflow-wrap: break-word;
}

.attendees-table tbody tr:hover {
    background: rgba(201, 190, 239, 0.07);
}

.attendees-table tbody tr.new-row {
    background: rgba(107, 122, 104, 0.05);
}

.cell-input {
    width: 100%;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: 0.88rem;
    color: inherit;
    padding: 6px 6px;
    border-radius: 6px;
    outline: none;
    transition: background 0.2s;
    box-sizing: border-box;
}

.cell-input:focus {
    background: rgba(201, 190, 239, 0.2);
}

.cell-input[readonly],
.card-name-input[readonly],
.card-value-input[readonly] {
    cursor: default;
    opacity: 0.76;
}

.cell-input[readonly]:focus,
.card-name-input[readonly]:focus,
.card-value-input[readonly]:focus {
    background: transparent;
}

.input-error {
    background: rgba(176, 80, 112, 0.08) !important;
    outline: 1px solid rgba(176, 80, 112, 0.5) !important;
    border-radius: 6px;
}

.cell-area {
    resize: none;
    overflow: hidden;
    line-height: 1.5;
    min-height: 1.5em;
}

.cell-number { text-align: right; }

.td-delete {
    width: 36px;
    text-align: center;
    padding: 4px 4px;
}

.btn-delete {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--matcha-leaf);
    opacity: 0.25;
    font-size: 0.75rem;
    padding: 4px 6px;
    border-radius: 6px;
    transition: opacity 0.2s, color 0.2s;
}

.btn-delete:hover {
    opacity: 1;
    color: #b05070;
}

/* --- ACTIONS --- */
.attendees-actions {
    margin-top: 14px;
    margin-bottom: 16px;
    display: flex;
    gap: 10px;
}

.attendees-actions-primary {
    margin-top: 0;
    margin-bottom: 22px;
}

.btn-add, .btn-save, .btn-cancel {
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    border: none;
    border-radius: 20px;
    padding: 8px 20px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;
}

.btn-add {
    background: var(--lavender-mist);
    color: var(--matcha-leaf);
}

.attendees-actions-primary .btn-add {
    background: var(--matcha-leaf);
    color: white;
}

.btn-save {
    background: var(--matcha-leaf);
    color: white;
}

.btn-cancel {
    background: transparent;
    color: inherit;
    opacity: 0.5;
}

.btn-add:hover, .btn-save:hover { opacity: 0.85; transform: translateY(-1px); }
.btn-cancel:hover { opacity: 0.8; }

/* --- MOBILE CARDS --- */
.attendees-cards { display: none; }

@media (max-width: 767px) {
    .attendees-table-wrap { display: none; }
    .attendees-cards {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
    }
}

.attendee-card {
    background: var(--rose-dust);
    border-radius: 16px;
    padding: 16px 18px;
    box-shadow: inset 0 2px 0 var(--gold-leaf);
}

.attendee-card.new-card {
    background: var(--lavender-mist);
    box-shadow: inset 0 2px 0 var(--lavender-mid);
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    gap: 8px;
}

.card-name-input {
    flex: 1;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: 1rem;
    font-weight: 700;
    color: inherit;
    outline: none;
    padding: 2px 4px;
    border-radius: 6px;
    transition: background 0.2s;
}

.card-name-input:focus { background: rgba(255,255,255,0.5); }
.card-name-input::placeholder { opacity: 0.4; font-weight: 400; }

.card-field {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
    min-height: 32px;
}

.card-field:last-child { margin-bottom: 0; }

.card-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 1.8px;
    font-weight: 700;
    color: var(--matcha-leaf);
    opacity: 0.65;
    min-width: 64px;
    padding-top: 7px;
}

.card-value-input {
    flex: 1;
    border: none;
    background: rgba(255,255,255,0.45);
    font-family: inherit;
    font-size: 0.88rem;
    color: inherit;
    padding: 6px 10px;
    border-radius: 8px;
    outline: none;
    transition: background 0.2s;
    width: 0;
    box-sizing: border-box;
}

.card-value-input:focus { background: rgba(255,255,255,0.75); }
.card-value-input.card-area { resize: none; overflow: hidden; line-height: 1.5; word-break: break-word; overflow-wrap: break-word; }

/* --- DELETE MODAL --- */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(74, 68, 63, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

.modal-box {
    background: var(--white-pure);
    border-radius: 28px;
    padding: 36px 40px;
    box-shadow: inset 0 3px 0 #b05070, 0 24px 60px rgba(160, 80, 110, 0.18);
    max-width: 360px;
    width: 90%;
    text-align: center;
}

.modal-msg {
    font-size: 1rem;
    line-height: 1.7;
    margin: 0 0 28px;
    opacity: 0.85;
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
}

.btn-modal-cancel, .btn-modal-delete {
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    border: none;
    border-radius: 20px;
    padding: 10px 24px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;
}

.btn-modal-cancel {
    background: var(--lavender-mist);
    color: var(--matcha-leaf);
}

.btn-modal-delete {
    background: #b05070;
    color: white;
}

.btn-modal-cancel:hover, .btn-modal-delete:hover { opacity: 0.85; transform: translateY(-1px); }

/* --- TOAST NOTIFICATIONS --- */
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
}

.toast {
    background: var(--matcha-leaf);
    color: white;
    padding: 10px 18px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    animation: toastIn 0.25s ease;
}

@keyframes toastIn {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
}
</style>
