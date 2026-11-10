export const siteUrl = 'https://saujana-bgc.github.io'
export const siteName = 'Saujana Board Game Community'

// Keep public search metadata and the static export's route list together.
export const publicPages = {
  '/': {
    title: 'Board Games & Riichi Mahjong | Saujana Board Game Community',
    description: 'Join Saujana for board games and riichi mahjong. Find a welcoming gathering, browse our board game collection, or try our riichi scoring calculator.',
  },
  '/gatherings': {
    title: 'Board Game Gatherings & Meetups | Saujana BGC',
    description: 'Find your next Saujana board game gathering. Check dates, venues and signup details for our meetups. New to board games or riichi mahjong? Start here.',
  },
  '/collection': {
    title: 'Board Game Collection | Saujana BGC',
    description: 'Explore the Saujana host’s board game collection. Search by title, designer, player count or category, and find a game to try at your next gathering.',
  },
  '/playlog': {
    title: 'Board Game Play History | Saujana BGC',
    description: 'Explore the board games played at Saujana gatherings. Look back at past sessions and discover the games our community keeps coming back to.',
  },
  '/only-blood-in-the-clocktower': {
    title: 'Only Blood in the Clocktower | Saujana BGC',
    description: 'Relive Saujana’s Blood on the Clocktower sessions, read Mika’s recaps, and find out when to join the next game night.',
  },
  '/birthday-club': {
    title: 'Birthday Club | Saujana BGC',
    description: 'Share your birthday with Saujana Board Game Community and choose whether you’d like a public greeting. Just your name, month and day.',
  },
  '/riichi-league': {
    title: 'Riichi Mahjong League & Standings | Saujana BGC',
    description: 'Follow the Saujana Riichi Mahjong League: season standings, weekly schedules and table results. New to Japanese mahjong? Ask us how to get started.',
  },
  '/riichi-calculator': {
    title: 'Riichi Mahjong Calculator – Han, Fu & Points | Saujana BGC',
    description: 'Calculate riichi mahjong scores from tiles or han and fu. Check yaku, dora, ron and tsumo payments for three-player sanma and four-player Japanese mahjong.',
  },
  '/riichi-open': {
    title: 'Riichi Open I – Mahjong Tournament, Ara Damansara | Saujana BGC',
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
