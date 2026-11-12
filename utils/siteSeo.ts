export const siteUrl = 'https://saujana-bgc.github.io'
export const siteName = 'Saujana Board Game Community'

// Keep public search metadata and the static export's route list together.
export const publicPages = {
  '/': {
    title: 'Come Play with Saujana | Saujana BGC',
    description: 'Join Saujana for board games, riichi mahjong and Blood on the Clocktower. See what we play and find an upcoming gathering.',
  },
  '/gatherings': {
    title: 'Gatherings | Saujana BGC',
    description: 'Find upcoming Saujana gatherings for board games, riichi mahjong and Blood on the Clocktower. Check dates, venues and sign-up details.',
  },
  '/collection': {
    title: 'Collection | Saujana BGC',
    description: 'Explore the Saujana host’s board game collection. Search by title, designer, player count or category, and find a game to try at your next gathering.',
  },
  '/playlog': {
    title: 'Play History | Saujana BGC',
    description: 'Explore the board games played at Saujana gatherings. Look back at past gatherings and discover the games our community keeps coming back to.',
  },
  '/only-blood-in-the-clocktower': {
    title: 'Only Blood in the Clocktower | Saujana BGC',
    description: 'Read retellings and game results from Saujana’s Blood on the Clocktower gatherings, and find the next gathering.',
    image: '/images/only-blood-clocktower-social.png',
  },
  '/birthday-club': {
    title: 'Birthday Club | Saujana BGC',
    description: 'Share your birthday with Saujana Board Game Community and choose whether you’d like a public greeting. Just your name, month and day.',
  },
  '/riichi-league': {
    title: 'Riichi League | Saujana BGC',
    description: 'Follow the Saujana Riichi Mahjong League: season standings, weekly schedules and table results. New to Japanese mahjong? Ask us how to get started.',
  },
  '/riichi-calculator': {
    title: 'Riichi Calculator | Saujana BGC',
    description: 'Calculate riichi mahjong scores from tiles or han and fu. Check yaku, dora, ron and tsumo payments for three-player sanma and four-player Japanese mahjong.',
  },
  '/riichi-open': {
    title: 'Riichi Open I | Saujana BGC',
    description: 'Join Riichi Open I, a Japanese mahjong tournament on 14 November 2026 at Boardroom Bandit, Ara Damansara. Read the format, register and follow standings.',
    image: '/images/riichi-open/riichi-open-i-poster.png',
  },
} satisfies Record<string, { title: string; description: string; image?: string }>

export const publicRoutes = Object.keys(publicPages)

export function getPublicPage(path: string) {
  const canonicalPath = path.replace(/\/+$/, '') || '/'
  const page = publicPages[canonicalPath as keyof typeof publicPages]
  if (!page) return null
  // GitHub Pages redirects directory routes to a trailing slash.
  const canonical = `${siteUrl}${canonicalPath === '/' ? '/' : `${canonicalPath}/`}`
  return { ...page, canonical, image: 'image' in page ? page.image : '/images/saujana-brand.webp' }
}
