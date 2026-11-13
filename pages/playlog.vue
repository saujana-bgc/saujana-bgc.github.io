<template>
  <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
    <header class="page-intro fade-up">
      <p class="page-eyebrow">Board Games</p>
      <h1 class="hero-title">Play History</h1>
      <div class="stats-container">A record of what we’ve played and who joined in. Look back at a gathering, or see which favourites keep making it to the table.</div>
    </header>

    <main style="width: 100%; display: flex; flex-direction: column; align-items: center;">
      <div class="search-wrap fade-up">
        <UInput v-model="search" type="search" aria-label="Search play history" class="search-input w-full" :ui="{ base: 'search-field' }" placeholder="Find a game we’ve played" />
        <NuxtLink v-if="collectionMatch" class="context-link" :to="{ path: '/collection', query: { game: collectionMatch.name } }" no-prefetch>Back to {{ collectionMatch.name }} in the collection <span aria-hidden="true">→</span></NuxtLink>
        <p v-if="!isPending && !isError && filteredSessions.length && !matchingGames" class="page-hint">Select a game to see its cover and players.</p>
        <p v-if="!isPending && !isError && matchingGames" class="page-hint" role="status">{{ matchingGameCount }} matching {{ matchingGameCount === 1 ? 'game' : 'games' }} across {{ filteredSessions.length }} {{ filteredSessions.length === 1 ? 'gathering' : 'gatherings' }}.</p>
      </div>
      <template v-if="isPending">
        <div class="loading-state loading-copy">Loading play history…</div>
        <section class="session-card" v-for="n in 3" :key="'skel-'+n">
          <div class="skel" style="width: 200px; height: 22px; margin-bottom: 20px;"></div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <div class="skel" v-for="p in 5" :key="p" style="width: 85px; height: 34px; border-radius: 50px; margin-bottom: 0;"></div>
          </div>
        </section>
      </template>

      <div v-else-if="isError" class="loading-state" role="alert">
        <p>We couldn’t load play history. Refresh the page to try again.</p>
        <NuxtLink class="context-link" to="/collection" no-prefetch>Browse the collection while you’re here <span aria-hidden="true">→</span></NuxtLink>
      </div>

      <template v-else>
        <section
          v-for="session in pagedSessions"
          :key="session.date"
          class="session-card fade-up"
        >
          <div class="session-date">{{ session.displayDate }}</div>

          <div class="game-grid">
            <UButton
              v-for="game in session.games"
              :key="game.key"
              class="game-pill"
              type="button"
              :aria-pressed="hoverImage.key === game.key && hoverImage.visible"
              :class="{ 'game-pill-match': matchingGames && game.name.toLocaleLowerCase().includes(matchingGames) }"
              @click="toggleGameImage($event, game)"
            >{{ game.name }}</UButton>
          </div>
        </section>

        <div v-if="filteredSessions.length === 0" class="loading-state">
          <p>{{ search.trim() ? `No gatherings include “${search.trim()}”. Try another game title.` : 'Our play history is waiting for its first entry.' }}</p>
          <NuxtLink class="context-link" to="/collection" no-prefetch>Explore the collection <span aria-hidden="true">→</span></NuxtLink>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <UButton class="page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">Previous</UButton>
          <UButton
            v-for="p in totalPages"
            :key="p"
            class="page-btn"
            :class="{ active: p === currentPage }"
            @click="goToPage(p)"
          >{{ p }}</UButton>
          <UButton class="page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">Next</UButton>
        </div>

        <section v-if="!matchingGames" class="session-card stats-panel fade-up">
          <header class="stats-heading">
            <p class="eyebrow">A little look back</p>
            <h2 class="session-date">Our time in games</h2>
          </header>

          <div class="stats-totals" aria-label="Play history totals">
            <div class="total-item">
              <strong>{{ playlogStats.totalPlays }}</strong>
              <span>plays logged</span>
            </div>
            <div class="total-item">
              <strong>{{ playlogStats.uniqueGames }}</strong>
              <span>different games</span>
            </div>
            <div class="total-item">
              <strong>{{ sessions.length }}</strong>
              <span>gatherings</span>
            </div>
          </div>

          <p class="stats-average">We play {{ playlogStats.avgGamesPerSession }} games per gathering, on average.</p>

          <div v-if="topPlayedGames.length" class="stats-feature-grid">
            <section class="featured-game" aria-labelledby="most-played-title">
              <p class="ranking-title">A familiar favourite</p>
              <h3 id="most-played-title">Most played</h3>
              <UButton
                class="featured-game-button"
                type="button"
                @mouseenter="showGameImageFromPointer($event, topPlayedGames[0].label, false)"
                @mouseleave="hideGameImage"
                @focus="showGameImageFromPointer($event, topPlayedGames[0].label, false)"
                @blur="hideGameImage"
                @click="showGameImageFromPointer($event, topPlayedGames[0].label, false)"
              >
                <img :src="topPlayedGames[0].cover" :alt="topPlayedGames[0].label + ' cover'" loading="lazy" decoding="async" @error="hideBrokenCover">
                <span class="featured-game-copy"><strong>{{ topPlayedGames[0].label }}</strong><span>{{ topPlayedGames[0].value }} {{ topPlayedGames[0].value === 1 ? 'play' : 'plays' }}</span></span>
              </UButton>
            </section>

            <section class="game-ranking" aria-label="Other most played games">
              <UButton
                v-for="(game, index) in topPlayedGames.slice(1)"
                :key="game.label"
                class="ranking-item"
                type="button"
                :aria-label="`${game.label}, ${game.value} ${game.value === 1 ? 'play' : 'plays'}`"
                @mouseenter="showGameImageFromPointer($event, game.label, false)"
                @mouseleave="hideGameImage"
                @focus="showGameImageFromPointer($event, game.label, false)"
                @blur="hideGameImage"
                @click="showGameImageFromPointer($event, game.label, false)"
              >
                <span class="ranking-position">{{ String(index + 2).padStart(2, '0') }}</span>
                <span class="ranking-label">{{ game.label }}</span>
                <span class="ranking-count">{{ game.value }}</span>
                <span class="ranking-track" aria-hidden="true"><span :style="{ width: `${game.value / topPlayedGames[0].value * 100}%` }"></span></span>
              </UButton>
            </section>
          </div>

          <div class="stats-moments">
            <article class="moment-card">
              <span class="moment-mark" aria-hidden="true">✳</span>
              <p class="ranking-title">Busiest gathering</p>
              <strong>{{ playlogStats.biggestSession.count }} games played</strong>
              <span>{{ playlogStats.biggestSession.date }}</span>
            </article>
            <article class="moment-card discovery-card">
              <img :src="gameCoverPath(playlogStats.newestDiscovery.game)" :alt="playlogStats.newestDiscovery.game + ' cover'" loading="lazy" decoding="async" @error="hideBrokenCover">
              <div>
                <p class="ranking-title">New to the table</p>
                <strong>{{ playlogStats.newestDiscovery.game }}</strong>
                <span>First played {{ playlogStats.newestDiscovery.date }}</span>
              </div>
            </article>
          </div>
        </section>
      </template>
      <p class="clocktower-link"><NuxtLink to="/only-blood-in-the-clocktower" no-prefetch>See Clocktower recaps and the next gathering →</NuxtLink></p>
    </main>

    <Teleport to="body">
      <div v-if="hoverImage.visible" id="game-hover-card" class="game-hover-card" role="status" aria-live="polite" aria-atomic="true" :class="hoverImage.above ? 'hover-above' : 'hover-below'" :style="{ top: hoverImage.y + 'px', left: hoverImage.x + 'px' }">
        <img :src="hoverImage.src" :alt="hoverImage.name" width="150" height="130" decoding="async" />
        <div v-if="hoverImage.showPlayers && hoverImage.players.length" class="game-hover-name">PLAYERS</div>
        <div v-if="hoverImage.showPlayers && hoverImage.players.length" class="game-hover-players" aria-label="Players">
          <span v-for="player in hoverImage.players" :key="player" class="game-hover-player">{{ player }}</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { collectionDataSimple } from '~/assets/data/game_data_simple.js'
