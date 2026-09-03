<template>
  <div class="guided-capture" role="dialog" aria-modal="true" aria-label="Guided tile scan">
    <div ref="container" class="camera-stage">
      <video
        ref="video"
        autoplay
        muted
        playsinline
        class="camera-feed"
        @loadedmetadata="handleVideoReady"
        @resize="computeOverlay"
      ></video>

      <div
        v-if="ready"
        class="frame-overlay"
        :style="overlayStyle"
      >
        <button
          v-for="key in SECTION_ORDER"
          :key="key"
          type="button"
          class="viewfinder"
          :class="[`viewfinder-${key}`, { disabled: !enabled[key] }]"
          :style="viewfinderStyle(key)"
          :aria-pressed="enabled[key]"
          @click="toggleSection(key)"
        >
          <i class="corner corner-tl"></i>
          <i class="corner corner-tr"></i>
          <i class="corner corner-bl"></i>
          <i class="corner corner-br"></i>
          <span class="viewfinder-label">
            {{ activeBoxes[key].label }}
            <small>{{ activeBoxes[key].hint }}</small>
          </span>
        </button>
      </div>

      <div v-if="cameraError" class="camera-error">
        <p>{{ cameraError }}</p>
        <button type="button" @click="close">Go back</button>
      </div>

      <p v-if="ready && !isLandscape" class="rotate-hint">Rotate to landscape for best results</p>
      <p v-if="!ready && !cameraError" class="loading-camera">Starting camera…</p>
    </div>

    <button type="button" class="close-camera" aria-label="Close guided scan" @click="close">×</button>

    <div v-if="!cameraError" class="camera-controls">
      <p>Tap a region to include or exclude it</p>
      <div class="section-toggles">
        <button
          v-for="key in SECTION_ORDER"
          :key="key"
          type="button"
          :class="{ active: enabled[key] }"
          :style="{ '--section-color': activeBoxes[key].color }"
          :aria-pressed="enabled[key]"
          @click="toggleSection(key)"
        >
          {{ activeBoxes[key].shortLabel }}
          <small>{{ enabled[key] ? 'On' : 'Off' }}</small>
        </button>
      </div>

      <div class="shutter-row">
        <button
          v-if="torchSupported"
          type="button"
          class="torch-btn"
          :class="{ active: torchOn }"
          :aria-pressed="torchOn"
          @click="toggleTorch"
        >
          Flash
        </button>
        <button
          type="button"
          class="shutter"
          :disabled="!ready || !anySectionEnabled"
          aria-label="Capture guided scan"
          @click="capture"
        ><span></span></button>
        <span v-if="torchSupported" class="control-spacer"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

type SectionKey = 'hand' | 'winning' | 'dora'
type SectionBox = { x: number; y: number; w: number; h: number }
type BoxDef = SectionBox & { label: string; shortLabel: string; hint: string; color: string }

interface GuidedCaptureData {
  image: string
  sections: Partial<Record<SectionKey, SectionBox>>
  imageWidth: number
  imageHeight: number
}

const emit = defineEmits<{
  capture: [data: GuidedCaptureData]
  close: []
}>()

// These are the same frame-relative regions used by RiichiCam. Keeping them
// normalized means the overlay and server-side section splitter agree even
// when the captured frame is downscaled before upload.
const LANDSCAPE: Record<SectionKey, BoxDef> = {
  dora: { x: 0.04, y: 0.22, w: 0.60, h: 0.20, label: 'Dora indicators', shortLabel: 'Dora', hint: '1–8 tiles', color: '#98e87e' },
  hand: { x: 0.02, y: 0.47, w: 0.72, h: 0.28, label: 'Hand', shortLabel: 'Hand', hint: '13 tiles', color: '#d6b868' },
  winning: { x: 0.76, y: 0.47, w: 0.19, h: 0.28, label: 'Winning tile', shortLabel: 'Win', hint: '1 tile', color: '#7ec8e3' },
}

const PORTRAIT: Record<SectionKey, BoxDef> = {
  dora: { x: 0.02, y: 0.04, w: 0.96, h: 0.14, label: 'Dora indicators', shortLabel: 'Dora', hint: '1–8 tiles', color: '#98e87e' },
  hand: { x: 0.02, y: 0.25, w: 0.96, h: 0.18, label: 'Hand', shortLabel: 'Hand', hint: '13 tiles', color: '#d6b868' },
  winning: { x: 0.02, y: 0.48, w: 0.22, h: 0.14, label: 'Winning tile', shortLabel: 'Win', hint: '1 tile', color: '#7ec8e3' },
}

