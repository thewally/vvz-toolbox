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

  // Dedupliceer op teamcode
  const uniek = new Map()
  for (const t of teams) {
    if (!uniek.has(t.teamcode)) uniek.set(t.teamcode, t)
  }
  const uniekeTeams = [...uniek.values()]

  // Bepaal leeftijdscategorie: gebruik leeftijdscategorie veld, maar detecteer
  // Veteranen en Pupillen via de teamnaam als Sportlink ze als "Senioren" markeert
  function getCategorie(team) {
    const naam = (team.teamnaam || '').toLowerCase()
    const cat = (team.leeftijdscategorie || '').toLowerCase()

    if (naam.includes('veteran') || naam.includes('vet.') || naam.includes('35+') || naam.includes('45+') || naam.includes('30+') || cat.includes('veteran')) return 'Veteranen'

    // JO/MO: splits op leeftijdsgetal — ≤12 = pupillen, ≥13 = junioren
    const joMatch = naam.match(/[jm]o\s*(\d+)/)
    if (joMatch) {
      const leeftijd = parseInt(joMatch[1], 10)
      return leeftijd <= 12 ? 'Pupillen' : 'Junioren'
    }

    if (cat.includes('pupil')) return 'Pupillen'
    if (cat.includes('junior')) return 'Junioren'

    return 'Senioren'
  }

  // Sorteersleutel: extraheer getal uit teamnaam voor JO/MO, anders alfabetisch
  function getSorteerSleutel(team) {
    const naam = team.teamnaam || ''
    const match = naam.match(/[jm]o\s*(\d+)/i)
    if (match) return parseInt(match[1], 10)
    // Senioren: sorteer op trailingcijfer (VVZ 1, VVZ 2...)
    const numMatch = naam.match(/(\d+)\s*$/)
    if (numMatch) return parseInt(numMatch[1], 10)
    return 0
  }

  const categorieVolgorde = ['Senioren', 'Veteranen', 'Junioren', 'Pupillen']
  const speeldagVolgorde = ['Zondag', 'Zaterdag']

  const perCategorie = new Map()
  for (const t of uniekeTeams) {
    const cat = getCategorie(t)
    const dag = t.speeldag || 'Overig'
    if (!perCategorie.has(cat)) perCategorie.set(cat, new Map())
    const dagMap = perCategorie.get(cat)
    if (!dagMap.has(dag)) dagMap.set(dag, [])
    dagMap.get(dag).push(t)
  }

  const categorieën = [
    ...categorieVolgorde.filter(c => perCategorie.has(c)).map(c => [c, perCategorie.get(c)]),
    ...[...perCategorie.entries()].filter(([c]) => !categorieVolgorde.includes(c)),
  ]

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-10">
      {categorieën.map(([categorie, dagMap]) => {
        const speeldagen = [
          ...speeldagVolgorde.filter(d => dagMap.has(d)).map(d => [d, dagMap.get(d)]),
          ...[...dagMap.entries()].filter(([d]) => !speeldagVolgorde.includes(d)),
        ]
        return (
          <div key={categorie}>
            <h2 className="text-base font-bold text-gray-800 mb-4 pb-1 border-b border-gray-200">{categorie}</h2>
            <div className="space-y-5">
              {speeldagen.map(([speeldag, teamLijst]) => {
                const gesorteerd = [...teamLijst].sort((a, b) => getSorteerSleutel(a) - getSorteerSleutel(b))
                return (
                <div key={speeldag}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{speeldag}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gesorteerd.map(team => (
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
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
