import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAllMenuItems,
  fetchAllQuickLinks,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createQuickLink,
  updateQuickLink,
  deleteQuickLink,
  reorderMenuItems,
  reorderQuickLinks,
  getAvailableTools,
} from '../services/menu'
import { fetchPageGroups } from '../services/pageGroups'
import { supabase } from '../lib/supabaseClient'
import { QUICK_LINK_ICONS, QUICK_LINK_ICON_KEYS } from '../lib/quickLinkIcons'
import { NAV_SECTIONS, QUICK_LINKS } from '../lib/navigation'

const TYPE_BADGES = {
  group: { label: 'Groep', className: 'bg-gray-200 text-gray-700' },
  page: { label: 'Pagina', className: 'bg-green-100 text-green-700' },
  tool: { label: 'Tool', className: 'bg-blue-100 text-blue-700' },
  external: { label: 'Extern', className: 'bg-orange-100 text-orange-700' },
  page_group: { label: 'Pagina groep', className: 'bg-teal-100 text-teal-700' },
}

const TABS = [
  { key: 'menu', label: 'Hoofdmenu' },
  { key: 'quicklinks', label: 'Quick Links' },
]

export default function MenuBeheerPage() {
  const [activeTab, setActiveTab] = useState('menu')
  const [menuItems, setMenuItems] = useState([])
  const [quickLinkItems, setQuickLinkItems] = useState([])
  const [pages, setPages] = useState([])
  const [pageGroups, setPageGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [editModal, setEditModal] = useState(null) // { mode: 'create'|'edit', item, parentId, isQuickLink }
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { item, isQuickLink, hasChildren }
  const [dragState, setDragState] = useState(null) // { itemId, siblings, isQuickLink }
  const [dropTargetId, setDropTargetId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [initConfirm, setInitConfirm] = useState(null) // null or { count: number }

  const availableTools = getAvailableTools()

  function showSuccess(msg) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  function showError(msg) {
    setError(msg)
    setTimeout(() => setError(null), 5000)
  }

  async function handleInitializeMenu() {
    // Check of er al items bestaan
    setError(null)
    try {
      const { data: existing, error: fetchErr } = await fetchAllMenuItems()
      if (fetchErr) throw new Error(fetchErr.message)
      if (existing && existing.length > 0) {
        setInitConfirm({ count: existing.length })
        return
      }
    } catch (err) {
      setError(err.message)
      return
    }
    await doInitializeMenu()
  }

  async function doInitializeMenu() {
    setInitConfirm(null)
    setInitializing(true)
    setError(null)

    try {
      // Verwijder bestaande items als die er zijn
      const { data: existing } = await fetchAllMenuItems()
      if (existing && existing.length > 0) {
        for (const item of existing) {
          await deleteMenuItem(item.id)
        }
      }

      for (let idx = 0; idx < NAV_SECTIONS.length; idx++) {
        const section = NAV_SECTIONS[idx]

        // Maak parent groep aan
        const { data: parent, error: parentError } = await createMenuItem({
          label: section.label,
          type: 'group',
          position: idx,
          is_visible: true,
        })
        if (parentError) throw new Error(parentError.message)

        // Maak children aan
        if (section.children) {
          for (let childIdx = 0; childIdx < section.children.length; childIdx++) {
            const child = section.children[childIdx]
            const childPayload = {
              parent_id: parent.id,
              label: child.label,
              position: childIdx,
              is_visible: true,
            }

            if (child.href) {
              childPayload.type = 'external'
              childPayload.external_url = child.href
            } else {
              childPayload.type = 'tool'
              childPayload.tool_route = child.to
            }

            const { error: childError } = await createMenuItem(childPayload)
            if (childError) throw new Error(childError.message)
          }
        }
      }

      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setInitializing(false)
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [menuResult, qlResult] = await Promise.all([
        fetchAllMenuItems(),
        fetchAllQuickLinks(),
      ])

      if (menuResult.error) throw new Error(menuResult.error.message)
      if (qlResult.error) throw new Error(qlResult.error.message)

      setMenuItems(menuResult.data || [])
      setQuickLinkItems(qlResult.data || [])

      // Probeer pagina's op te halen (tabel bestaat misschien nog niet)
      try {
        const { data: pagesData } = await supabase
          .from('pages')
          .select('id, title, slug')
          .order('title')
        setPages(pagesData || [])
      } catch {
        setPages([])
      }

      // Probeer pagina groepen op te halen (tabel bestaat misschien nog niet)
      try {
        const { data: pgData } = await fetchPageGroups()
        setPageGroups(pgData || [])
      } catch {
        setPageGroups([])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Bouw boomstructuur uit platte lijst
  function buildTree(items) {
    const map = new Map()
    const roots = []

    for (const item of items) {
      map.set(item.id, { ...item, children: [] })
    }

    for (const item of items) {
      const node = map.get(item.id)
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id).children.push(node)
      } else {
        roots.push(node)
      }
    }

    // Sorteer kinderen op position
    for (const node of map.values()) {
      node.children.sort((a, b) => a.position - b.position)
    }

    return roots.sort((a, b) => a.position - b.position)
  }

  // Drag-and-drop herordenen
  async function handleDropReorder(toItemId) {
    setDropTargetId(null)
    if (!dragState || dragState.itemId === toItemId) { setDragState(null); return }

    const { siblings, isQuickLink } = dragState
    const fromIdx = siblings.findIndex(s => s.id === dragState.itemId)
    const toIdx = siblings.findIndex(s => s.id === toItemId)
    if (fromIdx === -1 || toIdx === -1) { setDragState(null); return }

    const reordered = [...siblings]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

    const updates = reordered.map((item, idx) => ({ id: item.id, position: idx }))
    const reorderFn = isQuickLink ? reorderQuickLinks : reorderMenuItems
    const { error: reorderError } = await reorderFn(updates)
    if (reorderError) { showError(reorderError.message) }
    else { await loadData() }
    setDragState(null)
  }

  // Toggle zichtbaarheid
  async function handleToggleVisible(item, isQuickLink) {
    setActionLoading(true)
    const updateFn = isQuickLink ? updateQuickLink : updateMenuItem
    const { error: updateError } = await updateFn(item.id, { is_visible: !item.is_visible })
    if (updateError) { showError(updateError.message); setActionLoading(false); return }
    await loadData()
    showSuccess(item.is_visible ? 'Item verborgen' : 'Item zichtbaar gemaakt')
    setActionLoading(false)
  }

  // Verwijder item
  async function handleDelete() {
    const { item, isQuickLink } = deleteConfirm
    setDeleteConfirm(null)

    setActionLoading(true)
    const deleteFn = isQuickLink ? deleteQuickLink : deleteMenuItem
    const { error: deleteError } = await deleteFn(item.id)
    if (deleteError) {
      showError(deleteError.message)
      setActionLoading(false)
      return
    }

    await loadData()
    showSuccess('Item verwijderd')
    setActionLoading(false)
  }

  // Open modal voor nieuw item
  function openCreateModal(parentId = null, isQuickLink = false) {
    setFieldErrors({})
    setEditModal({
      mode: 'create',
      parentId,
      isQuickLink,
      item: {
        label: '',
        type: isQuickLink ? 'tool' : (parentId ? 'tool' : 'group'),
        page_id: null,
        page_group_id: null,
        tool_route: '',
        external_url: '',
        is_visible: true,
        description: '',
        icon: '',
        show_on_home: false,
      },
    })
  }

  // Open modal voor bewerken
  function openEditModal(item, isQuickLink = false) {
    setFieldErrors({})
    setEditModal({
      mode: 'edit',
      parentId: item.parent_id,
      isQuickLink,
      item: {
        id: item.id,
        label: item.label,
        type: item.type,
        page_id: item.page_id,
        page_group_id: item.page_group_id || null,
        tool_route: item.tool_route || '',
        external_url: item.external_url || '',
        is_visible: item.is_visible,
        description: item.description || '',
        icon: item.icon || '',
        show_on_home: item.show_on_home ?? false,
      },
    })
  }

  // Validatie van modal formulier
  function validateModal() {
    const { item } = editModal
    const errors = {}
    if (item.type === 'tool' && !item.tool_route) {
      errors.tool_route = 'Selecteer een tool'
    }
    if (item.type === 'page' && !item.page_id) {
      errors.page_id = 'Selecteer een pagina'
    }
    if (item.type === 'page_group' && !item.page_group_id) {
      errors.page_group_id = 'Selecteer een pagina groep'
    }
    if (item.type === 'external') {
      if (!item.external_url) {
        errors.external_url = 'Voer een URL in'
      } else {
        try {
          new URL(item.external_url)
        } catch {
          errors.external_url = 'Voer een geldige URL in (bijv. https://...)'
        }
      }
    }
    return errors
  }

  const [fieldErrors, setFieldErrors] = useState({})

  // Opslaan (create of update)
  async function handleSave(e) {
    e.preventDefault()

    const errors = validateModal()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    setError(null)

    const { mode, item, parentId, isQuickLink } = editModal

    // Bepaal positie voor nieuwe items
    let position = 0
    if (mode === 'create') {
      if (isQuickLink) {
        position = quickLinkItems.length
      } else if (parentId) {
        position = menuItems.filter(mi => mi.parent_id === parentId).length
      } else {
        position = menuItems.filter(mi => !mi.parent_id).length
      }
    }

    // Validatie: max 2 niveaus diep
    if (!isQuickLink && parentId && mode === 'create' && item.type === 'group') {
      const parent = menuItems.find(mi => mi.id === parentId)
      if (parent && parent.parent_id) {
        setError('Maximaal 2 niveaus diep. Een sub-groep kan niet nog een groep bevatten.')
        setSaving(false)
        return
      }
    }

    try {
      // NB: type 'page_group' vereist DB migratie: ALTER TABLE menu_items DROP CONSTRAINT menu_items_type_check;
      // ALTER TABLE menu_items ADD CONSTRAINT menu_items_type_check CHECK (type IN ('group', 'page', 'tool', 'external', 'page_group'));
      // ALTER TABLE menu_items ADD COLUMN page_group_id UUID REFERENCES page_groups(id) ON DELETE SET NULL;
      const payload = {
        label: item.label,
        type: item.type,
        page_id: item.type === 'page' ? item.page_id : null,
        tool_route: item.type === 'tool' ? item.tool_route : null,
        external_url: item.type === 'external' ? item.external_url : null,
        page_group_id: item.type === 'page_group' ? item.page_group_id : null,
        is_visible: item.is_visible,
      }

      // Voeg quick-link-specifieke velden toe
      if (isQuickLink) {
        payload.description = item.description || null
        payload.icon = item.icon || null
        payload.show_on_home = item.show_on_home ?? false
      }

      let result
      if (isQuickLink) {
        if (mode === 'create') {
          result = await createQuickLink({ ...payload, position })
        } else {
          result = await updateQuickLink(item.id, payload)
        }
      } else {
        if (mode === 'create') {
          result = await createMenuItem({ ...payload, parent_id: parentId, position })
        } else {
          result = await updateMenuItem(item.id, payload)
        }
      }

      if (result.error) throw new Error(result.error.message)

      setEditModal(null)
      await loadData()
      showSuccess(mode === 'create' ? 'Item aangemaakt' : 'Item bijgewerkt')
    } catch (err) {
      showError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function updateModalField(field, value) {
    setEditModal(prev => ({
      ...prev,
      item: { ...prev.item, [field]: value },
    }))
  }

  // Type-opties voor het formulier
  function getTypeOptions(isQuickLink, parentId) {
    if (isQuickLink) {
      return [
        { value: 'page', label: 'Pagina' },
        { value: 'tool', label: 'Tool' },
        { value: 'external', label: 'Extern' },
      ]
    }
    // Onder een parent die zelf al een parent heeft: geen groep toestaan
    const parent = parentId ? menuItems.find(mi => mi.id === parentId) : null
    if (parent && parent.parent_id) {
      return [
        { value: 'page', label: 'Pagina' },
        { value: 'tool', label: 'Tool' },
        { value: 'external', label: 'Extern' },
      ]
    }
    return [
      { value: 'group', label: 'Groep' },
      { value: 'page', label: 'Pagina' },
      { value: 'page_group', label: 'Pagina groep' },
      { value: 'tool', label: 'Tool' },
      { value: 'external', label: 'Extern' },
    ]
  }

  // Render een enkel menu-item in de boomlijst
  function renderMenuItem(item, siblings, index, depth = 0) {
    const badge = TYPE_BADGES[item.type] || TYPE_BADGES.tool
    const isDragging = dragState?.itemId === item.id
    const isDropTarget = dropTargetId === item.id && !isDragging
    const indentClass = depth === 1 ? 'ml-6' : depth >= 2 ? 'ml-12' : ''

    return (
      <div key={item.id}>
        <div
          draggable
          onDragStart={() => setDragState({ itemId: item.id, siblings, isQuickLink: false })}
          onDragOver={e => { e.preventDefault(); setDropTargetId(item.id) }}
          onDragLeave={() => setDropTargetId(null)}
          onDrop={() => handleDropReorder(item.id)}
          onDragEnd={() => { setDragState(null); setDropTargetId(null) }}
          className={`flex items-center gap-2 py-2 px-3 bg-white rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all ${indentClass}
            ${isDragging ? 'opacity-40' : 'hover:bg-gray-50'}
            ${isDropTarget ? 'border-t-2 border-vvz-green' : ''}
          `}
        >
          {/* Sleepgreep */}
          <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
          </svg>
          <span className="font-medium text-gray-800 flex-1">{item.label}</span>
          {/* Inline "+ toevoegen" voor groepen */}
          {item.type === 'group' && (
            <button
              onClick={e => { e.stopPropagation(); openCreateModal(item.id, false) }}
              className="text-xs text-gray-400 hover:text-vvz-green transition-colors flex items-center gap-0.5 shrink-0"
              title="Item toevoegen aan deze groep"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              toevoegen
            </button>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
            {badge.label}
          </span>
          <button
            onClick={() => handleToggleVisible(item, false)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${item.is_visible ? 'bg-vvz-green' : 'bg-gray-300'}`}
            aria-label={item.is_visible ? `${item.label} verbergen` : `${item.label} tonen`}
            title={item.is_visible ? 'Verbergen' : 'Tonen'}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${item.is_visible ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => openEditModal(item, false)}
              className="p-1 text-blue-500 hover:text-blue-700"
              title="Bewerken"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
            <button
              onClick={() => setDeleteConfirm({ item, isQuickLink: false, hasChildren: item.children?.length > 0 })}
              className="p-1 text-red-400 hover:text-red-600"
              title="Verwijderen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* Kinderen */}
        {item.children && item.children.length > 0 && (
          <div className="mt-1 space-y-1">
            {item.children.map((child, childIdx) =>
              renderMenuItem(child, item.children, childIdx, depth + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  // Render quick link item
  function renderQuickLinkItem(item, siblings) {
    const badge = TYPE_BADGES[item.type] || TYPE_BADGES.tool
    const isDragging = dragState?.itemId === item.id
    const isDropTarget = dropTargetId === item.id && !isDragging

    return (
      <div
        key={item.id}
        draggable
        onDragStart={() => setDragState({ itemId: item.id, siblings, isQuickLink: true })}
        onDragOver={e => { e.preventDefault(); setDropTargetId(item.id) }}
        onDragLeave={() => setDropTargetId(null)}
        onDrop={() => handleDropReorder(item.id)}
        onDragEnd={() => { setDragState(null); setDropTargetId(null) }}
        className={`flex items-center gap-2 py-2 px-3 bg-white rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all
          ${isDragging ? 'opacity-40' : 'hover:bg-gray-50'}
          ${isDropTarget ? 'border-t-2 border-vvz-green' : ''}
        `}
      >
        {/* Sleepgreep */}
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>
        {item.icon && QUICK_LINK_ICONS[item.icon] && (
          <span className="text-gray-400 flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5">
            {QUICK_LINK_ICONS[item.icon]}
          </span>
        )}
        <span className="font-medium text-gray-800 flex-1">{item.label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
          {badge.label}
        </span>
        {item.show_on_home && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
            Homepage
          </span>
        )}
        <button
          onClick={() => handleToggleVisible(item, true)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${item.is_visible ? 'bg-vvz-green' : 'bg-gray-300'}`}
          aria-label={item.is_visible ? `${item.label} verbergen` : `${item.label} tonen`}
          title={item.is_visible ? 'Verbergen' : 'Tonen'}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${item.is_visible ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditModal(item, true)}
            className="p-1 text-blue-500 hover:text-blue-700"
            title="Bewerken"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
          <button
            onClick={() => setDeleteConfirm({ item, isQuickLink: true, hasChildren: false })}
            className="p-1 text-red-400 hover:text-red-600"
            title="Verwijderen"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  const menuTree = buildTree(menuItems)

  return (
    <div className="max-w-4xl mx-auto p-4 pt-8">
      <Link to="/beheer" className="text-sm text-vvz-green hover:underline mb-4 inline-block">
        &larr; Terug naar Beheer
      </Link>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Menubeheer</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">{success}</div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2" aria-label="Sluiten">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-vvz-green text-vvz-green'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laden...</div>
      ) : activeTab === 'menu' ? (
        <div>
          {menuItems.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-blue-800 font-medium">Het hoofdmenu is nog leeg.</p>
                <p className="text-sm text-blue-700 mt-1">Klik op de knop om het standaardmenu te laden vanuit de vaste navigatie.</p>
                <button
                  onClick={handleInitializeMenu}
                  disabled={initializing}
                  className="mt-3 text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {initializing ? 'Bezig...' : 'Initialiseer standaardmenu'}
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => openCreateModal(null, false)}
            className="text-sm font-medium text-white bg-vvz-green hover:bg-vvz-green/90 px-4 py-2 rounded-lg flex items-center gap-1.5 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            + Toevoegen
          </button>
          <div className="space-y-1 mb-4">
            {menuTree.map((item, idx) => renderMenuItem(item, menuTree, idx, 0))}
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => openCreateModal(null, true)}
            className="text-sm font-medium text-white bg-vvz-green hover:bg-vvz-green/90 px-4 py-2 rounded-lg flex items-center gap-1.5 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            + Toevoegen
          </button>
          <div className="space-y-1 mb-4">
            {quickLinkItems.map(item => renderQuickLinkItem(item, quickLinkItems))}
          </div>
        </div>
      )}

      {/* Verwijder bevestiging */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 id="delete-dialog-title" className="text-lg font-bold text-gray-800 mb-2">Verwijderen?</h2>
            <p className="text-sm text-gray-600 mb-2">
              Weet je zeker dat je <strong>{deleteConfirm.item.label}</strong> wilt verwijderen?
            </p>
            {deleteConfirm.hasChildren && (
              <p className="text-sm text-orange-600 mb-3">
                Alle onderliggende items worden ook verwijderd.
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initialisatie bevestiging */}
      {initConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Menu vervangen?</h2>
            <p className="text-sm text-gray-600 mb-5">
              Er zijn al <strong>{initConfirm.count}</strong> items. Wil je deze vervangen door het standaardmenu?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setInitConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={doInitializeMenu}
                className="flex-1 bg-orange-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Vervangen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editModal.mode === 'create' ? 'Nieuw item' : 'Item bewerken'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  required
                  value={editModal.item.label}
                  onChange={e => updateModalField('label', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
                  placeholder="Menu-item label"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={editModal.item.type}
                  onChange={e => updateModalField('type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
                >
                  {getTypeOptions(editModal.isQuickLink, editModal.parentId).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Type-specifieke velden */}
              {editModal.item.type === 'page' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pagina</label>
                  {pages.length > 0 ? (
                    <select
                      value={editModal.item.page_id || ''}
                      onChange={e => { updateModalField('page_id', e.target.value || null); setFieldErrors(fe => ({ ...fe, page_id: undefined })) }}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green ${fieldErrors.page_id ? 'border-red-400' : 'border-gray-300'}`}
                    >
                      <option value="">Selecteer een pagina...</option>
                      {pages.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Geen pagina&apos;s beschikbaar. Maak eerst een pagina aan via Pagina&apos;s beheer.
                    </p>
                  )}
                  {fieldErrors.page_id && <p className="text-xs text-red-500 mt-1">{fieldErrors.page_id}</p>}
                </div>
              )}

              {editModal.item.type === 'tool' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tool</label>
                  <select
                    value={editModal.item.tool_route}
                    onChange={e => { updateModalField('tool_route', e.target.value); setFieldErrors(fe => ({ ...fe, tool_route: undefined })) }}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green ${fieldErrors.tool_route ? 'border-red-400' : 'border-gray-300'}`}
                  >
                    <option value="">Selecteer een tool...</option>
                    {availableTools.map(t => (
                      <option key={t.route} value={t.route}>{t.label} ({t.route})</option>
                    ))}
                  </select>
                  {fieldErrors.tool_route && <p className="text-xs text-red-500 mt-1">{fieldErrors.tool_route}</p>}
                </div>
              )}

              {editModal.item.type === 'external' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input
                    type="url"
                    value={editModal.item.external_url}
                    onChange={e => { updateModalField('external_url', e.target.value); setFieldErrors(fe => ({ ...fe, external_url: undefined })) }}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green ${fieldErrors.external_url ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="https://..."
                  />
                  {fieldErrors.external_url && <p className="text-xs text-red-500 mt-1">{fieldErrors.external_url}</p>}
                </div>
              )}

              {editModal.item.type === 'page_group' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pagina groep</label>
                  {pageGroups.length > 0 ? (
                    <select
                      value={editModal.item.page_group_id || ''}
                      onChange={e => { updateModalField('page_group_id', e.target.value || null); setFieldErrors(fe => ({ ...fe, page_group_id: undefined })) }}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green ${fieldErrors.page_group_id ? 'border-red-400' : 'border-gray-300'}`}
                    >
                      <option value="">Selecteer een pagina groep...</option>
                      {pageGroups.map(pg => (
                        <option key={pg.id} value={pg.id}>{pg.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Geen pagina groepen beschikbaar. Maak eerst een groep aan via Pagina&apos;s beheer.
                    </p>
                  )}
                  {fieldErrors.page_group_id && <p className="text-xs text-red-500 mt-1">{fieldErrors.page_group_id}</p>}
                </div>
              )}

              {/* Quick Link extra velden */}
              {editModal.isQuickLink && (
                <>
                  {/* Beschrijving */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                    <input
                      type="text"
                      value={editModal.item.description}
                      onChange={e => updateModalField('description', e.target.value)}
                      maxLength={80}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
                      placeholder="Korte beschrijving voor homepage kaartje"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {editModal.item.description.length}/80 tekens
                    </p>
                  </div>

                  {/* Icoon picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Icoon</label>
                    <div className="grid grid-cols-5 gap-2">
                      {QUICK_LINK_ICON_KEYS.map(key => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateModalField('icon', key)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors ${
                            editModal.item.icon === key
                              ? 'border-vvz-green bg-vvz-green/10'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          title={key}
                        >
                          <span className="text-gray-700">{QUICK_LINK_ICONS[key]}</span>
                          <span className="text-[10px] text-gray-500">{key}</span>
                        </button>
                      ))}
                    </div>
                    {editModal.item.icon && (
                      <button
                        type="button"
                        onClick={() => updateModalField('icon', '')}
                        className="mt-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        Icoon verwijderen
                      </button>
                    )}
                  </div>

                  {/* Toon op homepage */}
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={editModal.item.show_on_home}
                        onChange={e => updateModalField('show_on_home', e.target.checked)}
                        className="rounded border-gray-300 text-vvz-green focus:ring-vvz-green"
                      />
                      Toon als kaartje op de homepage
                    </label>
                    <p className="text-xs text-gray-400 mt-1 ml-6">
                      Wordt zichtbaar als snelkoppeling op de startpagina voor alle bezoekers.
                    </p>
                  </div>
                </>
              )}

              {/* Knoppen */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={saving || Object.values(fieldErrors).some(Boolean)}
                  className="px-4 py-2 text-sm font-medium text-white bg-vvz-green hover:bg-vvz-green/90 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
