<template>
  <main><p class="eyebrow">Community sessions</p><h1>Blood on the Clocktower</h1><p>Log games, share the best moment and keep the next gathering easy to find.</p>
    <p v-if="error" class="message" role="alert">{{ error }}</p>
    <form class="editor admin-card" @submit.prevent="save(false)">
      <div class="editor-heading"><h2>{{ draft.id ? 'Edit gathering' : 'Log a gathering' }}</h2><button v-if="draft.id || hasEdits" type="button" @click="startNew">New gathering</button></div>
      <div class="fields"><label>Date<input v-model="draft.session_date" type="date" required></label><label>Time<input v-model="draft.session_time" type="time"></label><label>Venue<input v-model="draft.venue" maxlength="160"></label><label>Signup link<input v-model="draft.signup_url" type="url" placeholder="https://…"></label></div>
      <label>First timer note<textarea v-model="draft.first_timer_note" rows="2" placeholder="What should a first timer know?"></textarea></label>
      <section v-for="(game,index) in draft.games" :key="game.id" class="game admin-card"><div class="game-heading"><h3>Game {{ index + 1 }}</h3><button v-if="index > 0" type="button" @click="copyRoster(index)">Copy previous roster</button><button type="button" @click="draft.games.splice(index,1)">Remove</button></div>
        <div class="fields"><label>Script<input v-model="game.script" required placeholder="Trouble Brewing or custom"></label><label>Outcome<select v-model="game.outcome"><option value="">Choose result</option><option>Good wins</option><option>Evil wins</option><option>No result</option><option>Unknown</option></select></label></div>
        <label>Characters on this script<input v-model="game.script_characters" placeholder="Washerwoman, Librarian, Investigator…"></label>
        <h4>Players and characters</h4><div v-for="(player,p) in game.players" :key="p" class="player-row"><input v-model="player.name" list="clocktower-players" placeholder="Player name" required><input v-model="player.character" :list="'clocktower-characters-' + game.id" placeholder="Character"><label><input v-model="player.died" type="checkbox"> Died</label><input v-model="player.final_status" placeholder="Final status (optional)"><button type="button" @click="game.players.splice(p,1)">Remove</button></div>
        <datalist id="clocktower-players"><option v-for="player in players" :key="player.id" :value="player.private_name" /></datalist><datalist :id="'clocktower-characters-' + game.id"><option v-for="character in characters(game)" :key="character" :value="character" /></datalist>
        <button type="button" @click="game.players.push(newPlayer())">Add player</button>
        <label>Game notes<textarea v-model="game.notes" rows="2"></textarea></label>
        <label>Photos<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple @change="uploadPhotos($event,game)"></label><p v-for="photo in game.photos" :key="photo.path" class="photo-row"><img :src="photo.preview" alt="Upload preview"><label><input v-model="photo.approved" type="checkbox"> Approved to publish</label><label><input v-model="photo.cover" type="checkbox"> Cover</label><button type="button" @click="removePhoto(game,photo)">Remove photo</button></p>
      </section>
      <button type="button" @click="addGame">Add game</button>
      <section class="admin-card"><h3>Meetup story</h3><label>Teaser<input v-model="draft.teaser" maxlength="240" placeholder="A spoiler free hook"></label><label>Mika’s retelling<textarea v-model="draft.recap" rows="4" maxlength="3000" placeholder="What did the town believe? What changed? What did everyone talk about?"></textarea></label><label><input v-model="draft.published" type="checkbox"> Publish this gathering</label></section>
      <div class="save-row"><button class="admin-primary" type="submit" :disabled="saving">{{ saving ? 'Saving gathering…' : draft.published ? 'Save and publish' : 'Save draft' }}</button><p v-if="notice" class="message" role="status">{{ notice }}</p></div>
    </form>
    <section class="admin-section"><h2>Saved gatherings</h2><article v-for="session in saved" :key="session.id" class="admin-card saved"><div><strong>{{ session.session_date }} · {{ session.venue || 'Saujana' }}</strong><span>{{ session.published ? 'Published' : 'Draft' }}</span></div><button type="button" @click="edit(session)">Edit</button></article></section>
  </main>
