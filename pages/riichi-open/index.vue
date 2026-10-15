<template>
  <main class="event-page">
    <RiichiOpenTabs v-model="activeTab" />
    <div class="event-status-bar" aria-live="polite"><span><i aria-hidden="true"></i>{{ publicLoaded ? eventStatus : standingsError ? 'Live details unavailable' : 'Loading event details…' }}</span><small>14 November · Ara Damansara</small></div>
    <section v-show="activeTab === 'registration'" id="riichi-registration-panel" role="tabpanel" aria-labelledby="riichi-registration-tab">
    <section class="event-hero">
      <div class="hero-copy">
        <h1>Riichi <em>Open I</em></h1>
        <p class="hero-intro">Two East–South qualifiers. One table for the Top 4. A friendly day of serious mahjong.</p>
        <div class="event-facts"><span>Saturday, 14 November 2026</span><span>Starts at 2:30 pm</span><span>Boardroom Bandit, Ara Damansara</span></div>
        <div class="event-offer"><strong>RM10</strong><span>entry fee</span><i aria-hidden="true"></i><span>A prize for the winner</span></div>
        <div class="hero-actions"><button class="event-button" @click="publicLoaded && !canRegister && !hold && !complete ? activeTab = 'standings' : goToRegistration()">{{ complete ? 'View my registration' : hold ? 'Continue my registration' : publicLoaded && !canRegister ? 'View standings' : 'Save my place' }} <span aria-hidden="true">→</span></button><button class="hero-guide" @click="openGuide">Tournament guide</button></div>
        <p class="hero-reassurance">16 places · No account needed · Receipt verified by the organiser</p>
      </div>
      <div class="mika-frame"><img src="/images/riichi-open/mika-one-man.png" alt="Mika holding a one-man mahjong tile and inviting you to join the tournament" width="640" height="800"></div>
    </section>

    <section id="registration" ref="registrationPanel" class="registration-panel" aria-labelledby="register-heading" tabindex="-1">
      <div class="register-heading"><p class="eyebrow">16 places · four-player tables</p><h2 id="register-heading">Save your place</h2><p>Enter your name, reserve a place, then upload your RM10 payment receipt. Your name appears in the public list while payment is awaiting verification.</p></div>
      <div class="availability" v-if="event"><strong>{{ availablePlaces }}</strong><span>places left</span><div class="capacity-track"><i :style="{ width: `${usedPercent}%` }"></i></div><small>{{ occupiedPlaces }} of {{ event.capacity }} reserved</small></div>
      <ol class="signup-progress" aria-label="Registration progress"><li :class="{ current: !hold && !complete, done: hold || complete }" :aria-current="!hold && !complete ? 'step' : undefined"><span>{{ hold || complete ? '✓' : '1' }}</span>Your name</li><li :class="{ current: hold && !complete, done: complete }" :aria-current="hold && !complete ? 'step' : undefined"><span>{{ complete ? '✓' : '2' }}</span>Pay & upload</li><li :class="{ current: complete }" :aria-current="complete ? 'step' : undefined"><span>3</span>Organiser review</li></ol>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <section v-if="complete" ref="confirmationPanel" class="confirmation" tabindex="-1" aria-live="polite"><span class="confirm-mark">✓</span><h3>{{ paymentException ? 'Receipt sent for review' : 'You’re on the list.' }}</h3><p>{{ paymentException ? 'The reservation expired before submission. The organiser will review the receipt; your place is not yet confirmed.' : 'Your receipt has been submitted. Your name will show as Verified once the organiser checks your payment.' }}</p><p class="reference">Keep your registration reference <strong>{{ registrationRef }}</strong></p><span v-if="!paymentException" class="pending-badge">Awaiting payment verification</span></section>
      <div v-else-if="!hold" class="signup-step">
        <p v-if="!publicLoaded" role="status">{{ refreshing ? 'Checking available places…' : 'Availability could not be loaded.' }} <button v-if="!refreshing" class="inline-button" @click="loadPublic">Try again</button></p>
        <div v-else-if="!canRegister" class="registration-closed"><h3>{{ event?.stage !== 'registration' ? 'Registration has ended.' : availablePlaces === 0 ? 'All places are currently reserved.' : 'Registration is closed.' }}</h3><p>{{ event?.stage !== 'registration' ? 'The playing roster is set. Follow table assignments and certified scores in Standings.' : 'Please check back for availability before sending a payment.' }}</p><button class="inline-button" @click="activeTab = 'standings'">View standings →</button></div>
        <form v-else @submit.prevent="reservePlace">
          <label for="display-name">Name for the public participant list</label>
          <input id="display-name" v-model="name" maxlength="80" autocomplete="name" required placeholder="Your name">
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <button class="event-button" :disabled="busy || !canRegister">{{ busy ? 'Reserving…' : canRegister ? 'Continue to payment' : 'Registration is closed' }}</button>
          <p class="small-print">A reservation holds one place for {{ holdDuration }} minutes. No participant account is needed.</p>
        </form>
      </div>
      <div v-else ref="paymentPanel" class="payment-step" tabindex="-1">
        <div class="hold-note"><div><strong>{{ holdExpired ? 'Your place reservation has expired.' : `${holdCountdown} left to complete registration` }}</strong><small>{{ holdExpired ? 'Already paid? Submit your receipt for organiser review. Your place will need to be checked.' : `Held for ${hold.name} until ${holdExpiry}. Already paid? Upload your receipt before leaving.` }}</small></div><button type="button" class="inline-button" :disabled="busy" @click="cancelHold">Release place</button></div>
        <div class="payment-instructions"><h3>Pay RM10</h3><p>Send your entry fee by Touch ’n Go or DuitNow to:</p><a href="tel:+60162459482">+60 16-245 9482</a><p>Recipient name: <strong>NICHOLAS</strong></p><button type="button" class="copy-button" @click="copyNumber">{{ copied ? 'Number copied' : 'Copy number' }}</button></div>
        <form @submit.prevent="submitReceipt">
          <label for="receipt">Upload your payment receipt <span>(JPG, PNG or PDF · up to 5 MB)</span></label>
          <input id="receipt" ref="receiptInput" type="file" accept="image/jpeg,image/png,application/pdf" required :disabled="busy" @change="chooseReceipt">
          <div v-if="receipt" class="receipt-selection"><img v-if="receipt.type.startsWith('image/')" :src="receiptPreviewUrl" alt="Selected receipt preview"><div><strong>{{ receipt.name }}</strong><small>{{ (receipt.size / 1024).toFixed(0) }} KB · {{ receipt.type === 'application/pdf' ? 'PDF document' : 'Image receipt' }}</small></div><button type="button" class="inline-button" :disabled="busy" @click="removeReceipt">Remove</button></div>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <button class="event-button" :disabled="busy || !receipt">{{ busy ? 'Uploading securely…' : 'Submit receipt and register' }}</button>
        </form>
      </div>
    </section>

    <section class="registrant-section"><div><p class="eyebrow">The field</p><h2>Registered players</h2><p>Payment checks are handled by the organiser. This list updates as registrations arrive.</p></div><div class="registrant-counts"><span><strong>{{ verifiedCount }}</strong> verified</span><span><strong>{{ pendingCount }}</strong> awaiting verification</span></div>
      <p v-if="!publicLoaded" class="empty-list">{{ standingsError ? 'The registration list is temporarily unavailable. Please try refreshing.' : 'Loading registered players…' }}</p>
      <p v-else-if="!registrations.length" class="empty-list">No submitted registrations yet. Be the first at the table.</p>
      <ul v-else class="registrant-list"><li v-for="player in registrations" :key="player.id"><strong>{{ player.display_name }}</strong><span :class="player.status==='verified'?'verified-badge':'pending-badge'">{{ player.status==='verified'?'Verified':'Awaiting verification' }}</span></li></ul>
    </section>

    <section class="format-strip"><div><p class="eyebrow">The format</p><h2>Three hanchans to a champion</h2></div><p>Play two qualifying East–South hanchans. The four highest eligible players meet in one final, starting again at 30,000 points. Entry and registration do not require a player account.</p><button ref="guideTrigger" type="button" class="guide-trigger" @click="openGuide">Read the tournament guide <span aria-hidden="true">↗</span></button></section>

    <dialog ref="guideDialog" class="guide-dialog" aria-labelledby="guide-title" aria-describedby="guide-description" @click="closeGuideFromBackdrop" @close="restoreGuideFocus">
      <div class="guide-shell">
        <div class="guide-topbar"><span><i aria-hidden="true"></i> SAUJANA · RIICHI OPEN I</span><button type="button" class="guide-close" aria-label="Close tournament guide" @click="closeGuide">×</button></div>
        <header class="guide-header"><p class="eyebrow">Tournament guide</p><h2 id="guide-title">Know the rules.<br><em>Enjoy the game.</em></h2><p id="guide-description">The complete event guide, with Riichi Open arrangements and WRC 2025 gameplay rules.</p><div class="guide-chips"><span>2 qualifying hanchans</span><span>Top 4 final</span><span>30,000 starting points</span></div></header>
        <div class="guide-reader" aria-live="polite">
          <p v-if="guideLoading" class="guide-state">Opening the guide…</p>
          <div v-else-if="guideError" class="guide-state guide-error"><p>{{ guideError }}</p><button type="button" class="guide-retry" @click="loadGuide">Try again</button></div>
          <article v-else class="guide-content" v-html="guideHtml"></article>
        </div>
        <footer class="guide-footer"><span>Gameplay follows WRC Rules 2025 and its official clarification.</span><button type="button" @click="closeGuide">Back to event</button></footer>
      </div>
    </dialog>
    </section>

    <section v-show="activeTab === 'standings'" id="riichi-standings-panel" role="tabpanel" aria-labelledby="riichi-standings-tab">
      <RiichiOpenStandings :event="event" :snapshot="snapshot" :updated-at="updatedAt" :loading="!publicLoaded && !standingsError" :refreshing="refreshing" :error="standingsError" @refresh="loadPublic" @register="goToRegistration" />
    </section>
  </main>
