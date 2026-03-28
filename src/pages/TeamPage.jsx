import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTeamProgramma, getTeamUitslagen, getTeams, getPoulestand } from '../services/wedstrijden'
import { groepeerPerDag, formatDagLabel, formatDatumKort, datumSleutel, parseWedstrijdDatum } from '../services/wedstrijdenHelpers'

const CLUB_RELATIECODE = import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE

function getTeamCategorie(team) {
  if (!team) return 'senioren'
  const naam = (team.teamnaam || '').toLowerCase()
  const cat = (team.leeftijdscategorie || '').toLowerCase()
  if (naam.includes('veteran') || naam.includes('vet.') || naam.includes('35+') || naam.includes('45+') || naam.includes('30+') || cat.includes('veteran')) return 'veteranen'
  const joMatch = naam.match(/[jm]o\s*(\d+)/)
  if (joMatch) return parseInt(joMatch[1], 10) <= 12 ? 'pupillen' : 'junioren'
  if (cat.includes('pupil')) return 'pupillen'
  if (cat.includes('junior')) return 'junioren'
  return 'senioren'
}
const WEBCAL_BASE = 'webcal://thewally.github.io/vvz-toolbox/wedstrijden/ical'

function isThuis(w) {
  return w.thuisteamclubrelatiecode === CLUB_RELATIECODE
}

function getTegenstander(w) {
  return isThuis(w) ? w.uitteam : w.thuisteam
}

function ThuisUitBadge({ wedstrijd }) {
  const thuis = isThuis(wedstrijd)
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${thuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {thuis ? 'Thuis' : 'Uit'}
    </span>
  )
}

function buildWhatsAppUrl(w, teamnaam) {
  const thuisUit = isThuis(w) ? 'thuis' : 'uit'
  const tekst = [
    `⚽ ${teamnaam} speelt ${thuisUit} tegen ${getTegenstander(w)}`,
    `📅 ${formatDagLabel(w.wedstrijddatum)} om ${w.aanvangstijd || '?'}`,
    w.accommodatie ? `📍 ${w.accommodatie}${w.plaats ? `, ${w.plaats}` : ''}` : null,
    w.verzameltijd ? `🕐 Verzamelen om ${w.verzameltijd}` : null,
  ].filter(Boolean).join('\n')
  return `https://wa.me/?text=${encodeURIComponent(tekst)}`
}

