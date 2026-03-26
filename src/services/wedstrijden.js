import { fetchProgramma, fetchUitslagen, fetchTeamProgramma, fetchTeamUitslagen } from './sportlink'

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
