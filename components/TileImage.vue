<template>
  <span class="tile-image" :class="{ small: size === 'small' }" :title="name">
    <img :src="src" :alt="name" draggable="false" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Tile } from '~/utils/scoring/types'
import { tileFile } from '~/utils/tile-image'

const props = withDefaults(defineProps<{ tile: Tile; size?: 'normal' | 'small' }>(), { size: 'normal' })

const file = computed(() => tileFile(props.tile))
const src = computed(() => `/tiles/${file.value}.svg`)
const name = computed(() => file.value.replace('-Dora', ' (aka)'))
</script>

<style scoped>
.tile-image {
  display: inline-flex;
  padding: 2px;
  border-radius: 5px;
  background: #f7f2e2;
  box-shadow: 0 1px 3px rgba(74, 68, 61, 0.25);
  line-height: 0;
}

.tile-image img {
  width: 34px;
  height: 48px;
  display: block;
}

.tile-image.small img {
  width: 26px;
  height: 37px;
}
</style>
