// Pure hulpfuncties en API-client voor het gebruikersbeheer in Auth0-modus
// (Quarkus-API /api/gebruikers, ontwikkelstraat#42). Geen React, geen import.meta,
// zodat alles met node --test te testen is. De bedrading met de omgeving staat in
// src/services/gebruikersApi.js.

// Rollen die de backend toestaat (whitelist van #42).
export const BACKEND_ROLLEN = [
  'admin', 'activiteiten', 'contact', 'ereleden', 'lid-worden', 'nieuws',
  'paginas', 'reglementen', 'sponsoring', 'trainingsschema', 'verslagen', 'vrijwilligers',
]

// Rollen die de beheerpagina als vinkje toont: de backendlijst zonder `admin` (eigen schakelaar)
// en zonder `activiteiten` (de activiteitenpagina heeft geen beheer; zie CLAUDE.md).
export const VERBORGEN_ROLLEN = ['admin', 'activiteiten']
export const VINKBARE_ROLLEN = BACKEND_ROLLEN.filter((r) => !VERBORGEN_ROLLEN.includes(r))

export const MSG_GEEN_TOEGANG = 'Je hebt geen toegang of je sessie is verlopen. Log opnieuw in.'
export const MSG_CONFIG = 'De API-url voor gebruikersbeheer ontbreekt (VITE_API_BASE_URL of VITE_SPORTLINK_PROXY_URL is niet gezet tijdens de build).'

/**
 * Basis-url van de API: VITE_API_BASE_URL, anders de proxy-url zonder het achtervoegsel /api/sportlink.
 * Geeft null als er geen geldige http(s)-url uit te halen valt.
 */
export function deriveApiBase(proxyUrl, override) {
  const kies = (typeof override === 'string' && override.trim()) ? override : proxyUrl
  if (typeof kies !== 'string' || !kies.trim()) return null
  let url = kies.trim().replace(/\/+$/, '')
  if (!(typeof override === 'string' && override.trim())) url = url.replace(/\/api\/sportlink$/, '')
  url = url.replace(/\/+$/, '')
  return /^https?:\/\/[^/\s]+/.test(url) ? url : null
}

/** Zet een statuscode (0 = netwerkfout) om naar een Nederlandse melding. */
export function mapApiError(status, actie, serverMessage) {
  if (status === 401 || status === 403) return MSG_GEEN_TOEGANG
  if (status === 409) return 'Dit e-mailadres bestaat al.'
  if (status === 404) return 'Deze gebruiker bestaat niet (meer).'
  if (status === 502 || status === 503 || status === 504) {
    return 'De gebruikersservice is tijdelijk niet bereikbaar. Probeer het over een minuut opnieuw.'
  }
  if (status === 0) return 'Geen verbinding met de server. Controleer je internet en probeer het opnieuw.'
  if (status === 400) {
    if (actie === 'uitnodigen') return 'Controleer de naam, het e-mailadres en de rollen.'
    if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage.trim()
    return 'De invoer is niet geldig.'
  }
  return 'Er ging iets mis. Probeer het opnieuw.'
}

async function leesServerMelding(res) {
  try {
    const tekst = await res.text()
    if (!tekst) return null
    try {
      const j = JSON.parse(tekst)
      const m = j?.message ?? j?.melding ?? j?.error ?? j?.fout
      return typeof m === 'string' ? m : null
    } catch {
      return tekst.length < 200 ? tekst : null
    }
  } catch {
    return null
  }
}

function wacht(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Laatste login als nl-NL datum en tijd; leeg of ongeldig geeft "Nog nooit". */
export function formatLaatsteLogin(waarde) {
  if (!waarde) return 'Nog nooit'
  const d = new Date(waarde)
  if (Number.isNaN(d.getTime())) return 'Nog nooit'
  return d.toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Bouwt de API-client. Elke functie geeft { data, error } met error = { status, message }.
 * Alleen de lijst-GET herhaalt bij netwerkfouten en 502/503/504 (slapende Render-service);
 * POST/PUT/DELETE gaan precies één keer uit.
 */
export function maakGebruikersApi({ baseUrl, getToken, fetchFn = globalThis.fetch, retries = 4, delayMs = 1000, timeoutMs = 12000 }) {
  async function verzoek(methode, pad, body, actie, { herhaal = false } = {}) {
    if (!baseUrl) return { data: null, error: { status: 0, message: MSG_CONFIG } }
    const token = await getToken()
    if (!token) return { data: null, error: { status: 401, message: MSG_GEEN_TOEGANG } }
    const pogingen = herhaal ? retries : 1
    let laatste = null
    for (let poging = 1; poging <= pogingen; poging++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetchFn(`${baseUrl}${pad}`, {
          method: methode,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })
        if (res.ok) {
          let data = null
          if (res.status !== 204) {
            try { data = await res.json() } catch { data = null }
          }
          return { data, error: null }
        }
        const serverMelding = await leesServerMelding(res)
        laatste = { status: res.status, message: mapApiError(res.status, actie, serverMelding) }
        if (![502, 503, 504].includes(res.status)) return { data: null, error: laatste }
      } catch {
        laatste = { status: 0, message: mapApiError(0, actie) }
      } finally {
        clearTimeout(timer)
      }
      if (poging < pogingen) await wacht(delayMs * poging)
    }
    return { data: null, error: laatste }
  }

  const pad = (id) => `/api/gebruikers/${encodeURIComponent(id)}`

  return {
    lijstGebruikers: () => verzoek('GET', '/api/gebruikers', undefined, 'lijst', { herhaal: true }),
    maakGebruiker: ({ email, display_name, rollen }) => {
      const body = { email, rollen }
      if (display_name) body.display_name = display_name
      return verzoek('POST', '/api/gebruikers', body, 'uitnodigen')
    },
    zetRollen: (id, rollen) => verzoek('PUT', `${pad(id)}/rollen`, { rollen }, 'rollen'),
    verwijderGebruiker: (id) => verzoek('DELETE', pad(id), undefined, 'verwijderen'),
    stuurUitnodiging: (id) => verzoek('POST', `${pad(id)}/uitnodiging`, undefined, 'uitnodiging'),
  }
}

/**
 * De volledige rollenlijst voor de PUT: admin-schakelaar plus aangevinkte rollen, aangevuld met
 * rollen die de pagina niet toont (zoals `activiteiten`) zodat die bij opslaan niet verdwijnen.
 */
export function bouwRollenlijst({ huidig = [], aangevinkt = [], admin = false }) {
  const behouden = huidig.filter((r) => VERBORGEN_ROLLEN.includes(r) && r !== 'admin')
  const lijst = [...new Set([...behouden, ...aangevinkt.filter((r) => VINKBARE_ROLLEN.includes(r))])]
  return admin ? ['admin', ...lijst] : lijst
}
