import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { QUICK_LINKS, NAV_SECTIONS } from '../lib/navigation'
import { fetchMenu, fetchQuickLinks } from '../services/menu'

/**
 * Normaliseert een database menu-item naar het formaat dat de render-logica verwacht.
 * Database: { label, type, children, tool_route, external_url, page_id, page }
 * Nav: { label, to, href, children }
 */
function normalizeMenuItem(item) {
  if (item.type === 'group') {
    return {
      label: item.label,
      children: (item.children || []).map(child => {
        if (child.type === 'group') {
          return {
            label: child.label,
            isSubGroup: true,
            children: (child.children || []).map(normalizeMenuItem).filter(Boolean),
          }
        }
        return normalizeMenuItem(child)
      }).filter(Boolean),
    }
  }

  const result = { label: item.label }

  if (item.type === 'external') {
    result.href = item.external_url
  } else if (item.type === 'tool') {
    result.to = item.tool_route
  } else if (item.type === 'page' && item.page?.slug) {
    result.to = `/pagina/${item.page.slug}`
  } else if (item.type === 'page_group') {
    const pages = item._groupPages || []
    if (pages.length === 0) return null
    return {
      label: item.label,
      isSubGroup: true,
      children: pages.map(p => ({
        label: p.title,
        to: `/pagina/${p.slug}`,
      })),
    }
  } else if (item.type === 'page') {
    return null  // pagina verwijderd
  }

  return result
}

/**
 * Normaliseert een database quick link naar het formaat dat de render-logica verwacht.
 */
function normalizeQuickLink(item) {
  const result = { label: item.label }

  if (item.type === 'external') {
    result.href = item.external_url
  } else if (item.type === 'tool') {
    result.to = item.tool_route
  } else if (item.type === 'page' && item.page?.slug) {
    result.to = `/pagina/${item.page.slug}`
  }

  return result
}

