import { useEffect, useState } from 'react'
import { inviteUser, fetchUsers, deleteUser } from '../services/auth'

export default function GebruikersBeheerPage() {
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

  async function loadUsers() {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchUsers()
    if (error) {
      setError(error.message || 'Kon gebruikers niet ophalen.')
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
      setInviteError(error.message || 'Uitnodiging versturen mislukt.')
    } else {
      setInviteSuccess(`Uitnodiging verstuurd naar ${inviteEmail}.`)
      setInviteEmail('')
      setInviteName('')
      loadUsers()
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    const { error } = await deleteUser(deleteConfirm.id)
    setDeleteLoading(false)
    if (error) {
      setError(error.message || 'Verwijderen mislukt.')
    } else {
      setDeleteConfirm(null)
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
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aangemaakt</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {u.user_metadata?.display_name || u.display_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('nl-NL') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.app_metadata?.role === 'admin' ? (
                      <span className="text-xs text-gray-400 italic">Beheerder</span>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(u)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      >
                        Verwijderen
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
