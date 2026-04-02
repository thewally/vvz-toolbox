import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchQuickLinks } from '../services/menu'
import { fetchAllPages } from '../services/pages'
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

  useEffect(() => {
    async function loadHomeCards() {
      try {
        const [qlResult, pagesResult] = await Promise.all([
          fetchQuickLinks(),
          fetchAllPages(),
        ])

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
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-800">Welkom bij de website van VVZ&apos;49</h2>
        <p className="text-gray-500 mt-2">Snelle links naar de belangrijkste onderdelen</p>
      </div>

      {displayCards && displayCards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
      ) : displayCards === null ? (
        <p className="text-center text-gray-400 py-8">
          Er zijn nog geen snelkoppelingen ingesteld.
        </p>
      ) : null}
    </div>
  )
}
