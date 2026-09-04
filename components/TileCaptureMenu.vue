<template>
  <div class="capture">
    <button type="button" class="capture-btn" :disabled="busy || disabled" @click="open(cameraInput)">
      <span v-if="busy" class="spinner" aria-hidden="true"></span>
      Scan with Camera
    </button>

    <button type="button" class="capture-btn gallery-btn" :disabled="busy || disabled" @click="open(libraryInput)">Choose from Gallery</button>
    <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden-input" @change="onFile" />
    <input ref="libraryInput" type="file" accept="image/*" class="hidden-input" @change="onFile" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{ busy?: boolean; disabled?: boolean }>(), {
  busy: false,
  disabled: false,
})
const emit = defineEmits<{ capture: [base64: string] }>()

const cameraInput = ref<HTMLInputElement | null>(null)
const libraryInput = ref<HTMLInputElement | null>(null)

const MAX_EDGE = 1600

function open(input: HTMLInputElement | null) {
  setTimeout(() => input?.click(), 50)
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
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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

.gallery-btn {
  color: var(--matcha-leaf);
  border: 1px solid var(--matcha-leaf);
  background: rgba(255, 253, 249, 0.85);
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

.hidden-input {
  display: none;
}
</style>
