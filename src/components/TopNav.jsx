import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { QUICK_LINKS, NAV_SECTIONS } from '../lib/navigation'

export default function TopNav() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accordion, setAccordion] = useState(null)

  useEffect(() => {
    setMenuOpen(false)
    setAccordion(null)
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

  return (
    <nav className="bg-vvz-green no-print">
      {/* Hamburgerbalk */}
      <div className="flex items-center justify-end px-4 py-2">
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

      {/* Schermvullend menu */}
      <div className={`fixed inset-0 z-50 bg-vvz-green text-white flex flex-col transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-y-0 pointer-events-auto' : '-translate-y-full pointer-events-none'}`}>

        {/* Topbalk: logo links, sluiten rechts */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <Link to="/" aria-label="Home" onClick={() => setMenuOpen(false)}>
            <img
              src={`${import.meta.env.BASE_URL}logo-vvz.png`}
              alt="VVZ'49"
              className="h-32 w-32 object-contain"
            />
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Menu sluiten"
            className="flex items-center gap-2 text-white font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Sluiten
          </button>
        </div>

        {/* Twee kolommen */}
        <div className="flex-1 overflow-y-auto flex justify-center px-6 py-6">
          <div className="flex gap-16 w-full max-w-2xl items-start">

            {/* Kolom 1: quick links */}
            <div className="flex flex-col gap-3 min-w-[140px]">
              {QUICK_LINKS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `text-2xl ${isActive ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            {/* Kolom 2: secties met accordion */}
            <div className="flex flex-col w-fit">
              {NAV_SECTIONS.map((section, idx) => {
                if (section.children) {
                  const expanded = accordion === section.label
                  return (
                    <div key={section.label}>
                      <button
                        onClick={() => setAccordion(expanded ? null : section.label)}
                        aria-expanded={expanded}
                        className={`flex items-center gap-2 text-xl font-semibold uppercase tracking-wider text-white ${idx === 0 ? 'pb-3 pt-0' : 'py-3'}`}
                      >
                        {section.label}
                        <svg className={`w-4 h-4 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expanded && (
                        <div className="pb-3 flex flex-col gap-1 pl-2">
                          {section.children.map(child => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              className={({ isActive }) =>
                                `py-1 text-xl ${isActive ? 'text-white font-medium' : 'text-white/70 hover:text-white'} transition-colors`
                              }
                            >
                              {child.label}
                            </NavLink>
                          ))}
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
                      `text-xl font-semibold uppercase tracking-wider ${idx === 0 ? 'pb-3 pt-0' : 'py-3'} ${isActive ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors`
                    }
                  >
                    {section.label}
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>

        {/* Auth onderaan */}
        <div className="px-6 py-4 border-t border-white/20 shrink-0">
          {user ? (
            <button onClick={signOut} className="text-sm text-white/70 hover:text-white transition-colors">
              Uitloggen
            </button>
          ) : (
            <Link
              to="/login"
              state={{ from: { pathname: location.pathname } }}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Inloggen
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
