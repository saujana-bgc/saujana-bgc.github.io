<template>
  <div class="calendar-shell">
    <main class="calendar-page">
      <section v-if="isRestoring" class="state-card loading-card" aria-live="polite">
        <span class="loading-spark" aria-hidden="true">&#10022;</span>
        <p>Opening your private calendar&hellip;</p>
      </section>

      <section v-else-if="!isAuthenticated" class="login-wrap" aria-labelledby="login-title">
        <div class="login-intro fade-up">
          <p class="eyebrow">Private keeper&rsquo;s view</p>
          <h1 id="login-title">Birthday Club<br><em>Calendar</em></h1>
          <p>Sign in to see the community birthday calendar and public greeting preferences.</p>
        </div>

        <form class="login-card fade-up" novalidate @submit.prevent="submitLogin">
          <div class="lock-mark" aria-hidden="true">&#10022;</div>

          <div class="field-group">
            <label for="calendar-username">Username</label>
            <input
              id="calendar-username"
              v-model="username"
              type="text"
              name="username"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              :aria-invalid="Boolean(loginError)"
              @input="loginError = ''"
            >
          </div>

          <div class="field-group">
            <label for="calendar-password">Password</label>
            <input
              id="calendar-password"
              v-model="password"
              type="password"
              name="password"
              autocomplete="current-password"
              :aria-invalid="Boolean(loginError)"
              @input="loginError = ''"
            >
          </div>

          <label class="remember-row" for="calendar-remember">
            <input id="calendar-remember" v-model="rememberMe" type="checkbox">
            <span class="check-box" aria-hidden="true"></span>
            <span>
              <strong>Remember me</strong>
              <small>Keep me signed in on this device.</small>
            </span>
          </label>

          <p v-if="loginError" class="form-error" role="alert">{{ loginError }}</p>

          <button class="primary-button" type="submit" :disabled="isLoggingIn">
            {{ isLoggingIn ? 'Signing in…' : 'Open calendar' }}
          </button>

          <p class="security-note">Your password is handled by the secure sign-in service and is never stored by this page.</p>
        </form>
      </section>

      <template v-else>
        <header class="calendar-header fade-up">
          <div>
            <p class="eyebrow">Private keeper&rsquo;s view</p>
            <h1>Birthday Club <em>Calendar</em></h1>
            <p class="header-copy">Every birthday at a glance, with each member&rsquo;s greeting preference kept close by.</p>
          </div>
          <button class="logout-button" type="button" @click="signOut">Sign out</button>
        </header>

        <section v-if="loadError" class="state-card error-card" role="alert">
          <h2>We couldn&rsquo;t open the calendar.</h2>
          <p>{{ loadError }}</p>
          <button class="secondary-button" type="button" @click="loadBirthdays">Try again</button>
        </section>

        <section v-else class="calendar-content" aria-label="Birthday calendar">
          <div class="calendar-toolbar fade-up">
            <div class="year-control" aria-label="Calendar year">
              <button type="button" aria-label="Previous year" @click="calendarYear--">&larr;</button>
              <strong>{{ calendarYear }}</strong>
              <button type="button" aria-label="Next year" @click="calendarYear++">&rarr;</button>
            </div>

            <div class="summary-stats" aria-live="polite">
              <span><strong>{{ birthdays.length }}</strong> birthdays</span>
              <span><strong>{{ publicGreetingCount }}</strong> public wishes</span>
            </div>

            <button v-if="calendarYear !== currentYear" class="today-button" type="button" @click="calendarYear = currentYear">
              Back to {{ currentYear }}
            </button>
          </div>

          <div v-if="isLoading" class="state-card loading-card" aria-live="polite">
            <span class="loading-spark" aria-hidden="true">&#10022;</span>
            <p>Gathering birthdays&hellip;</p>
          </div>

          <div v-else class="months-grid">
            <article v-for="month in calendarMonths" :key="month.index" class="month-card fade-up" :class="{ 'current-month': isCurrentMonth(month.index) }">
              <header class="month-heading">
                <h2>{{ month.name }}</h2>
                <span>{{ month.birthdayCount || '—' }}</span>
              </header>

              <div class="weekday-row" aria-hidden="true">
                <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
              </div>

              <div class="days-grid">
                <span v-for="blank in month.leadingBlanks" :key="`blank-${blank}`" class="blank-day" aria-hidden="true"></span>
                <div
                  v-for="day in month.days"
                  :key="day.number"
                  class="day-cell"
                  :class="{ 'has-birthday': day.birthdays.length, today: isToday(month.index, day.number) }"
                >
                  <span class="day-number">{{ day.number }}</span>
                  <ul v-if="day.birthdays.length" class="birthday-list">
                    <li v-for="birthday in day.birthdays" :key="birthday.id">
                      <span class="person-name" :title="birthday.name">{{ birthday.name }}</span>
                      <span
                        class="wish-status"
                        :class="birthday.allow_public_greeting ? 'public-wish' : 'private-wish'"
                        :title="birthday.allow_public_greeting ? 'Public birthday greeting is allowed' : 'Do not greet publicly'"
                      >
                        {{ birthday.allow_public_greeting ? 'Public' : 'Private' }}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </article>
          </div>

          <div v-if="!isLoading" class="calendar-legend" aria-label="Greeting preference legend">
            <span><i class="legend-dot public-dot"></i> Public wish is okay</span>
            <span><i class="legend-dot private-dot"></i> Keep the wish private</span>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
