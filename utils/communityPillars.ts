export const communityPillars = [
  {
    id: 'board-games',
    label: 'Board Games',
    image: {
      alt: 'An illustrated tabletop game with a colourful track, cards and dice.',
      width: 900,
      height: 1350,
    },
    description: 'From quick party games to thoughtful strategy, we’ll help you find a table that suits you.',
    links: [
      { label: 'Explore board games', to: '/board-games/' },
    ],
  },
  {
    id: 'riichi',
    label: 'Riichi Mahjong',
    image: {
      alt: 'An illustration of players moving yellow-backed mahjong tiles around a green table.',
      width: 900,
      height: 600,
    },
    description: 'Watch a hand take shape, or try a turn with someone beside you to help.',
    links: [
      { label: 'Explore Riichi Mahjong', to: '/riichi-mahjong/' },
    ],
  },
  {
    id: 'clocktower',
    label: 'Blood on the Clocktower',
    image: {
      alt: 'An illustrated ring of tokens on an ornate purple mat beside a lantern.',
      width: 900,
      height: 600,
    },
    description: 'Take a secret role, share clues and help the village find the Demon. You’re welcome to watch first.',
    links: [
      { label: 'Explore Blood on the Clocktower', to: '/only-blood-in-the-clocktower/' },
    ],
  },
] as const
