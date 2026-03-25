import { supabase } from '../lib/supabaseClient'

const SLOT_SELECT = `
  *,
  training_slot_fields(field_id, fields(*)),
  training_slot_teams(team_id, teams(*))
`

function normalizeTime(t) {
  // Supabase returns time as "HH:MM:SS"; normalize to "HH:MM"
  return typeof t === 'string' && t.length > 5 ? t.slice(0, 5) : t
}

function flattenSlot(slot) {
  slot.fields = (slot.training_slot_fields || []).map(tsf => tsf.fields)
  delete slot.training_slot_fields
  slot.teams = (slot.training_slot_teams || []).map(tst => tst.teams)
  delete slot.training_slot_teams
  slot.start_time = normalizeTime(slot.start_time)
  slot.end_time = normalizeTime(slot.end_time)
}

export async function fetchTrainingSlots() {
  const { data, error } = await supabase
    .from('training_slots')
    .select(SLOT_SELECT)

  if (data) {
    for (const slot of data) {
      flattenSlot(slot)
    }
  }

  return { data, error }
}

export async function createTrainingSlot({ field_ids, team_ids, description, ...slotData }) {
  // Include description in the slot data if provided
  if (description !== undefined) slotData.description = description || null
  // 1. Insert the slot
  const { data: slot, error } = await supabase
    .from('training_slots')
    .insert(slotData)
    .select('*')
    .single()

  if (error) return { data: null, error }

  // 2. Insert field junction rows
  const fieldRows = field_ids.map(fid => ({ training_slot_id: slot.id, field_id: fid }))
  const { error: fieldError } = await supabase
    .from('training_slot_fields')
    .insert(fieldRows)

  if (fieldError) return { data: null, error: fieldError }

  // 3. Insert team junction rows
  const teamRows = team_ids.map(tid => ({ training_slot_id: slot.id, team_id: tid }))
  const { error: teamError } = await supabase
    .from('training_slot_teams')
    .insert(teamRows)

  if (teamError) return { data: null, error: teamError }

  // 4. Re-fetch with joins
  const { data: full, error: fetchError } = await supabase
    .from('training_slots')
    .select(SLOT_SELECT)
    .eq('id', slot.id)
    .single()

  if (full) flattenSlot(full)

  return { data: full, error: fetchError }
}

export async function updateTrainingSlot(id, { field_ids, team_ids, description, ...updates }) {
  // Include description in the updates if provided
  if (description !== undefined) updates.description = description || null
  // 1. Update the slot itself
  const { error } = await supabase
    .from('training_slots')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { data: null, error }

  // 2. Replace field junction rows
  const { error: delFieldError } = await supabase
    .from('training_slot_fields')
    .delete()
    .eq('training_slot_id', id)

  if (delFieldError) return { data: null, error: delFieldError }

  const fieldRows = field_ids.map(fid => ({ training_slot_id: id, field_id: fid }))
  const { error: insFieldError } = await supabase
    .from('training_slot_fields')
    .insert(fieldRows)

  if (insFieldError) return { data: null, error: insFieldError }

  // 3. Replace team junction rows
  const { error: delTeamError } = await supabase
    .from('training_slot_teams')
    .delete()
    .eq('training_slot_id', id)

  if (delTeamError) return { data: null, error: delTeamError }

  const teamRows = team_ids.map(tid => ({ training_slot_id: id, team_id: tid }))
  const { error: insTeamError } = await supabase
    .from('training_slot_teams')
    .insert(teamRows)

  if (insTeamError) return { data: null, error: insTeamError }

  // 4. Re-fetch
  const { data: full, error: fetchError } = await supabase
    .from('training_slots')
    .select(SLOT_SELECT)
    .eq('id', id)
    .single()

  if (full) flattenSlot(full)

  return { data: full, error: fetchError }
}

export async function deleteTrainingSlot(id) {
  const { data, error } = await supabase
    .from('training_slots')
    .delete()
    .eq('id', id)
  return { data, error }
}
