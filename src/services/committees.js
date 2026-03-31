import { supabase } from '../lib/supabaseClient'

export async function fetchCommittees() {
  const { data, error } = await supabase
    .from('committees')
    .select('*, committee_members(*)')
    .order('sort_order')
    .order('sort_order', { referencedTable: 'committee_members' })
  return { data, error }
}

export async function createCommittee({ name, sort_order }) {
  const { data, error } = await supabase
    .from('committees')
    .insert({ name, sort_order })
    .select()
    .single()
  return { data, error }
}

export async function updateCommittee(id, fields) {
  const { data, error } = await supabase
    .from('committees')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteCommittee(id) {
  const { error } = await supabase
    .from('committees')
    .delete()
    .eq('id', id)
  return { error }
}

export async function createCommitteeMember({ committee_id, name, phone, email, sort_order }) {
  const { data, error } = await supabase
    .from('committee_members')
    .insert({ committee_id, name, phone, email, sort_order })
    .select()
    .single()
  return { data, error }
}

export async function updateCommitteeMember(id, fields) {
  const { data, error } = await supabase
    .from('committee_members')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteCommitteeMember(id) {
  const { error } = await supabase
    .from('committee_members')
    .delete()
    .eq('id', id)
  return { error }
}
