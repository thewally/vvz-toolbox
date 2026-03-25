import { supabase } from '../lib/supabaseClient'

export async function fetchFields() {
  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .order('display_order')
  return { data, error }
}

export async function fetchActiveFields() {
  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .eq('active', true)
    .order('display_order')
  return { data, error }
}

export async function createField(payload) {
  return supabase.from('fields').insert(payload).select().single()
}

export async function updateField(id, payload) {
  return supabase.from('fields').update(payload).eq('id', id).select().single()
}

export async function deleteField(id) {
  return supabase.from('fields').delete().eq('id', id)
}
