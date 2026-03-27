import { Link, Outlet } from 'react-router-dom'
import TopNav from './TopNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-vvz-green text-white shadow-lg no-print relative">
        {/* Logo — absoluut gecentreerd, overlapt boven en onder */}
        <TopNav />
        {/* Logo — gecentreerd, hangt volledig onder de header */}
        <Link
          to="/"
          aria-label="Home"
          className="absolute left-1/2 -translate-x-1/2 top-full z-10 -mt-4"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo-vvz.png`}
            alt="VVZ'49"
            className="h-40 w-40 object-contain drop-shadow-md"
          />
        </Link>
      </header>
      <main className="pt-40">
        <Outlet />
      </main>
      <footer className="mt-12 py-4 text-center text-xs text-gray-400 no-print">
        © {new Date().getFullYear()} VVZ'49 Toolbox · Gemaakt door Arjen van der Wal
      </footer>
    </div>
  )
}
