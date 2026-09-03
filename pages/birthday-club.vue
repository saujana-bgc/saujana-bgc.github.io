<template>
  <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
    <header class="fade-up">
      <h1 class="hero-title">Birthday Club</h1>
      <div class="stats-container">
        Share your birthday with us so we can celebrate the people who make our game nights special.
      </div>
    </header>

    <main class="birthday-page" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
      <section class="birthday-card fade-up" aria-label="Birthday submission form">
        <div v-if="isSubmitted" class="birthday-success" role="status">
          <div class="success-mark" aria-hidden="true">&#10022;</div>
          <p class="success-kicker">You&rsquo;re in, {{ submittedName }}!</p>
          <h2>We&rsquo;ll keep your day in mind.</h2>
          <p>Thank you for being part of the Saujana board game community.</p>
          <button class="secondary-button" type="button" @click="resetForm">
            Add another birthday
          </button>
        </div>

        <form v-else novalidate @submit.prevent="submitBirthday">
               <div class="field-group">
            <label for="birthday-name">Name or nickname</label>
            <input
              id="birthday-name"
              v-model="name"
              type="text"
              name="name"
              maxlength="80"
              autocomplete="name"
              placeholder="What should we call you?"
              :aria-invalid="Boolean(errors.name)"
              :aria-describedby="errors.name ? 'birthday-name-error' : undefined"
              @input="errors.name = ''"
            >
            <p v-if="errors.name" id="birthday-name-error" class="field-error">{{ errors.name }}</p>
          </div>

          <fieldset class="birthday-fields">
            <legend>Your birthday</legend>
            <div class="date-grid">
              <div class="field-group">
                <label for="birth-month">Month</label>
                <select
                  id="birth-month"
                  v-model.number="birthMonth"
                  name="birth_month"
                  :aria-invalid="Boolean(errors.month)"
                  :aria-describedby="errors.month ? 'birth-month-error' : undefined"
                  @change="errors.month = ''"
                >
                  <option :value="null" disabled>Select month</option>
                  <option v-for="month in months" :key="month.value" :value="month.value">
                    {{ month.label }}
                  </option>
                </select>
                <p v-if="errors.month" id="birth-month-error" class="field-error">{{ errors.month }}</p>
              </div>

              <div class="field-group">
                <label for="birth-day">Day</label>
                <select
                  id="birth-day"
                  v-model.number="birthDay"
                  name="birth_day"
                  :disabled="!birthMonth"
                  :aria-invalid="Boolean(errors.day)"
                  :aria-describedby="errors.day ? 'birth-day-error' : undefined"
                  @change="errors.day = ''"
                >
                  <option :value="null" disabled>{{ birthMonth ? 'Select day' : 'Choose month first' }}</option>
                  <option v-for="day in availableDays" :key="day" :value="day">{{ day }}</option>
                </select>
                <p v-if="errors.day" id="birth-day-error" class="field-error">{{ errors.day }}</p>
              </div>
            </div>
          </fieldset>

          <label class="consent-row" for="public-greeting">
            <input id="public-greeting" v-model="allowPublicGreeting" type="checkbox" name="public_greeting">
            <span class="check-box" aria-hidden="true"></span>
            <span>
              <strong>You may greet me publicly</strong>
              <small>Saujana BGC may wish me publicly on community channels.</small>
            </span>
          </label>

          <p class="privacy-note">
            We only collect your chosen name, birth month and day. Your birth year is not needed, and your details will not be shown as a public list.
          </p>

          <p v-if="submitError" class="submit-error" role="alert">{{ submitError }}</p>

          <button class="submit-button" type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Saving your birthday…' : 'Join the Birthday Club' }}
          </button>
        </form>
      </section>
    </main>
  </div>
</template>

<script setup>
const supabase = useSupabase()

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((label, index) => ({ label, value: index + 1 }))

const name = ref('')
const birthMonth = ref(null)
const birthDay = ref(null)
const allowPublicGreeting = ref(false)
const isSubmitting = ref(false)
const isSubmitted = ref(false)
const submittedName = ref('')
const submitError = ref('')
const errors = reactive({ name: '', month: '', day: '' })

const availableDays = computed(() => {
  if (!birthMonth.value) return []
  const dayCount = new Date(2024, birthMonth.value, 0).getDate()
  return Array.from({ length: dayCount }, (_, index) => index + 1)
})

watch(birthMonth, () => {
  if (birthDay.value && !availableDays.value.includes(birthDay.value)) {
    birthDay.value = null
  }
  errors.day = ''
})

function validateForm() {
  const cleanName = name.value.trim()
  errors.name = cleanName ? '' : 'Please tell us what we should call you.'
  errors.month = birthMonth.value ? '' : 'Please choose your birth month.'
  errors.day = birthDay.value ? '' : 'Please choose your birth day.'
  return cleanName && birthMonth.value && birthDay.value
}

async function submitBirthday() {
  submitError.value = ''
  if (!validateForm()) return

  const cleanName = name.value.trim()
  isSubmitting.value = true

  const { error } = await supabase.from('birthday_greetings').insert({
    name: cleanName,
    birth_month: birthMonth.value,
    birth_day: birthDay.value,
    allow_public_greeting: allowPublicGreeting.value,
  })

  isSubmitting.value = false

  if (error) {
    submitError.value = 'We could not save your birthday just yet. Please try again.'
    return
  }

  submittedName.value = cleanName
  isSubmitted.value = true
}

function resetForm() {
  name.value = ''
  birthMonth.value = null
  birthDay.value = null
  allowPublicGreeting.value = false
  submittedName.value = ''
  submitError.value = ''
  errors.name = ''
  errors.month = ''
  errors.day = ''
  isSubmitted.value = false
}
</script>

