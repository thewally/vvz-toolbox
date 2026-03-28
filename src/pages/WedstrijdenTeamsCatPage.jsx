import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getTeams } from '../services/wedstrijden'

const CAT_LABELS = {
  senioren: 'Senioren',
  veteranen: 'Veteranen',
  junioren: 'Junioren',
  pupillen: 'Pupillen',
}

function getCategorie(team) {
  const naam = (team.teamnaam || '').toLowerCase()
  const cat = (team.leeftijdscategorie || '').toLowerCase()

  if (naam.includes('veteran') || naam.includes('vet.') || naam.includes('35+') || naam.includes('45+') || naam.includes('30+') || cat.includes('veteran')) return 'veteranen'

  const joMatch = naam.match(/[jm]o\s*(\d+)/)
  if (joMatch) {
    const leeftijd = parseInt(joMatch[1], 10)
    return leeftijd <= 12 ? 'pupillen' : 'junioren'
  }

  if (cat.includes('pupil')) return 'pupillen'
  if (cat.includes('junior')) return 'junioren'

  return 'senioren'
}

function getSorteerSleutel(team) {
  const naam = team.teamnaam || ''
  const match = naam.match(/[jm]o\s*(\d+)/i)
  if (match) return parseInt(match[1], 10)
  const numMatch = naam.match(/(\d+)\s*$/)
  if (numMatch) return parseInt(numMatch[1], 10)
  return 0
}

const SPEELDAG_VOLGORDE = ['Zondag', 'Zaterdag']

export default function WedstrijdenTeamsCatPage() {
  const { pathname } = useLocation()
  const categorie = pathname.split('/').at(-1)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadTeams()
  }, [categorie])

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

  // Dedupliceer op teamcode en filter op categorie
  const uniek = new Map()
  for (const t of teams) {
    if (!uniek.has(t.teamcode)) uniek.set(t.teamcode, t)
  }
  const gefilterd = [...uniek.values()].filter(t => getCategorie(t) === categorie)

  // Groepeer per speeldag
  const dagMap = new Map()
  for (const t of gefilterd) {
    const dag = t.speeldag || 'Overig'
    if (!dagMap.has(dag)) dagMap.set(dag, [])
    dagMap.get(dag).push(t)
  }

  const speeldagen = [
    ...SPEELDAG_VOLGORDE.filter(d => dagMap.has(d)).map(d => [d, dagMap.get(d)]),
    ...[...dagMap.entries()].filter(([d]) => !SPEELDAG_VOLGORDE.includes(d)),
  ]

  const label = CAT_LABELS[categorie] ?? categorie

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-8">
      <h2 className="text-lg font-bold text-gray-800">{label}</h2>
      {gefilterd.length === 0 && (
        <p className="text-gray-500 text-center py-8">Geen teams gevonden.</p>
      )}
      {speeldagen.map(([speeldag, teamLijst]) => {
        const gesorteerd = [...teamLijst].sort((a, b) => getSorteerSleutel(a) - getSorteerSleutel(b))
        return (
          <div key={speeldag}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{speeldag}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gesorteerd.map(team => (
                <Link
                  key={team.teamcode}
                  to={`/teams/${team.teamcode}`}
                  className="flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-vvz-green/30 transition-all text-center"
                >
                  <span className="font-semibold text-gray-800">{team.teamnaam}</span>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
