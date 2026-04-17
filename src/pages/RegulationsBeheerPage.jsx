import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  updateDocument,
  formatFileSize,
} from '../services/documents'

export default function RegulationsBeheerPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Upload state
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Inline edit state
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await fetchDocuments()
    if (error) setError(error.message)
    else setDocuments(data ?? [])
    setLoading(false)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    const { error: uploadError } = await uploadDocument(file, title || file.name)
    setUploading(false)
    if (uploadError) {
      setError(uploadError.message)
      return
    }
    setFile(null)
    setTitle('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    await load()
  }

  function startEdit(doc) {
    setEditingId(doc.id)
    setEditingTitle(doc.title)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
  }

  async function saveEdit(doc) {
    const newTitle = editingTitle.trim()
    if (!newTitle || newTitle === doc.title) {
      cancelEdit()
      return
    }
    setSavingEdit(true)
    const { error } = await updateDocument(doc.id, { title: newTitle })
    setSavingEdit(false)
    if (error) {
      setError(error.message)
      return
    }
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, title: newTitle } : d))
    cancelEdit()
  }

  async function handleMove(doc, direction) {
    const idx = documents.findIndex(d => d.id === doc.id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= documents.length) return
    const other = documents[swapIdx]

    // Wissel sort_order
    const newOrderDoc = other.sort_order
    const newOrderOther = doc.sort_order
    // Als de sort_orders gelijk zijn of niet gezet, genereer nieuwe reeks op basis van index
    const orderA = newOrderDoc
    const orderB = newOrderOther

    // Optimistic update
    const updated = [...documents]
    updated[idx] = { ...doc, sort_order: orderA }
    updated[swapIdx] = { ...other, sort_order: orderB }
    updated.sort((a, b) => (a.sort_order - b.sort_order) || a.created_at.localeCompare(b.created_at))
    setDocuments(updated)

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      updateDocument(doc.id, { sort_order: orderA }),
      updateDocument(other.id, { sort_order: orderB }),
    ])
    if (e1 || e2) {
      setError((e1 || e2).message)
      await load()
    }
  }

  async function handleDelete(doc) {
    setDeleting(true)
    const { error } = await deleteDocument(doc.id, doc.file_path)
    setDeleting(false)
    setDeleteConfirm(null)
    if (error) {
      setError(error.message)
      return
    }
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to="/beheer" className="text-sm text-vvz-green hover:underline">&larr; Terug naar Beheer</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reglementen & Documenten</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Informatieblok over privacyverklaring */}
      <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm p-4 rounded-xl mb-6">
        <p>
          <strong>Let op:</strong> De privacyverklaring wordt automatisch opgehaald van Sportlink en is altijd
          zichtbaar op de reglementen-pagina. Dit document hoeft niet geüpload te worden.
        </p>
      </div>

      {/* Upload sectie */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Nieuw document uploaden</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Bijvoorbeeld: Huishoudelijk reglement"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bestand</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-vvz-green/10 file:text-vvz-green hover:file:bg-vvz-green/20"
            />
            {file && (
              <p className="text-xs text-gray-500 mt-1">
                {file.name} · {formatFileSize(file.size)}
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploaden...' : 'Uploaden'}
            </button>
          </div>
        </div>
      </div>

      {/* Lijst documenten */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Geüploade documenten</h2>
          <span className="text-xs text-gray-400">{documents.length}</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-vvz-green" />
          </div>
        ) : documents.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">Nog geen documenten geüpload.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {documents.map((doc, idx) => {
              const isFirst = idx === 0
              const isLast = idx === documents.length - 1
              const isEditing = editingId === doc.id
              return (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => handleMove(doc, 'up')}
                      disabled={isFirst}
                      className="text-gray-400 hover:text-vvz-green transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Omhoog"
                      aria-label="Omhoog"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMove(doc, 'down')}
                      disabled={isLast}
                      className="text-gray-400 hover:text-vvz-green transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Omlaag"
                      aria-label="Omlaag"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          autoFocus
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(doc)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                        <button
                          onClick={() => saveEdit(doc)}
                          disabled={savingEdit}
                          className="text-xs font-medium bg-vvz-green text-white px-3 py-1.5 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
                        >
                          Opslaan
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs font-medium border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Annuleren
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {doc.file_name}
                          {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                        </p>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <>
                      <button
                        onClick={() => startEdit(doc)}
                        className="text-gray-400 hover:text-vvz-green transition-colors shrink-0"
                        title="Titel bewerken"
                        aria-label="Titel bewerken"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(doc)}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        title="Verwijderen"
                        aria-label="Verwijderen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Verwijder bevestiging */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Document verwijderen?</h2>
            <p className="text-sm text-gray-600 mb-5">
              Weet je zeker dat je <strong>{deleteConfirm.title}</strong> wilt verwijderen?
              Deze actie kan niet ongedaan gemaakt worden.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Verwijderen...' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
