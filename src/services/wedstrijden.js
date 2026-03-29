import { fetchProgramma, fetchUitslagen, fetchTeamProgramma, fetchTeamUitslagen, fetchTeams, fetchPoulestand, fetchAfgelastingen, fetchTeamGegevens } from './sportlink'

export async function getProgramma() {
  return fetchProgramma()
}

export async function getUitslagen() {
  return fetchUitslagen()
}

export async function getTeamProgramma(teamcode) {
  return fetchTeamProgramma(teamcode)
}

export async function getTeamUitslagen(teamcode) {
  return fetchTeamUitslagen(teamcode)
}

export async function getTeams() {
  return fetchTeams()
}

export async function getPoulestand(poulecode) {
  return fetchPoulestand(poulecode)
}

export async function getAfgelastingen() {
  return fetchAfgelastingen()
}

export async function getTeamGegevens(teamcode) {
  return fetchTeamGegevens(teamcode)
}
