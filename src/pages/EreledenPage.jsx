import { useEffect, useState } from 'react'
import { fetchEreleden } from '../services/ereleden'

const CATEGORIE_LABELS = {
  erevoorzitter: 'Erevoorzitters',
  erelid: 'Ereleden',
  lid_van_verdienste: 'Leden van verdienste',
}

const CATEGORIE_ORDER = ['erevoorzitter', 'erelid', 'lid_van_verdienste']

export default function EreledenPage() {
  const [ereleden, setEreleden] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchEreleden()
      if (error) setError(error.message)
      else setEreleden(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
          Kon ereleden niet laden: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Galerij der Ereleden &amp; Leden van Verdienste</h1>

      {CATEGORIE_ORDER.map(cat => {
        const items = ereleden.filter(e => e.categorie === cat)
        if (items.length === 0) return null
        return (
          <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-vvz-green italic">{CATEGORIE_LABELS[cat]}</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="px-6 py-2 text-left w-20">Jaar</th>
                  <th className="px-6 py-2 text-left">Naam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-2.5 text-sm text-gray-500 tabular-nums">{item.jaar}</td>
                    <td className="px-6 py-2.5 text-sm text-gray-800">
                      {item.naam}
                      {item.overleden && <span className="ml-1.5 text-gray-400">†</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
