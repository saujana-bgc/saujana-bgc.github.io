<template>
  <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { getPublicPage, siteName, siteUrl } from '~/utils/siteSeo'

const route = useRoute()
useHead(() => {
  const page = getPublicPage(route.path)
  if (!page) return {}
  const image = `${siteUrl}${page.image}`
  return {
    title: page.title,
    meta: [
      { name: 'description', content: page.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: siteName },
      { property: 'og:title', content: page.title },
      { property: 'og:description', content: page.description },
      { property: 'og:url', content: page.canonical },
      { property: 'og:image', content: image },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: page.title },
      { name: 'twitter:description', content: page.description },
      { name: 'twitter:image', content: image },
    ],
    link: [{ rel: 'canonical', href: page.canonical }],
    script: [{
      key: 'site-structured-data',
      type: 'application/ld+json',
      textContent: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: siteName, url: `${siteUrl}/`, logo: `${siteUrl}/images/saujana-brand.webp`, sameAs: ['https://www.instagram.com/saujana.bgc/'] },
          { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: siteName, url: `${siteUrl}/`, publisher: { '@id': `${siteUrl}/#organization` } },
          { '@type': 'WebPage', '@id': page.canonical, url: page.canonical, name: page.title, description: page.description, isPartOf: { '@id': `${siteUrl}/#website` } },
        ],
      }),
    }],
  }
})

const { fetchVersion } = useVersion()
onMounted(fetchVersion)
</script>
