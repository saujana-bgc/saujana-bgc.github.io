import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

export const bucket = 'riichi-open-receipts'
export const eventSlug = 'riichi-open-i'
const allowedOrigins = new Set(['https://saujana-bgc.github.io', 'http://localhost:3000', 'http://127.0.0.1:3000'])

export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://saujana-bgc.github.io',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function reply(request: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' } })
}

export function options(request: Request) {
  return new Response('ok', { headers: corsHeaders(request) })
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Riichi Open server configuration is missing.')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function adminUser(request: Request, client: SupabaseClient): Promise<User> {
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Sign in to continue.')
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user || data.user.app_metadata?.role !== 'birthday_admin') throw new Error('You do not have organiser access.')
  return data.user
}

export function hashText(value: string) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then(bytes =>
    [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join(''))
}

export function safeMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.'
}
