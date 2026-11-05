const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('ATTENDANCE_WEBHOOK_SECRET')!
const encoder = new TextEncoder()

function equalSecret(received: string, expected: string): boolean {
  const left = encoder.encode(received)
  const right = encoder.encode(expected)
  let difference = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i++) difference |= (left[i] ?? 0) ^ (right[i] ?? 0)
  return difference === 0
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  const d = new Date(Number(year), Number(month) - 1, Number(day))
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'long' })} ${year}`
}

function formatDetails(record: any): string {
  const lines: string[] = []
  if (record.eta) lines.push(`⏰ ETA: ${record.eta}`)
  if (record.amount_spent != null && record.amount_spent !== '') lines.push(`💵 Spent: RM ${parseFloat(record.amount_spent).toFixed(2)}`)
  if (record.bringing_games) lines.push(`🎲 Bringing: ${record.bringing_games}`)
  if (record.notes) lines.push(`📝 Notes: ${record.notes}`)
  return lines.join('\n')
}

async function getEvent(eventId: number): Promise<{ name: string; date: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${eventId}&select=name,date`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!res.ok) throw new Error('Could not load the gathering details')
  const data = await res.json()
  return data?.[0] ?? null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const received = req.headers.get('x-webhook-secret') ?? ''
  if (!WEBHOOK_SECRET || !equalSecret(received, WEBHOOK_SECRET)) return new Response('Unauthorized', { status: 401 })
  try {
    const { type, record, old_record } = await req.json()
    const name = record?.name || old_record?.name || 'Someone'
    const eventId = record?.event_id || old_record?.event_id
    const event = eventId ? await getEvent(eventId) : null
    const header = event ? `📅 *${event.name}* · ${formatDate(event.date)}\n` : ''
    let body = ''
    if (type === 'INSERT') {
      const details = formatDetails(record)
      body = `🌿 *${name}* just joined!${details ? '\n' + details : ''}`
    } else if (type === 'UPDATE') {
      const details = formatDetails(record)
      body = `✏️ *${name}* updated their details${details ? '\n' + details : ''}`
    } else if (type === 'DELETE') body = `🗑️ *${name}* left the list`
    if (!body) return new Response('ok')

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: header + body, parse_mode: 'Markdown' }),
    })
    if (!response.ok) return new Response('Notification delivery failed', { status: 502 })
    return new Response('ok')
  } catch (error) {
    console.error('Attendance webhook could not be processed', error)
    return new Response('Webhook could not be processed', { status: 500 })
  }
})
