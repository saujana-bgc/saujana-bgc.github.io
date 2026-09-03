<template>
  <a
    class="whatsapp-button"
    href="https://wa.me/saujanabgc"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with @saujanabgc on WhatsApp"
  >
    <svg aria-hidden="true" viewBox="0 0 32 32" focusable="false">
      <path
        fill="currentColor"
        d="M16.04 3A12.9 12.9 0 0 0 5.1 22.75L3.38 29l6.4-1.68A12.94 12.94 0 1 0 16.04 3Zm0 23.7c-2.1 0-4.15-.57-5.94-1.65l-.43-.25-3.8 1 1.02-3.7-.28-.45a10.72 10.72 0 1 1 9.43 5.05Zm5.88-8.03c-.32-.16-1.9-.94-2.2-1.05-.29-.1-.5-.16-.72.16-.21.32-.82 1.05-1 1.27-.19.21-.38.24-.7.08-.33-.16-1.37-.5-2.61-1.61a9.78 9.78 0 0 1-1.81-2.25c-.19-.32-.02-.5.14-.66.15-.14.32-.37.48-.56.16-.19.22-.32.32-.54.11-.21.06-.4-.02-.56-.08-.16-.72-1.73-.99-2.37-.26-.63-.53-.55-.72-.56h-.62c-.22 0-.57.08-.86.4-.3.32-1.13 1.1-1.13 2.69s1.16 3.12 1.32 3.34c.16.21 2.28 3.48 5.52 4.88.77.33 1.37.53 1.84.68.77.25 1.48.21 2.03.13.62-.1 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.14-.3-.22-.62-.38Z"
      />
    </svg>
    <span class="whatsapp-label">WhatsApp</span>
    <span class="sr-only">@saujanabgc</span>
  </a>
</template>

<style scoped>
.whatsapp-button {
  position: fixed;
  right: max(22px, env(safe-area-inset-right));
  bottom: max(22px, env(safe-area-inset-bottom));
  z-index: 1200;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-width: 58px;
  height: 58px;
  padding: 0 18px;
  box-sizing: border-box;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 999px;
  background: #25d366;
  color: #fff;
  box-shadow: 0 8px 24px rgba(22, 101, 52, 0.28);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-decoration: none;
  transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.whatsapp-button:hover {
  background: #1fbd59;
  box-shadow: 0 10px 28px rgba(22, 101, 52, 0.36);
  transform: translateY(-2px);
}

.whatsapp-button:focus-visible {
  outline: 3px solid var(--gold-leaf);
  outline-offset: 3px;
}

.whatsapp-button svg {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 540px) {
  .whatsapp-button {
    right: max(16px, env(safe-area-inset-right));
    bottom: max(16px, env(safe-area-inset-bottom));
    width: 58px;
    padding: 0;
  }

  .whatsapp-label {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .whatsapp-button {
    transition: none;
  }
}
</style>
