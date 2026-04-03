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
import { supabase } from '../lib/supabaseClient'
import { QUICK_LINK_ICONS, QUICK_LINK_ICON_KEYS } from '../lib/quickLinkIcons'
import { NAV_SECTIONS, QUICK_LINKS } from '../lib/navigation'

const TYPE_BADGES = {
  group: { label: 'Groep', className: 'bg-gray-200 text-gray-700' },
  page: { label: 'Pagina', className: 'bg-green-100 text-green-700' },
  tool: { label: 'Tool', className: 'bg-blue-100 text-blue-700' },
  external: { label: 'Extern', className: 'bg-orange-100 text-orange-700' },
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editModal, setEditModal] = useState(null) // { mode: 'create'|'edit', item, parentId, isQuickLink }
  const [saving, setSaving] = useState(false)
  const [initializing, setInitializing] = useState(false)

  const availableTools = getAvailableTools()

  async function handleInitializeMenu() {
    setInitializing(true)
    setError(null)

    try {
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

  // Verplaats item omhoog/omlaag in de lijst
  async function handleReorder(items, index, direction, isQuickLink) {
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= items.length) return

    const a = items[index]
    const b = items[swapIndex]

    const updates = [
      { id: a.id, position: b.position },
      { id: b.id, position: a.position },
    ]

    // Als posities gelijk zijn, wijs nieuwe posities toe
    if (a.position === b.position) {
      updates[0].position = swapIndex
      updates[1].position = index
    }

    const reorderFn = isQuickLink ? reorderQuickLinks : reorderMenuItems
    const { error: reorderError } = await reorderFn(updates)
    if (reorderError) {
      setError(reorderError.message)
      return
    }

    await loadData()
  }

  // Verwijder item
  async function handleDelete(item, isQuickLink) {
    const hasChildren = !isQuickLink && menuItems.some(mi => mi.parent_id === item.id)
    const msg = hasChildren
      ? `Weet je zeker dat je "${item.label}" wilt verwijderen? Alle onderliggende items worden ook verwijderd.`
      : `Weet je zeker dat je "${item.label}" wilt verwijderen?`

    if (!window.confirm(msg)) return

    const deleteFn = isQuickLink ? deleteQuickLink : deleteMenuItem
    const { error: deleteError } = await deleteFn(item.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }

    await loadData()
  }

  // Open modal voor nieuw item
  function openCreateModal(parentId = null, isQuickLink = false) {
    setEditModal({
      mode: 'create',
      parentId,
      isQuickLink,
      item: {
        label: '',
        type: isQuickLink ? 'tool' : (parentId ? 'tool' : 'group'),
        page_id: null,
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
    setEditModal({
      mode: 'edit',
      parentId: item.parent_id,
      isQuickLink,
      item: {
        id: item.id,
        label: item.label,
        type: item.type,
        page_id: item.page_id,
        tool_route: item.tool_route || '',
        external_url: item.external_url || '',
        is_visible: item.is_visible,
        description: item.description || '',
        icon: item.icon || '',
        show_on_home: item.show_on_home ?? false,
      },
    })
  }

  // Opslaan (create of update)
  async function handleSave(e) {
    e.preventDefault()
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
      const payload = {
        label: item.label,
        type: item.type,
        page_id: item.type === 'page' ? item.page_id : null,
        tool_route: item.type === 'tool' ? item.tool_route : null,
        external_url: item.type === 'external' ? item.external_url : null,
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
    } catch (err) {
      setError(err.message)
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
      { value: 'tool', label: 'Tool' },
      { value: 'external', label: 'Extern' },
    ]
  }

  // Render een enkel menu-item in de boomlijst
  function renderMenuItem(item, siblings, index, depth = 0) {
    const badge = TYPE_BADGES[item.type] || TYPE_BADGES.tool

    return (
      <div key={item.id}>
        <div className={`flex items-center gap-2 py-2 px-3 bg-white rounded-lg shadow-sm ${depth > 0 ? 'ml-8' : ''}`}>
          <span className="font-medium text-gray-800 flex-1">{item.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
            {badge.label}
          </span>
          {!item.is_visible && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
              Verborgen
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleReorder(siblings, index, -1, false)}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              title="Omhoog"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => handleReorder(siblings, index, 1, false)}
              disabled={index === siblings.length - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              title="Omlaag"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
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
              onClick={() => handleDelete(item, false)}
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

        {/* Item toevoegen knop voor groepen */}
        {item.type === 'group' && (
          <button
            onClick={() => openCreateModal(item.id, false)}
            className={`mt-1 text-sm text-vvz-green hover:text-vvz-green/80 flex items-center gap-1 ${depth > 0 ? 'ml-8' : 'ml-8'} px-3`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Item toevoegen
          </button>
        )}
      </div>
    )
  }

  // Render quick link item
  function renderQuickLinkItem(item, siblings, index) {
    const badge = TYPE_BADGES[item.type] || TYPE_BADGES.tool

    return (
      <div key={item.id} className="flex items-center gap-2 py-2 px-3 bg-white rounded-lg shadow-sm">
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
        {!item.is_visible && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
            Verborgen
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleReorder(siblings, index, -1, true)}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Omhoog"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => handleReorder(siblings, index, 1, true)}
            disabled={index === siblings.length - 1}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Omlaag"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
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
            onClick={() => handleDelete(item, true)}
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

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
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
          <div className="space-y-1 mb-4">
            {menuTree.map((item, idx) => renderMenuItem(item, menuTree, idx, 0))}
          </div>
          <button
            onClick={() => openCreateModal(null, false)}
            className="text-sm font-medium text-white bg-vvz-green hover:bg-vvz-green/90 px-4 py-2 rounded-lg flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Item toevoegen
          </button>
        </div>
      ) : (
        <div>
          <div className="space-y-1 mb-4">
            {quickLinkItems.map((item, idx) => renderQuickLinkItem(item, quickLinkItems, idx))}
          </div>
          <button
            onClick={() => openCreateModal(null, true)}
            className="text-sm font-medium text-white bg-vvz-green hover:bg-vvz-green/90 px-4 py-2 rounded-lg flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Quick Link toevoegen
          </button>
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
                      onChange={e => updateModalField('page_id', e.target.value || null)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
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
                </div>
              )}

              {editModal.item.type === 'tool' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tool</label>
                  <select
                    value={editModal.item.tool_route}
                    onChange={e => updateModalField('tool_route', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
                  >
                    <option value="">Selecteer een tool...</option>
                    {availableTools.map(t => (
                      <option key={t.route} value={t.route}>{t.label} ({t.route})</option>
                    ))}
                  </select>
                </div>
              )}

              {editModal.item.type === 'external' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input
                    type="url"
                    value={editModal.item.external_url}
                    onChange={e => updateModalField('external_url', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
                    placeholder="https://..."
                  />
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

              {/* Zichtbaarheid */}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editModal.item.is_visible}
                  onChange={e => updateModalField('is_visible', e.target.checked)}
                  className="rounded border-gray-300 text-vvz-green focus:ring-vvz-green"
                />
                Zichtbaar in menu
              </label>

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
                  disabled={saving}
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
