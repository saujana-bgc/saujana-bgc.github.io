<template>
  <div class="visitor-counter" aria-label="Visit counts for today and all time">
    <span class="visitor-label">Visits</span>
    <span class="visitor-num">{{ dailyVisitors }}</span>
    <span class="visitor-label">today</span>
    <span class="visitor-divider" aria-hidden="true"></span>
    <span class="visitor-num">{{ totalVisitors }}</span>
    <span class="visitor-label">all time</span>
  </div>
</template>

<script setup>
const { data: visitorStats } = useVisitorStats()

const dailyVisitors = computed(() => visitorStats.value?.daily ?? '-')
const totalVisitors = computed(() => visitorStats.value?.total ?? '-')
</script>

<style scoped>
.visitor-counter {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 10px;
}

.visitor-num {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--matcha-leaf);
}

.visitor-label {
    color: var(--clay-text);
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    opacity: 0.72;
}

.visitor-divider {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(74, 68, 63, 0.32);
    margin: 0 3px;
}
</style>
