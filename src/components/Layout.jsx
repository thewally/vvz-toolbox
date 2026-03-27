import { Link, Outlet } from 'react-router-dom'
import TopNav from './TopNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-vvz-green text-white shadow-lg no-print relative">
        {/* Logo — gecentreerd, overlapt onderrand */}
        <div className="flex justify-center pt-2 pb-0">
          <Link to="/" className="relative z-10 block -mb-16" aria-label="Home">
            <img
              src={`${import.meta.env.BASE_URL}logo-vvz.png`}
              alt="VVZ'49"
              className="h-32 w-32 object-contain drop-shadow-md"
            />
          </Link>
        </div>
        <TopNav />
      </header>
      <main className="pt-20">
        <Outlet />
      </main>
      <footer className="mt-12 py-4 text-center text-xs text-gray-400 no-print">
        © {new Date().getFullYear()} VVZ'49 Toolbox · Gemaakt door Arjen van der Wal
      </footer>
    </div>
  )
}
