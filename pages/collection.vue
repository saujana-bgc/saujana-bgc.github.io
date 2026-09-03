<template>
  <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
    <header class="fade-up">
      <h1 class="hero-title">Collection</h1>
      <div class="stats-container">
        <span style="font-family: 'Playfair Display', serif; font-style: italic; font-weight: 700; color: var(--matcha-leaf);">{{ totalGames }}</span> games on the shelf.
        <div style="font-size: 0.85rem; margin-top: 10px;">
          <span style="font-weight: 700; color: #a67c52;">{{ unplayedCount }}</span> unplayed.
        </div>
        <div style="font-size: 0.65rem; color: var(--matcha-leaf); text-transform: uppercase; letter-spacing: 2px; margin-top: 15px; font-weight: 700; opacity: 0.6;">
          Updated: {{ lastTended }}
        </div>
      </div>
    </header>

    <main style="width: 100%; display: flex; flex-direction: column; align-items: center;">
      <section class="collection-invite fade-up">
        <h2>Browse the shelf</h2>
        <p>Explore the host's collection, find familiar names, and spot games that have not been played yet.</p>
      </section>

      <div class="collection-search fade-up">
        <input
          v-model="search"
          class="collection-search-input"
          type="search"
          placeholder="Search titles, categories, players, or designers..."
          aria-label="Search collection"
        />
        <button v-if="search" class="collection-search-clear" type="button" @click="search = ''">Clear</button>
      </div>

