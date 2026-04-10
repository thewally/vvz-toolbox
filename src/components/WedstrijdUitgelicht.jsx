import { isThuis, getAanwezigheidstijd, getWhatsAppLink } from '../services/wedstrijdenHelpers'
import { CLUB_RELATIECODE } from '../services/sportlink'
import AgendaAbonneerKnop from './AgendaAbonneerKnop'

export default function WedstrijdUitgelicht({ wedstrijd, teamcode }) {
  if (!wedstrijd) return null

  const thuis = isThuis(wedstrijd)
  const datum = new Date(wedstrijd.wedstrijddatum)
  const datumStr = datum.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const aanwezigheid = wedstrijd.aanvangstijd
    ? getAanwezigheidstijd(wedstrijd.wedstrijddatum)
    : null
  const aanwezigheidStr = aanwezigheid
    ? aanwezigheid.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="bg-white rounded-xl border-2 border-vvz-green/20 p-6 mb-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Eerstvolgende wedstrijd
      </h3>

      <p className="text-gray-600 mb-1">{datumStr}</p>

      <div className="flex items-center gap-3 text-xl font-bold my-3">
        <span className={wedstrijd.thuisteamclubrelatiecode === CLUB_RELATIECODE ? 'text-vvz-green' : ''}>
          {wedstrijd.thuisteam}
        </span>
        <span className="text-gray-300">vs</span>
        <span className={wedstrijd.uitteamclubrelatiecode === CLUB_RELATIECODE ? 'text-vvz-green' : ''}>
          {wedstrijd.uitteam}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 mb-4">
        {wedstrijd.aanvangstijd && (
          <span>Aanvang: {wedstrijd.aanvangstijd}</span>
        )}
        {aanwezigheidStr && (
          <span>Aanwezig: {aanwezigheidStr}</span>
        )}
        {(wedstrijd.accommodatie || wedstrijd.plaats) && (
          <span>{[wedstrijd.accommodatie, wedstrijd.plaats].filter(Boolean).join(', ')}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={getWhatsAppLink(wedstrijd)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.121.553 4.113 1.519 5.845L.052 23.548l5.851-1.533A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.97 0-3.834-.548-5.44-1.5l-.39-.232-4.044 1.06 1.08-3.946-.254-.404A9.72 9.72 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
          </svg>
          Delen via WhatsApp
        </a>
        <AgendaAbonneerKnop teamcode={teamcode} />
      </div>
    </div>
  )
}
