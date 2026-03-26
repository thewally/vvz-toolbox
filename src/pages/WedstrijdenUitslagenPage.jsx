import { useEffect, useState } from 'react'
import { getUitslagen } from '../services/wedstrijden'
import { filterVorigeSpeelweek, groepeerPerDag, formatDagLabel } from '../services/wedstrijdenHelpers'

export default function WedstrijdenUitslagenPage() {
  const [wedstrijden, setWedstrijden] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await getUitslagen()
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
          Kon uitslagen niet laden: {error}
          <button onClick={load} className="ml-3 underline font-medium">Opnieuw proberen</button>
        </div>
      </div>
    )
  }

  const speelweek = filterVorigeSpeelweek(wedstrijden)
  const perDag = groepeerPerDag(speelweek)

  if (speelweek.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-8 text-center">
        <p className="text-gray-500">Geen uitslagen gevonden.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
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
              const isEigenTeam = w.eigenteam === 'true'
              const scores = w.uitslag ? w.uitslag.split('-').map(s => s.trim()) : null
              const thuisScore = scores?.[0] ?? '-'
              const uitScore = scores?.[1] ?? '-'

              const isThuis = w.thuisteamclubrelatiecode === 'FZSZ66G'
              const thuisUitLabel = isThuis ? 'THUIS' : 'UIT'

              let resultLabel = null
              if (isEigenTeam && scores && scores.length === 2) {
                const t = parseInt(scores[0], 10)
                const u = parseInt(scores[1], 10)
                const eigenScore = isThuis ? t : u
                const tegenScore = isThuis ? u : t
                if (!isNaN(eigenScore) && !isNaN(tegenScore)) {
                  if (eigenScore > tegenScore) resultLabel = <span className="text-xs font-bold text-green-600 shrink-0">Gewonnen</span>
                  else if (eigenScore < tegenScore) resultLabel = <span className="text-xs font-bold text-red-500 shrink-0">Verloren</span>
                  else resultLabel = <span className="text-xs font-bold text-orange-400 shrink-0">Gelijk</span>
                }
              }

              return (
                <div key={i} className="rounded-xl shadow-sm border border-gray-100 bg-white px-4 py-3 hover:shadow-md transition-shadow cursor-default">
                  <div className="flex items-center gap-3">
                    {/* Tijd + thuis/uit */}
                    <div className="shrink-0 w-14 text-center">
                      <span className="block text-sm font-bold text-vvz-green">{w.aanvangstijd || '--:--'}</span>
                      <span className="block text-xs font-semibold text-gray-400 mt-0.5">{thuisUitLabel}</span>
                    </div>
                    {/* Thuisteam */}
                    <div className="flex-1 min-w-0 text-right">
                      <span className="font-semibold text-gray-800 text-sm truncate block">{w.thuisteam}</span>
                    </div>
                    {/* Score */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xl font-bold text-gray-800 w-7 text-right">{thuisScore}</span>
                      <span className="text-gray-400 text-sm">–</span>
                      <span className="text-xl font-bold text-gray-800 w-7 text-left">{uitScore}</span>
                    </div>
                    {/* Uitteam */}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-800 text-sm truncate block">{w.uitteam}</span>
                    </div>
                    {/* Resultaat label */}
                    {resultLabel}
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