<div class="sort-controls fade-up">
        <button class="sort-btn" :class="{ active: currentSort === 'name' }" @click="[currentSort = 'name', resetCategories()]">A to Z</button>
        <button class="sort-btn" :class="{ active: currentSort === 'played' }" @click="[currentSort = 'played', resetCategories()]">Recently played</button>
        <button class="sort-btn surprise" :class="{ active: currentSort === 'surprise' }" @click="[generateSurprise(), resetCategories()]">Unplayed</button>
        <button class="sort-btn" :class="{ active: selectedCategories.includes('Card Game') }" @click="[selectedCategories = selectedCategories.includes('Card Game') ? [] : ['Card Game'], resetSort()]">Card Game</button>
        <button class="sort-btn" :class="{ active: selectedCategories.includes('Deduction') }" @click="[selectedCategories = selectedCategories.includes('Deduction') ? [] : ['Deduction'], resetSort()]">Deduction</button>
        <button class="sort-btn" :class="{ active: selectedCategories.includes('Animals') }" @click="[selectedCategories = selectedCategories.includes('Animals') ? [] : ['Animals'], resetSort()]">Animals</button>
        <button class="sort-btn" :class="{ active: selectedCategories.includes('Party Game') }" @click="[selectedCategories = selectedCategories.includes('Party Game') ? [] : ['Party Game'], resetSort()]">Party Game</button>
        <button class="sort-btn" :class="{ active: selectedCategories.includes('Bluffing') }" @click="[selectedCategories = selectedCategories.includes('Bluffing') ? [] : ['Bluffing'], resetSort()]">Bluffing</button>
      </div>

      <div v-if="isError" style="font-size: 0.8rem; opacity: 0.5; margin: 10px 0 30px;">Play stats could not load. Showing the collection only.</div>

      <div v-if="isPending" class="editorial-grid">
        <div class="loading-copy">Checking the shelves...</div>
        <article class="editorial-card" v-for="n in 8" :key="'skel-'+n" style="pointer-events: none;">
          <div class="skel" style="height: 50px; margin-bottom: 18px;"></div>
          <div style="width: 100%; aspect-ratio: 1/1; margin: 18px 0; border-radius: 20px; overflow: hidden;">
            <div class="skel" style="width: 100%; height: 100%; margin: 0; border-radius: 0;"></div>
          </div>
          <div class="skel" style="width: 70%; height: 12px; margin-bottom: 8px;"></div>
          <div class="skel" style="width: 50%; height: 12px; margin-bottom: 0;"></div>
        </article>
      </div>

      <div v-else ref="gridRef" class="editorial-grid">
        <div v-if="topSpacerHeight > 0" class="grid-spacer" :style="{ height: topSpacerHeight + 'px' }"></div>

        <article v-for="game in virtualGames" :key="game.name" class="editorial-card">
          <div class="card-game-title">{{ game.name }}</div>

          <div class="pebble-container" @click="openModal(game)">
            <img
              :src="'/' + game.img"
              :alt="game.name"
              width="400"
              height="400"
              loading="lazy"
              decoding="async"
              @error="handleImgError"
            >
          </div>

          <div class="card-meta">
            {{ game.categories ? game.categories.join(' • ') : 'BOARD GAME' }}
          </div>

          <div class="card-players">
            {{ game.players }} • Weight: {{ game.weight || 'N/A' }}
          </div>

          <div class="last-played">
            <div>
              <span v-if="game.stats.date">Last played {{ formatDate(game.stats.date) }}</span>
              <span v-else style="opacity: 0.4; font-style: italic;">Not played yet</span>
            </div>
            <div style="margin-top: 6px; opacity: 0.65;">
              Plays logged: {{ game.stats.count }}
            </div>
          </div>
        </article>

        <div v-if="bottomSpacerHeight > 0" class="grid-spacer" :style="{ height: bottomSpacerHeight + 'px' }"></div>
      </div>

      <div v-if="!isPending && displayedGames.length === 0" class="collection-empty">
        No games found for "{{ search.trim() }}".
      </div>
    </main>

    <div v-if="selectedGame" class="modal" @click="closeModal">
      <div class="modal-container" @click.stop>
        <div style="width: 40px; height: 5px; background: #e0e0e0; border-radius: 10px; margin: 15px auto 0; display: block;" class="mobile-handle"></div>
        <button @click="closeModal" style="position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 2.5rem; color: var(--matcha-leaf); cursor: pointer; line-height: 1;">&times;</button>

        <div class="modal-content">
          <div style="text-align: center;">
            <img
              :src="'/' + selectedGame.img"
              :alt="selectedGame.name"
              class="modal-game-image"
              width="400"
              height="400"
              decoding="async"
              @error="handleImgError"
            >
            <div style="margin-top: 25px; font-size: 0.75rem; font-weight: 700; color: var(--matcha-leaf); text-transform: uppercase; letter-spacing: 2px;">
              {{ selectedGame.players }} • Weight {{ selectedGame.weight }}
            </div>
          </div>
          <div style="text-align: left;">
            <h2 class="hero-title" style="font-size: clamp(1.8rem, 6vw, 2.5rem); margin-bottom: 5px;">{{ selectedGame.name }}</h2>
            <div v-if="selectedGame.designers && selectedGame.designers.length" style="font-style: italic; opacity: 0.6; margin: 10px 0 25px; font-family: 'Playfair Display', serif; font-size: 1.1rem;">
              Designed by {{ selectedGame.designers.join(', ') }}
            </div>
            <div style="font-size: 0.95rem; line-height: 1.8; font-weight: 300; opacity: 0.9; white-space: pre-wrap;" v-html="selectedGame.description"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { collectionDataSimple } from '~/assets/data/game_data_simple.js'

const currentSort = ref('name')
const search = ref('')
const selectedCategories = ref([])
function resetSort() { currentSort.value = null }
function resetCategories() { selectedCategories.value = [] }
const selectedGame = ref(null)
const surpriseGames = ref([])
const gridRef = ref(null)
const gridTop = ref(0)
const scrollY = ref(0)
const viewportHeight = ref(0)
const viewportWidth = ref(0)

const { data: rawRows, isPending, isError } = usePlaylogData()

const stripTrailingEmoji = (str) => {
    if (!str) return str
    return str.replace(/[\p{Extended_Pictographic}️]+$/gu, '').trim()
}

