<template>
  <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
const { fetchVersion } = useVersion()
onMounted(fetchVersion)
</script>
