<template>
  <main class="event-page">
    <section class="event-hero">
      <div class="hero-copy">
        <img class="saujana-logo" src="/images/riichi-open/saujana-logo.png" alt="Saujana Board Game Community" width="150" height="100">
        <p class="eyebrow">Saujana Board Game Community presents</p>
        <h1>Riichi <em>Open I</em></h1>
        <p class="hero-intro">Two East–South qualifiers. One table for the Top 4. A friendly day of serious mahjong.</p>
        <div class="event-facts"><span>Saturday, 14 November 2026</span><span>Starts at 2:30 pm</span><span>Boardroom Bandit, Ara Damansara</span></div>
        <div class="event-offer"><strong>RM10</strong><span>entry fee</span><i aria-hidden="true"></i><span>A prize for the winner</span></div>
        <NuxtLink to="/riichi-open/standings" class="text-link">View standings and table assignments →</NuxtLink>
      </div>
      <div class="mika-frame"><img src="/images/riichi-open/mika-one-man.png" alt="Mika holding a one-man mahjong tile and inviting you to join the tournament" width="640" height="800"></div>
      <span class="hero-seal" aria-hidden="true">一萬<br><small>RIICHI OPEN</small></span>
    </section>

    <section class="registration-panel" aria-labelledby="register-heading">
      <div class="register-heading"><p class="eyebrow">16 places · four-player tables</p><h2 id="register-heading">Save your place</h2><p>Enter your name, reserve a place, then upload your RM10 payment receipt. Your name appears in the public list while payment is awaiting verification.</p></div>
      <div class="availability" v-if="event"><strong>{{ availablePlaces }}</strong><span>places left</span><div class="capacity-track"><i :style="{ width: `${usedPercent}%` }"></i></div><small>{{ occupiedPlaces }} of {{ event.capacity }} reserved</small></div>

    <section v-if="complete" class="confirmation" aria-live="polite"><span class="confirm-mark">✓</span><h3>{{ paymentException ? 'Receipt sent for review' : 'Registration received' }}</h3><p>{{ paymentException ? 'The reservation expired before submission. The organiser will review the receipt; your place is not yet confirmed.' : 'Your payment receipt is with the organiser for checking.' }}</p><p class="reference">Registration reference <strong>{{ registrationRef }}</strong></p><span v-if="!paymentException" class="pending-badge">Awaiting payment verification</span></section>
      <div v-else-if="!hold" class="signup-step">
        <p v-if="notice" class="notice" role="status">{{ notice }}</p>
        <form @submit.prevent="reservePlace">
          <label for="display-name">Name for the public participant list</label>
          <input id="display-name" v-model="name" maxlength="80" autocomplete="name" required placeholder="Your name">
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <button class="event-button" :disabled="busy || !canRegister">{{ busy ? 'Reserving…' : canRegister ? 'Continue to payment' : 'Registration is closed' }}</button>
          <p class="small-print">A reservation holds one place for {{ holdDuration }} minutes. No participant account is needed.</p>
        </form>
      </div>
      <div v-else class="payment-step">
        <div class="hold-note"><div><strong>Your place is held until {{ holdExpiry }}.</strong><small>If you’ve paid, upload the receipt before releasing your place.</small></div><button type="button" class="inline-button" @click="cancelHold">Release place</button></div>
        <div class="payment-instructions"><h3>Pay RM10</h3><p>Send your entry fee by Touch ’n Go or DuitNow to:</p><a href="tel:+60162459482">+60 16-245 9482</a><p>Recipient name: <strong>NICHOLAS</strong></p><button type="button" class="copy-button" @click="copyNumber">{{ copied ? 'Number copied' : 'Copy number' }}</button></div>
        <form @submit.prevent="submitReceipt">
          <label for="receipt">Upload your payment receipt <span>(JPG, PNG or PDF · up to 5 MB)</span></label>
          <input id="receipt" type="file" accept="image/jpeg,image/png,application/pdf" required @change="chooseReceipt">
          <p v-if="receipt" class="file-selected">Selected: {{ receipt.name }}</p>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <button class="event-button" :disabled="busy || !receipt">{{ busy ? 'Uploading securely…' : 'Submit receipt and register' }}</button>
        </form>
      </div>
    </section>

    <section class="registrant-section"><div><p class="eyebrow">The field</p><h2>Registered players</h2><p>Payment checks are handled by the organiser. This list updates as registrations arrive.</p></div><div class="registrant-counts"><span><strong>{{ verifiedCount }}</strong> verified</span><span><strong>{{ pendingCount }}</strong> awaiting verification</span></div>
      <p v-if="!registrations.length" class="empty-list">No submitted registrations yet. Be the first at the table.</p>
      <ul v-else class="registrant-list"><li v-for="player in registrations" :key="player.id"><strong>{{ player.display_name }}</strong><span :class="player.status==='verified'?'verified-badge':'pending-badge'">{{ player.status==='verified'?'Verified':'Awaiting verification' }}</span></li></ul>
    </section>

    <section class="format-strip"><div><p class="eyebrow">The format</p><h2>Three hanchans to a champion</h2></div><p>Play two qualifying East–South hanchans. The four highest eligible players meet in one final, starting again at 30,000 points. Entry and registration do not require a player account.</p><a href="/riichi-open/rules.md" class="text-link">Read the tournament guide ↗</a></section>
  </main>
