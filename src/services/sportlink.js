const BASE_URL = 'https://data.sportlink.com'
const CLIENT_ID = '0cQwbuN8B2'
const COMMON_PARAMS = 'eigenwedstrijden=JA&thuis=JA&uit=JA&gebruiklokaleteamgegevens=NEE'

async function apiFetch(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return { data, error: null }
  } catch (e) {
    return { data: null, error: e }
  }
}

export function fetchProgramma() {
  return apiFetch(`/programma?${COMMON_PARAMS}&client_id=${CLIENT_ID}`)
}

export function fetchUitslagen() {
  return apiFetch(`/uitslagen?${COMMON_PARAMS}&client_id=${CLIENT_ID}`)
}

export function fetchTeamProgramma(teamcode) {
  return apiFetch(`/programma?${COMMON_PARAMS}&teamcode=${teamcode}&client_id=${CLIENT_ID}`)
}

export function fetchTeamUitslagen(teamcode) {
  return apiFetch(`/uitslagen?${COMMON_PARAMS}&teamcode=${teamcode}&client_id=${CLIENT_ID}`)
}

export function fetchTeams() {
  return apiFetch(`/teams?client_id=${CLIENT_ID}`)
}
