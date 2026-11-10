<template>
  <main class="clocktower-admin">
    <header class="admin-masthead">
      <p class="eyebrow">The storyteller’s desk</p>
      <h1>Only Blood in the Clocktower</h1>
      <p>Log games, write the recap and prepare the next gathering.</p>
    </header>
    <p v-if="error" class="message error" role="alert">{{ error }}</p>

    <details v-if="saved.length" class="saved-picker">
      <summary><span>Open a saved gathering</span><span class="saved-count">{{ saved.length }}</span></summary>
      <div class="saved-list">
        <article v-for="session in saved" :key="session.id" class="admin-card saved">
          <div><strong>{{ session.session_date }} · {{ session.venue || 'Saujana' }}</strong><span class="status-badge" :class="{ 'is-published': session.published }">{{ session.published ? 'Published' : 'Draft' }}</span></div>
          <button type="button" :disabled="busy" @click="edit(session)">Edit</button>
        </article>
      </div>
    </details>

    <form ref="editorForm" class="editor admin-card" @submit.prevent>
      <div class="editor-heading">
        <div>
          <p class="eyebrow">Gathering editor</p>
          <h2>{{ draft.id ? 'Edit gathering' : 'Log a gathering' }}</h2>
          <div class="editor-status">
            <span class="status-badge" :class="{ 'is-published': baseline.published }">{{ baseline.published ? 'Published' : 'Draft' }}</span>
            <span v-if="isDirty" class="dirty-note">Unsaved changes</span>
          </div>
        </div>
        <div class="editor-heading-actions">
          <button v-if="!draft.games.length" type="button" class="start-game" :disabled="busy" @click="addGame()">Start with a game ↓</button>
          <button v-if="draft.id || isDirty" type="button" :disabled="busy" @click="startNew">New gathering</button>
        </div>
      </div>

      <fieldset class="editor-fields" :disabled="busy">
        <section class="gathering-details">
          <h3>Gathering details</h3>
          <div class="fields">
            <label>Date<input v-model="draft.session_date" type="date" required></label>
            <label>Time<input v-model="draft.session_time" type="time"></label>
            <label>Venue<input v-model="draft.venue" maxlength="160"></label>
            <label>Signup link<input v-model="draft.signup_url" type="url" placeholder="https://…"></label>
          </div>
          <label>First timer note<textarea v-model="draft.first_timer_note" rows="2" placeholder="What should a first timer know?"></textarea></label>
        </section>
        <datalist id="clocktower-players"><option v-for="player in players" :key="player.id" :value="player.private_name"></option></datalist>

        <details v-for="(game,index) in draft.games" :key="game.id" ref="gameCards" class="game admin-card" open>
          <summary class="game-summary">
            <span class="game-number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="game-summary-copy"><small>Game {{ index + 1 }}</small><strong>{{ game.script || 'Choose a script' }}</strong></span>
            <span class="game-count">{{ game.players.length }} {{ game.players.length === 1 ? 'player' : 'players' }}</span>
          </summary>
          <div class="game-content">
            <div class="game-heading">
              <h3>Game settings</h3>
              <div class="game-actions">
                <button v-if="index > 0" type="button" @click="copyRoster(index)">Copy previous roster</button>
                <button type="button" @click="removeGame(index)">Remove game</button>
              </div>
            </div>
            <div class="fields">
              <label>Script
                <select :value="game.script" @change="applyScript(game, $event)">
                  <option value="Trouble Brewing">Trouble Brewing</option>
                  <option value="Bad Moon Rising">Bad Moon Rising</option>
                  <option value="Sects &amp; Violets">Sects &amp; Violets</option>
                  <option v-if="!scriptPresets[game.script] && game.script" :value="game.script">{{ game.script }} (custom)</option>
                  <option value="__custom__">Custom script…</option>
                </select>
              </label>
              <label v-if="!scriptPresets[game.script]">Custom script name<input v-model="game.script" placeholder="Enter the script name"></label>
              <label>Outcome<select v-model="game.outcome"><option value="">Choose result</option><option>Good wins</option><option>Evil wins</option><option>No result</option><option>Unknown</option></select></label>
            </div>
            <details class="script-list">
              <summary>Script characters <span>{{ characters(game).length }} available</span></summary>
              <label>Character list, separated by commas<input v-model="game.script_characters" placeholder="Washerwoman, Librarian, Investigator…"></label>
            </details>

            <div class="section-heading">
              <h4>Players and characters <small>{{ game.players.length }}</small></h4>
            </div>
            <div v-for="(player,playerIndex) in game.players" :key="playerIndex" class="player-card">
              <label>Player name<input v-model="player.name" list="clocktower-players" placeholder="Choose or enter a name"></label>
              <label>Character<input class="character-field" v-model="player.character" :list="'clocktower-characters-' + game.id" placeholder="Choose or enter a character" @keydown.alt.n.prevent="focusNextCharacter(game, playerIndex)"></label>
              <label class="check-label"><input v-model="player.died" type="checkbox"> Died</label>
              <details class="player-more"><summary>More</summary><label>Final status<input v-model="player.final_status" placeholder="Optional"></label></details>
              <button type="button" class="remove-player" :aria-label="'Remove ' + (player.name || 'player ' + (playerIndex + 1))" @click="game.players.splice(playerIndex,1)">Remove</button>
            </div>
            <datalist :id="'clocktower-characters-' + game.id"><option v-for="character in characters(game)" :key="character" :value="character"></option></datalist>
            <p v-if="!game.players.length" class="empty-note">No players added to this game yet.</p>
            <div class="roster-actions">
              <button v-if="game.players.length" type="button" class="add-player-next" @click="addPlayer(game)">Add next player +</button>
              <button v-else type="button" @click="addPlayer(game)">Add player</button>
              <button type="button" @click="toggleBulkRoster(game)">{{ bulkRosterOpen[game.id] ? 'Close paste' : 'Paste names' }}</button>
            </div>
            <p v-if="game.players.length" class="keyboard-hint">In a Character field, press <kbd>Alt</kbd> + <kbd>N</kbd> to move to the next player.</p>
            <section v-if="bulkRosterOpen[game.id]" class="bulk-roster-panel">
              <label>Paste one player name per line<textarea v-model="bulkRosterText[game.id]" rows="4" placeholder="Avery&#10;Jordan&#10;Sam"></textarea></label>
              <div><button type="button" @click="toggleBulkRoster(game)">Cancel</button><button class="admin-primary" type="button" @click="addPastedPlayers(game)">Add names</button></div>
            </section>

            <details class="game-extras" :open="Boolean(game.notes || game.photos?.length)">
              <summary>Game extras <span v-if="game.photos?.length">{{ game.photos.length }} photos</span></summary>
              <label>Game notes<textarea v-model="game.notes" rows="2"></textarea></label>
              <label>Photos<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple @change="uploadPhotos($event,game)"></label>
              <div v-if="game.photos?.length" class="photo-list">
                <article v-for="photo in game.photos" :key="photo.path" class="photo-row">
                  <img v-if="photoSource(photo)" :src="photoSource(photo)" alt="Clocktower session photo preview">
                  <span v-else class="photo-placeholder" aria-hidden="true">Photo preview unavailable</span>
                  <label class="check-label"><input v-model="photo.approved" type="checkbox"> Approved to publish</label>
                  <label class="check-label"><input v-model="photo.cover" type="checkbox"> Use as cover</label>
                  <button type="button" @click="removePhoto(game,photo)">Remove photo</button>
                </article>
              </div>
            </details>
          </div>
        </details>

        <div class="add-game-actions">
          <button type="button" class="add-game" @click="addGame()">Add game</button>
          <button v-if="draft.games.length" type="button" class="add-game copy-game" @click="addGame({ copyRoster: true })">Add game with same players</button>
        </div>

        <section class="story admin-card">
          <h3>Meetup story</h3>
          <label>Teaser<input v-model="draft.teaser" maxlength="240" placeholder="A spoiler free hook"></label>
          <label>Mika’s retelling<textarea v-model="draft.recap" rows="4" maxlength="3000" placeholder="What did the town believe? What changed? What did everyone talk about?"></textarea></label>
        </section>

        <details class="visitor-preview admin-card">
          <summary>Preview as visitors will see it</summary>
          <p class="preview-note">Private preview. Players appear by seat unless they have a public name.</p>
          <article class="preview-session">
            <header class="preview-masthead">
              <p class="eyebrow">From the storyteller’s desk</p>
              <h3>{{ draft.teaser || 'A night in Ravenswood Bluff' }}</h3>
              <p>{{ draft.session_date }}<template v-if="draft.session_time"> · {{ draft.session_time }}</template><template v-if="draft.venue"> · {{ draft.venue }}</template></p>
            </header>
            <p v-if="draft.first_timer_note">{{ draft.first_timer_note }}</p>
            <details v-if="draft.recap" class="preview-reveal">
              <summary>Reveal Mika’s retelling</summary>
              <p>{{ draft.recap }}</p>
            </details>
            <template v-for="game in draft.games" :key="game.id">
              <h4>{{ game.script || 'Custom script' }}</h4>
              <details class="preview-reveal">
                <summary>Reveal the result</summary>
                <p v-if="game.players.length">In the circle · {{ game.players.map((player, index) => player.public_name.trim() || `Seat ${index + 1}`).join(', ') }}</p>
                <p v-if="game.outcome">{{ game.outcome }}</p>
                <ul><li v-for="(player, playerIndex) in game.players" :key="playerIndex">{{ player.public_name.trim() || 'Seat ' + (playerIndex + 1) }}<template v-if="player.character"> · {{ player.character }}</template><template v-if="player.died"> · died</template></li></ul>
                <p v-if="game.notes">{{ game.notes }}</p>
              </details>
              <div v-if="game.photos.some(photo => photo.approved && photoSource(photo))" class="preview-photos">
                <img v-for="photo in game.photos.filter(photo => photo.approved && photoSource(photo))" :key="photo.path" :src="photoSource(photo)" alt="Approved gathering photo">
              </div>
            </template>
            <p v-if="!draft.games.length && !draft.recap" class="empty-note">Add a game or write a retelling to preview the session story.</p>
          </article>
        </details>
      </fieldset>

      <div class="save-row">
        <template v-if="baseline.published">
          <button class="admin-primary" type="button" :disabled="busy" @click="save(true)">{{ saving ? 'Saving gathering…' : uploading ? 'Uploading photo…' : 'Save changes' }}</button>
          <button type="button" :disabled="busy" @click="unpublish">Unpublish</button>
        </template>
        <template v-else>
          <button class="admin-primary" type="button" :disabled="busy" @click="save(false)">{{ saving ? 'Saving gathering…' : uploading ? 'Uploading photo…' : 'Save draft' }}</button>
          <button class="publish-button" type="button" :disabled="busy" @click="save(true)">{{ saving ? 'Saving gathering…' : uploading ? 'Uploading photo…' : 'Publish gathering' }}</button>
        </template>
        <p v-if="notice" class="message" role="status">{{ notice }}</p>
      </div>
    </form>

  </main>
