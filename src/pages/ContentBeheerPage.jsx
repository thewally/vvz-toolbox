import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchAllPages, deletePage, updatePage, reorderPages } from '../services/pages'
import { fetchPageGroups, createPageGroup, updatePageGroup, deletePageGroup, reorderPageGroups } from '../services/pageGroups'

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getStatus(page) {
  const now = new Date()
  if (page.expires_at && new Date(page.expires_at) < now) {
    return { label: 'Verlopen', className: 'bg-red-100 text-red-700' }
  }
  if (!page.published_at || new Date(page.published_at) > now) {
    return { label: 'Concept', className: 'bg-yellow-100 text-yellow-700' }
  }
  return { label: 'Gepubliceerd', className: 'bg-green-100 text-green-700' }
}

export default function ContentBeheerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [pages, setPages] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { type: 'page'|'group', item }
  const [groupModal, setGroupModal] = useState(null) // { mode: 'create'|'edit', group }
  const [groupForm, setGroupForm] = useState({ name: '', slug: '' })
  const [groupSlugManual, setGroupSlugManual] = useState(false)
  const [groupSaving, setGroupSaving] = useState(false)
  const [dragState, setDragState] = useState(null) // { itemId, type: 'page'|'group', groupId }
  const [dropTargetId, setDropTargetId] = useState(null)

  useEffect(() => {
    if (location.state?.success) {
      setSuccess(location.state.success)
      navigate(location.pathname, { replace: true, state: {} })
      const timer = setTimeout(() => setSuccess(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [location.state]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true)
    const [pagesResult, groupsResult] = await Promise.all([
      fetchAllPages(),
      fetchPageGroups().catch(() => ({ data: [], error: null })),
    ])
    if (pagesResult.error) setError(pagesResult.error.message)
    else setPages(pagesResult.data ?? [])

    if (groupsResult.error) {
      // page_groups table might not exist yet
      setGroups([])
    } else {
      setGroups(groupsResult.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function isPublished(page) {
    const now = new Date()
    return page.published_at && new Date(page.published_at) <= now &&
      (!page.expires_at || new Date(page.expires_at) > now)
  }

  async function handleTogglePublished(page) {
    const published = isPublished(page)
    const { error: updateError } = await updatePage(page.id, {
      published_at: published ? null : new Date().toISOString(),
    })
    if (updateError) { setError('Opslaan mislukt: ' + updateError.message); return }
    load()
  }

  async function handleDeletePage(id) {
    const { error: deleteError } = await deletePage(id)
    setDeleteConfirm(null)
    if (deleteError) {
      setError('Verwijderen mislukt: ' + deleteError.message)
      return
    }
    load()
  }

  async function handleDeleteGroup(id) {
    const { error: deleteError } = await deletePageGroup(id)
    setDeleteConfirm(null)
    if (deleteError) {
      setError('Verwijderen mislukt: ' + deleteError.message)
      return
    }
    load()
  }

  // Group modal handlers
  function openGroupCreate() {
    setGroupForm({ name: '', slug: '' })
    setGroupSlugManual(false)
    setGroupModal({ mode: 'create' })
  }

  function openGroupEdit(group) {
    setGroupForm({ name: group.name, slug: group.slug })
    setGroupSlugManual(true)
    setGroupModal({ mode: 'edit', group })
  }

  async function handleGroupSave() {
    if (!groupForm.name.trim() || !groupForm.slug.trim()) return
    setGroupSaving(true)
    setError(null)

    if (groupModal.mode === 'create') {
      const position = groups.length
      const { error: createError } = await createPageGroup({
        name: groupForm.name.trim(),
        slug: groupForm.slug.trim(),
        position,
      })
      if (createError) {
        setError('Groep aanmaken mislukt: ' + createError.message)
        setGroupSaving(false)
        return
      }
    } else {
      const { error: updateError } = await updatePageGroup(groupModal.group.id, {
        name: groupForm.name.trim(),
        slug: groupForm.slug.trim(),
      })
      if (updateError) {
        setError('Groep bijwerken mislukt: ' + updateError.message)
        setGroupSaving(false)
        return
      }
    }

    setGroupModal(null)
    setGroupSaving(false)
    load()
  }


  // Drag-and-drop: pagina's binnen een groep herordenen
  async function handleDropPage(toPageId, groupId) {
    setDropTargetId(null)
    if (!dragState || dragState.itemId === toPageId) { setDragState(null); return }

    const siblings = pages
      .filter(p => (p.group_id || null) === (groupId || null))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    const fromIdx = siblings.findIndex(p => p.id === dragState.itemId)
    const toIdx = siblings.findIndex(p => p.id === toPageId)
    if (fromIdx === -1 || toIdx === -1) { setDragState(null); return }

    const reordered = [...siblings]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

    const updates = reordered.map((p, i) => ({ id: p.id, position: i }))
    const { error: reorderError } = await reorderPages(updates)
    if (reorderError) setError('Herordenen mislukt: ' + reorderError.message)
    else load()
    setDragState(null)
  }

  // Drag-and-drop: groepen herordenen
  async function handleDropGroup(toGroupId) {
    setDropTargetId(null)
    if (!dragState || dragState.itemId === toGroupId) { setDragState(null); return }

    const fromIdx = groups.findIndex(g => g.id === dragState.itemId)
    const toIdx = groups.findIndex(g => g.id === toGroupId)
    if (fromIdx === -1 || toIdx === -1) { setDragState(null); return }

    const reordered = [...groups]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

    const updates = reordered.map((g, i) => ({ id: g.id, position: i }))
    const { error: reorderError } = await reorderPageGroups(updates)
    if (reorderError) setError('Herordenen mislukt: ' + reorderError.message)
    else load()
    setDragState(null)
  }

  function renderPageRow(page, groupId) {
    const status = getStatus(page)
    const isDragging = dragState?.itemId === page.id
    const isDropTarget = dropTargetId === page.id && !isDragging
    return (
      <div
        key={page.id}
        draggable
        onDragStart={() => setDragState({ itemId: page.id, type: 'page', groupId })}
        onDragOver={e => { e.preventDefault(); setDropTargetId(page.id) }}
        onDragLeave={() => setDropTargetId(null)}
        onDrop={() => handleDropPage(page.id, groupId)}
        onDragEnd={() => { setDragState(null); setDropTargetId(null) }}
        className={`flex items-center gap-2 py-2 px-4 bg-white border-b border-gray-50 last:border-b-0 cursor-grab active:cursor-grabbing transition-all
          ${isDragging ? 'opacity-40' : 'hover:bg-gray-50'}
          ${isDropTarget ? 'border-t-2 border-vvz-green' : ''}
        `}
      >
        {/* Sleepgreep */}
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <span className="text-gray-800 text-sm">{page.title}</span>
          {isPublished(page)
            ? <Link to={`/pagina/${page.slug}`} className="block text-xs text-gray-400 hover:text-vvz-green hover:underline transition-colors truncate">/pagina/{page.slug}</Link>
            : <span className="block text-xs text-gray-400 truncate">/pagina/{page.slug}</span>}
        </div>

        {/* Published date (hidden on mobile) */}
        <span className="text-xs text-gray-500 hidden md:block w-24 shrink-0">
          {page.published_at && new Date(page.published_at) <= new Date() && new Date(page.published_at).getFullYear() < 9000
            ? new Date(page.published_at).toLocaleDateString('nl-NL')
            : '\u2014'}
        </span>

        {/* Status badge */}
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${status.className}`}>
          {status.label}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleTogglePublished(page)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${isPublished(page) ? 'bg-vvz-green' : 'bg-gray-300'}`}
            aria-label={isPublished(page) ? `${page.title} depubliceren` : `${page.title} publiceren`}
            title={isPublished(page) ? 'Depubliceren' : 'Publiceren'}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isPublished(page) ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
          </button>
          <Link
            to={`/beheer/content/${page.id}`}
            className="text-gray-400 hover:text-vvz-green transition-colors"
            title="Bewerken"
            aria-label={`${page.title} bewerken`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </Link>
          <button
            onClick={() => setDeleteConfirm({ type: 'page', item: page })}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Verwijderen"
            aria-label={`${page.title} verwijderen`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  function renderGroupSection(group) {
    const groupPages = pages
      .filter(p => p.group_id === group.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    const isDragging = dragState?.itemId === group.id
    const isDropTarget = dropTargetId === group.id && !isDragging

    return (
      <div
        key={group.id}
        draggable
        onDragStart={() => setDragState({ itemId: group.id, type: 'group' })}
        onDragOver={e => { e.preventDefault(); setDropTargetId(group.id) }}
        onDragLeave={() => setDropTargetId(null)}
        onDrop={() => handleDropGroup(group.id)}
        onDragEnd={() => { setDragState(null); setDropTargetId(null) }}
        className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all
          ${isDragging ? 'opacity-40' : ''}
          ${isDropTarget ? 'ring-2 ring-vvz-green' : ''}
        `}
      >
        {/* Group header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-grab active:cursor-grabbing">
          {/* Sleepgreep */}
          <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
          </svg>

          <span className="font-bold text-gray-800 flex-1">{group.name}</span>

          <Link
            to={`/beheer/content/nieuw?group=${group.id}`}
            className="text-xs text-gray-400 hover:text-vvz-green transition-colors flex items-center gap-0.5 shrink-0"
            title="Pagina toevoegen aan groep"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            pagina toevoegen
          </Link>

          <button
            onClick={() => openGroupEdit(group)}
            className="text-gray-400 hover:text-vvz-green transition-colors"
            title="Groep bewerken"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
          <button
            onClick={() => setDeleteConfirm({ type: 'group', item: group })}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Groep verwijderen"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>

        {/* Pages in group */}
        {groupPages.length > 0 ? (
          <div>
            {groupPages.map(page => renderPageRow(page, group.id))}
          </div>
        ) : (
          <div className="px-4 py-3 text-sm text-gray-400 italic">Geen pagina&apos;s in deze groep.</div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  const ungroupedPages = pages
    .filter(p => !p.group_id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return (
    <div className="max-w-5xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to="/beheer" className="text-sm text-vvz-green hover:underline">&larr; Terug naar Beheer</Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pagina&apos;s</h1>
        <div className="flex gap-2">
          <button
            onClick={openGroupCreate}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            Nieuwe groep
          </button>
          <Link
            to="/beheer/content/nieuw"
            className="inline-flex items-center gap-2 bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nieuwe pagina
          </Link>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-lg mb-4">{success}</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">{error}</div>
      )}

      {pages.length === 0 && groups.length === 0 ? (
        <p className="text-gray-500 text-sm">Nog geen pagina&apos;s aangemaakt.</p>
      ) : (
        <div className="space-y-4">
          {/* Group sections */}
          {groups.map(group => renderGroupSection(group))}

          {/* Ungrouped pages */}
          {ungroupedPages.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="font-bold text-gray-500 flex-1">Zonder groep</span>
              </div>
              <div>
                {ungroupedPages.map(page => renderPageRow(page, null))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 id="delete-dialog-title" className="text-lg font-bold text-gray-800 mb-2">Verwijderen?</h2>
            {deleteConfirm.type === 'group' ? (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  Weet je zeker dat je de groep <strong>{deleteConfirm.item.name}</strong> wilt verwijderen?
                </p>
                <p className="text-sm text-orange-600 mb-5">
                  Pagina&apos;s in deze groep worden losgekoppeld maar niet verwijderd.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600 mb-5">
                Weet je zeker dat je <strong>{deleteConfirm.item.title}</strong> wilt verwijderen?
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={() => deleteConfirm.type === 'group'
                  ? handleDeleteGroup(deleteConfirm.item.id)
                  : handleDeletePage(deleteConfirm.item.id)
                }
                className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group create/edit modal */}
      {groupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {groupModal.mode === 'create' ? 'Nieuwe groep' : 'Groep bewerken'}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                <input
                  id="group-name"
                  type="text"
                  value={groupForm.name}
                  onChange={e => {
                    const name = e.target.value
                    setGroupForm(f => ({
                      ...f,
                      name,
                      slug: groupSlugManual ? f.slug : slugify(name),
                    }))
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                  placeholder="Groepsnaam"
                />
              </div>
              <div>
                <label htmlFor="group-slug" className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  id="group-slug"
                  type="text"
                  value={groupForm.slug}
                  onChange={e => {
                    setGroupSlugManual(true)
                    setGroupForm(f => ({ ...f, slug: slugify(e.target.value) }))
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                  placeholder="groep-slug"
                />
                <p className="text-xs text-gray-400 mt-1">Wordt automatisch gegenereerd op basis van de naam.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setGroupModal(null)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleGroupSave}
                  disabled={groupSaving || !groupForm.name.trim() || !groupForm.slug.trim()}
                  className="flex-1 bg-vvz-green text-white text-sm font-medium py-2 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
                >
                  {groupSaving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
