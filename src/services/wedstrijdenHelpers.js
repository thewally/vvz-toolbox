const CLUB_CODE = import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE

// Herkent een eigen team op naam, ook samenwerkingsteams zoals "ST SO Soest/VVZ'49 JO14-6"
export function isEigenNaam(naam) {
  return /vvz\s*['’]?\s*49/i.test(naam || '')
}

/**
 * Welke kant van de wedstrijd is van ons? 'thuis', 'uit' of null.
 * Volgorde: (1) veld `teamnaam`, (2) club-relatiecode (thuis wint), (3) VVZ'49 in de naam (thuis wint).
 */
export function eigenKant(w, clubCode = CLUB_CODE) {
  if (!w) return null
  if (w.teamnaam) {
    if (w.teamnaam === w.thuisteam) return 'thuis'
    if (w.teamnaam === w.uitteam) return 'uit'
  }
  if (clubCode) {
    if (w.thuisteamclubrelatiecode === clubCode) return 'thuis'
    if (w.uitteamclubrelatiecode === clubCode) return 'uit'
  }
  if (isEigenNaam(w.thuisteam)) return 'thuis'
  if (isEigenNaam(w.uitteam)) return 'uit'
  return null
}

export function eigenTeamnaam(w, clubCode) {
  const kant = eigenKant(w, clubCode)
  if (kant === 'thuis') return w.thuisteam
  if (kant === 'uit') return w.uitteam
  return null
}

// Teamid van de eigen kant; negeert -1/leeg (team bestaat niet in SportLink)
export function eigenTeamid(w, clubCode) {
  const kant = eigenKant(w, clubCode)
  const id = kant === 'thuis' ? w.thuisteamid : kant === 'uit' ? w.uitteamid : null
  return id && String(id) !== '-1' ? id : null
}

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
      const vvzA = eigenTeamnaam(a) ?? a.uitteam
      const vvzB = eigenTeamnaam(b) ?? b.uitteam
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
  const naam = eigenTeamnaam(wedstrijd)
  return naam ? (teamcodeLookup.get(naam) ?? null) : null
}

/**
 * Kies de poule die overeenkomt met de eerstvolgende wedstrijd uit het programma.
 * Vergelijkt competitienaam-velden van de wedstrijd met de teamPoules entries.
 * Geeft null terug als er geen match gevonden wordt.
 */
export function kiesPouleViaWedstrijd(teamPoules, programma) {
  const vandaag = new Date().toISOString().slice(0, 10)
  const volgend = [...programma]
    .filter(w => w.wedstrijddatum && w.wedstrijddatum.slice(0, 10) >= vandaag)
    .sort((a, b) => new Date(a.wedstrijddatum) - new Date(b.wedstrijddatum))[0]
  if (!volgend) return null

  // Probeer te matchen op seizoen als dat beschikbaar is in de wedstrijd
  const seizoen = (volgend.seizoen || '').trim()
  if (seizoen) {
    const opSeizoen = teamPoules.filter(p => (p.seizoen || '') === seizoen)
    if (opSeizoen.length === 1) return opSeizoen[0]
    if (opSeizoen.length > 1) {
      return opSeizoen.find(p => p.competitiesoort === 'regulier') || opSeizoen[0]
    }
  }

  // Probeer te matchen op competitienaam (niet altijd beschikbaar in programma-data)
  const compNaam = (volgend.competitienaam || volgend.competitie || '').toLowerCase().trim()
  if (!compNaam) return null
  return teamPoules.find(p => {
    const pouleComp = (p.competitienaam || '').toLowerCase().trim()
    return pouleComp && (pouleComp === compNaam || pouleComp.includes(compNaam) || compNaam.includes(pouleComp))
  }) || null
}

/**
 * Bepaal het afgelastingen-niveau op basis van afgelastingen en programma.
 * groen = geen, geel = sommige, oranje = alle thuis, rood = alles
 */
export function getAfgelastingenNiveau(afgelastingen, programma) {
  if (!afgelastingen || afgelastingen.length === 0) return 'groen'

  const afgelastCodes = new Set(afgelastingen.map(a => a.wedstrijdcode))
  const thuiswedstrijden = programma.filter(w => eigenKant(w) === 'thuis')
  const uitwedstrijden = programma.filter(w => eigenKant(w) === 'uit')

  const allesThuisAfgelast = thuiswedstrijden.length > 0 && thuiswedstrijden.every(w => afgelastCodes.has(w.wedstrijdcode))
  const allesUitAfgelast = uitwedstrijden.length > 0 && uitwedstrijden.every(w => afgelastCodes.has(w.wedstrijdcode))

  if (allesThuisAfgelast && allesUitAfgelast) return 'rood'
  if (allesThuisAfgelast) return 'oranje'
  return 'geel'
}

