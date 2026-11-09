import { useLocation } from 'react-router-dom'
import useTeamlijst from '../lib/useTeamlijst'
import TeamGrid from '../components/TeamGrid'
import { TeamsSkeleton } from '../components/TeamKaartSkeleton'
import { teamVolgnummer } from '../services/wedstrijdenHelpers'

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

  // SportLink levert leeftijdscategorie als "Onder N" (bv. "Onder 13"); O23 krijgt hier "Senioren".
  const onderMatch = cat.match(/onder\s*(\d+)/)
  if (onderMatch) {
    const leeftijd = parseInt(onderMatch[1], 10)
    return leeftijd <= 12 ? 'pupillen' : 'junioren'
  }

  if (cat.includes('pupil')) return 'pupillen'
  if (cat.includes('junior')) return 'junioren'

  // Terugval op teamnaam als leeftijdscategorie ontbreekt (bv. "JO13"/"MO13" of kale "O13")
  if (!naam.includes('o23')) {
    const joMatch = naam.match(/[jm]?o\s*(\d+)/)
    if (joMatch) {
      const leeftijd = parseInt(joMatch[1], 10)
      return leeftijd <= 12 ? 'pupillen' : 'junioren'
    }
  }

  return 'senioren'
}

function getSorteerSleutel(team) {
  const naam = team.teamnaam || ''
  const cat = team.leeftijdscategorie || ''
  // Leeftijdscategorie "Onder N" is de betrouwbaarste bron (zie getCategorie hierboven)
  const onderMatch = cat.match(/onder\s*(\d+)/i)
  if (onderMatch) return parseInt(onderMatch[1], 10)
  // Terugval op teamnaam, met en zonder j/m-genderprefix (bv. "JO13" of kale "O13")
  const match = naam.match(/[jm]?o\s*(\d+)/i)
  if (match) return parseInt(match[1], 10)
  const numMatch = naam.match(/(\d+)\s*$/)
  if (numMatch) return parseInt(numMatch[1], 10)
  return 0
}

const SPEELDAG_VOLGORDE = ['Zondag', 'Zaterdag']

const isO23 = t => (t.teamnaam || '').toLowerCase().includes('o23')
const isRegulier = t => SPEELDAG_VOLGORDE.includes(t.speeldag)

function sorteerTeams(teams) {
  return [...teams].sort((a, b) => {
    const aO23 = isO23(a), bO23 = isO23(b)
    if (aO23 !== bO23) return aO23 ? 1 : -1
    return getSorteerSleutel(a) - getSorteerSleutel(b) || teamVolgnummer(a) - teamVolgnummer(b)
  })
}

export default function WedstrijdenTeamsCatPage() {
  const { pathname } = useLocation()
  const categorie = pathname.split('/').at(-1)
  const { teams, loading, error, opnieuw: loadTeams } = useTeamlijst()
  const label = CAT_LABELS[categorie] ?? categorie

  if (loading) return <TeamsSkeleton titel={label} />

  if (error && teams.length === 0) {
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
  const gefilterd = [...uniek.values()].filter(t => getCategorie(t) === categorie && !(t.teamnaam || '').toLowerCase().includes('champions league'))


  // Groepeer per speeldag (alleen reguliere senioren; zaal heeft eigen pagina)
  const regulier = categorie === 'senioren' ? gefilterd.filter(t => isRegulier(t) && !isO23(t)) : gefilterd
  const o23Teams = categorie === 'senioren' ? gefilterd.filter(t => isO23(t)) : []

  const dagMap = new Map()
  for (const t of regulier) {
    const dag = t.speeldag || 'Overig'
    if (!dagMap.has(dag)) dagMap.set(dag, [])
    dagMap.get(dag).push(t)
  }

  const speeldagen = [
    ...SPEELDAG_VOLGORDE.filter(d => dagMap.has(d)).map(d => [d, dagMap.get(d)]),
    ...[...dagMap.entries()].filter(([d]) => !SPEELDAG_VOLGORDE.includes(d)),
  ]

  // Per speeldag-blok de gesorteerde teams; de eerste kaarten van de pagina krijgen foto-prioriteit.
  const blokken = speeldagen.map(([speeldag, teamLijst]) => [
    speeldag,
    sorteerTeams([...teamLijst, ...(speeldag === speeldagen.at(-1)?.[0] ? o23Teams : [])]),
  ])
  let teller = 0
  const blokkenMetStart = blokken.map(([speeldag, lijst]) => {
    const start = teller
    teller += lijst.length
    return [speeldag, lijst, start]
  })

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-8">
      <h2 className="text-lg font-bold text-gray-800">{label}</h2>
      {gefilterd.length === 0 && (
        <p className="text-gray-500 text-center py-8">Geen teams gevonden.</p>
      )}
      {blokkenMetStart.map(([speeldag, lijst, start]) => (
        <div key={speeldag}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{speeldag}</h3>
          <TeamGrid teams={lijst} eersteIndex={start} />
        </div>
      ))}
    </div>
  )
}
