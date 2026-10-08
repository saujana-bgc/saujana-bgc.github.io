// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL ?? 'https://gjucszyfwcpsquirxooq.supabase.co',
      supabaseKey: process.env.SUPABASE_KEY ?? 'sb_publishable_xq0Pgq5GqlL_aLyObEf4kg_4xX9xSMZ',
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
        { name: 'description', content: 'Saujana Board Game Community welcomes newcomers and experienced players to connect, learn, and discover tabletop games together. Find a gathering and join us.' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/Playfair_Display-normal-400-latin.woff2', crossorigin: 'anonymous' },
      ],
    }
  }
})