</template>
<script setup>
definePageMeta({ layout: 'admin' })
const config=useRuntimeConfig(),auth=useAdminAuth(),saved=ref([]),players=ref([]),saving=ref(false),error=ref(''),notice=ref('')
const endpoint=config.public.supabaseUrl+'/functions/v1/botc-archive'
const draft=ref(emptySession())
const hasEdits=computed(()=>Boolean(draft.value.games.length||draft.value.venue||draft.value.signup_url||draft.value.teaser||draft.value.recap))
function emptySession(){return{id:null,session_date:new Date().toLocaleDateString('en-CA'),session_time:'',venue:'',signup_url:'',first_timer_note:'',teaser:'',recap:'',published:false,games:[]}}
function newPlayer(){return{name:'',public_name:'',character:'',alignment:'',died:false,final_status:''}}
function addGame(){draft.value.games.push({id:crypto.randomUUID(),script:'Trouble Brewing',script_characters:'Washerwoman, Librarian, Investigator, Chef, Empath, Fortune Teller, Undertaker, Monk, Ravenkeeper, Virgin, Slayer, Soldier, Mayor, Butler, Drunk, Recluse, Saint, Poisoner, Spy, Scarlet Woman, Baron, Imp',outcome:'',notes:'',players:[],photos:[]})}
function characters(game){return (game.script_characters||'').split(',').map(x=>x.trim()).filter(Boolean)}
async function call(action,extra={}){const response=await auth.authenticatedFetch(endpoint,{method:'POST',headers:{apikey:config.public.supabaseKey,'Content-Type':'application/json'},body:JSON.stringify({action,...extra})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Request failed');return body}
async function load(){try{const result=await call('admin');saved.value=result.sessions;players.value=result.players}catch(e){error.value=e.message}}
function edit(session){draft.value=JSON.parse(JSON.stringify(session));draft.value.id=session.id;draft.value.session_date=session.session_date;notice.value=''}
function startNew(){if(hasEdits.value&&!window.confirm('Start a new gathering? Unsaved changes will be cleared.'))return;draft.value=emptySession();notice.value='';error.value=''}
function copyRoster(index){if(index<1)return;draft.value.games[index].players=JSON.parse(JSON.stringify(draft.value.games[index-1].players.map(p=>({...p,character:'',alignment:'',died:false,final_status:''}))))}
async function save(publish){saving.value=true;error.value='';notice.value='';try{draft.value.published=publish||draft.value.published;const result=await call('save',{session:draft.value});draft.value=JSON.parse(JSON.stringify(result.session));await load();notice.value=draft.value.published?'Gathering published.':'Draft saved.'}catch(e){error.value=e.message}finally{saving.value=false}}
async function uploadPhotos(event,game){error.value='';for(const file of event.target.files||[]){if(file.size>8*1024*1024){error.value='Choose photos smaller than 8 MB.';continue}try{const path=auth.session.value.user.id+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const response=await auth.authenticatedFetch(config.public.supabaseUrl+'/storage/v1/object/botc-session-photos/'+path,{method:'POST',headers:{apikey:config.public.supabaseKey,'Content-Type':file.type,'x-upsert':'false'},body:file});if(!response.ok)throw new Error('Photo upload failed. Check the file and try again.');game.photos.push({path,approved:false,cover:false,preview:URL.createObjectURL(file)})}catch(e){error.value=e.message}}event.target.value=''}
async function removePhoto(game,photo){if(photo.path)try{await call('delete_photo',{path:photo.path})}catch(e){error.value=e.message;return}game.photos=game.photos.filter(x=>x!==photo)}
onMounted(async()=>{await load()})
</script>
<style scoped>
.editor input:not([type=checkbox]),.editor select,.editor textarea{min-height:44px}
.editor textarea{min-height:auto}
.player-row label{display:flex;align-items:center}
.photo-row{flex-wrap:wrap}
button{min-height:42px}
.admin-primary{background:var(--matcha-leaf);color:#fff;border-color:var(--matcha-leaf);padding:12px 18px;font-weight:700}
.admin-primary:disabled{opacity:.65;cursor:wait}
@media(max-width:720px){.player-row{grid-template-columns:minmax(0,1fr)}}
.editor{display:grid;gap:18px;margin-top:24px}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.editor label{display:grid;gap:6px;font-size:.86rem}.editor input:not([type=checkbox]),.editor select,.editor textarea{width:100%;min-width:0;padding:10px;border:1px solid var(--line);border-radius:6px;font:inherit}.game{display:grid;gap:14px}.game-heading,.saved,.editor-heading,.save-row{display:flex;justify-content:space-between;gap:12px;align-items:center}.save-row{justify-content:flex-start;flex-wrap:wrap}.save-row .message{margin:0}.player-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr)) auto auto auto;gap:8px;align-items:center;margin:8px 0}.photo-row{display:flex;gap:12px;align-items:center}.photo-row img{width:65px;height:55px;object-fit:cover}.saved{margin:10px 0}.saved span{display:block;color:var(--muted)}.message{padding:12px;background:var(--surface-soft)}button{padding:8px 12px;border:1px solid var(--line);background:var(--white-pure);border-radius:6px;cursor:pointer}@media(max-width:720px){.player-row{grid-template-columns:1fr 1fr}.game-heading,.saved{align-items:flex-start;flex-wrap:wrap}}
</style>
