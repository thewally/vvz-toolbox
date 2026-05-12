import { supabase } from '../lib/supabaseClient'

/**
 * Gegenereerde wedstrijden binnen een toernooi.
 */

export async function fetchMatches(tournamentId) {
  const { data, error } = await supabase
    .from('tournament_matches')
    .select(`
      *,
      home_team:tournament_teams!home_team_id(*),
      away_team:tournament_teams!away_team_id(*),
      field:tournament_fields(*),
      pool:tournament_pools(*)
    `)
    .eq('tournament_id', tournamentId)
    .order('start_time', { ascending: true })
  return { data, error }
}

/**
 * Update een wedstrijd. Wanneer `start_time` of `field_id` wijzigt wordt
 * automatisch `manual_override = true` gezet zodat de wedstrijd bij een
 * hergeneratie (in toekomstige iteratie) als handmatig wordt behandeld.
 */
export async function updateMatch(id, updates) {
  const next = { ...updates }
  if ('start_time' in updates || 'field_id' in updates) {
    next.manual_override = true
  }

  const { data, error } = await supabase
    .from('tournament_matches')
    .update(next)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

/**
 * Verwijder alle wedstrijden van een toernooi waar `manual_override = false`.
 * Handmatig aangepaste wedstrijden blijven behouden.
 */
export async function deleteAllMatches(tournamentId) {
  const { error } = await supabase
    .from('tournament_matches')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('manual_override', false)
  return { error }
}

/**
 * Bulk insert van een array wedstrijden.
 */
export async function bulkInsertMatches(rows) {
  if (!rows || rows.length === 0) return { data: [], error: null }
  const { data, error } = await supabase
    .from('tournament_matches')
    .insert(rows)
    .select()
  return { data, error }
}
