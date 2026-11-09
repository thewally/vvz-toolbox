import useTeamlijst from '../lib/useTeamlijst'
import TeamGrid from '../components/TeamGrid'
import { TeamsSkeleton } from '../components/TeamKaartSkeleton'
import { teamVolgnummer } from '../services/wedstrijdenHelpers'

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

export default function WedstrijdenTeamsZaalPage() {
  const { teams, loading, error, opnieuw: loadTeams } = useTeamlijst()

  if (loading) return <TeamsSkeleton titel="Zaalvoetbal" />

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

  const uniek = new Map()
  for (const t of teams) {
    if (!uniek.has(t.teamcode)) uniek.set(t.teamcode, t)
  }
  const zaalteams = [...uniek.values()]
    .filter(t => isZaalteam(t) && !(t.teamnaam || '').toLowerCase().includes('champions league'))
    .sort((a, b) => teamVolgnummer(a) - teamVolgnummer(b))

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-8">
      <h2 className="text-lg font-bold text-gray-800">Zaalvoetbal</h2>
      {zaalteams.length === 0 && (
        <p className="text-gray-500 text-center py-8">Geen zaalteams gevonden.</p>
      )}
      {zaalteams.length > 0 && <TeamGrid teams={zaalteams} />}
    </div>
  )
}
