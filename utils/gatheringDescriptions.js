const descriptionsByGathering = {
  'Sanctuary BG Saturdays': 'Every Saturday, the tables fill with bold bluffs, clever plans, unexpected comebacks—and riichi mahjong hands worth watching. Join our weekly board games and riichi meetup, pick a table that fits your mood, and settle in for one more round. New to it all? Come solo or bring a friend; we’ll help you find a seat and get playing.',
  'Carefree BG Gatherings': 'Come for a quick game; stay because the rematch is too close to call. Our weekly gathering always has board games and riichi mahjong, with friendly tables for first-timers and regulars alike. Try something light, take on a strategy game, or watch a riichi hand before learning. Turn up solo or with a friend—we’ll help you find your first table.',
  'Only Blood in the Clocktower': 'An accusation lands. Three stories collide. Can you find the Demon before the town votes? Join Only Blood in the Clocktower for a guided game of Blood on the Clocktower, where hidden roles, whispered clues and bold bluffs keep everyone in the story—even after elimination. First time? Our Storyteller will walk you through it. Board games and riichi mahjong are also part of every gathering, so there’s always another table to join.',
}

export function getGatheringDescription(event) {
  const name = String(event?.name ?? '').trim()
  return descriptionsByGathering[name] ?? event?.description ?? ''
}
