import { supabase } from '../lib/supabaseClient'

export async function fetchTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name')
  return { data, error }
}

export async function createTeam(team) {
  const { data, error } = await supabase
    .from('teams')
    .insert(team)
    .select()
    .single()
  return { data, error }
}

export async function updateTeam(id, updates) {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteTeam(id) {
  const { data, error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)
  return { data, error }
}
