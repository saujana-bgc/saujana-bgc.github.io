<template>
  <main class="admin-root">
    <section v-if="isRestoring || !isAuthenticated" class="admin-login-wrap">
      <div class="admin-login-intro"><NuxtLink to="/" class="admin-brand" aria-label="Saujana Board Game Community home"><img class="admin-brand-mark brand-mark" src="/images/saujana-brand.webp" alt="" width="38" height="38"><span class="admin-brand-copy">Saujana <small>Board Game Community</small></span></NuxtLink><p class="eyebrow">Saujana organisers</p><h1>Organiser dashboard</h1><p>Sign in to manage community birthdays, Clocktower recaps and Riichi Open I.</p></div>
      <form class="admin-login-card" @submit.prevent="submitLogin">
        <label>Username<UInput v-model="username" class="admin-login-input" autocomplete="username" required /></label>
        <label>Password<UInput v-model="password" class="admin-login-input" type="password" autocomplete="current-password" required /></label>
        <label class="remember"><UCheckbox v-model="remember" /> Remember me on this device</label>
        <p v-if="isRestoring" class="admin-help" role="status">Checking for a saved session. You can sign in here if needed.</p>
        <p v-if="error" class="admin-error" role="alert">{{ error }}</p>
        <UButton class="admin-primary" type="submit" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</UButton>
        <p class="admin-help">Use your organiser username and password.</p>
      </form>
    </section>
    <template v-else>
      <header class="admin-topbar"><NuxtLink to="/admin" class="admin-brand" aria-label="Saujana organiser workspace"><img class="admin-brand-mark brand-mark" src="/images/saujana-brand.webp" alt="" width="38" height="38"><span class="admin-brand-copy">Saujana <small>organiser workspace</small></span></NuxtLink><div><NuxtLink to="/" class="admin-public-link">Back to the website</NuxtLink><UButton class="admin-signout" color="neutral" variant="outline" @click="signOut">Sign out</UButton></div></header>
      <nav class="admin-nav" aria-label="Admin pages">
        <NuxtLink
          v-for="item in adminNavigation"
          :key="item.id"
          :to="item.to"
          :class="{ active: isCurrentPage(item.to) }"
          :aria-current="isCurrentPage(item.to) ? 'page' : undefined"
          :aria-label="item.id === 'botc-archive' ? 'Only Blood in the Clocktower organiser' : undefined"
        >
          {{ item.id === 'botc-archive' ? 'Clocktower organiser' : item.title }}
        </NuxtLink>
      </nav>
      <div class="admin-page"><slot /></div>
    </template>
  </main>
</template>

<script setup>
import { adminNavigation } from '~/utils/adminNavigation.js'

useHead({ title: 'Organiser Dashboard | Saujana BGC', meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }] })
const auth = useAdminAuth()
const { isRestoring, isAuthenticated } = auth
const route = useRoute()
const router = useRouter()
const username = ref('admin')
const password = ref('')
const remember = ref(false)
const error = ref('')
const busy = ref(false)
let restoreWatchdog
function isCurrentPage(to) {
  return route.path.replace(/\/+$/, '') === to
}

onMounted(async () => {
  restoreWatchdog = setTimeout(() => {
    if (!auth.isRestoring.value) return
    auth.cancelRestore()
    error.value = 'Session check timed out. Sign in with your admin username and password.'
  }, 12000)
  try { await auth.restoreSession() } catch { error.value = 'We couldn’t check your saved session. Sign in again.' }
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
.admin-topbar{display:flex;justify-content:space-between;align-items:center;padding:0 0 18px;border-bottom:1px solid var(--line)}.admin-brand{display:inline-flex;align-items:center;gap:12px;color:var(--matcha-leaf);text-decoration:none;font:1.35rem var(--font-display)}.admin-brand-mark{flex:0 0 auto}.admin-brand-copy{display:block}.admin-brand-copy small{display:block;margin-top:4px;font: .57rem 'Segoe UI',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.admin-login-intro>.admin-brand{margin-bottom:34px}.admin-topbar>div{display:flex;align-items:center;gap:16px}.admin-public-link,.admin-signout{color:var(--matcha-leaf);font:inherit}.admin-signout{border:1px solid var(--line);background:var(--white-pure);padding:8px 14px;border-radius:6px;cursor:pointer}
.admin-nav{display:flex;gap:7px;overflow:auto;padding:14px 0;border-bottom:1px solid var(--line)}.admin-nav a{flex:0 0 auto;text-decoration:none;color:var(--muted);padding:8px 10px;border-radius:5px;font-size:.82rem}.admin-nav a:hover,.admin-nav a.active{color:var(--matcha-leaf);background:var(--surface-soft)}.admin-page{padding-top:var(--page-top-inset)}.admin-page h1{font-size:clamp(2rem,4vw,3.3rem)}.admin-page .eyebrow,.admin-login-intro .eyebrow{color:var(--gold-leaf);font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px}
.admin-card{background:var(--white-pure);border:1px solid var(--line);border-radius:var(--radius-card);padding:22px;box-shadow:var(--shadow-card)}
.admin-form-row{display:flex;flex-wrap:wrap;align-items:end;gap:12px}.admin-form-row label{display:grid;gap:6px;font-size:.84rem}.admin-form-row input,.admin-form-row select,.admin-form-row textarea{font:inherit;padding:10px;border:1px solid var(--line);border-radius:6px}.admin-table{width:100%;border-collapse:collapse}.admin-table th,.admin-table td{text-align:left;padding:11px;border-bottom:1px solid var(--line);vertical-align:top}.admin-table-wrap{overflow:auto}.admin-section{scroll-margin-top:24px;margin-top:34px}.admin-status{padding:12px 14px;background:var(--surface-soft);border-radius:6px;color:var(--matcha-leaf)}
@media(max-width:720px){.admin-login-wrap{grid-template-columns:1fr;padding:30px 0;gap:20px}.admin-login-intro{text-align:center}.admin-login-intro>.admin-brand{margin:0 auto 18px}.admin-login-intro>p:last-child{margin-inline:auto}.admin-topbar{align-items:flex-start;gap:14px}.admin-topbar>div{gap:10px;flex-wrap:wrap;justify-content:flex-end}.admin-brand{font-size:1.15rem}.admin-nav{margin-inline:-3vw;padding-inline:3vw}.admin-table{min-width:700px}}
@media (min-width: 721px) {
  .admin-login-wrap { grid-template-columns: minmax(0, 0.9fr) minmax(300px, 420px); gap: clamp(32px, 5vw, 70px); }
  .admin-login-intro { justify-self: end; }
  .admin-login-card { margin-inline: 0; width: 100%; }
}
.admin-nav { flex-wrap: wrap; }
.admin-nav a { min-height: 44px; display: inline-flex; align-items: center; }
.admin-nav a.active { box-shadow: inset 0 -2px 0 var(--gold-leaf); }
</style>
