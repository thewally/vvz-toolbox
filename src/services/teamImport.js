// Pure helpers voor het aanvullen van de tabel `teams` met teams uit SportLink
// (kaart thewally/ontwikkelstraat#36). Geen imports, zodat ze los te testen zijn.

const REGULIERE_SPEELDAGEN = ['zaterdag', 'zondag']

// Verwijdert het clubprefix, ook varianten als "ST SO Soest/VVZ'49 " en een typografische apostrof.
function stripPrefix(naam) {
  return String(naam || '')
    .replace(/^.*?VVZ\s*['’`]?\s*49\s*/i, '')
    .trim()
}

/**
 * Korte teamnaam zoals de trainingsschema's die gebruiken.
 * `VVZ '49 O13-1` + man -> `JO13-1` (vrouw: `MO13-1`), O23 blijft `O23-1`,
 * `VVZ '49 2` -> `VVZ 2`, `VVZ '49 35+1` -> `35+ 1`.
 */
export function voorstelNaam(teamnaam, geslacht) {
  const kaal = stripPrefix(teamnaam)
  if (!kaal) return String(teamnaam || '').trim()

  const jeugd = kaal.match(/^[JM]?O(\d+)-(\d+)$/i)
  if (jeugd) {
    const leeftijd = Number(jeugd[1])
    if (leeftijd >= 8 && leeftijd <= 19) {
      const voorvoegsel = String(geslacht || '').toLowerCase() === 'vrouw' ? 'MO' : 'JO'
      return `${voorvoegsel}${leeftijd}-${jeugd[2]}`
    }
    return `O${leeftijd}-${jeugd[2]}`
  }
  if (/^\d+$/.test(kaal)) return `VVZ ${kaal}`
  const veteranen = kaal.match(/^(\d+\+)\s*(\d+)$/)
  if (veteranen) return `${veteranen[1]} ${veteranen[2]}`
  return kaal
}

/**
 * Categorie volgens de labels in de database: 'Pupillen', 'Junioren', 'Senioren',
 * 'Veteranen' of '' (zaal en onbekend, komt onder "Overig").
 * `team.speeldagen` (lijst) of `team.speeldag` (tekst) bepaalt of het een zaalteam is.
 */
export function voorstelCategorie(team) {
  const kaal = stripPrefix(team?.teamnaam)
  if (/^\d+\+/.test(kaal)) return 'Veteranen'

  const dagen = Array.isArray(team?.speeldagen) ? team.speeldagen : [team?.speeldag]
  const reguliereDag = dagen.some(d => REGULIERE_SPEELDAGEN.includes(String(d || '').toLowerCase()))
  if (!reguliereDag) return ''

  const jeugd = kaal.match(/^[JM]?O(\d+)-\d+$/i)
  if (jeugd) {
    const leeftijd = Number(jeugd[1])
    if (leeftijd <= 12) return 'Pupillen'
    if (leeftijd <= 19) return 'Junioren'
    return 'Senioren'
  }
  if (/^\d+$/.test(kaal)) return 'Senioren'

  const cat = String(team?.leeftijdscategorie || '').toLowerCase()
  const onder = cat.match(/onder\s*(\d+)/)
  if (onder) {
    const leeftijd = Number(onder[1])
    if (leeftijd <= 12) return 'Pupillen'
    if (leeftijd <= 19) return 'Junioren'
    return 'Senioren'
  }
  if (cat.includes('senioren')) return 'Senioren'
  return ''
}

// Hoofdletterongevoelig, spaties en streepjes genegeerd.
export function normaliseerNaam(naam) {
  return String(naam || '').toLowerCase().replace(/[\s\-–_]+/g, '')
}

/**
 * Een voorstel per `teamcode` (SportLink geeft een rij per competitie en beker),
 * met de speeldagen van alle rijen samengevoegd.
 */
export function uniekeTeams(sportlinkTeams) {
  const perCode = new Map()
  for (const t of sportlinkTeams || []) {
    if (!t || !t.teamnaam) continue
    const sleutel = t.teamcode ?? t.teamnaam
    const bestaand = perCode.get(sleutel)
    if (bestaand) {
      if (t.speeldag && !bestaand.speeldagen.includes(t.speeldag)) bestaand.speeldagen.push(t.speeldag)
    } else {
      perCode.set(sleutel, { ...t, speeldagen: t.speeldag ? [t.speeldag] : [] })
    }
  }
  return [...perCode.values()]
}

/**
 * SportLink-teams die nog niet in `bestaandeTeams` (rijen uit tabel `teams`) staan,
 * als lijst `{ teamcode, bronNaam, name, category }`.
 */
export function ontbrekendeTeams(sportlinkTeams, bestaandeTeams) {
  const bekend = new Set((bestaandeTeams || []).map(t => normaliseerNaam(t.name)))
  const voorgesteld = new Set()
  const resultaat = []
  for (const t of uniekeTeams(sportlinkTeams)) {
    const name = voorstelNaam(t.teamnaam, t.geslacht)
    const sleutel = normaliseerNaam(name)
    if (!sleutel || bekend.has(sleutel) || voorgesteld.has(sleutel)) continue
    voorgesteld.add(sleutel)
    resultaat.push({ teamcode: t.teamcode, bronNaam: t.teamnaam, name, category: voorstelCategorie(t) })
  }
  return resultaat.sort((a, b) => a.name.localeCompare(b.name, 'nl', { numeric: true }))
}
