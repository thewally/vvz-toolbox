import { supabase } from '../lib/supabaseClient'

/**
 * Haal het profiel op van de ingelogde gebruiker, inclusief team-naam.
 * @param {string} userId
 * @returns {{ data: object | null, error: Error | null }}
 */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, favorite_team_id, teams(id, name)')
    .eq('id', userId)
    .single()
  return { data, error }
}

/**
 * Werk het voorkeursteam bij.
 * @param {string} userId
 * @param {string|null} favoriteTeamId
 * @returns {{ data, error }}
 */
export async function updateFavoriteTeam(userId, favoriteTeamId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ favorite_team_id: favoriteTeamId })
    .eq('id', userId)
    .select('id, display_name, favorite_team_id, teams(id, name)')
    .single()
  return { data, error }
}

/**
 * Werk het profiel bij (toekomstig: meer velden).
 * @param {string} userId
 * @param {object} updates - { display_name?, favorite_team_id? }
 * @returns {{ data, error }}
 */
export async function updateProfile(userId, updates) {
  const { display_name, favorite_team_id } = updates
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name, favorite_team_id })
    .eq('id', userId)
    .select('id, display_name, favorite_team_id, teams(id, name)')
    .single()
  return { data, error }
}
