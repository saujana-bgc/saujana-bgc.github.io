const UMA = [15, 5, -5, -15]

export function scoreFourPlayerTable(players, unclaimedSticks = 0) {
  if (!Array.isArray(players) || players.length !== 4) throw new Error('A table needs four players.')
  if (new Set(players.map(player => player.id)).size !== 4) throw new Error('Each player can appear once at a table.')
  if (players.reduce((sum, player) => sum + Number(player.rawPoints), 0) + Number(unclaimedSticks) * 1000 !== 120000) {
    throw new Error('Raw points and unclaimed riichi sticks must total 120,000.')
  }
  const ordered = [...players].sort((a, b) => Number(b.rawPoints) - Number(a.rawPoints))
  let first = 0
  while (first < ordered.length) {
    let after = first + 1
    while (after < ordered.length && Number(ordered[after].rawPoints) === Number(ordered[first].rawPoints)) after++
    const sharedUma = UMA.slice(first, after).reduce((sum, value) => sum + value, 0) / (after - first)
    for (let position = first; position < after; position++) {
      ordered[position] = { ...ordered[position], placement: first + 1, uma: sharedUma, score: (Number(ordered[position].rawPoints) - 30000) / 1000 + sharedUma, firstPlace: first === 0, fourthPlace: after === 4 }
    }
    first = after
  }
  return ordered
}

export function snakeTableRanks(playerCount) {
  if (playerCount < 4 || playerCount > 16 || playerCount % 4 !== 0) throw new Error('The playing roster must fill tables of four (4–16 players).')
  const tableCount = playerCount / 4
  const tables = Array.from({ length: tableCount }, () => [])
  let index = 0
  for (let pass = 0; pass < 4; pass++) {
    const direction = pass % 2 === 0 ? 1 : -1
    const order = direction === 1 ? Array.from({ length: tableCount }, (_, i) => i) : Array.from({ length: tableCount }, (_, i) => tableCount - 1 - i)
    for (const table of order) tables[table].push(++index)
  }
  return tables
}
