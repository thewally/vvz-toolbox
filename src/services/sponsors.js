import { supabase } from '../lib/supabaseClient'

// ── Sponsors ──────────────────────────────────────────────────────────────────

export async function getSponsors() {
  return supabase
    .from('sponsors')
    .select('*, groep:sponsor_groepen(*)')
    .eq('actief', true)
    .order('volgorde', { ascending: true })
}

export async function getAllSponsors() {
  return supabase
    .from('sponsors')
    .select('*, groep:sponsor_groepen(*)')
    .order('volgorde', { ascending: true })
}

export async function getSponsorBySlug(slug) {
  return supabase
    .from('sponsors')
    .select('*, groep:sponsor_groepen(*)')
    .eq('slug', slug)
    .eq('actief', true)
    .single()
}

export async function createSponsor(data) {
  return supabase.from('sponsors').insert([data]).select('*, groep:sponsor_groepen(*)').single()
}

export async function updateSponsor(id, data) {
  return supabase.from('sponsors').update(data).eq('id', id).select('*, groep:sponsor_groepen(*)').single()
}

export async function deleteSponsor(id) {
  return supabase.from('sponsors').delete().eq('id', id)
}

export async function uploadSponsorLogo(file) {
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('sponsor-logos').upload(path, file)
  if (error) return { data: null, error }
  const { data } = supabase.storage.from('sponsor-logos').getPublicUrl(path)
  return { data: { url: data.publicUrl, path }, error: null }
}

export async function deleteSponsorLogo(path) {
  return supabase.storage.from('sponsor-logos').remove([path])
}

export function generateSlug(naam) {
  return naam
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

// ── Sponsor groepen ───────────────────────────────────────────────────────────

export async function getSponsorGroepen() {
  return supabase
    .from('sponsor_groepen')
    .select('*')
    .order('volgorde', { ascending: true })
}

export async function createSponsorGroep(data) {
  return supabase.from('sponsor_groepen').insert([data]).select().single()
}

export async function updateSponsorGroep(id, data) {
  return supabase.from('sponsor_groepen').update(data).eq('id', id).select().single()
}

export async function deleteSponsorGroep(id) {
  return supabase.from('sponsor_groepen').delete().eq('id', id)
}
