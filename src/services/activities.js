import { fetchVerenigingsactiviteiten } from './sportlink'

// Activiteiten komen uit de SportLink-verenigingsactiviteiten (via de SportLink-proxy).
// Deze module vertaalt de SportLink-records naar een eigen vorm, zodat de pagina's
// niet van SportLink-veldnamen afhangen:
// { id, title, description, startDate (YYYY-MM-DD), endDate|null, timeStart|null, timeEnd|null, url|null }

export const STANDAARD_DAGEN_VOORUIT = 100

/**
 * Aantal dagen vooruit: standaard (en ondergrens) 100.
 * Lege, niet-numerieke of te lage waarden vallen terug op 100.
 */
export function parseDagenVooruit(waarde) {
  if (waarde === undefined || waarde === null || String(waarde).trim() === '') {
    return STANDAARD_DAGEN_VOORUIT
  }
  const n = Number(waarde)
  if (!Number.isInteger(n) || n < STANDAARD_DAGEN_VOORUIT) return STANDAARD_DAGEN_VOORUIT
  return n
}

export function getDagenVooruit() {
  return parseDagenVooruit(import.meta.env.VITE_ACTIVITEITEN_DAGEN_VOORUIT)
}

// Alleen http(s)-links (of interne paden die met één '/' beginnen) zijn toegestaan.
export function veiligeUrl(url) {
  if (typeof url !== 'string') return null
  const u = url.trim()
  if (/^https?:\/\/\S+$/i.test(u)) return u
  if (u.startsWith('/') && !u.startsWith('//')) return u
  return null
}

function datumDeel(iso) {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null
}

function tijdDeel(iso) {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso) ? iso.slice(11, 16) : null
}

/**
 * Zet een SportLink-verenigingsactiviteit om naar een activiteit.
 * Geeft null terug als het record geen titel of begindatum heeft.
 */
export function mapActiviteit(rec) {
  if (!rec || typeof rec !== 'object') return null
  const title = typeof rec.activiteit === 'string' ? rec.activiteit.trim() : ''
  const startDate = datumDeel(rec.datumvan)
  if (!title || !startDate) return null

  const heleDag = String(rec.heledag).toLowerCase() === 'true'
  const eind = datumDeel(rec.datumtm)
  const endDate = eind && eind > startDate ? eind : null
  const description = typeof rec.opmerkingen === 'string' ? rec.opmerkingen.trim() : ''

  return {
    id: `${rec.datumvan}|${title}`,
    title,
    description,
    startDate,
    endDate,
    timeStart: heleDag ? null : tijdDeel(rec.datumvan),
    timeEnd: heleDag ? null : tijdDeel(rec.datumtm),
    url: veiligeUrl(rec.url),
  }
}

function isoLokaal(datum) {
  const m = String(datum.getMonth() + 1).padStart(2, '0')
  const d = String(datum.getDate()).padStart(2, '0')
  return `${datum.getFullYear()}-${m}-${d}`
}

/**
 * Mapt, filtert (vandaag t/m `dagen` vooruit; lopende meerdaagse activiteiten blijven staan)
 * en sorteert op startdatum en begintijd.
 */
export function verwerkActiviteiten(records, { vandaag = new Date(), dagen = STANDAARD_DAGEN_VOORUIT } = {}) {
  const vanaf = isoLokaal(vandaag)
  const grens = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate() + dagen)
  const tot = isoLokaal(grens)

  return (Array.isArray(records) ? records : [])
    .map(mapActiviteit)
    .filter(a => a && (a.endDate ?? a.startDate) >= vanaf && a.startDate <= tot)
    .sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate)
      return (a.timeStart ?? '').localeCompare(b.timeStart ?? '')
    })
}

/**
 * Haalt de komende activiteiten op uit SportLink. Contract: { data, error }.
 */
export async function fetchActivities() {
  const dagen = getDagenVooruit()
  const { data, error } = await fetchVerenigingsactiviteiten(dagen)
  if (error) return { data: null, error }
  if (!Array.isArray(data)) return { data: null, error: new Error('Onverwachte respons van SportLink') }
  return { data: verwerkActiviteiten(data, { dagen }), error: null }
}
