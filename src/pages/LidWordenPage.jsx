import { useState, useEffect } from 'react'
import { fetchLidWordenSettings, submitProeftrainingAanvraag } from '../services/lidWorden'

const LEEG_FORMULIER = {
  voornaam: '',
  achternaam: '',
  email: '',
  telefoon: '',
  geboortedatum: '',
}

export default function LidWordenPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(LEEG_FORMULIER)
  const [verzenden, setVerzenden] = useState(false)
  const [succes, setSucces] = useState(false)
  const [fout, setFout] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await fetchLidWordenSettings()
      setSettings(data)
      setLoading(false)
    }
    load()
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setVerzenden(true)
    setFout(null)

    const { error } = await submitProeftrainingAanvraag(form)
    setVerzenden(false)

    if (error) {
      setFout('Er ging iets mis bij het versturen. Probeer het opnieuw.')
    } else {
      setSucces(true)
      setForm(LEEG_FORMULIER)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-10 text-center">
        <p className="text-gray-500">Laden...</p>
      </div>
    )
  }

  const knvbUrl = settings?.knvb_url || 'https://www.knvb.nl/ontdek-voetbal/inschrijven/BBCC89Q'
  const introTekst = settings?.intro_tekst || 'Wil jij ook voetballen bij VVZ\'49? Meld je aan via het aanmeldformulier van de KNVB. Het invullen duurt maar een paar minuten!'

  return (
    <div className="max-w-2xl mx-auto p-4 pt-10">
      {/* Intro + KNVB link */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Lid worden?</h1>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed whitespace-pre-line">{introTekst}</p>

        <a
          href={knvbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-vvz-green text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-vvz-green-dark transition-colors shadow-md"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
          </svg>
          Aanmelden via KNVB
        </a>

        <p className="text-sm text-gray-400 mt-4">
          Je wordt doorgestuurd naar de website van de KNVB.
        </p>
      </div>

      {/* Proeftraining formulier */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Proeftraining aanvragen</h2>
        <p className="text-gray-500 mb-6 text-sm">
          Wil je eerst een keer komen kijken? Vraag een gratis proeftraining aan!
        </p>

        {succes ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
            <p className="font-semibold">Bedankt voor je aanvraag!</p>
            <p className="text-sm mt-1">We nemen zo snel mogelijk contact met je op om een proeftraining in te plannen.</p>
            <button
              onClick={() => setSucces(false)}
              className="mt-3 text-sm text-green-700 underline"
            >
              Nog een aanvraag doen
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              Indien u inschrijft voor uw kind, voer dan de naam, achternaam en geboortedatum van uw kind op en het e-mailadres en telefoonnummer van uzelf.
            </p>

            {/* Naam */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="voornaam" className="block text-sm font-medium text-gray-700 mb-1">Voornaam *</label>
                <input
                  type="text"
                  id="voornaam"
                  name="voornaam"
                  value={form.voornaam}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
                />
              </div>
              <div>
                <label htmlFor="achternaam" className="block text-sm font-medium text-gray-700 mb-1">Achternaam *</label>
                <input
                  type="text"
                  id="achternaam"
                  name="achternaam"
                  value={form.achternaam}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mailadres *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
                />
              </div>
              <div>
                <label htmlFor="telefoon" className="block text-sm font-medium text-gray-700 mb-1">Telefoonnummer *</label>
                <input
                  type="tel"
                  id="telefoon"
                  name="telefoon"
                  value={form.telefoon}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
                />
              </div>
            </div>

            {/* Geboortedatum */}
            <div className="max-w-xs">
              <label htmlFor="geboortedatum" className="block text-sm font-medium text-gray-700 mb-1">Geboortedatum *</label>
              <input
                type="date"
                id="geboortedatum"
                name="geboortedatum"
                value={form.geboortedatum}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
              />
            </div>

            {fout && (
              <p className="text-red-600 text-sm">{fout}</p>
            )}

            <button
              type="submit"
              disabled={verzenden}
              className="bg-vvz-green text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
            >
              {verzenden ? 'Versturen...' : 'Proeftraining aanvragen'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
