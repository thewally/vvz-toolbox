const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FEEDS = [
  'https://www.knvb.nl/knvb_node/rss/nieuws',
  'https://www.knvb.nl/knvb_node/rss/categorie/district-west-ii',
]

function extractText(xml: string, tag: string): string {
  const escaped = tag.replace(':', '\\:').replace('.', '\\.')
  const m = xml.match(new RegExp(`<${escaped}[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/${escaped}>`, 'i'))
  if (!m) return ''
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseItems(xml: string): { title: string; link: string; description: string; pubDate: string; image: string | null }[] {
  const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
  return itemBlocks.map(([, block]) => {
    const imageMatch = block.match(/<enclosure[^>]+url="([^"]+)"/) ||
                       block.match(/<media:content[^>]+url="([^"]+)"/) ||
                       block.match(/<media:thumbnail[^>]+url="([^"]+)"/)
    // content:encoded heeft de volledige tekst; description is fallback
    const description = extractText(block, 'content:encoded') || extractText(block, 'description')
    return {
      title: extractText(block, 'title'),
      link: extractText(block, 'link'),
      description,
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

    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

    return new Response(JSON.stringify(items.slice(0, 10)), {
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
