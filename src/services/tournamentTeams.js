import { supabase } from '../lib/supabaseClient'

/**
 * Teams binnen een toernooi. Elk team hoort bij precies één categorie.
 */

export async function fetchTeams(tournamentId) {
  const { data, error } = await supabase
    .from('tournament_teams')
    .select('*, category:tournament_categories(*)')
    .eq('tournament_id', tournamentId)
    .order('sort_order', { ascending: true })
  return { data, error }
}

/**
 * @param {string} tournamentId
 * @param {{ category_id: string, name: string, contact_name?: string, notes?: string }} payload
 */
export async function createTeam(tournamentId, payload) {
  const { data: existing } = await supabase
    .from('tournament_teams')
    .select('sort_order')
    .eq('tournament_id', tournamentId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('tournament_teams')
    .insert({
      tournament_id: tournamentId,
      category_id: payload.category_id,
      name: payload.name,
      contact_name: payload.contact_name ?? null,
      notes: payload.notes ?? null,
      sort_order: nextOrder,
    })
    .select()
    .single()
  return { data, error }
}

export async function updateTeam(id, updates) {
  const { data, error } = await supabase
    .from('tournament_teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteTeam(id) {
  const { error } = await supabase
    .from('tournament_teams')
    .delete()
    .eq('id', id)
  return { error }
}
