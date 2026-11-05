const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  const d = new Date(Number(year), Number(month) - 1, Number(day))
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'long' })} ${year}`
}

function formatDetails(record: any): string {
  const lines: string[] = []
  if (record.eta)            lines.push(`⏰ ETA: ${record.eta}`)
  if (record.amount_spent != null && record.amount_spent !== '') lines.push(`💵 Spent: RM ${parseFloat(record.amount_spent).toFixed(2)}`)
  if (record.bringing_games) lines.push(`🎲 Bringing: ${record.bringing_games}`)
  if (record.notes)          lines.push(`📝 Notes: ${record.notes}`)
  return lines.join('\n')
}

async function getEvent(eventId: number): Promise<{ name: string; date: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${eventId}&select=name,date`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
  const data = await res.json()
  return data?.[0] ?? null
}

Deno.serve(async (req) => {
  const { type, record, old_record } = await req.json()
  const name = record?.name || old_record?.name || 'Someone'
  const eventId = record?.event_id || old_record?.event_id

  const event = eventId ? await getEvent(eventId) : null
  const header = event
    ? `📅 *${event.name}* · ${formatDate(event.date)}\n`
    : ''

  let body = ''
  if (type === 'INSERT') {
    const details = formatDetails(record)
    body = `🌿 *${name}* just joined!${details ? '\n' + details : ''}`
  } else if (type === 'UPDATE') {
    const details = formatDetails(record)
    body = `✏️ *${name}* updated their details${details ? '\n' + details : ''}`
  } else if (type === 'DELETE') {
    body = `🗑️ *${name}* left the list`
  }

  if (!body) return new Response('ok')

  const text = header + body

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' }),
  })

  return new Response('ok')
})

