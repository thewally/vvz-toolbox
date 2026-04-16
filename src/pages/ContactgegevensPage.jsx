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
            <p className="text-sm font-medium text-gray-500 mb-3">Social media</p>
            <div className="flex gap-3 flex-wrap">
              {info.facebook_url && (
                <a href={info.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.884v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                  </svg>
                  @{new URL(info.facebook_url).pathname.replace(/^\//, '').replace(/\/$/, '')}
                </a>
              )}
              {info.instagram_url && (
                <a href={info.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  @{new URL(info.instagram_url).pathname.replace(/^\//, '').replace(/\/$/, '')}
                </a>
              )}
              {info.twitter_handle && (
                <a href={`https://x.com/${info.twitter_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black text-white text-sm font-medium hover:opacity-90 transition-opacity">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
                  </svg>
                  @{info.twitter_handle.replace('@', '')}
                </a>
              )}
              {info.youtube_url && (
                <a href={info.youtube_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FF0000] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  @{new URL(info.youtube_url).pathname.replace(/^\/(@|channel\/|user\/)/, '').replace(/\/$/, '')}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
