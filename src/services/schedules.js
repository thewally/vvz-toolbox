import { supabase } from '../lib/supabaseClient'

export async function fetchSchedules() {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function fetchActiveSchedule() {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  return { data, error }
}

export async function createSchedule(payload) {
  const { data, error } = await supabase
    .from('schedules')
    .insert(payload)
    .select()
    .single()
  return { data, error }
}

export async function updateSchedule(id, updates) {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteSchedule(id) {
  const { data, error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
  return { data, error }
}

/**
 * Activeer een specifiek schema en deactiveer alle andere.
 * Gebruikt twee queries: eerst alles op inactive, dan het gewenste op active.
 */
export async function setActiveSchedule(id) {
  // Deactiveer alle schema's
  const { error: deactivateError } = await supabase
    .from('schedules')
    .update({ active: false })
    .neq('id', id)

  if (deactivateError) return { data: null, error: deactivateError }

  // Activeer het gewenste schema
  const { data, error } = await supabase
    .from('schedules')
    .update({ active: true })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}
