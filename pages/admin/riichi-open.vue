<template>
  <section class="riichi-admin">
    <div class="event-admin-heading"><div><p class="eyebrow">Event management</p><h1>Riichi Open I</h1></div><NuxtLink to="/riichi-open?tab=standings" target="_blank" class="public-event-link">Public standings ↗</NuxtLink></div>
    <p class="admin-lede">Manage the roster, payment checks and round records. Public scores change only when you certify a complete round.</p>
    <p v-if="error" class="admin-error" role="alert">{{ error }}</p><p v-if="message" class="admin-status" role="status">{{ message }}</p>
    <p v-if="busy" class="admin-status" role="status">Saving event changes…</p>
    <p v-if="backgroundSaveCount" class="admin-status save-progress" role="status" aria-live="polite">Saving {{ backgroundSaveCount }} {{ backgroundSaveCount === 1 ? 'change' : 'changes' }}…</p>
    <div v-if="loading" class="admin-card" role="status">Loading tournament records…</div>
    <div v-else-if="!data" class="admin-card"><p>Tournament records could not be loaded.</p><button class="admin-action" @click="load">Try again</button></div>
    <fieldset v-else-if="data" class="event-admin-workspace">
      <legend class="sr-only">Riichi Open management</legend>
      <section class="overview-grid">
        <article class="admin-card"><span>Event stage</span><strong>{{ humanize(data.event.stage) }}</strong></article>
        <article class="admin-card"><span>Places in use</span><strong>{{ usedPlaces }} / {{ data.event.capacity }}</strong></article>
        <article class="admin-card"><span>Awaiting payment check</span><strong>{{ pendingCount }}</strong></article>
        <article class="admin-card"><span>Registration</span><strong>{{ data.event.registration_open?'Open':'Closed' }}</strong></article>
      </section>

      <div class="event-workflow"><div><span class="eyebrow">Next action</span><h2>{{ nextTask.title }}</h2><p>{{ nextTask.description }}</p><a :href="`#${nextTask.section}`">{{ nextTask.label }} →</a></div><label>Jump to section<select aria-label="Jump to event management section" @change="jumpTo($event.target.value)"><option value="">Choose a section…</option><option value="registrations">Payment checks</option><option value="participants">Participants & check-in</option><option value="tables">Table scores</option><option value="results">Penalties</option><option value="certification">Round certification</option><option value="history">History & export</option></select></label></div>

      <section id="overview" class="admin-section"><div class="section-title"><div><p class="eyebrow">Overview</p><h2>Event controls</h2></div><button v-if="!rosterLocked" class="admin-action" @click="toggleRegistration">{{ data.event.registration_open?'Close registration':'Open registration' }}</button></div><p class="admin-lede">Saturday, 14 November 2026 · 2:30 pm · Boardroom Bandit, Ara Damansara · RM10 · Winner’s prize</p></section>

      <section id="registrations" class="admin-section"><p class="eyebrow">Payment checks</p><h2>Registrations</h2><div v-if="!data.registrations.length" class="admin-card">No registrations yet.</div><div v-else class="registration-admin-list"><article v-for="registration in data.registrations" :key="registration.id" class="admin-card registration-card"><div class="registration-top"><div><h3>{{ registration.display_name }}</h3><span :class="['admin-badge',`status-${registration.status}`]">{{ humanize(registration.status) }}</span><small>Submitted {{ formatDate(registration.submitted_at) }} · Ref {{ registration.id.slice(0,8).toUpperCase() }}</small></div><button v-if="registration.receipt_path" class="admin-action secondary" @click="previewReceipt(registration)">View receipt</button><span v-else class="missing-receipt">No receipt</span></div><textarea v-model="registrationNotes[registration.id]" rows="2" maxlength="2000" placeholder="Private organiser note" :aria-label="`Private note for ${registration.display_name}`" :disabled="rosterLocked"></textarea><p v-if="registrationNoteConflicts[registration.id]" class="admin-error" role="alert">Another organiser changed this note. Choose which version to keep before changing payment status or saving.</p><div v-if="registrationNoteConflicts[registration.id]" class="action-row"><button class="admin-action secondary" @click="resolveRegistrationNoteConflict(registration,'latest')">Use latest note</button><button class="admin-action" @click="resolveRegistrationNoteConflict(registration,'local')">Keep my note</button></div><button v-if="!rosterLocked" class="admin-action secondary" :disabled="busy || registrationNoteConflicts[registration.id] || !registrationNoteIsDirty(registration)" @click="saveRegistrationNote(registration)">Save private note</button><div v-if="!rosterLocked" class="action-row"><button class="admin-action" :disabled="busy || registrationNoteConflicts[registration.id] || registration.status === 'verified'" @click="setRegistration(registration,'verified')">Verify payment</button><button class="admin-action secondary" :disabled="busy || registrationNoteConflicts[registration.id]" @click="setRegistration(registration,'needs_clarification')">Ask for clarification</button><button class="admin-action danger" :disabled="busy || registrationNoteConflicts[registration.id]" @click="setRegistration(registration,'rejected')">Reject</button><button class="admin-action secondary" :disabled="busy || registrationNoteConflicts[registration.id]" @click="setRegistration(registration,'cancelled')">Cancel</button></div></article></div></section>

      <section id="participants" class="admin-section"><div class="section-title"><div><p class="eyebrow">Roster</p><h2>Participants and check-in</h2></div></div><p v-if="rosterLocked" class="locked-note">The playing roster is locked because the tournament has started.</p><p v-if="participantConflictIds.length" class="admin-error" role="alert">Some roster details changed in another session. Your edits are preserved. Reload the roster before saving those rows.</p><button v-if="participantConflictIds.length" class="admin-action secondary" @click="load({ resetParticipantEdits:true })">Reload roster and discard local roster edits</button><p v-if="!rosterLocked" class="save-hint">Check-in and eligibility save as soon as you change them. Names save when you leave the field.</p><form v-if="!rosterLocked" class="admin-card admin-form-row add-player" @submit.prevent="addParticipant"><label>Name<input v-model="newParticipant.name" maxlength="80" required></label><label class="inline-check"><input v-model="newParticipant.verified" type="checkbox"> Payment checked</label><label v-if="newParticipant.verified">Verification reason<input v-model="newParticipant.reason" required placeholder="e.g. cash checked in person"></label><button class="admin-action">Add participant</button></form><div class="admin-table-wrap admin-card"><table class="admin-table roster-table"><thead><tr><th>Participant</th><th>Payment</th><th>Checked in</th><th>Substitute</th><th>Final eligible</th><th>Save status</th></tr></thead><tbody><tr v-for="person in data.participants" :key="person.id"><td data-label="Participant"><input :disabled="rosterLocked" v-model="participantEdits[person.id].display_name" maxlength="80" aria-label="Participant name" @blur="saveParticipant(person)"></td><td data-label="Payment">{{ paymentStatus(person) }}</td><td data-label="Checked in"><input :disabled="rosterLocked" v-model="participantEdits[person.id].checked_in" type="checkbox" aria-label="Checked in" @change="saveParticipant(person)"></td><td data-label="Substitute"><input :disabled="rosterLocked" v-model="participantEdits[person.id].is_substitute" type="checkbox" aria-label="Substitute" @change="saveParticipant(person)"></td><td data-label="Final eligible"><input v-model="participantEdits[person.id].eligible_for_final" type="checkbox" :disabled="rosterLocked || participantEdits[person.id].is_substitute" aria-label="Eligible for final" @change="saveParticipant(person)"></td><td data-label="Save status"><span v-if="rosterLocked" class="locked-note">Locked</span><button v-else-if="participantSaveStates[person.id] === 'error'" type="button" class="inline-save-state save-error retry-save" @click="saveParticipant(person)">Could not save · retry</button><span v-else class="inline-save-state" :class="`save-${participantSaveStates[person.id] || 'saved'}`" role="status">{{ participantSaveLabel(person.id) }}</span></td></tr></tbody></table></div><div v-if="!rosterLocked" class="draw-readiness"><p><strong>{{ checkedInCount }}</strong> verified players checked in · {{ canDrawFirstRound ? 'Ready for tables of four' : 'Check in 4, 8, 12 or 16 players to draw' }}</p><button class="admin-action" :disabled="!canDrawFirstRound || backgroundSaveCount > 0" @click="drawFirstRound">Draw Qualifier 1 tables and seats</button></div></section>

      <section id="tables" class="admin-section"><p class="eyebrow">Assignments</p><h2>Tables and seating</h2><p class="admin-lede">Published assignments appear on public standings. Complete, balanced tables save automatically as private drafts. Scores appear publicly only after you certify the round.</p><div v-if="revisionConflict" class="admin-error" role="alert"><p>Another organiser changed this round. Your score entries are preserved. Choose how to continue before saving again.</p><div class="action-row"><button class="admin-action secondary" @click="resolveRoundConflict(false)">Use the latest saved scores</button><button class="admin-action" @click="resolveRoundConflict(true)">Keep my entries and continue</button></div></div><div v-if="!data.rounds.length" class="admin-card">Draw the first round after the verified roster is checked in.</div><article v-for="round in data.rounds" :key="round.id" class="round-card admin-card"><div class="section-title"><h3>{{ humanize(round.round_key) }}</h3><span class="admin-badge">{{ humanize(round.status) }} · revision {{ round.draft_revision }}</span></div><div class="round-tables"><section v-for="table in tablesFor(round)" :key="table.id" class="table-editor"><h4>Table {{ table.table_number }} <small :class="{ 'draft-dirty': tableStatus(table).dirty }">{{ round.status === 'certified' ? 'Certified · locked' : tableSaveStates[table.id] === 'saving' ? 'Saving…' : tableSaveStates[table.id] === 'error' ? 'Save failed' : tableStatus(table).dirty ? 'Unsaved changes' : tableStatus(table).saved ? 'Draft saved' : 'No results yet' }}</small></h4><div v-for="seat in seatsFor(table)" :key="seat.participant_id" class="seat-row"><span>{{ seat.seat_wind }}</span><strong>{{ participantName(seat.participant_id) }}</strong><input v-if="round.status!=='certified'" v-model.number="scores[table.id][seat.participant_id]" type="number" step="100" inputmode="numeric" placeholder="Raw points" :aria-label="`${participantName(seat.participant_id)} raw points`" @input="scheduleTableSave(round,table)"><span v-else>{{ pointsFor(table,seat.participant_id) }}</span></div><label v-if="round.status!=='certified'" class="sticks-label">Unclaimed sticks <input v-model.number="sticks[table.id]" type="number" min="0" max="100" step="1" @input="scheduleTableSave(round,table)"></label><div v-if="round.status !== 'certified'" class="table-balance" :class="{ balanced: tableStatus(table).valid }"><span>Points + sticks</span><strong>{{ tableStatus(table).total.toLocaleString('en-MY') }} / 120,000</strong><small>{{ !tableStatus(table).complete ? 'Enter all four scores in multiples of 100.' : tableStatus(table).valid ? 'Balanced · saving automatically' : 'Check points and unclaimed sticks before saving.' }}</small></div><p v-if="round.status !== 'certified' && tableStatus(table).valid" class="preview-line">Score preview · {{ tablePreview(table) }}</p><button v-if="round.status!=='certified' && tableSaveStates[table.id] === 'error'" class="admin-action secondary" :disabled="revisionConflict" @click="saveTable(round,table)">Retry table save</button></section></div></article></section>

      <section id="results" class="admin-section"><p class="eyebrow">Scoring record</p><h2>Penalties</h2><p class="admin-lede">Enter raw scores in the table editors above. Use this section only for a tournament-point penalty, with a reason for the audit trail.</p><p v-if="!activeRounds.length" class="locked-note">Penalties can be entered while a round is active.</p><form v-else class="admin-card admin-form-row" @submit.prevent="recordPenalty"><label>Round<select v-model="penalty.round_id"><option v-for="round in activeRounds" :key="round.id" :value="round.id">{{ humanize(round.round_key) }}</option></select></label><label>Participant<select v-model="penalty.participant_id" required><option value="">Choose a seated player</option><option v-for="person in penaltyParticipants" :key="person.id" :value="person.id">{{ person.display_name }}</option></select></label><label>Penalty points<input v-model.number="penalty.points" type="number" min="0" step="0.1" required></label><label>Reason<input v-model="penalty.reason" required maxlength="500"></label><button class="admin-action">Record penalty</button></form><p class="admin-lede">Chombo is entered as 30.0 tournament points. Penalties stay separate from mahjong points.</p></section>

      <section id="certification" class="admin-section"><p class="eyebrow">Finish a complete round</p><h2>Round certification</h2><p class="admin-lede">Certification checks all expected tables in one transaction, locks the round and publishes its results.</p><p class="admin-lede">Any qualifying ties are resolved automatically by secure random draw when you prepare the next round.</p><article v-for="round in data.rounds" :key="`cert-${round.id}`" class="admin-card certify-row"><div><strong>{{ humanize(round.round_key) }}</strong><span>{{ resultCount(round) }} of {{ round.expected_tables*4 }} player scores saved</span><small v-if="round.status !== 'certified'">{{ canCertify(round) ? 'All tables saved. Ready for final review.' : 'Save every table, including any unsaved edits, before certifying.' }}</small></div><button v-if="round.status!=='certified'" class="admin-action" :disabled="!canCertify(round)" @click="certify(round)">Certify whole round</button><span v-else class="verified-badge">Certified {{ formatDate(round.certified_at) }}</span></article><button v-if="data.event.stage==='qualifier_2'&&!data.rounds.some(r=>r.round_key==='qualifier_2')&&data.rounds.some(r=>r.round_key==='qualifier_1'&&r.status==='certified')" class="admin-action" @click="prepareNext('qualifier_2')" :disabled="busy || tieDrawInProgress">Prepare Qualifier 2 snake tables</button><button v-if="data.event.stage==='final'&&!data.rounds.some(r=>r.round_key==='final')&&data.rounds.some(r=>r.round_key==='qualifier_2'&&r.status==='certified')" class="admin-action" @click="prepareNext('final')" :disabled="busy || tieDrawInProgress">Prepare Top 4 final table</button><p v-if="tieDrawInProgress" class="admin-status" role="status">Drawing tied players at random and recording the public order…</p></section>

      <section id="history" class="admin-section"><p class="eyebrow">Audit trail</p><h2>History and exports</h2><button class="admin-action secondary" @click="exportData">Download organiser export</button><ul class="audit-list"><li v-for="entry in data.audit" :key="entry.id"><strong>{{ humanize(entry.action) }}</strong><span>{{ entry.entity_type }} · {{ formatDate(entry.created_at) }}</span><small>{{ entry.reason || entry.entity_id }}</small></li></ul></section>
    </fieldset>
    <dialog ref="receiptDialog" class="receipt-dialog" aria-labelledby="receipt-preview-title" @click="closeReceiptBackdrop" @close="preview=null"><template v-if="preview"><div class="receipt-title"><div><p class="eyebrow">Payment receipt</p><h2 id="receipt-preview-title">{{ preview.name }}</h2></div><button class="close-preview" aria-label="Close receipt preview" @click="receiptDialog.close()">×</button></div><img v-if="preview.mime?.startsWith('image/')" :src="preview.url" :alt="`Payment receipt for ${preview.name}`"><iframe v-else :src="preview.url" title="Private payment receipt PDF"></iframe><a :href="preview.url" target="_blank" rel="noreferrer">Open receipt in a new tab ↗</a></template></dialog>
    <dialog ref="certificationDialog" class="certification-dialog" aria-labelledby="certification-title" @close="certificationRound=null">
      <template v-if="certificationRound"><p class="eyebrow">Final review</p><h2 id="certification-title">Certify {{ humanize(certificationRound.round_key) }}?</h2><p>All {{ certificationRound.expected_tables * 4 }} player scores across {{ certificationRound.expected_tables }} tables are saved.</p><div class="certification-warning"><strong>This publishes the whole round.</strong><p>The scores become visible on public standings and the round is locked for editing.</p></div><p v-if="error" class="admin-error" role="alert">{{ error }}</p><div class="action-row"><button class="admin-action secondary" :disabled="busy" @click="certificationDialog.close()">Keep reviewing</button><button class="admin-action" :disabled="busy" @click="confirmCertification">{{ busy ? 'Publishing…' : 'Certify & publish' }}</button></div></template>
    </dialog>
  </section>
