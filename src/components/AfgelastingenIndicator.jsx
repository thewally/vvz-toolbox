import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAfgelastingen, getProgramma } from '../services/wedstrijden'
import { getAfgelastingenNiveau } from '../services/wedstrijdenHelpers'

const NIVEAU_CONFIG = {
  groen: { kleur: 'bg-green-500', label: 'Geen afgelastingen' },
  geel: { kleur: 'bg-yellow-400', label: 'Wedstrijden afgelast' },
  oranje: { kleur: 'bg-orange-500', label: 'Thuiswedstrijden afgelast' },
  rood: { kleur: 'bg-red-500', label: 'Alle wedstrijden afgelast' },
}

export default function AfgelastingenIndicator() {
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

  const inner = (
    <>
      <span className={`rounded-full w-3 h-3 shrink-0 animate-pulse ${config.kleur}`} />
      <span className="text-sm font-semibold text-gray-700">{config.label}</span>
    </>
  )

  return (
    <Link to="/wedstrijden/afgelastingen" className="flex items-center gap-2 mb-4 hover:underline">
      {inner}
    </Link>
  )
}
