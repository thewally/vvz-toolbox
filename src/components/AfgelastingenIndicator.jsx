import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getAfgelastingen, getProgramma } from '../services/wedstrijden'
import { getAfgelastingenNiveau } from '../services/wedstrijdenHelpers'

const NIVEAU_CONFIG = {
  groen: { kleur: 'bg-green-500', label: 'Geen afgelastingen' },
  geel: { kleur: 'bg-yellow-400', label: 'Enkele wedstrijden afgelast' },
  oranje: { kleur: 'bg-orange-500', label: 'Alle thuiswedstrijden en enkele uitwedstrijden afgelast' },
  rood: { kleur: 'bg-red-500', label: 'Alle wedstrijden afgelast' },
}

const LEGENDA = [
  { kleur: 'bg-green-500', tekst: 'Geen afgelastingen' },
  { kleur: 'bg-yellow-400', tekst: 'Enkele wedstrijden afgelast' },
  { kleur: 'bg-orange-500', tekst: 'Alle thuiswedstrijden en enkele uitwedstrijden afgelast' },
  { kleur: 'bg-red-500', tekst: 'Alle wedstrijden afgelast' },
]

function InfoPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.preventDefault(); setOpen(o => !o) }}
        aria-label="Uitleg kleurcodes"
        className="text-white/60 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-50 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kleurcodes</p>
          <ul className="flex flex-col gap-2">
            {LEGENDA.map(({ kleur, tekst }) => (
              <li key={tekst} className="flex items-center gap-2">
                <span className={`shrink-0 rounded-full w-3 h-3 ${kleur}`} />
                <span className="text-sm text-gray-700">{tekst}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function AfgelastingenIndicator({ compact = false }) {
  const [niveau, setNiveau] = useState(null)

  useEffect(() => {
    async function laden() {
      const [afgelastRes, programmaRes] = await Promise.all([
        getAfgelastingen(),
        getProgramma(),
      ])
      if (afgelastRes.data && programmaRes.data) {
        setNiveau(getAfgelastingenNiveau(afgelastRes.data, programmaRes.data))
      }
    }
    laden()
  }, [])

  if (!niveau) return null

  const config = NIVEAU_CONFIG[niveau]

  // Compact: bolletje + tekst + info-icoon
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Link to="/wedstrijden/afgelastingen" className="flex items-center gap-1.5">
          <span className={`shrink-0 rounded-full w-3 h-3 animate-pulse ${config.kleur}`} />
          <span className="hidden sm:inline text-white/80 font-medium text-sm">{config.label}</span>
        </Link>
        <InfoPopover />
      </div>
    )
  }

  return (
    <Link to="/wedstrijden/afgelastingen" className="flex items-center gap-2 mb-4 hover:underline">
      <span className={`rounded-full w-3 h-3 shrink-0 animate-pulse ${config.kleur}`} />
      <span className="text-sm font-semibold text-black">{config.label}</span>
    </Link>
  )
}
