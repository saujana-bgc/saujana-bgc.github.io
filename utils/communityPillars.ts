export const communityPillars = [
  {
    id: 'board-games',
    label: 'Board Games',
    description: 'Find something to play, from quick party games to longer strategy games.',
    links: [
      { label: 'Collection', to: '/collection' },
      { label: 'Play History', to: '/playlog' },
    ],
  },
  {
    id: 'riichi',
    label: 'Riichi Mahjong',
    description: 'Learn Japanese mahjong, follow the league, or try your hand at a tournament.',
    links: [
      { label: 'Riichi League', to: '/riichi-league' },
      { label: 'Riichi Calculator', to: '/riichi-calculator' },
      { label: 'Riichi Open I', to: '/riichi-open' },
    ],
  },
  {
    id: 'clocktower',
    label: 'Blood on the Clocktower',
    description: 'Share clues, read the room, and try to find the Demon in this social deduction game.',
    links: [
      { label: 'Clocktower Gatherings and Recaps', to: '/only-blood-in-the-clocktower' },
    ],
  },
] as const
