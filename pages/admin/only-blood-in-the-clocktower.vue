<template>
  <main class="clocktower-admin">
    <p class="eyebrow">Community sessions</p>
    <h1>Only Blood in the Clocktower</h1>
    <p>Log games, share the best moment and keep the next gathering easy to find.</p>
    <p v-if="error" class="message error" role="alert">{{ error }}</p>

    <form class="editor admin-card" @submit.prevent="save">
      <div class="editor-heading">
        <div>
          <h2>{{ draft.id ? 'Edit gathering' : 'Log a gathering' }}</h2>
          <p v-if="isDirty" class="dirty-note">Unsaved changes</p>
        </div>
        <button v-if="draft.id || isDirty" type="button" :disabled="busy" @click="startNew">New gathering</button>
      </div>

      <fieldset class="editor-fields" :disabled="busy">
        <div class="fields">
          <label>Date<input v-model="draft.session_date" type="date" required></label>
          <label>Time<input v-model="draft.session_time" type="time"></label>
          <label>Venue<input v-model="draft.venue" maxlength="160"></label>
          <label>Signup link<input v-model="draft.signup_url" type="url" placeholder="https://…"></label>
        </div>
        <label>First timer note<textarea v-model="draft.first_timer_note" rows="2" placeholder="What should a first timer know?"></textarea></label>
        <datalist id="clocktower-players"><option v-for="player in players" :key="player.id" :value="player.private_name"></option></datalist>

        <details v-for="(game,index) in draft.games" :key="game.id" ref="gameCards" class="game admin-card" open>
          <summary class="game-summary"><span>Game {{ index + 1 }}<small>{{ game.script || 'Choose a script' }}</small></span></summary>
          <div class="game-content">
            <div class="game-heading">
              <h3>Game {{ index + 1 }}</h3>
              <div class="game-actions">
                <button v-if="index > 0" type="button" @click="copyRoster(index)">Copy previous roster</button>
                <button type="button" @click="removeGame(index)">Remove game</button>
              </div>
            </div>
            <div class="fields">
              <label>Script
                <select v-model="game.script" @change="applyScript(game)">
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
            <label>Characters on this script<input v-model="game.script_characters" placeholder="Washerwoman, Librarian, Investigator…"></label>

            <div class="section-heading"><h4>Players and characters</h4><button type="button" @click="game.players.push(newPlayer())">Add player</button></div>
            <div v-for="(player,playerIndex) in game.players" :key="playerIndex" class="player-card">
              <label>Player name<input v-model="player.name" list="clocktower-players" placeholder="Choose or enter a name"></label>
              <label>Character<input v-model="player.character" :list="'clocktower-characters-' + game.id" placeholder="Choose or enter a character"></label>
              <label class="check-label"><input v-model="player.died" type="checkbox"> Died</label>
              <label>Final status<input v-model="player.final_status" placeholder="Optional"></label>
              <button type="button" class="remove-player" @click="game.players.splice(playerIndex,1)">Remove player</button>
            </div>
            <datalist :id="'clocktower-characters-' + game.id"><option v-for="character in characters(game)" :key="character" :value="character"></option></datalist>
            <p v-if="!game.players.length" class="empty-note">No players added to this game yet.</p>

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
          </div>
        </details>

        <button type="button" class="add-game" @click="addGame">Add game</button>

        <section class="story admin-card">
          <h3>Meetup story</h3>
          <label>Teaser<input v-model="draft.teaser" maxlength="240" placeholder="A spoiler free hook"></label>
          <label>Mika’s retelling<textarea v-model="draft.recap" rows="4" maxlength="3000" placeholder="What did the town believe? What changed? What did everyone talk about?"></textarea></label>
          <label class="check-label"><input v-model="draft.published" type="checkbox"> Publish this gathering</label>
        </section>
      </fieldset>

      <div class="save-row">
        <button class="admin-primary" type="submit" :disabled="busy">{{ saving ? 'Saving gathering…' : uploading ? 'Uploading photo…' : draft.published ? 'Save and publish' : 'Save draft' }}</button>
        <p v-if="notice" class="message" role="status">{{ notice }}</p>
      </div>
    </form>

    <section class="admin-section saved-section">
      <h2>Saved gatherings</h2>
      <p v-if="!saved.length" class="empty-note">No gatherings saved yet.</p>
      <article v-for="session in saved" :key="session.id" class="admin-card saved">
        <div><strong>{{ session.session_date }} · {{ session.venue || 'Saujana' }}</strong><span>{{ session.published ? 'Published' : 'Draft' }}</span></div>
        <button type="button" :disabled="busy" @click="edit(session)">Edit</button>
      </article>
    </section>
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

function addGame() {
  draft.value.games.push({
    id: crypto.randomUUID(), script: 'Trouble Brewing',
    script_characters: scriptPresets['Trouble Brewing'],
    outcome: '', notes: '', players: [], photos: [],
  })
}

