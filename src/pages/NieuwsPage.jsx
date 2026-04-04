import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicNewsItems } from '../services/news'

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function NieuwsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(10)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await fetchPublicNewsItems()
      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Nieuws</h1>
        <p className="text-gray-500">Er zijn momenteel geen nieuwsberichten.</p>
      </div>
    )
  }

  const visible = items.slice(0, visibleCount)

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Nieuws</h1>

      <div className="space-y-6">
        {visible.map(item => (
          <article key={item.id} className="flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {item.image_url && (
              <Link to={`/nieuws/${item.slug}`} className="shrink-0">
                <img
                  src={item.image_url}
                  alt=""
                  className="w-36 sm:w-48 h-full object-contain bg-white aspect-[2/1]"
                />
              </Link>
            )}
            <div className="p-4 min-w-0">
              <Link to={`/nieuws/${item.slug}`} className="text-lg font-semibold text-gray-800 hover:text-vvz-green transition-colors">
                {item.title}
              </Link>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(item.published_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {item.content && (() => {
                const preview = stripHtml(item.content)
                return preview ? (
                  <p className="text-sm text-gray-600 mt-1">
                    {preview.length > 150 ? preview.slice(0, 150) + '...' : preview}
                  </p>
                ) : null
              })()}
            </div>
          </article>
        ))}
      </div>

      {visibleCount < items.length && (
        <div className="text-center mt-6">
          <button
            onClick={() => setVisibleCount(c => c + 10)}
            className="inline-flex items-center gap-2 bg-vvz-green text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-vvz-green/90 transition-colors"
          >
            Meer laden
          </button>
        </div>
      )}
    </div>
  )
}
