import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchNewsItemBySlug } from '../services/news'
import { useAuth } from '../context/AuthContext'

export default function NieuwsDetailPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await fetchNewsItemBySlug(slug)
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
        <p className="text-gray-600 mb-6">Dit nieuwsbericht is niet (meer) beschikbaar.</p>
        <Link to="/nieuws" className="text-vvz-green hover:underline">&larr; Terug naar Nieuws</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to="/nieuws" className="text-sm text-vvz-green hover:underline">&larr; Terug naar Nieuws</Link>
      </div>

      {item.expires_at && new Date(item.expires_at) < new Date() && user && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-4 rounded-lg mb-4">
          Deze pagina is verlopen en niet meer zichtbaar voor bezoekers.
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-2">{item.title}</h1>
      {item.published_at && (
        <p className="text-sm text-gray-400 mb-6">
          {new Date(item.published_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}

      {item.image_url && (
        <img
          src={item.image_url}
          alt=""
          className="w-full rounded-xl mb-6"
        />
      )}

      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: item.content || '' }}
      />
    </div>
  )
}
