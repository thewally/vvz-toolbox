import { useEffect, useState } from 'react'
import { getProgramma } from '../services/wedstrijden'
import { filterHuidigeSpeelweek, groepeerPerDag, formatDagLabel } from '../services/wedstrijdenHelpers'

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
      {[...perDag.entries()].map(([datum, items]) => (
        <div key={datum} className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 capitalize mb-4 border-b border-gray-200 pb-2">
            {formatDagLabel(items[0].wedstrijddatum)}
          </h2>
          <div className="flex flex-col gap-3">
            {items.map((w, i) => (
              <div key={i} className="flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Tijd badge */}
                <div className="flex flex-col items-center justify-center w-20 shrink-0 bg-vvz-green text-white px-2 py-3">
                  <span className="text-lg font-bold leading-tight">{w.aanvangstijd || '--:--'}</span>
                </div>
                {/* Content */}
                <div className="flex-1 p-4 min-w-0">
                  <h3 className="font-semibold text-gray-800 leading-snug">
                    {w.thuisteam} <span className="text-gray-400 font-normal">vs</span> {w.uitteam}
                  </h3>
                  {w.competitienaam && (
                    <p className="text-sm text-gray-500 mt-1">{w.competitienaam}</p>
                  )}
                  {w.accommodatie && (
                    <p className="text-xs text-gray-400 mt-1">{w.accommodatie}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
