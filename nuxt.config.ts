// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL ?? 'https://gjucszyfwcpsquirxooq.supabase.co',
      supabaseKey: process.env.SUPABASE_KEY ?? 'sb_publishable_xq0Pgq5GqlL_aLyObEf4kg_4xX9xSMZ',
      // Tile-detection endpoint (tile-detect-api/ deployed on Vercel).
      tileDetectUrl: process.env.TILE_DETECT_URL ?? 'https://tile-detect-api.vercel.app/api/detect',
    },
  },
  css: ['~/assets/css/main.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      title: 'SAUJANA BG COMMUNITY',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#6B7A68' },
        { name: 'description', content: 'Saujana Board Game Community — a quiet analog sanctuary in Saujana where people gather to slow down, play, and connect over tabletop games.' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/Quicksand-normal-400-latin.woff2', crossorigin: 'anonymous' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/Quicksand-normal-700-latin.woff2', crossorigin: 'anonymous' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/Playfair_Display-italic-400-latin.woff2', crossorigin: 'anonymous' },
      ],
    }
  }
})
