export const communityPillars = [
  {
    id: 'board-games',
    label: 'Board Games',
    image: {
      alt: 'An illustrated tabletop game with a colourful track, cards and dice.',
      width: 900,
      height: 1350,
    },
    description: 'Played party games before? Start with something quick. We’ll help you choose a game and explain the rules as you play.',
    links: [
      { label: 'Try a game at a gathering', to: '/gatherings' },
      { label: 'Collection', to: '/collection' },
      { label: 'Play History', to: '/playlog' },
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
    description: 'Riichi is Japanese mahjong played with tiles. At a Riichi gathering, watch a hand and ask someone to walk you through it.',
    links: [
      { label: 'Try Riichi at a gathering', to: '/gatherings' },
      { label: 'Riichi League', to: '/riichi-league' },
      { label: 'Riichi Calculator', to: '/riichi-calculator' },
      { label: 'Riichi Open I', to: '/riichi-open' },
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
    description: 'Everyone gets a secret role. Share clues and work out who the Demon is. You can watch a round first, and the Storyteller will explain your role if you decide to play.',
    links: [
      { label: 'What your first game is like', to: '/only-blood-in-the-clocktower#what-to-expect' },
      { label: 'Clocktower gatherings and recaps', to: '/only-blood-in-the-clocktower' },
    ],
  },
] as const
