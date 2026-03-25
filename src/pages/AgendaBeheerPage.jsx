import { useEffect, useState } from 'react'
import {
  fetchActivities,
  createActivities,
  updateActivity,
  deleteActivity,
  deleteActivityGroup,
  formDataToRows,
} from '../services/activities'

const DUTCH_MONTHS_SHORT = [
  'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
]

function formatSortDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${DUTCH_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function formatTime(start, end) {
  if (!start) return ''
  const s = start.slice(0, 5)
  const e = end ? end.slice(0, 5) : ''
  return e ? `${s} – ${e}` : s
}

function formatDateInfo(row) {
  if (row.date_start) {
    const s = formatSortDate(row.date_start)
    const e = row.date_end ? formatSortDate(row.date_end) : ''
    return e ? `${s} – ${e}` : `Vanaf ${s}`
  }
  return formatSortDate(row.sort_date)
}

function groupByGroupId(rows) {
  const singles = []
  const groupMap = new Map()
  const groupOrder = []

  for (const row of rows) {
    if (row.group_id) {
      if (!groupMap.has(row.group_id)) {
        groupMap.set(row.group_id, [row])
        groupOrder.push(row.group_id)
      } else {
        groupMap.get(row.group_id).push(row)
      }
    } else {
      singles.push({ type: 'single', row })
    }
  }

  const groups = groupOrder.map(gid => ({
    type: 'group',
    groupId: gid,
    rows: groupMap.get(gid),
    title: groupMap.get(gid)[0].title,
  }))

  return [...singles, ...groups]
}

const EMPTY_FORM = {
  title: '',
  description: '',
  dateType: 'single',
  date: '',
  dateStart: '',
  dateEnd: '',
  dates: '',
  timeStart: '',
  timeEnd: '',
  url: '',
}

export default function AgendaBeheerPage() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [editingGroupId, setEditingGroupId] = useState(null)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, groupId, title }

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const { data, error } = await fetchActivities()
    if (data) setActivities(data)
    if (error) setError(error.message)
    setLoading(false)
  }

  function startAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setEditingGroupId(null)
    setShowForm(true)
    setError(null)
    setSuccessMsg(null)
    setDeleteConfirm(null)
  }

  function startEdit(item) {
    setDeleteConfirm(null)
    setError(null)
    setSuccessMsg(null)

    if (item.type === 'group') {
      const row = item.rows[0]
      setForm({
        title: row.title,
        description: row.description || '',
        dateType: 'list',
        date: '',
        dateStart: '',
        dateEnd: '',
        dates: item.rows.map(r => r.dates_item).filter(Boolean).join('\n'),
        timeStart: row.time_start?.slice(0, 5) || '',
        timeEnd: row.time_end?.slice(0, 5) || '',
        url: row.url || '',
      })
      setEditingId(null)
      setEditingGroupId(item.groupId)
    } else {
      const row = item.row
      let dateType = 'single'
      let date = row.date || ''
      let dateStart = ''
      let dateEnd = ''

      if (row.date_start) {
        dateType = 'range'
        dateStart = row.date_start
        dateEnd = row.date_end || ''
      }

      setForm({
        title: row.title,
        description: row.description || '',
        dateType,
        date,
        dateStart,
        dateEnd,
        dates: '',
        timeStart: row.time_start?.slice(0, 5) || '',
        timeEnd: row.time_end?.slice(0, 5) || '',
        url: row.url || '',
      })
      setEditingId(row.id)
      setEditingGroupId(null)
    }

    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setEditingGroupId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!form.title.trim()) {
      setError('Titel is verplicht.')
      return
    }

    if (form.dateType === 'single' && !form.date) {
      setError('Datum is verplicht.')
      return
    }
    if (form.dateType === 'range' && !form.dateStart) {
      setError('Startdatum is verplicht.')
      return
    }
    if (form.dateType === 'list') {
      const parsed = form.dates.split('\n').map(l => l.trim()).filter(l => /^\d{4}-\d{2}-\d{2}$/.test(l))
      if (parsed.length === 0) {
        setError('Voer minimaal een geldige datum in (jjjj-mm-dd).')
        return
      }
    }

    setSaving(true)

    const dates = form.dateType === 'list'
      ? form.dates.split('\n').map(l => l.trim()).filter(l => /^\d{4}-\d{2}-\d{2}$/.test(l))
      : []

    const rows = formDataToRows({
      title: form.title.trim(),
      description: form.description.trim(),
      dateType: form.dateType,
      date: form.date,
      dateStart: form.dateStart,
      dateEnd: form.dateEnd,
      dates,
      timeStart: form.timeStart,
      timeEnd: form.timeEnd,
      url: form.url.trim(),
    })

    try {
      if (editingGroupId) {
        // Delete old group rows, insert new ones
        const { error: delErr } = await deleteActivityGroup(editingGroupId)
        if (delErr) throw delErr
        const { error: insErr } = await createActivities(rows)
        if (insErr) throw insErr
        setSuccessMsg(`Reeks "${form.title}" bijgewerkt.`)
      } else if (editingId) {
        const { error: updErr } = await updateActivity(editingId, rows[0])
        if (updErr) throw updErr
        setSuccessMsg(`Activiteit "${form.title}" bijgewerkt.`)
      } else {
        const { error: insErr } = await createActivities(rows)
        if (insErr) throw insErr
        setSuccessMsg(`Activiteit "${form.title}" opgeslagen.`)
      }

      cancelForm()
      await loadAll()
    } catch (err) {
      setError(`Opslaan mislukt: ${err.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      if (deleteConfirm.groupId) {
        const { error } = await deleteActivityGroup(deleteConfirm.groupId)
        if (error) throw error
        setSuccessMsg(`Reeks "${deleteConfirm.title}" verwijderd.`)
      } else {
        const { error } = await deleteActivity(deleteConfirm.id)
        if (error) throw error
        setSuccessMsg(`"${deleteConfirm.title}" verwijderd.`)
      }
      setDeleteConfirm(null)
      await loadAll()
    } catch (err) {
      setError(`Verwijderen mislukt: ${err.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green"></div>
      </div>
    )
  }

  const items = groupByGroupId(activities)

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Add button */}
      <div className="flex items-center justify-end mb-3">
        {!showForm && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 text-sm bg-vvz-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Activiteit toevoegen
          </button>
        )}
      </div>

      {/* Status messages */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {editingId || editingGroupId ? 'Activiteit bewerken' : 'Nieuwe activiteit'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                placeholder="Titel"
                autoFocus
              />
            </div>

            {/* Date type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datumtype</label>
              <select
                value={form.dateType}
                onChange={e => setForm({ ...form, dateType: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
              >
                <option value="single">Enkele datum</option>
                <option value="range">Periode</option>
                <option value="list">Datumlijst</option>
              </select>
            </div>

            {/* Date fields based on type */}
            {form.dateType === 'single' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                />
              </div>
            )}

            {form.dateType === 'range' && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum *</label>
                  <input
                    type="date"
                    value={form.dateStart}
                    onChange={e => setForm({ ...form, dateStart: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Einddatum</label>
                  <input
                    type="date"
                    value={form.dateEnd}
                    onChange={e => setForm({ ...form, dateEnd: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                  />
                </div>
              </div>
            )}

            {form.dateType === 'list' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datums (een per regel, jjjj-mm-dd) *</label>
                <textarea
                  value={form.dates}
                  onChange={e => setForm({ ...form, dates: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none font-mono"
                  placeholder="2026-04-01&#10;2026-04-08&#10;2026-04-15"
                />
              </div>
            )}

            {/* Time fields */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Starttijd</label>
                <input
                  type="time"
                  value={form.timeStart}
                  onChange={e => setForm({ ...form, timeStart: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Eindtijd</label>
                <input
                  type="time"
                  value={form.timeEnd}
                  onChange={e => setForm({ ...form, timeEnd: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                placeholder="Beschrijving"
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                placeholder="https://..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-vvz-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : (editingId || editingGroupId ? 'Wijziging opslaan' : 'Toevoegen')}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors"
              >
                Annuleer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activity list */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Titel</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Datum</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell whitespace-nowrap w-32">Tijd</th>
              <th className="text-right px-4 py-2.5 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Geen activiteiten gevonden.
                </td>
              </tr>
            )}
            {items.map((item, i) => {
              const isGroup = item.type === 'group'
              const row = isGroup ? item.rows[0] : item.row
              const itemId = isGroup ? item.groupId : row.id
              const isDeleting = deleteConfirm && (
                (deleteConfirm.groupId && deleteConfirm.groupId === item.groupId) ||
                (deleteConfirm.id && deleteConfirm.id === row.id)
              )

              if (isDeleting) {
                return (
                  <tr key={itemId} className="bg-red-50">
                    <td colSpan={4} className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 flex-1">
                          <strong>{deleteConfirm.title}</strong>{isGroup ? ' (hele reeks)' : ''} verwijderen? Dit kan niet ongedaan worden.
                        </span>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={handleDelete}
                            disabled={saving}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Ja, verwijder
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                          >
                            Annuleer
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={itemId} className={`group ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    <span className="flex items-center gap-2">
                      {row.title}
                      {isGroup && (
                        <span className="bg-vvz-green/10 text-vvz-green text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {item.rows.length}x
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {isGroup
                      ? item.rows.map(r => formatSortDate(r.sort_date)).map((d, i, arr) => (
                          <span key={i} className="block">{d}{i < arr.length - 1 ? ',' : ''}</span>
                        ))
                      : formatDateInfo(row)
                    }
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell whitespace-nowrap">
                    {formatTime(row.time_start, row.time_end)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-vvz-green hover:bg-vvz-green/10 rounded-lg transition-colors"
                        title="Bewerken"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({
                          id: isGroup ? null : row.id,
                          groupId: isGroup ? item.groupId : null,
                          title: row.title,
                        })}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
    </div>
  )
}
