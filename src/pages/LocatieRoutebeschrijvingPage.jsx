import { useState, useEffect } from 'react'
import { fetchClubGegevens } from '../services/sportlink'

const FALLBACK_ADRES = 'Sportpark Zonnegloren, Soest'

export default function LocatieRoutebeschrijvingPage() {
  const [gegevens, setGegevens] = useState(null)
  const [bezoekadres, setBezoekadres] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await fetchClubGegevens()
      if (data) {
        setGegevens(data.gegevens ?? null)
        setBezoekadres(data.bezoekadres ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const adresBron = bezoekadres ?? gegevens

  const zoekAdres = adresBron
    ? [
        adresBron.straatnaam && adresBron.huisnummer
          ? `${adresBron.straatnaam} ${adresBron.huisnummer}${adresBron.nummertoevoeging || ''}`
          : null,
        adresBron.postcode,
        adresBron.plaats,
      ].filter(Boolean).join(', ')
    : FALLBACK_ADRES

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  return (
    <div className="p-4 pt-6 space-y-6">
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <iframe
          title="Locatie VVZ'49"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(zoekAdres)}&output=embed`}
          className="w-full h-80 sm:h-[500px]"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Adres</h2>
        {adresBron ? (
          <address className="not-italic text-gray-800 text-sm space-y-0.5">
            {(adresBron.straatnaam || adresBron.huisnummer) && (
              <p>{[adresBron.straatnaam, adresBron.huisnummer, adresBron.nummertoevoeging].filter(Boolean).join(' ')}</p>
            )}
            {(adresBron.postcode || adresBron.plaats) && (
              <p>{[adresBron.postcode, adresBron.plaats].filter(Boolean).join(' ')}</p>
            )}
          </address>
        ) : (
          <p className="text-gray-800 text-sm">{FALLBACK_ADRES}</p>
        )}
      </div>
    </div>
  )
}
