import { Link } from 'react-router-dom'
import { TEAM_CONFIG } from '../lib/teamConfig'

const SENIOREN = ['selectie', 'veteranen', 'derde', 'zesde', '30-vrouwen', '35-mannen', '45-mannen']
const JEUGD = TEAM_CONFIG.filter(t => !SENIOREN.includes(t.slug))
const SENIORS = TEAM_CONFIG.filter(t => SENIOREN.includes(t.slug))

function TeamKaartje({ team }) {
  return (
    <Link
      to={`/wedstrijden/${team.slug}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-vvz-green/40 transition-all"
    >
      <span className="font-medium text-gray-800 group-hover:text-vvz-green">{team.weergaveNaam}</span>
    </Link>
  )
}

export default function WedstrijdenTeamsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <section className="mb-8">
        <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">Senioren</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SENIORS.map(team => <TeamKaartje key={team.slug} team={team} />)}
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">Jeugd</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {JEUGD.map(team => <TeamKaartje key={team.slug} team={team} />)}
        </div>
      </section>
    </div>
  )
}
