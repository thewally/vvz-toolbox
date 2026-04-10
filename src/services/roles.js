import { supabase } from '../lib/supabaseClient'

// Alle beschikbare rol-slugs (constante, matcht CHECK constraint)
export const AVAILABLE_ROLES = [
  { slug: 'activiteiten', label: 'Activiteiten' },
  { slug: 'trainingsschema', label: 'Trainingsschema' },
  { slug: 'sponsoring', label: 'Sponsoring' },
  { slug: 'ereleden', label: 'Ereleden' },
  { slug: 'contact', label: 'Contact' },
  { slug: 'content', label: "Pagina's & Nieuws" },
  { slug: 'gebruikers', label: 'Gebruikers' },
  { slug: 'vrijwilligers', label: 'Vrijwilligers' },
  { slug: 'lid-worden', label: 'Lid worden' },
]

// Rollen van de huidige ingelogde gebruiker ophalen
export async function getMyRoles() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: null }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role_slug')
    .eq('user_id', user.id)
  return { data: data?.map(r => r.role_slug) ?? [], error }
}

// Alle user-rol koppelingen ophalen (voor gebruikersbeheer)
export async function getAllUserRoles() {
  const { data, error } = await supabase.rpc('get_user_roles_for_management')
  return { data, error }
}

// Rol toekennen aan gebruiker
export async function assignRole(userId, roleSlug) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_slug: roleSlug,
      assigned_by: user?.id,
    })
    .select()
    .single()
  return { data, error }
}

// Rol verwijderen van gebruiker
export async function removeRole(userId, roleSlug) {
  const { data, error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_slug', roleSlug)
  return { data, error }
}
