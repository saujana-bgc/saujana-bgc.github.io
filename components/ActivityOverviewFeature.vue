<template>
  <div class="overview-feature">
    <div class="overview-copy"><slot /></div>
    <img class="overview-art" :src="src" :srcset="srcSet" :sizes="sizes" :alt="alt" width="1200" height="800" loading="lazy" decoding="async">
  </div>
</template>

<script setup lang="ts">
defineProps<{ src: string; srcSet: string; sizes: string; alt: string }>()
</script>

<style scoped>
.overview-feature {
  display: grid;
  grid-template-areas: 'art copy';
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  align-items: center;
  gap: clamp(20px, 5vw, 56px);
  max-width: 960px;
  margin-inline: auto;
}
.overview-copy { grid-area: copy; }
.overview-art {
  grid-area: art;
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-card);
}
@media (max-width: 680px) {
  .overview-feature {
    grid-template-areas: 'art' 'copy';
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
