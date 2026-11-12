<template>
  <main class="clocktower-admin">
    <header class="admin-masthead">
      <div><p class="eyebrow">The Storyteller’s Desk</p><h1>Clocktower Organiser</h1><p>Log games, write the recap and prepare the next gathering.</p></div>
      <UButton class="admin-primary" type="button" :disabled="busy" @click="startNew">New gathering</UButton>
    </header>
    <p v-if="error" class="message error" role="alert">{{ error }}</p>

    <details v-if="saved.length" ref="savedPicker" class="saved-picker" :open="!draft.id && !isDirty">
      <summary><span>Open a saved gathering</span><span class="saved-count">{{ saved.length }}</span></summary>
      <div class="saved-list">
        <article v-for="session in saved" :key="session.id" class="admin-card saved">
          <div class="saved-details"><time :datetime="session.session_date">{{ new Date(session.session_date + 'T12:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) }}</time><span class="saved-venue">{{ session.venue || 'Saujana' }}</span><span class="status-badge" :class="{ 'is-published': session.published }">{{ session.published ? 'Published' : 'Draft' }}</span></div>
          <UButton type="button" :disabled="busy" @click="edit(session)">Edit</UButton>
        </article>
      </div>
    </details>

    <form ref="editorForm" class="editor admin-card" @submit.prevent>
      <div class="editor-heading">
        <div>
          <p class="eyebrow">Gathering editor</p>
          <h2 ref="editorTitle" tabindex="-1">{{ draft.id ? 'Edit gathering' : 'Log a gathering' }}</h2>
          <div class="editor-status">
            <span class="status-badge" :class="{ 'is-published': baseline.published }">{{ baseline.published ? 'Published' : 'Draft' }}</span>
            <span v-if="isDirty" class="dirty-note">Unsaved changes</span>
          </div>
        </div>
        <div class="editor-heading-actions">
          <UButton v-if="!draft.games.length" type="button" class="start-game" :disabled="busy" @click="addGame()">Start with a game ↓</UButton>
          <UButton v-if="draft.id || isDirty" type="button" :disabled="busy" @click="startNew">New gathering</UButton>
        </div>
      </div>

      <fieldset class="editor-fields" :disabled="busy">
        <section class="gathering-details">
          <h3>Gathering details</h3>
          <label>Start from an active gathering
            <select v-model="activeGatheringId" @change="applyActiveGathering">
              <option value="">Choose a gathering, or enter a date below</option>
              <option v-for="event in activeGatherings" :key="event.id" :value="String(event.id)">{{ formatGatheringDate(event.date) }} · {{ event.name }}<template v-if="event.venue"> · {{ event.venue }}</template></option>
            </select>
          </label>
          <p v-if="activeGatheringError" class="script-hint">Active gatherings could not be loaded. Enter the date and venue below.</p>
          <div class="fields">
            <label>Date<input v-model="draft.session_date" type="date" required></label>
            <label>Venue<UInputMenu v-model="draft.venue" :items="venueOptions" mode="autocomplete" open-on-focus placeholder="Choose or search for a venue" /></label>
          </div>
        </section>
        <details v-for="(game,index) in draft.games" :key="game.id" ref="gameCards" class="game admin-card" :data-game-id="game.id" :open="index === 0">
          <summary class="game-summary">
            <span class="game-number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="game-summary-copy"><small>Game {{ index + 1 }}</small><strong>{{ game.script || 'Choose a script' }}</strong></span>
            <span class="game-count">{{ game.players.length }} {{ game.players.length === 1 ? 'player' : 'players' }}</span>
          </summary>
          <div class="game-content">
            <div class="game-heading">
              <h3>Game settings</h3>
              <div class="game-actions">
                <UButton v-if="index > 0" type="button" @click="copyRoster(index)">Copy previous roster</UButton>
                <UButton type="button" @click="removeGame(index)">Remove game</UButton>
              </div>
            </div>
            <div class="fields game-basics">
              <label>Script
                <select :value="game.script" @change="applyScript(game, $event)">
                  <option v-if="!game.script" value="" disabled>Choose a script</option>
                  <option v-else-if="!scriptNames.includes(game.script)" :value="game.script" disabled>{{ game.script }} (saved script)</option>
                  <option v-for="script in scriptNames" :key="script" :value="script">{{ script }}</option>
                </select>
              </label>
            </div>
            <p v-if="game.script && !scriptNames.includes(game.script)" class="script-hint">This game uses a previously saved script. You can keep it or switch to one of the listed scripts.</p>
            <p v-else-if="game.script" class="script-hint">{{ characters(game).length }} character suggestions loaded for {{ game.script }}.</p>

            <div class="section-heading">
              <h4>Players and characters <small>{{ game.players.length }} {{ game.players.length === 1 ? 'player' : 'players' }}</small></h4>
            </div>
            <div v-for="(player,playerIndex) in game.players" :key="playerIndex" class="player-card">
              <span class="seat-number" aria-label="Seat">{{ String(playerIndex + 1).padStart(2, '0') }}</span>
              <label class="player-name-field">Player name<UInputMenu v-model="player.name" class="player-name-menu w-full" data-player-name placeholder="Choose or enter a name" :items="playerNames" mode="autocomplete" open-on-focus /></label>
              <label>Character<select v-model="player.character" class="character-select" data-character-field @keydown.alt.n.prevent="focusNextCharacter(game, playerIndex)"><option value="">Choose a character</option><optgroup v-for="group in characterGroups(game)" :key="group.name" :label="group.name"><option v-for="character in group.characters" :key="character" :value="character">{{ character }}</option></optgroup></select></label>
              <label class="check-label death-check"><input v-model="player.died" type="checkbox"> Died during the game</label>
              <label v-if="player.final_status" class="legacy-status">Saved final status<input v-model="player.final_status" placeholder="Optional note"></label>
              <UButton type="button" class="remove-player" :aria-label="'Remove ' + (player.name || 'player ' + (playerIndex + 1))" @click="game.players.splice(playerIndex,1)">Remove</UButton>
            </div>
            <p v-if="!game.players.length" class="empty-note">No players added to this game yet.</p>
            <div class="roster-actions">
              <UButton v-if="game.players.length" type="button" class="add-player-next" @click="addPlayer(game)">Add next player +</UButton>
              <UButton v-else type="button" @click="addPlayer(game)">Add player</UButton>
              <UButton type="button" @click="toggleBulkRoster(game)">{{ bulkRosterOpen[game.id] ? 'Close paste' : 'Paste names' }}</UButton>
            </div>
            <p v-if="game.players.length" class="keyboard-hint">In a Character field, press <kbd>Alt</kbd> + <kbd>N</kbd> to move to the next player.</p>
            <section v-if="bulkRosterOpen[game.id]" class="bulk-roster-panel">
              <label>Paste one player name per line<textarea v-model="bulkRosterText[game.id]" rows="4" placeholder="Avery&#10;Jordan&#10;Sam"></textarea></label>
              <div><UButton type="button" @click="toggleBulkRoster(game)">Cancel</UButton><UButton class="admin-primary" type="button" @click="addPastedPlayers(game)">Add names</UButton></div>
            </section>

            <fieldset class="outcome-field">
              <legend>Outcome</legend>
              <div class="outcome-options">
                <label><input v-model="game.outcome" type="radio" value="Good wins"><span>Good wins</span></label>
                <label><input v-model="game.outcome" type="radio" value="Evil wins"><span>Evil wins</span></label>
                <label><input v-model="game.outcome" type="radio" value="No result"><span>No winner</span></label>
                <label><input v-model="game.outcome" type="radio" value="Unknown"><span>Unknown</span></label>
              </div>
            </fieldset>

            <details class="game-extras" :open="Boolean(game.notes || game.photos?.length)">
              <summary>Notes and photos <span v-if="game.photos?.length">{{ game.photos.length }} photos</span></summary>
              <label>Game notes<textarea v-model="game.notes" rows="2"></textarea></label>
              <label>Photos<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple @change="uploadPhotos($event,game)"></label>
              <div v-if="game.photos?.length" class="photo-list">
                <article v-for="photo in game.photos" :key="photo.path" class="photo-row">
                  <img v-if="photoSource(photo)" :src="photoSource(photo)" alt="Clocktower gathering photo preview">
                  <span v-else class="photo-placeholder" aria-hidden="true">Photo preview unavailable</span>
                  <label class="check-label"><input v-model="photo.approved" type="checkbox"> Approved to publish</label>
                  <label class="check-label"><input v-model="photo.cover" type="checkbox"> Use as cover</label>
                  <UButton type="button" @click="removePhoto(game,photo)">Remove photo</UButton>
                </article>
              </div>
            </details>
          </div>
        </details>

        <div class="add-game-actions">
          <UButton type="button" class="add-game" @click="addGame()">Add game</UButton>
          <UButton v-if="draft.games.length" type="button" class="add-game copy-game" @click="addGame({ copyRoster: true })">Add game with same players</UButton>
        </div>

        <section class="story admin-card">
          <h3>Gathering recap</h3>
          <label>Recap title<input v-model="draft.teaser" maxlength="240" placeholder="Give this gathering a title"></label>
          <label>Retelling<textarea v-model="draft.recap" rows="4" maxlength="3000" placeholder="What did the town believe? What changed? What did everyone talk about?"></textarea></label>
        </section>

        <details class="visitor-preview admin-card">
          <summary>Preview the public recap</summary>
          <p class="preview-note">Player names appear in the public recap.</p>
          <article class="preview-session">
            <header class="preview-masthead">
              <p class="eyebrow">From the storyteller’s desk</p>
              <h3>{{ draft.teaser || 'A night in Ravenswood Bluff' }}</h3>
              <p>{{ formatGatheringDate(draft.session_date) }}<template v-if="draft.venue"> · {{ draft.venue }}</template></p>
            </header>
            <section v-if="draft.recap" class="preview-content" aria-label="Retelling">
              <p class="eyebrow">Retelling</p>
              <p>{{ draft.recap }}</p>
            </section>
            <template v-for="game in draft.games" :key="game.id">
              <h4>{{ game.script || 'Script not recorded' }}</h4>
              <div class="preview-content">
                <p v-if="game.outcome">{{ game.outcome === 'No result' ? 'No winner' : game.outcome }}</p>
                <ul v-if="game.players.length"><li v-for="(player, playerIndex) in game.players" :key="playerIndex">{{ (player.name || player.public_name || '').trim() || 'Player ' + (playerIndex + 1) }}<template v-if="player.character"> · {{ player.character }}</template><template v-if="player.died"> · Died</template></li></ul>
                <p v-if="game.notes">{{ game.notes }}</p>
              </div>
              <div v-if="game.photos.some(photo => photo.approved && photoSource(photo))" class="preview-photos">
                <img v-for="photo in game.photos.filter(photo => photo.approved && photoSource(photo))" :key="photo.path" :src="photoSource(photo)" alt="Approved gathering photo">
              </div>
            </template>
            <p v-if="!draft.games.length && !draft.recap" class="empty-note">Add a game or write a retelling to preview the recap.</p>
          </article>
        </details>
      </fieldset>

      <div class="save-row">
        <template v-if="baseline.published">
          <UButton class="admin-primary" type="button" :disabled="busy" @click="save(true)">{{ saving ? 'Saving gathering…' : uploading ? 'Uploading photo…' : 'Update public gathering' }}</UButton>
          <UButton type="button" :disabled="busy" @click="unpublish">Unpublish</UButton>
        </template>
        <template v-else>
          <UButton class="admin-primary" type="button" :disabled="busy" @click="save(false)">{{ saving ? 'Saving gathering…' : uploading ? 'Uploading photo…' : 'Save draft' }}</UButton>
          <UButton class="publish-button" type="button" :disabled="busy" @click="save(true)">{{ saving ? 'Saving gathering…' : uploading ? 'Uploading photo…' : 'Publish gathering' }}</UButton>
        </template>
        <p v-if="notice" class="message" role="status">{{ notice }}</p>
      </div>
    </form>

  </main>
</template>

<script setup>
definePageMeta({ layout: 'admin' })
useHead({ title: 'Clocktower Organiser | Saujana BGC', meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }] })

const config = useRuntimeConfig()
const auth = useAdminAuth()
const endpoint = config.public.supabaseUrl + '/functions/v1/botc-archive'
const saved = ref([])
const players = ref([])
const activeGatherings = ref([])
const activeGatheringId = ref('')
const activeGatheringError = ref(false)
const playerNames = computed(() => [...new Set(players.value.map(player => player.private_name).filter(Boolean))])
const venueOptions = computed(() => [...new Set([...activeGatherings.value.map(event => event.venue), ...saved.value.map(session => session.venue)].filter(Boolean))].sort((a, b) => a.localeCompare(b)))
const photoUrls = ref({})
const localPhotoUrls = ref({})
const pendingPhotoDeletes = ref(new Set())
const gameCards = ref([])
const savedPicker = ref(null)
const editorTitle = ref(null)
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
const scriptNames = Object.keys(scriptPresets)
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
  return { name: '', character: '', alignment: '', died: false, final_status: '' }
}

