import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTeamProgramma, getTeamUitslagen } from '../services/wedstrijden'
import { groepeerPerDag, formatDagLabel, datumSleutel, parseWedstrijdDatum } from '../services/wedstrijdenHelpers'

const CLUB_RELATIECODE = 'FZSZ66G'

function isThuiswedstrijd(w) {
  return w.thuisteamclubrelatiecode === CLUB_RELATIECODE
}

function getTegenstander(w) {
  return isThuiswedstrijd(w) ? w.uitteam : w.thuisteam
}

function buildWhatsAppUrl(w, teamnaam) {
  const thuisUit = isThuiswedstrijd(w) ? 'thuis' : 'uit'
  const tegenstander = getTegenstander(w)
  const dagLabel = formatDagLabel(w.wedstrijddatum)
  const tekst = [
    `\u26BD ${teamnaam} speelt ${thuisUit} tegen ${tegenstander}`,
    `\uD83D\uDCC5 ${dagLabel} om ${w.aanvangstijd || '?'}`,
    w.accommodatie ? `\uD83D\uDCCD ${w.accommodatie}${w.plaats ? `, ${w.plaats}` : ''}` : null,
    w.verzameltijd ? `\uD83D\uDD50 Verzamelen om ${w.verzameltijd}` : null,
  ].filter(Boolean).join('\n')
  return `https://wa.me/?text=${encodeURIComponent(tekst)}`
}

export default function TeamPage() {
  const { teamcode } = useParams()
  const [programma, setProgramma] = useState([])
  const [uitslagen, setUitslagen] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [teamcode])

  async function load() {
    setLoading(true)
    setError(null)
    const [progRes, uitRes] = await Promise.all([
      getTeamProgramma(teamcode),
      getTeamUitslagen(teamcode),
    ])
    if (progRes.error || uitRes.error) {
      setError((progRes.error || uitRes.error).message)
    } else {
      setProgramma(progRes.data ?? [])
      setUitslagen(uitRes.data ?? [])
    }
    setLoading(false)
  }

  // Teamnaam afleiden: zoek wedstrijd waar club thuisteam is
  const eigenWedstrijd = [...programma, ...uitslagen].find(w => isThuiswedstrijd(w))
  const teamnaam = eigenWedstrijd?.thuisteam
    || [...programma, ...uitslagen].find(w => !isThuiswedstrijd(w))?.uitteam
    || `Team ${teamcode}`

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

  // Eerstvolgende wedstrijd bepalen
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const vandaagSleutel = vandaag.toISOString().slice(0, 10)

  const toekomstigeWedstrijden = programma
    .filter(w => w.wedstrijddatum && datumSleutel(w.wedstrijddatum) >= vandaagSleutel)
    .sort((a, b) => parseWedstrijdDatum(a.wedstrijddatum) - parseWedstrijdDatum(b.wedstrijddatum))

  const eerstvolgende = toekomstigeWedstrijden[0] || null
  const eerstvolgendeSleutel = eerstvolgende ? datumSleutel(eerstvolgende.wedstrijddatum) : null

  const programmaPerDag = groepeerPerDag(programma)
  const uitslagenPerDag = groepeerPerDag(uitslagen)

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to="/wedstrijden/teams" className="text-sm text-vvz-green hover:underline">&larr; Alle teams</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">{teamnaam}</h1>

      {/* Eerstvolgende wedstrijd uitgelicht */}
      {eerstvolgende && (
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-vvz-green text-white px-5 py-3">
              <p className="text-sm font-medium capitalize">{formatDagLabel(eerstvolgende.wedstrijddatum)}</p>
            </div>
            <div className="p-5">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-gray-800">{eerstvolgende.aanvangstijd || '--:--'}</span>
                <span className="text-sm text-gray-500">aanvang</span>
              </div>
              {eerstvolgende.verzameltijd && (
                <p className="text-sm text-gray-600 mb-3">Verzamelen om <span className="font-semibold">{eerstvolgende.verzameltijd}</span></p>
              )}
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${isThuiswedstrijd(eerstvolgende) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {isThuiswedstrijd(eerstvolgende) ? 'Thuis' : 'Uit'}
                </span>
                <span className="font-semibold text-gray-800">vs {getTegenstander(eerstvolgende)}</span>
              </div>
              {eerstvolgende.accommodatie && (
                <p className="text-sm text-gray-500 mb-4">{eerstvolgende.accommodatie}{eerstvolgende.plaats ? `, ${eerstvolgende.plaats}` : ''}</p>
              )}
              <a
                href={buildWhatsAppUrl(eerstvolgende, teamnaam)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.696-6.418-1.888l-.448-.291-2.647.887.887-2.647-.291-.448A9.955 9.955 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                Delen via WhatsApp
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Programma */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Programma</h2>
        {programma.length === 0 ? (
          <p className="text-gray-500 text-sm">Geen komende wedstrijden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Datum</th>
                  <th className="pb-2 font-medium">Tijd</th>
                  <th className="pb-2 font-medium">T/U</th>
                  <th className="pb-2 font-medium">Tegenstander</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">Locatie</th>
                </tr>
              </thead>
              <tbody>
                {[...programmaPerDag.entries()].flatMap(([sleutel, items]) =>
                  items.map((w, i) => {
                    const isGemarkeerd = sleutel === eerstvolgendeSleutel
                    return (
                      <tr
                        key={`${sleutel}-${i}`}
                        className={`border-b border-gray-50 ${isGemarkeerd ? 'bg-green-50 font-semibold' : ''}`}
                      >
                        <td className="py-2 pr-3 capitalize whitespace-nowrap">{formatDagLabel(w.wedstrijddatum)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{w.aanvangstijd || '--:--'}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${isThuiswedstrijd(w) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                            {isThuiswedstrijd(w) ? 'T' : 'U'}
                          </span>
                        </td>
                        <td className="py-2 pr-3">{getTegenstander(w)}</td>
                        <td className="py-2 hidden sm:table-cell text-gray-500">{w.accommodatie || ''}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Uitslagen */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Uitslagen</h2>
        {uitslagen.length === 0 ? (
          <p className="text-gray-500 text-sm">Geen recente uitslagen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Datum</th>
                  <th className="pb-2 font-medium">Tegenstander</th>
                  <th className="pb-2 font-medium">Uitslag</th>
                  <th className="pb-2 font-medium">T/U</th>
                </tr>
              </thead>
              <tbody>
                {[...uitslagenPerDag.entries()].flatMap(([sleutel, items]) =>
                  items.map((w, i) => (
                    <tr key={`${sleutel}-${i}`} className="border-b border-gray-50">
                      <td className="py-2 pr-3 capitalize whitespace-nowrap">{formatDagLabel(w.wedstrijddatum)}</td>
                      <td className="py-2 pr-3">{getTegenstander(w)}</td>
                      <td className="py-2 pr-3 font-semibold">{w.uitslag || '-'}</td>
                      <td className="py-2">
                        <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${isThuiswedstrijd(w) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          {isThuiswedstrijd(w) ? 'T' : 'U'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
