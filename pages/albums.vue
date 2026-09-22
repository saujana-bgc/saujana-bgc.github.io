<template>
  <div class="albums-page">
    <header class="fade-up">
      <h1 class="hero-title">Albums</h1>
      <div class="stats-container">Snapshots from the tables, gathered by day.</div>
    </header>

    <main class="albums-main">
      <template v-if="loading">
        <div class="loading-copy">Loading albums...</div>
        <section v-for="n in 2" :key="n" class="album-day-card album-skeleton">
          <div class="skel" style="width: 180px; height: 22px;"></div>
          <div class="album-grid">
            <div v-for="photo in 6" :key="photo" class="skel album-skeleton-photo"></div>
          </div>
        </section>
      </template>

      <template v-else-if="errorMessage">
        <div class="empty-state albums-message">
          <p>{{ errorMessage }}</p>
          <button class="page-btn" type="button" @click="loadAlbums">Try again</button>
        </div>
      </template>

      <template v-else-if="pagedPhotos.length">
        <section
          v-for="(day, index) in pagedDays"
          :key="day.key"
          class="album-day-card fade-up"
          :style="{ animationDelay: Math.min(index * 0.06, 0.35) + 's' }"
        >
          <div class="album-day-heading">
            <h2>{{ day.label }}</h2>
            <span>{{ day.photos.length }} {{ day.photos.length === 1 ? 'photo' : 'photos' }}</span>
          </div>

          <div class="album-grid">
            <button
              v-for="photo in day.photos"
              :key="photo.path"
              type="button"
              class="album-photo"
              :aria-label="`View ${photo.alt}`"
              @click="openLightbox(photo)"
            >
              <img :src="photo.thumbnailUrl" :alt="photo.alt" loading="lazy" decoding="async">
            </button>
          </div>
        </section>

        <div v-if="totalPages > 1" class="pagination" aria-label="Album pages">
          <button class="page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">Prev</button>
          <button
            v-for="page in totalPages"
            :key="page"
            class="page-btn"
            :class="{ active: page === currentPage }"
            :aria-current="page === currentPage ? 'page' : undefined"
            @click="goToPage(page)"
          >{{ page }}</button>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">Next</button>
        </div>
      </template>

      <div v-else class="empty-state albums-message">
        <p>No photos have been added to the albums yet.</p>
      </div>
    </main>

    <Teleport to="body">
      <div
        v-if="lightboxPhoto"
        ref="lightboxRef"
        class="album-lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="lightboxPhoto.alt"
        tabindex="-1"
        @click.self="closeLightbox"
        @keydown.esc="closeLightbox"
      >
        <button type="button" class="lightbox-close" aria-label="Close photo viewer" @click="closeLightbox">&times;</button>
        <img class="lightbox-image" :src="lightboxPhoto.url" :alt="lightboxPhoto.alt">
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const BUCKET = 'albums'
const LIST_LIMIT = 1000
const PAGE_SIZE = 24

useHead({ title: 'Albums · Saujana Board Game Community' })

const supabase = useSupabase()
const loading = ref(true)
const errorMessage = ref('')
const photos = ref([])
const currentPage = ref(1)
const lightboxPhoto = ref(null)
const lightboxRef = ref(null)

const pagedPhotos = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return photos.value.slice(start, start + PAGE_SIZE)
})

const totalPages = computed(() => Math.ceil(photos.value.length / PAGE_SIZE))

const pagedDays = computed(() => {
  const byDate = new Map()

  for (const photo of pagedPhotos.value) {
    if (!byDate.has(photo.dateKey)) {
      byDate.set(photo.dateKey, { key: photo.dateKey, label: photo.displayDate, photos: [] })
    }
    byDate.get(photo.dateKey).photos.push(photo)
  }

  return [...byDate.values()]
})

function isPhoto(file) {
  const mimeType = String(file.metadata?.mimetype ?? '').toLowerCase()
  return mimeType.startsWith('image/') || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name ?? '')
}

function isThumbnail(file) {
  return /-thumb\.[^.]+$/i.test(file.name ?? '')
}

function thumbnailPathFor(path) {
  const slashIndex = path.lastIndexOf('/')
  const directory = slashIndex >= 0 ? path.slice(0, slashIndex + 1) : ''
  const filename = path.slice(slashIndex + 1)
  const stem = filename.replace(/\.[^.]+$/, '')
  return `${directory}${stem}-thumb.webp`
}

