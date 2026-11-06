import { useState } from 'react'
import { Link } from 'react-router-dom'
import { teamFotoUrl } from '../services/sportlink'
import { formatTeamnaam } from '../services/wedstrijdenHelpers'

// Gedeelde teamkaart voor alle teamoverzichten. Het grijze silhouet staat er altijd onder,
// de miniatuur van de teamfoto komt er (lazy) overheen. Bij een fout (404, netwerk) verdwijnt de img.
export default function TeamKaart({ team }) {
  const [fotoFout, setFotoFout] = useState(false)

  return (
    <Link
      to={`/teams/${team.teamcode}`}
      className="group flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-w-0 hover:shadow-md hover:border-vvz-green/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-vvz-green transition-all"
    >
      <div className="relative aspect-[4/3] bg-gray-100 flex items-end justify-center overflow-hidden" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="w-1/2 h-auto text-gray-300 group-hover:text-vvz-green/40 transition-colors" fill="currentColor">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
        </svg>
        {!fotoFout && (
          <img
            src={teamFotoUrl(team.teamcode)}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFotoFout(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>
      <h4 className="px-3 py-3 text-center font-semibold text-gray-800 break-words">{formatTeamnaam(team) || team.teamnaam}</h4>
    </Link>
  )
}
