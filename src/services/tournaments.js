import { supabase } from '../lib/supabaseClient'

/**
 * Toernooi-CRUD service. Volgt het `{ data, error }` patroon.
 */

/**
 * Lijst van alle toernooien, gesorteerd op datum (nieuwste eerst).
 * @param {{ onlyPublished?: boolean }} options
 */
export async function fetchTournaments({ onlyPublished = false } = {}) {
  let query = supabase
    .from('tournaments')
    .select('*')
    .order('date', { ascending: false })

  if (onlyPublished) {
    query = query.eq('is_published', true)
  }

  const { data, error } = await query
  return { data, error }
}

/**
 * Toernooi op slug ophalen, inclusief alle gerelateerde data.
 */
export async function fetchTournamentBySlug(slug) {
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      tournament_fields(*),
      tournament_categories(*),
      tournament_teams(*),
      tournament_pools(
        *,
        tournament_pool_teams(team_id, sort_order)
      )
    `)
    .eq('slug', slug)
    .maybeSingle()
  return { data, error }
}

export async function fetchTournamentById(id) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return { data, error }
}

export async function createTournament(payload) {
  const { data, error } = await supabase
    .from('tournaments')
    .insert(payload)
    .select()
    .single()
  return { data, error }
}

export async function updateTournament(id, updates) {
  const { data, error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteTournament(id) {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id)
  return { error }
}

export async function publishTournament(id, isPublished) {
  const { data, error } = await supabase
    .from('tournaments')
    .update({ is_published: isPublished })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

/**
 * Genereer een URL-vriendelijke slug uit naam en datum.
 * 'Jeugdtoernooi 2026' + '2026-05-30' -> 'jeugdtoernooi-2026-2026-05-30'
 */
export function generateSlug(name, date) {
  const cleanName = (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const cleanDate = (date || '').trim()
  if (!cleanName && !cleanDate) return ''
  if (!cleanDate) return cleanName
  if (!cleanName) return cleanDate
  return `${cleanName}-${cleanDate}`
}