const SECTION_ORDER: SectionKey[] = ['hand', 'winning', 'dora']
const video = ref<HTMLVideoElement | null>(null)
const container = ref<HTMLDivElement | null>(null)
const ready = ref(false)
const cameraError = ref<string | null>(null)
const isLandscape = ref(true)
const torchSupported = ref(false)
const torchOn = ref(false)
const overlay = reactive({ left: 0, top: 0, width: 0, height: 0 })
const enabled = reactive<Record<SectionKey, boolean>>({ hand: true, winning: true, dora: true })
let stream: MediaStream | null = null
let resizeObserver: ResizeObserver | null = null
let previousHtmlOverflow = ''
let previousBodyOverflow = ''
let previousOverscroll = ''

const activeBoxes = computed(() => isLandscape.value ? LANDSCAPE : PORTRAIT)
const anySectionEnabled = computed(() => SECTION_ORDER.some((key) => enabled[key]))
const overlayStyle = computed(() => ({
  left: `${overlay.left}px`,
  top: `${overlay.top}px`,
  width: `${overlay.width}px`,
  height: `${overlay.height}px`,
}))

function viewfinderStyle(key: SectionKey) {
  const box = activeBoxes.value[key]
  return {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
    '--section-color': box.color,
  }
}

function toggleSection(key: SectionKey) {
  enabled[key] = !enabled[key]
}

function computeOverlay() {
  const vid = video.value
  const stage = container.value
  if (!vid?.videoWidth || !stage) return
  const scale = Math.max(stage.clientWidth / vid.videoWidth, stage.clientHeight / vid.videoHeight)
  overlay.width = vid.videoWidth * scale
  overlay.height = vid.videoHeight * scale
  overlay.left = (stage.clientWidth - overlay.width) / 2
  overlay.top = (stage.clientHeight - overlay.height) / 2
  isLandscape.value = vid.videoWidth >= vid.videoHeight
}

function handleVideoReady() {
  ready.value = true
  computeOverlay()
}

async function toggleTorch() {
  const track = stream?.getVideoTracks()[0]
  if (!track) return
  const next = !torchOn.value
  try {
    await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
    torchOn.value = next
  } catch {
    torchSupported.value = false
  }
}

function capture() {
  const vid = video.value
  if (!vid?.videoWidth || !anySectionEnabled.value) return

  const maxEdge = 2048
  const scale = Math.min(1, maxEdge / Math.max(vid.videoWidth, vid.videoHeight))
  const imageWidth = Math.round(vid.videoWidth * scale)
  const imageHeight = Math.round(vid.videoHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = imageWidth
  canvas.height = imageHeight
  const context = canvas.getContext('2d')
  if (!context) return
  context.filter = 'contrast(1.15) brightness(1.05)'
  context.drawImage(vid, 0, 0, imageWidth, imageHeight)
  context.filter = 'none'

  const sections: Partial<Record<SectionKey, SectionBox>> = {}
  for (const key of SECTION_ORDER) {
    if (!enabled[key]) continue
    const { x, y, w, h } = activeBoxes.value[key]
    sections[key] = { x, y, w, h }
  }

  emit('capture', {
    image: canvas.toDataURL('image/jpeg', 0.92).split(',')[1],
    sections,
    imageWidth,
    imageHeight,
  })
}

function close() {
  emit('close')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(async () => {
  previousHtmlOverflow = document.documentElement.style.overflow
  previousBodyOverflow = document.body.style.overflow
  previousOverscroll = document.body.style.overscrollBehavior
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.style.overscrollBehavior = 'none'
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('orientationchange', computeOverlay)

  await nextTick()
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'Camera access is not supported by this browser. Choose an image instead.'
    return
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
    if (video.value) {
      video.value.srcObject = stream
      void video.value.play().catch(() => {})
    }
    const track = stream.getVideoTracks()[0]
    if (track) {
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
      torchSupported.value = !!capabilities.torch
    }
    if (container.value) {
      resizeObserver = new ResizeObserver(computeOverlay)
      resizeObserver.observe(container.value)
    }
  } catch {
    cameraError.value = 'Camera access was denied or no camera is available. Close this view and choose an image instead.'
  }
})

onBeforeUnmount(() => {
  stream?.getTracks().forEach((track) => track.stop())
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('orientationchange', computeOverlay)
  document.documentElement.style.overflow = previousHtmlOverflow
  document.body.style.overflow = previousBodyOverflow
  document.body.style.overscrollBehavior = previousOverscroll
})
</script>

<style scoped>
.guided-capture {
  position: fixed;
  inset: 0;
  z-index: 1000;
  color: #fff;
  background: #000;
  font-family: 'Quicksand', sans-serif;
}

.camera-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.frame-overlay {
  position: absolute;
  pointer-events: none;
}

.viewfinder {
  position: absolute;
  padding: 0;
  color: var(--section-color);
  border: 2px solid var(--section-color);
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.04);
  cursor: pointer;
  pointer-events: auto;
  transition: opacity 0.15s ease, border-color 0.15s ease;
}

