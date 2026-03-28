import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTeams } from '../services/wedstrijden'

const SPEELDAG_VOLGORDE = ['Zondag', 'Zaterdag']

function isZaalteam(team) {
  const naam = (team.teamnaam || '').toLowerCase()
  const cat = (team.leeftijdscategorie || '').toLowerCase()
  const speeldag = team.speeldag || ''
  const isVeteraan = naam.includes('veteran') || naam.includes('vet.') || naam.includes('35+') || naam.includes('45+') || naam.includes('30+') || cat.includes('veteran')
  const isJeugd = /[jm]o\s*\d+/i.test(naam) || cat.includes('pupil') || cat.includes('junior')
  const isO23 = naam.includes('o23')
  const isRegulier = SPEELDAG_VOLGORDE.includes(speeldag)
  return !isVeteraan && !isJeugd && !isO23 && !isRegulier
}

function getSorteerSleutel(team) {
  const naam = team.teamnaam || ''
  const numMatch = naam.match(/(\d+)\s*$/)
  if (numMatch) return parseInt(numMatch[1], 10)
  return 0
}

export default function WedstrijdenTeamsZaalPage() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadTeams() }, [])

  async function loadTeams() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await getTeams()
    if (err) {
      setError(err.message)
    } else {
      setTeams(data ?? [])
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
          Kon teams niet laden: {error}
          <button onClick={loadTeams} className="ml-3 underline font-medium">Opnieuw proberen</button>
        </div>
      </div>
    )
  }

  const uniek = new Map()
  for (const t of teams) {
    if (!uniek.has(t.teamcode)) uniek.set(t.teamcode, t)
  }
  const zaalteams = [...uniek.values()]
    .filter(t => isZaalteam(t) && !(t.teamnaam || '').toLowerCase().includes('champions league'))
    .sort((a, b) => getSorteerSleutel(a) - getSorteerSleutel(b))

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-8">
      <h2 className="text-lg font-bold text-gray-800">Zaalvoetbal</h2>
      {zaalteams.length === 0 && (
        <p className="text-gray-500 text-center py-8">Geen zaalteams gevonden.</p>
      )}
      {zaalteams.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {zaalteams.map(team => (
            <Link
              key={team.teamcode}
              to={`/teams/${team.teamcode}`}
              className="flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-vvz-green/30 transition-all text-center"
            >
              <span className="font-semibold text-gray-800">{team.teamnaam}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
