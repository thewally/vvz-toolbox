import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchTournamentBySlug } from '../services/tournaments'
import { fetchMatches } from '../services/tournamentMatches'
import { fetchFields } from '../services/tournamentFields'
import { calculateSlots } from '../services/tournamentSchedule'

const DUTCH_MONTHS_LONG = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

const DUTCH_DAYS_LONG = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]

function formatDateLong(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return `${DUTCH_DAYS_LONG[d.getDay()]} ${d.getDate()} ${DUTCH_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

function computeStandings(matches) {
  const teamData = {}

  function initTeam(id, teamObj, poolId, poolObj) {
    if (!teamData[id]) {
      teamData[id] = {
        name: teamObj?.name ?? id,
        poolId,
        poolName: poolObj?.name ?? '',
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0,
      }
    }
  }

  for (const m of matches) {
    initTeam(m.home_team_id, m.home_team, m.pool_id, m.pool)
    initTeam(m.away_team_id, m.away_team, m.pool_id, m.pool)

    if (m.result?.home_score == null || m.result?.away_score == null) continue
    const hs = Number(m.result.home_score)
    const as = Number(m.result.away_score)
    const home = teamData[m.home_team_id]
    const away = teamData[m.away_team_id]
    home.played++; away.played++
    home.gf += hs; home.ga += as
    away.gf += as; away.ga += hs
    if (hs > as) { home.won++; away.lost++ }
    else if (hs < as) { home.lost++; away.won++ }
    else { home.drawn++; away.drawn++ }
  }

  const byPool = {}
  for (const [teamId, d] of Object.entries(teamData)) {
    if (!byPool[d.poolId]) byPool[d.poolId] = { poolName: d.poolName, rows: [] }
    byPool[d.poolId].rows.push({
      teamId, name: d.name,
      played: d.played, won: d.won, drawn: d.drawn, lost: d.lost,
      gf: d.gf, ga: d.ga, gd: d.gf - d.ga,
      pts: d.won * 3 + d.drawn,
    })
  }

  for (const pool of Object.values(byPool)) {
    pool.rows.sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name)
    )
  }

  return Object.values(byPool).sort((a, b) => a.poolName.localeCompare(b.poolName))
}

export default function ToernooiDetailPage() {
  const { slug } = useParams()
  const [tournament, setTournament] = useState(null)
  const [fields, setFields] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('table')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: t, error: tErr } = await fetchTournamentBySlug(slug)
      if (tErr) {
        setError(tErr.message)
        setLoading(false)
        return
      }
      if (!t || !t.is_published) {
        setError('Toernooi niet gevonden.')
        setLoading(false)
        return
      }
      setTournament(t)

      const [{ data: fData }, { data: mData }] = await Promise.all([
        fetchFields(t.id),
        fetchMatches(t.id),
      ])
      setFields(fData ?? [])
      setMatches(mData ?? [])
      setLoading(false)
    }
    load()
  }, [slug])

  const slotTimes = useMemo(() => {
    if (!tournament) return []
    return calculateSlots({
      startTime: (tournament.start_time || '09:00').slice(0, 5),
      endTime: (tournament.end_time || '17:00').slice(0, 5),
      matchDurationMinutes: tournament.match_duration_minutes,
      slotGapMinutes: tournament.slot_gap_minutes || 0,
      breakStartTime: tournament.break_start_time || null,
      breakDurationMinutes: tournament.break_duration_minutes || 0,
    })
  }, [tournament])

  const sortedFields = useMemo(() =>
    [...fields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  [fields])

  const matchByCell = useMemo(() => {
    const map = {}
    for (const m of matches) {
      const slot = (m.start_time || '').slice(0, 5)
      map[`${slot}|${m.field_id}`] = m
    }
    return map
  }, [matches])

  const standings = useMemo(() => computeStandings(matches), [matches])

  const fieldSortOrder = useMemo(() => {
    const map = {}
    fields.forEach(f => { map[f.id] = f.sort_order ?? 0 })
    return map
  }, [fields])

  const sortedMatches = useMemo(() =>
    [...matches].sort((a, b) => {
      const timeDiff = (a.start_time || '').localeCompare(b.start_time || '')
      if (timeDiff !== 0) return timeDiff
      return (fieldSortOrder[a.field_id] ?? 0) - (fieldSortOrder[b.field_id] ?? 0)
    }),
  [matches, fieldSortOrder])

  const hasAnyResult = useMemo(() =>
    matches.some(m => m.result?.home_score != null),
  [matches])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-6">
        <Link to="/toernooien" className="text-sm text-vvz-green hover:underline">
          &#8249; Terug naar toernooien
        </Link>
        <p className="mt-4 text-red-700">{error || 'Toernooi niet gevonden.'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pt-6">
      <Link to="/toernooien" className="text-sm text-vvz-green hover:underline">
        &#8249; Terug naar toernooien
      </Link>

      <h1 className="text-2xl font-bold text-gray-800 mt-2 mb-1">{tournament.name}</h1>
      <p className="text-sm text-gray-500 mb-4 capitalize">{formatDateLong(tournament.date)}</p>

      {tournament.description && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <p className="text-sm text-gray-700 whitespace-pre-line">{tournament.description}</p>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-sm text-gray-600">
          Het schema is nog niet beschikbaar.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              <button type="button" onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm rounded-lg ${viewMode === 'table' ? 'bg-vvz-green text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Programma
              </button>
              <button type="button" onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm rounded-lg ${viewMode === 'list' ? 'bg-vvz-green text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Uitslagen
              </button>
              {hasAnyResult && (
                <button type="button" onClick={() => setViewMode('standings')}
                  className={`px-3 py-1.5 text-sm rounded-lg ${viewMode === 'standings' ? 'bg-vvz-green text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  Standen
                </button>
              )}
            </div>
            <span className="text-sm text-gray-500">{matches.length} wedstrijd{matches.length !== 1 ? 'en' : ''}</span>
          </div>

          {viewMode === 'table' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">Tijd</th>
                    {sortedFields.map(f => (
                      <th key={f.id} className="px-3 py-2 text-left">{f.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {slotTimes.map(slot => (
                    <tr key={slot}>
                      <td className="px-3 py-2 font-medium text-gray-700 sticky left-0 bg-white">{slot}</td>
                      {sortedFields.map(f => {
                        const m = matchByCell[`${slot}|${f.id}`]
                        if (!m) return <td key={f.id} className="px-3 py-2 text-gray-300">—</td>
                        const hasResult = m.result?.home_score != null && m.result?.away_score != null
                        return (
                          <td key={f.id} className="px-3 py-2">
                            <div className="text-xs text-gray-500">{m.pool?.name}</div>
                            <div className="font-medium text-sm">
                              {m.home_team?.name} <span className="text-gray-400">vs</span> {m.away_team?.name}
                            </div>
                            {hasResult && (
                              <div className="text-sm font-bold text-vvz-green mt-0.5">
                                {m.result.home_score} – {m.result.away_score}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Tijd</th>
                    <th className="px-3 py-2 text-left">Veld</th>
                    <th className="px-3 py-2 text-left">Poule</th>
                    <th className="px-3 py-2 text-left">Wedstrijd</th>
                    <th className="px-3 py-2 text-left">Uitslag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedMatches.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-700">{(m.start_time || '').slice(0, 5)}</td>
                      <td className="px-3 py-2 text-gray-600">{m.field?.name}</td>
                      <td className="px-3 py-2 text-gray-600">{m.pool?.name}</td>
                      <td className="px-3 py-2">
                        <strong>{m.home_team?.name}</strong> <span className="text-gray-400">vs</span> <strong>{m.away_team?.name}</strong>
                      </td>
                      <td className="px-3 py-2">
                        {m.result?.home_score != null
                          ? <span className="font-bold text-vvz-green">{m.result.home_score} – {m.result.away_score}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'standings' && (
            <div className="space-y-6">
              {standings.map(pool => (
                <div key={pool.poolName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-800">{pool.poolName}</h2>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Team</th>
                          <th className="px-3 py-2 text-center w-10">G</th>
                          <th className="px-3 py-2 text-center w-10">W</th>
                          <th className="px-3 py-2 text-center w-10">G</th>
                          <th className="px-3 py-2 text-center w-10">V</th>
                          <th className="px-3 py-2 text-center w-12">+/-</th>
                          <th className="px-3 py-2 text-center w-12 font-bold text-gray-700">Pnt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pool.rows.map((row, i) => (
                          <tr key={row.teamId} className={i === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-2.5 font-medium text-gray-800">
                              <span className="text-gray-400 mr-2 tabular-nums">{i + 1}.</span>
                              {row.name}
                            </td>
                            <td className="px-3 py-2.5 text-center text-gray-600 tabular-nums">{row.played}</td>
                            <td className="px-3 py-2.5 text-center text-gray-600 tabular-nums">{row.won}</td>
                            <td className="px-3 py-2.5 text-center text-gray-600 tabular-nums">{row.drawn}</td>
                            <td className="px-3 py-2.5 text-center text-gray-600 tabular-nums">{row.lost}</td>
                            <td className="px-3 py-2.5 text-center text-gray-600 tabular-nums">
                              {row.gd > 0 ? `+${row.gd}` : row.gd}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-gray-800 tabular-nums">{row.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                    G = gespeeld · W = gewonnen · G = gelijk · V = verloren · +/- = doelsaldo · Pnt = punten (3-1-0)
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