const route = useRoute()
const PAGE_SIZE = 10
const HOVER_CARD_HEIGHT = 245

const currentPage = ref(1)
const search = ref('')
const hoverImage = reactive({ visible: false, src: '', name: '', key: '', showPlayers: true, players: [], x: 0, y: 0, above: true })
const matchingGames = computed(() => search.value.trim().toLocaleLowerCase())
const collectionMatch = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return query ? collectionDataSimple.games.find(game => game.name.toLocaleLowerCase() === query) ?? null : null
})
const matchingGameCount = computed(() => matchingGames.value
    ? filteredSessions.value.reduce((total, session) => total + session.games.filter(game => game.name.toLocaleLowerCase().includes(matchingGames.value)).length, 0)
    : 0)

const { data: rawRows, isPending, isError } = usePlaylogData()

onMounted(() => {
  if (typeof route.query.game === 'string') search.value = route.query.game
})

const processedData = computed(() => {
    const rows = rawRows.value ?? []
    const byDate = {}
    const gameCounts = {}
    const gamePlayers = {}

    rows.forEach((row, index) => {
        const players = parsePlayers(row.players)
        if (!byDate[row.date]) byDate[row.date] = []
        byDate[row.date].push({
            key: `${row.date}-${row.game}-${index}`,
            name: row.game,
            players,
        })
        gameCounts[row.game] = (gameCounts[row.game] || 0) + 1
        if (!gamePlayers[row.game]) gamePlayers[row.game] = []
        gamePlayers[row.game].push(...players)
    })

    for (const game of Object.keys(gamePlayers)) {
        gamePlayers[game] = uniqueNames(gamePlayers[game])
    }

    const sessionList = Object.entries(byDate).map(([date, games]) => {
        const [year, month, day] = date.split('-')
        const dateObj = new Date(year, month - 1, day)
        return {
            date,
            displayDate: `${dateObj.getDate()} ${dateObj.toLocaleString('en-US', { month: 'long' })} ${year}`,
            games: [...games].sort((a, b) => a.name.localeCompare(b.name)),
        }
    })

    return { sessionList, gameCounts, gamePlayers }
})

