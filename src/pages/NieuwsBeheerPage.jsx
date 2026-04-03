import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchAllNewsItems, deleteNewsItem, updateNewsItem } from '../services/news'

function getStatus(item) {
  const now = new Date()
  if (item.expires_at && new Date(item.expires_at) < now) {
    return { label: 'Verlopen', className: 'bg-red-100 text-red-700' }
  }
  if (!item.published_at || new Date(item.published_at) > now) {
    return { label: 'Concept', className: 'bg-yellow-100 text-yellow-700' }
  }
  return { label: 'Gepubliceerd', className: 'bg-green-100 text-green-700' }
}

export default function NieuwsBeheerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    if (location.state?.success) {
      setSuccess(location.state.success)
      navigate(location.pathname, { replace: true, state: {} })
      const timer = setTimeout(() => setSuccess(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [location.state]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await fetchAllNewsItems()
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }

  function isPublished(item) {
    const now = new Date()
    return item.published_at && new Date(item.published_at) <= now &&
      (!item.expires_at || new Date(item.expires_at) > now)
  }

  async function handleTogglePublished(item) {
    const published = isPublished(item)
    const { error: updateError } = await updateNewsItem(item.id, {
      published_at: published ? null : new Date().toISOString(),
    })
    if (updateError) { setError('Opslaan mislukt: ' + updateError.message); return }
    load()
  }

  async function handleDelete(id) {
    const { error: deleteError } = await deleteNewsItem(id)
    setDeleteConfirm(null)
    if (deleteError) {
      setError('Verwijderen mislukt: ' + deleteError.message)
      return
    }
    load()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to="/beheer" className="text-sm text-vvz-green hover:underline">&larr; Terug naar Beheer</Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Nieuws</h1>
        <Link
          to="/beheer/nieuws/nieuw"
          className="inline-flex items-center gap-2 bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuw nieuwsbericht
        </Link>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-lg mb-4">{success}</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">{error}</div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">Nog geen nieuwsberichten aangemaakt.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 font-medium text-gray-600">Titel</th>
                <th className="px-5 py-3 font-medium text-gray-600 hidden md:table-cell">Publicatiedatum</th>
                <th className="px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="px-5 py-3 font-medium text-gray-600 text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => {
                const status = getStatus(item)
                return (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <span className="text-gray-800">{item.title}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString('nl-NL')
                        : '\u2014'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTogglePublished(item)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${isPublished(item) ? 'bg-vvz-green' : 'bg-gray-300'}`}
                          aria-label={isPublished(item) ? `${item.title} depubliceren` : `${item.title} publiceren`}
                          title={isPublished(item) ? 'Depubliceren' : 'Publiceren'}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isPublished(item) ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                        </button>
                        <Link
                          to={`/beheer/nieuws/${item.id}`}
                          className="text-gray-400 hover:text-vvz-green transition-colors"
                          title="Bewerken"
                          aria-label={`${item.title} bewerken`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(item)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Verwijderen"
                          aria-label={`${item.title} verwijderen`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Verwijder bevestiging */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 id="delete-dialog-title" className="text-lg font-bold text-gray-800 mb-2">Verwijderen?</h2>
            <p className="text-sm text-gray-600 mb-5">
              Weet je zeker dat je <strong>{deleteConfirm.title}</strong> wilt verwijderen?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
