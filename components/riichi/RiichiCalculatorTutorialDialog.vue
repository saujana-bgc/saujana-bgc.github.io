<template>
  <dialog
    ref="dialog"
    class="tutorial-dialog"
    aria-labelledby="tutorial-title"
    @click="closeFromBackdrop"
    @close="handleClose"
  >
    <div class="tutorial-shell">
      <header class="tutorial-header">
        <h2 id="tutorial-title">Riichi calculator guide</h2>
        <button
          type="button"
          class="tutorial-close"
          aria-label="Close guide"
          autofocus
          @click="dialog?.close()"
        >
          ×
        </button>
      </header>

      <div class="tutorial-content">
        <div class="tutorial-player-wrap">
          <video
            v-if="videoRequested"
            ref="video"
            class="tutorial-video"
            :poster="posterUrl"
            :src="videoUrl"
            controls
            playsinline
            preload="none"
            aria-label="Riichi calculator tutorial"
            @error="handleVideoError"
            @loadeddata="handleVideoReady"
            @playing="handleVideoReady"
            @waiting="handleVideoWaiting"
          />
          <p v-if="videoLoading" class="video-status" role="status">Loading video…</p>
          <div v-if="videoUnavailable" class="video-error" role="status">
            <span>Video unavailable.</span>
            <button type="button" class="text-action" :disabled="videoLoading" @click="retryVideo">
              {{ videoLoading ? 'Retrying…' : 'Try again' }}
            </button>
            <a class="text-action" :href="videoUrl" target="_blank" rel="noreferrer">Open video</a>
          </div>
          <button
            v-if="canFullscreen"
            type="button"
            class="fullscreen-button"
            aria-label="Watch video full screen"
            @click="enterFullscreen"
          >
            <span aria-hidden="true">⛶</span> Full screen
          </button>
        </div>

        <details class="tutorial-transcript">
          <summary>Scoring steps</summary>
          <ol>
            <li>Enter han and fu, or build the hand with tiles. Fu is ignored at 5 han or more.</li>
            <li>Select the winning tile, then choose Ron or Tsumo.</li>
            <li>Set the dealer, riichi, and any bonuses or special circumstances.</li>
            <li>Check the payment, including honba.</li>
          </ol>
        </details>
      </div>
    </div>
  </dialog>
</template>

<script setup>
const dialog = ref(null)
const video = ref(null)
const videoRequested = ref(false)
const videoLoading = ref(false)
const videoUnavailable = ref(false)
const canFullscreen = computed(() => {
  const player = video.value
  return Boolean(player && (player.requestFullscreen || player.webkitEnterFullscreen))
})
const videoUrl = '/videos/riichi-calculator-tutorial.mp4?v=20261022-mixkit-audio-v6'
const posterUrl = '/images/riichi-calculator-tutorial-poster.webp'
let returnFocusTo = null
let scrollLock = null

async function open(trigger) {
  returnFocusTo = trigger ?? document.activeElement
  videoRequested.value = true
  await nextTick()

  if (!dialog.value?.open) {
    lockBackgroundScroll()
    dialog.value?.showModal()
  }

  const player = video.value
  if (!player || videoUnavailable.value) return
  if (player.ended) player.currentTime = 0
  videoLoading.value = player.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
  player.play().catch(() => {
    videoLoading.value = false
    // Autoplay can be blocked; the native play control remains available.
  })
}

