<template>
  <a class="social-link" :href="url" target="_blank" rel="noopener noreferrer">
    <svg v-if="channel === 'whatsapp'" aria-hidden="true" viewBox="0 0 32 32" focusable="false">
      <path fill="currentColor" d="M16.04 3A12.9 12.9 0 0 0 5.1 22.75L3.38 29l6.4-1.68A12.94 12.94 0 1 0 16.04 3Zm0 23.7c-2.1 0-4.15-.57-5.94-1.65l-.43-.25-3.8 1 1.02-3.7-.28-.45a10.72 10.72 0 1 1 9.43 5.05Zm5.88-8.03c-.32-.16-1.9-.94-2.2-1.05-.29-.1-.5-.16-.72.16-.21.32-.82 1.05-1 1.27-.19.21-.38.24-.7.08-.33-.16-1.37-.5-2.61-1.61a9.78 9.78 0 0 1-1.81-2.25c-.19-.32-.02-.5.14-.66.15-.14.32-.37.48-.56.16-.19.22-.32.32-.54.11-.21.06-.4-.02-.56-.08-.16-.72-1.73-.99-2.37-.26-.63-.53-.55-.72-.56h-.62c-.22 0-.57.08-.86.4-.3.32-1.13 1.1-1.13 2.69s1.16 3.12 1.32 3.34c.16.21 2.28 3.48 5.52 4.88.77.33 1.37.53 1.84.68.77.25 1.48.21 2.03.13.62-.1 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.14-.3-.22-.62-.38Z" />
    </svg>
    <svg v-else aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
      <circle cx="17.5" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
    <span>{{ label }}</span>
    <span class="social-link-external" aria-hidden="true">↗</span>
  </a>
</template>

<script setup>
const props = defineProps({
  channel: {
    type: String,
    required: true,
    validator: value => ['whatsapp', 'instagram'].includes(value),
  },
  label: { type: String, required: true },
})

const url = computed(() => props.channel === 'whatsapp'
  ? 'https://wa.me/saujanabgc'
  : 'https://www.instagram.com/saujana.bgc')
</script>

<style scoped>
.social-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 9px;
  color: var(--matcha-leaf);
  font-size: .9rem;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--line);
  text-underline-offset: .22em;
}

.social-link:hover { text-decoration-color: currentColor; }
.social-link:focus-visible { outline: 2px solid var(--matcha-leaf); outline-offset: 3px; border-radius: 3px; }
.social-link svg { width: 20px; height: 20px; flex: 0 0 auto; }
.social-link-external { font-size: .78em; }
</style>
