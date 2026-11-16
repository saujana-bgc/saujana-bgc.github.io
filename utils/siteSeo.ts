export const siteUrl = 'https://saujana-bgc.org'
export const siteName = 'Saujana Board Game Community'

// Keep public search metadata and the static export's route list together.
export const publicPages = {
  '/': {
    title: 'Saujana Board Game Community',
    description: 'Join Saujana for board games, riichi mahjong and Blood on the Clocktower. See what we play and find an upcoming gathering.',
  },
  '/gatherings': {
    title: 'Gatherings | Saujana BGC',
    description: 'Find upcoming Saujana gatherings for board games, riichi mahjong and Blood on the Clocktower. Check dates, venues and sign-up details.',
  },
  '/collection': {
    title: 'Board Game Collection | Saujana BGC',
    description: 'Explore the Saujana host’s board game collection. Search by title, designer, player count or category, and find a game to try at your next gathering.',
  },
  '/board-games': {
    title: 'Board Games | Saujana BGC',
    description: 'Join Saujana for board games in Kuala Lumpur. New to the table? We’ll help you find a game, learn the rules and join a gathering.',
  },
  '/riichi-mahjong': {
    title: 'Riichi Mahjong | Saujana BGC',
    description: 'Discover riichi mahjong with Saujana. Watch a hand, learn as you play, and find a casual gathering, league results, scoring tools or tournament details.',
  },
  '/playlog': {
    title: 'Play History | Saujana BGC',
    description: 'Explore the board games played at Saujana gatherings. Look back at past gatherings and discover the games our community keeps coming back to.',
  },
  '/only-blood-in-the-clocktower': {
    title: 'Only Blood in the Clocktower | Saujana BGC',
    description: 'Join Saujana’s Only Blood in the Clocktower event series to play Blood on the Clocktower. See the next gathering and learn what to expect.',
    image: '/images/only-blood-clocktower-social.png',
  },
  '/only-blood-in-the-clocktower/recaps': {
    title: 'Clocktower Recaps | Only Blood in the Clocktower',
    description: 'Read stories, Blood on the Clocktower results, character lists and approved photos from Saujana’s Only Blood in the Clocktower gatherings.',
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
    title: 'Riichi Mahjong Score Calculator | Saujana BGC',
    description: 'Calculate riichi mahjong scores from tiles or han and fu. Check yaku, dora, ron and tsumo payments for three-player sanma and four-player Japanese mahjong.',
  },
  '/riichi-open': {
    title: 'Riichi Open | Saujana BGC',
    description: 'See the format, schedule and standings for Riichi Open, Saujana’s Japanese mahjong tournament on 14 November 2026 at Boardroom Bandit, Ara Damansara.',
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
