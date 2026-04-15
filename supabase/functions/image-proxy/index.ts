const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const imageUrl = url.searchParams.get('url')

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400, headers: corsHeaders })
  }

  // Alleen Sportlink-domeinen toestaan
  let parsed: URL
  try {
    parsed = new URL(imageUrl)
  } catch {
    return new Response('Invalid url', { status: 400, headers: corsHeaders })
  }

  if (!parsed.hostname.endsWith('sportlink.com') && !parsed.hostname.endsWith('sportlink.nl')) {
    return new Response('Forbidden domain', { status: 403, headers: corsHeaders })
  }

  try {
    const res = await fetch(imageUrl)
    if (!res.ok) {
      return new Response('Upstream error', { status: 502, headers: corsHeaders })
    }
    const contentType = res.headers.get('content-type') || 'image/png'
    const body = await res.arrayBuffer()
    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders,
      },
    })
  } catch (err) {
    console.error(err)
    return new Response('Failed to fetch image', { status: 502, headers: corsHeaders })
  }
})