</template>

<script setup>
useHead({ title: 'Riichi Open I registration | Saujana BGC', meta: [{ name: 'description', content: 'Register for Riichi Open I on 14 November 2026 at Boardroom Bandit, Ara Damansara.' }] })
const { callPublic } = useRiichiOpen()
const event = ref(null)
const registrations = ref([])
const activeHolds = ref(0)
const hold = ref(null)
const name = ref('')
const receipt = ref(null)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const copied = ref(false)
const complete = ref(false)
const paymentException = ref(false)
const registrationRef = ref('')
const HOLD_KEY = 'riichi-open-i-registration-hold'
const DRAFT_KEY = 'riichi-open-i-registration-draft'
const occupiedPlaces = computed(() => registrations.value.length + activeHolds.value)
const availablePlaces = computed(() => Math.max(0, (event.value?.capacity ?? 16) - registrations.value.length - activeHolds.value))
const usedPercent = computed(() => Math.min(100, (registrations.value.length + activeHolds.value) / (event.value?.capacity ?? 16) * 100))
const verifiedCount = computed(() => registrations.value.filter(row => row.status === 'verified').length)
const pendingCount = computed(() => registrations.value.filter(row => row.status !== 'verified').length)
const canRegister = computed(() => Boolean(event.value?.registration_open) && availablePlaces.value > 0)
const holdDuration = computed(() => Number(event.value?.registration_hold_minutes ?? 30))
const holdExpiry = computed(() => hold.value?.expires_at ? new Date(hold.value.expires_at).toLocaleTimeString('en-MY',{timeZone:'Asia/Kuala_Lumpur',hour:'numeric',minute:'2-digit'}) : '')
let refreshTimer

onMounted(async () => {
  const saved = sessionStorage.getItem(HOLD_KEY)
  if (saved) {
    try {
      const stored=JSON.parse(saved);name.value=stored.name??''
      const grant=await callPublic('reserve',{token:stored.token,idempotency_key:stored.idempotency_key})
      hold.value={...stored,...grant,signed_url:grant.signed_url}
      sessionStorage.setItem(HOLD_KEY,JSON.stringify({id:hold.value.id,expires_at:hold.value.expires_at,path:hold.value.path,token:hold.value.token,idempotency_key:stored.idempotency_key,name:hold.value.name}))
    } catch { sessionStorage.removeItem(HOLD_KEY);notice.value='Your saved place reservation expired. You can reserve again if places remain.' }
  }
  else { try { const draft=JSON.parse(sessionStorage.getItem(DRAFT_KEY)??'null');if(draft)name.value=draft.name??'' } catch { sessionStorage.removeItem(DRAFT_KEY) } }
  await loadPublic()
  refreshTimer=window.setInterval(loadPublic,60000)
  window.addEventListener('focus',loadPublic)
})
onBeforeUnmount(()=>{if(refreshTimer)window.clearInterval(refreshTimer);window.removeEventListener('focus',loadPublic)})

async function loadPublic() {
  try {
    const data = await callPublic('summary')
    event.value = data.event
    registrations.value = data.registrations ?? []
    activeHolds.value = Number(data.active_holds ?? 0)
  } catch { notice.value = 'Live registration details are temporarily unavailable. Please refresh in a moment.' }
}

async function reservePlace() {
  error.value = ''
  if (!name.value.trim()) { error.value = 'Enter the name you’d like shown on the list.'; return }
  busy.value = true
  try {
    let draft
    try { draft=JSON.parse(sessionStorage.getItem(DRAFT_KEY)??'null') } catch {}
    draft={token:draft?.token??crypto.randomUUID()+crypto.randomUUID(),idempotency_key:draft?.idempotency_key??crypto.randomUUID(),name:name.value.trim()}
    sessionStorage.setItem(DRAFT_KEY,JSON.stringify(draft))
    const data = await callPublic('reserve',{ token:draft.token, idempotency_key:draft.idempotency_key })
    hold.value = { ...data, token:draft.token, name:name.value.trim(), idempotency_key:draft.idempotency_key }
    sessionStorage.setItem(HOLD_KEY,JSON.stringify({id:hold.value.id,expires_at:hold.value.expires_at,path:hold.value.path,token:hold.value.token,idempotency_key:hold.value.idempotency_key,name:hold.value.name}))
    sessionStorage.removeItem(DRAFT_KEY)
    await loadPublic()
  } catch (cause) { error.value = cause.message }
  finally { busy.value = false }
}