</template>

<script setup>
import { marked } from 'marked'
import DOMPurify from 'dompurify'

useHead({ title: 'Riichi Open I | Saujana BGC', meta: [{ name: 'description', content: 'Register for Riichi Open I and follow certified standings for the 14 November 2026 event at Boardroom Bandit, Ara Damansara.' }] })
const route = useRoute()
const router = useRouter()
const activeTab = ref(route.query.tab === 'standings' ? 'standings' : 'registration')
watch(() => route.query.tab, tab => { activeTab.value = tab === 'standings' ? 'standings' : 'registration' })
watch(activeTab, tab => {
  const query = { ...route.query }
  if (tab === 'standings') query.tab = 'standings'
  else delete query.tab
  if (route.path.replace(/\/+$/, '') === '/riichi-open' && route.query.tab !== query.tab) router.replace({ path: route.path, query })
})
const { callPublic } = useRiichiOpen()
const guideDialog = ref(null)
const guideTrigger = ref(null)
const guideMarkdown = ref('')
const guideLoading = ref(false)
const guideError = ref('')
const guideHtml = computed(() => {
  if (!guideMarkdown.value) return ''
  const parsed = DOMPurify.sanitize(marked.parse(guideMarkdown.value, { async: false, gfm: true }))
  const document = new DOMParser().parseFromString(parsed, 'text/html')
  for (const link of document.body.querySelectorAll('a')) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  return DOMPurify.sanitize(document.body.innerHTML)
})
const event = ref(null)
const registrations = ref([])
const snapshot = ref(null)
const updatedAt = ref(null)
const standingsError = ref('')
const publicLoaded = ref(false)
const refreshing = ref(false)
const registrationPanel = ref(null)
const paymentPanel = ref(null)
const confirmationPanel = ref(null)
const receiptInput = ref(null)
const receiptPreviewUrl = ref('')
const now = ref(Date.now())
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
const canRegister = computed(() => event.value?.stage === 'registration' && Boolean(event.value?.registration_open) && availablePlaces.value > 0)
const eventStatus = computed(() => event.value?.stage === 'registration' ? (canRegister.value ? 'Registration open' : availablePlaces.value === 0 ? 'All places reserved' : 'Registration closed') : ({qualifier_1:'Qualifier 1 in progress',qualifier_2:'Qualifier 2 in progress',final:'The final is underway',completed:'Event complete'}[event.value?.stage] ?? 'Event updates'))
const holdDuration = computed(() => Number(event.value?.registration_hold_minutes ?? 30))
const holdExpiry = computed(() => hold.value?.expires_at ? new Date(hold.value.expires_at).toLocaleTimeString('en-MY',{timeZone:'Asia/Kuala_Lumpur',hour:'numeric',minute:'2-digit'}) : '')
const holdSeconds = computed(() => Math.max(0, Math.ceil((new Date(hold.value?.expires_at ?? now.value).getTime() - now.value) / 1000)))
const holdCountdown = computed(() => `${Math.floor(holdSeconds.value / 60)}:${String(holdSeconds.value % 60).padStart(2,'0')}`)
const holdExpired = computed(() => Boolean(hold.value) && holdSeconds.value === 0)
let refreshTimer, clockTimer, guideReturnFocus

