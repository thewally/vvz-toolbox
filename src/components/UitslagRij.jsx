import { CLUB_RELATIECODE } from '../services/sportlink'

export default function UitslagRij({ uitslag }) {
  const datum = new Date(uitslag.wedstrijddatum)
  const datumStr = datum.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm text-gray-400 w-20 shrink-0">{datumStr}</span>
        <span className={uitslag.thuisteamclubrelatiecode === CLUB_RELATIECODE ? 'font-bold text-vvz-green' : ''}>
          {uitslag.thuisteam}
        </span>
        <span className="text-gray-400">-</span>
        <span className={uitslag.uitteamclubrelatiecode === CLUB_RELATIECODE ? 'font-bold text-vvz-green' : ''}>
          {uitslag.uitteam}
        </span>
      </div>
      <span className="font-bold text-gray-800 ml-4">
        {uitslag.uitslag}
      </span>
    </div>
  )
}
