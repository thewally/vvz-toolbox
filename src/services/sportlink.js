// Alle SportLink-calls lopen via een proxy (de Quarkus REST-laag op Render,
// pad /api/sportlink; eerder een Cloudflare Worker). De proxy voegt de client_id
// server-side toe zodat die niet zichtbaar is in de browser.
const PROXY_URL = import.meta.env.VITE_SPORTLINK_PROXY_URL
const COMMON_PARAMS = 'eigenwedstrijden=JA&thuis=JA&uit=JA&gebruiklokaleteamgegevens=NEE'

// Een slapende Render-service (free tier) kan bij de eerste call even traag zijn
// of kort een 502/503 geven; daarom meer pogingen met oplopende wachttijd
// (1 s, 2 s, 3 s tussen de pogingen).
const RETRIES = 4
const RETRY_DELAY_MS = 1000
// Maximale duur van een poging; daarna wordt de fetch afgebroken en volgt de volgende poging.
const TIMEOUT_MS = 12000

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// De proxy of data.sportlink.com is soms even niet bereikbaar — zelfde reden dat scripts/sync.py in het sportlink-teampagina
// project met retries werkt. Eén blip mag niet meteen "Failed to fetch" tonen.
export async function apiFetch(path, { retries = RETRIES, delayMs = RETRY_DELAY_MS, timeoutMs = TIMEOUT_MS } = {}) {
  let lastError = null
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(`${PROXY_URL}${path}`, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { data, error: null }
    } catch (e) {
      lastError = controller.signal.aborted ? new Error(`Time-out na ${timeoutMs} ms`) : e
      if (attempt < retries) await wait(delayMs * attempt)
    } finally {
      clearTimeout(timer)
    }
  }
  return { data: null, error: lastError }
}

export function fetchProgramma() {
  return apiFetch(`/programma?${COMMON_PARAMS}&aantaldagen=365`)
}

export function fetchUitslagen() {
  return apiFetch(`/uitslagen?${COMMON_PARAMS}`)
}

export function fetchTeamProgramma(teamcode) {
  return apiFetch(`/programma?${COMMON_PARAMS}&teamcode=${teamcode}&aantaldagen=365`)
}

export function fetchTeamUitslagen(teamcode) {
  return apiFetch(`/uitslagen?${COMMON_PARAMS}&teamcode=${teamcode}`)
}

export function fetchTeams() {
  return apiFetch(`/teams?gebruiklokaleteamgegevens=NEE`)
}

export function fetchPoulestand(poulecode) {
  return apiFetch(`/poulestand?poulecode=${poulecode}`)
}

export function fetchAfgelastingen() {
  return apiFetch(`/afgelastingen`)
}

export function fetchVerenigingsactiviteiten(aantalDagen) {
  return apiFetch(`/verenigingsactiviteiten?gebruiklokaleteamgegevens=NEE&aantaldagen=${aantalDagen}`)
}

export function fetchClubGegevens() {
  return apiFetch(`/clubgegevens`)
}

export function fetchTeamGegevens(teamcode) {
  return apiFetch(`/team-gegevens?teamcode=${teamcode}&lokaleteamcode=-1`)
}

// URL van de miniatuur van de teamfoto (proxy-endpoint /team-foto; 404 als er geen foto is).
// Pure string-opbouw, zodat hij zonder fetch te testen is. Niet via team-gegevens: die foto is MB's groot.
export function teamFotoUrl(teamcode) {
  return `${PROXY_URL}/team-foto?teamcode=${encodeURIComponent(teamcode)}`
}
