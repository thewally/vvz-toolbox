import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { inviteUser, fetchUsers, deleteUser, setUserRole } from '../services/auth'
import { AVAILABLE_ROLES, getAllUserRoles, assignRole, removeRole } from '../services/roles'

function mapInviteError(message) {
  if (!message) return 'Uitnodiging versturen mislukt. Probeer het opnieuw.'
  if (message.toLowerCase().includes('user already registered')) return 'Dit e-mailadres is al uitgenodigd.'
  return 'Uitnodiging versturen mislukt. Probeer het opnieuw.'
}

export default function GebruikersBeheerPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal state
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteSuccess, setInviteSuccess] = useState(null)

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Role state
  const [roleLoading, setRoleLoading] = useState(null)

  // Granulaire rollen state
  const [allUserRoles, setAllUserRoles] = useState([]) // { user_id, role_slug }[]
  const [rolesModalUser, setRolesModalUser] = useState(null)
  const [roleToggleLoading, setRoleToggleLoading] = useState(null) // role_slug being toggled
  const [roleToggleError, setRoleToggleError] = useState(null)

  async function loadAllUserRoles() {
    const { data, error } = await getAllUserRoles()
    if (!error && data) {
      setAllUserRoles(data)
    }
  }

  function getUserRoleSlugs(userId) {
    return allUserRoles.filter(r => r.user_id === userId).map(r => r.role_slug)
  }

  function getUserRoleCount(userId) {
    return allUserRoles.filter(r => r.user_id === userId).length
  }

  async function handleToggleUserRole(userId, roleSlug, currentlyHasRole) {
    setRoleToggleLoading(roleSlug)
    setRoleToggleError(null)
    const { error } = currentlyHasRole
      ? await removeRole(userId, roleSlug)
      : await assignRole(userId, roleSlug)
    setRoleToggleLoading(null)
    if (error) {
      setRoleToggleError('Rol wijzigen mislukt, probeer het opnieuw')
    } else {
      await loadAllUserRoles()
    }
  }

  async function loadUsers() {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchUsers()
    if (error) {
      setError('Kon gebruikerslijst niet ophalen. Probeer het opnieuw.')
    } else {
      setUsers(data?.users || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
    loadAllUserRoles()
  }, [])

  async function handleInvite(e) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    setInviteLoading(true)
    const { error } = await inviteUser(inviteEmail, inviteName)
    setInviteLoading(false)
    if (error) {
      setInviteError(mapInviteError(error.message))
    } else {
      setInviteEmail('')
      setInviteName('')
      setShowInvite(false)
      loadUsers()
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    const { error } = await deleteUser(deleteConfirm.id)
    setDeleteLoading(false)
    if (error) {
      setError('Verwijderen mislukt. Probeer het opnieuw.')
    } else {
      setDeleteConfirm(null)
      loadUsers()
    }
  }

  async function handleToggleRole(targetUser) {
    const isAdmin = targetUser.app_metadata?.role === 'admin'
    const newRole = isAdmin ? null : 'admin'
    setRoleLoading(targetUser.id)
    setError(null)
    const { error } = await setUserRole(targetUser.id, newRole)
    setRoleLoading(null)
    if (error) {
      setError(`Rol wijzigen mislukt: ${error.message || JSON.stringify(error)}`)
    } else {
      loadUsers()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gebruikers</h1>
        <button
          onClick={() => { setShowInvite(true); setInviteError(null); setInviteSuccess(null) }}
          className="bg-vvz-green text-white px-4 py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors"
        >
          Gebruiker uitnodigen
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">Laden...</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500">Geen gebruikers gevonden.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Naam</th>
                <th className="hidden sm:table-cell px-4 py-3 text-xs font-medium text-gray-500 uppercase">E-mail</th>
                <th className="hidden sm:table-cell px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aangemaakt</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    <div>{u.user_metadata?.display_name || u.display_name || '-'}</div>
                    <div className="sm:hidden text-xs text-gray-400 truncate max-w-[160px]">{u.email}</div>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('nl-NL') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {u.id === user?.id ? (
                      <span className="text-xs text-gray-300 italic">Jijzelf</span>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            role="switch"
                            aria-checked={u.app_metadata?.role === 'admin'}
                            aria-label={`Beheerder toggle voor ${u.user_metadata?.display_name || u.email}`}
                            onClick={() => handleToggleRole(u)}
                            disabled={roleLoading === u.id}
                            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out ${u.app_metadata?.role === 'admin' ? 'bg-vvz-green' : 'bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${u.app_metadata?.role === 'admin' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </button>
                          <span className={u.app_metadata?.role === 'admin' ? 'text-xs font-medium text-vvz-green' : 'text-xs text-gray-400'}>
                            {u.app_metadata?.role === 'admin' ? 'Beheerder' : 'Gebruiker'}
                          </span>
                        </div>
                        {u.app_metadata?.role !== 'admin' && (
                          <div className="mt-1">
                            {getUserRoleCount(u.id) > 0 ? (
                              <span className="text-xs text-gray-500">{getUserRoleCount(u.id)} {getUserRoleCount(u.id) === 1 ? 'rol' : 'rollen'}</span>
                            ) : (
                              <span className="text-xs text-gray-300 italic">Geen rollen</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {u.id !== user?.id && (
                      <div className="flex items-center justify-end gap-1">
                        {u.app_metadata?.role !== 'admin' && (
                          <button
                            onClick={() => { setRolesModalUser(u); setRoleToggleError(null) }}
                            aria-label={`Rollen bewerken voor ${u.user_metadata?.display_name || u.email}`}
                            className="text-gray-400 hover:text-vvz-green transition-colors p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(u)}
                          aria-label={`Verwijder ${u.user_metadata?.display_name || u.email}`}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Verwijder bevestiging modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Gebruiker verwijderen</h2>
            <p className="text-sm text-gray-600 mb-6">
              Weet je zeker dat je <span className="font-medium text-gray-800">{deleteConfirm.display_name || deleteConfirm.email}</span> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Bezig...' : 'Ja, verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rollen modal */}
      {rolesModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-0.5">
              Rollen voor {rolesModalUser.user_metadata?.display_name || rolesModalUser.display_name || rolesModalUser.email}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{rolesModalUser.email}</p>
            {roleToggleError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-3">{roleToggleError}</div>
            )}
            <div className="divide-y divide-gray-100">
              {AVAILABLE_ROLES.map(role => {
                const hasThisRole = getUserRoleSlugs(rolesModalUser.id).includes(role.slug)
                const isToggling = roleToggleLoading === role.slug
                return (
                  <div key={role.slug} className="flex items-center justify-between min-h-[44px] py-2">
                    <span className="text-sm text-gray-700">{role.label}</span>
                    <button
                      role="switch"
                      aria-checked={hasThisRole}
                      aria-label={`${role.label} toggle`}
                      onClick={() => handleToggleUserRole(rolesModalUser.id, role.slug, hasThisRole)}
                      disabled={isToggling}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out ${hasThisRole ? 'bg-vvz-green' : 'bg-gray-200'} ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${hasThisRole ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setRolesModalUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uitnodig modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Gebruiker uitnodigen</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              {inviteError && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{inviteError}</div>
              )}
              {inviteSuccess && (
                <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg">{inviteSuccess}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-transparent"
                  placeholder="Voor- en achternaam"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-transparent"
                  placeholder="naam@voorbeeld.nl"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="bg-vvz-green text-white px-4 py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
                >
                  {inviteLoading ? 'Bezig...' : 'Uitnodigen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
