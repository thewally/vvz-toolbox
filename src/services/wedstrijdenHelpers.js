// wedstrijddatum is ISO 8601: "2026-03-29T14:00:00+0200"
export function parseWedstrijdDatum(wedstrijddatum) {
  return new Date(wedstrijddatum)
}

// Geeft een sorteerbaare datum-sleutel terug (yyyy-mm-dd) voor groepering
export function datumSleutel(wedstrijddatum) {
  const d = parseWedstrijdDatum(wedstrijddatum)
  return d.toISOString().slice(0, 10) // "2026-03-29"
}

// Format voor weergave: "zaterdag 29 maart"
const DUTCH_DAYS = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']
const DUTCH_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']

export function formatDagLabel(wedstrijddatum) {
  const d = parseWedstrijdDatum(wedstrijddatum)
  return `${DUTCH_DAYS[d.getDay()]} ${d.getDate()} ${DUTCH_MONTHS[d.getMonth()]}`
}

// Korte dag + datum op twee regels: { dag: 'zat', datum: '29 mrt' }
const DUTCH_DAYS_SHORT = ['zo','ma','di','wo','do','vr','za']
const DUTCH_MONTHS_SHORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']

export function formatDatumKort(wedstrijddatum) {
  const d = parseWedstrijdDatum(wedstrijddatum)
  return { dag: DUTCH_DAYS_SHORT[d.getDay()], datum: `${d.getDate()} ${DUTCH_MONTHS_SHORT[d.getMonth()]}` }
}

