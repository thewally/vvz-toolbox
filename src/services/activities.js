import { supabase } from '../lib/supabaseClient'

export async function fetchActivities({ hidePast = false } = {}) {
  let query = supabase
    .from('activities')
    .select('*')
    .order('sort_date', { ascending: true })

  if (hidePast) {
    const today = new Date().toISOString().slice(0, 10)
    query = query.gte('sort_date', today)
  }

  const { data, error } = await query
  return { data, error }
}

export async function createActivities(rows) {
  const { data, error } = await supabase.from('activities').insert(rows)
  return { data, error }
}

export async function updateActivity(id, updates) {
  const { data, error } = await supabase
    .from('activities')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  return { data, error }
}

export async function deleteActivity(id) {
  const { data, error } = await supabase.from('activities').delete().eq('id', id)
  return { data, error }
}

export async function deleteActivityGroup(groupId) {
  const { data, error } = await supabase.from('activities').delete().eq('group_id', groupId)
  return { data, error }
}

/**
 * Convert form data to insert rows for the activities table.
 * Handles single date, date range, and date list modes.
 */
export function formDataToRows({ title, description, dateType, date, dateStart, dateEnd, dates, timeStart, timeEnd, url }) {
  const base = {
    title,
    description: description || '',
    date: null,
    date_start: null,
    date_end: null,
    dates_item: null,
    group_id: null,
    time_start: timeStart || null,
    time_end: timeEnd || null,
    url: url || null,
    sort_date: '',
  }

  if (dateType === 'single') {
    return [{ ...base, date, sort_date: date }]
  }

  if (dateType === 'range') {
    return [{ ...base, date_start: dateStart, date_end: dateEnd || null, sort_date: dateStart }]
  }

  // list
  const groupId = crypto.randomUUID()
  return dates.map(d => ({
    ...base,
    dates_item: d,
    group_id: groupId,
    sort_date: d,
  }))
}
