import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAfgelastingen } from '../services/wedstrijden'
import { groepeerPerDag, formatDagLabel } from '../services/wedstrijdenHelpers'

const CLUB_RC = import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE

function getVvzTeamcode(w) {
  const isThuis = w.thuisteamclubrelatiecode === CLUB_RC
  const isUit = w.uitteamclubrelatiecode === CLUB_RC
  if (isThuis && w.thuisteamcode) return String(w.thuisteamcode)
  if (isUit && w.uitteamcode) return String(w.uitteamcode)
  return null
}

function getSportBadge(w) {
  const sport = (w.sportomschrijving || '').toLowerCase()
  if (sport.includes('zaal') || sport.includes('futsal')) return 'zaal'
  if (sport) return 'veld'
  return null
}

export default function WedstrijdenAfgelastingenPage() {
  const [afgelast, setAfgelast] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const afgelastRes = await getAfgelastingen()
    if (afgelastRes.error) {
      setError(afgelastRes.error.message)
      setLoading(false)
      return
    }
    const data = afgelastRes.data ?? []
    // Filter op eigen club (afgelastingen endpoint kan alle clubs teruggeven)
    const eigenClub = data.filter(w =>
      w.thuisteamclubrelatiecode === CLUB_RC || w.uitteamclubrelatiecode === CLUB_RC
    )
    setAfgelast(eigenClub)
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
          Kon afgelastingen niet laden: {error}
          <button onClick={load} className="ml-3 underline font-medium">Opnieuw proberen</button>
        </div>
      </div>
    )
  }

  if (afgelast.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="rounded-full w-3 h-3 bg-green-500 shrink-0 animate-pulse" />
          <span className="text-sm font-semibold text-gray-700">Geen afgelastingen op dit moment.</span>
        </div>
      </div>
    )
  }

  const perDag = groepeerPerDag(afgelast)

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="flex items-center gap-2 mb-6 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
        <svg className="w-5 h-5 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span className="text-sm font-medium text-orange-700">
          {afgelast.length} wedstrijd{afgelast.length !== 1 ? 'en' : ''} afgelast
        </span>
      </div>

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
              const isThuis = w.thuisteamclubrelatiecode === CLUB_RC
              const teamcode = getVvzTeamcode(w)
              const sportBadge = getSportBadge(w)
              const Wrapper = teamcode
                ? ({ children }) => <Link to={`/teams/${teamcode}`} className="block group">{children}</Link>
                : ({ children }) => <div>{children}</div>
              return (
                <Wrapper key={i}>
                  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 opacity-75 ${teamcode ? 'hover:shadow-md hover:opacity-100 transition-all' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-14 text-center">
                        <span className="block text-sm font-bold text-gray-400 line-through">{w.aanvangstijd || '--:--'}</span>
                        <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isThuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {isThuis ? 'THUIS' : 'UIT'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <span className={`font-semibold text-sm truncate block ${isThuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                      </div>
                      <div className="shrink-0 text-center">
                        <span className="block text-xs font-bold text-orange-500 uppercase">Afgelast</span>
                        {sportBadge && (
                          <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sportBadge === 'zaal' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>
                            {sportBadge === 'zaal' ? 'ZAAL' : 'VELD'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`font-semibold text-sm truncate block ${!isThuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                      </div>
                      {teamcode && (
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      )}
                    </div>
                    {w.accommodatie && (
                      <div className="flex gap-3 -mt-2">
                        <div className="shrink-0 w-14" />
                        <p className="flex-1 text-xs text-gray-400 text-center">{w.accommodatie}</p>
                      </div>
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
