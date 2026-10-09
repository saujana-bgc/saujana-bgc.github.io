<template>
  <div class="player-picker" @focusout="onFocusOut">
    <label class="league-field-label" :for="id">{{ label }}</label>
    <div class="picker-control">
      <input class="league-control"
        ref="entryInput" :id="id" :value="modelValue" role="combobox" aria-autocomplete="list"
        :aria-expanded="open" :aria-controls="`${id}-options`"
        :aria-activedescendant="open && active >= 0 ? `${id}-option-${active}` : undefined"
        :aria-describedby="`${id}-hint`" :disabled="disabled" required maxlength="80"
        autocomplete="off" spellcheck="false" placeholder="Find a player or enter a new name"
        @input="onInput" @focus="open = true" @keydown="onKeydown"
      >
      <ul v-if="open && options.length" :id="`${id}-options`" role="listbox" :aria-label="label">
        <li v-for="(option, index) in options" :id="`${id}-option-${index}`" :key="option.name"
          role="option" tabindex="-1" :aria-selected="active === index" :class="{ active: active === index }"
          @mousedown.prevent @click="choose(option.name)"
        >{{ option.isNew ? `Add “${option.name}”` : option.name }}</li>
      </ul>
    </div>
    <small class="league-field-hint" :id="`${id}-hint`">{{ isNew ? 'This player will be added when you save the results.' : 'Choose a familiar name or add someone new.' }}</small>
  </div>
</template>

<script setup>
const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: String, default: '' },
  names: { type: Array, default: () => [] },
  excluded: { type: Array, default: () => [] },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue'])
const entryInput = ref(null)
const open = ref(false)
const active = ref(-1)
const normalize = value => value.trim().toLocaleLowerCase()
const isNew = computed(() => Boolean(props.modelValue.trim()) && !props.names.some(name => normalize(name) === normalize(props.modelValue)))
const options = computed(() => {
  const query = normalize(props.modelValue)
  const excluded = new Set(props.excluded.map(normalize))
  const matches = props.names.filter(name => !excluded.has(normalize(name)) && normalize(name).includes(query))
    .sort((a, b) => a.localeCompare(b)).slice(0, 6).map(name => ({ name, isNew: false }))
  if (query && isNew.value && !excluded.has(query)) matches.push({ name: props.modelValue.trim(), isNew: true })
  return matches
})
watch(() => props.modelValue, () => { active.value = -1 })
watch(() => props.disabled, () => { open.value = false })
function onInput(event) {
  emit('update:modelValue', event.target.value)
  open.value = true
  active.value = -1
}
function choose(name) {
  emit('update:modelValue', name)
  entryInput.value?.focus({ preventScroll: true })
  open.value = false
  active.value = -1
}
function onFocusOut(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) open.value = false
}
async function onKeydown(event) {
  if (event.key === 'Escape') { open.value = false; return }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    open.value = true
    const count = options.value.length
    if (count) {
      active.value = active.value < 0
        ? (event.key === 'ArrowDown' ? 0 : count - 1)
        : (active.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
      await nextTick()
      document.getElementById(`${props.id}-option-${active.value}`)?.scrollIntoView({ block: 'nearest' })
    }
  }
  if (event.key === 'Enter' && open.value) {
    event.preventDefault()
    choose(options.value[active.value]?.name ?? props.modelValue.trim())
  }
}
</script>

<style scoped>
.player-picker { display: grid; gap: 6px; min-width: 0; }
.picker-control { position: relative; }
small { display: block; }
ul {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  border: 1px solid var(--league-border);
  border-radius: 10px;
  background: var(--white-pure);
  box-shadow: 0 10px 24px var(--pebble-shadow);
  max-height: 240px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
li {
  box-sizing: border-box;
  min-height: 48px;
  padding: 10px 12px;
  color: var(--clay-text);
  font: inherit;
  font-size: 16px;
  line-height: 1.5;
  border-radius: 8px;
  cursor: pointer;
  overflow-wrap: anywhere;
}
li.active, li:hover { background: var(--lavender-mist); }
</style>
