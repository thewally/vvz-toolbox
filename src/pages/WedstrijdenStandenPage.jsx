import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTeams, getPoulestand } from '../services/wedstrijden'

const CLUB_RC = import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE

const CATEGORIE_VOLGORDE = ['senioren', 'veteranen', 'zaal', 'junioren', 'pupillen']
const CATEGORIE_LABELS = {
  senioren: 'Senioren',
  veteranen: 'Veteranen',
  zaal: 'Zaal',
  junioren: 'Junioren',
  pupillen: 'Pupillen',
}

function getCategorie(teamnaam) {
  const naam = (teamnaam || '').toLowerCase()
  if (/35\+|45\+|30\+|veteran|vet\./.test(naam)) return 'veteranen'
  const joMatch = naam.match(/[jm]o\s*(\d+)/)
  if (joMatch) return parseInt(joMatch[1], 10) <= 12 ? 'pupillen' : 'junioren'
  return 'senioren'
}

function getTeamCategorie(team) {
  const naam = (team.teamnaam || '').toLowerCase()
  const cat = (team.leeftijdscategorie || '').toLowerCase()
  if (naam.includes('veteran') || naam.includes('vet.') || naam.includes('35+') || naam.includes('45+') || naam.includes('30+') || cat.includes('veteran')) return 'veteranen'
  const joMatch = naam.match(/[jm]o\s*(\d+)/)
  if (joMatch) return parseInt(joMatch[1], 10) <= 12 ? 'pupillen' : 'junioren'
  if (cat.includes('pupil')) return 'pupillen'
  if (cat.includes('junior')) return 'junioren'
  const isO23 = naam.includes('o23')
  const isRegulier = ['Zondag', 'Zaterdag'].includes(team.speeldag || '')
  if (!isO23 && !isRegulier) return 'zaal'
  return 'senioren'
}

// Kies meest recente reguliere poule voor een team (zelfde logica als TeamPage)
function kiesPoule(teamPoules) {
  const regulier = [...teamPoules].reverse().find(t => t.competitiesoort === 'regulier')
  return regulier || teamPoules[teamPoules.length - 1] || null
}

