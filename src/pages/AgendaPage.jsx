import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchActivities,
  createActivities,
  updateActivity,
  deleteActivity,
  deleteActivityGroup,
  formDataToRows,
} from '../services/activities'

const DUTCH_MONTHS_LONG = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

const DUTCH_DAYS_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

const DUTCH_DAYS_LONG = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]

function parseDate(iso) {
  return new Date(iso + 'T00:00:00')
}

function formatDateBadge(iso) {
  const d = parseDate(iso)
  return {
    weekday: DUTCH_DAYS_SHORT[d.getDay()],
    day: String(d.getDate()),
    month: DUTCH_MONTHS_LONG[d.getMonth()].slice(0, 3),
  }
}

function formatTimeRange(activity) {
  const { date_start, date_end, time_start, time_end } = activity

  if (date_start && date_end) {
    const s = parseDate(date_start)
    const e = parseDate(date_end)
    let startPart = `${DUTCH_DAYS_LONG[s.getDay()]} ${s.getDate()} ${DUTCH_MONTHS_LONG[s.getMonth()]}`
    if (time_start) startPart += ` ${time_start.slice(0, 5)} uur`
    let endPart = `${DUTCH_DAYS_LONG[e.getDay()]} ${e.getDate()} ${DUTCH_MONTHS_LONG[e.getMonth()]}`
    if (time_end) endPart += ` ${time_end.slice(0, 5)} uur`
    return `${startPart} t/m ${endPart}`
  }

  if (time_start && time_end) return `${time_start.slice(0, 5)} \u2013 ${time_end.slice(0, 5)} uur`
  if (time_start) return `${time_start.slice(0, 5)} uur`
  return ''
}

function groupByMonth(activities) {
  const map = new Map()
  for (const a of activities) {
    const iso = a.date ?? a.dates_item ?? a.date_start ?? a.sort_date
    const d = parseDate(iso)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(a)
  }
  return map
}

