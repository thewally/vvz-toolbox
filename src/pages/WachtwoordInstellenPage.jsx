import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { updatePassword } from '../services/auth'
import { markPasswordSet } from '../services/profiles'

export default function WachtwoordInstellenPage() {
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState(null) // null = laden, true/false

  // Invite flow: sla sessie-tokens op zodat we tijdelijk kunnen inloggen bij submit
  const [savedSession, setSavedSession] = useState(null)
  const [savedUserId, setSavedUserId] = useState(null)
  const isInviteFlowRef = useRef(false)

  const navigate = useNavigate()

  useEffect(() => {
    const search = window.location.search
    const params = new URLSearchParams(search)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const isInvite = !!accessToken && !!refreshToken
    isInviteFlowRef.current = isInvite

    if (isInvite) {
      // Invite flow: parse tokens direct uit de URL query string
      // callback.html zet de tokens als query params, niet als hash fragment,
      // dus Supabase detecteert ze niet automatisch. We verwerken ze handmatig.
      ;(async () => {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error || !data.session) {
          setHasSession(false)
          return
        }
        setSavedSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        setSavedUserId(data.session.user.id)
        await supabase.auth.signOut()
        setHasSession(true)

        // Verwijder tokens uit de URL voor de veiligheid
        const cleanParams = new URLSearchParams(search)
        cleanParams.delete('access_token')
        cleanParams.delete('refresh_token')
        cleanParams.delete('token_type')
        cleanParams.delete('expires_in')
        cleanParams.delete('expires_at')
        cleanParams.delete('type')
        const cleanSearch = cleanParams.toString()
        const cleanUrl = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '')
        window.history.replaceState(null, '', cleanUrl)
      })()
    } else {
      // Geen invite-link: check of gebruiker al ingelogd is (bijv. via password_set=false redirect)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // Gebruiker is ingelogd maar heeft nog geen wachtwoord ingesteld
          setSavedUserId(session.user.id)
          setHasSession(true)
        } else {
          navigate('/login', { replace: true })
        }
      })
    }
  }, [navigate])

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

    if (isInviteFlowRef.current) {
      // Invite flow: herstel sessie tijdelijk, stel wachtwoord in, log uit
      if (!savedSession) {
        setLoading(false)
        setError('Sessie verlopen. Gebruik de link uit de uitnodigingsmail opnieuw.')
        return
      }

      const { error: sessionError } = await supabase.auth.setSession(savedSession)
      if (sessionError) {
        setLoading(false)
        setError('Sessie verlopen. Gebruik de link uit de uitnodigingsmail opnieuw.')
        return
      }

      const { error: pwError } = await updatePassword(newPassword)
      if (pwError) {
        await supabase.auth.signOut()
        setLoading(false)
        setError(pwError.message)
        return
      }

      if (savedUserId) await markPasswordSet(savedUserId)
      await supabase.auth.signOut()
    } else {
      // Bestaande sessie: stel wachtwoord direct in
      const { error: pwError } = await updatePassword(newPassword)
      if (pwError) {
        setLoading(false)
        setError(pwError.message)
        return
      }

      if (savedUserId) await markPasswordSet(savedUserId)
      await supabase.auth.signOut()
    }

    setLoading(false)
    setSuccess(true)
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
          <p className="text-sm mt-1">Je kunt nu inloggen met je e-mailadres en wachtwoord.</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="inline-block bg-vvz-green text-white px-6 py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors"
        >
          Naar inloggen
        </button>
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