const sessions = computed(() => processedData.value.sessionList)

const filteredSessions = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return sessions.value
    return sessions.value.filter(s => s.games.some(g => g.name.toLowerCase().includes(q)))
})

const totalPages = computed(() => Math.ceil(filteredSessions.value.length / PAGE_SIZE))
const pagedSessions = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredSessions.value.slice(start, start + PAGE_SIZE)
})

const topPlayedGames = computed(() => {
    return Object.entries(processedData.value.gameCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, value]) => ({ label, value, cover: gameCoverPath(label) }))
})

function gameCoverPath(gameName) {
    const filename = gameName
        .replace(/:\s*/g, ' ')
        .replace(/[<>"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    return `/images/playlog/${filename}.avif`
}

function hideBrokenCover(event) {
    event.currentTarget.hidden = true
}

const playlogStats = computed(() => {
    const sessionsList = sessions.value
    const rows = rawRows.value ?? []
    const totalPlays = rows.length
    const uniqueGames = Object.keys(processedData.value.gameCounts).length
    const avgGamesPerSession = sessionsList.length ? (totalPlays / sessionsList.length).toFixed(1) : '0.0'
    const biggest = sessionsList.reduce((best, session) => {
        return session.games.length > best.games.length ? session : best
    }, { displayDate: '--', games: [] })

    const firstSeen = new Map()
    for (const row of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
        if (!firstSeen.has(row.game)) firstSeen.set(row.game, row.date)
    }
    const newest = [...firstSeen.entries()].sort((a, b) => b[1].localeCompare(a[1]) || a[0].localeCompare(b[0]))[0]
    return {
        totalPlays,
        uniqueGames,
        avgGamesPerSession,
        biggestSession: {
            count: biggest.games.length,
            date: biggest.displayDate,
        },
        newestDiscovery: newest
            ? { game: newest[0], date: formatDisplayDate(newest[1]) }
            : { game: '--', date: '--' },
    }
})

watch(search, () => { currentPage.value = 1 })

const goToPage = (p) => {
    currentPage.value = p
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

function showGameImageAt(x, y, gameName, showPlayers = true, key = gameName) {
    const cardWidth = Math.min(190, window.innerWidth - 28)
    const anchorX = Number.isFinite(x) ? x : window.innerWidth / 2
    const anchorY = Number.isFinite(y) ? y : 60
    const above = anchorY > window.innerHeight / 2
    hoverImage.src = gameCoverPath(gameName)
    hoverImage.name = gameName
    hoverImage.key = key
    hoverImage.showPlayers = showPlayers
    hoverImage.players = []
    hoverImage.x = Math.max(14 + cardWidth / 2, Math.min(anchorX, window.innerWidth - 14 - cardWidth / 2))
    hoverImage.y = above
        ? Math.min(window.innerHeight - 14, Math.max(HOVER_CARD_HEIGHT + 14, anchorY - 12))
        : Math.min(window.innerHeight - 14, anchorY + 12)
    hoverImage.above = above
    hoverImage.visible = true
}

function parsePlayers(value) {
    return uniqueNames(String(value ?? '').split(',').map(player => player.trim()).filter(Boolean))
}

function uniqueNames(names) {
    const unique = new Map()
    for (const name of names) {
        unique.set(name.toLowerCase(), name)
    }
    return [...unique.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function getGameName(game) {
    return typeof game === 'string' ? game : game.name
}

function getGamePlayers(game) {
    if (typeof game === 'string') return processedData.value.gamePlayers[game] ?? []
    return game.players ?? []
}

function setHoverPlayers(game) {
    hoverImage.players = getGamePlayers(game)
}

function formatDisplayDate(date) {
    const [year, month, day] = date.split('-')
    const dateObj = new Date(year, month - 1, day)
    return `${dateObj.getDate()} ${dateObj.toLocaleString('en-US', { month: 'short' })} ${year}`
}

function showGameImage(e, game) {
    const rect = e.target.getBoundingClientRect()
    showGameImageAt(rect.left + rect.width / 2, rect.top, getGameName(game), true, game.key)
    setHoverPlayers(game)
}

function showGameImageFromPointer(e, gameName, showPlayers = true) {
    const source = e.changedTouches?.[0] ?? e
    const rect = e.currentTarget?.getBoundingClientRect?.()
    const x = Number.isFinite(source.clientX) ? source.clientX : rect?.left + (rect?.width ?? 0) / 2
    const y = Number.isFinite(source.clientY) ? source.clientY : rect?.top
    showGameImageAt(x, y, gameName, showPlayers)
    if (showPlayers) setHoverPlayers(gameName)
}

function hideGameImage() { hoverImage.visible = false }

function toggleGameImage(e, game) {
    const gameName = getGameName(game)
    if (hoverImage.visible && hoverImage.key === game.key) hideGameImage()
    else showGameImage(e, game)
}

function toggleGameImageFromPointer(e, gameName, showPlayers = true) {
    if (hoverImage.visible && hoverImage.name === gameName) hideGameImage()
    else showGameImageFromPointer(e, gameName, showPlayers)
}

function onDocClick(e) {
    if (!e.target.closest('.game-pill, .game-ranking, .featured-game-button')) hideGameImage()
}

function onKeydown(e) {
    if (e.key === 'Escape') hideGameImage()
}

onMounted(() => {
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
    document.removeEventListener('click', onDocClick)
    document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.search-wrap {
    width: 90%;
    max-width: 800px;
    margin-bottom: 20px;
}

.search-input {
    width: 100%;
}

.search-input :deep(.search-field) {
    border: 1px solid rgba(107, 122, 104, 0.2);
    background: var(--white-pure);
    font-family: inherit;
    font-size: 0.88rem;
    color: inherit;
    padding: 12px 20px;
    border-radius: 40px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
}

.search-input :deep(.search-field:focus) {
    border-color: var(--matcha-leaf);
    box-shadow: 0 0 0 3px rgba(107, 122, 104, 0.1);
}

.session-card {
    background: var(--white-pure);
    border-radius: var(--radius-card);
    padding: var(--section-pad);
    box-shadow: 0 15px 40px var(--pebble-shadow);
    border: 1px solid rgba(107, 122, 104, 0.06);
    border-top: 3px solid var(--gold-leaf);
    width: 90%;
    max-width: 800px;
    margin-bottom: 25px;
    box-sizing: border-box;
    text-align: left;
    transition: transform 0.35s ease, box-shadow 0.35s ease;
}

.session-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 22px 50px rgba(74, 68, 63, 0.11);
}

.stats-panel {
    text-align: left;
}

.stats-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(240px, 0.75fr);
    gap: 28px;
    align-items: start;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.stat-tile {
    min-width: 0;
    padding: 16px 14px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(237, 213, 200, 0.45), rgba(237, 232, 245, 0.62));
    box-shadow: inset 0 2px 0 rgba(212, 175, 55, 0.55);
}

.stat-tile-wide {
    grid-column: span 3;
}

.stat-value {
    display: block;
    color: var(--matcha-leaf);
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.65rem, 5vw, 2.25rem);
    line-height: 1;
}

.stat-game {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: clamp(1.15rem, 4vw, 1.45rem);
    line-height: 1.2;
}

.stat-label {
    display: block;
    margin-top: 8px;
    color: var(--clay-text);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 1.3px;
    line-height: 1.45;
    text-transform: uppercase;
    opacity: 0.68;
}

.rankings-panel {
    min-width: 0;
    padding-left: 26px;
    border-left: 1px solid rgba(107, 122, 104, 0.12);
    display: grid;
    gap: 22px;
}

.ranking-title {
    margin-bottom: 14px;
    color: var(--matcha-leaf);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-align: center;
    text-transform: uppercase;
    opacity: 0.72;
}

.session-date {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: clamp(1.15rem, 5vw, 1.45rem);
    color: var(--matcha-leaf);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.session-date::after {
    content: "";
    flex-grow: 1;
    height: 1px;
    background: linear-gradient(to right, rgba(212, 175, 55, 0.25), transparent);
}

.game-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.game-pill {
    background: rgba(237, 213, 200, 0.65);
    color: var(--clay-text);
    padding: 7px 15px;
    border-radius: 50px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: background 0.25s, color 0.25s, transform 0.2s;
    border: 0;
    font: inherit;
    cursor: pointer;
    text-align: left;
}

.game-pill:hover {
    background: var(--matcha-leaf);
    color: white;
    transform: translateY(-1px);
}

.game-pill-match {
    border-color: var(--matcha-leaf);
    background: var(--lavender-mist);
    box-shadow: inset 0 0 0 1px var(--matcha-leaf);
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin: 10px 0 30px;
    flex-wrap: wrap;
}

.page-btn {
    background: var(--white-pure);
    border: 1px solid rgba(107, 122, 104, 0.18);
    color: var(--matcha-leaf);
    font-family: var(--font-body);
    font-size: 0.72rem;
    font-weight: 700;
    padding: 8px 14px;
    border-radius: 40px;
    cursor: pointer;
    transition: background 0.25s, color 0.25s, transform 0.2s, box-shadow 0.25s;
    letter-spacing: 0.5px;
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

.ranking-group {
    display: grid;
    gap: 8px;
}

.ranking-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    width: 100%;
    border: 1px solid rgba(107, 122, 104, 0.1);
    border-radius: 14px;
    background: rgba(247, 233, 230, 0.42);
    color: var(--clay-text);
    font-family: inherit;
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1.35;
    text-align: left;
    padding: 8px 10px;
    box-sizing: border-box;
}

.ranking-item:not(.ranking-item-static) {
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, transform 0.2s;
}

.ranking-item:not(.ranking-item-static):hover {
    border-color: rgba(107, 122, 104, 0.24);
    background: rgba(237, 232, 245, 0.72);
    transform: translateY(-1px);
}

.ranking-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ranking-count {
    color: var(--matcha-leaf);
    opacity: 0.7;
}

.loading-state {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    opacity: 0.4;
    margin: 40px 0;
}

.loading-copy {
    color: var(--matcha-leaf);
    font-weight: 700;
    opacity: 0.58;
}

.game-hover-card {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    background: var(--white-pure);
    border-radius: 18px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.18);
    padding: 10px;
    width: 190px;
    max-width: min(190px, calc(100vw - 28px));
    max-height: calc(100vh - 28px);
    overflow-y: auto;
    text-align: center;
    animation: hoverCardIn 0.15s ease;
}

.game-hover-card img {
    width: 100%;
    height: 130px;
    object-fit: contain;
    border-radius: 10px;
    display: block;
}

.game-hover-name {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--matcha-leaf);
    margin-top: 6px;
    line-height: 1.3;
    opacity: 0.75;
}

.game-hover-players {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
    margin-top: 8px;
}

.game-hover-player {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-radius: 999px;
    background: var(--lavender-mist);
    color: var(--matcha-leaf);
    padding: 3px 8px;
    font-size: 0.56rem;
    font-weight: 700;
    line-height: 1.25;
}

.hover-above { transform: translate(-50%, -100%) translateY(-10px); }
.hover-below { transform: translate(-50%, 0) translateY(10px); }

@keyframes hoverCardIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}

@media (min-width: 768px) {
    .session-card { border-radius: var(--radius-card); padding: 40px; }
    .game-pill { font-size: 0.72rem; padding: 8px 18px; }
}

@media (max-width: 767px) {
    .stats-layout {
        grid-template-columns: 1fr;
        gap: 24px;
    }

    .stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .stat-tile-wide {
        grid-column: span 2;
    }

    .rankings-panel {
        padding-left: 0;
        padding-top: 22px;
        border-left: 0;
        border-top: 1px solid rgba(107, 122, 104, 0.12);
    }
}

/* Boutique surfaces and readable controls. */

.search-wrap, .session-card { max-width: 960px; }
.search-input { min-height: 50px; border-radius: 8px; border-color: var(--line); }
.session-card { border: 1px solid var(--line); border-radius: var(--radius-card); box-shadow: var(--shadow-card); }
.session-card:hover { transform: none; box-shadow: var(--shadow-card); }
.stat-tile { background: var(--surface-soft); border: 1px solid var(--line); border-radius: 8px; box-shadow: none; padding: 20px 16px; }
.stat-label { font-size: .7rem; letter-spacing: .02em; text-transform: none; opacity: 1; color: var(--muted); }
.session-date { font-style: normal; font-size: 1.5rem; }
.session-date::after { background: var(--line); }
.game-pill { background: var(--surface-soft); border: 1px solid var(--line); border-radius: 6px; text-transform: none; font-weight: 400; font-size: .85rem; letter-spacing: 0; padding: 8px 14px; }
.ranking-title { text-align: left; opacity: 1; font-size: .68rem; }
.page-btn { min-width: 44px; min-height: 44px; border-radius: 6px; }
.pagination { flex-wrap: wrap; justify-content: center; max-width: 92%; }
@media (max-width: 767px) { .stat-tile:nth-child(3) { grid-column: 1 / -1; } }

/* Keep visual section order aligned with keyboard reading order. */
.search-wrap { order: 1; margin-bottom: 12px; }
main > .stats-panel { order: 4; margin-top: 24px; }
main > .session-card:not(.stats-panel) { order: 2; }
main > .loading-state { order: 2; }
main > .pagination { order: 3; }
.clocktower-link { order: 5; margin: 14px auto 0; width: fit-content; max-width: 100%; }
.clocktower-link a { display: inline-flex; align-items: center; min-height: 42px; padding: 8px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface-soft); color: var(--matcha-leaf); font-size: .82rem; line-height: 1.4; text-decoration: none; }
.clocktower-link a:hover { background: var(--white-pure); border-color: var(--matcha-leaf); }
@media (max-width: 767px) {
  .clocktower-link { width: 90%; }
  .clocktower-link a { justify-content: center; width: 100%; box-sizing: border-box; text-align: center; }
  .session-card:not(.stats-panel) { padding: 22px 18px; }
  .stats-panel { margin-top: 18px; }
}

.stats-panel { padding: clamp(22px, 4vw, 38px); }
.stats-heading { margin-bottom: 18px; }
.stats-heading .eyebrow, .ranking-title { margin: 0; color: var(--muted); font-size: .72rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.stats-heading .session-date { margin: 5px 0 0; color: var(--matcha-leaf); font: 400 clamp(1.65rem, 4vw, 2.15rem)/1.2 var(--font-display); }
.stats-totals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-block: 1px solid var(--line); }
.total-item { display: grid; gap: 5px; padding: 18px 14px; }
.total-item + .total-item { border-left: 1px solid var(--line); }
.total-item strong { color: var(--matcha-leaf); font: 400 clamp(1.8rem, 5vw, 2.8rem)/1 var(--font-display); font-variant-numeric: tabular-nums; }
.total-item span { color: var(--muted); font-size: .78rem; }
.stats-average { margin: 12px 0 24px; color: var(--muted); font-size: .83rem; }
.stats-feature-grid { display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr); gap: 22px; align-items: stretch; }
.featured-game { display: flex; flex-direction: column; gap: 7px; padding: 20px; border-radius: 10px; background: var(--surface-soft); }
.featured-game h3 { margin: 0 0 4px; color: var(--matcha-leaf); font: 400 1.45rem/1.2 var(--font-display); }
.featured-game-button { display: grid; grid-template-columns: 104px minmax(0, 1fr); gap: 15px; align-items: center; width: 100%; padding: 0; border: 0; background: transparent; color: var(--clay-text); text-align: left; cursor: pointer; }
.featured-game-button img { width: 104px; height: 116px; border-radius: 7px; background: var(--white-pure); object-fit: contain; }
.featured-game-copy { display: grid; gap: 7px; min-width: 0; }
.featured-game-copy strong { font: 400 1.14rem/1.3 var(--font-display); overflow-wrap: anywhere; }
.featured-game-copy span { color: var(--muted); font-size: .8rem; }
.game-ranking { display: grid; align-content: center; gap: 3px; }
.ranking-item { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 6px 10px; padding: 10px 4px; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; background: transparent; font-size: .82rem; }
.ranking-item:hover { background: transparent; }
.ranking-position { grid-row: span 2; align-self: center; color: var(--muted); font: .75rem var(--font-display); }
.ranking-label { color: var(--clay-text); font-weight: 500; white-space: normal; }
.ranking-count { color: var(--matcha-leaf); font-size: .75rem; font-weight: 650; white-space: nowrap; }
.ranking-track { grid-column: 2 / 4; height: 4px; overflow: hidden; border-radius: 99px; background: var(--line); }
.ranking-track > span { display: block; height: 100%; border-radius: inherit; background: var(--matcha-leaf); }
.stats-moments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
.moment-card { display: grid; grid-template-columns: auto 1fr; gap: 5px 12px; align-content: center; min-height: 96px; padding: 16px; border: 1px solid var(--line); border-radius: 9px; }
.moment-mark { grid-row: span 3; align-self: center; color: var(--gold-leaf); font-size: 1.15rem; }
.moment-card strong { color: var(--matcha-leaf); font: 400 1.16rem/1.3 var(--font-display); overflow-wrap: anywhere; }
.moment-card > span:last-child { color: var(--muted); font-size: .76rem; }
.discovery-card { grid-template-columns: 70px minmax(0, 1fr); align-items: center; }
.discovery-card img { width: 70px; height: 74px; border-radius: 5px; background: var(--surface-soft); object-fit: contain; }
.discovery-card > div { display: grid; gap: 4px; min-width: 0; }
.discovery-card strong { font-size: 1rem; }

@media (max-width: 600px) {
  .stats-panel { padding: 22px 18px; }
  .total-item { padding: 15px 9px; }
  .total-item span { font-size: .7rem; }
  .stats-feature-grid { grid-template-columns: 1fr; gap: 12px; }
  .featured-game { padding: 16px; }
  .game-ranking { padding-inline: 4px; }
  .stats-moments { grid-template-columns: 1fr; }
}

</style>
