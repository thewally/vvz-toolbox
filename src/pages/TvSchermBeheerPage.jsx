import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTvInstellingen, saveTvInstellingen, DEFAULT_INSTELLINGEN } from '../services/tvInstellingen'

const SLIDE_OPTIES = [
  { key: 'activiteiten', label: 'Activiteiten', beschrijving: 'Komende activiteiten' },
  { key: 'huidige_wedstrijden', label: 'Wordt nu gespeeld', beschrijving: 'Wedstrijden die op dit moment gespeeld worden' },
  { key: 'afgelastingen', label: 'Afgelastingen', beschrijving: 'Afgelaste VVZ-wedstrijden' },
  { key: 'uitslagen_vandaag', label: 'Uitslagen van vandaag', beschrijving: 'Wedstrijduitslagen van de huidige dag' },
  { key: 'nog_te_spelen', label: 'Programma van vandaag', beschrijving: 'Wedstrijden die vandaag nog beginnen' },
  { key: 'programma_week', label: 'Programma deze week', beschrijving: 'Alle VVZ-wedstrijden t/m komende zaterdag' },
  { key: 'uitslagen_week', label: 'Uitslagen deze week', beschrijving: 'Uitslagen van de afgelopen 7 dagen' },
]

export default function TvSchermBeheerPage() {
  const [instellingen, setInstellingen] = useState(DEFAULT_INSTELLINGEN)
  const [laden, setLaden] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [melding, setMelding] = useState(null)

  useEffect(() => {
    fetchTvInstellingen().then(data => {
      setInstellingen(data)
      setLaden(false)
    })
  }, [])

  function setSlide(key, value) {
    setInstellingen(prev => ({ ...prev, slides: { ...prev.slides, [key]: value } }))
  }

  function setNieuwsAantal(key, value) {
    setInstellingen(prev => ({ ...prev, nieuws_aantal: { ...prev.nieuws_aantal, [key]: Math.max(1, Math.min(10, Number(value))) } }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setOpslaan(true)
    setMelding(null)
    try {
      await saveTvInstellingen(instellingen)
      setMelding({ type: 'success', text: 'Instellingen opgeslagen.' })
    } catch {
      setMelding({ type: 'error', text: 'Opslaan mislukt. Probeer het opnieuw.' })
    } finally {
      setOpslaan(false)
    }
  }

  if (laden) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6">
      <Link to="/beheer" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        &#8249; Terug naar Beheer
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-6">TV-scherm instellingen</h1>

      {melding && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${melding.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {melding.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Weergavetijd per dia</h2>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={5}
              max={120}
              value={instellingen.interval_seconden}
              onChange={e => setInstellingen(prev => ({ ...prev, interval_seconden: Math.max(5, Number(e.target.value)) }))}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
            />
            <span className="text-sm text-gray-600">seconden per dia (minimaal 5)</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Nieuws</h2>
          <div className="space-y-4">
            {[
              { slideKey: 'vvz_nieuws', aantalKey: 'vvz', label: "VVZ'49 Club Nieuws" },
              { slideKey: 'knvb_nieuws', aantalKey: 'knvb', label: 'KNVB Nieuws' },
            ].map(({ slideKey, aantalKey, label }) => (
              <div key={slideKey} className="flex items-center gap-4">
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instellingen.slides[slideKey] ?? true}
                    onChange={e => setSlide(slideKey, e.target.checked)}
                    className="w-4 h-4 accent-vvz-green cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                </label>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    disabled={!(instellingen.slides[slideKey] ?? true)}
                    value={instellingen.nieuws_aantal[aantalKey] ?? 3}
                    onChange={e => setNieuwsAantal(aantalKey, e.target.value)}
                    className="w-16 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green disabled:opacity-40"
                  />
                  <span className="text-sm text-gray-500">berichten</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Dia-onderwerpen</h2>
          <div className="space-y-3">
            {SLIDE_OPTIES.map(({ key, label, beschrijving }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instellingen.slides[key] ?? true}
                  onChange={e => setSlide(key, e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-vvz-green cursor-pointer flex-shrink-0"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{beschrijving}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={opslaan}
          className="w-full bg-vvz-green text-white font-medium py-2.5 px-4 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
        >
          {opslaan ? 'Opslaan…' : 'Opslaan'}
        </button>
      </form>
    </div>
  )
}
