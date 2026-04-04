import { useEffect, useState } from 'react'
import { fetchAllPages } from '../services/pages'
import { fetchPublicNewsItems } from '../services/news'

const URL_TYPES = [
  { value: 'none', label: 'Geen link' },
  { value: 'page', label: 'Pagina' },
  { value: 'news', label: 'Nieuwsbericht' },
  { value: 'external', label: 'Externe URL' },
]

/**
 * Detect URL type from a stored url value.
 * Internal paths: /pagina/slug, /nieuws/slug
 * External: anything else non-empty
 */
export function detectUrlType(url) {
  if (!url) return 'none'
  if (url.startsWith('/pagina/')) return 'page'
  if (url.startsWith('/nieuws/')) return 'news'
  return 'external'
}

/**
 * Extract slug from internal url, e.g. /pagina/huisregels -> huisregels
 */
function extractSlug(url) {
  if (!url) return ''
  const match = url.match(/^\/(pagina|nieuws)\/(.+)$/)
  return match ? match[2] : ''
}

export default function ActivityUrlField({ url, urlType, onChange, inputClass }) {
  const [pages, setPages] = useState([])
  const [newsItems, setNewsItems] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return
    let cancelled = false
    async function load() {
      const [pagesRes, newsRes] = await Promise.all([
        fetchAllPages(),
        fetchPublicNewsItems(),
      ])
      if (cancelled) return
      if (pagesRes.data) setPages(pagesRes.data)
      if (newsRes.data) setNewsItems(newsRes.data)
      setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [loaded])

  function handleTypeChange(newType) {
    if (newType === 'none') {
      onChange('', newType)
    } else if (newType === 'page') {
      // Pre-select first page if available
      const first = pages[0]
      onChange(first ? `/pagina/${first.slug}` : '', newType)
    } else if (newType === 'news') {
      const first = newsItems[0]
      onChange(first ? `/nieuws/${first.slug}` : '', newType)
    } else {
      onChange('', newType)
    }
  }

  function handlePageChange(slug) {
    onChange(slug ? `/pagina/${slug}` : '', 'page')
  }

  function handleNewsChange(slug) {
    onChange(slug ? `/nieuws/${slug}` : '', 'news')
  }

  function handleExternalChange(value) {
    onChange(value, 'external')
  }

  const currentSlug = extractSlug(url)

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-500 mb-1">Link</label>
      <select
        value={urlType}
        onChange={e => handleTypeChange(e.target.value)}
        className={inputClass + ' w-auto'}
      >
        {URL_TYPES.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {urlType === 'page' && (
        <div>
          {pages.length > 0 ? (
            <select
              value={currentSlug}
              onChange={e => handlePageChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecteer een pagina...</option>
              {pages.map(p => (
                <option key={p.id} value={p.slug}>{p.title}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-gray-500 italic">Geen pagina's beschikbaar.</p>
          )}
        </div>
      )}

      {urlType === 'news' && (
        <div>
          {newsItems.length > 0 ? (
            <select
              value={currentSlug}
              onChange={e => handleNewsChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecteer een nieuwsbericht...</option>
              {newsItems.map(n => (
                <option key={n.id} value={n.slug}>{n.title}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-gray-500 italic">Geen nieuwsberichten beschikbaar.</p>
          )}
        </div>
      )}

      {urlType === 'external' && (
        <input
          type="url"
          value={url}
          onChange={e => handleExternalChange(e.target.value)}
          className={inputClass}
          placeholder="https://..."
        />
      )}
    </div>
  )
}
