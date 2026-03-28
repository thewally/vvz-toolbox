const BASE_URL = 'https://data.sportlink.com'
const CLIENT_ID = import.meta.env.VITE_SPORTLINK_CLIENT_ID
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
  return apiFetch(`/programma?${COMMON_PARAMS}&aantaldagen=365&client_id=${CLIENT_ID}`)
}

export function fetchUitslagen() {
  return apiFetch(`/uitslagen?${COMMON_PARAMS}&client_id=${CLIENT_ID}`)
}

export function fetchTeamProgramma(teamcode) {
  return apiFetch(`/programma?${COMMON_PARAMS}&teamcode=${teamcode}&aantaldagen=365&client_id=${CLIENT_ID}`)
}

export function fetchTeamUitslagen(teamcode) {
  return apiFetch(`/uitslagen?${COMMON_PARAMS}&teamcode=${teamcode}&client_id=${CLIENT_ID}`)
}

export function fetchTeams() {
  return apiFetch(`/teams?gebruiklokaleteamgegevens=NEE&client_id=${CLIENT_ID}`)
}

export function fetchPoulestand(poulecode) {
  return apiFetch(`/poulestand?poulecode=${poulecode}&client_id=${CLIENT_ID}`)
}

export function fetchAfgelastingen() {
  return apiFetch(`/afgelastingen?client_id=${CLIENT_ID}`)
}

export function fetchClubGegevens() {
  return apiFetch(`/clubgegevens?client_id=${CLIENT_ID}`)
}
