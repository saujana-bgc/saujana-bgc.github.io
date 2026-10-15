<template>
  <div class="riichi-tabs" role="tablist" aria-label="Riichi Open sections">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      :id="`riichi-${tab.id}-tab`"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.id"
      :tabindex="modelValue === tab.id ? 0 : -1"
      :aria-controls="`riichi-${tab.id}-panel`"
      :class="{ active: modelValue === tab.id }"
      @click="selectTab(tab.id)"
      @keydown.right.prevent="moveTab(1)"
      @keydown.left.prevent="moveTab(-1)"
      @keydown.home.prevent="focusTab(0)"
      @keydown.end.prevent="focusTab(tabs.length - 1)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({ modelValue: { type: String, default: 'registration' } })
const emit = defineEmits(['update:modelValue'])
const tabs = [
  { label: 'Registration', id: 'registration' },
  { label: 'Standings', id: 'standings' },
]

function selectTab(id) { emit('update:modelValue', id) }
function focusTab(index) {
  const tab = tabs[(index + tabs.length) % tabs.length]
  document.getElementById(`riichi-${tab.id}-tab`)?.focus()
  selectTab(tab.id)
}
function moveTab(direction) {
  const current = tabs.findIndex(tab => tab.id === document.activeElement?.id.replace('riichi-', '').replace('-tab', ''))
  focusTab((current + direction + tabs.length) % tabs.length)
}
</script>

<style scoped>
.riichi-tabs {
  display: flex;
  gap: 5px;
  width: 100%;
  margin: 0 auto 18px;
  padding: 5px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-soft);
}

.riichi-tabs button {
  position: relative;
  flex: 1;
  min-height: 46px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: .88rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: color .18s ease;
}

.riichi-tabs button::after {
  position: absolute;
  right: 14px;
  bottom: -1px;
  left: 14px;
  height: 2px;
  background: var(--gold-leaf);
  content: '';
  transform: scaleX(0);
  transition: transform .18s ease;
}

.riichi-tabs button:hover,
.riichi-tabs button.active {
  color: var(--matcha-leaf);
}

.riichi-tabs button.active { background: var(--white-pure); box-shadow: 0 2px 8px #2c372810; }

.riichi-tabs button.active::after {
  transform: scaleX(1);
}

.riichi-tabs button:focus-visible {
  outline: 2px solid var(--gold-leaf);
  outline-offset: -3px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .riichi-tabs button,
  .riichi-tabs button::after {
    transition: none;
  }
}
</style>
