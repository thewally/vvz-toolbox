import { useEffect, useState } from 'react'
import { getUitslagen } from '../services/wedstrijden'
import { groepeerPerDag, formatDagLabel } from '../services/wedstrijdenHelpers'

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

  const vandaag = new Date().toISOString().slice(0, 10)
  const verleden = wedstrijden.filter(w => w.wedstrijddatum && w.wedstrijddatum.slice(0, 10) < vandaag && w.uitslag)
  const perDagUnsorted = groepeerPerDag(verleden)
  // Meest recent eerst
  const perDag = new Map([...perDagUnsorted.entries()].reverse())

  if (verleden.length === 0) {
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

              let resultLabel = null
              if (isEigenTeam && scores && scores.length === 2) {
                const t = parseInt(scores[0], 10)
                const u = parseInt(scores[1], 10)
                const eigenScore = isThuis ? t : u
                const tegenScore = isThuis ? u : t
                if (!isNaN(eigenScore) && !isNaN(tegenScore)) {
                  if (eigenScore > tegenScore) resultLabel = <span className="text-xs font-bold text-green-600 shrink-0 w-16 text-right">Gewonnen</span>
                  else if (eigenScore < tegenScore) resultLabel = <span className="text-xs font-bold text-red-500 shrink-0 w-16 text-right">Verloren</span>
                  else resultLabel = <span className="text-xs font-bold text-orange-400 shrink-0 w-16 text-right">Gelijk</span>
                }
              }

              return (
                <div key={i} className="flex items-center bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 gap-3 hover:shadow-md transition-shadow cursor-default">
                  {/* Tijd + thuis/uit badge */}
                  <div className="shrink-0 w-14 text-center">
                    <span className="block text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                    <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isThuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {isThuis ? 'THUIS' : 'UIT'}
                    </span>
                  </div>
                  {/* Thuisteam */}
                  <div className="flex-1 min-w-0 text-right">
                    <span className={`font-semibold text-sm truncate block ${isThuis && isEigenTeam ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                  </div>
                  {/* Score — vaste breedte zodat streepje altijd uitlijnt */}
                  <div className="shrink-0 flex items-center w-16 justify-center gap-0.5">
                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{thuisScore}</span>
                    <span className="text-gray-400 text-sm mx-1">–</span>
                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{uitScore}</span>
                  </div>
                  {/* Uitteam */}
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold text-sm truncate block ${!isThuis && isEigenTeam ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                  </div>
                  {/* Resultaat */}
                  {resultLabel ?? <span className="shrink-0 w-16" />}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
