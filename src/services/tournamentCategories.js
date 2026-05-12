import { supabase } from '../lib/supabaseClient'

/**
 * Categorieën binnen een toernooi (bv. Jeugd, Senioren, Dames).
 */

export async function fetchCategories(tournamentId) {
  const { data, error } = await supabase
    .from('tournament_categories')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('sort_order', { ascending: true })
  return { data, error }
}

export async function createCategory(tournamentId, name) {
  const { data: existing } = await supabase
    .from('tournament_categories')
    .select('sort_order')
    .eq('tournament_id', tournamentId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('tournament_categories')
    .insert({ tournament_id: tournamentId, name, sort_order: nextOrder })
    .select()
    .single()
  return { data, error }
}

export async function updateCategory(id, updates) {
  const { data, error } = await supabase
    .from('tournament_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('tournament_categories')
    .delete()
    .eq('id', id)
  return { error }
}
