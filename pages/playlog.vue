<template>
  <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
    <header class="fade-up">
      <h1 class="hero-title">Playlog</h1>
      <div class="stats-container">A record of games played, discoveries made, and favorites returning.</div>
    </header>

    <main style="width: 100%; display: flex; flex-direction: column; align-items: center;">
      <template v-if="isPending">
        <div class="loading-state loading-copy">Loading play history...</div>
        <section class="session-card" v-for="n in 3" :key="'skel-'+n">
          <div class="skel" style="width: 200px; height: 22px; margin-bottom: 20px;"></div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <div class="skel" v-for="p in 5" :key="p" style="width: 85px; height: 34px; border-radius: 50px; margin-bottom: 0;"></div>
          </div>
        </section>
      </template>

      <template v-else>
        <div class="search-wrap fade-up">
          <input v-model="search" class="search-input" placeholder="Search games..." />
        </div>

        <section class="session-card stats-panel fade-up">
          <div class="session-date">Play stats</div>
          <div class="stats-layout">
            <div class="stats-grid" aria-label="Playlog statistics">
              <div class="stat-tile">
                <span class="stat-value">{{ playlogStats.totalPlays }}</span>
                <span class="stat-label">plays logged</span>
              </div>
              <div class="stat-tile">
                <span class="stat-value">{{ playlogStats.uniqueGames }}</span>
                <span class="stat-label">games played</span>
              </div>
              <div class="stat-tile">
                <span class="stat-value">{{ playlogStats.avgGamesPerSession }}</span>
                <span class="stat-label">average games / gathering</span>
              </div>
              <div class="stat-tile stat-tile-wide">
                <span class="stat-value">{{ playlogStats.biggestSession.count }}</span>
                <span class="stat-label">busiest gathering / {{ playlogStats.biggestSession.date }}</span>
              </div>
              <div class="stat-tile stat-tile-wide">
                <span class="stat-value stat-game">{{ playlogStats.newestDiscovery.game }}</span>
                <span class="stat-label">newest discovery / {{ playlogStats.newestDiscovery.date }}</span>
              </div>
            </div>

            <div class="rankings-panel">
              <div class="ranking-group">
                <div class="ranking-title">Most played games</div>
                <button
                  v-for="game in topPlayedGames"
                  :key="game.label"
                  class="ranking-item"
                  type="button"
                  @mouseenter="showGameImageFromPointer($event, game.label, false)"
                  @mouseleave="hideGameImage"
                  @touchend.prevent="toggleGameImageFromPointer($event, game.label, false)"
                >
                  <span class="ranking-label">{{ game.label }}</span>
                  <span class="ranking-count">{{ game.value }}</span>
                </button>
              </div>

              <div class="ranking-group">
                <div class="ranking-title">Top players</div>
                <div
                  v-for="player in topPlayers"
                  :key="player.label"
                  class="ranking-item ranking-item-static"
                >
                  <span class="ranking-label">{{ player.label }}</span>
                  <span class="ranking-count">{{ player.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          v-for="(session, i) in pagedSessions"
          :key="session.date"
          class="session-card fade-up"
          :style="{ transitionDelay: Math.min(i * 0.07, 0.5) + 's' }"
        >
          <div class="session-date">{{ session.displayDate }}</div>

          <div class="game-grid">
            <span
              v-for="game in session.games"
              :key="game.key"
              class="game-pill"
              @mouseenter="showGameImage($event, game)"
              @mouseleave="hideGameImage"
              @touchend.prevent="toggleGameImage($event, game)"
            >{{ game.name }}</span>
          </div>
        </section>

        <div v-if="filteredSessions.length === 0" class="loading-state">
          No sessions found for "{{ search }}".
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">Prev</button>
          <button
            v-for="p in totalPages"
            :key="p"
            class="page-btn"
            :class="{ active: p === currentPage }"
            @click="goToPage(p)"
          >{{ p }}</button>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">Next</button>
        </div>
      </template>
    </main>

    <Teleport to="body">
      <div v-if="hoverImage.visible" class="game-hover-card" :class="hoverImage.above ? 'hover-above' : 'hover-below'" :style="{ top: hoverImage.y + 'px', left: hoverImage.x + 'px' }">
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
const PAGE_SIZE = 10
const HOVER_CARD_HEIGHT = 245

const currentPage = ref(1)
const search = ref('')
const hoverImage = reactive({ visible: false, src: '', name: '', showPlayers: true, players: [], x: 0, y: 0, above: true })

const { data: rawRows, isPending } = usePlaylogData()

const processedData = computed(() => {
    const rows = rawRows.value ?? []
    const byDate = {}
    const gameCounts = {}
    const playerCounts = {}
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
        for (const player of players) {
            playerCounts[player] = (playerCounts[player] || 0) + 1
        }
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

    return { sessionList, gameCounts, playerCounts, gamePlayers }
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
        .map(([label, value]) => ({ label, value }))
})

const topPlayers = computed(() => {
    return Object.entries(processedData.value.playerCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
        .slice(0, 5)
        .map(([label, value]) => ({ label, value }))
})

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

function showGameImageAt(x, y, gameName, showPlayers = true) {
    const filename = gameName
        .replace(/:\s*/g, ' ')
        .replace(/[<>"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    const above = y > HOVER_CARD_HEIGHT
    hoverImage.src = `/images/playlog/${filename}.avif`
    hoverImage.name = gameName
    hoverImage.showPlayers = showPlayers
    hoverImage.players = []
    hoverImage.x = x
    hoverImage.y = above ? y - 12 : y + 12
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
    showGameImageAt(rect.left + rect.width / 2, rect.top, getGameName(game))
    setHoverPlayers(game)
}

function showGameImageFromPointer(e, gameName, showPlayers = true) {
    const source = e.changedTouches?.[0] ?? e
    showGameImageAt(source.clientX, source.clientY, gameName, showPlayers)
    if (showPlayers) setHoverPlayers(gameName)
}

function hideGameImage() { hoverImage.visible = false }

function toggleGameImage(e, game) {
    const gameName = getGameName(game)
    if (hoverImage.visible && hoverImage.name === gameName) hideGameImage()
    else showGameImage(e, game)
}

function toggleGameImageFromPointer(e, gameName, showPlayers = true) {
    if (hoverImage.visible && hoverImage.name === gameName) hideGameImage()
    else showGameImageFromPointer(e, gameName, showPlayers)
}

function onDocClick(e) {
    if (!e.target.closest('.game-pill') && !e.target.closest('.rankings-panel')) hideGameImage()
}

onMounted(() => {
    document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
    document.removeEventListener('click', onDocClick)
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

.search-input:focus {
    border-color: var(--matcha-leaf);
    box-shadow: 0 0 0 3px rgba(107, 122, 104, 0.1);
}

.session-card {
    background: var(--white-pure);
    border-radius: 35px;
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
    cursor: default;
}

.game-pill:hover {
    background: var(--matcha-leaf);
    color: white;
    transform: translateY(-1px);
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
    font-family: 'Quicksand', sans-serif;
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
    .session-card { border-radius: 50px; padding: 40px; }
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
</style>
