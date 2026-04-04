import { useState, useEffect } from 'react'

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}
import { Link } from 'react-router-dom'
import { fetchQuickLinks } from '../services/menu'
import { fetchAllPages } from '../services/pages'
import { fetchPublicNewsItems } from '../services/news'
import { fetchActivities } from '../services/activities'
import { QUICK_LINK_ICONS } from '../lib/quickLinkIcons'

const CARD_CLASS = "group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"

/** Standaard document-icoon als fallback */
const DEFAULT_ICON = (
  <svg className="w-16 h-16 text-vvz-green group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)

/** Hardcoded fallback kaartjes */
const FALLBACK_CARDS = [
  { label: 'Activiteiten', description: 'Komende activiteiten en evenementen', to: '/activiteiten', icon: 'calendar' },
  { label: 'Trainingsschema', description: 'Weekoverzicht van trainingstijden en veldindeling', to: '/trainingsschema', icon: 'calendar' },
  { label: 'Programma', description: 'Aankomende wedstrijden', to: '/wedstrijden/programma', icon: 'football' },
  { label: 'Uitslagen', description: 'Recente wedstrijdresultaten', to: '/wedstrijden/uitslagen', icon: 'clipboard' },
  { label: 'Teams Senioren', description: 'Alle senioren teams', to: '/teams/senioren', icon: 'users' },
  { label: 'Teams Veteranen', description: 'Alle veteranen teams', to: '/teams/veteranen', icon: 'users' },
  { label: 'Teams Junioren', description: 'JO13 t/m JO19', to: '/teams/junioren', icon: 'users' },
  { label: 'Teams Pupillen', description: 'JO7 t/m JO12', to: '/teams/pupillen', icon: 'users' },
  { label: 'Teams Zaalvoetbal', description: 'Alle zaalvoetbal teams', to: '/teams/zaalvoetbal', icon: 'users' },
  { label: 'Plattegrond', description: 'Overzicht van het complex en de veldindeling', to: '/plattegrond', icon: 'map' },
  { label: 'Huistijl', description: "Logo's en officiele huistijlmiddelen", to: '/huistijl', icon: 'document' },
  { label: 'Sponsors', description: 'Onze trouwe sponsors en partners', to: '/sponsors', icon: 'star' },
]

function getIconElement(iconKey) {
  const icon = QUICK_LINK_ICONS[iconKey]
  if (!icon) return DEFAULT_ICON
  // Kloon het icoon met grotere classes voor de homepage kaartjes
  return (
    <span className="w-16 h-16 text-vvz-green group-hover:scale-110 transition-transform duration-200 flex items-center justify-center [&>svg]:w-16 [&>svg]:h-16">
      {icon}
    </span>
  )
}

function CardWrapper({ to, external, children }) {
  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={CARD_CLASS}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className={CARD_CLASS}>
      {children}
    </Link>
  )
}

function QuickLinkCard({ label, description, icon, to, external }) {
  return (
    <CardWrapper to={to} external={external}>
      <div className="bg-vvz-green/10 p-6 flex items-center justify-center">
        {getIconElement(icon)}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-vvz-green transition-colors">
          {label}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </CardWrapper>
  )
}