<style scoped>
.birthday-page {
  min-height: calc(100vh - 190px);
  padding: 0 20px 76px;
  box-sizing: border-box;
}

.birthday-card {
  width: 90%;
  max-width: 900px;
  padding: var(--section-pad);
  box-sizing: border-box;
  background: var(--white-pure);
  border: 1px solid rgba(201, 190, 239, 0.12);
  border-radius: 35px;
  box-shadow: inset 0 3px 0 var(--lavender-mid), 0 20px 60px rgba(122, 92, 76, 0.1);
}

.birthday-card form,
.birthday-success {
  width: min(620px, 100%);
  margin: 0 auto;
}

.form-heading {
  margin-bottom: 28px;
  padding: 22px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(237, 213, 200, 0.42), rgba(237, 232, 245, 0.62));
  box-shadow: inset 0 3px 0 var(--gold-leaf);
  text-align: left;
}

.form-heading h2 {
  margin: 0 0 8px;
  color: var(--matcha-leaf);
  font-family: 'Playfair Display', serif;
  font-size: 1.2rem;
  font-style: italic;
  font-weight: 400;
}

.form-heading p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.75;
  opacity: 0.82;
}

.field-group { margin-bottom: 22px; }

.field-group label,
.birthday-fields legend {
  display: block;
  margin-bottom: 9px;
  color: var(--clay-text);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.field-group input,
.field-group select {
  width: 100%;
  min-height: 50px;
  padding: 12px 14px;
  box-sizing: border-box;
  border: 1px solid rgba(101, 119, 99, 0.24);
  border-radius: 12px;
  outline: none;
  background: var(--white-pure);
  color: var(--clay-text);
  font: inherit;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.field-group input::placeholder { color: rgba(74, 68, 61, 0.42); }
.field-group select:disabled { cursor: not-allowed; opacity: 0.55; }

.field-group input:focus,
.field-group select:focus {
  border-color: var(--matcha-leaf);
  box-shadow: 0 0 0 3px rgba(101, 119, 99, 0.11);
}

.field-group input[aria-invalid='true'],
.field-group select[aria-invalid='true'] {
  border-color: #ad5c69;
  background: rgba(173, 92, 105, 0.04);
}

.birthday-fields {
  margin: 0;
  padding: 0;
  border: 0;
}

.date-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 14px;
}

.field-error {
  margin: 7px 2px 0;
  color: #98505e;
  font-size: 0.75rem;
  line-height: 1.4;
}

.consent-row {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  margin: 2px 0 22px;
  padding: 17px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(246, 236, 231, 0.72), rgba(236, 233, 241, 0.72));
  cursor: pointer;
}

.consent-row input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.check-box {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border: 1.5px solid rgba(101, 119, 99, 0.55);
  border-radius: 6px;
  background: var(--white-pure);
  box-sizing: border-box;
  position: relative;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.consent-row input:checked + .check-box {
  border-color: var(--matcha-leaf);
  background: var(--matcha-leaf);
}

.consent-row input:checked + .check-box::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.consent-row input:focus-visible + .check-box {
  box-shadow: 0 0 0 3px rgba(101, 119, 99, 0.2);
}

.consent-row strong {
  display: block;
  margin-bottom: 4px;
  color: var(--matcha-leaf);
  font-size: 0.88rem;
}

.consent-row small {
  display: block;
  color: var(--clay-text);
  font-size: 0.76rem;
  line-height: 1.55;
  opacity: 0.72;
}

.privacy-note {
  margin: 0 0 24px;
  color: var(--clay-text);
  font-size: 0.72rem;
  line-height: 1.65;
  text-align: center;
  opacity: 0.58;
}

.submit-error {
  margin: 0 0 16px;
  padding: 11px 14px;
  border-radius: 10px;
  background: rgba(173, 92, 105, 0.08);
  color: #8b4653;
  font-size: 0.8rem;
  line-height: 1.5;
  text-align: center;
}

.submit-button,
.secondary-button {
  width: 100%;
  min-height: 52px;
  padding: 13px 20px;
  border: 0;
  border-radius: 999px;
  background: var(--matcha-leaf);
  color: white;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(101, 119, 99, 0.19);
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
}

.submit-button:hover:not(:disabled),
.secondary-button:hover { transform: translateY(-1px); box-shadow: 0 13px 28px rgba(101, 119, 99, 0.25); }
.submit-button:disabled { cursor: wait; opacity: 0.62; }

.birthday-success { padding: 18px 0 6px; text-align: center; }
.success-mark { color: var(--gold-leaf); font-size: 2rem; }
.success-kicker { margin: 16px 0 8px; color: var(--matcha-leaf); font-size: 0.72rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
.birthday-success h2 { margin: 0; color: var(--matcha-leaf); font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 6vw, 2.4rem); font-style: italic; font-weight: 400; }
.birthday-success > p:not(.success-kicker) { max-width: 390px; margin: 18px auto 28px; line-height: 1.7; opacity: 0.72; }
.secondary-button { width: auto; padding-left: 26px; padding-right: 26px; background: var(--lavender-mist); color: var(--matcha-leaf); box-shadow: none; }

@media (max-width: 520px) {
  .birthday-page { padding: 0 14px 58px; }
  .birthday-card { width: 100%; padding: 26px 20px 30px; border-radius: 28px; }
  .date-grid { grid-template-columns: 1fr; gap: 0; }
}

@media (min-width: 768px) {
  .birthday-card { width: 92%; border-radius: 50px; }
}

@media (prefers-reduced-motion: reduce) {
  .submit-button,
  .secondary-button { transition: none; }
}
</style>
