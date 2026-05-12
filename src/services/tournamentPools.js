import { supabase } from '../lib/supabaseClient'

/**
 * Poules binnen een toernooi. Elke poule hoort bij precies één categorie en
 * bevat 0..N teams via koppeltabel `tournament_pool_teams`.
 */

export async function fetchPools(tournamentId) {
  const { data, error } = await supabase
    .from('tournament_pools')
    .select(`
      *,
      tournament_pool_teams(
        team_id,
        sort_order,
        team:tournament_teams(*)
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('sort_order', { ascending: true })
  return { data, error }
}

export async function createPool(tournamentId, categoryId, name) {
  const { data: existing } = await supabase
    .from('tournament_pools')
    .select('sort_order')
    .eq('tournament_id', tournamentId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('tournament_pools')
    .insert({
      tournament_id: tournamentId,
      category_id: categoryId,
      name,
      sort_order: nextOrder,
    })
    .select()
    .single()
  return { data, error }
}

export async function updatePool(id, updates) {
  const { data, error } = await supabase
    .from('tournament_pools')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deletePool(id) {
  const { error } = await supabase
    .from('tournament_pools')
    .delete()
    .eq('id', id)
  return { error }
}

/**
 * Overschrijf de team-koppelingen van een poule. Verwijdert eerst alle
 * bestaande koppelingen en plaatst de nieuwe lijst.
 *
 * Het `UNIQUE(team_id)` op de koppeltabel zorgt dat een team in hoogstens
 * één poule kan zitten. Om een team naar een andere poule te verplaatsen
 * moet eerst de oude koppeling worden verwijderd — daarom doen we dat hier
 * expliciet voor alle meegegeven teamIds.
 */
export async function setPoolTeams(poolId, teamIds) {
  // 1. Verwijder bestaande koppelingen van deze poule
  const { error: delPoolErr } = await supabase
    .from('tournament_pool_teams')
    .delete()
    .eq('pool_id', poolId)
  if (delPoolErr) return { error: delPoolErr }

  if (!teamIds || teamIds.length === 0) {
    return { error: null }
  }

  // 2. Verwijder eventuele koppelingen van deze teams in andere poules
  //    (anders triggert de UNIQUE constraint op team_id).
  const { error: delTeamsErr } = await supabase
    .from('tournament_pool_teams')
    .delete()
    .in('team_id', teamIds)
  if (delTeamsErr) return { error: delTeamsErr }

  // 3. Insert nieuwe koppelingen
  const rows = teamIds.map((teamId, idx) => ({
    pool_id: poolId,
    team_id: teamId,
    sort_order: idx,
  }))

  const { error: insErr } = await supabase
    .from('tournament_pool_teams')
    .insert(rows)
  return { error: insErr }
}