function groupActivitiesByGroupId(activities) {
  const result = []
  const groupMap = new Map()

  for (const a of activities) {
    if (a.group_id) {
      if (!groupMap.has(a.group_id)) {
        const group = { ...a, _groupRows: [a] }
        groupMap.set(a.group_id, group)
        result.push(group)
      } else {
        groupMap.get(a.group_id)._groupRows.push(a)
      }
    } else {
      result.push(a)
    }
  }
  return result
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

const INPUT_CLASS = 'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none'

function buildFormFromActivity(activity) {
  const isGroup = activity._groupRows && activity._groupRows.length > 1

  if (isGroup) {
    return {
      title: activity.title,
      description: activity.description || '',
      dateType: 'list',
      date: '',
      dateStart: '',
      dateEnd: '',
      dates: activity._groupRows.map(r => r.dates_item).filter(Boolean).join('\n'),
      timeStart: activity.time_start?.slice(0, 5) || '',
      timeEnd: activity.time_end?.slice(0, 5) || '',
      url: activity.url || '',
    }
  }

  let dateType = 'single'
  let date = activity.date || ''
  let dateStart = ''
  let dateEnd = ''

  if (activity.date_start) {
    dateType = 'range'
    dateStart = activity.date_start
    dateEnd = activity.date_end || ''
  }

  return {
    title: activity.title,
    description: activity.description || '',
    dateType,
    date,
    dateStart,
    dateEnd,
    dates: '',
    timeStart: activity.time_start?.slice(0, 5) || '',
    timeEnd: activity.time_end?.slice(0, 5) || '',
    url: activity.url || '',
  }
}

function InlineForm({ form, setForm, onSubmit, onCancel, onDelete, saving, error, isNew, isGroup }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && (
        <div className="bg-red-50 text-red-700 text-xs p-2 rounded-lg flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Titel *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className={INPUT_CLASS}
          placeholder="Titel"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Datumtype</label>
        <select
          value={form.dateType}
          onChange={e => setForm({ ...form, dateType: e.target.value })}
          className={INPUT_CLASS + ' w-auto'}
        >
          <option value="single">Enkele datum</option>
          <option value="range">Periode</option>
          <option value="list">Datumlijst</option>
        </select>
      </div>

      {form.dateType === 'single' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Datum *</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className={INPUT_CLASS + ' w-auto'}
          />
        </div>
      )}

      {form.dateType === 'range' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Startdatum *</label>
            <input
              type="date"
              value={form.dateStart}
              onChange={e => setForm({ ...form, dateStart: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Einddatum</label>
            <input
              type="date"
              value={form.dateEnd}
              onChange={e => setForm({ ...form, dateEnd: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      )}

      {form.dateType === 'list' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Datums (een per regel, jjjj-mm-dd) *</label>
          <textarea
            value={form.dates}
            onChange={e => setForm({ ...form, dates: e.target.value })}
            rows={3}
            className={INPUT_CLASS + ' font-mono'}
            placeholder={"2026-04-01\n2026-04-08\n2026-04-15"}
          />
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Starttijd</label>
          <input
            type="time"
            value={form.timeStart}
            onChange={e => setForm({ ...form, timeStart: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Eindtijd</label>
          <input
            type="time"
            value={form.timeEnd}
            onChange={e => setForm({ ...form, timeEnd: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Beschrijving</label>
        <textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={2}
          className={INPUT_CLASS}
          placeholder="Beschrijving"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
        <input
          type="url"
          value={form.url}
          onChange={e => setForm({ ...form, url: e.target.value })}
          className={INPUT_CLASS}
          placeholder="https://..."
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-vvz-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Opslaan...' : (isNew ? 'Toevoegen' : 'Opslaan')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors"
        >
          Annuleer
        </button>
        {!isNew && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Verwijderen"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </form>
  )
}

function ActivityCard({ activity, user, isEditing, onStartEdit, onSave, onCancel, onDelete, saving, formError }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const isGroup = activity._groupRows && activity._groupRows.length > 1
  const badgeDate = activity.date ?? activity.dates_item ?? activity.date_start ?? activity.sort_date
  const badge = formatDateBadge(badgeDate)
  const time = formatTimeRange(activity)

  useEffect(() => {
    if (isEditing) {
      setForm(buildFormFromActivity(activity))
      setDeleteConfirm(false)
    }
  }, [isEditing])

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form, activity)
  }

  function handleDeleteClick() {
    setDeleteConfirm(true)
  }

  function handleDeleteConfirm() {
    onDelete(activity)
  }

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border-2 border-vvz-green overflow-hidden">
        <div className="p-4">
          {deleteConfirm ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                <strong>{activity.title}</strong>{isGroup ? ' (hele reeks)' : ''} verwijderen? Dit kan niet ongedaan worden.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={saving}
                  className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Ja, verwijder
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                >
                  Annuleer
                </button>
              </div>
            </div>
          ) : (
            <InlineForm
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              onCancel={onCancel}
              onDelete={handleDeleteClick}
              saving={saving}
              error={formError}
              isNew={false}
              isGroup={isGroup}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow ${user ? 'cursor-pointer' : ''}`}
      onClick={user ? () => onStartEdit(activity) : undefined}
    >
      {/* Date badge */}
      <div className="flex flex-col items-center justify-center w-20 shrink-0 bg-vvz-green text-white px-2 py-3">
        <span className="text-xs uppercase font-medium opacity-80">{badge.weekday}</span>
        <span className="text-2xl font-bold leading-tight">{badge.day}</span>
        <span className="text-xs uppercase font-medium opacity-80">{badge.month}</span>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 min-w-0">
        <div className="flex items-start gap-2">
          <h3 className="font-semibold text-gray-800 leading-snug">
            {activity.url && !user ? (
              <a href={activity.url} target="_blank" rel="noopener noreferrer" className="text-vvz-green hover:underline">
                {activity.title}
              </a>
            ) : (
              activity.title
            )}
          </h3>
          {isGroup && (
            <span className="shrink-0 bg-vvz-green/10 text-vvz-green text-xs font-bold px-2 py-0.5 rounded-full">
              {activity._groupRows.length}x
            </span>
          )}
          {user && (
            <button
              onClick={(e) => { e.stopPropagation(); onStartEdit(activity) }}
              className="shrink-0 ml-auto p-1 text-gray-300 hover:text-vvz-green hover:bg-vvz-green/10 rounded-lg transition-colors"
              title="Bewerken"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

        {time && (
          <p className="text-sm text-gray-500 mt-1">{time}</p>
        )}

        {isGroup && (
          <p className="text-sm text-gray-500 mt-1">
            {activity._groupRows.map(r => {
              const d = parseDate(r.dates_item ?? r.sort_date)
              return `${d.getDate()} ${DUTCH_MONTHS_LONG[d.getMonth()].slice(0, 3)}`
            }).join(', ')}
          </p>
        )}

        {activity.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-3">{activity.description}</p>
        )}
      </div>
    </div>
  )
}

function NewActivityCard({ onSave, onCancel, saving, formError }) {
  const [form, setForm] = useState(EMPTY_FORM)

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form, null)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-vvz-green/40 overflow-hidden">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nieuwe activiteit</h3>
        <InlineForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          saving={saving}
          error={formError}
          isNew={true}
        />
      </div>
    </div>
  )
}

export default function AgendaPage() {
  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [globalError, setGlobalError] = useState(null)
  const [formError, setFormError] = useState(null)

  // Track which item is being edited: activity id, group_id, or 'new'
  const [editingKey, setEditingKey] = useState(null)

  useEffect(() => {
    loadActivities()
  }, [])

  async function loadActivities() {
    setLoading(true)
    setGlobalError(null)
    const { data, error } = await fetchActivities({ hidePast: true })
    if (error) {
      setGlobalError(error.message)
    } else {
      setActivities(data ?? [])
    }
    setLoading(false)
  }

  function getEditingKey(activity) {
    const isGroup = activity._groupRows && activity._groupRows.length > 1
    return isGroup ? `group-${activity.group_id}` : `id-${activity.id}`
  }

  function startEdit(activity) {
    setEditingKey(getEditingKey(activity))
    setFormError(null)
    setSuccessMsg(null)
  }

  function startAdd() {
    setEditingKey('new')
    setFormError(null)
    setSuccessMsg(null)
  }

  function cancelEdit() {
    setEditingKey(null)
    setFormError(null)
  }

  function validateForm(form) {
    if (!form.title.trim()) return 'Titel is verplicht.'
    if (form.dateType === 'single' && !form.date) return 'Datum is verplicht.'
    if (form.dateType === 'range' && !form.dateStart) return 'Startdatum is verplicht.'
    if (form.dateType === 'list') {
      const parsed = form.dates.split('\n').map(l => l.trim()).filter(l => /^\d{4}-\d{2}-\d{2}$/.test(l))
      if (parsed.length === 0) return 'Voer minimaal een geldige datum in (jjjj-mm-dd).'
    }
    return null
  }

  async function handleSave(form, activity) {
    const validationError = validateForm(form)
    if (validationError) {
      setFormError(validationError)
      return
    }

    setFormError(null)
    setSaving(true)
    setSuccessMsg(null)
    setGlobalError(null)

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
      if (!activity) {
        // New activity
        const { error: insErr } = await createActivities(rows)
        if (insErr) throw insErr
        setSuccessMsg(`Activiteit "${form.title}" opgeslagen.`)
      } else {
        const isGroup = activity._groupRows && activity._groupRows.length > 1
        if (isGroup) {
          const { error: delErr } = await deleteActivityGroup(activity.group_id)
          if (delErr) throw delErr
          const { error: insErr } = await createActivities(rows)
          if (insErr) throw insErr
          setSuccessMsg(`Reeks "${form.title}" bijgewerkt.`)
        } else {
          const { error: updErr } = await updateActivity(activity.id, rows[0])
          if (updErr) throw updErr
          setSuccessMsg(`Activiteit "${form.title}" bijgewerkt.`)
        }
      }

      setEditingKey(null)
      setFormError(null)
      await loadActivities()
    } catch (err) {
      setFormError(`Opslaan mislukt: ${err.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(activity) {
    setSaving(true)
    setFormError(null)
    setGlobalError(null)
    setSuccessMsg(null)

    try {
      const isGroup = activity._groupRows && activity._groupRows.length > 1
      if (isGroup) {
        const { error } = await deleteActivityGroup(activity.group_id)
        if (error) throw error
        setSuccessMsg(`Reeks "${activity.title}" verwijderd.`)
      } else {
        const { error } = await deleteActivity(activity.id)
        if (error) throw error
        setSuccessMsg(`"${activity.title}" verwijderd.`)
      }
      setEditingKey(null)
      await loadActivities()
    } catch (err) {
      setFormError(`Verwijderen mislukt: ${err.message || err}`)
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

  const grouped = groupActivitiesByGroupId(activities)
  const monthGroups = groupByMonth(grouped)

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      {/* Status messages */}
      {globalError && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {globalError}
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

      {/* Add button */}
      {user && editingKey !== 'new' && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 text-sm text-vvz-green border border-vvz-green/30 bg-white px-4 py-2 rounded-lg font-medium hover:bg-vvz-green hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Activiteit toevoegen
          </button>
        </div>
      )}

      {/* New activity inline form */}
      {user && editingKey === 'new' && (
        <div className="mb-6">
          <NewActivityCard
            onSave={handleSave}
            onCancel={cancelEdit}
            saving={saving}
            formError={formError}
          />
        </div>
      )}

      {/* Activity list */}
      {grouped.length === 0 && editingKey !== 'new' ? (
        <div className="text-center pt-4">
          <p className="text-gray-500">Geen komende activiteiten.</p>
        </div>
      ) : (
        Array.from(monthGroups.entries()).map(([key, items]) => {
          const [year, monthIdx] = key.split('-').map(Number)
          const label = `${DUTCH_MONTHS_LONG[monthIdx]} ${year}`
          return (
            <div key={key} className="mb-8">
              <h2 className="text-lg font-bold text-gray-700 capitalize mb-4 border-b border-gray-200 pb-2">
                {label}
              </h2>
              <div className="flex flex-col gap-3">
                {items.map(a => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    user={user}
                    isEditing={editingKey === getEditingKey(a)}
                    onStartEdit={startEdit}
                    onSave={handleSave}
                    onCancel={cancelEdit}
                    onDelete={handleDelete}
                    saving={saving}
                    formError={editingKey === getEditingKey(a) ? formError : null}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

    </div>
  )
}
