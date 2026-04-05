import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { updatePassword } from '../services/auth'

export default function WachtwoordInstellenPage() {
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState(null) // null = laden, true/false
  const navigate = useNavigate()

  useEffect(() => {
    // Luister op het SIGNED_IN event — dit wordt getriggerd na het accepteren van een invite
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setHasSession(true)
      }
    })

    // Check of er al een sessie is (kan al bestaan als het event eerder gefired is)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true)
    })

    // Als er na 3 seconden nog geen sessie is, toon foutmelding
    const timeout = setTimeout(() => {
      setHasSession(prev => prev === null ? false : prev)
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

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
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/profiel'), 2000)
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
          <p>Geen geldige uitnodigingslink gevonden.</p>
          <p className="text-sm mt-2">Gebruik de link uit de uitnodigingsmail om je account te activeren.</p>
        </div>
      </div>
    )
  }

  // Succes
  if (success) {
    return (
      <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg text-center">
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4">
          <p className="font-medium">Je wachtwoord is ingesteld!</p>
          <p className="text-sm mt-1">Je wordt doorgestuurd naar je profiel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Welkom!</h2>
      <p className="text-sm text-gray-600 mb-6 text-center">Stel je wachtwoord in om je account te activeren.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord bevestigen</label>
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