useHead({
  title: 'Birthday Club Calendar | Saujana BGC',
  meta: [
    { name: 'robots', content: 'noindex, nofollow, noarchive' },
    { name: 'description', content: 'Private Saujana BGC birthday calendar.' },
  ],
})

const {
  isAuthenticated,
  login,
  logout,
  restoreSession,
  fetchBirthdays,
} = useBirthdayAdmin()

const now = new Date()
const currentYear = now.getFullYear()
const calendarYear = ref(currentYear)
const username = ref('admin')
const password = ref('')
const rememberMe = ref(true)
const loginError = ref('')
const loadError = ref('')
const birthdays = ref([])
const isRestoring = ref(true)
const isLoggingIn = ref(false)
const isLoading = ref(false)

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const publicGreetingCount = computed(() => birthdays.value.filter(birthday => birthday.allow_public_greeting).length)

const birthdaysByDate = computed(() => {
  const groups = new Map()
  for (const birthday of birthdays.value) {
    const key = `${birthday.birth_month}-${birthday.birth_day}`
    const group = groups.get(key) ?? []
    group.push(birthday)
    groups.set(key, group)
  }
  return groups
})

const calendarMonths = computed(() => monthNames.map((name, monthIndex) => {
  const monthNumber = monthIndex + 1
  const daysInMonth = new Date(calendarYear.value, monthNumber, 0).getDate()
  const nativeWeekday = new Date(calendarYear.value, monthIndex, 1).getDay()
  const leadingBlanks = (nativeWeekday + 6) % 7
  const days = Array.from({ length: daysInMonth }, (_, index) => ({
    number: index + 1,
    birthdays: birthdaysByDate.value.get(`${monthNumber}-${index + 1}`) ?? [],
  }))

  return {
    index: monthIndex,
    name,
    leadingBlanks,
    days,
    birthdayCount: days.reduce((total, day) => total + day.birthdays.length, 0),
  }
}))

function isCurrentMonth(monthIndex) {
  return calendarYear.value === currentYear && monthIndex === now.getMonth()
}

function isToday(monthIndex, day) {
  return isCurrentMonth(monthIndex) && day === now.getDate()
}

async function loadBirthdays() {
  loadError.value = ''
  isLoading.value = true

  try {
    birthdays.value = await fetchBirthdays()
  } catch {
    loadError.value = 'Your session is active, but the birthday list could not be loaded. Please try again.'
  } finally {
    isLoading.value = false
  }
}

