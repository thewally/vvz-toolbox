import { useEffect, useState } from 'react'
import { getProgramma } from '../services/wedstrijden'
import { groepeerPerDag, formatDagLabel } from '../services/wedstrijdenHelpers'
import AfgelastingenIndicator from '../components/AfgelastingenIndicator'

export default function WedstrijdenProgrammaPage() {
  const [wedstrijden, setWedstrijden] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await getProgramma()
    if (error) {
      setError(error.message)
    } else {
      setWedstrijden(data ?? [])
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
          Kon programma niet laden: {error}
          <button onClick={load} className="ml-3 underline font-medium">Opnieuw proberen</button>
        </div>
      </div>
    )
  }

  const vandaag = new Date().toISOString().slice(0, 10)
  const toekomst = wedstrijden.filter(w => w.wedstrijddatum && w.wedstrijddatum.slice(0, 10) >= vandaag)
  const perDag = groepeerPerDag(toekomst)

  if (toekomst.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-8 text-center">
        <p className="text-gray-500">Geen wedstrijden gevonden.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <AfgelastingenIndicator />
      {[...perDag.entries()].map(([datum, items]) => (
        <div key={datum} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
              {formatDagLabel(items[0].wedstrijddatum)}
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="flex flex-col gap-3">
            {items.map((w, i) => {
              const isThuis = w.thuisteamclubrelatiecode === import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE
              const locatieLabel = (w.locatie || '').toUpperCase() || null
              return (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 hover:shadow-md transition-shadow cursor-default">
                  {/* Mobiel: verticale layout */}
                  <div className="sm:hidden flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                      <span className={`w-14 text-center text-xs font-semibold px-2 py-0.5 rounded-full ${isThuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isThuis ? 'THUIS' : 'UIT'}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-0.5">
                      <span className={`font-semibold text-sm ${isThuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                      <span className="text-gray-400 text-xs">vs</span>
                      <span className={`font-semibold text-sm ${!isThuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                      {w.accommodatie && (
                        <p className="text-xs text-gray-400">{w.accommodatie}</p>
                      )}
                    </div>
                    <div className="flex flex-col justify-center items-end shrink-0">
                      {locatieLabel ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${locatieLabel.includes('ZAAL') || locatieLabel.includes('FUTSAL') ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>{locatieLabel}</span>
                      ) : <span className="w-14" />}
                    </div>
                  </div>
                  {/* Desktop: horizontale layout */}
                  <div className="hidden sm:grid gap-x-2 gap-y-0.5" style={{gridTemplateColumns: 'auto 1fr 4rem 1fr auto'}}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                      <span className={`w-14 text-center text-xs font-semibold px-2 py-0.5 rounded-full ${isThuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isThuis ? 'THUIS' : 'UIT'}
                      </span>
                    </div>
                    <span className={`self-center text-right font-semibold text-sm truncate ${isThuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                    <span className="self-center text-center text-gray-400 text-xs">vs</span>
                    <span className={`self-center font-semibold text-sm truncate ${!isThuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                    <div className="self-center flex items-center">
                      {locatieLabel ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${locatieLabel.includes('ZAAL') || locatieLabel.includes('FUTSAL') ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>{locatieLabel}</span>
                      ) : <span className="w-14" />}
                    </div>
                    {w.accommodatie && (
                      <span className="text-center text-xs text-gray-400 col-start-2 col-end-5">{w.accommodatie}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