</template>

<script setup>
definePageMeta({ layout: 'admin' })

const config = useRuntimeConfig()
const auth = useAdminAuth()
const endpoint = config.public.supabaseUrl + '/functions/v1/botc-archive'
const saved = ref([])
const players = ref([])
const photoUrls = ref({})
const localPhotoUrls = ref({})
const pendingPhotoDeletes = ref(new Set())
const gameCards = ref([])
const editorForm = ref(null)
const bulkRosterText = ref({})
const bulkRosterOpen = ref({})
const saving = ref(false)
const uploading = ref(false)
const error = ref('')
const notice = ref('')
const draft = ref(emptySession())
const baseline = ref(cleanSession(draft.value))
const scriptPresets = {
  'Trouble Brewing': 'Washerwoman, Librarian, Investigator, Chef, Empath, Fortune Teller, Undertaker, Monk, Ravenkeeper, Virgin, Slayer, Soldier, Mayor, Butler, Drunk, Recluse, Saint, Poisoner, Spy, Scarlet Woman, Baron, Imp',
  'Bad Moon Rising': 'Grandmother, Sailor, Chambermaid, Exorcist, Innkeeper, Gossip, Courtier, Professor, Minstrel, Tea Lady, Pacifist, Fool, Goon, Lunatic, Tinker, Moonchild, Godfather, Devil’s Advocate, Assassin, Mastermind, Zombuul, Pukka, Shabaloth, Po',
  'Sects & Violets': 'Clockmaker, Dreamer, Snake Charmer, Mathematician, Flowergirl, Town Crier, Oracle, Savant, Seamstress, Philosopher, Artist, Juggler, Sage, Mutant, Sweetheart, Barber, Klutz, Evil Twin, Witch, Cerenovus, Pit-Hag, Fang Gu, Vigormortis, No Dashii, Vortox',
}
const busy = computed(() => saving.value || uploading.value)
const isDirty = computed(() => JSON.stringify(cleanSession(draft.value)) !== JSON.stringify(baseline.value))
onBeforeRouteLeave(() => !busy.value && confirmDiscard())

