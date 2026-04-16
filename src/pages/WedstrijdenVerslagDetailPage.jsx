import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchMatchReportBySlug } from '../services/matchReports'
import { makeIframesResponsive } from '../lib/htmlUtils'
import DOMPurify from 'dompurify'

function formatDatum(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function WedstrijdenVerslagDetailPage() {
  const { slug } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await fetchMatchReportBySlug(slug)
      if (error || !data) {
        setNotFound(true)
      } else {
        setItem(data)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Niet gevonden</h1>
        <p className="text-gray-600 mb-6">Dit wedstrijdverslag is niet (meer) beschikbaar.</p>
        <Link to="/wedstrijden/verslagen" className="text-vvz-green hover:underline">
          &larr; Terug naar verslagen
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to="/wedstrijden/verslagen" className="text-sm text-vvz-green hover:underline">
          &larr; Terug naar verslagen
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {item.team_name && (
          <Link
            to={`/teams/${item.team_id}`}
            className="inline-flex items-center bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-green-200 transition-colors"
          >
            {item.team_name}
          </Link>
        )}
        {item.published_at && (
          <span className="text-sm text-gray-400">{formatDatum(item.published_at)}</span>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">{item.title}</h1>

      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{
          __html: makeIframesResponsive(
            DOMPurify.sanitize(item.content || '', {
              ADD_TAGS: ['iframe'],
              ADD_ATTR: ['allowfullscreen', 'frameborder', 'allow', 'src', 'loading'],
            })
          ),
        }}
      />

      {item.team_id && (
        <div className="mt-10 pt-6 border-t border-gray-100">
          <Link
            to={`/teams/${item.team_id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-vvz-green hover:underline"
          >
            Naar teampagina {item.team_name}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
