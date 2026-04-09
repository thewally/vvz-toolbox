import { supabase } from '../lib/supabaseClient'

// --- Groepen ---

export async function fetchVolunteerGroups() {
  const { data, error } = await supabase
    .from('volunteer_groups')
    .select('*, volunteer_vacancies(*, committee_members(naam, emailadres, telefoonnummer))')
    .order('sort_order')
    .order('sort_order', { referencedTable: 'volunteer_vacancies' })
  return { data, error }
}

export async function createVolunteerGroup({ naam, sort_order }) {
  const { data, error } = await supabase
    .from('volunteer_groups')
    .insert({ naam, sort_order })
    .select()
    .single()
  return { data, error }
}

export async function updateVolunteerGroup(id, updates) {
  const { data, error } = await supabase
    .from('volunteer_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteVolunteerGroup(id) {
  const { error } = await supabase
    .from('volunteer_groups')
    .delete()
    .eq('id', id)
  return { error }
}

// --- Vacatures ---

export async function createVolunteerVacancy({ group_id, titel, beschrijving, contact_member_id, contact_naam, contact_email, contact_telefoon, sort_order, actief }) {
  const { data, error } = await supabase
    .from('volunteer_vacancies')
    .insert({ group_id, titel, beschrijving, contact_member_id, contact_naam, contact_email, contact_telefoon, sort_order, actief })
    .select()
    .single()
  return { data, error }
}

export async function updateVolunteerVacancy(id, updates) {
  const { data, error } = await supabase
    .from('volunteer_vacancies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteVolunteerVacancy(id) {
  const { error } = await supabase
    .from('volunteer_vacancies')
    .delete()
    .eq('id', id)
  return { error }
}

// --- Bulk sort ---

export async function updateVolunteerGroupOrder(updates) {
  // updates = [{ id, sort_order }]
  for (const u of updates) {
    const { error } = await supabase
      .from('volunteer_groups')
      .update({ sort_order: u.sort_order })
      .eq('id', u.id)
    if (error) return { error }
  }
  return { error: null }
}

export async function updateVolunteerVacancyOrder(updates) {
  // updates = [{ id, sort_order }]
  for (const u of updates) {
    const { error } = await supabase
      .from('volunteer_vacancies')
      .update({ sort_order: u.sort_order })
      .eq('id', u.id)
    if (error) return { error }
  }
  return { error: null }
}

// --- Contact lookup ---

export async function fetchCommitteeMembersFlat() {
  const { data, error } = await supabase
    .from('committee_members')
    .select('id, naam, emailadres, telefoonnummer')
    .order('naam')
  return { data, error }
}
