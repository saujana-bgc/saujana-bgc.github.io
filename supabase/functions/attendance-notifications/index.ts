import { equalSecret, makeMessage, splitMessage, type AttendanceNotificationJob } from './format.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
let secretKey: string | undefined
if (secretKeys) {
  try {
    secretKey = JSON.parse(secretKeys).default
  } catch {
    console.error('Attendance worker Supabase key configuration is invalid')
  }
}
const SUPABASE_KEY = secretKey ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const usesSecretKey = SUPABASE_KEY.startsWith('sb_secret_')
const WORKER_SECRET = Deno.env.get('ATTENDANCE_WORKER_SECRET') ?? ''
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') ?? ''
const BATCH_SIZE = 5
const LEASE_SECONDS = 300

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      ...(!usesSecretKey ? { Authorization: `Bearer ${SUPABASE_KEY}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error('database')
  return await response.json() as T
}

async function sendTelegram(text: string): Promise<number[]> {
  const messageIds: number[] = []
  for (const part of splitMessage(text)) {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: part }),
      signal: AbortSignal.timeout(15_000),
    })
    let result: { ok?: boolean; result?: { message_id?: number }; error_code?: number; parameters?: { retry_after?: number } }
    try { result = await response.json() } catch { throw new Error('telegram_malformed') }
    if (response.status === 429 || result.error_code === 429) {
      const retryAfter = Number(result.parameters?.retry_after)
      const error = new Error('telegram_rate_limit') as Error & { retryAfter?: number }
      error.retryAfter = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(86400, retryAfter) : 60
      throw error
    }
    if (!response.ok || result.ok !== true || !Number.isInteger(result.result?.message_id)) {
      if (response.status >= 500) throw new Error('telegram_temporary')
      throw new Error('telegram_permanent')
    }
    messageIds.push(result.result!.message_id!)
  }
  return messageIds
}

function category(error: unknown): string {
  if (error instanceof Error && ['telegram_malformed', 'telegram_rate_limit', 'telegram_temporary', 'telegram_permanent', 'database'].includes(error.message)) return error.message
  return 'network'
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!WORKER_SECRET || !equalSecret(request.headers.get('x-webhook-secret') ?? '', WORKER_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!SUPABASE_URL || !SUPABASE_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return Response.json({ ok: false, error: 'configuration_unavailable' }, { status: 503 })
  }

  try {
    const jobs = await rpc<AttendanceNotificationJob[]>('attendance_notifications_claim', { p_batch_size: BATCH_SIZE, p_lease_seconds: LEASE_SECONDS })
    let delivered = 0
    let failed = 0
    for (const job of jobs) {
      try {
        const messageIds = await sendTelegram(makeMessage(job))
        const acknowledged = await rpc<boolean>('attendance_notifications_complete', {
          p_id: job.id, p_lease_token: job.lease_token, p_message_ids: messageIds,
        })
        if (!acknowledged) console.warn('Attendance notification acknowledgement was not accepted', { job_id: job.id })
        else delivered++
      } catch (error) {
        const errorCategory = category(error)
        const retryAfter = error instanceof Error && 'retryAfter' in error ? Number((error as Error & { retryAfter?: number }).retryAfter) : 0
        if (errorCategory === 'telegram_permanent') {
          await rpc<boolean>('attendance_notifications_fail', { p_id: job.id, p_lease_token: job.lease_token, p_category: errorCategory })
        } else {
          const backoff = retryAfter || Math.min(3600, 15 * (2 ** Math.min(job.attempts - 1, 8)))
          await rpc<boolean>('attendance_notifications_retry', {
            p_id: job.id, p_lease_token: job.lease_token, p_delay_seconds: backoff, p_category: errorCategory,
          })
        }
        failed++
        console.error('Attendance notification delivery failed', { job_id: job.id, category: errorCategory })
      }
    }
    return Response.json({ ok: true, claimed: jobs.length, delivered, failed })
  } catch (error) {
    console.error('Attendance notification worker failed', { category: category(error) })
    return Response.json({ ok: false, error: 'worker_failed' }, { status: 503 })
  }
})

