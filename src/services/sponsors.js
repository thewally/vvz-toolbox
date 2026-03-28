import { supabase } from '../lib/supabaseClient'

export async function getSponsors() {
  return supabase
    .from('sponsors')
    .select('*')
    .eq('actief', true)
    .order('volgorde', { ascending: true })
}

export async function getAllSponsors() {
  return supabase
    .from('sponsors')
    .select('*')
    .order('volgorde', { ascending: true })
}

export async function getSponsorBySlug(slug) {
  return supabase
    .from('sponsors')
    .select('*')
    .eq('slug', slug)
    .eq('actief', true)
    .single()
}

export async function createSponsor(data) {
  return supabase.from('sponsors').insert([data]).select().single()
}

export async function updateSponsor(id, data) {
  return supabase.from('sponsors').update(data).eq('id', id).select().single()
}

export async function deleteSponsor(id) {
  return supabase.from('sponsors').delete().eq('id', id)
}

export function generateSlug(naam) {
  return naam
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}
