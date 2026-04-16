import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicMatchReports } from '../services/matchReports'
import { getTeams } from '../services/wedstrijden'

const SPEELDAG_VELD = ['Zaterdag', 'Zondag']

function buildSportLookup(teams) {
  const map = new Map()
  for (const t of teams) {
    if (!t.teamcode) continue
    const isZaal = !((t.teamnaam || '').toLowerCase().includes('o23')) && !SPEELDAG_VELD.includes(t.speeldag || '')
    map.set(String(t.teamcode), isZaal ? 'Zaal' : 'Veld')
  }
  return map
}

/**
 * Strip HTML-tags en geef een korte tekst-preview terug.
 */
function previewFromHtml(html, maxLen = 150) {
  if (!html) return ''
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…'
}

function formatDatum(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function WedstrijdenVerslagenPage() {
  const [items, setItems] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterTeam, setFilterTeam] = useState('alles')

  const sportLookup = useMemo(() => buildSportLookup(teams), [teams])

  // Unieke teams die verslagen hebben, gesorteerd op naam
  const teamOpties = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      if (item.team_id && item.team_name && !map.has(String(item.team_id))) {
        map.set(String(item.team_id), item.team_name)
      }
    }
    return [...map.entries()]
      .map(([id, naam]) => ({ id, naam, sport: sportLookup.get(id) }))
      .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
  }, [items, sportLookup])

  const gefilterd = useMemo(() =>
    filterTeam === 'alles' ? items : items.filter(i => String(i.team_id) === filterTeam),
    [items, filterTeam]
  )

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const [{ data, error }, teamsRes] = await Promise.all([fetchPublicMatchReports(), getTeams()])
    if (error) setError(error.message)
    else setItems(data ?? [])
    if (teamsRes.data) setTeams(teamsRes.data)
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
          Kon verslagen niet laden: {error}
          <button onClick={load} className="ml-3 underline font-medium">Opnieuw proberen</button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Wedstrijdverslagen</h1>
        <p className="text-gray-500 text-sm">Er zijn nog geen wedstrijdverslagen gepubliceerd.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Wedstrijdverslagen</h1>
        {teamOpties.length > 1 && (
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vvz-green"
          >
            <option value="alles">Alle teams</option>
            {teamOpties.map(t => (
              <option key={t.id} value={t.id}>
                {t.naam}{t.sport ? ` (${t.sport})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {gefilterd.length === 0 ? (
        <p className="text-gray-500 text-sm">Geen verslagen gevonden voor dit team.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {gefilterd.map(item => {
            const sport = sportLookup.get(String(item.team_id))
            return (
              <Link
                key={item.id}
                to={`/wedstrijden/verslagen/${item.slug}`}
                className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 hover:shadow-md transition-shadow block"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {item.team_name && (
                    <span className="inline-flex items-center bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {item.team_name}
                    </span>
                  )}
                  {sport && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sport === 'Zaal' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>
                      {sport}
                    </span>
                  )}
                  {item.published_at && (
                    <span className="text-xs text-gray-400">{formatDatum(item.published_at)}</span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">{item.title}</h2>
                <p className="text-sm text-gray-500">{previewFromHtml(item.content)}</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
