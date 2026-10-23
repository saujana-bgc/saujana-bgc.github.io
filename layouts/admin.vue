<template>
  <main class="admin-root">
    <section v-if="isRestoring || !isAuthenticated" class="admin-login-wrap">
      <div class="admin-login-intro"><NuxtLink to="/" class="admin-brand" aria-label="Saujana Board Game Community home"><img class="admin-brand-mark" src="/favicon.ico" alt="" width="38" height="38"><span class="admin-brand-copy">Saujana <small>Board Game Community</small></span></NuxtLink><p class="eyebrow">Saujana organisers</p><h1>Master <em>admin</em></h1><p>One organiser sign-in for Birthday Club and Riichi Open.</p></div>
      <form class="admin-login-card" @submit.prevent="submitLogin">
        <label>Username<input v-model="username" autocomplete="username" required></label>
        <label>Password<input v-model="password" type="password" autocomplete="current-password" required></label>
        <label class="remember"><input v-model="remember" type="checkbox"> Remember me on this device</label>
        <p v-if="isRestoring" class="admin-help" role="status">Checking for a saved session. You can sign in here if needed.</p>
        <p v-if="error" class="admin-error" role="alert">{{ error }}</p>
        <button class="admin-primary" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
        <p class="admin-help">Use the existing Birthday Club admin username and password.</p>
      </form>
    </section>
    <template v-else>
      <header class="admin-topbar"><NuxtLink to="/admin" class="admin-brand" aria-label="Saujana organiser workspace"><img class="admin-brand-mark" src="/favicon.ico" alt="" width="38" height="38"><span class="admin-brand-copy">Saujana <small>organiser workspace</small></span></NuxtLink><div><NuxtLink to="/" class="admin-public-link">Back to website</NuxtLink><button class="admin-signout" @click="signOut">Sign out</button></div></header>
      <nav class="admin-nav" aria-label="Admin pages"><NuxtLink v-for="item in adminNavigation" :key="item.id" :to="item.to" :class="{ active: isCurrentPage(item.to) }">{{ item.title }}</NuxtLink></nav>
      <div class="admin-page"><slot /></div>
    </template>
  </main>
</template>

<script setup>
import { adminNavigation } from '~/utils/adminNavigation.js'

useHead({ title: 'Saujana master admin', meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }] })
const auth = useAdminAuth()
const { isRestoring, isAuthenticated } = auth
const route = useRoute()
const router = useRouter()
const username = ref('admin')
const password = ref('')
const remember = ref(true)
const error = ref('')
const busy = ref(false)
let restoreWatchdog
function isCurrentPage(to) {
  const [path, hash] = to.split('#')
  if (route.path !== path) return false
  return hash ? route.hash === `#${hash}` : !route.hash
}

onMounted(async () => {
  restoreWatchdog = setTimeout(() => {
    if (!auth.isRestoring.value) return
    auth.cancelRestore()
    error.value = 'Session check timed out. Sign in with your admin username and password.'
  }, 12000)
  try { await auth.restoreSession() } catch { error.value = 'We could not check your saved session. Please sign in again.' }
  finally { clearTimeout(restoreWatchdog) }
})

