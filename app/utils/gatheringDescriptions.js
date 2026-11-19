const descriptionsByGathering = {
  'Sanctuary BG Saturdays': 'Every Saturday, join us for board games and riichi mahjong. Pick a table that catches your eye, or watch a hand first. Coming on your own? We’ll help you settle in.',
  'Carefree BG Gatherings': 'Come for a quick game; stay for the rematch. Our weekly gathering has board games and riichi mahjong for first-timers and regulars alike. Try something light, take on a strategy game or watch a hand before you play. We’ll help you find a table.',
  'Only Blood in the Clocktower': 'An accusation lands. A story changes. Can the town find the Demon? Join Only Blood in the Clocktower for a guided game of Blood on the Clocktower. The Storyteller will explain your role, and you can still help your team after your character dies. Board games and riichi mahjong are part of the gathering too.',
}

export function getGatheringDescription(event) {
  const name = String(event?.name ?? '').trim()
  return descriptionsByGathering[name] ?? event?.description ?? ''
}