</template>

<script setup>
import { scoreFourPlayerTable } from '~/utils/riichiOpenScoring.js'
definePageMeta({layout:'admin'})
useHead({title:'Riichi Open admin | Saujana BGC',meta:[{name:'robots',content:'noindex, nofollow, noarchive'}]})
const {callAdmin,callPublic}=useRiichiOpen(),route=useRoute()
const data=ref(null),loading=ref(true),busy=ref(false),error=ref(''),message=ref(''),preview=ref(null)
const registrationNotes=reactive({}),savedRegistrationNotes=reactive({}),registrationNoteConflicts=reactive({}),participantEdits=reactive({}),savedParticipantEdits=reactive({}),participantConflicts=reactive({}),participantSaveStates=reactive({}),scores=reactive({}),sticks=reactive({}),tableSaveStates=reactive({})
const newParticipant=reactive({name:'',verified:false,reason:''}),penalty=reactive({round_id:'',participant_id:'',points:0,reason:''})
const tieDrawInProgress=ref(false)
const receiptDialog = ref(null)
const certificationDialog = ref(null)
const certificationRound = ref(null)
const revisionConflict = ref(false)
const savedScores = reactive({})
const savedSticks = reactive({})
const participantSaveTasks = new Map()
const tableSaveTimers = new Map()
const roundSaveQueues = new Map()
const backgroundSaveCount = computed(() => Object.values(participantSaveStates).filter(state => state === 'saving').length + Object.values(tableSaveStates).filter(state => state === 'saving').length)
const rosterLocked = computed(() => data.value?.event.stage !== 'registration')
const activeRounds = computed(() => data.value?.rounds.filter(round => round.status !== 'certified') ?? [])
const penaltyParticipants = computed(() => { const ids = new Set(data.value?.seats.filter(seat => seat.round_id === penalty.round_id).map(seat => seat.participant_id)); return data.value?.participants.filter(person => ids.has(person.id)) ?? [] })
const checkedInCount = computed(() => data.value?.participants.filter(person => person.active && person.checked_in && paymentStatus(person) === 'verified').length ?? 0)
const canDrawFirstRound = computed(() => !rosterLocked.value && checkedInCount.value >= 4 && checkedInCount.value % 4 === 0)
const nextTask = computed(() => {
  if (!rosterLocked.value) return pendingCount.value ? { title: `${pendingCount.value} payment ${pendingCount.value === 1 ? 'check' : 'checks'} waiting`, description: 'Review receipts and verify payments before check-in.', section: 'registrations', label: 'Review registrations' } : { title: canDrawFirstRound.value ? 'Ready for the first draw' : 'Build the playing roster', description: `${checkedInCount.value} verified players checked in. Tables need groups of four.`, section: 'participants', label: 'Go to check-in' }
  const round = activeRounds.value[0]
  if (round) return { title: canCertify(round) ? `${humanize(round.round_key)} is ready to certify` : `${humanize(round.round_key)} scores in progress`, description: `${resultCount(round)} of ${round.expected_tables * 4} player scores saved. Certification locks the round and publishes its scores.`, section: canCertify(round) ? 'certification' : 'tables', label: canCertify(round) ? 'Review certification' : 'Enter table scores' }
  return data.value?.event.stage === 'completed' ? { title: 'The event is complete', description: 'All certified results are published. Download an organiser export for your records.', section: 'history', label: 'Download records' } : { title: 'Prepare the next round', description: 'The previous round is certified. Resolve any qualifying ties, then publish the next draw.', section: 'certification', label: 'Continue the event' }
})
const usedPlaces=computed(()=>Math.min(data.value?.event.capacity??16,(data.value?.registrations??[]).filter(r=>['pending','verified','needs_clarification'].includes(r.status)).length+(data.value?.active_holds??0)))
const pendingCount=computed(()=>data.value?.registrations.filter(r=>['pending','needs_clarification','payment_exception'].includes(r.status)).length??0)
const participantConflictIds=computed(()=>Object.keys(participantConflicts).filter(id=>participantConflicts[id]?.length))

