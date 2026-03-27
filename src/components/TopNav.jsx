import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS } from '../lib/navigation'

function isActive(item, pathname) {
  if (item.to) return pathname === item.to || pathname.startsWith(item.to + '/')
  if (item.children) return item.children.some(child => pathname === child.to || pathname.startsWith(child.to + '/'))
  return false
}

export default function TopNav() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [mobileAccordion, setMobileAccordion] = useState(null)
  const dropdownTimeout = useRef(null)
  const navRef = useRef(null)

  // Sluit alles bij route change
  useEffect(() => {
    setMobileOpen(false)
    setOpenDropdown(null)
  }, [location.pathname])

  // Sluit dropdown bij klik buiten nav of Escape
  useEffect(() => {
    function handleClick(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Vergrendel body scroll als mobiel menu open is
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function handleMouseEnter(label) {
    clearTimeout(dropdownTimeout.current)
    setOpenDropdown(label)
  }

  function handleMouseLeave() {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 150)
  }

  const activeClass = 'bg-white/20'
  const baseClass = 'px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/20 transition-colors'

  return (
    <nav ref={navRef} className="bg-vvz-green no-print">
      {/* Desktop nav */}
      <div className="max-w-7xl mx-auto px-4 hidden md:flex items-center gap-1">
        {NAV_ITEMS.map(item => {
          const active = isActive(item, location.pathname)
          if (item.children) {
            const isOpen = openDropdown === item.label
            return (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => handleMouseEnter(item.label)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                  className={`${baseClass} ${active ? activeClass : ''} flex items-center gap-1`}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                >
                  {item.label}
                  <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div
                    role="menu"
                    className="absolute top-full left-0 mt-1 bg-white text-gray-800 shadow-lg rounded-md border border-gray-200 min-w-[180px] z-50 py-1 overflow-hidden"
                  >
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        role="menuitem"
                        className={({ isActive }) =>
                          `block px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${isActive ? 'font-semibold text-vvz-green' : ''}`
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
              className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ''}`}
            >
              {item.label}
            </NavLink>
          )
        })}

        {/* Auth knop rechts */}
        <div className="ml-auto">
          {user ? (
            <button onClick={signOut} className={`${baseClass} opacity-80 hover:opacity-100`}>
              Uitloggen
            </button>
          ) : (
            <Link
              to="/login"
              state={{ from: { pathname: location.pathname } }}
              className={`${baseClass} opacity-80 hover:opacity-100`}
            >
              Inloggen
            </Link>
          )}
        </div>
      </div>

      {/* Mobiele header balk */}
      <div className="md:hidden flex items-center justify-end px-4 py-2">
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white p-1"
            aria-label="Menu openen"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Mobiel menu paneel */}
      {mobileOpen && (
        <div className="md:hidden bg-vvz-green text-white">
          {/* Sluitknop */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Menu sluiten"
            className="flex items-center gap-2 px-4 py-3 text-white font-medium w-full text-left border-b border-white/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Sluiten
          </button>

          {NAV_ITEMS.map(item => {
            if (item.children) {
              const expanded = mobileAccordion === item.label
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setMobileAccordion(expanded ? null : item.label)}
                    aria-expanded={expanded}
                    className="flex items-center justify-between w-full px-4 py-3 border-b border-white/10 text-sm font-medium"
                  >
                    {item.label}
                    <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expanded && item.children.map(child => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `block pl-8 pr-4 py-2.5 border-b border-white/10 text-sm ${isActive ? 'font-semibold' : 'opacity-90'}`
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block px-4 py-3 border-b border-white/10 text-sm font-medium ${isActive ? 'bg-white/20' : ''}`
                }
              >
                {item.label}
              </NavLink>
            )
          })}

          {/* Auth onderaan */}
          <div className="border-t border-white/30 mt-2 pt-2 pb-3 px-4">
            {user ? (
              <button onClick={signOut} className="text-sm font-medium opacity-90">
                Uitloggen
              </button>
            ) : (
              <Link
                to="/login"
                state={{ from: { pathname: location.pathname } }}
                className="text-sm font-medium opacity-90"
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
