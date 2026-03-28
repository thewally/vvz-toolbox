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
        setGegevens(data ?? null)
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

  if (error || !gegevens?.gegevens) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
          Kan contactgegevens niet laden.
        </div>
      </div>
    )
  }

  const g = gegevens.gegevens
  const b = gegevens.bezoekadres
  const postAdres = [g.straatnaam, g.huisnummer, g.nummertoevoeging].filter(Boolean).join(' ')
  const postPlaats = [g.postcode, g.plaats].filter(Boolean).join(' ')
  const bezAdres = b ? [b.straatnaam, b.huisnummer, b.nummertoevoeging].filter(Boolean).join(' ') : null
  const bezPlaats = b ? [b.postcode, b.plaats].filter(Boolean).join(' ') : null

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-800">{g.clubnaam}</h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {(bezAdres || bezPlaats) && (
            <div>
              <dt className="font-medium text-gray-500">Bezoekadres</dt>
              <dd className="mt-1 text-gray-800">
                {b.naam && <span className="block">{b.naam}</span>}
                {bezAdres && <span className="block">{bezAdres}</span>}
                {bezPlaats && <span className="block">{bezPlaats}</span>}
              </dd>
            </div>
          )}
          {g.telefoonnummer && (
            <div>
              <dt className="font-medium text-gray-500">Telefoon</dt>
              <dd className="mt-1 text-gray-800">
                <a href={`tel:${g.telefoonnummer}`} className="text-vvz-green hover:underline">{g.telefoonnummer}</a>
              </dd>
            </div>
          )}
          {g.email && (
            <div>
              <dt className="font-medium text-gray-500">E-mail</dt>
              <dd className="mt-1 text-gray-800">
                <a href={`mailto:${g.email}`} className="text-vvz-green hover:underline">{g.email}</a>
              </dd>
            </div>
          )}
          {g.website && (
            <div>
              <dt className="font-medium text-gray-500">Website</dt>
              <dd className="mt-1 text-gray-800">
                <a href={g.website.startsWith('http') ? g.website : `https://${g.website}`} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">{g.website}</a>
              </dd>
            </div>
          )}
          {g.naamsecretaris && (
            <div>
              <dt className="font-medium text-gray-500">Secretaris</dt>
              <dd className="mt-1 text-gray-800">{g.naamsecretaris}</dd>
            </div>
          )}
          {g.kvknummer && (
            <div>
              <dt className="font-medium text-gray-500">KVK</dt>
              <dd className="mt-1 text-gray-800">{g.kvknummer}</dd>
            </div>
          )}
        </dl>

        {(g.facebook || g.instagram || g.twitter || g.youtube) && (
          <div className="pt-2 border-t border-gray-100">
            <dt className="text-sm font-medium text-gray-500 mb-2">Social media</dt>
            <div className="flex gap-4 flex-wrap text-sm">
              {g.facebook && <a href={g.facebook} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">Facebook</a>}
              {g.instagram && <a href={g.instagram} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">Instagram</a>}
              {g.twitter && <a href={`https://twitter.com/${g.twitter.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">{g.twitter}</a>}
              {g.youtube && <a href={g.youtube} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">YouTube</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
