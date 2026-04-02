import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUitslagen, getTeams } from '../services/wedstrijden'
import { groepeerPerDag, formatDagLabel, buildTeamcodeLookup, getVvzTeamcode } from '../services/wedstrijdenHelpers'

export default function WedstrijdenUitslagenPage() {
  const [wedstrijden, setWedstrijden] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const [uitslagenRes, teamsRes] = await Promise.all([getUitslagen(), getTeams()])
    if (uitslagenRes.error) {
      setError(uitslagenRes.error.message)
    } else {
      setWedstrijden(uitslagenRes.data ?? [])
    }
    if (teamsRes.data) setTeams(teamsRes.data)
    setLoading(false)
  }

  const teamcodeLookup = useMemo(() => buildTeamcodeLookup(teams), [teams])

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
  const verleden = wedstrijden.filter(w => w.wedstrijddatum && w.wedstrijddatum.slice(0, 10) <= vandaag && w.uitslag)
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
              const isThuis = w.thuisteamclubrelatiecode === import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE

              const sportOmschrijving = (w.sportomschrijving || '').toLowerCase()
              const isZaal = sportOmschrijving.includes('zaal') || sportOmschrijving.includes('futsal')
              const locatieLabel = w.sportomschrijving ? (isZaal ? 'ZAAL' : 'VELD') : null

              const teamcode = getVvzTeamcode(w, teamcodeLookup)
              const cardClasses = `bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 transition-shadow ${teamcode ? 'group cursor-pointer hover:shadow-md hover:border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vvz-green focus-visible:ring-offset-2' : 'cursor-default'}`
              const vvzTeam = isThuis ? w.thuisteam : w.uitteam
              const Wrapper = teamcode
                ? ({ children, className }) => <Link to={`/teams/${teamcode}`} className={`block ${className}`} aria-label={`Bekijk teampagina van ${vvzTeam}`}>{children}</Link>
                : ({ children, className }) => <div className={className}>{children}</div>
              return (
                <Wrapper key={i} className={cardClasses}>
                  {/* Mobiel: verticale layout */}
                  <div className="sm:hidden flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                      <span className={`w-14 text-center text-xs font-semibold px-2 py-0.5 rounded-full ${isThuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isThuis ? 'THUIS' : 'UIT'}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-0.5">
                      <span className={`font-semibold text-sm ${isThuis && isEigenTeam ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                      <span className="text-lg font-bold text-gray-800 tabular-nums">{thuisScore} – {uitScore}</span>
                      <span className={`font-semibold text-sm ${!isThuis && isEigenTeam ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                      {w.accommodatie && <p className="text-xs text-gray-400">{w.accommodatie}</p>}
                    </div>
                    <div className="flex flex-col justify-center items-end shrink-0 gap-1">
                      {locatieLabel ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isZaal ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>
                          {locatieLabel}
                        </span>
                      ) : <span className="w-14" />}
                      {teamcode && (
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                      )}
                    </div>
                  </div>
                  {/* Desktop: horizontale layout */}
                  <div className="hidden sm:grid gap-x-2 gap-y-0.5" style={{gridTemplateColumns: 'auto 1fr 4rem 1fr auto auto'}}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                      <span className={`w-14 text-center text-xs font-semibold px-2 py-0.5 rounded-full ${isThuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isThuis ? 'THUIS' : 'UIT'}
                      </span>
                    </div>
                    <span className={`self-center text-right font-semibold text-sm truncate ${isThuis && isEigenTeam ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                    <span className="self-center text-center text-lg font-bold text-gray-800 tabular-nums">{thuisScore} – {uitScore}</span>
                    <span className={`self-center font-semibold text-sm truncate ${!isThuis && isEigenTeam ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                    <div className="self-center flex items-center">
                      {locatieLabel ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isZaal ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>
                          {locatieLabel}
                        </span>
                      ) : <span className="w-14" />}
                    </div>
                    {teamcode ? (
                      <svg className="self-center w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    ) : <span className="w-4" />}
                    {w.accommodatie && (
                      <span className="text-center text-xs text-gray-400 col-start-2 col-end-5">{w.accommodatie}</span>
                    )}
                  </div>
                </Wrapper>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