function chooseReceipt(event) {
  receipt.value = event.target.files?.[0] ?? null
  error.value = ''
  if (!receipt.value) return
  if (!['image/jpeg','image/png','application/pdf'].includes(receipt.value.type) || receipt.value.size > 5*1024*1024) {
    error.value = 'Choose a JPG, PNG or PDF file no larger than 5 MB.'
    receipt.value = null
    event.target.value = ''
  }
}

async function submitReceipt() {
  error.value = ''
  if (!receipt.value || !hold.value) return
  busy.value = true
  try {
    const submission={hold_id:hold.value.id,token:hold.value.token,path:hold.value.path,mime_type:receipt.value.type,size:receipt.value.size,display_name:hold.value.name}
    let result
    try { result=await callPublic('finalize',submission) }
    catch (cause) {
      if (!cause.message.includes('Upload the payment receipt before submitting.')) throw cause
      const url = new URL(hold.value.signed_url, useRuntimeConfig().public.supabaseUrl)
      const config = useRuntimeConfig()
      const upload = await fetch(url,{method:'PUT',headers:{apikey:config.public.supabaseKey,'Content-Type':receipt.value.type},body:receipt.value})
      if (!upload.ok) throw new Error('The receipt upload failed. Please try choosing the file again.')
      result=await callPublic('finalize',submission)
    }
    registrationRef.value = result.id.slice(0,8).toUpperCase()
    paymentException.value = result.status === 'payment_exception'
    complete.value = true
    hold.value = { ...hold.value, submitted:true }
    sessionStorage.removeItem(HOLD_KEY)
    sessionStorage.removeItem(DRAFT_KEY)
    await loadPublic()
  } catch (cause) { error.value = cause.message }
  finally { busy.value = false }
}

async function copyNumber() {
  try { await navigator.clipboard.writeText('+60162459482'); copied.value=true; setTimeout(()=>copied.value=false,1800) }
  catch { error.value='Copy isn’t available here. You can select the number above.' }
}
async function cancelHold() { if(!window.confirm('Release this place reservation? If you have already paid, upload the receipt first.')) return;try { await callPublic('cancel',{hold_id:hold.value.id,token:hold.value.token});hold.value=null;sessionStorage.removeItem(HOLD_KEY);sessionStorage.removeItem(DRAFT_KEY);receipt.value=null;await loadPublic() } catch(cause) { error.value=cause.message } }
</script>

