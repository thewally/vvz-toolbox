const BASE_URL = 'https://data.sportlink.com'
const CLIENT_ID = '0cQwbuN8B2'
const COMMON_PARAMS = 'gebruiklokaleteamgegevens=NEE&eigenwedstrijden=JA&thuis=JA&uit=JA'

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
  return apiFetch(`/programma?client_id=${CLIENT_ID}&${COMMON_PARAMS}&aantaldagen=14`)
}

export function fetchUitslagen() {
  return apiFetch(`/uitslagen?client_id=${CLIENT_ID}&${COMMON_PARAMS}&aantaldagen=14`)
}

export function fetchTeamProgramma(teamcode) {
  return apiFetch(`/programma?client_id=${CLIENT_ID}&teamcode=${teamcode}&${COMMON_PARAMS}&aantaldagen=28`)
}

export function fetchTeamUitslagen(teamcode) {
  return apiFetch(`/uitslagen?client_id=${CLIENT_ID}&teamcode=${teamcode}&${COMMON_PARAMS}&aantaldagen=28`)
}

export function fetchTeams() {
  return apiFetch(`/teams?client_id=${CLIENT_ID}`)
}