async function submitLogin() {
  busy.value = true
  error.value = ''
  try {
    if (!await auth.login(username.value, password.value, remember.value)) {
      error.value = 'That username or password is not correct.'
      return
    }
    password.value = ''
    const next = route.path.startsWith('/admin') ? route.fullPath : '/admin'
    await router.replace(next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin')
  } catch { error.value = 'Sign-in is unavailable right now. Please try again.' }
  finally { busy.value = false }
}

async function signOut() { await auth.logout(); password.value = '' }
</script>

<style>
.admin-root{min-height:70vh;width:min(1240px,94%);margin:0 auto;padding:28px 0 64px;color:var(--clay-text)}
.admin-login-wrap{min-height:65vh;display:grid;grid-template-columns:1fr minmax(300px,450px);align-items:center;gap:clamp(28px,8vw,110px)}
.admin-login-intro h1,.admin-page h1{font:400 clamp(2.5rem,6vw,4.3rem)/1.05 var(--font-display);color:var(--matcha-leaf);margin:0}.admin-login-intro h1 em{color:var(--gold-leaf)}
.admin-login-intro>p:last-child{max-width:420px;color:var(--muted);line-height:1.7}
.admin-login-card{background:var(--white-pure);border:1px solid var(--line);border-top:3px solid var(--gold-leaf);border-radius:var(--radius-card);box-shadow:var(--shadow-card);padding:30px;display:grid;gap:17px;max-width:450px;margin:auto}
.admin-login-card label{display:grid;gap:7px;font-size:.85rem}.admin-login-card input:not([type=checkbox]){padding:12px;border:1px solid var(--line);border-radius:7px;font:inherit}.admin-login-card input:focus{outline:2px solid #8a6a3e55;border-color:var(--gold-leaf)}.admin-login-card .remember{display:flex;align-items:center;gap:9px;color:var(--muted)}
.admin-primary,.admin-action{border:0;border-radius:6px;background:var(--matcha-leaf);color:white;padding:12px 17px;font:inherit;font-weight:650;cursor:pointer}.admin-primary:disabled{opacity:.6;cursor:wait}.admin-help,.admin-error{margin:0;color:var(--muted);font-size:.86rem;line-height:1.55}.admin-error{color:#913f45}
.admin-topbar{display:flex;justify-content:space-between;align-items:center;padding:0 0 18px;border-bottom:1px solid var(--line)}.admin-brand{display:inline-flex;align-items:center;gap:12px;color:var(--matcha-leaf);text-decoration:none;font:1.35rem var(--font-display)}.admin-brand-mark{width:38px;height:38px;object-fit:cover;border-radius:50%;flex:0 0 auto}.admin-brand-copy{display:block}.admin-brand-copy small{display:block;margin-top:4px;font: .57rem 'Segoe UI',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.admin-login-intro>.admin-brand{margin-bottom:34px}.admin-topbar>div{display:flex;align-items:center;gap:16px}.admin-public-link,.admin-signout{color:var(--matcha-leaf);font:inherit}.admin-signout{border:1px solid var(--line);background:var(--white-pure);padding:8px 14px;border-radius:6px;cursor:pointer}
.admin-nav{display:flex;gap:7px;overflow:auto;padding:14px 0;border-bottom:1px solid var(--line)}.admin-nav a{flex:0 0 auto;text-decoration:none;color:var(--muted);padding:8px 10px;border-radius:5px;font-size:.82rem}.admin-nav a:hover,.admin-nav a.active{color:var(--matcha-leaf);background:var(--surface-soft)}.admin-page{padding-top:var(--page-top-inset)}.admin-page h1{font-size:clamp(2rem,4vw,3.3rem)}.admin-page .eyebrow,.admin-login-intro .eyebrow{color:var(--gold-leaf);font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px}
.admin-card{background:var(--white-pure);border:1px solid var(--line);border-radius:var(--radius-card);padding:22px;box-shadow:var(--shadow-card)}.admin-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:14px;margin-top:24px}.admin-link-card{display:block;color:inherit;text-decoration:none;transition:transform .15s,border-color .15s}.admin-link-card:hover{transform:translateY(-2px);border-color:var(--gold-leaf)}.admin-link-card h2{font:1.3rem var(--font-display);color:var(--matcha-leaf);margin:0 0 8px}.admin-link-card p{color:var(--muted);line-height:1.55;margin:0}.admin-link-card span{display:block;color:var(--gold-leaf);font-size:.8rem;margin-top:16px}
.admin-form-row{display:flex;flex-wrap:wrap;align-items:end;gap:12px}.admin-form-row label{display:grid;gap:6px;font-size:.84rem}.admin-form-row input,.admin-form-row select,.admin-form-row textarea{font:inherit;padding:10px;border:1px solid var(--line);border-radius:6px}.admin-table{width:100%;border-collapse:collapse}.admin-table th,.admin-table td{text-align:left;padding:11px;border-bottom:1px solid var(--line);vertical-align:top}.admin-table-wrap{overflow:auto}.admin-section{scroll-margin-top:24px;margin-top:34px}.admin-status{padding:12px 14px;background:var(--surface-soft);border-radius:6px;color:var(--matcha-leaf)}
@media(max-width:720px){.admin-login-wrap{grid-template-columns:1fr;padding:45px 0}.admin-login-intro{text-align:center}.admin-login-intro>.admin-brand{margin:0 auto 30px}.admin-login-intro>p:last-child{margin-inline:auto}.admin-topbar{align-items:flex-start;gap:14px}.admin-topbar>div{gap:10px;flex-wrap:wrap;justify-content:flex-end}.admin-brand{font-size:1.15rem}.admin-nav{margin-inline:-3vw;padding-inline:3vw}.admin-table{min-width:700px}}
</style>
