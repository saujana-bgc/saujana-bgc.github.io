export function formatGatheringTime(value) {
  if (typeof value !== 'string') return ''

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/)
  if (!match) return value

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return value

  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'am' : 'pm'}`
}