.viewfinder.disabled {
  color: rgba(255, 255, 255, 0.34);
  border-color: rgba(255, 255, 255, 0.25);
  opacity: 0.45;
}

.corner {
  position: absolute;
  width: 15px;
  height: 15px;
  border-color: currentColor;
  border-style: solid;
}

.corner-tl { top: -3px; left: -3px; border-width: 4px 0 0 4px; }
.corner-tr { top: -3px; right: -3px; border-width: 4px 4px 0 0; }
.corner-bl { bottom: -3px; left: -3px; border-width: 0 0 4px 4px; }
.corner-br { right: -3px; bottom: -3px; border-width: 0 4px 4px 0; }

.viewfinder-label {
  position: absolute;
  top: 6px;
  left: 7px;
  color: currentColor;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-align: left;
  text-shadow: 0 1px 5px #000;
  text-transform: uppercase;
  white-space: nowrap;
}

.viewfinder-label small {
  font-size: 0.62rem;
  font-weight: 400;
  opacity: 0.72;
}

.close-camera {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  right: max(16px, env(safe-area-inset-right));
  z-index: 3;
  width: 42px;
  height: 42px;
  padding: 0;
  color: #fff;
  font: inherit;
  font-size: 1.45rem;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.62);
  cursor: pointer;
}

.camera-controls {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 34px 18px max(18px, env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 55%, transparent);
}

.camera-controls > p {
  margin: 0;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  opacity: 0.65;
  text-transform: uppercase;
}

.section-toggles {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.section-toggles button,
.torch-btn {
  min-width: 72px;
  padding: 8px 12px;
  color: rgba(255, 255, 255, 0.42);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.48);
}

.section-toggles button.active {
  color: var(--section-color);
  border-color: var(--section-color);
  background: rgba(0, 0, 0, 0.58);
}

.section-toggles small {
  display: block;
  margin-top: 3px;
  font-size: 0.54rem;
}

.shutter-row {
  display: grid;
  grid-template-columns: 80px 74px 80px;
  align-items: center;
  gap: 18px;
}

.shutter {
  display: grid;
  width: 74px;
  height: 74px;
  padding: 7px;
  border: 3px solid rgba(255, 255, 255, 0.75);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.shutter span {
  display: block;
  border-radius: 50%;
  background: #d6b868;
}

.shutter:active:not(:disabled) { transform: scale(0.95); }
.shutter:disabled { opacity: 0.4; cursor: wait; }

.torch-btn {
  min-width: 80px;
  cursor: pointer;
}

.torch-btn.active {
  color: #ffe066;
  border-color: #ffe066;
}

.control-spacer { width: 80px; }

.rotate-hint,
.loading-camera {
  position: absolute;
  top: max(64px, calc(48px + env(safe-area-inset-top)));
  left: 50%;
  z-index: 2;
  margin: 0;
  padding: 7px 12px;
  color: #f4df9a;
  font-size: 0.72rem;
  border: 1px solid rgba(214, 184, 104, 0.35);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.72);
  transform: translateX(-50%);
  white-space: nowrap;
}

.camera-error {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 18px;
  padding: 28px;
  text-align: center;
  background: #080c12;
}

.camera-error p { max-width: 360px; line-height: 1.6; }
.camera-error button {
  padding: 11px 20px;
  color: #080c12;
  font: inherit;
  font-weight: 700;
  border: 0;
  border-radius: 999px;
  background: #d6b868;
}

@media (orientation: landscape) and (max-height: 560px) {
  .camera-controls {
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 12px max(20px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom));
  }

  .camera-controls > p { display: none; }
  .section-toggles { grid-column: 3; grid-row: 1; justify-self: start; }
  .shutter-row { grid-column: 2; grid-row: 1; grid-template-columns: 74px; }
  .torch-btn { position: fixed; left: max(20px, env(safe-area-inset-left)); bottom: max(22px, env(safe-area-inset-bottom)); }
  .control-spacer { display: none; }
}

@media (max-width: 390px) {
  .section-toggles button { min-width: 64px; padding-inline: 8px; }
  .viewfinder-label small { display: none; }
}
</style>