async function submitLogin() {
  loginError.value = ''
  if (!username.value.trim() || !password.value) {
    loginError.value = 'Enter your username and password.'
    return
  }

  isLoggingIn.value = true
  try {
    const signedIn = await login(username.value, password.value, rememberMe.value)
    if (!signedIn) {
      loginError.value = 'That username or password is not correct.'
      return
    }

    password.value = ''
    await loadBirthdays()
  } catch {
    loginError.value = 'Sign-in is unavailable right now. Please try again.'
  } finally {
    isLoggingIn.value = false
  }
}

function signOut() {
  logout()
  birthdays.value = []
  loadError.value = ''
  password.value = ''
}

onMounted(async () => {
  try {
    if (await restoreSession()) await loadBirthdays()
  } finally {
    isRestoring.value = false
  }
})
</script>

<style scoped>
.calendar-shell {
  width: 100%;
  min-height: calc(100vh - 180px);
}

.calendar-page {
  width: min(1500px, 100%);
  min-height: calc(100vh - 180px);
  margin: 0 auto;
  padding: 54px clamp(14px, 3vw, 42px) 82px;
  box-sizing: border-box;
}

.eyebrow {
  margin: 0 0 12px;
  color: var(--matcha-leaf);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 2.6px;
  text-transform: uppercase;
}

.login-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 480px);
  align-items: center;
  gap: clamp(44px, 8vw, 120px);
  width: min(1040px, 100%);
  min-height: 610px;
  margin: 0 auto;
}

.login-intro h1,
.calendar-header h1 {
  margin: 0;
  color: var(--clay-text);
  font-family: 'Playfair Display', serif;
  font-size: clamp(3rem, 7vw, 5.9rem);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 0.94;
}

.login-intro h1 em,
.calendar-header h1 em {
  color: var(--matcha-leaf);
  font-weight: 400;
}

.login-intro > p:last-child {
  max-width: 510px;
  margin: 28px 0 0;
  font-size: 0.95rem;
  line-height: 1.85;
  opacity: 0.72;
}

.login-card,
.state-card {
  padding: clamp(28px, 4vw, 46px);
  border: 1px solid rgba(101, 119, 99, 0.12);
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: inset 0 3px 0 var(--lavender-mid), 0 24px 70px rgba(88, 75, 67, 0.12);
}

.lock-mark {
  display: grid;
  width: 45px;
  height: 45px;
  margin-bottom: 28px;
  border-radius: 50%;
  background: var(--lavender-mist);
  color: var(--matcha-leaf);
  font-size: 1.15rem;
  place-items: center;
}

.field-group { margin-bottom: 20px; }

.field-group label {
  display: block;
  margin: 0 0 8px 2px;
  color: var(--clay-text);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
}

.field-group input {
  width: 100%;
  min-height: 50px;
  padding: 12px 15px;
  box-sizing: border-box;
  border: 1px solid rgba(101, 119, 99, 0.25);
  border-radius: 13px;
  outline: none;
  background: var(--white-pure);
  color: var(--clay-text);
  font: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-group input:focus {
  border-color: var(--matcha-leaf);
  box-shadow: 0 0 0 3px rgba(101, 119, 99, 0.11);
}

.field-group input[aria-invalid='true'] { border-color: #ad5c69; }

.remember-row {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin: 2px 0 22px;
  cursor: pointer;
}

.remember-row input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.check-box {
  position: relative;
  flex: 0 0 19px;
  width: 19px;
  height: 19px;
  margin-top: 1px;
  box-sizing: border-box;
  border: 1.5px solid rgba(101, 119, 99, 0.55);
  border-radius: 6px;
  background: white;
}

.remember-row input:checked + .check-box {
  border-color: var(--matcha-leaf);
  background: var(--matcha-leaf);
}

.remember-row input:checked + .check-box::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 6px;
  width: 4px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.remember-row input:focus-visible + .check-box { box-shadow: 0 0 0 3px rgba(101, 119, 99, 0.18); }
.remember-row strong { display: block; color: var(--clay-text); font-size: 0.78rem; }
.remember-row small { display: block; margin-top: 2px; font-size: 0.68rem; opacity: 0.58; }

.primary-button,
.secondary-button,
.logout-button,
.today-button {
  min-height: 46px;
  padding: 11px 20px;
  border: 0;
  border-radius: 999px;
  background: var(--matcha-leaf);
  color: white;
  font: inherit;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
}

.primary-button { width: 100%; box-shadow: 0 10px 24px rgba(101, 119, 99, 0.2); }
.primary-button:hover:not(:disabled),
.secondary-button:hover,
.logout-button:hover,
.today-button:hover { transform: translateY(-1px); }
.primary-button:disabled { cursor: wait; opacity: 0.6; }

.form-error {
  margin: 0 0 14px;
  padding: 10px 13px;
  border-radius: 10px;
  background: rgba(173, 92, 105, 0.08);
  color: #8b4653;
  font-size: 0.72rem;
  line-height: 1.5;
}

.security-note {
  margin: 17px 8px 0;
  font-size: 0.61rem;
  line-height: 1.55;
  text-align: center;
  opacity: 0.48;
}

.calendar-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  width: 100%;
  margin: 0 0 42px;
  padding: 0;
  text-align: left;
}

.calendar-header h1 { font-size: clamp(2.8rem, 6vw, 5.6rem); }
.calendar-header h1 em { white-space: nowrap; }

.header-copy {
  max-width: 680px;
  margin: 22px 0 0;
  font-size: 0.9rem;
  line-height: 1.75;
  opacity: 0.68;
}

.logout-button {
  flex: 0 0 auto;
  border: 1px solid rgba(101, 119, 99, 0.22);
  background: rgba(255, 255, 255, 0.62);
  color: var(--matcha-leaf);
}

.calendar-toolbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
  padding: 16px 20px;
  border: 1px solid rgba(101, 119, 99, 0.11);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
}

