import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTeamBySlug, getProgramma, getProgrammaByTeam, getUitslagen, getUitslagenByTeam, getPoulestand, getStaf } from '../services/wedstrijden'
import WedstrijdUitgelicht from '../components/WedstrijdUitgelicht'
import StandTabel from '../components/StandTabel'
import WedstrijdCard from '../components/WedstrijdCard'
import UitslagRij from '../components/UitslagRij'
import TeamTrainingstijden from '../components/TeamTrainingstijden'
import StafKader from '../components/StafKader'

export default function TeamPage() {
  const { teamSlug } = useParams()
  const [team, setTeam] = useState(null)
  const [programma, setProgramma] = useState([])
  const [uitslagen, setUitslagen] = useState([])
  const [stand, setStand] = useState([])
  const [staf, setStaf] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function laden() {
      setLoading(true)
      setError(null)

      const { data: teamData, error: teamErr } = await getTeamBySlug(teamSlug)
      if (teamErr || !teamData) {
        setError('Team niet gevonden')
        setLoading(false)
        return
      }

      setTeam(teamData)

      // Als teamcode bekend is: directe API-call per team
      // Anders: haal alles op en filter op teamnaam (Sportlink-namen kunnen afwijken)
      const programmaPromise = teamData.teamcode
        ? getProgrammaByTeam(teamData.teamcode)
        : getProgramma().then(({ data, error }) => ({
            data: data?.filter(w =>
              w.thuisteam?.toLowerCase().includes(teamData.sportlinkNaam?.toLowerCase()) ||
              w.uitteam?.toLowerCase().includes(teamData.sportlinkNaam?.toLowerCase())
            ) ?? [],
            error,
          }))

      const uitslagenPromise = teamData.teamcode
        ? getUitslagenByTeam(teamData.teamcode)
        : getUitslagen().then(({ data, error }) => ({
            data: data?.filter(u =>
              u.thuisteam?.toLowerCase().includes(teamData.sportlinkNaam?.toLowerCase()) ||
              u.uitteam?.toLowerCase().includes(teamData.sportlinkNaam?.toLowerCase())
            ) ?? [],
            error,
          }))

      const results = await Promise.allSettled([
        programmaPromise,
        uitslagenPromise,
        teamData.poulecode
          ? getPoulestand(teamData.poulecode)
          : Promise.resolve({ data: [] }),
        getStaf(teamSlug),
      ])

      if (results[0].status === 'fulfilled' && results[0].value.data) {
        setProgramma(results[0].value.data)
      }
      if (results[1].status === 'fulfilled' && results[1].value.data) {
        setUitslagen(results[1].value.data)
      }
      if (results[2].status === 'fulfilled' && results[2].value.data) {
        setStand(results[2].value.data)
      }
      if (results[3].status === 'fulfilled' && results[3].value.data) {
        setStaf(results[3].value.data)
      }

      setLoading(false)
    }
    laden()
  }, [teamSlug])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
          <Link to="/wedstrijden" className="mt-2 inline-block text-sm font-medium text-red-600 hover:text-red-800 underline">
            Terug naar wedstrijden
          </Link>
        </div>
      </div>
    )
  }

  // Eerstvolgende wedstrijd = eerste met datum in de toekomst
  const nu = new Date()
  const eersteVolgende = programma.find(w => new Date(w.wedstrijddatum) >= nu)

  // Toekomstige wedstrijden (exclusief eerstvolgende)
  const komendProgramma = programma.filter(
    w => new Date(w.wedstrijddatum) >= nu && w !== eersteVolgende
  )

  // Recente uitslagen (laatste 5)
  const recenteUitslagen = [...uitslagen].reverse().slice(0, 5)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/wedstrijden" className="text-sm text-vvz-green hover:underline mb-4 inline-block">
        &larr; Terug naar wedstrijden
      </Link>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">{team.weergaveNaam}</h2>

      {/* Eerstvolgende wedstrijd */}
      <WedstrijdUitgelicht wedstrijd={eersteVolgende} teamSlug={teamSlug} />

      {/* Competitiestand */}
      {stand.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Competitiestand</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <StandTabel stand={stand} />
          </div>
        </section>
      )}

      {/* Programma */}
      {komendProgramma.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Programma</h3>
          <div className="space-y-3">
            {komendProgramma.map((w, i) => (
              <WedstrijdCard key={i} wedstrijd={w} />
            ))}
          </div>
        </section>
      )}

      {/* Uitslagen */}
      {recenteUitslagen.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Uitslagen</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            {recenteUitslagen.map((u, i) => (
              <UitslagRij key={i} uitslag={u} />
            ))}
          </div>
        </section>
      )}

      {/* Trainingstijden */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Trainingstijden</h3>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <TeamTrainingstijden teamSlug={teamSlug} />
        </div>
      </section>

      {/* Staf */}
      {staf.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Staf</h3>
          <StafKader staf={staf} />
        </section>
      )}
    </div>
  )
}