export default function HomePage() {
  const [cards, setCards] = useState(undefined)
  const [newsItems, setNewsItems] = useState([])
  const [activities, setActivities] = useState([])

  useEffect(() => {
    async function loadHomeCards() {
      try {
        const [qlResult, pagesResult, newsResult, activitiesResult] = await Promise.all([
          fetchQuickLinks(),
          fetchAllPages(),
          fetchPublicNewsItems(3),
          fetchActivities({ hidePast: true }),
        ])

        if (newsResult.data) setNewsItems(newsResult.data)
        if (activitiesResult.data) {
          // Groepeer lijst-items op group_id en toon alleen de eerste (eerstvolgende) datum
          const seen = new Set()
          const deduped = activitiesResult.data.filter(item => {
            if (!item.group_id) return true
            if (seen.has(item.group_id)) return false
            seen.add(item.group_id)
            return true
          })
          setActivities(deduped.slice(0, 5))
        }

        if (qlResult.error || !qlResult.data) {
          setCards(undefined)
          return
        }

        // Filter op show_on_home
        const homeLinks = qlResult.data.filter(ql => ql.show_on_home)

        if (homeLinks.length === 0) {
          setCards(null)
          return
        }

        // Bouw page_id -> slug lookup
        const pageSlugMap = new Map()
        if (pagesResult.data) {
          for (const page of pagesResult.data) {
            pageSlugMap.set(page.id, page.slug)
          }
        }

        // Bouw kaartjes data
        const cardData = homeLinks.map(ql => {
          let to = '/'
          let external = false

          if (ql.type === 'tool' && ql.tool_route) {
            to = ql.tool_route
          } else if (ql.type === 'page' && ql.page_id) {
            const slug = ql.page?.slug || pageSlugMap.get(ql.page_id)
            to = slug ? `/pagina/${slug}` : '/'
          } else if (ql.type === 'external' && ql.external_url) {
            to = ql.external_url
            external = true
          }

          return {
            id: ql.id,
            label: ql.label,
            description: ql.description || '',
            icon: ql.icon || 'document',
            to,
            external,
          }
        })

        setCards(cardData)
      } catch {
        // Database niet bereikbaar, gebruik fallback
        setCards(undefined)
      }
    }

    loadHomeCards()
  }, [])

  // undefined = laden/fout -> fallback, null = DB leeg -> geen kaartjes, array = data
  const displayCards = cards === undefined ? FALLBACK_CARDS : cards

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* Breed: nieuws */}
        <main className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Nieuws</h2>
          {newsItems.length > 0 ? (
            <div className="space-y-4">
              {newsItems.map(item => (
                <Link key={item.id} to={`/nieuws/${item.slug}`} className="flex gap-4 group bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-24 h-24 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-1">
                      {new Date(item.published_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="font-semibold text-gray-800 group-hover:text-vvz-green transition-colors leading-snug">
                      {item.title}
                    </p>
                    {item.content && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {stripHtml(item.content).slice(0, 150)}{stripHtml(item.content).length > 150 ? '…' : ''}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
              <Link to="/nieuws" className="inline-block mt-2 text-sm text-vvz-green hover:underline">
                Alle nieuwsberichten &rarr;
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Er zijn momenteel geen nieuwsberichten.</p>
          )}
        </main>

        {/* Smal: activiteiten */}
        <aside className="w-full lg:w-72 shrink-0">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Activiteiten</h2>
          {activities.length > 0 ? (
            <div className="space-y-2">
              {activities.map(item => {
                const dateStr = item.date ?? item.dates_item ?? item.date_start ?? item.sort_date
                const dateObj = dateStr ? new Date(dateStr) : null
                const weekdag = dateObj ? dateObj.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '') : null
                const day = dateObj ? dateObj.toLocaleDateString('nl-NL', { day: 'numeric' }) : null
                const month = dateObj ? dateObj.toLocaleDateString('nl-NL', { month: 'short' }) : null
                return (
                  <div key={item.id} className="flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {dateObj && (
                      <div className="flex flex-col items-center justify-center w-16 shrink-0 bg-vvz-green/10 text-vvz-green px-2 py-3">
                        <span className="text-[11px] font-normal opacity-70 leading-none">{weekdag}</span>
                        <span className="text-2xl font-bold leading-tight">{day}</span>
                        <span className="text-[11px] font-medium opacity-80 uppercase leading-none">{month}</span>
                      </div>
                    )}
                    <div className="flex-1 p-3 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{item.title}</p>
                      {item.time_start && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.time_start.slice(0, 5)} uur</p>
                      )}
                    </div>
                  </div>
                )
              })}
              <Link to="/activiteiten" className="inline-block mt-1 text-sm text-vvz-green hover:underline">
                Alle activiteiten &rarr;
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Geen aankomende activiteiten.</p>
          )}
        </aside>

      </div>
    </div>
  )
}
