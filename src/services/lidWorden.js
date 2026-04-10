import { supabase } from '../lib/supabaseClient'

export async function fetchLidWordenSettings() {
  const { data, error } = await supabase
    .from('lid_worden_settings')
    .select('*')
    .eq('id', 1)
    .single()
  return { data, error }
}

export async function updateLidWordenSettings(updates) {
  const { data, error } = await supabase
    .from('lid_worden_settings')
    .upsert({ id: 1, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single()
  return { data, error }
}

export async function submitProeftrainingAanvraag(aanvraag) {
  // TODO: Supabase Edge Function 'notify-proeftraining' nodig voor e-mailnotificatie
  const { data, error } = await supabase
    .from('proeftraining_aanvragen')
    .insert(aanvraag)
    .select()
    .single()
  return { data, error }
}

export async function fetchProeftrainingAanvragen() {
  const { data, error } = await supabase
    .from('proeftraining_aanvragen')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}