let draftSaveTimer
let restoringDraft = false
function draftStorageKey() {
  const userId = auth.session.value?.user?.id
  return userId ? `saujana-botc-draft-${userId}` : null
}

function persistDraftLocally() {
  if (restoringDraft || typeof window === 'undefined') return
  clearTimeout(draftSaveTimer)
  draftSaveTimer = setTimeout(() => {
    const key = draftStorageKey()
    if (!key) return
    try {
      if (!isDirty.value) window.localStorage.removeItem(key)
      else window.localStorage.setItem(key, JSON.stringify({ draft: cleanSession(draft.value), baseline: cleanSession(baseline.value) }))
    } catch {
      // Keep editing available when local storage is blocked or full.
    }
  }, 250)
}

watch([draft, baseline], persistDraftLocally, { deep: true })

function restoreDraftLocally() {
  const key = draftStorageKey()
  if (!key) return
  try {
    const stored = window.localStorage.getItem(key)
    if (!stored) return
    const recovered = JSON.parse(stored)
    if (!recovered?.draft || typeof recovered.draft !== 'object' || !recovered?.baseline || typeof recovered.baseline !== 'object') return
    const restoredDraft = cleanSession(recovered.draft)
    const restoredBaseline = cleanSession(recovered.baseline)
    if (JSON.stringify(restoredDraft) === JSON.stringify(restoredBaseline)) {
      window.localStorage.removeItem(key)
      return
    }
    restoringDraft = true
    draft.value = restoredDraft
    baseline.value = restoredBaseline
    restoringDraft = false
    notice.value = 'Recovered your unsaved draft from this device.'
  } catch {
    // Ignore unreadable local drafts and leave the server copy untouched.
  }
}