.year-control {
  display: flex;
  align-items: center;
  gap: 7px;
}

.year-control button {
  display: grid;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--lavender-mist);
  color: var(--matcha-leaf);
  font: inherit;
  cursor: pointer;
  place-items: center;
}

.year-control strong {
  min-width: 58px;
  color: var(--clay-text);
  font-family: 'Playfair Display', serif;
  font-size: 1.15rem;
  font-weight: 400;
  text-align: center;
}

.summary-stats {
  display: flex;
  justify-content: center;
  gap: 22px;
  color: var(--clay-text);
  font-size: 0.68rem;
  letter-spacing: 0.3px;
}

.summary-stats strong { color: var(--matcha-leaf); }

.today-button {
  justify-self: end;
  min-height: 36px;
  padding: 8px 15px;
  background: var(--lavender-mist);
  color: var(--matcha-leaf);
  font-size: 0.58rem;
}

.months-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.month-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(101, 119, 99, 0.11);
  border-radius: 27px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 40px rgba(88, 75, 67, 0.07);
}

.month-card.current-month {
  border-color: rgba(101, 119, 99, 0.34);
  box-shadow: inset 0 3px 0 var(--gold-leaf), 0 15px 45px rgba(88, 75, 67, 0.09);
}

.month-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 21px 23px 14px;
  text-align: left;
}

.month-heading h2 {
  margin: 0;
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  font-style: italic;
  font-weight: 400;
}

.month-heading > span {
  display: grid;
  min-width: 28px;
  height: 28px;
  padding: 0 7px;
  box-sizing: border-box;
  border-radius: 999px;
  background: var(--lavender-mist);
  color: var(--matcha-leaf);
  font-size: 0.64rem;
  font-weight: 700;
  place-items: center;
}

.weekday-row,
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.weekday-row {
  padding: 0 15px 8px;
  color: var(--clay-text);
  font-size: 0.54rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-align: center;
  opacity: 0.5;
}

.days-grid {
  padding: 0 15px 17px;
  border-top: 1px solid rgba(101, 119, 99, 0.09);
}

.day-cell,
.blank-day {
  min-width: 0;
  min-height: 74px;
  padding: 7px 5px;
  box-sizing: border-box;
  border-right: 1px solid rgba(101, 119, 99, 0.07);
  border-bottom: 1px solid rgba(101, 119, 99, 0.07);
}

.days-grid > :nth-child(7n) { border-right: 0; }

.day-cell.has-birthday {
  background: linear-gradient(145deg, rgba(246, 236, 231, 0.78), rgba(237, 232, 245, 0.68));
}

