import { useState, useEffect } from 'react'
import { fetchClubGegevens } from '../services/sportlink'

export default function ReglemenenPage() {
  const [privacyUrl, setPrivacyUrl] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await fetchClubGegevens()
      setPrivacyUrl(data?.gegevens?.privacystatementclub ?? null)
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

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-4">
      {privacyUrl ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-800">Privacyverklaring</h2>
            <p className="text-sm text-gray-500 mt-1">Lees hoe VVZ'49 omgaat met persoonsgegevens.</p>
          </div>
          <a
            href={privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 transition-colors"
          >
            Bekijken
          </a>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Geen reglementen beschikbaar.</p>
      )}
    </div>
  )
}