watch(receipt, file => {
  if (receiptPreviewUrl.value) URL.revokeObjectURL(receiptPreviewUrl.value)
  receiptPreviewUrl.value = file?.type.startsWith('image/') ? URL.createObjectURL(file) : ''
})
function removeReceipt() { receipt.value = null; if (receiptInput.value) receiptInput.value.value = '' }
async function goToRegistration() { activeTab.value = 'registration'; await nextTick(); registrationPanel.value?.scrollIntoView({behavior:'smooth',block:'start'}); registrationPanel.value?.focus({preventScroll:true}) }

function openGuide(event) {
  guideReturnFocus = event?.currentTarget ?? guideTrigger.value
  if (!guideDialog.value?.open) guideDialog.value?.showModal()
  if (!guideMarkdown.value) loadGuide()
}

async function loadGuide() {
  guideLoading.value = true
  guideError.value = ''
  try {
    const response = await fetch('/riichi-open/rules.md')
    if (!response.ok) throw new Error('The tournament guide could not be loaded. Please try again.')
    guideMarkdown.value = await response.text()
  } catch (cause) {
    guideError.value = cause.message || 'The tournament guide could not be loaded. Please try again.'
  } finally {
    guideLoading.value = false
  }
}

function closeGuide() { guideDialog.value?.close() }
function closeGuideFromBackdrop(event) { if (event.target === guideDialog.value) closeGuide() }
function restoreGuideFocus() { guideReturnFocus?.focus() }

