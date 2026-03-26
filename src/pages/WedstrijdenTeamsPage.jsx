import { Link } from 'react-router-dom'
import { TEAM_CONFIG } from '../lib/teamConfig'

export default function WedstrijdenTeamsPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TEAM_CONFIG.map(team => (
          <Link
            key={team.slug}
            to={`/wedstrijden/teams/${team.slug}`}
            className="flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-vvz-green/30 transition-all text-center"
          >
            <span className="font-semibold text-gray-800">{team.naam}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
