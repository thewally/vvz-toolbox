import { useState, useEffect } from 'react'
import { fetchClubContactInfo } from '../services/clubContact'

export default function ContactgegevensPage() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchClubContactInfo()
      if (error) {
        setError(error.message)
      } else {
        setInfo(data)
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

  if (error || !info) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
          Geen contactgegevens beschikbaar.
        </div>
      </div>
    )
  }

  const postAdres = [info.post_straat, info.post_huisnummer].filter(Boolean).join(' ')
  const postPlaats = [info.post_postcode, info.post_plaats].filter(Boolean).join(' ')

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        {info.clubnaam && <h2 className="text-lg font-bold text-gray-800">{info.clubnaam}</h2>}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {(postAdres || postPlaats) && (
            <div>
              <dt className="font-medium text-gray-500">Postadres</dt>
              <dd className="mt-1 text-gray-800">
                {postAdres && <span className="block">{postAdres}</span>}
                {postPlaats && <span className="block">{postPlaats}</span>}
              </dd>
            </div>
          )}
          {info.telefoonnummer && (
            <div>
              <dt className="font-medium text-gray-500">Telefoon</dt>
              <dd className="mt-1 text-gray-800">
                <a href={`tel:${info.telefoonnummer}`} className="text-vvz-green hover:underline">{info.telefoonnummer}</a>
              </dd>
            </div>
          )}
          {info.email && (
            <div>
              <dt className="font-medium text-gray-500">E-mail</dt>
              <dd className="mt-1 text-gray-800">
                <a href={`mailto:${info.email}`} className="text-vvz-green hover:underline">{info.email}</a>
              </dd>
            </div>
          )}
          {info.website && (
            <div>
              <dt className="font-medium text-gray-500">Website</dt>
              <dd className="mt-1 text-gray-800">
                <a href={info.website.startsWith('http') ? info.website : `https://${info.website}`} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">{info.website}</a>
              </dd>
            </div>
          )}
          {info.iban && (
            <div>
              <dt className="font-medium text-gray-500">IBAN</dt>
              <dd className="mt-1 text-gray-800">{info.iban}</dd>
            </div>
          )}
          {info.kvk_nummer && (
            <div>
              <dt className="font-medium text-gray-500">KVK</dt>
              <dd className="mt-1 text-gray-800">{info.kvk_nummer}</dd>
            </div>
          )}
        </dl>

        {(info.facebook_url || info.instagram_url || info.twitter_handle || info.youtube_url) && (
          <div className="pt-2 border-t border-gray-100">
            <dt className="text-sm font-medium text-gray-500 mb-2">Social media</dt>
            <div className="flex gap-4 flex-wrap text-sm">
              {info.facebook_url && <a href={info.facebook_url} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">Facebook</a>}
              {info.instagram_url && <a href={info.instagram_url} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">Instagram</a>}
              {info.twitter_handle && <a href={`https://twitter.com/${info.twitter_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">{info.twitter_handle}</a>}
              {info.youtube_url && <a href={info.youtube_url} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">YouTube</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