function addGame(options = {}) {
  const previousGame = options.copyRoster ? draft.value.games.at(-1) : null
  const script = scriptNames.includes(previousGame?.script) ? previousGame.script : 'Trouble Brewing'
  const game = {
    id: crypto.randomUUID(),
    script,
    script_characters: scriptPresets[script],
    outcome: '', notes: '',
    players: previousGame
      ? previousGame.players.map(player => ({ ...newPlayer(), name: player.name }))
      : [],
    photos: [],
  }
  draft.value.games.push(game)
  nextTick(() => {
    gameCards.value.forEach((card, index) => { card.open = index === gameCards.value.length - 1 })
    const card = gameCards.value.at(-1)
    card?.scrollIntoView({ block: 'start' })
    card?.querySelector('select')?.focus({ preventScroll: true })
  })
}

function addPlayer(game) {
  game.players.push(newPlayer())
  nextTick(() => {
    const card = gameCards.value.find(item => item?.dataset.gameId === game.id)
    const playerFields = card?.querySelectorAll('.player-card input[data-player-name]')
    playerFields?.item(playerFields.length - 1)?.focus()
  })
}

function focusNextCharacter(game, playerIndex) {
  nextTick(() => {
    const card = gameCards.value.find(item => item?.dataset.gameId === game.id)
    card?.querySelectorAll('select[data-character-field]').item(playerIndex + 1)?.focus()
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
    const card = gameCards.value.find(item => item?.dataset.gameId === game.id)
    card?.querySelectorAll('input[data-character-field]').item(firstNewPlayerIndex)?.focus()
  })
}

