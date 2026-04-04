import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordReset } from '../services/auth'

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await sendPasswordReset(email)
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg text-center">
        <div className="bg-green-50 text-green-700 p-4 rounded-lg">
          <p>Als dit e-mailadres bij ons bekend is, ontvang je een e-mail met een link om je wachtwoord te resetten.</p>
        </div>
        <Link to="/login" className="mt-4 inline-block text-sm text-vvz-green hover:underline">
          Terug naar inloggen
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Wachtwoord vergeten</h2>
      <p className="text-sm text-gray-600 mb-6 text-center">
        Vul je e-mailadres in en we sturen je een link om je wachtwoord te resetten.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-vvz-green text-white py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Bezig...' : 'Verstuur resetlink'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        <Link to="/login" className="text-vvz-green hover:underline">Terug naar inloggen</Link>
      </p>
    </div>
  )
}