.day-number {
  display: grid;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  color: var(--clay-text);
  font-size: 0.57rem;
  place-items: center;
}

.today .day-number {
  background: var(--matcha-leaf);
  color: white;
  font-weight: 700;
}

.birthday-list {
  display: grid;
  gap: 4px;
  margin: 5px 0 0;
  padding: 0;
  list-style: none;
}

.birthday-list li {
  min-width: 0;
  padding: 5px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.78);
}

.person-name {
  display: block;
  overflow: hidden;
  color: var(--clay-text);
  font-size: clamp(0.5rem, 0.8vw, 0.64rem);
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wish-status {
  display: block;
  margin-top: 2px;
  font-size: 0.45rem;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
}

.public-wish { color: #557657; }
.private-wish { color: #9a6670; }

.calendar-legend {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 22px;
  margin-top: 27px;
  color: var(--clay-text);
  font-size: 0.64rem;
  opacity: 0.76;
}

.calendar-legend span { display: inline-flex; align-items: center; gap: 7px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.public-dot { background: #719073; }
.private-dot { background: #b77b87; }

.state-card {
  width: min(560px, 100%);
  margin: 90px auto;
  box-sizing: border-box;
  text-align: center;
}

.state-card h2 {
  margin: 0 0 11px;
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: 1.7rem;
  font-style: italic;
  font-weight: 400;
}

.state-card p { margin: 0; font-size: 0.78rem; line-height: 1.7; opacity: 0.7; }
.state-card .secondary-button { margin-top: 20px; }
.loading-spark { display: block; margin-bottom: 13px; color: var(--gold-leaf); font-size: 1.5rem; animation: breathe 1.3s ease-in-out infinite; }

@keyframes breathe {
  50% { opacity: 0.35; transform: scale(0.82); }
}

@media (min-width: 1250px) {
  .months-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .day-cell, .blank-day { min-height: 70px; }
}

@media (max-width: 820px) {
  .calendar-page { padding-top: 36px; }
  .login-wrap { grid-template-columns: 1fr; gap: 34px; min-height: auto; padding: 24px 0; }
  .login-intro { text-align: center; }
  .login-intro > p:last-child { margin-left: auto; margin-right: auto; }
  .login-card { width: min(480px, 100%); margin: 0 auto; box-sizing: border-box; }
  .calendar-header { align-items: flex-start; }
  .calendar-toolbar { grid-template-columns: 1fr auto; }
  .summary-stats { justify-content: flex-end; }
  .today-button { grid-column: 1 / -1; justify-self: center; }
  .months-grid { grid-template-columns: 1fr; }
  .day-cell, .blank-day { min-height: 82px; }
  .person-name { font-size: 0.62rem; }
}

@media (max-width: 520px) {
  .calendar-page { padding-left: 12px; padding-right: 12px; padding-bottom: 60px; }
  .login-intro h1, .calendar-header h1 { font-size: clamp(2.65rem, 14vw, 4rem); }
  .login-card { padding: 27px 21px; border-radius: 27px; }
  .calendar-header { display: block; margin-bottom: 28px; padding: 0 6px; }
  .header-copy { margin-top: 16px; }
  .logout-button { margin-top: 21px; }
  .calendar-toolbar { display: flex; flex-direction: column; gap: 13px; padding: 14px; }
  .summary-stats { gap: 15px; }
  .month-card { border-radius: 23px; }
  .month-heading { padding: 18px 17px 12px; }
  .weekday-row { padding-left: 8px; padding-right: 8px; }
  .days-grid { padding-left: 8px; padding-right: 8px; }
  .day-cell, .blank-day { min-height: 67px; padding: 5px 3px; }
  .birthday-list li { padding: 4px 3px; }
  .person-name { font-size: 0.5rem; }
  .wish-status { font-size: 0.39rem; letter-spacing: 0.35px; }
}

@media (prefers-reduced-motion: reduce) {
  .loading-spark { animation: none; }
  .primary-button, .secondary-button, .logout-button, .today-button { transition: none; }
}
</style>
