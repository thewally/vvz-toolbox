import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTeams } from '../services/wedstrijden'

export default function WedstrijdenTeamsPage() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadTeams()
  }, [])

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

  // Dedupliceer op teamcode (één entry per team), filter op regulier
  const uniek = new Map()
  for (const t of teams) {
    if (!uniek.has(t.teamcode)) uniek.set(t.teamcode, t)
  }
  const uniekeTeams = [...uniek.values()]

  // Groepeer op speeldag
  const perSpeeldag = new Map()
  for (const t of uniekeTeams) {
    const dag = t.speeldag || 'Overig'
    if (!perSpeeldag.has(dag)) perSpeeldag.set(dag, [])
    perSpeeldag.get(dag).push(t)
  }

  // Vaste volgorde: Zondag, Zaterdag, rest
  const volgorde = ['Zondag', 'Zaterdag']
  const gesorteerd = [
    ...volgorde.filter(d => perSpeeldag.has(d)).map(d => [d, perSpeeldag.get(d)]),
    ...[...perSpeeldag.entries()].filter(([d]) => !volgorde.includes(d)),
  ]

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-8">
      {gesorteerd.map(([speeldag, teamLijst]) => (
        <div key={speeldag}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">{speeldag}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {teamLijst.map(team => (
              <Link
                key={team.teamcode}
                to={`/wedstrijden/teams/${team.teamcode}`}
                className="flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-vvz-green/30 transition-all text-center"
              >
                <span className="font-semibold text-gray-800">{team.teamnaam}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
