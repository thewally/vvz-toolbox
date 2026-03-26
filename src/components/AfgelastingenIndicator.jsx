import { useState, useEffect } from 'react'
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

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className={`rounded-full w-3 h-3 ${config.kleur}`} />
      <span className="text-sm text-gray-600">{config.label}</span>
    </div>
  )
}