function emptySession() {
  return {
    id: null,
    session_date: new Date().toLocaleDateString('en-CA'),
    session_time: '', venue: '', signup_url: '', first_timer_note: '',
    teaser: '', recap: '', published: false, games: [],
  }
}

function cleanSession(session) {
  const value = JSON.parse(JSON.stringify(session || {}))
  value.games = (value.games || []).map((game, index) => ({
    id: game.id || `game-${index + 1}`,
    script: game.script || '',
    script_characters: game.script_characters || '',
    outcome: game.outcome || '',
    notes: game.notes || '',
    players: (game.players || []).map(player => ({
      name: player.name || '', public_name: player.public_name || '',
      character: player.character || '', alignment: player.alignment || '',
      died: player.died === true, final_status: player.final_status || '',
    })),
    photos: (game.photos || []).map(photo => ({
      path: photo.path, approved: photo.approved === true, cover: photo.cover === true,
    })),
  }))
  return value
}

function newPlayer() {
  return { name: '', public_name: '', character: '', alignment: '', died: false, final_status: '' }
}

function addGame(options = {}) {
  const previousGame = options.copyRoster ? draft.value.games.at(-1) : null
  const game = {
    id: crypto.randomUUID(),
    script: previousGame?.script || 'Trouble Brewing',
    script_characters: previousGame?.script_characters || scriptPresets['Trouble Brewing'],
    outcome: '', notes: '',
    players: previousGame
      ? previousGame.players.map(player => ({ ...newPlayer(), name: player.name, public_name: player.public_name }))
      : [],
    photos: [],
  }
  draft.value.games.push(game)
  nextTick(() => {
    gameCards.value.at(-1)?.scrollIntoView({ block: 'start' })
    gameCards.value.at(-1)?.querySelector('select')?.focus({ preventScroll: true })
  })
}

function addPlayer(game) {
  game.players.push(newPlayer())
  nextTick(() => {
    const card = gameCards.value.find(item => item?.querySelector(`[id="clocktower-characters-${game.id}"]`))
    const playerFields = card?.querySelectorAll('.player-card input[list="clocktower-players"]')
    playerFields?.item(playerFields.length - 1)?.focus()
  })
}

function focusNextCharacter(game, playerIndex) {
  nextTick(() => {
    const card = gameCards.value.find(item => item?.querySelector(`[id="clocktower-characters-${game.id}"]`))
    card?.querySelectorAll('.character-field').item(playerIndex + 1)?.focus()
  })
}

function toggleBulkRoster(game) {
  bulkRosterOpen.value = { ...bulkRosterOpen.value, [game.id]: !bulkRosterOpen.value[game.id] }
}

function addPastedPlayers(game) {
  const names = (bulkRosterText.value[game.id] || '')
    .split(/\r?\n/)
    .map(line => line.split('\t')[0].trim())
    .filter(Boolean)
  if (!names.length) return
  const firstNewPlayerIndex = game.players.length
  game.players.push(...names.map(name => ({ ...newPlayer(), name })))
  bulkRosterText.value = { ...bulkRosterText.value, [game.id]: '' }
  bulkRosterOpen.value = { ...bulkRosterOpen.value, [game.id]: false }
  nextTick(() => {
    const card = gameCards.value.find(item => item?.querySelector(`[id="clocktower-characters-${game.id}"]`))
    card?.querySelectorAll('.character-field').item(firstNewPlayerIndex)?.focus()
  })
}

function characters(game) {
  return (game.script_characters || '').split(',').map(value => value.trim()).filter(Boolean)
}

function applyScript(game, event) {
  const previousScript = game.script
  const nextScript = event.target.value
  if (nextScript === '__custom__') {
    game.script = ''
    game.script_characters = ''
    return
  }
  if (!scriptPresets[nextScript]) return
  const availableCharacters = new Set(scriptPresets[nextScript].split(',').map(value => value.trim()).filter(Boolean))
  const affectedCount = game.players.filter(player => player.character && !availableCharacters.has(player.character)).length
  if (affectedCount && !window.confirm(`Switch from ${previousScript} to ${nextScript}? This will clear ${affectedCount} assigned ${affectedCount === 1 ? 'character' : 'characters'} that aren’t in the new script.`)) {
    event.target.value = previousScript
    return
  }
  game.script = nextScript
  game.script_characters = scriptPresets[nextScript]
  for (const player of game.players) {
    if (player.character && !availableCharacters.has(player.character)) player.character = ''
  }
}