export default function WedstrijdenStandenPage() {
  const [teams, setTeams] = useState([])
  const [standen, setStanden] = useState({}) // poulecode → stand[]
  const [geselecteerd, setGeselecteerd] = useState({}) // teamcode → poulecode
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterCategorie, setFilterCategorie] = useState('alles')
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await getTeams()
    if (error) { setError(error.message); setLoading(false); return }

    const allTeams = data ?? []
    setTeams(allTeams)

    // Groepeer per teamcode
    const perTeamcode = new Map()
    for (const t of allTeams) {
      if (!t.teamcode) continue
      if (!perTeamcode.has(t.teamcode)) perTeamcode.set(t.teamcode, [])
      perTeamcode.get(t.teamcode).push(t)
    }

    // Kies per team de standaard poule en bouw de selectie-map op
    const selectieMap = {}
    const pouleVerzoeken = []
    for (const [teamcode, poules] of perTeamcode) {
      const gekozen = kiesPoule(poules)
      if (gekozen?.poulecode) {
        selectieMap[teamcode] = gekozen.poulecode
        pouleVerzoeken.push(gekozen.poulecode)
      }
    }
    const uniekePoulecodes = [...new Set(pouleVerzoeken)]

    const results = await Promise.all(
      uniekePoulecodes.map(pc => getPoulestand(pc).then(r => ({ pc, data: r.data ?? [] })))
    )
    const standenMap = {}
    for (const { pc, data } of results) standenMap[pc] = data
    setStanden(standenMap)
    setGeselecteerd(selectieMap)
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
        Kon standen niet laden: {error}
        <button onClick={load} className="ml-3 underline font-medium">Opnieuw proberen</button>
      </div>
    </div>
  )

  async function wisselPoule(teamcode, poulecode) {
    setGeselecteerd(prev => ({ ...prev, [teamcode]: poulecode }))
    if (!standen[poulecode]) {
      const { data } = await getPoulestand(poulecode)
      setStanden(prev => ({ ...prev, [poulecode]: data ?? [] }))
    }
  }

  // Groepeer per teamcode
  const perTeamcode = new Map()
  for (const t of teams) {
    if (!t.teamcode) continue
    if (!perTeamcode.has(t.teamcode)) perTeamcode.set(t.teamcode, [])
    perTeamcode.get(t.teamcode).push(t)
  }

  const teamBlokken = []
  for (const [teamcode, poules] of perTeamcode) {
    const poulecode = geselecteerd[teamcode] || kiesPoule(poules)?.poulecode
    if (!poulecode) continue
    const gekozen = poules.find(p => String(p.poulecode) === String(poulecode)) || kiesPoule(poules)
    if (!gekozen) continue
    const stand = standen[poulecode] ?? []
    if (stand.length === 0 && Object.keys(geselecteerd).length > 0) continue
    const categorie = getTeamCategorie(gekozen)
    teamBlokken.push({ teamcode, gekozen, poules, poulecode, stand, categorie })
  }

  // Sorteer: volgorde categorie, dan teamnaam
  const categorieRang = Object.fromEntries(CATEGORIE_VOLGORDE.map((c, i) => [c, i]))
  teamBlokken.sort((a, b) => {
    const rc = (categorieRang[a.categorie] ?? 99) - (categorieRang[b.categorie] ?? 99)
    if (rc !== 0) return rc
    return (a.gekozen.teamnaam || '').localeCompare(b.gekozen.teamnaam || '', 'nl')
  })

  const gefilterd = filterCategorie === 'alles'
    ? teamBlokken
    : teamBlokken.filter(b => b.categorie === filterCategorie)

  // Groepeer per categorie voor sectiescheidingen
  const perCategorie = new Map()
  for (const blok of gefilterd) {
    if (!perCategorie.has(blok.categorie)) perCategorie.set(blok.categorie, [])
    perCategorie.get(blok.categorie).push(blok)
  }

  const actieveFilters = filterCategorie !== 'alles' ? 1 : 0
  const pillClass = (active) => `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${active ? 'bg-vvz-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setFilterOpen(o => !o)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${actieveFilters > 0 ? 'bg-vvz-green text-white border-vvz-green' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
          Filteren
          {actieveFilters > 0 && <span className="bg-white text-vvz-green rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">{actieveFilters}</span>}
        </button>
      </div>

      {filterOpen && (
        <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Teams</p>
          <div className="flex flex-wrap gap-2">
            {[['alles', 'Alle teams'], ...CATEGORIE_VOLGORDE.map(c => [c, CATEGORIE_LABELS[c]])].map(([key, label]) => (
              <button key={key} onClick={() => setFilterCategorie(key)} className={pillClass(filterCategorie === key)}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {gefilterd.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">Geen standen gevonden.</p>
      )}

      {[...perCategorie.entries()].map(([categorie, blokken]) => (
        <div key={categorie} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
              {CATEGORIE_LABELS[categorie]}
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="flex flex-col gap-6">
            {blokken.map(({ teamcode, gekozen, poules, poulecode, stand }) => (
              <div key={teamcode} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <Link to={`/teams/${teamcode}`} className="group flex-1 min-w-0 mr-2">
                    <p className="font-semibold text-gray-800 text-sm group-hover:text-vvz-green transition-colors">
                      {gekozen.teamnaam}
                    </p>
                  </Link>
                  {poules.length > 1 ? (
                    <select
                      value={poulecode}
                      onChange={e => wisselPoule(teamcode, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-vvz-green max-w-[180px] sm:max-w-xs"
                    >
                      {poules.map(p => (
                        <option key={p.poulecode} value={p.poulecode}>
                          {[p.competitienaam, p.klassenaam, p.poulenaam].filter(Boolean).join(' – ')}
                        </option>
                      ))}
                    </select>
                  ) : (gekozen.competitienaam || gekozen.klassenaam || gekozen.poulenaam) ? (
                    <p className="text-xs text-gray-400 truncate max-w-[180px] sm:max-w-xs">
                      {[gekozen.competitienaam, gekozen.klassenaam, gekozen.poulenaam].filter(Boolean).join(' – ')}
                    </p>
                  ) : null}
                  <Link to={`/teams/${teamcode}`} className="ml-2 shrink-0">
                    <svg className="w-4 h-4 text-gray-300 hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="px-3 py-2 text-left font-medium w-8">#</th>
                      <th className="px-3 py-2 text-left font-medium">Team</th>
                      <th className="px-3 py-2 text-center font-medium w-8">G</th>
                      <th className="px-3 py-2 text-center font-medium w-8 hidden sm:table-cell">W</th>
                      <th className="px-3 py-2 text-center font-medium w-8 hidden sm:table-cell">G</th>
                      <th className="px-3 py-2 text-center font-medium w-8 hidden sm:table-cell">V</th>
                      <th className="px-3 py-2 text-center font-medium w-12">Pnt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stand.map((rij, i) => (
                      <tr key={i} className={`border-b border-gray-50 last:border-0 ${rij.eigenteam === 'true' ? 'bg-green-50 font-semibold' : ''}`}>
                        <td className="px-3 py-2 text-gray-500">{rij.positie}</td>
                        <td className="px-3 py-2 truncate max-w-0">
                          <span className={rij.eigenteam === 'true' ? 'text-vvz-green' : 'text-gray-800'}>{rij.teamnaam}</span>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">{rij.gespeeldewedstrijden}</td>
                        <td className="px-3 py-2 text-center text-gray-600 hidden sm:table-cell">{rij.gewonnen}</td>
                        <td className="px-3 py-2 text-center text-gray-600 hidden sm:table-cell">{rij.gelijk}</td>
                        <td className="px-3 py-2 text-center text-gray-600 hidden sm:table-cell">{rij.verloren}</td>
                        <td className="px-3 py-2 text-center font-bold text-gray-800">{rij.punten}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