function formatDate(isoDate) {
    if (!isoDate) return null
    const [year, month, day] = isoDate.split('-')
    const d = new Date(year, month - 1, day)
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${year}`
}

const playStats = computed(() => {
    const stats = {}
    for (const row of (rawRows.value ?? [])) {
        if (!stats[row.game]) stats[row.game] = { date: row.date, count: 0 }
        stats[row.game].count++
        if (row.date > stats[row.game].date) stats[row.game].date = row.date
    }
    return stats
})

const getStats = (gameName) => {
    const key = stripTrailingEmoji(gameName)
    return playStats.value[key] ?? { date: null, count: 0 }
}

const gamesWithStats = computed(() => {
    if (!collectionDataSimple) return []
    return collectionDataSimple.games.map(game => ({
        ...game,
        stats: getStats(game.name)
    }))
})

const normalizedSearch = computed(() => search.value.trim().toLowerCase())

function gameSearchText(game) {
    return [
        game.name,
        game.players,
        game.weight,
        ...(game.categories ?? []),
        ...(game.designers ?? []),
    ].filter(Boolean).join(' ').toLowerCase()
}

const displayedGames = computed(() => {
    let list = currentSort.value === 'surprise'
        ? [...surpriseGames.value]
        : [...gamesWithStats.value]

    const query = normalizedSearch.value
    if (query) list = list.filter(game => gameSearchText(game).includes(query))

    const cats = selectedCategories.value
    if (cats.length) list = list.filter(game => cats.some(c => game.categories?.includes(c)))

    if (currentSort.value === 'surprise') return list

    if (currentSort.value === 'name' || currentSort.value === null) {
        list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (currentSort.value === 'played') {
        list.sort((a, b) => {
            if (a.stats.date !== b.stats.date) return (b.stats.date ?? '') > (a.stats.date ?? '') ? 1 : -1
            return a.name.localeCompare(b.name)
        })
    }
    return list
})

const gridGap = computed(() => viewportWidth.value >= 768 ? 30 : 16)
const virtualCardHeight = computed(() => viewportWidth.value >= 768 ? 520 : 430)
const virtualRowHeight = computed(() => virtualCardHeight.value + gridGap.value)
const virtualColumns = computed(() => {
    if (viewportWidth.value < 768) return 2
    const containerWidth = Math.min(viewportWidth.value * 0.92, 1400)
    return Math.max(1, Math.floor((containerWidth + gridGap.value) / (200 + gridGap.value)))
})

const virtualState = computed(() => {
    const totalRows = Math.ceil(displayedGames.value.length / virtualColumns.value)
    const offsetY = Math.max(0, scrollY.value - gridTop.value)
    const overscan = 3
    const visibleRows = Math.ceil(viewportHeight.value / virtualRowHeight.value) + overscan * 2
    const maxFirstRow = Math.max(0, totalRows - visibleRows)
    const firstRow = Math.min(maxFirstRow, Math.max(0, Math.floor(offsetY / virtualRowHeight.value) - overscan))
    const lastRow = Math.min(totalRows, firstRow + visibleRows)
    const start = firstRow * virtualColumns.value
    const end = Math.min(displayedGames.value.length, lastRow * virtualColumns.value)

    return {
        firstRow,
        totalRows,
        start,
        end,
        renderedRows: Math.max(0, lastRow - firstRow),
    }
})

const virtualGames = computed(() => displayedGames.value.slice(virtualState.value.start, virtualState.value.end))
const topSpacerHeight = computed(() => virtualState.value.firstRow * virtualRowHeight.value)
const bottomSpacerHeight = computed(() => {
    const remainingRows = virtualState.value.totalRows - virtualState.value.firstRow - virtualState.value.renderedRows
    return Math.max(0, remainingRows * virtualRowHeight.value)
})

const totalGames = computed(() => collectionDataSimple?.total || 0)
const unplayedCount = computed(() => gamesWithStats.value.filter(g => g.stats.count === 0).length)
const lastTended = computed(() => collectionDataSimple?.date || '--')

const generateSurprise = () => {
    const unplayed = gamesWithStats.value.filter(g => g.stats.count === 0)
    if (unplayed.length === 0) { alert("Every game has been played."); return }
    surpriseGames.value = unplayed.sort((a, b) => a.name.localeCompare(b.name))
    currentSort.value = 'surprise'
}

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f7e9e6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='13' fill='%236b7a68' opacity='0.5'%3EAwaiting Visual%3C/text%3E%3C/svg%3E"

let fullCollectionData = null

async function getFullGame(gameName) {
    if (!fullCollectionData) {
        const module = await import('~/assets/data/game_data.js')
        fullCollectionData = module.collectionData
    }
    return fullCollectionData.games.find(game => game.name === gameName)
}

const openModal = async (game) => {
    selectedGame.value = { ...game, description: '' }
    document.body.style.overflow = 'hidden'

    const fullGame = await getFullGame(game.name)
    if (selectedGame.value?.name === game.name) {
        selectedGame.value = {
            ...game,
            ...fullGame,
            stats: game.stats,
        }
    }
}
const closeModal = () => { selectedGame.value = null; document.body.style.overflow = '' }
const handleImgError = (e) => { e.target.src = FALLBACK_IMG }

let rafId = 0
let resizeObserver = null

function onKeydown(e) { if (e.key === 'Escape') closeModal() }

function measureGridTop() {
    if (!gridRef.value) return
    gridTop.value = gridRef.value.getBoundingClientRect().top + window.scrollY
}

function updateViewport({ measure = false } = {}) {
    if (measure) measureGridTop()
    scrollY.value = window.scrollY
    viewportHeight.value = window.innerHeight
    viewportWidth.value = window.innerWidth
}

function scheduleViewportUpdate(options) {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
        rafId = 0
        updateViewport(options)
    })
}

function onResize() {
    scheduleViewportUpdate({ measure: true })
}

watch(gridRef, (grid) => {
    if (!grid) return
    nextTick(() => {
        updateViewport({ measure: true })
        resizeObserver?.observe(grid)
    })
})

onMounted(() => {
    nextTick(() => updateViewport({ measure: true }))
    document.addEventListener('keydown', onKeydown)
    window.addEventListener('scroll', scheduleViewportUpdate, { passive: true })
    window.addEventListener('resize', onResize)
    if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => scheduleViewportUpdate({ measure: true }))
        if (gridRef.value) resizeObserver.observe(gridRef.value)
    }
})
onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId)
    resizeObserver?.disconnect()
    document.removeEventListener('keydown', onKeydown)
    window.removeEventListener('scroll', scheduleViewportUpdate)
    window.removeEventListener('resize', onResize)
    document.body.style.overflow = ''
})

watch([search, currentSort, selectedCategories], () => {
    nextTick(() => updateViewport({ measure: true }))
})
</script>

<style scoped>
.collection-invite {
    width: 90%;
    max-width: 760px;
    margin: 0 auto 28px;
    padding: 24px;
    border-radius: 28px;
    background: var(--white-pure);
    border: 1px solid rgba(201, 190, 239, 0.12);
    box-shadow: inset 0 3px 0 var(--gold-leaf), 0 12px 32px rgba(160, 100, 110, 0.08);
    text-align: center;
    box-sizing: border-box;
}

.collection-invite h2 {
    margin: 0 0 8px;
    color: var(--matcha-leaf);
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-weight: 400;
    font-size: 1.45rem;
}

.collection-invite p {
    margin: 0 auto;
    max-width: 580px;
    font-size: 0.9rem;
    line-height: 1.75;
    opacity: 0.82;
}

.collection-search {
    width: 90%;
    max-width: 720px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 auto 16px;
}

.collection-search-input {
    width: 100%;
    border: 1px solid rgba(107, 122, 104, 0.2);
    background: var(--white-pure);
    color: inherit;
    font-family: inherit;
    font-size: 0.88rem;
    padding: 13px 18px;
    border-radius: 40px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.collection-search-input:focus {
    border-color: var(--matcha-leaf);
    box-shadow: 0 0 0 3px rgba(107, 122, 104, 0.1);
}

.collection-search-clear {
    border: none;
    border-radius: 40px;
    background: var(--lavender-mist);
    color: var(--matcha-leaf);
    cursor: pointer;
    flex-shrink: 0;
    font-family: inherit;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 1.2px;
    padding: 12px 16px;
    text-transform: uppercase;
    transition: opacity 0.2s, transform 0.2s;
}

.collection-search-clear:hover {
    opacity: 0.85;
    transform: translateY(-1px);
}

.loading-copy {
    grid-column: 1 / -1;
    color: var(--matcha-leaf);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-align: center;
    text-transform: uppercase;
    opacity: 0.58;
}

.collection-empty {
    color: var(--matcha-leaf);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 1.6px;
    margin: 20px 0 70px;
    opacity: 0.56;
    text-align: center;
    text-transform: uppercase;
}

/* --- SORT CONTROLS --- */
.sort-controls {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 10px; margin-bottom: 40px; width: 90%; max-width: 600px;
}

.sort-btn {
    background: var(--white-pure); border: 1px solid rgba(107, 122, 104, 0.15);
    padding: 10px 12px; border-radius: 40px; font-size: 0.7rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px; color: var(--matcha-leaf);
    cursor: pointer; transition: background 0.3s, color 0.3s, border-color 0.3s, transform 0.2s, box-shadow 0.3s;
    text-align: center;
}

.sort-btn:hover {
    border-color: var(--matcha-leaf);
    transform: translateY(-2px);
    box-shadow: 0 5px 14px var(--pebble-shadow);
}

.sort-btn.active { background: var(--matcha-leaf); color: white; border-color: var(--matcha-leaf); }

/* --- THE EDITORIAL GRID --- */
.editorial-grid {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 16px; width: 92%; max-width: 1400px; padding: 20px 0 80px;
}

.grid-spacer {
    grid-column: 1 / -1;
    pointer-events: none;
}

.editorial-card {
    background: var(--white-pure); padding: 16px; border-radius: 20px;
    text-align: center;
    box-shadow: inset 0 3px 0 var(--gold-leaf), 0 15px 35px rgba(160, 100, 110, 0.09);
    border: 1px solid rgba(201, 190, 239, 0.1);
    display: flex; flex-direction: column; transition: transform 0.35s ease, box-shadow 0.35s ease;
    box-sizing: border-box; min-width: 0; height: 430px;
}

.editorial-card:hover {
    transform: translateY(-5px);
    box-shadow: inset 0 3px 0 var(--gold-leaf), 0 25px 55px rgba(160, 100, 120, 0.14);
}

.card-game-title {
    font-weight: 700;
    font-size: 1.05rem;
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1.3;
}

.card-meta {
    font-size: 0.68rem;
    opacity: 0.45;
    margin-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.card-players {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--gold-leaf);
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.pebble-container {
    cursor: pointer; border-radius: 20px; overflow: hidden; margin: 18px 0;
    background: #fcfcfc; width: 100%; aspect-ratio: 1 / 1;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(107, 122, 104, 0.06);
    transition: box-shadow 0.35s;
    padding: 10px;
    box-sizing: border-box;
}

.pebble-container:hover { box-shadow: 0 8px 24px var(--pebble-shadow); }

.pebble-container img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: transform 0.5s ease;
}

.editorial-card:hover .pebble-container img { transform: scale(1.03); }

.last-played {
    font-size: 0.65rem; color: var(--matcha-leaf); text-transform: uppercase;
    letter-spacing: 1.5px; margin-top: auto; border-top: 1px solid rgba(107, 122, 104, 0.1);
    padding-top: 18px; font-weight: 700;
}

/* --- MODAL --- */
.modal {
    position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%;
    background: rgba(74, 68, 63, 0.65);
    display: flex; justify-content: center; align-items: flex-end;
    animation: fadeSlideUp 0.3s ease;
}

.modal-container {
    background: var(--white-pure); width: 100%; max-height: 90vh;
    border-radius: 40px 40px 0 0; overflow-y: auto; position: relative;
    box-shadow: 0 -10px 50px rgba(0,0,0,0.12); padding-bottom: 40px;
}

.modal-content {
    display: grid; grid-template-columns: 1fr; padding: 30px; gap: 30px;
}

.modal-game-image {
    width: 80%;
    max-width: 300px;
    aspect-ratio: 1 / 1;
    height: auto;
    object-fit: contain;
    border-radius: 25px;
    box-shadow: 0 15px 40px var(--pebble-shadow);
}

@media (min-width: 768px) {
    .editorial-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 30px; }
    .modal { align-items: center; padding: 40px; }
    .modal-container { width: 95%; max-width: 900px; border-radius: 50px; }
    .modal-content { grid-template-columns: 1fr 1.2fr; padding: 50px; gap: 50px; }
    .editorial-card { padding: 40px; border-radius: 40px; height: 520px; }
    .sort-btn { padding: 12px 28px; font-size: 0.72rem; }
}
</style>
