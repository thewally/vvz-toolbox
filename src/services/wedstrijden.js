import { sportlinkFetch } from './sportlink'
import { TEAM_CONFIG } from '../lib/teamConfig'

/**
 * Haal teams op uit statische cache, met fallback naar Sportlink API.
 */
export async function getTeams() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/teams.json`)
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        return { data, error: null }
      }
    }
  } catch {
    // fallback naar API
  }
  return sportlinkFetch('teams', { gebruiklokaleteamgegevens: 'NEE' })
}

/**
 * Zoek een team op basis van slug via TEAM_CONFIG + Sportlink teams data.
 * Geeft altijd config-data terug als de slug bekend is, ook als Sportlink
 * het team nog niet retourneert (bijv. voordat de cache gevuld is).
 */
export async function getTeamBySlug(teamSlug) {
  const config = TEAM_CONFIG.find(t => t.slug === teamSlug)
  if (!config) return { data: null, error: new Error('Team niet gevonden') }

  const { data: teams } = await getTeams()

  if (Array.isArray(teams) && teams.length > 0) {
    // Exacte match
    let team = teams.find(t => t.teamnaam === config.sportlinkNaam)
    // Flexibele match: bevat de slug-naam (case-insensitive)
    if (!team) {
      team = teams.find(t =>
        t.teamnaam?.toLowerCase().includes(config.sportlinkNaam.toLowerCase()) ||
        config.sportlinkNaam.toLowerCase().includes(t.teamnaam?.toLowerCase())
      )
    }
    if (team) return { data: { ...team, ...config }, error: null }
  }

  // Geen Sportlink data beschikbaar: geef config terug zodat de pagina toch laadt
  return { data: { ...config, teamcode: null, poulecode: null }, error: null }
}

const PROGRAMMA_PARAMS = {
  gebruiklokaleteamgegevens: 'NEE',
  eigenwedstrijden: 'JA',
  thuis: 'JA',
  uit: 'JA',
}

/**
 * Haal het volledige wedstrijdprogramma op.
 */
export async function getProgramma() {
  return sportlinkFetch('programma', PROGRAMMA_PARAMS)
}

/**
 * Haal programma op voor een specifiek team.
 */
export async function getProgrammaByTeam(teamcode) {
  return sportlinkFetch('programma', { ...PROGRAMMA_PARAMS, teamcode })
}

/**
 * Haal alle uitslagen op.
 */
export async function getUitslagen() {
  return sportlinkFetch('uitslagen')
}

/**
 * Haal uitslagen op voor een specifiek team.
 */
export async function getUitslagenByTeam(teamcode) {
  return sportlinkFetch('uitslagen', { teamcode })
}

/**
 * Haal de poulestand op.
 */
export async function getPoulestand(poulecode) {
  return sportlinkFetch('poulestand', { poulecode })
}

/**
 * Haal afgelastingen op.
 */
export async function getAfgelastingen() {
  return sportlinkFetch('afgelastingen')
}

/**
 * Haal staf op uit statische cache.
 */
export async function getStaf(teamSlug) {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/staf/${teamSlug}.json`)
    if (!response.ok) throw new Error(`Staf niet gevonden voor ${teamSlug}`)
    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}