<style scoped>
.event-page{width:min(1120px,92%);margin:0 auto;color:var(--clay-text);padding-bottom:30px}.event-hero{position:relative;display:grid;grid-template-columns:1.15fr .85fr;align-items:center;min-height:580px;overflow:hidden;padding:28px clamp(20px,5vw,64px);background:radial-gradient(ellipse at 76% 40%,#ebe8d8 0,#f7f5ef 55%);border:1px solid var(--line);border-radius:12px}.hero-copy{z-index:1;max-width:610px}.saujana-logo{display:block;width:108px;height:auto;object-fit:contain;margin-bottom:22px}.eyebrow{margin:0 0 12px;color:var(--gold-leaf);font-size:.72rem;letter-spacing:.11em;text-transform:uppercase}.event-hero h1{font:400 clamp(3rem,7vw,5.6rem)/.98 var(--font-display);letter-spacing:-.045em;color:var(--matcha-leaf);margin:0}.event-hero h1 em{font-style:italic;color:var(--gold-leaf)}.hero-intro{max-width:490px;font:1.12rem/1.6 var(--font-display);color:#4b5148}.event-facts{display:grid;gap:8px;margin:26px 0 20px;font-size:.92rem}.event-facts span:before{content:'✳';color:var(--gold-leaf);margin-right:10px}.event-offer{display:flex;align-items:center;gap:11px;margin:20px 0 18px}.event-offer strong{font:2.4rem var(--font-display);color:var(--matcha-leaf)}.event-offer>span{font-size:.82rem}.event-offer i{height:28px;border-left:1px solid var(--line);margin:0 7px}.text-link{display:inline-flex;color:var(--matcha-leaf);font-weight:650;text-underline-offset:4px}.mika-frame{align-self:end;justify-self:center;width:min(100%,410px);height:510px;overflow:hidden;display:flex;align-items:flex-end;justify-content:center}.mika-frame img{height:100%;width:100%;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 14px 20px #354c3e20)}.hero-seal{position:absolute;right:38%;bottom:38px;display:grid;place-content:center;width:86px;height:86px;border:1px solid #8a6a3e88;border-radius:50%;background:#f7f5ef;color:var(--matcha-leaf);font:1.4rem var(--font-display);text-align:center;transform:rotate(-10deg)}.hero-seal small{font:6px 'Segoe UI',sans-serif;letter-spacing:.13em}.registration-panel{display:grid;grid-template-columns:1fr minmax(180px,.45fr);gap:24px;margin:30px 0;padding:clamp(22px,4vw,40px);background:var(--matcha-leaf);color:white;border-radius:10px}.register-heading h2,.registrant-section h2,.format-strip h2{font:2rem var(--font-display);margin:0 0 10px}.register-heading p:last-child{max-width:570px;line-height:1.65;color:#f0f1e9}.availability{align-self:center;padding:17px;background:#ffffff10;border:1px solid #ffffff30;border-radius:8px;display:grid;gap:6px}.availability>strong{font:2.2rem var(--font-display)}.availability>span,.availability small{font-size:.78rem;opacity:.8}.capacity-track{height:7px;background:#ffffff30;border-radius:10px;margin:6px 0;overflow:hidden}.capacity-track i{display:block;height:100%;background:#d9c087;border-radius:10px}.signup-step,.payment-step,.confirmation{grid-column:1/-1;padding:21px;background:var(--white-pure);border-radius:8px;color:var(--clay-text)}.signup-step form,.payment-step form{display:grid;gap:10px}.signup-step label,.payment-step label{font-size:.87rem;font-weight:650}.signup-step input:not([type=file]){width:min(100%,520px);padding:12px;border:1px solid var(--line);border-radius:6px;font:inherit}.small-print,.payment-step label span{font-size:.78rem;color:var(--muted)}.event-button{background:var(--gold-leaf);color:white;border:0;border-radius:6px;padding:13px 17px;font:inherit;font-weight:700;cursor:pointer;width:max-content;max-width:100%}.event-button:disabled{opacity:.6;cursor:wait}.payment-step{display:grid;grid-template-columns:minmax(220px,.8fr) 1fr;gap:22px}.payment-instructions{padding:18px;background:var(--surface-soft);border-radius:8px}.payment-instructions h3{font:1.35rem var(--font-display);color:var(--matcha-leaf);margin:0}.payment-instructions a{font-weight:750;color:var(--matcha-leaf);font-size:1.2rem}.copy-button,.inline-button{border:1px solid var(--line);background:var(--white-pure);border-radius:5px;padding:8px 12px;color:var(--matcha-leaf);font:inherit;cursor:pointer}.hold-note{grid-column:1/-1;display:flex;justify-content:space-between;gap:12px;color:var(--matcha-leaf)}.payment-step input[type=file]{border:1px dashed var(--line);padding:14px;border-radius:6px}.file-selected{font-size:.8rem;color:var(--muted)}.form-error{color:#963f47}.confirmation{text-align:center;padding:35px}.confirm-mark{display:grid;place-items:center;width:42px;height:42px;margin:auto;border-radius:50%;background:#e6ede5;color:var(--matcha-leaf);font-size:1.2rem}.confirmation h3{font:1.7rem var(--font-display);color:var(--matcha-leaf)}.reference{font-size:.82rem}.pending-badge,.verified-badge{display:inline-block;padding:5px 9px;border-radius:99px;background:#f3ead4;color:#705525;font-size:.72rem}.verified-badge{background:#e4eee5;color:#35583b}.registrant-section{padding:30px 0;border-top:1px solid var(--line)}.registrant-section>div:first-child p:last-child{color:var(--muted)}.registrant-counts{display:flex;gap:22px;font-size:.82rem;color:var(--muted);margin:18px 0}.registrant-counts strong{color:var(--matcha-leaf)}.registrant-list{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.registrant-list li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:7px}.registrant-list li strong{overflow-wrap:anywhere}.empty-list{padding:18px;background:var(--surface-soft);border-radius:7px;color:var(--muted)}.format-strip{display:grid;grid-template-columns:1fr 1fr;gap:10px 40px;align-items:center;padding:28px 0;border-top:1px solid var(--line)}.format-strip>p{line-height:1.7;color:var(--muted)}.format-strip .text-link{grid-column:2}.notice{grid-column:1/-1;background:#fff5df;color:#71592c;padding:10px;border-radius:5px}
@media(max-width:760px){.event-hero{grid-template-columns:1fr;min-height:auto;padding:28px 24px 0}.hero-copy{padding-bottom:16px}.mika-frame{height:min(94vw,460px);width:min(100%,390px)}.hero-seal{right:20px;bottom:22px}.registration-panel{grid-template-columns:1fr}.availability{width:auto}.payment-step{grid-template-columns:1fr}.registrant-list{grid-template-columns:1fr}.format-strip{grid-template-columns:1fr}.format-strip .text-link{grid-column:auto}}
.hold-note small{display:block;margin-top:4px;font-size:.75rem;color:var(--muted)}
</style>
