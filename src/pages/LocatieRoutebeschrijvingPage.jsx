import { useState, useEffect } from 'react'
import { fetchClubContactInfo } from '../services/clubContact'

const FALLBACK_ADRES = 'Sportpark Zonnegloren, Soest'

export default function LocatieRoutebeschrijvingPage() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await fetchClubContactInfo()
      if (data) setInfo(data)
      setLoading(false)
    }
    load()
  }, [])

  const zoekAdres = info?.bezoek_straat
    ? [
        `${info.bezoek_straat} ${info.bezoek_huisnummer || ''}`.trim(),
        info.bezoek_postcode,
        info.bezoek_plaats,
      ].filter(Boolean).join(', ')
    : FALLBACK_ADRES

  const googleMapsUrl = info?.google_maps_query || null

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  return (
    <div className="p-4 pt-6 space-y-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Adres</h2>
        {info ? (
          <address className="not-italic text-gray-800 text-sm space-y-0.5">
            {info.terrein_naam && <p className="font-medium">{info.terrein_naam}</p>}
            {(info.bezoek_straat || info.bezoek_huisnummer) && (
              <p>{[info.bezoek_straat, info.bezoek_huisnummer].filter(Boolean).join(' ')}</p>
            )}
            {(info.bezoek_postcode || info.bezoek_plaats) && (
              <p>{[info.bezoek_postcode, info.bezoek_plaats].filter(Boolean).join(' ')}</p>
            )}
          </address>
        ) : (
          <p className="text-gray-800 text-sm">{FALLBACK_ADRES}</p>
        )}
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-vvz-green hover:text-vvz-green/80 transition-colors"
          >
            Bekijk op Google Maps
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      <a
        href={googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(zoekAdres)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden shadow-sm border border-gray-100"
      >
        <iframe
          title="Locatie VVZ'49"
          src={info?.google_maps_query || `https://maps.google.com/maps?q=${encodeURIComponent(zoekAdres)}&output=embed`}
          className="w-full h-80 sm:h-[500px] pointer-events-none"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </a>
    </div>
  )
}
