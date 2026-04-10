import { useState, useEffect } from 'react'
import {
  fetchLidWordenSettings,
  updateLidWordenSettings,
  fetchProeftrainingAanvragen,
} from '../services/lidWorden'

export default function LidWordenBeheerPage() {
  const [tab, setTab] = useState('aanvragen')
  const [settings, setSettings] = useState(null)
  const [aanvragen, setAanvragen] = useState([])
  const [loading, setLoading] = useState(true)
  const [opslaan, setOpslaan] = useState(false)
  const [opslaanSucces, setOpslaanSucces] = useState(false)
  const [fout, setFout] = useState(null)

  // Settings form
  const [introTekst, setIntroTekst] = useState('')
  const [knvbUrl, setKnvbUrl] = useState('')
  const [notificatieEmail, setNotificatieEmail] = useState('')

  useEffect(() => {
    async function load() {
      const [settingsRes, aanvragenRes] = await Promise.all([
        fetchLidWordenSettings(),
        fetchProeftrainingAanvragen(),
      ])

      if (settingsRes.data) {
        setSettings(settingsRes.data)
        setIntroTekst(settingsRes.data.intro_tekst || '')
        setKnvbUrl(settingsRes.data.knvb_url || '')
        setNotificatieEmail(settingsRes.data.notificatie_email || '')
      }

      setAanvragen(aanvragenRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSaveSettings(e) {
    e.preventDefault()
    setOpslaan(true)
    setFout(null)
    setOpslaanSucces(false)

    const { error } = await updateLidWordenSettings({
      intro_tekst: introTekst || null,
      knvb_url: knvbUrl,
      notificatie_email: notificatieEmail || null,
    })

    setOpslaan(false)
    if (error) {
      setFout('Opslaan mislukt: ' + error.message)
    } else {
      setOpslaanSucces(true)
      setTimeout(() => setOpslaanSucces(false), 3000)
    }
  }

  function formatDatum(iso) {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function formatDatumTijd(iso) {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return <div className="p-4"><p className="text-gray-500">Laden...</p></div>
  }

  return (
    <div className="max-w-5xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Lid worden beheer</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('aanvragen')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'aanvragen'
              ? 'bg-white border border-b-white border-gray-200 -mb-px text-vvz-green'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Aanvragen ({aanvragen.length})
        </button>
        <button
          onClick={() => setTab('instellingen')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'instellingen'
              ? 'bg-white border border-b-white border-gray-200 -mb-px text-vvz-green'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Instellingen
        </button>
      </div>

      {/* Aanvragen tab */}
      {tab === 'aanvragen' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {aanvragen.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">Nog geen aanvragen ontvangen.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Datum</th>
                    <th className="px-4 py-3">Voor wie</th>
                    <th className="px-4 py-3">Naam</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Telefoon</th>
                    <th className="px-4 py-3">Geboortedatum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aanvragen.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDatumTijd(a.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.voor_wie === 'kind'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {a.voor_wie === 'kind' ? 'Kind' : 'Zelf'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{a.voornaam} {a.achternaam}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        <a href={`mailto:${a.email}`} className="text-vvz-green hover:underline">{a.email}</a>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        <a href={`tel:${a.telefoon}`} className="hover:underline">{a.telefoon}</a>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDatum(a.geboortedatum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Instellingen tab */}
      {tab === 'instellingen' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-xl shadow-md p-6 space-y-5 max-w-xl">
          <div>
            <label htmlFor="introTekst" className="block text-sm font-medium text-gray-700 mb-1">Introtekst</label>
            <textarea
              id="introTekst"
              value={introTekst}
              onChange={e => setIntroTekst(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
              placeholder="Wil jij ook voetballen bij VVZ'49?..."
            />
          </div>

          <div>
            <label htmlFor="knvbUrl" className="block text-sm font-medium text-gray-700 mb-1">KNVB aanmeld-URL *</label>
            <input
              type="url"
              id="knvbUrl"
              value={knvbUrl}
              onChange={e => setKnvbUrl(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
            />
          </div>

          <div>
            <label htmlFor="notificatieEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Notificatie e-mailadres
            </label>
            <input
              type="email"
              id="notificatieEmail"
              value={notificatieEmail}
              onChange={e => setNotificatieEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
              placeholder="ledenadministratie@vvz49.nl"
            />
            <p className="text-xs text-gray-400 mt-1">
              Bij nieuwe aanvragen wordt een notificatie gestuurd naar dit adres.
              {/* TODO: Supabase Edge Function 'notify-proeftraining' nodig voor daadwerkelijke e-mailnotificatie */}
            </p>
          </div>

          {fout && <p className="text-red-600 text-sm">{fout}</p>}
          {opslaanSucces && <p className="text-green-600 text-sm">Instellingen opgeslagen!</p>}

          <button
            type="submit"
            disabled={opslaan}
            className="bg-vvz-green text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
          >
            {opslaan ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}
    </div>
  )
}
