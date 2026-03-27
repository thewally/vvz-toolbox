import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS } from '../lib/navigation'

export default function TopNav() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accordion, setAccordion] = useState(null)

  // Sluit menu bij route change
  useEffect(() => {
    setMenuOpen(false)
    setAccordion(null)
  }, [location.pathname])

  // Vergrendel body scroll als menu open is
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // Sluit met Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <nav className="bg-vvz-green no-print">
      {/* Balk met hamburger rechtsbovenin */}
      <div className="flex items-center justify-end px-4 py-2">
        {!menuOpen && (
          <button
            onClick={() => setMenuOpen(true)}
            className="text-white p-1"
            aria-label="Menu openen"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Schermvullend menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-vvz-green text-white flex flex-col">
          {/* Sluitknop */}
          <div className="flex items-center justify-end px-4 py-4">
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

          {/* Menu-items */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {NAV_ITEMS.map(item => {
              if (item.children) {
                const expanded = accordion === item.label
                return (
                  <div key={item.label} className="border-b border-white/20">
                    <button
                      onClick={() => setAccordion(expanded ? null : item.label)}
                      aria-expanded={expanded}
                      className="flex items-center justify-between w-full py-4 text-xl font-semibold"
                    >
                      {item.label}
                      <svg className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expanded && (
                      <div className="pb-3 pl-4 flex flex-col gap-2">
                        {item.children.map(child => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              `py-2 text-lg ${isActive ? 'font-bold' : 'opacity-80'}`
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
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block py-4 text-xl font-semibold border-b border-white/20 ${isActive ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`
                  }
                >
                  {item.label}
                </NavLink>
              )
            })}
          </div>

          {/* Auth onderaan */}
          <div className="px-6 py-6 border-t border-white/30">
            {user ? (
              <button
                onClick={signOut}
                className="text-lg font-semibold opacity-80 hover:opacity-100"
              >
                Uitloggen
              </button>
            ) : (
              <Link
                to="/login"
                state={{ from: { pathname: location.pathname } }}
                className="text-lg font-semibold opacity-80 hover:opacity-100"
              >
                Inloggen
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