onMounted(async () => {
  clockTimer = window.setInterval(() => { now.value = Date.now() }, 1000)
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
  refreshTimer=window.setInterval(loadPublic,30000)
  window.addEventListener('focus',loadPublic)
})
onBeforeUnmount(()=>{if(refreshTimer)window.clearInterval(refreshTimer);if(clockTimer)window.clearInterval(clockTimer);if(receiptPreviewUrl.value)URL.revokeObjectURL(receiptPreviewUrl.value);window.removeEventListener('focus',loadPublic)})

async function loadPublic() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    const data = await callPublic('summary')
    event.value = data.event
    registrations.value = data.registrations ?? []
    activeHolds.value = Number(data.active_holds ?? 0)
    snapshot.value = data.publication?.snapshot ?? null
    updatedAt.value = snapshot.value?.last_certified ?? data.publication?.created_at ?? null
    standingsError.value = ''
    publicLoaded.value = true
    if (notice.value.startsWith('Live registration')) notice.value = ''
  } catch (cause) {
    notice.value = 'Live registration details are temporarily unavailable. Please refresh in a moment.'
    standingsError.value = cause.message || 'Please refresh in a moment.'
  } finally { refreshing.value = false }
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
    now.value = Date.now()
    sessionStorage.setItem(HOLD_KEY,JSON.stringify({id:hold.value.id,expires_at:hold.value.expires_at,path:hold.value.path,token:hold.value.token,idempotency_key:hold.value.idempotency_key,name:hold.value.name}))
    sessionStorage.removeItem(DRAFT_KEY)
    await loadPublic()
    await nextTick()
    paymentPanel.value?.scrollIntoView({behavior:'smooth',block:'start'})
    paymentPanel.value?.focus({preventScroll:true})
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
    await nextTick()
    confirmationPanel.value?.scrollIntoView({behavior:'smooth',block:'center'})
    confirmationPanel.value?.focus({preventScroll:true})
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
.guide-header{text-align:left}
.event-page{width:min(1120px,92%);margin:0 auto;color:var(--clay-text);padding:0 0 30px}.event-hero{position:relative;display:grid;grid-template-columns:1.15fr .85fr;align-items:center;min-height:580px;overflow:hidden;padding:28px clamp(20px,5vw,64px);background:radial-gradient(ellipse at 76% 40%,#ebe8d8 0,#f7f5ef 55%);border:1px solid var(--line);border-radius:12px}.hero-copy{z-index:1;max-width:610px}.eyebrow{margin:0 0 12px;color:var(--gold-leaf);font-size:.72rem;letter-spacing:.11em;text-transform:uppercase}.event-hero h1{font:400 clamp(3rem,7vw,5.6rem)/.98 var(--font-display);letter-spacing:-.045em;color:var(--matcha-leaf);margin:0}.event-hero h1 em{font-style:italic;color:var(--gold-leaf)}.hero-intro{max-width:490px;font:1.12rem/1.6 var(--font-display);color:#4b5148}.event-facts{display:grid;gap:8px;margin:26px 0 20px;font-size:.92rem}.event-facts span:before{content:'✳';color:var(--gold-leaf);margin-right:10px}.event-offer{display:flex;align-items:center;gap:11px;margin:20px 0 18px}.event-offer strong{font:2.4rem var(--font-display);color:var(--matcha-leaf)}.event-offer>span{font-size:.82rem}.event-offer i{height:28px;border-left:1px solid var(--line);margin:0 7px}.text-link{display:inline-flex;color:var(--matcha-leaf);font-weight:650;text-underline-offset:4px}.mika-frame{align-self:end;justify-self:center;width:min(100%,410px);height:510px;overflow:hidden;display:flex;align-items:flex-end;justify-content:center}.mika-frame img{height:100%;width:100%;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 14px 20px #354c3e20)}.registration-panel{display:grid;grid-template-columns:1fr minmax(180px,.45fr);gap:24px;margin:30px 0;padding:clamp(22px,4vw,40px);background:var(--matcha-leaf);color:white;border-radius:10px}.register-heading h2,.registrant-section h2,.format-strip h2{font:2rem var(--font-display);margin:0 0 10px}.register-heading p:last-child{max-width:570px;line-height:1.65;color:#f0f1e9}.availability{align-self:center;padding:17px;background:#ffffff10;border:1px solid #ffffff30;border-radius:8px;display:grid;gap:6px}.availability>strong{font:2.2rem var(--font-display)}.availability>span,.availability small{font-size:.78rem;opacity:.8}.capacity-track{height:7px;background:#ffffff30;border-radius:10px;margin:6px 0;overflow:hidden}.capacity-track i{display:block;height:100%;background:#d9c087;border-radius:10px}.signup-step,.payment-step,.confirmation{grid-column:1/-1;padding:21px;background:var(--white-pure);border-radius:8px;color:var(--clay-text)}.signup-step form,.payment-step form{display:grid;gap:10px}.signup-step label,.payment-step label{font-size:.87rem;font-weight:650}.signup-step input:not([type=file]){width:min(100%,520px);padding:12px;border:1px solid var(--line);border-radius:6px;font:inherit}.small-print,.payment-step label span{font-size:.78rem;color:var(--muted)}.event-button{background:var(--gold-leaf);color:white;border:0;border-radius:6px;padding:13px 17px;font:inherit;font-weight:700;cursor:pointer;width:max-content;max-width:100%}.event-button:disabled{opacity:.6;cursor:wait}.payment-step{display:grid;grid-template-columns:minmax(220px,.8fr) 1fr;gap:22px}.payment-instructions{padding:18px;background:var(--surface-soft);border-radius:8px}.payment-instructions h3{font:1.35rem var(--font-display);color:var(--matcha-leaf);margin:0}.payment-instructions a{font-weight:750;color:var(--matcha-leaf);font-size:1.2rem}.copy-button,.inline-button{border:1px solid var(--line);background:var(--white-pure);border-radius:5px;padding:8px 12px;color:var(--matcha-leaf);font:inherit;cursor:pointer}.hold-note{grid-column:1/-1;display:flex;justify-content:space-between;gap:12px;color:var(--matcha-leaf)}.payment-step input[type=file]{border:1px dashed var(--line);padding:14px;border-radius:6px}.file-selected{font-size:.8rem;color:var(--muted)}.form-error{color:#963f47}.confirmation{text-align:center;padding:35px}.confirm-mark{display:grid;place-items:center;width:42px;height:42px;margin:auto;border-radius:50%;background:#e6ede5;color:var(--matcha-leaf);font-size:1.2rem}.confirmation h3{font:1.7rem var(--font-display);color:var(--matcha-leaf)}.reference{font-size:.82rem}.pending-badge,.verified-badge{display:inline-block;padding:5px 9px;border-radius:99px;background:#f3ead4;color:#705525;font-size:.72rem}.verified-badge{background:#e4eee5;color:#35583b}.registrant-section{padding:30px 0;border-top:1px solid var(--line)}.registrant-section>div:first-child p:last-child{color:var(--muted)}.registrant-counts{display:flex;gap:22px;font-size:.82rem;color:var(--muted);margin:18px 0}.registrant-counts strong{color:var(--matcha-leaf)}.registrant-list{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.registrant-list li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:7px}.registrant-list li strong{overflow-wrap:anywhere}.empty-list{padding:18px;background:var(--surface-soft);border-radius:7px;color:var(--muted)}.format-strip{display:grid;grid-template-columns:1fr 1fr;gap:10px 40px;align-items:center;padding:28px 0;border-top:1px solid var(--line)}.format-strip>p{line-height:1.7;color:var(--muted)}.format-strip .text-link{grid-column:2}.notice{grid-column:1/-1;background:#fff5df;color:#71592c;padding:10px;border-radius:5px}
@media(max-width:760px){.event-hero{grid-template-columns:1fr;min-height:auto;padding:28px 24px 0}.hero-copy{padding-bottom:16px}.mika-frame{height:min(94vw,460px);width:min(100%,390px)}.registration-panel{grid-template-columns:1fr}.availability{width:auto}.payment-step{grid-template-columns:1fr}.registrant-list{grid-template-columns:1fr}.format-strip{grid-template-columns:1fr}.format-strip .text-link{grid-column:auto}}
.hold-note small{display:block;margin-top:4px;font-size:.75rem;color:var(--muted)}
</style>

<style scoped>
.format-strip .guide-trigger{grid-column:2;justify-self:start;border:0;padding:0;background:none;color:var(--matcha-leaf);font:650 .95rem 'Segoe UI',sans-serif;text-decoration:underline;text-underline-offset:4px;cursor:pointer}
.guide-trigger span{display:inline-block;margin-left:5px;color:var(--gold-leaf);transition:transform .18s ease}
.guide-trigger:hover span{transform:translate(3px,-2px)}
.guide-trigger:focus-visible,.guide-close:focus-visible,.guide-footer button:focus-visible,.guide-retry:focus-visible{outline:3px solid #bc9d60;outline-offset:3px}
.guide-dialog{width:min(920px,calc(100% - 24px));max-width:920px;height:min(88dvh,940px);max-height:calc(100dvh - 24px);padding:0;border:1px solid #d8d5c8;border-radius:18px;background:transparent;color:var(--clay-text);box-shadow:0 28px 100px #111a1280;overflow:hidden}
.guide-dialog::backdrop{background:#18241bcc;backdrop-filter:blur(5px)}
.guide-shell{height:100%;display:flex;flex-direction:column;background:#fbfaf6}
.guide-topbar{display:flex;align-items:center;justify-content:space-between;flex:0 0 auto;padding:13px 21px;background:#354c3e;color:#f8f6ed;font-size:.67rem;letter-spacing:.13em}
.guide-topbar>span{display:flex;align-items:center;gap:10px}.guide-topbar i{width:8px;height:8px;border-radius:50%;background:#d6be7e;box-shadow:0 0 0 4px #ffffff18}
.guide-close{width:34px;height:34px;border:1px solid #ffffff50;border-radius:50%;background:#ffffff12;color:white;font:1.5rem/1 'Segoe UI',sans-serif;cursor:pointer}
.guide-header{flex:0 0 auto;padding:clamp(24px,5vw,44px) clamp(22px,6vw,60px) 24px;background:radial-gradient(ellipse at 90% 0,#ece8d8 0,transparent 48%);border-bottom:1px solid #e5e1d5}
.guide-header .eyebrow{margin:0 0 10px}.guide-header h2{margin:0;color:var(--matcha-leaf);font:400 clamp(2rem,5vw,3.35rem)/1.08 var(--font-display);letter-spacing:-.025em}.guide-header h2 em{color:var(--gold-leaf);font-weight:400}
.guide-header>p:last-of-type{max-width:610px;margin:12px 0 0;color:#6c7066;font-size:.9rem;line-height:1.65}
.guide-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px}.guide-chips span{padding:7px 10px;border:1px solid #dbd6c6;border-radius:99px;background:#ffffffbd;color:#475447;font-size:.68rem;font-weight:650}
.guide-reader{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;padding:clamp(22px,5vw,50px) clamp(22px,6vw,60px);scrollbar-color:#c9c2ae transparent;scrollbar-width:thin}
.guide-state{min-height:120px;display:grid;place-content:center;text-align:center;color:#73776f;line-height:1.65}.guide-error{color:#913f45}.guide-error p{margin:0}.guide-retry{justify-self:center;margin-top:10px;border:1px solid #a9884d;border-radius:5px;background:#fff;color:#5a644e;padding:8px 13px;cursor:pointer}
.guide-content{max-width:760px;margin:0 auto;color:#454a43;font-size:.91rem;line-height:1.78;overflow-wrap:anywhere}
.guide-content :deep(h1){margin:0 0 18px;color:#344d3c;font:400 clamp(1.8rem,4vw,2.5rem)/1.15 var(--font-display);letter-spacing:-.02em}
.guide-content :deep(h2){margin:34px 0 14px;padding:12px 15px;border-left:3px solid #a8894f;border-radius:0 7px 7px 0;background:#f0eee5;color:#354c3e;font:400 1.35rem/1.3 var(--font-display)}
.guide-content :deep(h3){margin:23px 0 8px;color:#4e644f;font:600 1rem/1.4 'Segoe UI',sans-serif}
.guide-content :deep(p){margin:10px 0 15px}.guide-content :deep(strong){color:#344d3c;font-weight:700}.guide-content :deep(em){color:#696b5d}
.guide-content :deep(ul),.guide-content :deep(ol){padding-left:1.35rem;margin:9px 0 18px}.guide-content :deep(li){padding-left:3px;margin:5px 0}.guide-content :deep(li::marker){color:#a8894f;font-weight:700}
.guide-content :deep(a){color:#46694c;text-decoration-thickness:1px;text-underline-offset:3px}.guide-content :deep(a:hover){color:#846633}
.guide-content :deep(blockquote){margin:18px 0;padding:12px 17px;border-left:3px solid #bca36d;background:#f4f1e7;color:#65695f}
.guide-content :deep(code){padding:2px 5px;border-radius:4px;background:#efede5;color:#344d3c;font: .86em ui-monospace,Consolas,monospace}
.guide-content :deep(hr){height:1px;margin:25px 0;border:0;background:#dedbce}
.guide-content :deep(table){width:100%;margin:14px 0 20px;border-collapse:collapse;font-size:.84rem}
.guide-content :deep(th){background:#354c3e;color:white;font-weight:650}.guide-content :deep(th),.guide-content :deep(td){padding:10px 12px;border:1px solid #dedbce;text-align:left}
.guide-content :deep(tr:nth-child(even) td){background:#f3f1e9}
.guide-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;flex:0 0 auto;padding:14px clamp(18px,4vw,36px);border-top:1px solid #e5e1d5;background:#fbfaf6;color:#77796f;font-size:.7rem;line-height:1.5}
.guide-footer button{flex:0 0 auto;border:0;border-radius:5px;background:#354c3e;color:white;padding:10px 14px;font:600 .77rem 'Segoe UI',sans-serif;cursor:pointer}
@media(max-width:760px){.format-strip .guide-trigger{grid-column:auto}.guide-dialog{height:calc(100dvh - 18px);max-height:calc(100dvh - 18px);width:calc(100% - 18px);border-radius:13px}.guide-topbar{padding:11px 15px;font-size:.58rem}.guide-reader{padding:22px 20px}.guide-content{font-size:.85rem;line-height:1.72}.guide-content :deep(table){display:block;overflow-x:auto;white-space:nowrap}.guide-footer{align-items:flex-start;font-size:.65rem}.guide-footer button{padding:9px 11px}}
@media(prefers-reduced-motion:reduce){.guide-trigger span{transition:none}}
.event-status-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 2px 18px;color:var(--matcha-leaf);font-size:.78rem}.event-status-bar>span{display:flex;align-items:center;gap:8px;font-weight:650}.event-status-bar i{width:7px;height:7px;background:#6c8260;border-radius:50%}.event-status-bar small{font-size:.73rem;color:var(--muted)}.event-hero{min-height:510px;border-radius:16px}.mika-frame{height:455px}.hero-actions{display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-top:25px}.hero-actions .event-button{display:flex;align-items:center;gap:24px;min-height:48px}.hero-guide{padding:10px 0;min-height:44px;border:0;border-bottom:1px solid #bdb9a8;background:none;font:600 .83rem var(--font-body);color:var(--matcha-leaf);cursor:pointer}.hero-reassurance{font-size:.72rem;line-height:1.6;color:var(--muted);max-width:420px;margin:14px 0 0}.registration-panel{scroll-margin-top:24px;border-radius:14px;outline-offset:5px}.register-heading .eyebrow{color:#e2c995}.signup-progress{display:grid;grid-template-columns:repeat(3,1fr);list-style:none;grid-column:1/-1;gap:16px;margin:0;padding:0 0 4px}.signup-progress li{display:flex;gap:9px;align-items:center;color:#cad0c7;font-size:.8rem;border-bottom:1px solid #ffffff30;padding-bottom:15px}.signup-progress li>span{display:grid;place-items:center;flex-shrink:0;width:25px;height:25px;border-radius:50%;border:1px solid #ffffff50;font-size:.7rem}.signup-progress .current{color:white;font-weight:650;border-color:#e2c995}.signup-progress .current>span{background:#e2c995;color:var(--matcha-leaf);border-color:#e2c995}.signup-progress .done>span{color:#e2c995;border-color:#e2c995}.signup-step,.payment-step,.confirmation{border-radius:10px;padding:clamp(18px,3vw,28px)}.signup-step input{min-height:48px}.event-button:disabled{cursor:not-allowed}.registration-closed h3{font:1.5rem var(--font-display);margin:0;color:var(--matcha-leaf)}.registration-closed p{color:var(--muted);font-size:.88rem;line-height:1.6}.hold-note{padding-bottom:16px;border-bottom:1px solid var(--line);align-items:flex-start}.hold-note strong{font-variant-numeric:tabular-nums}.hold-note .inline-button{flex-shrink:0;font-size:.74rem;min-height:42px}.payment-instructions{border:1px solid var(--line);border-radius:10px}.payment-instructions p{font-size:.88rem;line-height:1.65}.copy-button{min-height:44px}.payment-step label span{display:block;font-weight:400;margin-top:4px}.payment-step input[type=file]{max-width:100%;min-width:0;width:100%;font-size:.8rem;background:var(--bg-silk)}.payment-step input[type=file]::file-selector-button{border:0;background:var(--matcha-leaf);color:white;padding:9px 12px;border-radius:6px;cursor:pointer;margin-right:10px}.receipt-selection{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:8px;padding:10px;min-width:0}.receipt-selection>img{width:54px;height:64px;object-fit:cover;border-radius:5px;flex-shrink:0}.receipt-selection>div{flex:1;min-width:0}.receipt-selection strong{display:block;font-size:.8rem;overflow-wrap:anywhere}.receipt-selection small{display:block;font-size:.68rem;color:var(--muted);margin-top:4px}.receipt-selection .inline-button{font-size:.7rem;padding:7px;min-height:40px}.registrant-list li{background:var(--white-pure);min-height:58px}.registrant-list .pending-badge,.registrant-list .verified-badge{flex-shrink:0;font-size:.66rem}.confirmation .reference strong{display:block;margin-top:7px;font:1.6rem var(--font-display);letter-spacing:.1em;color:var(--matcha-leaf)}
@media(max-width:760px){.event-hero{display:block;min-height:0;padding:26px 22px}.hero-copy{padding-bottom:0}.event-hero h1{width:58%;min-height:185px;display:flex;flex-direction:column;justify-content:center;font-size:clamp(2.7rem,7vw,4.3rem)}.mika-frame{position:absolute;top:6px;right:10px;height:220px;width:38%;pointer-events:none}.hero-intro{font-size:1rem;margin-top:20px}.event-facts{font-size:.85rem;gap:8px;margin:20px 0}.event-offer{margin:16px 0}.hero-actions{margin-top:20px;gap:18px}.hero-reassurance{font-size:.69rem}.signup-progress{gap:8px}.signup-progress li{font-size:.69rem;gap:6px}.signup-progress li>span{width:22px;height:22px}.hold-note{flex-wrap:wrap}.event-status-bar small{font-size:.65rem}.registration-panel{gap:20px;padding:22px}.availability{grid-template-columns:auto 1fr;align-items:center;gap:1px 14px;padding:14px}.availability>strong{grid-row:span 2;font-size:2rem}.availability .capacity-track{grid-column:1/-1;width:100%;margin:8px 0 3px}.availability small{grid-column:1/-1}.payment-step .event-button{width:100%;justify-content:center}.registrant-list li{gap:8px;padding:12px;font-size:.83rem}}
@media(max-width:440px){.event-hero h1{font-size:2.7rem;min-height:175px;width:57%}.mika-frame{width:44%;height:210px;right:2px}.hero-actions{gap:12px}.hero-actions .event-button{width:100%;justify-content:space-between}.hero-guide{font-size:.8rem}.event-offer{gap:8px}.event-offer>span{font-size:.74rem}.event-offer i{margin:0 3px}.event-status-bar small{display:none}.registration-panel{padding:18px}.signup-progress li{font-size:.61rem;gap:5px}.signup-progress li>span{width:20px;height:20px}.registrant-list li{align-items:flex-start}.registrant-list .pending-badge{white-space:normal;text-align:center;max-width:110px}}
@media(prefers-reduced-motion:reduce){.event-page *{scroll-behavior:auto!important}}
</style>
