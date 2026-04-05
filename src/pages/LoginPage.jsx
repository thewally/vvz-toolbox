import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const AUTH_PAGES = ['/login', '/wachtwoord-vergeten', '/wachtwoord-resetten', '/wachtwoord-instellen']
  const rawFrom = location.state?.from?.pathname || '/'
  const from = (rawFrom.startsWith('/') && !rawFrom.startsWith('//') && !AUTH_PAGES.includes(rawFrom)) ? rawFrom : '/'

  function mapLoginError(msg) {
    if (msg?.includes('Invalid login credentials')) return 'Ongeldig e-mailadres of wachtwoord.'
    if (msg?.includes('Email not confirmed')) return 'Je e-mailadres is nog niet bevestigd. Controleer je inbox.'
    if (msg?.includes('Too many requests') || msg?.includes('rate limit')) return 'Te veel pogingen. Probeer het later opnieuw.'
    return 'Er ging iets mis bij het inloggen. Probeer het opnieuw.'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(mapLoginError(error.message))
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Inloggen</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-transparent"
          />
        </div>
        <div className="text-right">
          <Link to="/wachtwoord-vergeten" className="text-sm text-vvz-green hover:underline">
            Wachtwoord vergeten?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-vvz-green text-white py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Bezig...' : 'Inloggen'}
        </button>
      </form>
    </div>
  )
}
