import { supabase } from '../lib/supabaseClient'

export async function fetchClubContactInfo() {
  const { data, error } = await supabase
    .from('club_contact_info')
    .select('*')
    .eq('id', 1)
    .single()
  return { data, error }
}

export async function updateClubContactInfo(fields) {
  const { data, error } = await supabase
    .from('club_contact_info')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single()
  return { data, error }
}
