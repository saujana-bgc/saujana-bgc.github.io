<template>
  <div class="capture">
    <button type="button" class="capture-btn" :disabled="busy || disabled" @click="menuOpen = !menuOpen">
      <span v-if="busy" class="spinner" aria-hidden="true"></span>
      {{ label }}
    </button>

    <template v-if="menuOpen">
      <div class="menu-backdrop" @click="menuOpen = false"></div>
      <div class="menu" role="menu">
        <button v-if="guided" type="button" role="menuitem" @click="startGuided">
          <strong>Guided scan</strong>
          <small>Hand · winning tile · dora in one shot</small>
        </button>
        <button type="button" role="menuitem" @click="open(libraryInput)">
          <strong>Choose from gallery</strong>
          <small>Upload a photo of your hand</small>
        </button>
      </div>
    </template>

    <input ref="libraryInput" type="file" accept="image/*" class="hidden-input" @change="onFile" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{ label: string; busy?: boolean; disabled?: boolean; guided?: boolean }>(), {
  busy: false,
  disabled: false,
  guided: false,
})
const emit = defineEmits<{
  capture: [base64: string]
  guided: []
}>()

const menuOpen = ref(false)
const libraryInput = ref<HTMLInputElement | null>(null)

const MAX_EDGE = 1600

function open(input: HTMLInputElement | null) {
  menuOpen.value = false
  setTimeout(() => input?.click(), 50)
}

function startGuided() {
  menuOpen.value = false
  emit('guided')
}

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (file) processFile(file)
}

function processFile(file: File) {
  const reader = new FileReader()
  reader.onload = (ev) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      emit('capture', canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
    }
    img.src = ev.target?.result as string
  }
  reader.readAsDataURL(file)
}

</script>

<style scoped>
.capture {
  position: relative;
}

.capture-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  color: #fff;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 0;
  border-radius: 999px;
  background: var(--matcha-leaf);
  cursor: pointer;
}

.capture-btn:hover:not(:disabled) {
  filter: brightness(1.08);
}

.capture-btn:disabled {
  opacity: 0.55;
  cursor: wait;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  min-width: 230px;
  border: 1px solid rgba(185, 139, 104, 0.25);
  border-radius: 14px;
  background: rgba(255, 253, 249, 0.98);
  box-shadow: 0 12px 40px rgba(74, 68, 61, 0.25);
  overflow: hidden;
}

.menu button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.menu button + button {
  border-top: 1px solid rgba(101, 119, 99, 0.12);
}

.menu button:hover {
  background: rgba(101, 119, 99, 0.08);
}

.menu strong {
  display: block;
  color: var(--clay-text);
  font-size: 0.82rem;
  font-weight: 700;
}

.menu small {
  color: var(--clay-text);
  font-size: 0.7rem;
  opacity: 0.6;
}

.hidden-input {
  display: none;
}
</style>
