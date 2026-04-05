import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { updatePassword } from '../services/auth'
import { useAuth } from '../context/AuthContext'

export default function WachtwoordResettenPage() {
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState(null) // null = laden, true/false
  const { pendingPasswordRecovery } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // AuthContext vangt PASSWORD_RECOVERY op vóór deze pagina laadt (race condition).
    // Controleer eerst of het event al verwerkt is via context.
    if (pendingPasswordRecovery) {
      setHasSession(true)
      return
    }

    // Fallback: luister zelf ook voor het geval de pagina sneller laadt dan AuthContext
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true)
      }
    })

    const timeout = setTimeout(() => {
      setHasSession(prev => prev === null ? false : prev)
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [pendingPasswordRecovery])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens bevatten.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }

    setLoading(true)
    const { error } = await updatePassword(newPassword)
    setLoading(false)

    if (error) {
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        setError('Deze link is verlopen of ongeldig.')
      } else {
        setError(error.message)
      }
    } else {
      setSuccess(true)
      // Uitloggen zodat de gebruiker opnieuw kan inloggen met het nieuwe wachtwoord
      await supabase.auth.signOut()
    }
  }

  // Laden
  if (hasSession === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green"></div>
      </div>
    )
  }

  // Geen geldige sessie
  if (!hasSession) {
    return (
      <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          <p>Geen geldige resetlink gevonden.</p>
        </div>
        <Link to="/wachtwoord-vergeten" className="text-sm text-vvz-green hover:underline">
          Vraag een nieuwe link aan
        </Link>
      </div>
    )
  }

  // Succes
  if (success) {
    return (
      <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg text-center">
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4">
          <p className="font-medium">Je wachtwoord is gewijzigd!</p>
        </div>
        <Link
          to="/login"
          className="inline-block bg-vvz-green text-white px-6 py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors"
        >
          Naar inloggen
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Nieuw wachtwoord instellen</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
            {error}
            {(error.includes('verlopen') || error.includes('ongeldig')) && (
              <Link to="/wachtwoord-vergeten" className="block mt-2 text-red-800 underline">
                Vraag een nieuwe link aan
              </Link>
            )}
          </div>
        )}
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
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-vvz-green text-white py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Bezig...' : 'Wachtwoord opslaan'}
        </button>
      </form>
    </div>
  )
}
