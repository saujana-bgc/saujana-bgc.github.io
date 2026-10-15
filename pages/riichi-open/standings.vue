<template>
  <main class="standings-page">
    <RiichiOpenTabs />
    <header class="standings-header"><p class="eyebrow">Tournament results</p><h1>Riichi Open <em>standings</em></h1><p>Only results certified by the organiser appear here. Published table assignments are shown separately from scores.</p></header>
    <section v-if="error" class="standings-card" role="status"><h2>Standings are temporarily unavailable</h2><p>{{ error }}</p><button @click="load">Try again</button></section>
    <template v-else-if="snapshot">
      <div class="last-certified">Last certified update <strong>{{ formattedUpdate }}</strong><button @click="load">Refresh</button></div>
      <section v-if="snapshot.assignments" class="standings-card"><p class="eyebrow">Published seating</p><h2>{{ humanize(snapshot.assignment_round || event?.stage) }} tables</h2><div class="table-grid"><article v-for="table in currentAssignments" :key="table.table_number"><h3>Table {{ table.table_number }}</h3><ul><li v-for="seat in table.seats" :key="seat.seat_wind"><span>{{ seat.seat_wind }}</span>{{ seat.display_name }}</li></ul></article></div></section>
      <section v-if="snapshot.standings?.length" class="standings-card"><p class="eyebrow">Certified results</p><h2>{{ standingsHeading }}</h2><p class="table-note">Scores include shared uma. Penalties are listed separately and deducted once from the total.</p><div class="table-scroll"><table><thead><tr><th>Rank</th><th>Player</th><th>Qualifier 1</th><th>Qualifier 2</th><th>Penalties</th><th>Total</th></tr></thead><tbody><tr v-for="row in snapshot.standings" :key="row.participant_id" :class="{ finalist:isFinalist(row) }"><td>{{ row.rank }}</td><td>{{ row.display_name }}<small v-if="row.is_substitute">Substitute · not eligible for final</small></td><td>{{ score(row.qualifier_1) }}</td><td>{{ score(row.qualifier_2) }}</td><td>{{ score(row.penalties) }}</td><td><strong>{{ score(row.total) }}</strong></td></tr></tbody></table></div><p v-if="snapshot.top_four?.length" class="top-four-note">Finalists: {{ snapshot.top_four.map(item=>item.display_name).join(' · ') }}</p></section>
      <section v-if="snapshot.final?.length" class="standings-card champion-card"><p class="eyebrow">The final</p><h2>{{ snapshot.final[0]?.display_name }} <em>is champion</em></h2><ol><li v-for="row in snapshot.final" :key="row.participant_id"><span>{{ row.display_name }}</span><strong>{{ ordinal(row.rank) }}</strong><small>Final {{ score(row.score) }}</small></li></ol></section>
      <p v-if="snapshot.message" class="standings-card">{{ snapshot.message }}</p>
    </template>
    <section v-else class="standings-card"><p class="eyebrow">{{ humanize(event?.stage || 'registration') }}</p><h2>Results awaiting certification</h2><p>The organiser hasn’t certified any round yet. Draft scores stay private until a whole round is complete.</p></section>
  </main>
</template>