onMounted(async()=>{await load();await nextTick();scrollToHash();window.addEventListener('beforeunload',guardUnsavedChanges)})
onBeforeUnmount(()=>{window.removeEventListener('beforeunload',guardUnsavedChanges);for(const timer of tableSaveTimers.values())clearTimeout(timer)})
onBeforeRouteLeave(()=>!hasUnsavedChanges()||window.confirm('Some edits have not been saved yet. Leave this page and discard them?'))
watch(()=>route.hash,async()=>{await nextTick();scrollToHash()})
watch(() => penalty.round_id, () => { penalty.participant_id = '' })
async function load(options = {}) {
  loading.value = !data.value
  error.value = ''
  try {
    const [latest,publicSummary] = await Promise.all([
      callAdmin('overview'),
      callPublic('summary').catch(() => null),
    ])
    const tieDraws=latest.tie_draws??[]
    for(const draw of publicSummary?.publication?.snapshot?.tie_draws??[]){
      const roundId=latest.rounds.find(round=>round.round_key===draw.round)?.id
      const participantIds=(draw.players??[]).map(player=>player.participant_id).filter(Boolean)
      if(!roundId||!participantIds.length)continue
      const alreadyLoaded=tieDraws.some(saved=>saved.round_id===roundId&&saved.participant_ids?.length===participantIds.length&&participantIds.every(id=>saved.participant_ids.includes(id)))
      if(!alreadyLoaded)tieDraws.push({round_id:roundId,participant_ids:participantIds})
    }
    latest.tie_draws=tieDraws
    for (const row of latest.registrations) {
      const latestNote=String(row.private_note??''),currentNote=String(registrationNotes[row.id]??''),savedNote=savedRegistrationNotes[row.id]
      if(savedNote===undefined||currentNote.trim()===String(savedNote).trim()){
        registrationNotes[row.id]=latestNote
        savedRegistrationNotes[row.id]=latestNote
        delete registrationNoteConflicts[row.id]
      }else{
        if(latestNote.trim()!==String(savedNote).trim()&&latestNote.trim()!==currentNote.trim())registrationNoteConflicts[row.id]=true
        savedRegistrationNotes[row.id]=latestNote
        if(currentNote.trim()===latestNote.trim())delete registrationNoteConflicts[row.id]
      }
    }
    const participantFields=['display_name','checked_in','is_substitute','eligible_for_final']
    for (const row of latest.participants) {
      const latestEdits=Object.fromEntries(participantFields.map(field=>[field,row[field]]))
      if(options.resetParticipantEdits||!savedParticipantEdits[row.id]) {
        participantEdits[row.id]={...latestEdits}
        savedParticipantEdits[row.id]={...latestEdits}
        delete participantConflicts[row.id]
        continue
      }
      const previous=savedParticipantEdits[row.id]
      const conflicts=new Set(participantConflicts[row.id]??[])
      for(const field of participantFields) {
        const wasDirty=!Object.is(participantEdits[row.id][field],previous[field])
        if(wasDirty&& !Object.is(latestEdits[field],previous[field]) && !Object.is(latestEdits[field],participantEdits[row.id][field])) conflicts.add(field)
        if(!wasDirty) participantEdits[row.id][field]=latestEdits[field]
        if(Object.is(latestEdits[field],participantEdits[row.id][field])) conflicts.delete(field)
      }
      savedParticipantEdits[row.id]={...latestEdits}
      if(conflicts.size) participantConflicts[row.id]=[...conflicts]
      else delete participantConflicts[row.id]
    }
    for (const table of latest.tables) {
      scores[table.id] ??= {}
      savedScores[table.id] ??= {}
      if (sticks[table.id] == null || Number(sticks[table.id]) === Number(savedSticks[table.id])) sticks[table.id] = table.unclaimed_sticks
      savedSticks[table.id] = table.unclaimed_sticks
      for (const result of latest.results.filter(row => row.table_id === table.id)) {
        const current = scores[table.id][result.participant_id]
        const previous = savedScores[table.id][result.participant_id]
        if (current === undefined || (previous !== undefined && Number(current) === Number(previous))) scores[table.id][result.participant_id] = result.raw_points
        savedScores[table.id][result.participant_id] = result.raw_points
      }
    }
    data.value = latest
    if (!activeRounds.value.some(round => round.id === penalty.round_id)) penalty.round_id = activeRounds.value[0]?.id ?? ''
    if (!penaltyParticipants.value.some(person => person.id === penalty.participant_id)) penalty.participant_id = ''
  } catch (cause) { error.value = cause.message }
  finally { loading.value = false }
}
async function act(action,payload={}){if(busy.value)return null;busy.value=true;error.value='';message.value='';try{if(action==='penalty'){await flushRoundSaves(payload.round_id);if(revisionConflict.value)return null;const round=data.value?.rounds.find(item=>item.id===payload.round_id);payload={...payload,revision:round?.draft_revision??payload.revision}}const result=await callAdmin(action,payload);await load();return result}catch(cause){error.value=cause.message;if(/round changed|reload before editing/i.test(cause.message)){revisionConflict.value=true;await load();error.value='Another organiser changed this round. Your entries are preserved; review the latest saved scores before continuing.'}return null}finally{busy.value=false}}
async function toggleRegistration(){const result=await act('registration_open',{open:!data.value.event.registration_open});if(result)message.value=`Registration ${data.value.event.registration_open?'opened':'closed'}.`}
async function previewReceipt(registration){try{const result=await callAdmin('receipt_url',{path:registration.receipt_path});preview.value={url:result.url,mime:registration.receipt_mime,name:registration.display_name};await nextTick();receiptDialog.value?.showModal()}catch(cause){error.value=cause.message}}
function closeReceiptBackdrop(event){if(event.target===receiptDialog.value)receiptDialog.value.close()}
function jumpTo(id){if(id)document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}
async function setRegistration(registration,status){if(registrationNoteConflicts[registration.id])return;const sourceNote=String(registrationNotes[registration.id]??''),note=sourceNote.trim().slice(0,2000);if(status==='verified'&&!registration.receipt_path&&note.trim().length<4){error.value='Add a private reason before verifying a registration without a receipt.';return}const result=await act('registration_status',{registration_id:registration.id,status,private_note:note,manual_verification:status==='verified'&&!registration.receipt_path});if(result){commitRegistrationNote(registration,note,sourceNote);message.value=`${registration.display_name}: ${humanize(status)}.`}}
function registrationNoteIsDirty(registration){return String(registrationNotes[registration.id]??'').trim()!==String(savedRegistrationNotes[registration.id]??'').trim()}
function commitRegistrationNote(registration,note,sourceNote=note){savedRegistrationNotes[registration.id]=note;if(String(registrationNotes[registration.id]??'')===sourceNote)registrationNotes[registration.id]=note;delete registrationNoteConflicts[registration.id]}
function resolveRegistrationNoteConflict(registration,choice){if(choice==='latest')registrationNotes[registration.id]=String(savedRegistrationNotes[registration.id]??'');delete registrationNoteConflicts[registration.id]}
async function saveRegistrationNote(registration){if(registrationNoteConflicts[registration.id])return;const sourceNote=String(registrationNotes[registration.id]??''),note=sourceNote.trim().slice(0,2000);const result=await act('registration_note',{registration_id:registration.id,private_note:note});if(result){commitRegistrationNote(registration,note,sourceNote);message.value=`Private note saved for ${registration.display_name}.`}}
async function addParticipant(){const result=await act('add_participant',{name:newParticipant.name,payment_verified:newParticipant.verified,reason:newParticipant.reason});if(result){message.value='Participant added.';newParticipant.name='';newParticipant.reason='';newParticipant.verified=false}}
function participantSaveLabel(id){const state=participantSaveStates[id];if(state==='saving')return'Saving…';if(state==='error')return'Could not save';if(participantConflicts[id]?.length)return'Reload needed';const current=participantEdits[id],saved=savedParticipantEdits[id];return current&&saved&&Object.keys(saved).some(field=>!Object.is(current[field],saved[field]))?'Unsaved':'Saved'}
async function saveParticipant(person){
  if(rosterLocked.value||participantConflicts[person.id]?.length)return
  if(participantSaveTasks.has(person.id))return participantSaveTasks.get(person.id)
  const current=participantEdits[person.id],saved=savedParticipantEdits[person.id]??{}
  if(current.is_substitute)current.eligible_for_final=false
  if(!['display_name','checked_in','is_substitute','eligible_for_final'].some(field=>!Object.is(current[field],saved[field]))){participantSaveStates[person.id]='saved';return}
  const task=(async()=>{
    participantSaveStates[person.id]='saving'
    try{
      while(true){
        const current=participantEdits[person.id],saved=savedParticipantEdits[person.id]??{}
        if(current.is_substitute)current.eligible_for_final=false
        const patch=Object.fromEntries(['display_name','checked_in','is_substitute','eligible_for_final'].filter(field=>!Object.is(current[field],saved[field])).map(field=>[field,current[field]]))
        if(!Object.keys(patch).length)break
        const original={...patch},sent={...patch}
        if(typeof sent.display_name==='string')sent.display_name=sent.display_name.trim()
        await callAdmin('participant_update',{participant_id:person.id,...sent,reason:'Roster update'})
        const latest={...saved,...sent}
        savedParticipantEdits[person.id]=latest
        const row=data.value.participants.find(item=>item.id===person.id)
        if(row)Object.assign(row,latest)
        if(row?.registration_id){const registration=data.value.registrations.find(item=>item.id===row.registration_id);if(registration&&sent.display_name)registration.display_name=sent.display_name}
        for(const field of Object.keys(sent))if(Object.is(participantEdits[person.id][field],original[field]))participantEdits[person.id][field]=sent[field]
      }
      participantSaveStates[person.id]='saved'
      error.value=''
    }catch(cause){
      participantSaveStates[person.id]='error'
      error.value=cause.message
      if(/roster is locked/i.test(cause.message))await load()
    }finally{participantSaveTasks.delete(person.id)}
  })()
  participantSaveTasks.set(person.id,task)
  return task
}
function hasUnsavedChanges(){
  const rosterDirty=data.value?.participants.some(person=>{const current=participantEdits[person.id],saved=savedParticipantEdits[person.id];return current&&saved&&Object.keys(saved).some(field=>!Object.is(current[field],saved[field]))})
  const scoreDirty=data.value?.tables.some(table=>tableStatus(table).dirty)
  const noteDirty=data.value?.registrations.some(registration=>registrationNoteIsDirty(registration))
  return Boolean(rosterDirty||scoreDirty||noteDirty||backgroundSaveCount.value||tableSaveTimers.size||participantSaveTasks.size)
}
function guardUnsavedChanges(event){if(!hasUnsavedChanges())return;event.preventDefault();event.returnValue=''}
async function drawFirstRound(){const result=await act('generate_q1');if(result)message.value=`${result.players} players seated across ${result.tables} tables.`}
function tablesFor(round){return data.value.tables.filter(table=>table.round_id===round.id)}
function seatsFor(table){return data.value.seats.filter(seat=>seat.table_id===table.id).sort((a,b)=>['East','South','West','North'].indexOf(a.seat_wind)-['East','South','West','North'].indexOf(b.seat_wind))}
function participantName(id){return data.value.participants.find(person=>person.id===id)?.display_name??'Unknown participant'}
function pointsFor(table,id){return data.value.results.find(r=>r.table_id===table.id&&r.participant_id===id)?.raw_points??'—'}
function resultCount(round){return data.value.results.filter(result=>result.round_id===round.id).length}
function tableStatus(table) {
  const seats = seatsFor(table)
  const raw = seats.map(seat => scores[table.id]?.[seat.participant_id])
  const complete = seats.length === 4 && raw.every(value => value !== '' && value != null && Number.isInteger(Number(value)) && Number(value) % 100 === 0)
  const tableSticks = Number(sticks[table.id] ?? 0)
  const total = raw.reduce((sum,value) => sum + (Number.isFinite(Number(value)) ? Number(value) : 0),0) + tableSticks * 1000
  const saved = data.value.results.filter(result => result.table_id === table.id).length === 4
  const dirty = (raw.some((value,index) => value !== undefined && (value === '' || savedScores[table.id]?.[seats[index].participant_id] === undefined || Number(value) !== Number(savedScores[table.id][seats[index].participant_id]))) || tableSticks !== Number(savedSticks[table.id] ?? 0))
  return { complete, total, saved, dirty, valid: complete && total === 120000 && Number.isInteger(tableSticks) && tableSticks >= 0 && tableSticks <= 100 }
}
function canCertify(round){return round.status!=='certified'&&resultCount(round)===round.expected_tables*4&&tablesFor(round).every(table=>tableStatus(table).saved&&!tableStatus(table).dirty)}
function tablePreview(table){return scoreFourPlayerTable(seatsFor(table).map(seat=>({id:seat.participant_id,rawPoints:Number(scores[table.id][seat.participant_id])})),Number(sticks[table.id]??0)).map(row=>`${participantName(row.id)} ${row.score>=0?'+':''}${row.score.toFixed(1)}`).join(' · ')}
function scheduleTableSave(round,table){
  const existing=tableSaveTimers.get(table.id)
  if(existing)clearTimeout(existing)
  if(revisionConflict.value){tableSaveTimers.delete(table.id);tableSaveStates[table.id]='';return}
  if(!tableStatus(table).valid){tableSaveStates[table.id]='';tableSaveTimers.delete(table.id);return}
  tableSaveStates[table.id]='pending'
  const timer=setTimeout(()=>{tableSaveTimers.delete(table.id);saveTable(round,table)},650)
  tableSaveTimers.set(table.id,timer)
}
async function saveTable(round,table){
  if(!tableStatus(table).valid||revisionConflict.value)return
  const previous=roundSaveQueues.get(round.id)??Promise.resolve()
  const task=previous.catch(()=>{}).then(async()=>{
    if(!tableStatus(table).valid||revisionConflict.value)return
    const rawResults=seatsFor(table).map(seat=>({participant_id:seat.participant_id,raw_points:Number(scores[table.id]?.[seat.participant_id])}))
    const savedStickValue=Number(sticks[table.id]??0)
    const revision=Number(round.draft_revision)
    tableSaveStates[table.id]='saving'
    try{
      const response=await callAdmin('save_table',{round_id:round.id,table_id:table.id,revision,unclaimed_sticks:savedStickValue,results:rawResults})
      round.draft_revision=response.draft_revision
      const computed=scoreFourPlayerTable(rawResults.map(result=>({id:result.participant_id,rawPoints:result.raw_points})),savedStickValue)
      data.value.results=data.value.results.filter(result=>result.table_id!==table.id).concat(computed.map(result=>({round_id:round.id,table_id:table.id,participant_id:result.id,raw_points:result.rawPoints,placement:result.placement,uma:result.uma,score:result.score,first_place:result.firstPlace,fourth_place:result.fourthPlace})))
      for(const result of rawResults)savedScores[table.id][result.participant_id]=result.raw_points
      savedSticks[table.id]=savedStickValue
      tableSaveStates[table.id]='saved'
      error.value=''
      if(tableStatus(table).dirty)scheduleTableSave(round,table)
    }catch(cause){
      tableSaveStates[table.id]='error'
      error.value=cause.message
      if(/round changed|reload before editing/i.test(cause.message)){revisionConflict.value=true;await load();error.value='Another organiser changed this round. Your entries are preserved; review the latest saved scores before continuing.'}
    }
  })
  roundSaveQueues.set(round.id,task)
  return task
}
async function flushRoundSaves(roundId){
  const round=data.value?.rounds.find(item=>item.id===roundId)
  if(!round)return
  for(const table of tablesFor(round)){
    const timer=tableSaveTimers.get(table.id)
    if(timer){clearTimeout(timer);tableSaveTimers.delete(table.id)}
    if(tableStatus(table).valid&&tableStatus(table).dirty)await saveTable(round,table)
    if(revisionConflict.value)return
  }
  await roundSaveQueues.get(roundId)
}
function resolveRoundConflict(keepLocal){
  for(const [tableId,timer] of tableSaveTimers){clearTimeout(timer);tableSaveTimers.delete(tableId);if(tableSaveStates[tableId]==='pending')tableSaveStates[tableId]=''}
  if(!keepLocal){
    for(const table of data.value.tables){
      sticks[table.id]=table.unclaimed_sticks
      savedSticks[table.id]=table.unclaimed_sticks
      scores[table.id]??={}
      savedScores[table.id]??={}
      const results=data.value.results.filter(result=>result.table_id===table.id)
      for(const seat of seatsFor(table)){
        const raw=results.find(result=>result.participant_id===seat.participant_id)?.raw_points
        if(raw==null){delete scores[table.id][seat.participant_id];delete savedScores[table.id][seat.participant_id]}
        else {scores[table.id][seat.participant_id]=raw;savedScores[table.id][seat.participant_id]=raw}
      }
      tableSaveStates[table.id]=tableStatus(table).saved?'saved':''
    }
  }
  revisionConflict.value=false
  error.value=''
  if(keepLocal){
    for(const round of activeRounds.value)for(const table of tablesFor(round)){
      if(tableStatus(table).valid&&tableStatus(table).dirty)scheduleTableSave(round,table)
      else if(tableSaveStates[table.id]==='pending')tableSaveStates[table.id]=''
    }
  }
}
async function recordPenalty(){const round=data.value.rounds.find(r=>r.id===penalty.round_id);const result=await act('penalty',{...penalty,revision:round?.draft_revision??0});if(result){message.value='Penalty recorded.';penalty.reason='';penalty.points=0}}
async function certify(round){if(!canCertify(round))return;error.value='';certificationRound.value=round;await nextTick();certificationDialog.value?.showModal()}
async function confirmCertification(){const round=certificationRound.value;if(!round||!canCertify(round))return;const result=await act('certify_round',{round_id:round.id,revision:round.draft_revision});if(result){certificationDialog.value.close();message.value=`Round certified. Event moved to ${humanize(result.next_stage)}.`}}
async function prepareNext(roundKey){
  const sourceKey=roundKey==='qualifier_2'?'qualifier_1':roundKey==='final'?'qualifier_2':''
  const sourceRound=data.value?.rounds.find(row=>row.round_key===sourceKey&&row.status==='certified')
  if(tieDrawInProgress.value||busy.value)return
  tieDrawInProgress.value=true
  error.value=''
  message.value=''
  let drawnGroups=0
  try{
    let unresolved=sourceRound?getQualifyingTieGroups(sourceRound.id):[]
    if(unresolved.length&&!globalThis.crypto?.getRandomValues)throw new Error('Secure random draws are unavailable in this browser.')
    for(const group of unresolved){
      const order=secureRandomOrder(group.participant_ids)
      await callAdmin('record_tie_draw',{round_id:sourceRound.id,participant_ids:group.participant_ids,order_ids:order,public_note:'Order generated automatically at random by the organiser interface using the browser Web Crypto API.'})
      drawnGroups++
    }
    if(drawnGroups){
      await load()
      const refreshedSource=data.value?.rounds.find(row=>row.id===sourceRound.id&&row.status==='certified')
      if(refreshedSource&&getQualifyingTieGroups(refreshedSource.id).length)throw new Error('A qualifying tie changed while the random orders were being recorded. Reload the event and prepare the round again.')
    }
  }catch(cause){
    if(/draw order has already been recorded for this group/i.test(cause.message)){
      await load()
      const refreshedSource=data.value?.rounds.find(row=>row.id===sourceRound?.id&&row.status==='certified')
      if(refreshedSource&&getQualifyingTieGroups(refreshedSource.id).length){error.value='A qualifying tie could not be resolved automatically. Reload the event and try preparing the round again.';tieDrawInProgress.value=false;return}
    }else{error.value=cause.message;tieDrawInProgress.value=false;return}
  }
  tieDrawInProgress.value=false
  const result=await act('prepare_round',{round_key:roundKey})
  if(result)message.value=drawnGroups?`Randomly recorded ${drawnGroups} qualifying tie ${drawnGroups===1?'draw':'draws'} and prepared ${humanize(roundKey)} seating.`:`${humanize(roundKey)} seating is ready.`
}
function getQualifyingTieGroups(roundId){
  const round=data.value?.rounds.find(row=>row.id===roundId)
  if(!round)return[]
  const relevantKeys=round.round_key==='qualifier_1'?['qualifier_1']:['qualifier_1','qualifier_2']
  const relevantRounds=data.value.rounds.filter(row=>relevantKeys.includes(row.round_key)&&row.status==='certified')
  const relevantRoundIds=new Set(relevantRounds.map(row=>row.id))
  const participants=new Map(data.value.participants.map(person=>[person.id,person]))
  const metrics=new Map()
  for(const result of data.value.results.filter(row=>relevantRoundIds.has(row.round_id))){
    const person=participants.get(result.participant_id)
    if(round.round_key==='qualifier_2'&&(!person?.active||!person.eligible_for_final||person.is_substitute))continue
    const row=metrics.get(result.participant_id)??{participant_id:result.participant_id,score_cents:0,firsts:0,fourths:0,best_cents:-Infinity}
    const scoreCents=Math.round(Number(result.score)*100)
    row.score_cents+=scoreCents
    row.firsts+=result.first_place?1:0
    row.fourths+=result.fourth_place?1:0
    row.best_cents=Math.max(row.best_cents,scoreCents)
    metrics.set(result.participant_id,row)
  }
  const penaltyTotals=new Map()
  for(const item of data.value.penalties.filter(row=>relevantRoundIds.has(row.round_id)))
    penaltyTotals.set(item.participant_id,(penaltyTotals.get(item.participant_id)??0)+Math.round(Number(item.points)*100))
  for(const row of metrics.values())row.score_cents-=penaltyTotals.get(row.participant_id)??0
  const ranked=[...metrics.values()].sort((a,b)=>b.score_cents-a.score_cents||b.firsts-a.firsts||a.fourths-b.fourths||b.best_cents-a.best_cents)
  const groups=new Map()
  for(const row of ranked){
    const key=`${row.score_cents}|${row.firsts}|${row.fourths}|${row.best_cents}`
    const group=groups.get(key)??{metric_key:key,score_cents:row.score_cents,firsts:row.firsts,fourths:row.fourths,best_cents:row.best_cents,participant_ids:[]}
    group.participant_ids.push(row.participant_id)
    groups.set(key,group)
  }
  const isAhead=(a,b)=>a.score_cents>b.score_cents||(a.score_cents===b.score_cents&&a.firsts>b.firsts)||(a.score_cents===b.score_cents&&a.firsts===b.firsts&&a.fourths<b.fourths)||(a.score_cents===b.score_cents&&a.firsts===b.firsts&&a.fourths===b.fourths&&a.best_cents>b.best_cents)
  return [...groups.values()]
    .filter(group=>group.participant_ids.length>1)
    .filter(group=>round.round_key==='qualifier_1'||ranked.filter(row=>isAhead(row,group)).length<4)
    .map(group=>{
      const participantIds=[...group.participant_ids].sort()
      const roundDraws=data.value.tie_draws??[]
      const alreadyRecorded=roundDraws.some(draw=>draw.round_id===round.id&&draw.participant_ids.length===participantIds.length&&participantIds.every(id=>draw.participant_ids.includes(id)))
      return{...group,key:JSON.stringify([round.id,group.metric_key,participantIds]),participant_ids:participantIds,players:participantIds.map(id=>participants.get(id)).filter(Boolean),already_recorded:alreadyRecorded}
    })
    .filter(group=>!group.already_recorded)
}
function randomIndex(max){const range=0x100000000,limit=Math.floor(range/max)*max,buffer=new Uint32Array(1);let value;do{globalThis.crypto.getRandomValues(buffer);value=buffer[0]}while(value>=limit);return value%max}
function secureRandomOrder(participantIds){const order=[...participantIds];for(let i=order.length-1;i>0;i--){const j=randomIndex(i+1);[order[i],order[j]]=[order[j],order[i]]}return order}
async function exportData(){try{const output=await callAdmin('export');const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='riichi-open-i-organiser-export.json';link.click();URL.revokeObjectURL(link.href)}catch(cause){error.value=cause.message}}
function paymentStatus(person){return data.value.registrations.find(row=>row.id===person.registration_id)?.status??'No linked registration'}
function formatDate(value){return value?new Date(value).toLocaleString('en-MY',{dateStyle:'medium',timeStyle:'short'}):'—'}
function humanize(value=''){return String(value).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function scrollToHash(){const id=route.hash.slice(1);if(id)document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}
</script>

<style scoped>
.riichi-admin .admin-action.secondary{background:var(--white-pure);color:var(--matcha-leaf);border:1px solid var(--line)}.riichi-admin .admin-action.danger{background:#f7e9e6;color:#963f47;border:1px solid #dfc7c3}
.event-admin-heading{display:flex;align-items:center;justify-content:space-between;gap:20px}.public-event-link{color:var(--matcha-leaf);font-size:.82rem;font-weight:600;flex-shrink:0}.event-admin-workspace{border:0;padding:0;margin:0;min-width:0}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.overview-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:26px 0 18px}.overview-grid .admin-card{display:flex;flex-direction:column;gap:8px;margin:0;padding:20px}.overview-grid span{font-size:.74rem;color:var(--muted)}.overview-grid strong{font:1.65rem var(--font-display);color:var(--matcha-leaf)}.event-workflow{display:flex;justify-content:space-between;align-items:center;gap:32px;padding:26px 28px;border-radius:12px;background:var(--matcha-leaf);color:white}.event-workflow .eyebrow{color:#e2c995;font-size:.68rem}.event-workflow h2{font:1.7rem var(--font-display);margin:7px 0}.event-workflow p{color:#dde3d9;font-size:.83rem;line-height:1.65;max-width:600px;margin:8px 0}.event-workflow a{display:inline-block;padding-top:6px;color:#f0dcac;font-size:.83rem;font-weight:600}.event-workflow label{display:grid;gap:8px;font-size:.73rem;min-width:210px}.event-workflow select{padding:11px;border:1px solid #ffffff50;color:var(--clay-text);font:inherit;min-height:44px}.section-title{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:14px}.admin-section{padding-top:12px;scroll-margin-top:70px}.admin-section>h2,.section-title h2{margin:0 0 16px}.admin-section>.eyebrow{margin-bottom:8px}.registration-admin-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.registration-card{margin:0}.registration-top{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.registration-top h3{margin:0 0 8px;color:var(--matcha-leaf);font:1.4rem var(--font-display);overflow-wrap:anywhere}.registration-top small{display:block;color:var(--muted);font-size:.67rem;margin-top:9px}.registration-top .admin-action{flex-shrink:0;font-size:.76rem}.admin-badge,.verified-badge{display:inline-block;border-radius:30px;background:var(--surface-soft);padding:5px 9px;font-size:.68rem;color:var(--matcha-leaf)}.status-pending,.status-needs_clarification,.status-payment_exception{background:#f3ead4;color:#705525}.status-verified,.verified-badge{background:#e4eee5;color:#35583b}.status-rejected,.status-cancelled{background:#f6e6e6;color:#913f45}.registration-card>textarea{width:100%;min-height:70px;padding:10px;border:1px solid var(--line);font:inherit;font-size:.82rem;resize:vertical}.action-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.action-row .admin-action{font-size:.74rem;padding:9px 11px}.missing-receipt,.locked-note{font-size:.8rem;color:var(--muted)}.admin-action{min-height:43px}.admin-action:disabled{opacity:.45;cursor:not-allowed}.admin-form-row{display:flex;flex-wrap:wrap;align-items:end;gap:15px}.admin-form-row>label{flex:1;min-width:160px;display:grid;gap:6px;font-size:.79rem}.admin-form-row .inline-check{display:flex;align-items:center;gap:8px;min-height:44px;min-width:135px;flex:0 1 auto}.admin-form-row input,.admin-form-row select{padding:10px;border:1px solid var(--line);font:inherit;min-height:44px;max-width:100%}.admin-table-wrap{margin-top:20px;padding:8px 16px}.admin-table input:not([type=checkbox]){min-width:140px;max-width:210px}.admin-table input[type=checkbox]{width:19px;height:19px;accent-color:var(--matcha-leaf)}.draw-readiness{padding:15px 0}.draw-readiness p{font-size:.83rem;color:var(--muted)}.round-card{margin:18px 0;padding:24px}.round-card .section-title h3{font:1.5rem var(--font-display);margin:0}.round-tables{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.table-editor{border:1px solid var(--line);border-radius:10px;padding:18px;background:var(--bg-silk);min-width:0}.table-editor h4{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 14px;color:var(--matcha-leaf);font-size:.98rem}.table-editor h4 small{font-size:.66rem;font-weight:500;color:var(--muted)}.table-editor h4 .draft-dirty{color:#8a6225}.seat-row{display:grid;grid-template-columns:40px minmax(0,1fr) 105px;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--line);font-size:.82rem}.seat-row>span:first-child{font-size:.68rem;color:var(--muted)}.seat-row>strong{font-weight:600;overflow-wrap:anywhere}.seat-row input{min-width:0;width:100%;padding:9px 7px;border:1px solid var(--line);font:inherit;text-align:right;background:var(--white-pure);font-variant-numeric:tabular-nums}.sticks-label{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:12px;font-size:.75rem;color:var(--muted)}.sticks-label input{width:80px;padding:9px 8px;border:1px solid var(--line);text-align:right;font:inherit;background:var(--white-pure)}.table-balance{display:grid;grid-template-columns:1fr auto;gap:4px;padding:11px 13px;border-radius:7px;background:#f0e9dd;margin:16px 0;color:#765d39;font-size:.72rem}.table-balance strong{font-variant-numeric:tabular-nums}.table-balance small{grid-column:1/-1;font-size:.69rem}.table-balance.balanced{background:#e4ecdf;color:var(--matcha-leaf)}.preview-line{font-size:.7rem;line-height:1.7;color:var(--muted)}.table-editor>.admin-action{width:100%;margin-top:4px}.certify-row{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:12px 0}.certify-row>div{display:grid;gap:6px}.certify-row strong{color:var(--matcha-leaf)}.certify-row span,.certify-row small{font-size:.76rem;color:var(--muted)}.certify-row .admin-action{flex-shrink:0}.audit-list{list-style:none;padding:0;margin:20px 0;border:1px solid var(--line);border-radius:10px;background:var(--white-pure);max-height:480px;overflow:auto}.audit-list li{display:grid;grid-template-columns:1fr auto;gap:5px 20px;padding:15px 18px;border-bottom:1px solid var(--line);font-size:.8rem}.audit-list li:last-child{border:0}.audit-list span,.audit-list small{font-size:.69rem;color:var(--muted)}.audit-list small{grid-column:1/-1;overflow-wrap:anywhere}.riichi-admin>.admin-error,.riichi-admin>.admin-status{position:sticky;top:10px;z-index:5;box-shadow:0 6px 20px #0001}.receipt-dialog{width:min(850px,94vw);max-height:90dvh;padding:24px;border:1px solid var(--line);border-radius:14px;background:var(--white-pure);color:var(--clay-text);overflow:auto}.receipt-dialog::backdrop{background:#18241bcc;backdrop-filter:blur(3px)}.receipt-title{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:20px}.receipt-title h2{font:1.7rem var(--font-display);margin:0}.receipt-title .eyebrow{margin-top:0}.close-preview{width:40px;height:40px;flex-shrink:0;border:1px solid var(--line);border-radius:50%;background:var(--surface-soft);color:var(--matcha-leaf);font-size:1.4rem;cursor:pointer}.receipt-dialog img{display:block;max-width:100%;max-height:65dvh;object-fit:contain;margin:0 auto 20px}.receipt-dialog iframe{width:100%;height:60dvh;border:1px solid var(--line);margin-bottom:15px}.receipt-dialog>a{color:var(--matcha-leaf);font-size:.85rem}.event-admin-workspace:disabled{opacity:.8}
@media(max-width:800px){.overview-grid{grid-template-columns:repeat(2,1fr)}.event-workflow{align-items:stretch;flex-direction:column;gap:20px}.event-workflow label{max-width:360px}.registration-admin-list,.round-tables{grid-template-columns:1fr}.event-admin-heading{align-items:flex-start}.public-event-link{font-size:.72rem;padding-top:12px}.round-card{padding:18px}.certify-row{align-items:flex-start;flex-direction:column}.certify-row .admin-action{width:100%}.section-title{align-items:flex-start}.section-title>.admin-action{font-size:.72rem}.audit-list li{grid-template-columns:1fr}.audit-list small{grid-column:auto}}
@media(max-width:440px){.event-admin-heading{flex-direction:column;gap:0}.public-event-link{padding:0 0 12px}.overview-grid .admin-card{padding:15px}.overview-grid strong{font-size:1.4rem}.overview-grid span{font-size:.68rem}.event-workflow{padding:21px}.registration-top{flex-wrap:wrap}.seat-row{grid-template-columns:34px minmax(0,1fr) 90px;gap:7px}.table-editor{padding:13px}.round-card{padding:14px}.round-card .section-title{flex-wrap:wrap;gap:8px}.action-row .admin-action{flex:1;min-width:110px}.table-balance{grid-template-columns:1fr}.admin-section{margin-top:26px}}

</style>

<style scoped>
.certification-dialog{width:min(530px,94vw);padding:30px;border:1px solid var(--line);border-radius:14px;background:var(--white-pure);color:var(--clay-text)}.certification-dialog::backdrop{background:#18241bcc;backdrop-filter:blur(3px)}.certification-dialog h2{font:1.9rem var(--font-display);margin:0 0 16px;color:var(--matcha-leaf)}.certification-dialog>p{font-size:.9rem;line-height:1.65}.certification-warning{margin:20px 0;padding:16px;border:1px solid #dccbac;border-radius:8px;background:#f7f0df;color:#725a33;font-size:.86rem}.certification-warning p{margin:6px 0 0;line-height:1.6}.certification-dialog .action-row{justify-content:flex-end;gap:10px}.certification-dialog .admin-action{min-height:46px}
</style>

<style scoped>
.save-hint{margin:-6px 0 12px;color:var(--muted);font-size:.8rem}.inline-save-state{font-size:.72rem;color:var(--muted);white-space:nowrap}.save-saving{color:#8a6225}.save-error,.save-error button{color:#913f45}.retry-save{padding:0;border:0;background:none;font:inherit;text-decoration:underline;cursor:pointer}.save-progress{position:sticky;top:10px;z-index:5}.table-editor h4 small{white-space:nowrap}.admin-table.roster-table{min-width:0}
@media(max-width:720px){.admin-table-wrap:has(.roster-table){overflow:visible;padding:10px}.admin-table.roster-table,.roster-table tbody{display:block;width:100%}.roster-table thead{display:none}.roster-table tr{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;padding:15px;border-bottom:1px solid var(--line)}.roster-table td{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:3px;border:0;min-width:0}.roster-table td:first-child{grid-column:1/-1}.roster-table td::before{content:attr(data-label);font-size:.7rem;color:var(--muted);flex:0 0 auto}.roster-table td:first-child input{width:min(100%,260px);min-width:0}.roster-table td input[type=checkbox]{width:20px;height:20px;margin:0}.roster-table td:last-child{grid-column:1/-1;justify-content:flex-start}.round-tables{grid-template-columns:1fr}}
</style>
