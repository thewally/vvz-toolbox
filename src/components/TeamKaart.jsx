import { useState } from 'react'
import { Link } from 'react-router-dom'
import { teamFotoUrl } from '../services/sportlink'
import { formatTeamnaam } from '../services/wedstrijdenHelpers'

// Placeholder in de vorm van een teamfoto: achter 4 kleinere poppetjes, voor 3 grotere (verspringend).
// Coordinaten in een viewBox van 120x90 (4:3); x = midden van het poppetje, bodem = onderkant.
const POPPETJES = [
  ...[20, 47, 73, 100].map((x) => ({ rij: 'achter', x, bodem: 62, s: 1.7 })),
  ...[33, 60, 87].map((x) => ({ rij: 'voor', x, bodem: 90, s: 2.4 })),
]

// Gedeelde teamkaart voor alle teamoverzichten. De groeps-placeholder staat er altijd onder,
// de miniatuur van de teamfoto komt er (lazy) overheen. Bij een fout (404, netwerk) verdwijnt de img.
// prioriteit: 'hoog' (eager + fetchpriority high), 'normaal' (eager) of 'laag' (lazy, standaard).
export default function TeamKaart({ team, prioriteit = 'laag' }) {
  const [fotoFout, setFotoFout] = useState(false)
  const [fotoGeladen, setFotoGeladen] = useState(false)

  return (
    <Link
      to={`/teams/${team.teamcode}`}
      className="group flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-w-0 hover:shadow-md hover:border-vvz-green/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-vvz-green transition-all"
    >
      <div className="relative aspect-[4/3] bg-gray-100 flex items-end justify-center overflow-hidden" aria-hidden="true">
        <svg viewBox="0 0 120 90" aria-hidden="true" className="absolute inset-0 w-full h-full text-gray-300 group-hover:text-vvz-green/40 transition-colors" fill="currentColor">
          {POPPETJES.map((p) => (
            <g
              key={`${p.rij}-${p.x}`}
              transform={`translate(${p.x - 12 * p.s} ${p.bodem - 22 * p.s}) scale(${p.s})`}
              fillOpacity={p.rij === 'achter' ? 0.65 : 1}
              stroke={p.rij === 'voor' ? '#f3f4f6' : 'none'}
              strokeWidth={p.rij === 'voor' ? 0.7 : 0}
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
            </g>
          ))}
        </svg>
        {!fotoFout && (
          <img
            src={teamFotoUrl(team.teamcode)}
            alt=""
            loading={prioriteit === 'laag' ? 'lazy' : 'eager'}
            fetchpriority={prioriteit === 'hoog' ? 'high' : undefined}
            decoding="async"
            ref={(el) => { if (el && el.complete && el.naturalWidth > 0) setFotoGeladen(true) }}
            onLoad={() => setFotoGeladen(true)}
            onError={() => setFotoFout(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${fotoGeladen ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>
      <h4 className="px-3 py-3 text-center font-semibold text-gray-800 break-words">{formatTeamnaam(team) || team.teamnaam}</h4>
    </Link>
  )
}
