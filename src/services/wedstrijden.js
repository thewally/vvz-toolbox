import { fetchProgramma, fetchUitslagen, fetchTeamProgramma, fetchTeamUitslagen, fetchTeams } from './sportlink'

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
