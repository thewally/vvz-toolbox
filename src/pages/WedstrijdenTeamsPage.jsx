import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTeams } from '../services/wedstrijden'

export default function WedstrijdenTeamsPage() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadTeams()
  }, [])

  async function loadTeams() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await getTeams()
    if (err) {
      setError(err.message)
    } else {
      setTeams(data ?? [])
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
          Kon teams niet laden: {error}
          <button onClick={loadTeams} className="ml-3 underline font-medium">Opnieuw proberen</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {teams.map(team => (
          <Link
            key={team.teamcode}
            to={`/wedstrijden/teams/${team.teamcode}`}
            className="flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-vvz-green/30 transition-all text-center"
          >
            <span className="font-semibold text-gray-800">{team.teamnaam}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
