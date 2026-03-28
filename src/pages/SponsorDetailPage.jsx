import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSponsorBySlug } from '../services/sponsors'

export default function SponsorDetailPage() {
  const { slug } = useParams()
  const [sponsor, setSponsor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getSponsorBySlug(slug).then(({ data, error }) => {
      if (error || !data) setNotFound(true)
      else setSponsor(data)
      setLoading(false)
    })
  }, [slug])

  if (loading) return <div className="text-center py-12 text-gray-400">Laden...</div>

  if (notFound) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <p className="text-gray-500">Sponsor niet gevonden.</p>
      <Link to="/sponsors" className="mt-4 inline-block text-vvz-green hover:underline">← Terug naar sponsors</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link to="/sponsors" className="text-sm text-gray-400 hover:text-vvz-green transition-colors mb-8 inline-block">
        ← Alle sponsors
      </Link>

      <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center text-center gap-6">
        {sponsor.logo_url && (
          <img src={sponsor.logo_url} alt={sponsor.naam} className="max-h-32 max-w-xs w-auto object-contain" />
        )}
        <h1 className="text-2xl font-bold text-gray-800">{sponsor.naam}</h1>
        {sponsor.beschrijving && (
          <div className="w-full text-left text-gray-600 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_a]:text-vvz-green [&_a]:underline" dangerouslySetInnerHTML={{ __html: sponsor.beschrijving }} />
        )}
        {sponsor.website_url && (
          <a
            href={sponsor.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 bg-vvz-green text-white px-6 py-3 rounded-xl font-medium hover:bg-vvz-green-dark transition-colors"
          >
            Bezoek website →
          </a>
        )}
      </div>
    </div>
  )
}