export default function TopNav() {
  const { user, profile, signOut } = useAuth()
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accordion, setAccordion] = useState(null)
  const [subAccordion, setSubAccordion] = useState(null)

  // Database-gedreven menu met fallback naar hardcoded navigatie
  const [navSections, setNavSections] = useState(NAV_SECTIONS)
  const [quickLinks, setQuickLinks] = useState(QUICK_LINKS)

  useEffect(() => {
    async function loadMenu() {
      try {
        const [menuResult, quickLinksResult] = await Promise.all([
          fetchMenu(),
          fetchQuickLinks(),
        ])

        if (!menuResult.error && menuResult.data && menuResult.data.length > 0) {
          const normalized = menuResult.data
            .map(normalizeMenuItem)
            .filter(Boolean)
            .filter(item => !item.children || item.children.length > 0)
          setNavSections(normalized)
        } else {
          console.warn('[TopNav] Menu uit database niet beschikbaar, fallback naar hardcoded navigatie')
        }

        if (!quickLinksResult.error && quickLinksResult.data && quickLinksResult.data.length > 0) {
          setQuickLinks(quickLinksResult.data.map(normalizeQuickLink))
        }
      } catch {
        // Fallback: gebruik hardcoded navigatie (al ingesteld als default)
      }
    }

    loadMenu()
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setAccordion(null)
    setSubAccordion(null)
    setUserDropdownOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  /** Rendert een link-item (tool, page, of external) */
  function renderLinkItem(child, className) {
    if (child.href) {
      return (
        <a
          key={child.href}
          href={child.href}
          target="_blank"
          rel="noopener noreferrer"
          className={typeof className === 'function' ? className({ isActive: false }) : className}
        >
          {child.label}
        </a>
      )
    }

    return (
      <NavLink
        key={child.to}
        to={child.to}
        className={className}
      >
        {child.label}
      </NavLink>
    )
  }

  return (
    <nav className="bg-vvz-green no-print">
      {/* Hamburgerbalk */}
      <div className="flex items-center justify-between px-4 py-2">
        <div>
          {!user && (
            <Link
              to="/login"
              state={{ from: { pathname: location.pathname } }}
              className="sm:hidden text-white/80 font-medium text-sm hover:text-white transition-colors"
            >
              Inloggen
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!user && (
            <Link
              to="/login"
              state={{ from: { pathname: location.pathname } }}
              className="hidden sm:inline text-white/80 font-medium text-sm hover:text-white transition-colors"
            >
              Inloggen
            </Link>
          )}
          {user && (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="text-white/80 font-medium text-sm hover:text-white transition-colors flex items-center gap-1"
              >
                {profile?.display_name || user.email}
                <svg className={`w-3 h-3 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {userDropdownOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg py-1 z-50">
                  <Link
                    to="/profiel"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Mijn profiel
                  </Link>
                  {user.app_metadata?.role === 'admin' && (
                    <Link
                      to="/beheer"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Beheer
                    </Link>
                  )}
                  <button
                    onClick={() => { setUserDropdownOpen(false); signOut() }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Uitloggen
                  </button>
                </div>
              )}
            </div>
          )}
          {!menuOpen && (
            <button
              onClick={() => setMenuOpen(true)}
              className="text-white p-1"
              aria-label="Menu openen"
            >
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Schermvullend menu — via portal zodat het buiten elke stacking context valt */}
      {createPortal(<div className={`fixed inset-0 z-[9999] bg-vvz-green text-white flex flex-col transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-y-0 pointer-events-auto' : '-translate-y-full pointer-events-none'}`}>

        {/* Topbalk: logo links, sluiten rechts */}
        <div className="flex items-start justify-between px-6 py-2 sm:py-4 shrink-0">
          <Link to="/" aria-label="Home" onClick={() => setMenuOpen(false)}>
            <img
              src={`${import.meta.env.BASE_URL}logo-vvz.png`}
              alt="VVZ'49"
              className="h-10 w-10 sm:h-32 sm:w-32 object-contain"
            />
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Menu sluiten"
            className="flex items-center gap-2 text-white font-medium text-lg"
          >
            <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Sluiten
          </button>
        </div>

        {/* Twee kolommen */}
        <div className="flex-1 min-h-0 overflow-y-auto flex justify-center px-6 py-2 sm:py-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-16 w-full max-w-2xl items-start">

            {/* Kolom 1: quick links + inloggen */}
            <div className="flex flex-col gap-1.5 sm:gap-3 whitespace-nowrap order-2 sm:order-1">
              {quickLinks.map(item =>
                item.href ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm sm:text-2xl font-light text-white/70 hover:text-white transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `text-sm sm:text-2xl font-light ${isActive ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors`
                    }
                  >
                    {item.label}
                  </NavLink>
                )
              )}
            </div>

            {/* Kolom 2: secties met accordion */}
            <div className="flex flex-col w-fit order-1 sm:order-2">
              {navSections.map((section, idx) => {
                if (section.children) {
                  const expanded = accordion === section.label
                  return (
                    <div key={section.label}>
                      <button
                        onClick={() => {
                          setAccordion(expanded ? null : section.label)
                          setSubAccordion(null)
                        }}
                        aria-expanded={expanded}
                        className={`flex items-center gap-2 text-base sm:text-3xl font-semibold uppercase tracking-wider text-white ${idx === 0 ? 'pb-1 sm:pb-3 pt-0' : 'py-1 sm:py-3'}`}
                      >
                        {section.label}
                        <svg className={`w-4 h-4 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expanded && (
                        <div className="pb-3 flex flex-col gap-1 pl-2">
                          {section.children.map(child => {
                            // Sub-verzamelitem (geneste groep)
                            if (child.isSubGroup && child.children) {
                              const subExpanded = subAccordion === child.label
                              return (
                                <div key={child.label}>
                                  <button
                                    onClick={() => setSubAccordion(subExpanded ? null : child.label)}
                                    aria-expanded={subExpanded}
                                    className="flex items-center gap-1.5 py-0.5 sm:py-1 text-base sm:text-2xl font-medium text-white/70 hover:text-white transition-colors"
                                  >
                                    {child.label}
                                    <svg className={`w-3 h-3 transition-transform shrink-0 ${subExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {subExpanded && (
                                    <div className="pb-1 flex flex-col gap-0.5 pl-4 sm:pl-3">
                                      {child.children.map(subChild =>
                                        renderLinkItem(subChild, ({ isActive }) =>
                                          `py-0.5 sm:py-1 text-sm sm:text-xl ${isActive ? 'text-white font-medium' : 'text-white/70 hover:text-white'} transition-colors`
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            }

                            // Gewoon link-item
                            return renderLinkItem(child, ({ isActive }) =>
                              `py-0.5 sm:py-1 text-base sm:text-2xl ${isActive ? 'text-white font-medium' : 'text-white/70 hover:text-white'} transition-colors`
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }
                return (
                  <NavLink
                    key={section.to}
                    to={section.to}
                    className={({ isActive }) =>
                      `text-base sm:text-3xl font-semibold uppercase tracking-wider ${idx === 0 ? 'pb-1 sm:pb-3 pt-0' : 'py-1 sm:py-3'} ${isActive ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors`
                    }
                  >
                    {section.label}
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>

        {/* Slogan */}
        <div className="px-6 py-3 sm:py-6 border-t border-white/20 shrink-0 text-center">
          <p className="text-white/80 text-xl sm:text-3xl" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
            Er is maar één club en dat is vvz!
          </p>
        </div>
      </div>, document.body)}
    </nav>
  )
}
