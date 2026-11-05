const TIME_ZONE = "Asia/Kuala_Lumpur"
const MAX_EVENTS = 50

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
}

const responseHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
}

type DatabaseEvent = {
  id: unknown
  name: unknown
  date: unknown
  description: unknown
  venue: unknown
  venue_url: unknown
  time: unknown
}

function jsonResponse(body: unknown, status = 200, headOnly = false): Response {
  return new Response(headOnly ? null : JSON.stringify(body), {
    status,
    headers: responseHeaders,
  })
}

function malaysiaDate(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ""

  return `${part("year")}-${part("month")}-${part("day")}`
}

function publishableKey(): string | null {
  const keySet = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")
  if (keySet) {
    try {
      const keys = JSON.parse(keySet) as Record<string, unknown>
      if (typeof keys.default === "string" && keys.default) return keys.default
    } catch {
      // Fall through to the single-key and legacy environment variables.
    }
  }

  return Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    null
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function publicUrl(value: unknown): string | null {
  const candidate = text(value, 500)
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null
  } catch {
    return null
  }
}

function sanitizeEvent(event: DatabaseEvent) {
  const name = text(event.name, 200)
  const date = text(event.date, 10)
  if (!name || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  return {
    id: typeof event.id === "number" || typeof event.id === "string" ? event.id : null,
    name,
    date,
    time: text(event.time, 80),
    description: text(event.description, 2_000),
    venue: text(event.venue, 200),
    venue_url: publicUrl(event.venue_url),
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const headOnly = request.method === "HEAD"
  if (request.method !== "GET" && !headOnly) {
    return jsonResponse(
      { error: "Method not allowed." },
      405,
      false,
    )
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const apiKey = publishableKey()
  if (!supabaseUrl || !apiKey) {
    console.error("public-gatherings is missing its Supabase public configuration")
    return jsonResponse({ error: "Gatherings are temporarily unavailable." }, 500, headOnly)
  }

  const today = malaysiaDate()
  const eventsUrl = new URL("/rest/v1/events", supabaseUrl)
  eventsUrl.searchParams.set("select", "id,name,date,description,venue,venue_url,time")
  eventsUrl.searchParams.set("date", `gte.${today}`)
  eventsUrl.searchParams.set("order", "date.asc,time.asc")
  eventsUrl.searchParams.set("limit", String(MAX_EVENTS))

  try {
    const upstream = await fetch(eventsUrl, {
      headers: {
        Accept: "application/json",
        apikey: apiKey,
      },
    })

    if (!upstream.ok) {
      console.error(`public-gatherings upstream returned HTTP ${upstream.status}`)
      return jsonResponse({ error: "Gatherings are temporarily unavailable." }, 502, headOnly)
    }

    const rows = await upstream.json()
    if (!Array.isArray(rows)) {
      console.error("public-gatherings upstream returned an unexpected payload")
      return jsonResponse({ error: "Gatherings are temporarily unavailable." }, 502, headOnly)
    }

    const events = rows
      .map((row) => sanitizeEvent(row as DatabaseEvent))
      .filter((event) => event !== null)

    return jsonResponse({
      as_of: today,
      timezone: TIME_ZONE,
      events,
      rsvp_url: "https://saujana-bgc.github.io/gatherings/",
    }, 200, headOnly)
  } catch {
    console.error("public-gatherings could not reach Supabase")
    return jsonResponse({ error: "Gatherings are temporarily unavailable." }, 502, headOnly)
  }
})

