// https://nuxt.com/docs/api/configuration/nuxt-config
import { getPublicPage, publicRoutes } from './shared/siteSeo'

export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  ui: { colorMode: false, fonts: false },
  // Generate page content and metadata as HTML for GitHub Pages and crawlers.
  ssr: true,
  nitro: {
    // Bundle Nuxt 4.6's renderer so its generated build artifacts resolve in Nitro.
    externals: { inline: ['nuxt/internal'] },
    prerender: {
      // Nuxt also discovers file-based routes without slashes. Export each public page once.
      ignore: [path => path !== '/' && publicRoutes.includes(path)],
      routes: [
        ...publicRoutes.map(path => new URL(getPublicPage(path)!.canonical).pathname),
        '/sitemap.xml',
        '/admin',
        '/admin/birthday-club',
        '/admin/riichi-open',
        '/admin/only-blood-in-the-clocktower',
        '/admin/visitors',
        '/birthday-club-calendar',
      ],
    },
  },
  hooks: {
    // Static prerendering only needs a filesystem cache; this avoids Nuxt's Windows file-URL cache-driver warning.
    'nitro:config'(nitroConfig) {
      nitroConfig.storage ??= {}
      nitroConfig.storage['internal:nuxt:prerender'] ??= {}
      Object.assign(nitroConfig.storage['internal:nuxt:prerender'], {
        driver: 'fs',
        base: '.nuxt/cache/nitro/prerender',
      })
    },
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL ?? 'https://gjucszyfwcpsquirxooq.supabase.co',
      supabaseKey: process.env.SUPABASE_KEY ?? 'sb_publishable_xq0Pgq5GqlL_aLyObEf4kg_4xX9xSMZ',
    },
  },
  typescript: {
    appTsConfig: {
      exclude: ['../scripts/**/*', '../supabase/**/*', '../test/**/*'],
    },
  },
  css: ['~/assets/css/main.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      title: 'Saujana Board Game Community',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#354C3E' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico?v=4', sizes: '16x16 32x32 48x48 64x64' },
        { rel: 'icon', type: 'image/png', href: '/favicon.png?v=4', sizes: '64x64' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/Playfair_Display-normal-400-latin.woff2', crossorigin: 'anonymous' },
      ],
    }
  }
})
