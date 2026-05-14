import { supabase } from '../lib/supabaseClient'

export async function fetchKnvbNieuws() {
  const { data, error } = await supabase.functions.invoke('knvb-nieuws')
  if (error) return []
  return Array.isArray(data) ? data : []
}
