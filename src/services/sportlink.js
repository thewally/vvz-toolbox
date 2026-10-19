// Alle SportLink-calls lopen via de Cloudflare Worker proxy.
// De worker voegt de client_id server-side toe zodat die niet zichtbaar is in de browser.
const PROXY_URL = import.meta.env.VITE_SPORTLINK_PROXY_URL
const COMMON_PARAMS = 'eigenwedstrijden=JA&thuis=JA&uit=JA&gebruiklokaleteamgegevens=NEE'

const RETRIES = 2
const RETRY_DELAY_MS = 500

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// data.sportlink.com (achter de Cloudflare Worker proxy) is soms even niet
// bereikbaar — zelfde reden dat scripts/sync.py in het sportlink-teampagina
// project met retries werkt. Eén blip mag niet meteen "Failed to fetch" tonen.
async function apiFetch(path) {
  let lastError = null
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(`${PROXY_URL}${path}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return { data, error: null }
    } catch (e) {
      lastError = e
      if (attempt < RETRIES) await wait(RETRY_DELAY_MS * attempt)
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

export function fetchClubGegevens() {
  return apiFetch(`/clubgegevens`)
}

export function fetchTeamGegevens(teamcode) {
  return apiFetch(`/team-gegevens?teamcode=${teamcode}&lokaleteamcode=-1`)
}
