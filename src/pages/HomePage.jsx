import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchQuickLinks } from '../services/menu'
import { fetchAllPages } from '../services/pages'
import { fetchPublicNewsItems } from '../services/news'
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
  const [cards, setCards] = useState(undefined) // undefined = nog laden, null = DB bereikt maar leeg, [] = data
  const [newsItems, setNewsItems] = useState([])

  useEffect(() => {
    async function loadHomeCards() {
      try {
        const [qlResult, pagesResult, newsResult] = await Promise.all([
          fetchQuickLinks(),
          fetchAllPages(),
          fetchPublicNewsItems(3),
        ])

        if (newsResult.data) setNewsItems(newsResult.data)

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
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0">
          {displayCards && displayCards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {displayCards.map((card, idx) => (
                <QuickLinkCard
                  key={card.id || card.to || idx}
                  label={card.label}
                  description={card.description}
                  icon={card.icon}
                  to={card.to}
                  external={card.external}
                />
              ))}
            </div>
          )}
        </div>

        {newsItems.length > 0 && (
          <aside className="w-full lg:w-96 shrink-0">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nieuws</h3>
            <div className="space-y-4">
              {newsItems.map(item => (
                <Link key={item.id} to={`/nieuws/${item.slug}`} className="flex gap-3 group border-b border-gray-100 pb-4 last:border-0">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-20 h-20 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">
                      {new Date(item.published_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-vvz-green transition-colors leading-snug">
                      {item.title}
                    </p>
                    {item.intro && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {item.intro}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/nieuws" className="inline-block mt-3 text-sm text-vvz-green hover:underline">
              Meer nieuws &rarr;
            </Link>
          </aside>
        )}
      </div>
    </div>
  )
}
