export function getKualaLumpurDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

export function formatGatheringDate(value, { weekday = false, year = true, month = 'long' } = {}) {
  if (!value) return 'Date to be announced'

  const date = new Date(`${value}T12:00:00Z`)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    ...(weekday ? { weekday: 'long' } : {}),
    day: 'numeric',
    month,
    ...(year ? { year: 'numeric' } : {}),
  }).format(date)
}

export function getGatheringDateStamp(value) {
  const date = new Date(`${value}T12:00:00Z`)
  return {
    day: new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'UTC' }).format(date),
    month: new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(date).toUpperCase(),
    weekday: new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(date),
  }
}