export default function TeamPage() {
  const { teamcode } = useParams()
  const [programma, setProgramma] = useState([])
  const [uitslagen, setUitslagen] = useState([])
  const [teamInfo, setTeamInfo] = useState(null)
  const [stand, setStand] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [teamcode])

  async function load() {
    setLoading(true)
    setError(null)
    const [progRes, uitRes, teamsRes] = await Promise.all([
      getTeamProgramma(teamcode),
      getTeamUitslagen(teamcode),
      getTeams(),
    ])
    if (progRes.error || uitRes.error) {
      setError((progRes.error || uitRes.error).message)
      setLoading(false)
      return
    }
    setProgramma(progRes.data ?? [])
    setUitslagen(uitRes.data ?? [])

    // Zoek team info voor poulecode en teamnaam
    const teams = teamsRes.data ?? []
    const info = teams.find(t => String(t.teamcode) === String(teamcode) && t.competitiesoort === 'regulier')
      || teams.find(t => String(t.teamcode) === String(teamcode))
    setTeamInfo(info || null)

    // Laad poulestand als poulecode bekend is
    if (info?.poulecode) {
      const standRes = await getPoulestand(info.poulecode)
      setStand(standRes.data ?? [])
    }

    setLoading(false)
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
    </div>
  )

  if (error) return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
        Kon gegevens niet laden: {error}
        <button onClick={load} className="ml-3 underline font-medium">Opnieuw proberen</button>
      </div>
    </div>
  )

  // Teamnaam bepalen
  const eigenWedstrijd = [...programma, ...uitslagen].find(w => isThuis(w))
  const teamnaam = teamInfo?.teamnaam
    || eigenWedstrijd?.thuisteam
    || [...programma, ...uitslagen].find(w => !isThuis(w))?.uitteam
    || `Team ${teamcode}`

  // Toekomstige wedstrijden (alles)
  const vandaagSleutel = new Date().toISOString().slice(0, 10)
  const toekomstig = [...programma]
    .filter(w => w.wedstrijddatum && datumSleutel(w.wedstrijddatum) >= vandaagSleutel)
    .sort((a, b) => parseWedstrijdDatum(a.wedstrijddatum) - parseWedstrijdDatum(b.wedstrijddatum))

  const eerstvolgende = toekomstig[0] || null

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to={`/teams/${getTeamCategorie(teamInfo)}`} className="text-sm text-vvz-green hover:underline">&larr; Teams</Link>
      </div>

      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">{teamnaam}</h1>
        <a
          href={`${WEBCAL_BASE}/${teamcode}.ics`}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-vvz-green border border-vvz-green/40 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
          title="Abonneer via Google Calendar / Apple Calendar"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
          </svg>
          Agenda abonneren
        </a>
      </div>

      {/* Uitgelichte wedstrijd */}
      {eerstvolgende && (
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-vvz-green text-white px-5 py-3 flex items-center justify-between">
              <p className="text-sm font-medium capitalize">{formatDagLabel(eerstvolgende.wedstrijddatum)}</p>
              <ThuisUitBadge wedstrijd={eerstvolgende} />
            </div>
            <div className="p-5 flex flex-col items-center text-center">
              {/* Team logos + namen — gecentreerd */}
              <div className="flex items-center justify-center gap-4 mb-2">
                {eerstvolgende.thuisteamlogo
                  ? <img src={eerstvolgende.thuisteamlogo} alt={eerstvolgende.thuisteam} className="w-14 h-14 object-contain" />
                  : <div className="w-14 h-14" />
                }
                <div>
                  <p className="text-xl font-bold text-gray-800 leading-tight">
                    {eerstvolgende.thuisteam}
                    <span className="text-gray-400 font-normal mx-2">vs</span>
                    {eerstvolgende.uitteam}
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{eerstvolgende.aanvangstijd || '--:--'}</p>
                </div>
                {eerstvolgende.uitteamlogo
                  ? <img src={eerstvolgende.uitteamlogo} alt={eerstvolgende.uitteam} className="w-14 h-14 object-contain" />
                  : <div className="w-14 h-14" />
                }
              </div>

              {(eerstvolgende.verzameltijd || eerstvolgende.vertrektijd) && (
                <p className="text-sm text-gray-500 mb-1">
                  {eerstvolgende.verzameltijd && <span>Verzamelen {eerstvolgende.verzameltijd}</span>}
                  {eerstvolgende.verzameltijd && eerstvolgende.vertrektijd && <span> · </span>}
                  {eerstvolgende.vertrektijd && <span>Vertrek {eerstvolgende.vertrektijd}</span>}
                </p>
              )}

              {eerstvolgende.accommodatie && (
                <p className="text-sm text-gray-500 mb-1">
                  📍 {eerstvolgende.accommodatie}{eerstvolgende.plaats ? `, ${eerstvolgende.plaats}` : ''}
                </p>
              )}

              {eerstvolgende.kleedkamerthuisteam && (
                <p className="text-sm text-gray-500 mb-3">Kleedkamer: {eerstvolgende.kleedkamerthuisteam}</p>
              )}

              <a
                href={buildWhatsAppUrl(eerstvolgende, teamnaam)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.696-6.418-1.888l-.448-.291-2.647.887.887-2.647-.291-.448A9.955 9.955 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
                </svg>
                Delen via WhatsApp
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Programma — alle toekomstige wedstrijden */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Programma</h2>
        {toekomstig.length === 0 ? (
          <p className="text-gray-500 text-sm">Geen komende wedstrijden.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {toekomstig.map((w, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  {/* Tijd + badge */}
                  <div className="shrink-0 w-14 text-center">
                    <span className="block text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                    <span className="block mt-1"><ThuisUitBadge wedstrijd={w} /></span>
                  </div>
                  {/* Thuisteam rechts */}
                  <div className="flex-1 min-w-0 text-right">
                    <span className={`font-semibold text-sm truncate block ${isThuis(w) ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                  </div>
                  {/* vs center */}
                  <div className="shrink-0 w-16 text-center">
                    <span className="text-gray-400 text-sm">vs</span>
                  </div>
                  {/* Uitteam links */}
                  <div className="flex-1 min-w-0">
                    <span className={`font-semibold text-sm truncate block ${!isThuis(w) ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                  </div>
                  {/* Datum rechts */}
                  <div className="shrink-0 text-right text-xs text-gray-400 capitalize whitespace-nowrap">
                    {formatDagLabel(w.wedstrijddatum)}
                  </div>
                </div>
                {(w.accommodatie || w.verzameltijd || w.vertrektijd) && (
                  <div className="flex gap-3 -mt-2">
                    <div className="shrink-0 w-14" />
                    <div className="flex-1 text-center">
                      {w.accommodatie && <p className="text-xs text-gray-400">{w.accommodatie}</p>}
                      {(w.verzameltijd || w.vertrektijd) && (
                        <p className="text-xs text-gray-400">
                          {w.verzameltijd ? `Verzamelen ${w.verzameltijd}` : ''}
                          {w.verzameltijd && w.vertrektijd ? ' · ' : ''}
                          {w.vertrektijd ? `Vertrek ${w.vertrektijd}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 whitespace-nowrap invisible text-xs">{formatDagLabel(w.wedstrijddatum)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Uitslagen — alle beschikbare */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Uitslagen</h2>
        {uitslagen.length === 0 ? (
          <p className="text-gray-500 text-sm">Geen recente uitslagen.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...uitslagen]
              .sort((a, b) => parseWedstrijdDatum(b.wedstrijddatum) - parseWedstrijdDatum(a.wedstrijddatum))
              .map((w, i) => {
                const scores = w.uitslag ? w.uitslag.split('-').map(s => s.trim()) : null
                const thuisScore = scores?.[0] ?? '-'
                const uitScore = scores?.[1] ?? '-'
                const thuis = isThuis(w)
                return (
                  <div key={i} className="flex items-center bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 gap-3 hover:shadow-md transition-shadow">
                    <div className="shrink-0 w-14 text-center">
                      <ThuisUitBadge wedstrijd={w} />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <span className={`font-semibold text-sm truncate block ${thuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                    </div>
                    <div className="shrink-0 flex items-center w-16 justify-center gap-0.5">
                      <span className="text-sm font-semibold text-gray-800 tabular-nums">{thuisScore}</span>
                      <span className="text-gray-400 text-sm mx-1">–</span>
                      <span className="text-sm font-semibold text-gray-800 tabular-nums">{uitScore}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-semibold text-sm truncate block ${!thuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                    </div>
                    {/* Datum rechts */}
                    <div className="shrink-0 text-right text-xs text-gray-400 capitalize max-w-[5.5rem] leading-tight">
                      {formatDagLabel(w.wedstrijddatum)}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </section>

      {/* Poulestand */}
      {stand.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Stand</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                  <th className="px-3 py-2 text-left font-medium w-8">#</th>
                  <th className="px-3 py-2 text-left font-medium">Team</th>
                  <th className="px-3 py-2 text-center font-medium w-8">G</th>
                  <th className="px-3 py-2 text-center font-medium w-8">W</th>
                  <th className="px-3 py-2 text-center font-medium w-8">G</th>
                  <th className="px-3 py-2 text-center font-medium w-8">V</th>
                  <th className="px-3 py-2 text-center font-medium w-12">Pnt</th>
                </tr>
              </thead>
              <tbody>
                {stand.map((rij, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${rij.eigenteam === 'true' ? 'bg-green-50 font-semibold' : ''}`}>
                    <td className="px-3 py-2 text-gray-500">{rij.positie}</td>
                    <td className="px-3 py-2 truncate max-w-0">
                      <span className={rij.eigenteam === 'true' ? 'text-vvz-green' : 'text-gray-800'}>{rij.teamnaam}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{rij.gespeeldewedstrijden}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{rij.gewonnen}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{rij.gelijk}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{rij.verloren}</td>
                    <td className="px-3 py-2 text-center font-bold text-gray-800">{rij.punten}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