<script setup>
useHead({title:'Riichi Open I standings | Saujana BGC',meta:[{name:'description',content:'Published seating and certified standings for Riichi Open I.'}]})
const {callPublic}=useRiichiOpen()
const event=ref(null),snapshot=ref(null),updatedAt=ref(null),error=ref('')
const formattedUpdate=computed(()=>updatedAt.value?new Date(updatedAt.value).toLocaleString('en-MY',{dateStyle:'medium',timeStyle:'short'}):'No rounds certified yet')
const standingsHeading=computed(()=>event.value?.stage==='completed'?'Final qualification standings':'Qualification standings')
let refreshTimer
const currentAssignments=computed(()=>{const key=snapshot.value?.assignment_round;return key?snapshot.value?.assignments?.[key]??[]:Object.values(snapshot.value?.assignments??{})[0]??[]})
onMounted(()=>{load();refreshTimer=window.setInterval(load,30000);window.addEventListener('focus',load)})
onBeforeUnmount(()=>{if(refreshTimer)window.clearInterval(refreshTimer);window.removeEventListener('focus',load)})
async function load(){error.value='';try{const data=await callPublic('summary');event.value=data.event;snapshot.value=data.publication?.snapshot??null;updatedAt.value=snapshot.value?.last_certified??data.publication?.created_at??null}catch(cause){error.value=cause.message}}
function humanize(value=''){return String(value).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function score(value){return value==null?'—':`${Number(value)>0?'+':''}${Number(value).toFixed(1)}`}
function ordinal(value){const n=Number(value);return`${n}${n===1?'st':n===2?'nd':n===3?'rd':'th'}`}
function isFinalist(row){return Boolean(snapshot.value?.top_four?.some(person=>person.participant_id===row.participant_id))}
</script>

<style scoped>
.standings-page{width:min(1050px,92%);margin:0 auto;padding-bottom:50px;color:var(--clay-text)}.standings-header{padding:54px 10px 34px}.eyebrow{color:var(--gold-leaf);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase}.standings-header h1{font:400 clamp(2.8rem,7vw,5rem)/1.05 var(--font-display);color:var(--matcha-leaf);margin:0}.standings-header h1 em,.champion-card h2 em{color:var(--gold-leaf)}.standings-header>p:not(.eyebrow){max-width:650px;line-height:1.7;color:var(--muted)}.back-link{color:var(--matcha-leaf);text-underline-offset:4px}.last-certified{display:flex;gap:10px;align-items:center;justify-content:flex-end;color:var(--muted);font-size:.8rem;margin:8px 0 16px}.last-certified button,.standings-card button{border:1px solid var(--line);border-radius:5px;background:var(--white-pure);padding:7px 12px;color:var(--matcha-leaf);cursor:pointer}.standings-card{background:var(--white-pure);border:1px solid var(--line);border-radius:9px;padding:clamp(18px,3vw,30px);margin:14px 0;box-shadow:var(--shadow-card)}.standings-card h2{margin:0 0 10px;font:1.8rem var(--font-display);color:var(--matcha-leaf)}.table-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:18px}.table-grid article{border:1px solid var(--line);border-radius:7px;padding:14px}.table-grid h3{font:1.1rem var(--font-display);color:var(--matcha-leaf);margin:0}.table-grid ul{list-style:none;margin:9px 0 0;padding:0}.table-grid li{padding:7px 0;border-top:1px solid var(--line)}.table-grid li span{display:inline-block;width:50px;color:var(--gold-leaf);font-size:.78rem}.table-scroll{overflow:auto}.admin-table,.table-scroll table{width:100%;border-collapse:collapse}.table-scroll th,.table-scroll td{text-align:left;padding:11px;border-bottom:1px solid var(--line);white-space:nowrap}.table-scroll td small{display:block;color:var(--muted);margin-top:4px}.table-scroll tr.finalist{background:#f3f0e4}.table-note,.top-four-note{color:var(--muted);font-size:.85rem;line-height:1.55}.champion-card{background:linear-gradient(135deg,#f7f5ef,#ecebdc)}.champion-card ol{padding:0;list-style:none}.champion-card li{display:grid;grid-template-columns:1fr auto auto;gap:20px;padding:12px 0;border-top:1px solid var(--line)}.champion-card li strong{color:var(--gold-leaf)}.champion-card li small{color:var(--muted)}
@media(max-width:640px){.last-certified{justify-content:flex-start;flex-wrap:wrap}.table-scroll table{min-width:700px}.champion-card li{grid-template-columns:1fr auto}.champion-card li small{grid-column:1/-1}}
</style>
