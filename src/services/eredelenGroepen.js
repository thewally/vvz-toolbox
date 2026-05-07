import { supabase } from '../lib/supabaseClient'

export async function fetchEredelenGroepen() {
  return supabase.from('ereleden_groepen').select('*').order('volgorde', { ascending: true })
}

export async function createEredelenGroep(data) {
  return supabase.from('ereleden_groepen').insert([data]).select().single()
}

export async function updateEredelenGroep(id, data) {
  return supabase.from('ereleden_groepen').update(data).eq('id', id).select().single()
}

export async function deleteEredelenGroep(id) {
  return supabase.from('ereleden_groepen').delete().eq('id', id)
}