function photoSource(photo) {
  return localPhotoUrls.value[photo.path] || photoUrls.value[photo.path] || ''
}

async function call(action, extra = {}) {
  const response = await auth.authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { apikey: config.public.supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Request failed')
  return body
}

async function load() {
  try {
    const result = await call('admin')
    saved.value = result.sessions || []
    players.value = result.players || []
    photoUrls.value = result.photo_urls || {}
    return true
  } catch (exception) {
    error.value = exception.message
    return false
  }
}

function setDraft(session) {
  draft.value = cleanSession(session)
  baseline.value = cleanSession(session)
  notice.value = ''
  error.value = ''
}

function edit(session) {
  if (busy.value || !confirmDiscard()) return
  setDraft(session)
}

function confirmDiscard() {
  return !isDirty.value || window.confirm('Discard your unsaved changes and switch gatherings?')
}

function startNew() {
  if (busy.value || !confirmDiscard()) return
  const session = emptySession()
  setDraft(session)
}

function copyRoster(index) {
  if (index < 1) return
  const game = draft.value.games[index]
  if (game.players.length && !window.confirm('Replace this game’s current roster with a copy of the previous game?')) return
  game.players = JSON.parse(JSON.stringify(draft.value.games[index - 1].players.map(player => ({
    ...player, character: '', alignment: '', died: false, final_status: '',
  }))))
}

function removeGame(index) {
  if (!window.confirm(`Remove Game ${index + 1} from this draft?`)) return
  draft.value.games.splice(index, 1)
}

async function save(published = baseline.value.published) {
  if (busy.value) return
  error.value = ''
  notice.value = ''
  if (!editorForm.value.reportValidity()) return
  if (published && draft.value.games.some(game =>
    !game.script.trim() || !game.players.length || game.players.some(player => !player.name.trim()) || !game.outcome,
  )) {
    gameCards.value.forEach(card => { if (card) card.open = true })
    error.value = 'Before publishing, give every player a name and add a script and outcome to each game.'
    nextTick(() => {
      const firstIncomplete = draft.value.games.findIndex(game =>
        !game.script.trim() || !game.players.length || game.players.some(player => !player.name.trim()) || !game.outcome,
      )
      const card = gameCards.value[firstIncomplete]
      const game = draft.value.games[firstIncomplete]
      const missingPlayerIndex = game.players.findIndex(player => !player.name.trim())
      const field = !game.script.trim()
        ? card?.querySelector('.fields select')
        : !game.players.length
          ? card?.querySelector('.roster-actions > button')
          : missingPlayerIndex >= 0
            ? card?.querySelectorAll('input[list="clocktower-players"]')[missingPlayerIndex]
            : card?.querySelectorAll('.fields select')[1]
      field?.focus()
      field?.scrollIntoView({ block: 'center' })
    })
    return
  }

  saving.value = true
  try {
    const result = await call('save', { session: cleanSession({ ...draft.value, published }) })
    const committed = result.session
    const refreshed = await load()
    const referencedPaths = new Set(refreshed ? saved.value.flatMap(session =>
      (session.games || []).flatMap(game => (game.photos || []).map(photo => photo.path)),
    ) : [])
    const cleanupErrors = []
    for (const path of refreshed ? pendingPhotoDeletes.value : []) {
      if (referencedPaths.has(path)) continue
      try {
        await call('delete_photo', { path })
        pendingPhotoDeletes.value.delete(path)
        revokeLocalPhoto(path)
      } catch {
        cleanupErrors.push(path)
      }
    }
    if (refreshed) {
      for (const path of (committed.games || []).flatMap(game => (game.photos || []).map(photo => photo.path))) {
        revokeLocalPhoto(path)
      }
    }
    setDraft(committed)
    notice.value = !refreshed
      ? 'Gathering saved, but its updated list and photo previews could not be loaded.'
      : cleanupErrors.length
        ? 'Gathering saved. A removed private photo could not be cleaned up yet.'
        : committed.published ? 'Gathering published.' : 'Draft saved.'
    if (!refreshed) error.value = 'The save succeeded. Refresh the saved gatherings list before making more edits.'
  } catch (exception) {
    error.value = exception.message
  } finally {
    saving.value = false
  }
}

function unpublish() {
  if (!window.confirm('Unpublish this gathering? It will no longer appear on the public page.')) return
  save(false)
}

async function uploadPhotos(event, game) {
  error.value = ''
  const files = [...(event.target.files || [])]
  if (!files.length) return
  uploading.value = true
  try {
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        error.value = 'Choose photos smaller than 8 MB.'
        continue
      }
      try {
        const userId = auth.session.value.user.id
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = userId + '/' + crypto.randomUUID() + '-' + safeName
        const response = await auth.authenticatedFetch(
          config.public.supabaseUrl + '/storage/v1/object/botc-session-photos/' + path,
          { method: 'POST', headers: { apikey: config.public.supabaseKey, 'Content-Type': file.type, 'x-upsert': 'false' }, body: file },
        )
        if (!response.ok) throw new Error('Photo upload failed. Check the file and try again.')
        localPhotoUrls.value[path] = URL.createObjectURL(file)
        game.photos.push({ path, approved: false, cover: false })
      } catch (exception) {
        error.value = exception.message
      }
    }
  } finally {
    uploading.value = false
    event.target.value = ''
  }
}