function characters(game) {
  return (game.script_characters || '').split(',').map(value => value.trim()).filter(Boolean)
}

function applyScript(game) {
  if (game.script === '__custom__') {
    game.script = ''
    game.script_characters = ''
    return
  }
  if (scriptPresets[game.script]) game.script_characters = scriptPresets[game.script]
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

async function save() {
  if (busy.value) return
  error.value = ''
  notice.value = ''
  if (draft.value.published && draft.value.games.some(game =>
    !game.script.trim() || !game.players.some(player => player.name.trim()) || !game.outcome,
  )) {
    gameCards.value.forEach(card => { if (card) card.open = true })
    error.value = 'Before publishing, add a script, at least one named player and an outcome to each game.'
    return
  }

  saving.value = true
  try {
    const result = await call('save', { session: cleanSession(draft.value) })
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

onMounted(load)
onBeforeUnmount(() => Object.values(localPhotoUrls.value).forEach(URL.revokeObjectURL))
</script>

<style scoped>
.clocktower-admin{max-width:1000px}.clocktower-admin>h1{margin:0 0 12px}.clocktower-admin>p:not(.eyebrow){color:var(--muted)}
.editor{display:grid;gap:18px;margin-top:24px}.editor-heading,.game-heading,.saved,.save-row,.section-heading{display:flex;justify-content:space-between;gap:12px;align-items:center}.editor-heading h2{margin:0;font:1.55rem var(--font-display);color:var(--matcha-leaf)}.dirty-note{margin:4px 0 0;color:#855e22;font-size:.82rem}
.editor-fields{display:grid;gap:18px;min-width:0;margin:0;padding:0;border:0}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px}.editor label{display:grid;gap:6px;font-size:.86rem}.editor input:not([type=checkbox]),.editor select,.editor textarea{width:100%;min-width:0;min-height:44px;padding:10px;border:1px solid var(--line);border-radius:6px;font:inherit}.editor textarea{min-height:auto}.editor input:focus-visible,.editor select:focus-visible,.editor textarea:focus-visible{outline:2px solid var(--gold-leaf);outline-offset:1px}
.game{padding:0;overflow:hidden}.game-summary{display:flex;align-items:center;min-height:62px;padding:15px 20px;color:var(--matcha-leaf);font-weight:700}.game-summary span{display:grid;gap:3px}.game-summary small{font-size:.78rem;color:var(--muted);font-weight:400}.game-content{display:grid;gap:14px;padding:0 20px 20px}.game-heading h3,.story h3{margin:0;color:var(--matcha-leaf)}.game-actions{display:flex;flex-wrap:wrap;gap:8px}.section-heading h4{margin:0}.player-card{display:grid;grid-template-columns:minmax(160px,1.2fr) minmax(160px,1fr) auto minmax(130px,1fr) auto;gap:10px;align-items:end;padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-soft)}.player-card .check-label{padding:10px 0}.check-label{display:flex!important;align-items:center;gap:8px}.check-label input{width:18px;height:18px;accent-color:var(--matcha-leaf)}
.photo-list{display:grid;gap:9px}.photo-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:10px;border:1px solid var(--line);border-radius:8px}.photo-row img,.photo-placeholder{width:76px;height:60px;object-fit:cover;border-radius:5px}.photo-placeholder{display:grid;place-items:center;padding:4px;background:var(--surface-soft);color:var(--muted);font-size:.7rem;text-align:center}.story{display:grid;gap:14px}.add-game{justify-self:start}.save-row{justify-content:flex-start;flex-wrap:wrap}.save-row .message{margin:0}.admin-primary{background:var(--matcha-leaf);color:#fff;border-color:var(--matcha-leaf);padding:12px 18px;font-weight:700}.admin-primary:disabled,button:disabled{opacity:.65;cursor:wait}.saved{margin:10px 0}.saved span{display:block;color:var(--muted)}.message{padding:12px;background:var(--surface-soft)}.message.error{color:#913f45;background:#fbf0ef}.empty-note{color:var(--muted);font-size:.88rem}
button{min-height:42px;padding:8px 12px;border:1px solid var(--line);background:var(--white-pure);border-radius:6px;cursor:pointer;font:inherit}.saved-section h2{font:1.55rem var(--font-display);color:var(--matcha-leaf)}
@media(max-width:900px){.player-card{grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))}.player-card .check-label{align-self:center}.remove-player{justify-self:start}}
@media(max-width:720px){.clocktower-admin .admin-card{padding:16px}.player-card{grid-template-columns:minmax(0,1fr)}.player-card .check-label{padding:2px 0}.game-heading,.saved,.editor-heading,.section-heading{align-items:flex-start;flex-wrap:wrap}.game-content{padding:0 14px 16px}.game-actions{width:100%}.game-actions button{flex:1}.photo-row{align-items:flex-start}.photo-row label{flex:1 1 150px}.editor-heading>button{width:100%}}
</style>
