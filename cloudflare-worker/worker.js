const SPORTLINK_BASE = 'https://data.sportlink.com'

// Toegestane SportLink endpoints
const ALLOWED_PATHS = [
  '/programma',
  '/uitslagen',
  '/teams',
  '/poulestand',
  '/afgelastingen',
  '/clubgegevens',
  '/team-gegevens',
]

// CORS-origins die toegang krijgen
const ALLOWED_ORIGINS = [
  'https://thewally.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    const path = url.pathname

    if (!ALLOWED_PATHS.includes(path)) {
      return new Response('Not found', { status: 404 })
    }

    // Bouw SportLink URL op: kopieer alle params en voeg client_id toe
    const params = new URLSearchParams(url.search)
    params.set('client_id', env.SPORTLINK_CLIENT_ID)

    const sportlinkUrl = `${SPORTLINK_BASE}${path}?${params.toString()}`

    try {
      const sportlinkRes = await fetch(sportlinkUrl, {
        headers: { 'User-Agent': 'VVZ49-Proxy/1.0' },
      })

      const body = await sportlinkRes.text()

      return new Response(body, {
        status: sportlinkRes.status,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/json',
          // Cache responses 5 minuten
          'Cache-Control': 'public, max-age=300',
        },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: 'SportLink niet bereikbaar' }), {
        status: 502,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      })
    }
  },
}