function lockBackgroundScroll() {
  if (scrollLock || typeof document === 'undefined') return

  scrollLock = {
    scrollY: window.scrollY,
    bodyStyle: document.body.getAttribute('style'),
    htmlOverflow: document.documentElement.style.overflow,
  }
  document.body.style.position = 'fixed'
  document.body.style.top = `-${scrollLock.scrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
}

function restoreBackgroundScroll() {
  if (!scrollLock) return

  const { scrollY, bodyStyle, htmlOverflow } = scrollLock
  scrollLock = null
  if (bodyStyle === null) document.body.removeAttribute('style')
  else document.body.setAttribute('style', bodyStyle)
  document.documentElement.style.overflow = htmlOverflow
  window.scrollTo(0, scrollY)
}

function handleVideoReady() {
  videoLoading.value = false
  videoUnavailable.value = false
}

function handleVideoError() {
  videoLoading.value = false
  videoUnavailable.value = true
}

function handleVideoWaiting() {
  if (!videoUnavailable.value) videoLoading.value = true
}

async function retryVideo() {
  const player = video.value
  if (!player || videoLoading.value) return

  videoLoading.value = true
  player.load()
  try {
    await player.play()
  } catch {
    videoLoading.value = false
    if (player.error) videoUnavailable.value = true
  }
}

async function enterFullscreen() {
  const player = video.value
  if (!player) return

  try {
    if (player.requestFullscreen) await player.requestFullscreen()
    else player.webkitEnterFullscreen?.()
  } catch {
    // Native video controls still provide fullscreen where the browser allows it.
  }
}

function closeFromBackdrop(event) {
  if (event.target === dialog.value) dialog.value.close()
}

function handleClose() {
  video.value?.pause()
  restoreBackgroundScroll()
  returnFocusTo?.focus?.({ preventScroll: true })
}

onBeforeUnmount(() => {
  video.value?.pause()
  if (dialog.value?.open) dialog.value.close()
  restoreBackgroundScroll()
  returnFocusTo = null
})

defineExpose({ open })
</script>

<style scoped>
.tutorial-dialog { width: min(680px, calc(100% - 24px)); height: min(94dvh, 1000px); max-height: calc(100dvh - 24px); padding: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 16px; background: var(--bg-silk); color: var(--clay-text); box-shadow: 0 28px 100px #111a1280; }
.tutorial-dialog::backdrop { background: #18241bcc; backdrop-filter: blur(5px); }
.tutorial-shell { display: flex; flex-direction: column; width: 100%; height: 100%; background: var(--bg-silk); }
.tutorial-header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 18px; padding: 12px 20px; border-bottom: 1px solid var(--line); background: var(--white-pure); }
.tutorial-header h2 { margin: 0; color: var(--matcha-leaf); font: 400 clamp(1.2rem, 3vw, 1.55rem)/1.2 var(--font-display); }
.tutorial-close { flex: 0 0 44px; width: 44px; height: 44px; border: 1px solid var(--line); border-radius: 50%; background: transparent; color: var(--matcha-leaf); font: 1.7rem/1 var(--font-body); cursor: pointer; }
.tutorial-content { flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 14px; }
.tutorial-player-wrap { display: grid; justify-items: center; gap: 8px; width: min(100%, 540px); margin: 0 auto; }
.tutorial-video { display: block; width: auto; height: auto; max-width: 100%; max-height: min(calc(94dvh - 150px), 760px); aspect-ratio: 9 / 16; border-radius: 8px; background: #17211a; object-fit: contain; }
.video-status, .video-error { margin: 0; font-size: .8rem; line-height: 1.5; text-align: center; }
.video-status { color: var(--muted); }
.video-error { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 5px 14px; color: #824249; }
.text-action { min-height: 36px; padding: 4px 2px; border: 0; background: transparent; color: var(--matcha-leaf); font: 700 .76rem var(--font-body); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.text-action:disabled { color: var(--muted); cursor: wait; }
.fullscreen-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 5px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--white-pure); color: var(--matcha-leaf); font: 650 .76rem var(--font-body); cursor: pointer; }
.tutorial-close:focus-visible, .tutorial-transcript summary:focus-visible, .text-action:focus-visible, .fullscreen-button:focus-visible { outline: 3px solid var(--gold-leaf); outline-offset: 3px; }
.tutorial-transcript { width: min(100%, 540px); margin: 8px auto 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 7px; background: var(--white-pure); color: var(--clay-text); font-size: .78rem; line-height: 1.55; }
.tutorial-transcript summary { min-height: 30px; color: var(--matcha-leaf); font-weight: 700; cursor: pointer; }
.tutorial-transcript ol { display: grid; gap: 7px; padding-left: 22px; margin: 8px 0 2px; }
@media (max-width: 760px) {
  .tutorial-dialog { width: calc(100vw - 16px); height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px); max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px); border-radius: 12px; }
  .tutorial-header { gap: 10px; padding: 8px 12px; }
  .tutorial-close { flex-basis: 42px; width: 42px; height: 42px; }
  .tutorial-content { padding: 10px; }
  .tutorial-video { max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 170px); }
}
@media (orientation: landscape) and (min-width: 600px) {
  .tutorial-dialog { width: min(900px, calc(100% - 32px)); height: min(94dvh, 760px); }
  .tutorial-header { padding: 6px 16px; }
  .tutorial-content { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, .75fr); align-items: start; gap: 18px; padding: 12px 18px; }
  .tutorial-player-wrap, .tutorial-transcript { width: 100%; max-width: 100%; margin: 0; }
  .tutorial-video { max-height: calc(94dvh - 92px); }
}
@media (prefers-reduced-motion: reduce) {
  .tutorial-dialog::backdrop { backdrop-filter: none; }
}
</style>
