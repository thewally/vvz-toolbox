import { supabase } from '../lib/supabaseClient'

/**
 * Service voor wedstrijdverslagen (match_reports).
 *
 * Publiek leesbare velden worden beperkt tot wat nodig is voor de lijst-
 * weergave. Detail-queries halen alle velden op.
 *
 * RLS zorgt ervoor dat publiek alleen gepubliceerde verslagen ziet.
 * Beheerders met rol 'content' (of admin) zien alles.
 */

const LIST_FIELDS = 'id, team_id, team_name, title, slug, content, published_at'

// Alle verslagen voor het beheer (inclusief concepten)
export async function fetchAllMatchReports() {
  const { data, error } = await supabase
    .from('match_reports')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  return { data, error }
}

// Publieke verslagen — RLS filtert op published_at
export async function fetchPublicMatchReports(limit = null) {
  let query = supabase
    .from('match_reports')
    .select(LIST_FIELDS)
    .order('published_at', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  return { data, error }
}

// Verslagen voor een specifiek team (publiek, RLS filtert gepubliceerde)
export async function fetchMatchReportsByTeam(teamId, limit = null) {
  let query = supabase
    .from('match_reports')
    .select(LIST_FIELDS)
    .eq('team_id', String(teamId))
    .order('published_at', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  return { data, error }
}

// Detail via slug (publiek, RLS filtert)
export async function fetchMatchReportBySlug(slug) {
  const { data, error } = await supabase
    .from('match_reports')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  return { data, error }
}

// Detail via id (beheer)
export async function fetchMatchReportById(id) {
  const { data, error } = await supabase
    .from('match_reports')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

// Aanmaken
export async function createMatchReport(payload) {
  const { data, error } = await supabase
    .from('match_reports')
    .insert(payload)
    .select()
    .single()
  return { data, error }
}

// Bijwerken
export async function updateMatchReport(id, updates) {
  const { data, error } = await supabase
    .from('match_reports')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// Verwijderen (inclusief opruimen inline afbeeldingen)
export async function deleteMatchReport(id) {
  const { data: item } = await supabase
    .from('match_reports')
    .select('content')
    .eq('id', id)
    .maybeSingle()

  if (item?.content) {
    const paths = extractImagePaths(item.content)
    if (paths.length > 0) {
      await supabase.storage.from('page-images').remove(paths)
    }
  }

  const { data, error } = await supabase
    .from('match_reports')
    .delete()
    .eq('id', id)
  return { data, error }
}

// Helper: extracteer storage-paden uit TipTap HTML zodat ze opgeruimd kunnen worden
function extractImagePaths(html) {
  const matches = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)]
  return matches
    .filter(m => m[1].includes('/page-images/'))
    .map(m => m[1].split('/page-images/').pop().split('?')[0])
}
