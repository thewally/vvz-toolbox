import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { inviteUser, fetchUsers, deleteUser, setUserRole } from '../services/auth'

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

  useEffect(() => {
    if (user && user.app_metadata?.role !== 'admin') {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

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
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">E-mail</th>
                <th className="hidden sm:table-cell px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aangemaakt</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {u.user_metadata?.display_name || u.display_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] sm:max-w-none truncate">{u.email}</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('nl-NL') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {u.id === user?.id ? (
                      <span className="text-xs text-gray-300 italic">Jijzelf</span>
                    ) : (
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
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => setDeleteConfirm(u)}
                        aria-label={`Verwijder ${u.user_metadata?.display_name || u.email}`}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
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
