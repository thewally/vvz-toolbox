import { useState, useEffect } from 'react'
import { fetchClubGegevens } from '../services/sportlink'

export default function ContactgegevensPage() {
  const [gegevens, setGegevens] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchClubGegevens()
      if (error) {
        setError(error.message)
      } else {
        setGegevens(data?.gegevens ?? null)
      }
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

  if (error || !gegevens) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
          Kan contactgegevens niet laden.
        </div>
      </div>
    )
  }

  const adres = [gegevens.straatnaam, gegevens.huisnummer, gegevens.nummertoevoeging].filter(Boolean).join(' ')
  const plaatsRegel = [gegevens.postcode, gegevens.plaats].filter(Boolean).join(' ')

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">{gegevens.clubnaam}</h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {(adres || plaatsRegel) && (
            <div>
              <dt className="font-medium text-gray-500">Adres</dt>
              <dd className="mt-1 text-gray-800">
                {adres && <span className="block">{adres}</span>}
                {plaatsRegel && <span className="block">{plaatsRegel}</span>}
              </dd>
            </div>
          )}
          {gegevens.telefoonnummer && (
            <div>
              <dt className="font-medium text-gray-500">Telefoon</dt>
              <dd className="mt-1 text-gray-800">
                <a href={`tel:${gegevens.telefoonnummer}`} className="text-vvz-green hover:underline">{gegevens.telefoonnummer}</a>
              </dd>
            </div>
          )}
          {gegevens.email && (
            <div>
              <dt className="font-medium text-gray-500">E-mail</dt>
              <dd className="mt-1 text-gray-800">
                <a href={`mailto:${gegevens.email}`} className="text-vvz-green hover:underline">{gegevens.email}</a>
              </dd>
            </div>
          )}
          {gegevens.website && (
            <div>
              <dt className="font-medium text-gray-500">Website</dt>
              <dd className="mt-1 text-gray-800">
                <a href={gegevens.website.startsWith('http') ? gegevens.website : `https://${gegevens.website}`} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">{gegevens.website}</a>
              </dd>
            </div>
          )}
          {gegevens.naamsecretaris && (
            <div>
              <dt className="font-medium text-gray-500">Secretaris</dt>
              <dd className="mt-1 text-gray-800">{gegevens.naamsecretaris}</dd>
            </div>
          )}
          {gegevens.kvknummer && (
            <div>
              <dt className="font-medium text-gray-500">KVK</dt>
              <dd className="mt-1 text-gray-800">{gegevens.kvknummer}</dd>
            </div>
          )}
        </dl>

        {(gegevens.facebook || gegevens.instagram || gegevens.twitter || gegevens.youtube) && (
          <div className="pt-2 border-t border-gray-100">
            <dt className="text-sm font-medium text-gray-500 mb-2">Social media</dt>
            <div className="flex gap-4 flex-wrap text-sm">
              {gegevens.facebook && <a href={gegevens.facebook} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">Facebook</a>}
              {gegevens.instagram && <a href={gegevens.instagram} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">Instagram</a>}
              {gegevens.twitter && <a href={`https://twitter.com/${gegevens.twitter.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">{gegevens.twitter}</a>}
              {gegevens.youtube && <a href={gegevens.youtube} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">YouTube</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