function removePhoto(game, photo) {
  if (!window.confirm('Remove this photo from the gathering? It will be deleted after you save.')) return
  if (photo.path) pendingPhotoDeletes.value.add(photo.path)
  game.photos = game.photos.filter(item => item !== photo)
}

function revokeLocalPhoto(path) {
  const url = localPhotoUrls.value[path]
  if (url) URL.revokeObjectURL(url)
  const remaining = { ...localPhotoUrls.value }
  delete remaining[path]
  localPhotoUrls.value = remaining
}

onMounted(async () => {
  await load()
  restoreDraftLocally()
})
onBeforeUnmount(() => {
  clearTimeout(draftSaveTimer)
  Object.values(localPhotoUrls.value).forEach(URL.revokeObjectURL)
})
</script>

<style scoped>
.clocktower-admin {
  --matcha-leaf: var(--saujana-clocktower-accent);
  --surface-soft: #f6efe7;
  --desk-paper: #fffcf7;
  --desk-rule: #e3d6c6;
  --desk-ink: #382932;
  --desk-pad: clamp(14px, 2.6vw, 24px);
  max-width: 1000px;
}
.admin-masthead {
  position: relative;
  overflow: hidden;
  padding: clamp(23px, 4.5vw, 43px);
  border-radius: 12px;
  background: linear-gradient(90deg, #21171d 22%, #21171ddd 58%, #21171d65),
    url('/images/clocktower-night.svg') right 51% / auto 290% no-repeat #38262e;
  box-shadow: 0 7px 22px #36252c22;
  color: #fff5e6;
}
.admin-masthead::after {
  position: absolute;
  inset: 7px;
  border: 1px solid #e6be8550;
  border-radius: 7px;
  content: '';
  pointer-events: none;
}
.admin-masthead .eyebrow { margin: 0; color: #e6be85; font-size: .72rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.admin-masthead h1 { margin: 6px 0 8px; color: #fff5e6; font: 400 clamp(1.85rem, 5vw, 3.25rem)/1.12 var(--font-display); text-wrap: balance; }
.admin-masthead p:last-child { margin: 0; color: #e1d0c8; }
.editor { display: grid; gap: 18px; margin-top: 16px; padding: var(--desk-pad); border-color: var(--desk-rule); background: #faf5ed; }
.editor-heading, .game-heading, .saved, .save-row, .section-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.editor-heading { padding: 2px 0 14px; border-bottom: 1px solid var(--desk-rule); }
.editor-heading .eyebrow { margin: 0 0 3px; color: var(--matcha-leaf); font-weight: 750; letter-spacing: .12em; }
.editor-heading h2 { margin: 0; font: 400 clamp(1.55rem, 3vw, 2rem)/1.15 var(--font-display); color: var(--desk-ink); }
.editor-status { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; margin-top: 8px; }
.status-badge { display: inline-block; width: fit-content; padding: 3px 8px; border: 1px solid #dec8a9; border-radius: 20px; background: #f6ebda; color: #705122; font-size: .7rem; font-weight: 700; }
.status-badge.is-published { border-color: #c3d4bf; background: #e8f0e4; color: #38543d; }
.dirty-note { color: #79551e; font-size: .82rem; }
.editor-fields { display: grid; gap: 16px; min-width: 0; margin: 0; padding: 0; border: 0; }
.gathering-details, .story {
  display: grid;
  gap: 13px;
  padding: var(--desk-pad);
  border: 1px solid var(--desk-rule);
  border-radius: 10px;
  background: var(--desk-paper);
}
.fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 155px), 1fr)); gap: 12px; }
.editor label { display: grid; gap: 6px; min-width: 0; color: var(--desk-ink); font-size: .86rem; font-weight: 600; }
.editor :is(input:not([type=checkbox]), select, textarea) {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 9px 10px;
  border: 1px solid #daccbd;
  border-radius: 6px;
  background: #fffdfa;
  color: var(--desk-ink);
  font: inherit;
  font-weight: 400;
}
.editor textarea { min-height: auto; resize: vertical; }
.clocktower-admin :is(input, select, textarea, button, summary):focus-visible { outline: 2px solid var(--matcha-leaf); outline-offset: 2px; }
.game { padding: 0; overflow: hidden; border-color: var(--desk-rule); border-radius: 10px; background: var(--desk-paper); }
.game-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 12px var(--desk-pad);
  background: #f3e7e2;
  color: var(--desk-ink);
  cursor: pointer;
}
.game-summary:focus-visible { outline-offset: -3px; }
.game-summary-copy { display: grid; gap: 2px; }
.game-summary small, .game-count { font-size: .75rem; color: #65514c; }
.game-summary strong { font: 400 clamp(1rem, 2.1vw, 1.35rem)/1.15 var(--font-display); overflow-wrap: anywhere; }
.game-number { display: grid; place-items: center; width: 35px; height: 35px; border: 1px solid #cfb3a0; border-radius: 50%; background: var(--desk-paper); color: var(--matcha-leaf); font: 400 1rem/1 var(--font-display); }
.game-content { display: grid; gap: 12px; padding: 14px var(--desk-pad) var(--desk-pad); border-top: 1px solid var(--desk-rule); }
.gathering-details h3, .story h3, .game-heading h3 { margin: 0; color: var(--desk-ink); font: 400 1.23rem/1.2 var(--font-display); }
.game-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.section-heading h4 { margin: 5px 0 0; color: var(--desk-ink); font-size: .94rem; }
.check-label { display: flex !important; align-items: center; gap: 7px; }
.check-label input { flex: 0 0 auto; width: 18px; height: 18px; accent-color: var(--matcha-leaf); }
.photo-list { display: grid; gap: 9px; }
.photo-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 10px; border: 1px solid var(--desk-rule); border-radius: 8px; }
.photo-row img, .photo-placeholder { width: 76px; height: 60px; object-fit: cover; border-radius: 5px; }
.photo-placeholder { display: grid; place-items: center; padding: 4px; background: var(--surface-soft); color: var(--muted); font-size: .7rem; text-align: center; }
.message { padding: 12px; border-radius: 6px; background: var(--surface-soft); }
.message.error { color: #913f45; background: #fbf0ef; }
.empty-note { margin: 0; color: var(--muted); font-size: .88rem; }
button { min-height: 42px; padding: 8px 12px; border: 1px solid #daccbd; border-radius: 6px; background: var(--desk-paper); color: var(--desk-ink); cursor: pointer; font: inherit; font-size: .86rem; }
button:enabled:hover { border-color: var(--matcha-leaf); background: #f6ebe5; }
button:disabled { opacity: .65; cursor: wait; }
.admin-primary { border-color: var(--matcha-leaf); background: var(--matcha-leaf); color: #fff; padding-inline: 15px; font-weight: 700; }
.admin-primary:enabled:hover { background: #5b3039; }
.visitor-preview { padding: var(--desk-pad); background: var(--desk-paper); border-color: var(--desk-rule); }
.visitor-preview summary, .preview-reveal summary { cursor: pointer; font-weight: 700; color: var(--matcha-leaf); }
.preview-note { margin: 9px 0 13px; color: var(--muted); font-size: .86rem; }
.preview-session { overflow: hidden; padding: 0 16px 14px; border: 1px solid #e3d6c6; border-radius: 9px; background: #fffcf6; overflow-wrap: anywhere; }
.preview-masthead { margin: 0 -16px 14px; padding: clamp(16px, 3vw, 28px); background: #f5eae4; }
.preview-masthead .eyebrow { margin: 0; color: var(--matcha-leaf); font-size: .7rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.preview-masthead h3 { margin: 4px 0; color: #35282b; font: 400 clamp(1.25rem, 3vw, 1.85rem)/1.15 var(--font-display); }
.preview-masthead p:last-child { margin: 6px 0 0; color: #6b5755; }
.preview-session h4 { margin: 16px 0 0; color: var(--matcha-leaf); }
.preview-reveal { margin: 10px 0; padding: 12px; border: 1px solid #e3d6c6; border-radius: 7px; background: #f8f1e8; }
.preview-reveal p { white-space: pre-wrap; }
.preview-photos { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 120px), 1fr)); gap: 8px; }
.preview-photos img { width: 100%; height: 110px; object-fit: cover; border-radius: 6px; }
.saved-picker { margin-top: 16px; border: 1px solid var(--desk-rule); border-radius: 8px; background: var(--desk-paper); }
.saved-picker > summary { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 9px 14px; cursor: pointer; color: var(--matcha-leaf); font-weight: 700; }
.saved-count { display: grid; place-items: center; min-width: 26px; height: 26px; margin-inline-start: auto; padding: 0 6px; border-radius: 20px; background: var(--surface-soft); font-size: .8rem; }
.clocktower-admin :is(.game-summary, .saved-picker > summary, .script-list > summary, .game-extras > summary) {
  list-style: none;
}
.clocktower-admin :is(.game-summary, .saved-picker > summary, .script-list > summary, .game-extras > summary)::-webkit-details-marker { display: none; }
.clocktower-admin :is(.game-summary, .saved-picker > summary, .script-list > summary, .game-extras > summary)::after {
  width: 7px;
  height: 7px;
  margin: 0 3px 4px auto;
  border: solid var(--matcha-leaf);
  border-width: 0 1.5px 1.5px 0;
  content: '';
  transform: rotate(45deg);
}
.clocktower-admin details[open] > :is(.game-summary, .saved-picker > summary, .script-list > summary, .game-extras > summary)::after {
  margin-bottom: 0;
  transform: rotate(225deg);
}
.clocktower-admin .saved-picker > summary::after { margin-inline-start: 0; }
.saved-list { display: grid; gap: 8px; padding: 0 10px 10px; }
.saved-list .saved { margin: 0; padding: 12px; border-color: var(--desk-rule); box-shadow: none; }
.saved strong { display: block; margin-bottom: 3px; overflow-wrap: anywhere; }
.editor-heading-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.editor-heading-actions .start-game { border-color: var(--matcha-leaf); color: var(--matcha-leaf); font-weight: 700; }
.section-heading h4 small { margin-left: 5px; color: var(--muted); font: .75rem var(--font-body); }
.roster-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.script-list, .game-extras { padding: 0 12px; border: 1px solid var(--desk-rule); border-radius: 7px; background: #f9f3ec; }
.script-list[open], .game-extras[open] { padding-bottom: 12px; }
.script-list > summary, .game-extras > summary, .player-more > summary { display: flex; align-items: center; gap: 9px; min-height: 40px; cursor: pointer; font-size: .86rem; font-weight: 650; }
.script-list > summary span, .game-extras > summary span { color: var(--muted); font-size: .78rem; font-weight: 400; }
.script-list label, .game-extras > label { margin-top: 9px; }
.bulk-roster-panel { display: grid; gap: 9px; margin: 0 0 8px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.bulk-roster-panel > div { display: flex; flex-wrap: wrap; gap: 8px; }
.bulk-roster-panel .admin-primary { border: 0; }
.bulk-roster-panel textarea { min-height: 96px; resize: vertical; }
.player-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto auto auto; gap: 6px 10px; align-items: end; padding: 8px 10px; border: 1px solid var(--desk-rule); border-radius: 8px; background: var(--surface-soft); }
.player-card:focus-within { border-color: #b48977; }
.player-card > label:not(.check-label) { font-size: .8rem; }
.player-card .check-label { align-self: end; min-height: 44px; padding: 0 3px; font-size: .82rem; }
.player-more summary { min-width: 55px; justify-content: center; font-size: .8rem; color: var(--matcha-leaf); }
.player-more label { min-width: 155px; margin-top: 6px; }
.player-more[open] { grid-column: 1 / -1; }
.remove-player { min-height: 40px; padding: 7px 9px; font-size: .8rem; color: var(--matcha-leaf); }
.keyboard-hint { margin: -3px 0 0; color: var(--muted); font-size: .76rem; }
.keyboard-hint kbd { padding: 1px 4px; border: 1px solid var(--desk-rule); border-radius: 3px; background: var(--surface-soft); }
.add-game-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.add-game-actions button { border-color: var(--matcha-leaf); color: var(--matcha-leaf); font-weight: 650; }
.add-player-next { justify-self: start; border-style: dashed; color: var(--matcha-leaf); }
.save-row { position: sticky; bottom: 8px; z-index: 3; justify-content: flex-start; flex-wrap: wrap; gap: 7px; width: fit-content; max-width: 100%; padding: 7px; border: 1px solid #d8bfab; border-radius: 10px; background: #fffcf6f5; box-shadow: 0 4px 18px #211a2026; backdrop-filter: blur(10px); }
.save-row .message { margin: 0; }
.save-row .admin-primary { min-height: 46px; }
.save-row .publish-button { min-height: 46px; border-color: var(--gold-leaf); color: #704b19; font-weight: 700; }
@media(max-width:720px) {
  .game-heading, .editor-heading { align-items: flex-start; flex-wrap: wrap; }
  .editor-heading-actions { width: 100%; justify-content: flex-start; }
  .player-card { grid-template-columns: repeat(6, minmax(0, 1fr)); align-items: center; }
  .player-card > label:not(.check-label) { grid-column: span 3; }
  .player-card > :is(.check-label, .player-more, .remove-player) { grid-column: span 2; }
  .player-card .check-label { min-height: 38px; }
  .player-card > .player-more[open] { grid-column: 1 / -1; }
  .remove-player { justify-self: end; }
  .photo-row label { flex: 1 1 150px; }
  .save-row { position: sticky; bottom: max(8px, env(safe-area-inset-bottom)); width: 100%; }
}
@media(max-width:420px) {
  .game-summary { gap: 6px; }
  .game-number { width: 29px; height: 29px; }
  .game-count { font-size: .69rem; }
}
</style>
