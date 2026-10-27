import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { transformSync } from 'esbuild'

const source = readFileSync(new URL('../supabase/functions/riichi-open-public/index.ts', import.meta.url), 'utf8')
const compiled = transformSync(source.replace(/^import .*\r?\n/, ''), { loader: 'ts', format: 'esm' }).code

function publicHandler(holdResult: object) {
  let handler!: (request: Request) => Promise<Response>
  const event = { id: 'event-1', capacity: 16, current_publication_id: null }
  const results: Record<string, object> = {
    riichi_open_events: { data: event, error: null },
    riichi_open_registrations: { data: [{ id: 'registration-1', display_name: 'Player', status: 'pending' }], error: null },
    riichi_open_registration_holds: holdResult,
  }
  const client = { from(table: string) {
    const query: any = { then(resolve: (value: object) => unknown) { return Promise.resolve(results[table]).then(resolve) } }
    for (const method of ['select', 'eq', 'in', 'order', 'gt', 'single']) query[method] = () => query
    return query
  } }
  new Function('Deno', 'serviceClient', 'eventSlug', 'reply', 'safeMessage', compiled)(
    { serve(callback: typeof handler) { handler = callback } }, () => client, 'riichi-open-i',
    (_request: Request, status: number, body: unknown) => Response.json(body, { status }),
    (error: Error) => error.message,
  )
  return () => handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ action: 'summary' }) }))
}

test('the public summary reports actual active holds, including zero', async () => {
  for (const count of [0, 3]) {
    const response = await publicHandler({ count, error: null })()
    assert.equal(response.status, 200)
    assert.equal((await response.json()).active_holds, count)
  }
})

test('a failed hold-count query returns an error instead of advertising extra places', async () => {
  const response = await publicHandler({ count: null, error: new Error('Availability could not be loaded.') })()
  assert.equal(response.status, 400)
  const body = await response.json()
  assert.equal(body.error, 'Availability could not be loaded.')
  assert.equal(body.active_holds, undefined)
})