function characters(game) {
  const source = scriptNames.includes(game.script) ? scriptPresets[game.script] : game.script_characters
  return (source || '').split(',').map(value => value.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b))
}

function characterGroups(game) {
  const groups = [
    { name: 'Good · Townsfolk', characters: [] },
    { name: 'Good · Outsiders', characters: [] },
    { name: 'Evil · Minions', characters: [] },
    { name: 'Evil · Demons', characters: [] },
    { name: 'Team unknown', characters: [] },
  ]
  const script = game.script
  const roleSets = {
    'Trouble Brewing': [
      ['Washerwoman', 'Librarian', 'Investigator', 'Chef', 'Empath', 'Fortune Teller', 'Undertaker', 'Monk', 'Ravenkeeper', 'Virgin', 'Slayer', 'Soldier', 'Mayor'],
      ['Butler', 'Drunk', 'Recluse', 'Saint'],
      ['Poisoner', 'Spy', 'Scarlet Woman', 'Baron'],
      ['Imp'],
    ],
    'Bad Moon Rising': [
      ['Grandmother', 'Sailor', 'Chambermaid', 'Exorcist', 'Innkeeper', 'Gossip', 'Courtier', 'Professor', 'Minstrel', 'Tea Lady', 'Pacifist', 'Fool'],
      ['Goon', 'Lunatic', 'Tinker', 'Moonchild'],
      ['Godfather', 'Devil’s Advocate', 'Assassin', 'Mastermind'],
      ['Zombuul', 'Pukka', 'Shabaloth', 'Po'],
    ],
    'Sects & Violets': [
      ['Clockmaker', 'Dreamer', 'Snake Charmer', 'Mathematician', 'Flowergirl', 'Town Crier', 'Oracle', 'Savant', 'Seamstress', 'Philosopher', 'Artist', 'Juggler', 'Sage'],
      ['Mutant', 'Sweetheart', 'Barber', 'Klutz'],
      ['Witch', 'Cerenovus', 'Pit-Hag'],
      ['Fang Gu', 'Vigormortis', 'No Dashii', 'Vortox'],
    ],
  }
  const roles = roleSets[script]
  for (const character of characters(game)) {
    const teamIndex = roles?.findIndex(team => team.includes(character)) ?? -1
    groups[character === 'Evil Twin' ? 0 : teamIndex < 0 ? 4 : teamIndex].characters.push(character)
  }
  return groups.filter(group => group.characters.length)
}

function formatGatheringDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(`${value}T12:00:00+08:00`))
}

function applyActiveGathering() {
  const event = activeGatherings.value.find(item => String(item.id) === activeGatheringId.value)
  if (!event) return
  draft.value.session_date = event.date
  draft.value.venue = event.venue || ''
}

async function loadActiveGatherings() {
  try {
    const { data, error: requestError } = await useSupabase()
      .from('events')
      .select('id,name,date,venue')
      .gte('date', new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }))
      .order('date', { ascending: true })
    if (requestError) throw requestError
    activeGatherings.value = data || []
  } catch {
    activeGatheringError.value = true
  }
}

function applyScript(game, event) {
  const previousScript = game.script
  const nextScript = event.target.value
  if (!scriptNames.includes(nextScript)) return
  const availableCharacters = new Set(scriptPresets[nextScript].split(',').map(value => value.trim()).filter(Boolean))
  const affectedCount = game.players.filter(player => player.character && !availableCharacters.has(player.character)).length
  const change = previousScript ? `Switch from ${previousScript} to ${nextScript}` : `Use ${nextScript}`
  if (affectedCount && !window.confirm(`${change}? This will clear ${affectedCount} assigned ${affectedCount === 1 ? 'character' : 'characters'} that aren’t in the new script.`)) {
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
  activeGatheringId.value = String(activeGatherings.value.find(event => event.date === session.session_date && (!event.venue || !session.venue || event.venue === session.venue))?.id ?? '')
  notice.value = ''
  error.value = ''
}

function edit(session) {
  if (busy.value || !confirmDiscard()) return
  setDraft(session)
  nextTick(() => {
    if (savedPicker.value) savedPicker.value.open = false
    editorTitle.value?.focus({ preventScroll: true })
    editorForm.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  })
}

function confirmDiscard() {
  return !isDirty.value || window.confirm('Discard your unsaved changes and switch gatherings?')
}

function startNew() {
  if (busy.value || !confirmDiscard()) return
  const session = emptySession()
  setDraft(session)
  nextTick(() => {
    if (savedPicker.value) savedPicker.value.open = false
    editorTitle.value?.focus({ preventScroll: true })
    editorForm.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  })
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
            ? card?.querySelectorAll('input[data-player-name]')[missingPlayerIndex]
            : card?.querySelector('.outcome-field input[type="radio"]')
      field?.focus()
      field?.scrollIntoView({ block: 'center' })
    })
    return
  }

  saving.value = true
  try {
    draft.value.id ||= crypto.randomUUID()
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
  await Promise.all([loadActiveGatherings(), load()])
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}
.admin-masthead p:last-child { margin: 12px 0 0; color: var(--muted); font-size: .9rem; }
.editor { display: grid; gap: 18px; margin-top: 16px; padding: var(--desk-pad); padding-bottom: calc(var(--desk-pad) + 58px); border-color: var(--desk-rule); background: #faf5ed; }
.editor-heading, .game-heading, .saved, .save-row, .section-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.editor-heading { padding: 2px 0 14px; border-bottom: 1px solid var(--desk-rule); }
.editor-heading .eyebrow { margin: 0 0 3px; color: var(--matcha-leaf); font-weight: 750; letter-spacing: .12em; }
.editor-heading h2 { margin: 0; font: 400 clamp(1.55rem, 3vw, 2rem)/1.15 var(--font-display); color: var(--desk-ink); }
.editor-heading h2:focus { outline: none; }
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
.gathering-details > label { max-width: 720px; margin-bottom: 12px; }
.editor .character-select { appearance: auto; }
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
.player-card :deep(input[data-player-name]) {
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
  box-shadow: none;
}
.player-card :deep(input[data-player-name]:focus-visible) {
  outline: 2px solid var(--matcha-leaf);
  outline-offset: 2px;
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
.visitor-preview summary { cursor: pointer; font-weight: 700; color: var(--matcha-leaf); }
.preview-note { margin: 9px 0 13px; color: var(--muted); font-size: .86rem; }
.preview-session { overflow: hidden; padding: 0 16px 14px; border: 1px solid #e3d6c6; border-radius: 9px; background: #fffcf6; overflow-wrap: anywhere; }
.preview-masthead { margin: 0 -16px 14px; padding: clamp(16px, 3vw, 28px); background: #f5eae4; }
.preview-masthead .eyebrow { margin: 0; color: var(--matcha-leaf); font-size: .7rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.preview-masthead h3 { margin: 4px 0; color: #35282b; font: 400 clamp(1.25rem, 3vw, 1.85rem)/1.15 var(--font-display); }
.preview-masthead p:last-child { margin: 6px 0 0; color: #6b5755; }
.preview-session h4 { margin: 16px 0 0; color: var(--matcha-leaf); }
.preview-content { margin: 10px 0; padding: 12px; border: 1px solid #e3d6c6; border-radius: 7px; background: #f8f1e8; }
.preview-content p { white-space: pre-wrap; overflow-wrap: anywhere; }
.preview-photos { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 120px), 1fr)); gap: 8px; }
.preview-photos img { width: 100%; height: 110px; object-fit: cover; border-radius: 6px; }
.saved-picker { margin-top: 16px; border: 1px solid var(--desk-rule); border-radius: 8px; background: var(--desk-paper); }
.saved-picker > summary { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 9px 14px; cursor: pointer; color: var(--matcha-leaf); font-weight: 700; }
.saved-count { display: grid; place-items: center; min-width: 26px; height: 26px; margin-inline-start: auto; padding: 0 6px; border-radius: 20px; background: var(--surface-soft); font-size: .8rem; }
.clocktower-admin :is(.game-summary, .saved-picker > summary, .game-extras > summary) {
  list-style: none;
}
.clocktower-admin :is(.game-summary, .saved-picker > summary, .game-extras > summary)::-webkit-details-marker { display: none; }
.clocktower-admin :is(.game-summary, .saved-picker > summary, .game-extras > summary)::after {
  width: 7px;
  height: 7px;
  margin: 0 3px 4px auto;
  border: solid var(--matcha-leaf);
  border-width: 0 1.5px 1.5px 0;
  content: '';
  transform: rotate(45deg);
}
.clocktower-admin details[open] > :is(.game-summary, .saved-picker > summary, .game-extras > summary)::after {
  margin-bottom: 0;
  transform: rotate(225deg);
}
.clocktower-admin .saved-picker > summary::after { margin-inline-start: 0; }
.saved-list { display: grid; gap: 2px; padding: 0 14px 10px; }
.saved-list .saved { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; margin: 0; padding: 10px 2px; border: 0; border-top: 1px solid var(--desk-rule); border-radius: 0; box-shadow: none; }
.saved-details { display: grid; grid-template-columns: 125px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-width: 0; font-size: .87rem; }
.saved-details time { color: var(--desk-ink); font-weight: 700; }
.saved-venue { min-width: 0; color: var(--muted); overflow-wrap: anywhere; }
.editor-heading-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.editor-heading-actions .start-game { border-color: var(--matcha-leaf); color: var(--matcha-leaf); font-weight: 700; }
.section-heading h4 small { margin-left: 5px; color: var(--muted); font: .75rem var(--font-body); }
.roster-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.game-extras { padding: 0 12px; border: 1px solid var(--desk-rule); border-radius: 7px; background: #f9f3ec; }
.game-extras[open] { padding-bottom: 12px; }
.game-extras > summary { display: flex; align-items: center; gap: 9px; min-height: 40px; cursor: pointer; font-size: .86rem; font-weight: 650; }
.game-extras > summary span { color: var(--muted); font-size: .78rem; font-weight: 400; }
.game-extras > label { margin-top: 9px; }
.bulk-roster-panel { display: grid; gap: 9px; margin: 0 0 8px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface-soft); }
.bulk-roster-panel > div { display: flex; flex-wrap: wrap; gap: 8px; }
.bulk-roster-panel .admin-primary { border: 0; }
.bulk-roster-panel textarea { min-height: 96px; resize: vertical; }
.player-card { display: grid; grid-template-columns: 28px minmax(150px, .95fr) minmax(170px, 1.1fr) auto auto; gap: 10px 14px; align-items: end; padding: 12px 14px; border: 1px solid var(--desk-rule); border-radius: 9px; background: var(--surface-soft); }
.player-card:focus-within { border-color: #b48977; }
.seat-number { display: grid; place-items: center; align-self: center; width: 26px; height: 26px; border: 1px solid #d8c4af; border-radius: 50%; color: var(--matcha-leaf); font-size: .68rem; font-weight: 750; }
.player-card > label:not(.check-label) { font-size: .8rem; }
.player-name-field { min-width: 0; font-size: .8rem; }
.player-card .check-label { align-self: end; min-height: 44px; padding: 0 3px; font-size: .82rem; }
.player-card .death-check { white-space: nowrap; }
.legacy-status { grid-column: 1 / -1; }
.script-hint { margin: -5px 0 0; color: var(--muted); font-size: .78rem; }
.outcome-field { max-width: 640px; margin: 0; padding: 0; border: 0; }
.outcome-field legend { margin-bottom: 7px; color: var(--desk-ink); font-size: .86rem; font-weight: 600; }
.outcome-options { display: flex; flex-wrap: wrap; gap: 7px; }
.outcome-options label { position: relative; display: flex; align-items: center; gap: 7px; min-height: 42px; padding: 7px 11px; border: 1px solid var(--desk-rule); border-radius: 7px; background: var(--desk-paper); cursor: pointer; }
.outcome-options label:has(input:checked) { border-color: var(--matcha-leaf); background: #f3e7e2; color: var(--matcha-leaf); }
.outcome-options input[type="radio"] { width: 16px; min-width: 16px; min-height: 16px; margin: 0; padding: 0; accent-color: var(--matcha-leaf); }
.outcome-options span { font-size: .84rem; }
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
  .admin-masthead { align-items: flex-start; }
  .admin-masthead { flex-direction: column; gap: 10px; }
  .saved-details { grid-template-columns: minmax(0, 1fr) auto; gap: 2px 8px; }
  .saved-details time { grid-column: 1; }
  .saved-details .status-badge { grid-column: 2; grid-row: 1; }
  .saved-venue { grid-column: 1 / -1; }
  .game-heading, .editor-heading { align-items: flex-start; flex-wrap: wrap; }
  .editor-heading-actions { width: 100%; justify-content: flex-start; }
  .player-card { grid-template-columns: 28px minmax(0, 1fr) minmax(0, 1fr); align-items: center; }
  .player-card > .player-name-field { grid-column: 2 / -1; }
  .player-card > label:not(.check-label):not(.player-name-field) { grid-column: 2 / -1; }
  .player-card > .seat-number { grid-column: 1; grid-row: 1; }
  .player-card > .death-check { grid-column: 2 / 4; }
  .player-card > .remove-player { grid-column: 3; }
  .player-card .check-label { min-height: 38px; }
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
