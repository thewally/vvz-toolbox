// Alle SportLink-calls lopen via de Cloudflare Worker proxy.
// De worker voegt de client_id server-side toe zodat die niet zichtbaar is in de browser.
const PROXY_URL = import.meta.env.VITE_SPORTLINK_PROXY_URL
const COMMON_PARAMS = 'eigenwedstrijden=JA&thuis=JA&uit=JA&gebruiklokaleteamgegevens=NEE'

async function apiFetch(path) {
  try {
    const res = await fetch(`${PROXY_URL}${path}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return { data, error: null }
  } catch (e) {
    return { data: null, error: e }
  }
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
