import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchTeams } from '../services/teams'
import { updateFavoriteTeam } from '../services/profiles'
import { hasEmailProvider, updatePassword, deleteAccount } from '../services/auth'

export default function ProfielPage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()

  // Voorkeursteam
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  // Wachtwoord wijzigen
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)

  // Account verwijderen
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    fetchTeams().then(({ data }) => {
      if (data) setTeams(data)
    })
  }, [])

  useEffect(() => {
    if (profile) {
      setSelectedTeam(profile.favorite_team_id || '')
    }
  }, [profile])

  async function handleSaveTeam(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    const { error } = await updateFavoriteTeam(user.id, selectedTeam || null)
    setSaving(false)
    if (error) {
      setSaveMsg({ type: 'error', text: 'Opslaan mislukt: ' + error.message })
    } else {
      setSaveMsg({ type: 'success', text: 'Voorkeursteam opgeslagen.' })
      await refreshProfile()
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwMsg(null)

    if (newPassword.length < 8) {
      setPwMsg({ type: 'error', text: 'Wachtwoord moet minimaal 8 tekens bevatten.' })
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setPwMsg({ type: 'error', text: 'Wachtwoorden komen niet overeen.' })
      return
    }

    setPwLoading(true)
    const { error } = await updatePassword(newPassword)
    setPwLoading(false)

    if (error) {
      setPwMsg({ type: 'error', text: error.message })
    } else {
      setPwMsg({ type: 'success', text: 'Je wachtwoord is gewijzigd.' })
      setNewPassword('')
      setNewPasswordConfirm('')
      setTimeout(() => setPwMsg(null), 5000)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await deleteAccount()
    if (error) {
      setDeleting(false)
      setDeleteError(error.message || 'Er is iets misgegaan bij het verwijderen van je account. Probeer het later opnieuw.')
    } else {
      await signOut()
      navigate('/', { replace: true })
    }
  }

  const showPasswordSection = hasEmailProvider(user)

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Mijn profiel</h2>

      {/* Profiel info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
          <input
            type="text"
            value={profile?.display_name || ''}
            readOnly
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
          <input
            type="email"
            value={user?.email || ''}
            readOnly
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
          />
        </div>
      </div>

      {/* Voorkeursteam */}
      <form onSubmit={handleSaveTeam} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voorkeursteam</label>
          <select
            value={selectedTeam}
            onChange={e => setSelectedTeam(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-transparent"
          >
            <option value="">Geen voorkeur</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        {saveMsg && (
          <div className={`text-sm p-3 rounded-lg ${saveMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {saveMsg.text}
          </div>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-vvz-green text-white py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Bezig...' : 'Opslaan'}
        </button>
      </form>

      {/* Wachtwoord wijzigen (alleen voor e-mail users) */}
      {showPasswordSection && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Wachtwoord wijzigen</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nieuw wachtwoord</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Minimaal 8 tekens</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nieuw wachtwoord bevestigen</label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={e => setNewPasswordConfirm(e.target.value)}
                required
                minLength={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-transparent"
              />
            </div>
            {pwMsg && (
              <div className={`text-sm p-3 rounded-lg ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {pwMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={pwLoading}
              className="w-full bg-vvz-green text-white py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
            >
              {pwLoading ? 'Bezig...' : 'Wachtwoord wijzigen'}
            </button>
          </form>
        </div>
      )}

      {/* Account verwijderen */}
      <div className="mt-8 pt-6 border-t border-red-200">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Account verwijderen</h3>
        <p className="text-sm text-gray-600 mb-4">
          Als je je account verwijdert, worden al je gegevens permanent verwijderd. Dit kan niet ongedaan worden gemaakt.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Account verwijderen
        </button>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-red-700 mb-3">Account verwijderen</h3>
            <p className="text-sm text-gray-600 mb-4">
              Weet je zeker dat je je account wilt verwijderen? Dit kan niet ongedaan worden gemaakt. Al je gegevens worden permanent verwijderd.
            </p>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">
                {deleteError}
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white w-full py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Bezig met verwijderen...' : 'Ja, verwijder mijn account'}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError(null) }}
                disabled={deleting}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 w-full py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
