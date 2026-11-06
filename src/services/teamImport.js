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
 * Bepaalt wat er met de tabel `teams` moet gebeuren om die gelijk te laten lopen met SportLink
 * (kaart thewally/ontwikkelstraat#37).
 * - `toevoegen`: `{ teamcode, name, category }` voor SportLink-teams die nog niet bestaan.
 * - `koppelen`: `{ id, teamcode }` voor bestaande teams zonder teamcode met dezelfde genormaliseerde naam.
 * - `verdwenen`: ids van teams met bron 'sportlink' waarvan de teamcode niet meer voorkomt.
 * Bestaande namen en categorieen worden nooit aangepast en teams worden nooit verwijderd.
 * Een leeg of ongeldig SportLink-antwoord levert overal een lege lijst op.
 */
export function bepaalSync(sportlinkTeams, bestaandeTeams) {
  const leeg = { toevoegen: [], koppelen: [], verdwenen: [] }
  if (!Array.isArray(sportlinkTeams) || sportlinkTeams.length === 0) return leeg

  const bestaand = Array.isArray(bestaandeTeams) ? bestaandeTeams : []
  const codes = new Set(
    sportlinkTeams.filter(t => t && t.teamcode != null).map(t => String(t.teamcode)),
  )
  if (codes.size === 0) return leeg

  const gekoppeldeCodes = new Set(
    bestaand.filter(t => t.sportlink_teamcode != null).map(t => String(t.sportlink_teamcode)),
  )
  // Naam -> team zonder teamcode dat nog gekoppeld kan worden.
  const losPerNaam = new Map()
  for (const t of bestaand) {
    if (t.sportlink_teamcode != null) continue
    const sleutel = normaliseerNaam(t.name)
    if (sleutel && !losPerNaam.has(sleutel)) losPerNaam.set(sleutel, t)
  }
  const bezetteNamen = new Set(bestaand.map(t => normaliseerNaam(t.name)))

  const toevoegen = []
  const koppelen = []
  const verwerkt = new Set()
  for (const t of uniekeTeams(sportlinkTeams)) {
    if (t.teamcode == null) continue
    const code = String(t.teamcode)
    if (gekoppeldeCodes.has(code) || verwerkt.has(code)) continue
    verwerkt.add(code)

    const name = voorstelNaam(t.teamnaam, t.geslacht)
    const sleutel = normaliseerNaam(name)
    if (!sleutel) continue

    const los = losPerNaam.get(sleutel)
    if (los) {
      koppelen.push({ id: los.id, teamcode: code })
      losPerNaam.delete(sleutel)
    } else if (!bezetteNamen.has(sleutel)) {
      bezetteNamen.add(sleutel)
      toevoegen.push({ teamcode: code, name, category: voorstelCategorie(t) })
    }
  }

  const verdwenen = bestaand
    .filter(t => t.bron === 'sportlink' && t.sportlink_teamcode != null && !codes.has(String(t.sportlink_teamcode)))
    .map(t => t.id)

  return { toevoegen, koppelen, verdwenen }
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
