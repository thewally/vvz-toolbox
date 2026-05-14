const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FEEDS = [
  'https://www.knvb.nl/knvb_node/rss/nieuws',
  'https://www.knvb.nl/knvb_node/rss/categorie/district-west-ii',
]

function extractText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}

function parseItems(xml: string): { title: string; link: string; description: string; pubDate: string; image: string | null }[] {
  const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
  return itemBlocks.map(([, block]) => {
    const imageMatch = block.match(/<enclosure[^>]+url="([^"]+)"/) ||
                       block.match(/<media:content[^>]+url="([^"]+)"/) ||
                       block.match(/<media:thumbnail[^>]+url="([^"]+)"/)
    return {
      title: extractText(block, 'title'),
      link: extractText(block, 'link'),
      description: extractText(block, 'description'),
      pubDate: extractText(block, 'pubDate'),
      image: imageMatch ? imageMatch[1] : null,
    }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const results = await Promise.allSettled(FEEDS.map(url => fetch(url).then(r => r.text())))
    const items = results.flatMap(r => r.status === 'fulfilled' ? parseItems(r.value) : [])

    // Sorteer op datum, nieuwste eerst, neem top 3
    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    const top3 = items.slice(0, 3)

    return new Response(JSON.stringify(top3), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        ...corsHeaders,
      },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Failed to fetch KNVB news' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
