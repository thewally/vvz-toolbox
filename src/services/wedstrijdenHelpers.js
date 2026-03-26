import { CLUB_RELATIECODE } from './sportlink'
import { TEAM_CONFIG } from '../lib/teamConfig'

/**
 * Check of een wedstrijd een thuiswedstrijd is.
 */
export function isThuis(wedstrijd) {
  return wedstrijd.thuisteamclubrelatiecode === CLUB_RELATIECODE
}

/**
 * Bereken aanwezigheidstijd: 45 minuten voor aanvang.
 */
export function getAanwezigheidstijd(wedstrijddatum) {
  const d = new Date(wedstrijddatum)
  d.setMinutes(d.getMinutes() - 45)
  return d
}

/**
 * Filter wedstrijden voor de huidige speelweek (zondag t/m zaterdag).
 * De week wisselt op zondag.
 */
export function filterHuidigeSpeelweek(wedstrijden) {
  const nu = new Date()
  const dag = nu.getDay() // 0=zondag
  const startVanWeek = new Date(nu)
  startVanWeek.setDate(nu.getDate() - dag)
  startVanWeek.setHours(0, 0, 0, 0)

  const eindVanWeek = new Date(startVanWeek)
  eindVanWeek.setDate(startVanWeek.getDate() + 7)
  eindVanWeek.setHours(0, 0, 0, 0)

  return wedstrijden.filter(w => {
    const d = new Date(w.wedstrijddatum || w.datum)
    return d >= startVanWeek && d < eindVanWeek
  })
}

/**
 * Filter uitslagen van vorige week (vorige zondag t/m gisteren).
 */
export function filterUitslagenVorigeWeek(uitslagen) {
  const nu = new Date()
  const dag = nu.getDay()
  const vorigeZondag = new Date(nu)
  vorigeZondag.setDate(nu.getDate() - dag - 7)
  vorigeZondag.setHours(0, 0, 0, 0)

  const vandaag = new Date(nu)
  vandaag.setHours(0, 0, 0, 0)

  return uitslagen.filter(u => {
    const d = new Date(u.wedstrijddatum || u.datum)
    return d >= vorigeZondag && d < vandaag
  })
}

/**
 * Groepeer items per dag op basis van een datumveld.
 * Geeft een Map<string, Array> terug (key = ISO date string).
 */
export function groepeerPerDag(items, datumVeld = 'wedstrijddatum') {
  const map = new Map()
  for (const item of items) {
    const datum = item[datumVeld]
    if (!datum) continue
    const key = datum.slice(0, 10) // YYYY-MM-DD
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  // Sorteer op datum
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * Genereer een WhatsApp-deellink voor een wedstrijd.
 */
export function getWhatsAppLink(wedstrijd) {
  const datum = new Date(wedstrijd.wedstrijddatum)
  const opties = { weekday: 'long', day: 'numeric', month: 'long' }
  const datumStr = datum.toLocaleDateString('nl-NL', opties)
  const tijd = wedstrijd.aanvangstijd || ''

  const tekst = [
    `${wedstrijd.thuisteam} - ${wedstrijd.uitteam}`,
    `Datum: ${datumStr}`,
    tijd ? `Aanvang: ${tijd}` : '',
    wedstrijd.accommodatie ? `Locatie: ${wedstrijd.accommodatie}${wedstrijd.plaats ? `, ${wedstrijd.plaats}` : ''}` : '',
  ].filter(Boolean).join('\n')

  return `https://wa.me/?text=${encodeURIComponent(tekst)}`
}

/**
 * Bepaal het afgelastingenniveau.
 * Groen = geen afgelastingen
 * Geel = sommige wedstrijden afgelast
 * Oranje = alle thuiswedstrijden afgelast maar niet alle uit
 * Rood = alles afgelast
 */
export function getAfgelastingenNiveau(afgelastingen, programma) {
  if (!afgelastingen || afgelastingen.length === 0) return 'groen'

  const programmaWedstrijden = filterHuidigeSpeelweek(programma || [])
  if (programmaWedstrijden.length === 0) return 'groen'

  const afgelastCodes = new Set(afgelastingen.map(a => a.wedstrijdcode))
  const thuisWedstrijden = programmaWedstrijden.filter(w => isThuis(w))
  const uitWedstrijden = programmaWedstrijden.filter(w => !isThuis(w))

  const alleAfgelast = programmaWedstrijden.every(w => afgelastCodes.has(w.wedstrijdcode))
  if (alleAfgelast) return 'rood'

  const alleThuisAfgelast = thuisWedstrijden.length > 0 && thuisWedstrijden.every(w => afgelastCodes.has(w.wedstrijdcode))
  const alleUitAfgelast = uitWedstrijden.length > 0 && uitWedstrijden.every(w => afgelastCodes.has(w.wedstrijdcode))

  if (alleThuisAfgelast && !alleUitAfgelast) return 'oranje'

  return 'geel'
}

/**
 * Zoek een slug op basis van sportlinkNaam.
 */
export function teamNaamNaarSlug(teamnaam) {
  const config = TEAM_CONFIG.find(t => t.sportlinkNaam === teamnaam)
  return config?.slug || null
}

/**
 * Zoek een sportlinkNaam op basis van slug.
 */
export function slugNaarTeamNaam(slug) {
  const config = TEAM_CONFIG.find(t => t.slug === slug)
  return config?.sportlinkNaam || null
}
