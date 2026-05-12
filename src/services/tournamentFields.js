import { supabase } from '../lib/supabaseClient'

/**
 * Velden binnen een toernooi. Sortering via `sort_order`.
 */

export async function fetchFields(tournamentId) {
  const { data, error } = await supabase
    .from('tournament_fields')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('sort_order', { ascending: true })
  return { data, error }
}

export async function createField(tournamentId, name) {
  // Bepaal sort_order door huidige aantal op te halen
  const { data: existing } = await supabase
    .from('tournament_fields')
    .select('sort_order')
    .eq('tournament_id', tournamentId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('tournament_fields')
    .insert({ tournament_id: tournamentId, name, sort_order: nextOrder })
    .select()
    .single()
  return { data, error }
}

export async function updateField(id, updates) {
  const { data, error } = await supabase
    .from('tournament_fields')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteField(id) {
  const { error } = await supabase
    .from('tournament_fields')
    .delete()
    .eq('id', id)
  return { error }
}

/**
 * Schrijf nieuwe `sort_order` waarden op basis van de positie van elk id
 * in de meegegeven array.
 */
export async function reorderFields(tournamentId, orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('tournament_fields')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('tournament_id', tournamentId)
    if (error) return { error }
  }
  return { error: null }
}
