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
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm rounded-lg ${viewMode === 'table' ? 'bg-vvz-green text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Tabel
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm rounded-lg ${viewMode === 'list' ? 'bg-vvz-green text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Lijst
              </button>
            </div>
            <span className="text-sm text-gray-500">{matches.length} wedstrijd{matches.length !== 1 ? 'en' : ''}</span>
          </div>

          {viewMode === 'table' ? (
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
                        return (
                          <td key={f.id} className="px-3 py-2">
                            <div className="text-xs text-gray-500">{m.pool?.name}</div>
                            <div className="font-medium">
                              {m.home_team?.name} <span className="text-gray-400">vs</span> {m.away_team?.name}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Tijd</th>
                    <th className="px-3 py-2 text-left">Veld</th>
                    <th className="px-3 py-2 text-left">Poule</th>
                    <th className="px-3 py-2 text-left">Wedstrijd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matches.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-700">{(m.start_time || '').slice(0, 5)}</td>
                      <td className="px-3 py-2 text-gray-600">{m.field?.name}</td>
                      <td className="px-3 py-2 text-gray-600">{m.pool?.name}</td>
                      <td className="px-3 py-2">
                        <strong>{m.home_team?.name}</strong> <span className="text-gray-400">vs</span> <strong>{m.away_team?.name}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
