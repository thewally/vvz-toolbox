import { useEffect, useState } from 'react'
import { getProgramma } from '../services/wedstrijden'
import { filterHuidigeSpeelweek, groepeerPerDag, formatDagLabel } from '../services/wedstrijdenHelpers'
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

  const speelweek = filterHuidigeSpeelweek(wedstrijden)
  const perDag = groepeerPerDag(speelweek)

  if (speelweek.length === 0) {
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
              const isThuis = w.thuisteamclubrelatiecode === 'FZSZ66G'
              return (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 hover:shadow-md transition-shadow cursor-default">
                  <div className="flex items-center gap-3">
                    {/* Tijd + thuis/uit badge */}
                    <div className="shrink-0 w-14 text-center">
                      <span className="block text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                      <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isThuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isThuis ? 'THUIS' : 'UIT'}
                      </span>
                    </div>
                    {/* Thuisteam rechts */}
                    <div className="flex-1 min-w-0 text-right">
                      <span className={`font-semibold text-sm truncate block ${isThuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                    </div>
                    {/* vs center */}
                    <div className="shrink-0 w-16 text-center">
                      <span className="text-gray-400 text-sm">vs</span>
                    </div>
                    {/* Uitteam links */}
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold text-sm truncate block ${!isThuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                    </div>
                  </div>
                  {w.accommodatie && (
                    <div className="flex gap-3 -mt-2">
                      <div className="shrink-0 w-14" />
                      <p className="flex-1 text-xs text-gray-400 text-center">{w.accommodatie}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
