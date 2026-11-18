<script setup>
const route = useRoute()
await navigateTo({ path: '/riichi-rules/', hash: route.hash }, { redirectCode: 301, replace: true })
</script>
