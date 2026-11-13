import { adminUser, options, reply, safeMessage, serviceClient } from '../_shared/riichi-open.ts'

const BUCKET = 'botc-session-photos'
const object = (value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : {}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options(request)
  if (request.method !== 'POST') return reply(request, 405, { error: 'Use POST for this request.' })
  try {
    const body = object(await request.json())
    const db = serviceClient()
    if (body.action === 'public') {
      const { data, error } = await db.from('botc_sessions').select('*').eq('published', true).order('session_date', { ascending: false })
      if (error) throw error
      const sessions = (data ?? []).map(session => ({
        id: session.id,
        session_date: session.session_date,
        session_time: session.session_time,
        venue: session.venue,
        signup_url: session.signup_url,
        first_timer_note: session.first_timer_note,
        teaser: session.teaser,
        recap: session.recap,
        games: (Array.isArray(session.games) ? session.games : []).map((rawGame: unknown) => {
          const game = object(rawGame)
          return {
            id: game.id,
            script: game.script,
            outcome: game.outcome,
            notes: game.notes,
            photos: (Array.isArray(game.photos) ? game.photos : []).filter((photo: Record<string, unknown>) => photo.approved === true).map((photo: Record<string, unknown>) => ({ path: photo.path, cover: photo.cover === true, approved: true })),
            players: (Array.isArray(game.players) ? game.players : []).map((rawPlayer: unknown, index: number) => {
              const player = object(rawPlayer)
              const name = player.public_name
              return { name: typeof name === 'string' ? name.trim() : 'Player ' + (index + 1), character: player.character, died: player.died === true }
            }),
          }
        }),
      }))
      const paths = sessions.flatMap(session => (Array.isArray(session.games) ? session.games : []).flatMap((game: Record<string, unknown>) => Array.isArray(game.photos) ? game.photos.filter((photo: Record<string, unknown>) => photo.approved && typeof photo.path === 'string').map((photo: Record<string, unknown>) => photo.path as string) : []))
      const urls: Record<string, string> = {}
      for (const path of paths) {
        const { data: signed, error: signError } = await db.storage.from(BUCKET).createSignedUrl(path, 900)
        if (!signError && signed) urls[path] = signed.signedUrl
      }
      return reply(request, 200, { sessions, photo_urls: urls })
    }

    const user = await adminUser(request, db)
    if (body.action === 'admin') {
      const [sessions, players] = await Promise.all([
        db.from('botc_sessions').select('*').order('session_date', { ascending: false }),
        db.from('botc_players').select('id,private_name,public_name').order('private_name'),
      ])
      if (sessions.error || players.error) throw sessions.error ?? players.error
      const paths = [...new Set((sessions.data ?? []).flatMap(session =>
        (Array.isArray(session.games) ? session.games : []).flatMap((rawGame: unknown) => {
          const game = object(rawGame)
          return (Array.isArray(game.photos) ? game.photos : [])
            .map((rawPhoto: unknown) => object(rawPhoto).path)
            .filter((path): path is string => typeof path === 'string' && path.length > 0)
        }),
      ))]
      const photoUrls: Record<string, string> = {}
      for (const path of paths) {
        const { data: signed, error: signError } = await db.storage.from(BUCKET).createSignedUrl(path, 900)
        if (!signError && signed) photoUrls[path] = signed.signedUrl
      }
      return reply(request, 200, { sessions: sessions.data ?? [], players: players.data ?? [], photo_urls: photoUrls })
    }
    if (body.action === 'save') {
      const session = object(body.session)
      const id = typeof session.id === 'string' ? session.id : crypto.randomUUID()
      const games = Array.isArray(session.games) ? session.games : []
      if (typeof session.session_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(session.session_date)) return reply(request, 400, { error: 'Choose a valid gathering date.' })
      if (session.published === true && games.some((game: Record<string, unknown>) => !String(game.script ?? '').trim() || !Array.isArray(game.players) || !game.players.length || game.players.some((player: Record<string, unknown>) => !String(player.name ?? '').trim()) || !String(game.outcome ?? '').trim())) return reply(request, 400, { error: 'Give every player a name and add a script, roster and outcome to each game before publishing.' })
      const people = [...new Set(games.flatMap((game: Record<string, unknown>) => Array.isArray(game.players) ? game.players.map((player: Record<string, unknown>) => String(player.name ?? '').trim()).filter(Boolean) : []))]
      for (const name of people) {
        const { error } = await db.from('botc_players').upsert({ private_name: name }, { onConflict: 'private_name', ignoreDuplicates: true })
        if (error) throw error
      }
      const record = { id, session_date: session.session_date, session_time: session.session_time || null, venue: session.venue || null, signup_url: session.signup_url || null, first_timer_note: session.first_timer_note || null, teaser: session.teaser || null, recap: session.recap || null, featured_game_id: session.featured_game_id || null, published: session.published === true, games, updated_at: new Date().toISOString() }
      const { data, error } = await db.from('botc_sessions').upsert(record).select('*').single()
      if (error) throw error
      return reply(request, 200, { session: data })
    }
    if (body.action === 'delete_photo') {
      const path = String(body.path ?? '')
      if (!path.startsWith(`${user.id}/`)) return reply(request, 400, { error: 'Photo path is invalid.' })
      const { error } = await db.storage.from(BUCKET).remove([path])
      if (error) throw error
      return reply(request, 200, { ok: true })
    }
    return reply(request, 400, { error: 'Unknown Clocktower action.' })
  } catch (error) {
    const message = safeMessage(error)
    const status = message.includes('access') || message.includes('Sign in') ? 401 : 400
    return reply(request, status, { error: message })
  }
})