/**
 * Nette weergavenaam van een team. Accepteert (naam, geslacht) of een team-object
 * met `teamnaam` en `geslacht`.
 *   "VVZ '49 O13-1"             -> "JO13-1" (geslacht vrouw: "MO13-1")
 *   "ST SO Soest/VVZ'49 O14-1"  -> "JO14-1"
 *   "VVZ '49 3"                 -> "VVZ 3"
 *   "VVZ '49 35+1"              -> "35+ 1"
 *   "VVZ '49 O23-1"             -> "O23-1"
 * Onbekende patronen: de naam zonder clubprefix; nooit leeg of undefined.
 */
export function formatTeamnaam(naamOfTeam, geslacht) {
  let naam = naamOfTeam
  if (naamOfTeam && typeof naamOfTeam === 'object') {
    naam = naamOfTeam.teamnaam
    geslacht = geslacht ?? naamOfTeam.geslacht
  }
  const ruw = String(naam ?? '').trim()
  if (!ruw) return ''

  const zonderPrefix = ruw.replace(/^.*?VVZ\s*['’`]?\s*49\s*/i, '').trim()
  if (!zonderPrefix) return ruw

  const jeugd = zonderPrefix.match(/^([JM]?)O\s*(\d+)\s*-\s*(\d+)$/i)
  if (jeugd) {
    const leeftijd = parseInt(jeugd[2], 10)
    const nr = parseInt(jeugd[3], 10)
    if (leeftijd >= 8 && leeftijd <= 19) {
      const vrouw = String(geslacht || '').toLowerCase() === 'vrouw'
      const voorvoegsel = jeugd[1] ? jeugd[1].toUpperCase() : (vrouw ? 'M' : 'J')
      return `${voorvoegsel}O${leeftijd}-${nr}`
    }
    return `O${leeftijd}-${nr}`
  }

  const senior = zonderPrefix.match(/^(\d+)$/)
  if (senior) return `VVZ ${senior[1]}`

  const vet = zonderPrefix.match(/^(\d+\+)\s*(\d+)$/)
  if (vet) return `${vet[1]} ${vet[2]}`

  return zonderPrefix
}

/** Volgnummer achter het team ("JO14-10" -> 10), 0 als het ontbreekt. */
export function teamVolgnummer(naamOfTeam) {
  const naam = formatTeamnaam(naamOfTeam)
  const m = naam.match(/(\d+)\s*$/)
  return m ? parseInt(m[1], 10) : 0
}

/**
 * Bepaal de categorie van een team: 'veteranen', 'junioren', 'pupillen', 'zaal' of 'senioren'.
 * SportLink levert leeftijdscategorie als "Onder N" (bv. "Onder 13"); O23 blijft senioren.
 * Volgorde: veteranen, "Onder N", terugval op teamnaam, zaal (geen zaterdag/zondag), senioren.
 */
export function getTeamCategorie(team) {
  const naam = (team?.teamnaam || '').toLowerCase()
  const cat = (team?.leeftijdscategorie || '').toLowerCase()

  if (/veteran|vet\.|35\+|45\+|30\+/.test(naam) || cat.includes('veteran')) return 'veteranen'

  const isO23 = naam.includes('o23')
  const jeugd = (leeftijd) => (leeftijd <= 12 ? 'pupillen' : 'junioren')

  const onderMatch = cat.match(/onder\s*(\d+)/)
  if (onderMatch && parseInt(onderMatch[1], 10) < 23) return jeugd(parseInt(onderMatch[1], 10))
  if (cat.includes('pupil')) return 'pupillen'
  if (cat.includes('junior')) return 'junioren'

  if (!onderMatch && !isO23) {
    const joMatch = naam.match(/[jm]?o\s*(\d+)/)
    if (joMatch) return jeugd(parseInt(joMatch[1], 10))
  }

  const isRegulier = ['Zondag', 'Zaterdag'].includes(team?.speeldag || '')
  if (!isO23 && !isRegulier) return 'zaal'
  return 'senioren'
}

/**
 * Kies de poulecode om te tonen voor een team. Heeft de gekozen poule een lege stand
 * (zonder fout), val dan terug op de eerste andere poule met rijen. Geeft anders de
 * gekozen poulecode terug. standen[poulecode] = { data, error }.
 */
export function kiesPouleMetStand(poules, gekozenCode, standen) {
  const gekozen = standen[gekozenCode]
  if (!gekozen || gekozen.error || (gekozen.data || []).length > 0) return gekozenCode
  const alternatief = poules.find(p =>
    String(p.poulecode) !== String(gekozenCode) && (standen[p.poulecode]?.data || []).length > 0
  )
  return alternatief ? alternatief.poulecode : gekozenCode
}
