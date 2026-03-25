import { supabase } from '../lib/supabaseClient'

export async function fetchSchedules() {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('valid_from', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function fetchActiveSchedules() {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('active', true)
    .order('valid_from', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
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

export async function toggleScheduleActive(id, active) {
  return updateSchedule(id, { active })
}

export async function copySchedule(id) {
  // Fetch source schedule
  const { data: source, error: fetchError } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchError) return { error: fetchError }

  // Create new schedule
  const { data: newSchedule, error: createError } = await supabase
    .from('schedules')
    .insert({
      name: `Kopie van ${source.name}`,
      valid_from: source.valid_from,
      valid_until: source.valid_until,
      active: false,
    })
    .select()
    .single()
  if (createError) return { error: createError }

  // Fetch training slots with their junction rows
  const { data: slots, error: slotsError } = await supabase
    .from('training_slots')
    .select('id, day_of_week, start_time, end_time, description, color, training_slot_fields(field_id), training_slot_teams(team_id)')
    .eq('schedule_id', id)
  if (slotsError) return { error: slotsError }

  if (slots && slots.length > 0) {
    for (const slot of slots) {
      // Insert new slot
      const { data: newSlot, error: slotInsertError } = await supabase
        .from('training_slots')
        .insert({ day_of_week: slot.day_of_week, start_time: slot.start_time, end_time: slot.end_time, description: slot.description, color: slot.color, schedule_id: newSchedule.id })
        .select('id')
        .single()
      if (slotInsertError) return { error: slotInsertError }

      // Copy field junction rows
      if (slot.training_slot_fields.length > 0) {
        const { error: fieldError } = await supabase
          .from('training_slot_fields')
          .insert(slot.training_slot_fields.map(f => ({ training_slot_id: newSlot.id, field_id: f.field_id })))
        if (fieldError) return { error: fieldError }
      }

      // Copy team junction rows
      if (slot.training_slot_teams.length > 0) {
        const { error: teamError } = await supabase
          .from('training_slot_teams')
          .insert(slot.training_slot_teams.map(t => ({ training_slot_id: newSlot.id, team_id: t.team_id })))
        if (teamError) return { error: teamError }
      }
    }
  }

  return { error: null }
}
