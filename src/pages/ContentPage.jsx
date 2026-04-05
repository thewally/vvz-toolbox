import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchPageBySlug } from '../services/pages'
import { useAuth } from '../context/AuthContext'
import { makeIframesResponsive } from '../lib/htmlUtils'
import DOMPurify from 'dompurify'

export default function ContentPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await fetchPageBySlug(slug)
      if (error || !data) {
        setNotFound(true)
      } else {
        setPage(data)
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
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Pagina niet gevonden</h1>
        <p className="text-gray-600 mb-6">De pagina die je zoekt bestaat niet of is niet meer beschikbaar.</p>
        <Link to="/" className="text-vvz-green hover:underline">&larr; Terug naar de homepage</Link>
      </div>
    )
  }

  const isExpired = page.expires_at && new Date(page.expires_at) < new Date()

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      {isExpired && user && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-4 rounded-lg mb-4">
          Deze pagina is verlopen en niet meer zichtbaar voor bezoekers.
        </div>
      )}
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{page.title}</h1>
      {page.published_at && (
        <p className="text-sm text-gray-400 mb-6">
          {new Date(page.published_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: makeIframesResponsive(DOMPurify.sanitize(page.content, {
          ADD_TAGS: ['iframe'],
          ADD_ATTR: ['allowfullscreen', 'frameborder', 'allow', 'src', 'loading']
        })) }}
      />
    </div>
  )
}
