import { supabase } from '../lib/supabaseClient'

export async function fetchEreleden() {
  return supabase.from('ereleden').select('*').order('jaar', { ascending: true })
}

export async function createErelid(data) {
  return supabase.from('ereleden').insert([data]).select().single()
}

export async function updateErelid(id, data) {
  return supabase.from('ereleden').update(data).eq('id', id).select().single()
}

export async function deleteErelid(id) {
  return supabase.from('ereleden').delete().eq('id', id)
}
