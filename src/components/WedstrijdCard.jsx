import { Link } from 'react-router-dom'
import { isThuis, teamNaamNaarSlug } from '../services/wedstrijdenHelpers'
import { CLUB_RELATIECODE } from '../services/sportlink'

export default function WedstrijdCard({ wedstrijd }) {
  const thuis = isThuis(wedstrijd)
  const datum = new Date(wedstrijd.wedstrijddatum)
  const datumStr = datum.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  // Bepaal eigen teamnaam en slug
  const eigenTeam = thuis ? wedstrijd.thuisteam : wedstrijd.uitteam
  const slug = teamNaamNaarSlug(eigenTeam)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{datumStr}</span>
        <div className="flex items-center gap-2">
          {wedstrijd.aanvangstijd && (
            <span className="text-sm text-gray-500">{wedstrijd.aanvangstijd}</span>
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              thuis
                ? 'bg-vvz-green/10 text-vvz-green'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {thuis ? 'Thuis' : 'Uit'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-base">
        <span className={wedstrijd.thuisteamclubrelatiecode === CLUB_RELATIECODE ? 'font-bold text-vvz-green' : ''}>
          {wedstrijd.thuisteam}
        </span>
        <span className="text-gray-400">-</span>
        <span className={wedstrijd.uitteamclubrelatiecode === CLUB_RELATIECODE ? 'font-bold text-vvz-green' : ''}>
          {wedstrijd.uitteam}
        </span>
      </div>

      {(wedstrijd.accommodatie || wedstrijd.plaats) && (
        <p className="text-sm text-gray-400 mt-1">
          {[wedstrijd.accommodatie, wedstrijd.plaats].filter(Boolean).join(', ')}
        </p>
      )}

      {slug && (
        <Link
          to={`/wedstrijden/${slug}`}
          className="inline-block mt-2 text-sm text-vvz-green hover:underline"
        >
          Bekijk teampagina
        </Link>
      )}
    </div>
  )
}
