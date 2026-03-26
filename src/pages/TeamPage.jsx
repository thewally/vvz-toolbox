import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTeamBySlug } from '../lib/teamConfig'
import { getTeamProgramma, getTeamUitslagen } from '../services/wedstrijden'
import { groepeerPerDag, parseDutchDate } from '../services/wedstrijdenHelpers'

const DUTCH_DAYS_LONG = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]
const DUTCH_MONTHS_LONG = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function formatDagLabel(datumStr) {
  const d = parseDutchDate(datumStr)
  return `${DUTCH_DAYS_LONG[d.getDay()]} ${d.getDate()} ${DUTCH_MONTHS_LONG[d.getMonth()]}`
}

export default function TeamPage() {
  const { slug } = useParams()
  const team = getTeamBySlug(slug)
  const [programma, setProgramma] = useState([])
  const [uitslagen, setUitslagen] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (team) load()
  }, [slug])

  async function load() {
    setLoading(true)
    setError(null)
    const [progRes, uitRes] = await Promise.all([
      getTeamProgramma(team.teamcode),
      getTeamUitslagen(team.teamcode),
    ])
    if (progRes.error || uitRes.error) {
      setError((progRes.error || uitRes.error).message)
    } else {
      setProgramma(progRes.data ?? [])
      setUitslagen(uitRes.data ?? [])
    }
    setLoading(false)
  }

  if (!team) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-8 text-center">
        <p className="text-gray-500">Team niet gevonden.</p>
        <Link to="/wedstrijden/teams" className="text-vvz-green underline mt-2 inline-block">Terug naar teams</Link>
      </div>
    )
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
          Kon gegevens niet laden: {error}
          <button onClick={load} className="ml-3 underline font-medium">Opnieuw proberen</button>
        </div>
      </div>
    )
  }

  const programmaPerDag = groepeerPerDag(programma)
  const uitslagenPerDag = groepeerPerDag(uitslagen)

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to="/wedstrijden/teams" className="text-sm text-vvz-green hover:underline">&larr; Alle teams</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">{team.naam}</h1>

      {/* Programma */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Programma</h2>
        {programma.length === 0 ? (
          <p className="text-gray-500 text-sm">Geen komende wedstrijden.</p>
        ) : (
          [...programmaPerDag.entries()].map(([datum, items]) => (
            <div key={datum} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 capitalize mb-2 border-b border-gray-100 pb-1">
                {formatDagLabel(datum)}
              </h3>
              <div className="flex flex-col gap-2">
                {items.map((w, i) => (
                  <div key={i} className="flex bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-center w-16 shrink-0 bg-vvz-green text-white px-2 py-2">
                      <span className="text-sm font-bold">{w.aanvangstijd || '--:--'}</span>
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">
                        {w.thuisteam} <span className="text-gray-400">vs</span> {w.uitteam}
                      </p>
                      {w.competitienaam && <p className="text-xs text-gray-500 mt-0.5">{w.competitienaam}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Uitslagen */}
      <section>
        <h2 className="text-lg font-bold text-gray-700 mb-4">Uitslagen</h2>
        {uitslagen.length === 0 ? (
          <p className="text-gray-500 text-sm">Geen recente uitslagen.</p>
        ) : (
          [...uitslagenPerDag.entries()].map(([datum, items]) => (
            <div key={datum} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 capitalize mb-2 border-b border-gray-100 pb-1">
                {formatDagLabel(datum)}
              </h3>
              <div className="flex flex-col gap-2">
                {items.map((w, i) => (
                  <div key={i} className="flex bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-center w-16 shrink-0 bg-vvz-green text-white px-2 py-2">
                      <span className="text-sm font-bold">{w.thuisscore ?? '-'} - {w.uitscore ?? '-'}</span>
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">
                        {w.thuisteam} <span className="text-gray-400">vs</span> {w.uitteam}
                      </p>
                      {w.competitienaam && <p className="text-xs text-gray-500 mt-0.5">{w.competitienaam}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