// Geeft een sorteergetal voor een teamnaam op categorie + volgnummer
// Lagere waarde = eerder in de lijst
// Volgorde: jeugd oplopend (JO8 < JO9 < ... < JO19), dan senioren (VVZ 1 < VVZ 2), dan rest
export function teamSorteerGetal(teamnaam) {
  const naam = (teamnaam || '').toLowerCase()

  // Jeugd: JO8, JO9, JO10 ... JO19
  const joMatch = naam.match(/[jm]o\s*(\d+)/)
  if (joMatch) {
    const leeftijd = parseInt(joMatch[1], 10)
    // Volgnummer achter team, bv JO13-2 → 2
    const volg = parseInt((naam.match(/[jm]o\s*\d+[-\s]+(\d+)/) || [])[1] || '1', 10)
    return leeftijd * 100 + volg
  }

  // Senioren: VVZ '49 1, VVZ '49 2, ...
  const seniorenMatch = naam.match(/vvz\s*'?49\s+(\d+)/)
  if (seniorenMatch) return 2000 + parseInt(seniorenMatch[1], 10)

  // Veteranen
  if (/veteran|vet\./.test(naam)) return 3000

  return 9999
}

// Groepeer op yyyy-mm-dd sleutel, gesorteerd
// Binnen elke dag: eerst op tijd, dan op teamcategorie
export function groepeerPerDag(wedstrijden) {
  const map = new Map()
  for (const w of wedstrijden) {
    if (!w.wedstrijddatum) continue
    const sleutel = datumSleutel(w.wedstrijddatum)
    if (!map.has(sleutel)) map.set(sleutel, [])
    map.get(sleutel).push(w)
  }
  // Sorteer per dag
  for (const [, items] of map) {
    items.sort((a, b) => {
      // 1. Aanvangstijd
      const tijdA = a.aanvangstijd || '99:99'
      const tijdB = b.aanvangstijd || '99:99'
      if (tijdA !== tijdB) return tijdA.localeCompare(tijdB)
      // 2. Teamcategorie: gebruik VVZ-team (thuis of uit)
      const vvzA = a.thuisteamclubrelatiecode === import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE ? a.thuisteam : a.uitteam
      const vvzB = b.thuisteamclubrelatiecode === import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE ? b.thuisteam : b.uitteam
      return teamSorteerGetal(vvzA) - teamSorteerGetal(vvzB)
    })
  }
  return new Map([...map.entries()].sort())
}

// Huidige speelweek: alle wedstrijden met datum >= vandaag, gegroepeerd per dag
// "speelweek" = eerste dag >= vandaag + alle andere dagen binnen 2 dagen daarna
export function filterHuidigeSpeelweek(wedstrijden) {
  const perDag = groepeerPerDag(wedstrijden)
  if (perDag.size === 0) return []

  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const vandaagSleutel = vandaag.toISOString().slice(0, 10)

  // Alle toekomstige datums
  const toekomst = [...perDag.entries()].filter(([k]) => k >= vandaagSleutel)
  if (toekomst.length === 0) {
    // Geen toekomstige wedstrijden: pak laatste groep (meest recente uitslag)
    const laatste = [...perDag.entries()].at(-1)
    return laatste ? laatste[1] : []
  }

  // Pak de eerste toekomstige datum als anker, pak ook dagen binnen 2 dagen erna
  const ankerDatum = new Date(toekomst[0][0])
  const limiet = new Date(ankerDatum)
  limiet.setDate(limiet.getDate() + 2)
  const limietSleutel = limiet.toISOString().slice(0, 10)

  return toekomst
    .filter(([k]) => k <= limietSleutel)
    .flatMap(([, items]) => items)
}

// Vorige speelweek: alles van de afgelopen 7 dagen
export function filterVorigeSpeelweek(wedstrijden) {
  const perDag = groepeerPerDag(wedstrijden)
  if (perDag.size === 0) return []

  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const vandaagSleutel = vandaag.toISOString().slice(0, 10)

  // Alle datums in het verleden, pak de meest recente groep
  const verleden = [...perDag.entries()].filter(([k]) => k < vandaagSleutel)
  if (verleden.length === 0) return []

  // Pak de laatste datum als anker, pak ook dagen binnen 2 dagen ervoor
  const ankerDatum = new Date(verleden.at(-1)[0])
  const ondergrens = new Date(ankerDatum)
  ondergrens.setDate(ondergrens.getDate() - 2)
  const ondergrensSleutel = ondergrens.toISOString().slice(0, 10)

  return verleden
    .filter(([k]) => k >= ondergrensSleutel)
    .flatMap(([, items]) => items)
}

/**
 * Bouw een Map van teamnaam -> teamcode vanuit de teams-lijst.
 */
export function buildTeamcodeLookup(teams) {
  const map = new Map()
  for (const t of teams) {
    if (t.teamnaam && t.teamcode) {
      map.set(t.teamnaam, t.teamcode)
    }
  }
  return map
}

/**
 * Geeft de teamcode terug van het VVZ-team in een wedstrijd, of null.
 * Bij twee VVZ-teams: thuisteam wint.
 */
export function getVvzTeamcode(wedstrijd, teamcodeLookup) {
  const CLUB = import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE
  const isThuis = wedstrijd.thuisteamclubrelatiecode === CLUB
  const isUit = wedstrijd.uitteamclubrelatiecode === CLUB

  if (isThuis) return teamcodeLookup.get(wedstrijd.thuisteam) ?? null
  if (isUit) return teamcodeLookup.get(wedstrijd.uitteam) ?? null
  return null
}

/**
 * Bepaal het afgelastingen-niveau op basis van afgelastingen en programma.
 * groen = geen, geel = sommige, oranje = alle thuis, rood = alles
 */
export function getAfgelastingenNiveau(afgelastingen, programma) {
  if (!afgelastingen || afgelastingen.length === 0) return 'groen'

  const afgelastCodes = new Set(afgelastingen.map(a => a.wedstrijdcode))
  const thuiswedstrijden = programma.filter(w => w.thuisteamclubrelatiecode === import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE)
  const uitwedstrijden = programma.filter(w => w.uitteamclubrelatiecode === import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE)

  const allesThuisAfgelast = thuiswedstrijden.length > 0 && thuiswedstrijden.every(w => afgelastCodes.has(w.wedstrijdcode))
  const allesUitAfgelast = uitwedstrijden.length > 0 && uitwedstrijden.every(w => afgelastCodes.has(w.wedstrijdcode))

  if (allesThuisAfgelast && allesUitAfgelast) return 'rood'
  if (allesThuisAfgelast) return 'oranje'
  return 'geel'
}