function fileDate(file) {
  const value = file.created_at ?? file.updated_at ?? file.last_accessed_at
  const date = value ? new Date(value) : new Date(0)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function listFolder(prefix = '') {
  const files = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase.listFiles(BUCKET, {
      prefix,
      limit: LIST_LIMIT,
      offset,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (error) throw new Error(error)
    const entries = Array.isArray(data) ? data : []

    for (const entry of entries) {
      const path = `${prefix}${entry.name}`
      if (entry.id == null) {
        files.push(...await listFolder(path.endsWith('/') ? path : `${path}/`))
      } else {
        files.push({ ...entry, path })
      }
    }

    if (entries.length < LIST_LIMIT) break
    offset += entries.length
  }

  return files
}

async function loadAlbums() {
  loading.value = true
  errorMessage.value = ''

  try {
    const files = await listFolder()
    const availablePaths = new Set(files.map((file) => file.path))

    photos.value = files
      .filter((file) => isPhoto(file) && !isThumbnail(file))
      .map((file) => {
        const date = fileDate(file)
        const thumbnailPath = thumbnailPathFor(file.path)
        return {
          path: file.path,
          url: supabase.getPublicUrl(BUCKET, file.path),
          thumbnailUrl: availablePaths.has(thumbnailPath)
            ? supabase.getPublicUrl(BUCKET, thumbnailPath)
            : supabase.getPublicUrl(BUCKET, file.path),
          alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || 'Album photo',
          dateKey: localDateKey(date),
          displayDate: formatDate(date),
          timestamp: date.getTime(),
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp || a.path.localeCompare(b.path))
    currentPage.value = 1
  } catch (error) {
    console.error('Unable to load album photos:', error)
    errorMessage.value = 'The album photos could not be loaded right now.'
  } finally {
    loading.value = false
  }
}

function goToPage(page) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function openLightbox(photo) {
  lightboxPhoto.value = photo
  await nextTick()
  lightboxRef.value?.focus()
}

function closeLightbox() {
  lightboxPhoto.value = null
}

watch(lightboxPhoto, (photo) => {
  if (!import.meta.client) return
  document.body.style.overflow = photo ? 'hidden' : ''
})

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

onMounted(loadAlbums)
</script>

<style scoped>
.albums-page {
  width: 100%;
}

.albums-main {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.album-day-card {
  width: 90%;
  max-width: 900px;
  box-sizing: border-box;
  margin-bottom: 26px;
  padding: var(--section-pad);
  background: var(--white-pure);
  border: 1px solid rgba(107, 122, 104, 0.06);
  border-top: 3px solid var(--gold-leaf);
  border-radius: 35px;
  box-shadow: 0 15px 40px var(--pebble-shadow);
  text-align: left;
}

.album-day-heading {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
}

.album-day-heading h2 {
  margin: 0;
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.2rem, 5vw, 1.5rem);
  font-style: italic;
  font-weight: 400;
}

.album-day-heading h2::after {
  content: '';
  display: inline-block;
  width: 38px;
  height: 1px;
  margin: 0 0 5px 12px;
  background: linear-gradient(to right, var(--gold-leaf), transparent);
}

.album-day-heading span {
  color: var(--clay-text);
  font-size: 0.65rem;
  letter-spacing: 1px;
  opacity: 0.58;
  text-transform: uppercase;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.album-photo {
  display: block;
  width: 100%;
  border: 0;
  padding: 0;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 14px;
  background: var(--rose-dust);
  cursor: zoom-in;
  font: inherit;
}

.album-photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.album-photo:hover img {
  transform: scale(1.04);
}

.album-lightbox {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 48px 24px 24px;
  background: rgba(36, 39, 34, 0.9);
  cursor: zoom-out;
}

.album-lightbox:focus {
  outline: none;
}

.lightbox-image {
  display: block;
  max-width: min(96vw, 1600px);
  max-height: 88vh;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  object-fit: contain;
  cursor: default;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 20px;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  background: rgba(36, 39, 34, 0.7);
  color: white;
  cursor: pointer;
  font-size: 1.8rem;
  line-height: 1;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.18);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 30px;
}

.page-btn {
  border: 1px solid rgba(107, 122, 104, 0.18);
  border-radius: 40px;
  padding: 8px 14px;
  background: var(--white-pure);
  color: var(--matcha-leaf);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  transition: background 0.25s, color 0.25s, transform 0.2s, box-shadow 0.25s;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--matcha-leaf);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--pebble-shadow);
}

.page-btn.active {
  background: var(--matcha-leaf);
  color: white;
  border-color: var(--matcha-leaf);
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.albums-message {
  margin: 0 auto 35px;
  text-align: center;
}

.albums-message p {
  margin: 0 0 18px;
}

.album-skeleton {
  pointer-events: none;
}

.album-skeleton-photo {
  height: auto;
  aspect-ratio: 1;
  margin: 0;
}

@media (min-width: 768px) {
  .album-day-card { width: 92%; border-radius: 45px; }
  .album-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
