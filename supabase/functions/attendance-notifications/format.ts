export type AttendanceNotificationJob = {
  id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  attendee_id: number
  event_id: number
  payload: {
    name?: string
    eta?: string | null
    amount_spent?: number | string | null
    bringing_games?: string | null
    notes?: string | null
    event_name?: string | null
    event_date?: string | null
  }
  attempts: number
  lease_token: string
}

export function equalSecret(received: string, expected: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(received)
  const right = encoder.encode(expected)
  let difference = left.length ^ right.length
  for (let i = 0; i < Math.max(left.length, right.length); i++) difference |= (left[i] ?? 0) ^ (right[i] ?? 0)
  return difference === 0
}

function formatDate(iso?: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [year, month, day] = iso.split('-').map(Number)
  return `${day} ${new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)))} ${year}`
}

function formatDetails(record: AttendanceNotificationJob['payload']): string {
  const lines: string[] = []
  if (record.eta) lines.push(`⏰ ETA: ${String(record.eta).slice(0, 5)}`)
  if (record.amount_spent != null && record.amount_spent !== '') {
    const amount = Number(record.amount_spent)
    if (Number.isFinite(amount)) lines.push(`💵 Spent: RM ${amount.toFixed(2)}`)
  }
  if (record.bringing_games) lines.push(`🎲 Bringing: ${record.bringing_games}`)
  if (record.notes) lines.push(`📝 Notes: ${record.notes}`)
  return lines.join('\n')
}

export function makeMessage(job: AttendanceNotificationJob): string {
  const record = job.payload ?? {}
  const name = record.name || 'Someone'
  const date = formatDate(record.event_date)
  const header = record.event_name && date ? `📅 ${record.event_name} · ${date}\n` : ''
  const details = formatDetails(record)
  const body = job.operation === 'INSERT'
    ? `🌿 ${name} just joined!${details ? `\n${details}` : ''}`
    : job.operation === 'UPDATE'
      ? `✏️ ${name} updated their details${details ? `\n${details}` : ''}`
      : `🗑️ ${name} left the list`
  return header + body
}

export function splitMessage(text: string): string[] {
  const chunks: string[] = []
  let chunk = ''
  for (const character of text) {
    if (chunk.length + character.length > 4096) {
      chunks.push(chunk)
      chunk = ''
    }
    chunk += character
  }
  if (chunk || chunks.length === 0) chunks.push(chunk)
  return chunks
}
