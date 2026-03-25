import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SECTION_LABELS = {
  '/trainingsschema': 'Trainingsschema',
  '/agenda': 'Agenda',
  '/plattegrond': 'Plattegrond',
  '/huistijl': 'Huistijl',
}

function useSectionLabel() {
  const { pathname } = useLocation()
  const key = Object.keys(SECTION_LABELS).find(k => pathname === k || pathname.startsWith(k + '/'))
  return key ? SECTION_LABELS[key] : null
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const sectionLabel = useSectionLabel()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-vvz-green text-white shadow-lg no-print">
        <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo-vvz.png`} alt="VVZ'49 logo" className="h-10 w-10 object-contain" />
            <span className="text-xl font-bold leading-none">VVZ'49 Toolbox</span>
          </Link>
          <div className="flex items-center gap-3">
            {sectionLabel && (
              <>
                <span className="text-white/40 text-xl font-light select-none leading-none">›</span>
                <span className="text-xl font-bold leading-none">{sectionLabel}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <button
                onClick={signOut}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
              >
                Uitloggen
              </button>
            ) : (
              <Link
                to="/login"
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
              >
                Inloggen
              </Link>
            )}
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mt-12 py-4 text-center text-xs text-gray-400 no-print">
        © {new Date().getFullYear()} VVZ'49 Toolbox · Gemaakt door Arjen van der Wal
      </footer>
    </div>
  )
}
