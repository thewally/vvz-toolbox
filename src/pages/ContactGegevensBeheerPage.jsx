import { useState, useEffect } from 'react'
import { fetchClubContactInfo, updateClubContactInfo } from '../services/clubContact'

const VELDEN = [
  { key: 'clubnaam', label: 'Clubnaam' },
  { key: 'post_straat', label: 'Straat (post)' },
  { key: 'post_huisnummer', label: 'Huisnummer (post)' },
  { key: 'post_postcode', label: 'Postcode (post)' },
  { key: 'post_plaats', label: 'Plaats (post)' },
  { key: 'telefoonnummer', label: 'Telefoonnummer' },
  { key: 'email', label: 'E-mailadres', type: 'email' },
  { key: 'website', label: 'Website' },
  { key: 'iban', label: 'IBAN' },
  { key: 'kvk_nummer', label: 'KVK-nummer' },
  { key: 'facebook_url', label: 'Facebook URL' },
  { key: 'instagram_url', label: 'Instagram URL' },
  { key: 'twitter_handle', label: 'Twitter/X handle' },
  { key: 'youtube_url', label: 'YouTube URL' },
]

export default function ContactGegevensBeheerPage() {
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [melding, setMelding] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await fetchClubContactInfo()
      if (data) setForm(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMelding(null)
    const fields = {}
    for (const v of VELDEN) {
      fields[v.key] = form[v.key] || null
    }
    const { error } = await updateClubContactInfo(fields)
    setSaving(false)
    if (error) {
      setMelding({ type: 'error', text: error.message })
    } else {
      setMelding({ type: 'success', text: 'Contactgegevens opgeslagen.' })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Contactgegevens beheren</h1>

      {melding && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${melding.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {melding.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        {VELDEN.map(v => (
          <div key={v.key}>
            <label htmlFor={`field-${v.key}`} className="block text-sm font-medium text-gray-700 mb-1">{v.label}</label>
            <input
              id={`field-${v.key}`}
              type={v.type || 'text'}
              value={form[v.key] || ''}
              onChange={e => setForm(f => ({ ...f, [v.key]: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-vvz-green text-white font-medium py-2 px-4 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </form>
    </div>
  )
}
