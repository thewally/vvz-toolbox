import { useEffect, useState } from 'react'
import { fetchActivities } from '../services/activities'

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

function ActivityCard({ activity }) {
  const isGroup = activity._groupRows && activity._groupRows.length > 1
  const badgeDate = activity.date ?? activity.dates_item ?? activity.date_start ?? activity.sort_date
  const badge = formatDateBadge(badgeDate)
  const time = formatTimeRange(activity)

  return (
    <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
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
            {activity.url ? (
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

export default function ActiviteitenPage() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadActivities()
  }, [])

  async function loadActivities() {
    setLoading(true)
    setError(null)
    const { data, error } = await fetchActivities({ hidePast: true })
    if (error) {
      setError(error.message)
    } else {
      setActivities(data ?? [])
    }
    setLoading(false)
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
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {grouped.length === 0 ? (
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
                  <ActivityCard key={a.id} activity={a} />
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
