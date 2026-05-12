import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTournaments } from '../services/tournaments'

const DUTCH_MONTHS_LONG = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

const DUTCH_DAYS_LONG = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]

function formatDateLong(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return `${DUTCH_DAYS_LONG[d.getDay()]} ${d.getDate()} ${DUTCH_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

export default function ToernooienPage() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data, error: err } = await fetchTournaments({ onlyPublished: true })
      if (err) setError(err.message)
      else {
        // Sorteer oplopend op datum (komende eerst, gevolgd door verleden)
        const today = new Date().toISOString().slice(0, 10)
        const sorted = [...(data ?? [])].sort((a, b) => {
          const aFuture = a.date >= today
          const bFuture = b.date >= today
          if (aFuture !== bFuture) return aFuture ? -1 : 1
          if (aFuture) return a.date.localeCompare(b.date)
          return b.date.localeCompare(a.date)
        })
        setTournaments(sorted)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Toernooien</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {tournaments.length === 0 ? (
        <p className="text-gray-500">Er zijn momenteel geen toernooien gepubliceerd.</p>
      ) : (
        <div className="space-y-4">
          {tournaments.map(t => (
            <Link
              key={t.id}
              to={`/toernooien/${t.slug}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-6"
            >
              <h2 className="text-lg font-semibold text-vvz-green">{t.name}</h2>
              <p className="text-sm text-gray-500 mt-1 capitalize">{formatDateLong(t.date)}</p>
              {t.description && (
                <p className="text-sm text-gray-700 mt-2 line-clamp-3">{t.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
