import { Link, Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import SponsorSlider from './SponsorSlider'

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
          className="absolute left-1/2 -translate-x-1/2 top-0 sm:top-1/2 z-10"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo-vvz.png`}
            alt="VVZ'49"
            className="h-64 w-64 object-contain drop-shadow-md"
          />
        </Link>
      </header>
      <main className="pt-60">
        <Outlet />
      </main>
      <footer className="mt-12 py-4 text-center text-xs text-gray-400 no-print pb-20">
        © {new Date().getFullYear()} Website van VVZ'49 · Gemaakt door Arjen van der Wal
      </footer>

      {/* Sponsor slider — altijd zichtbaar onderaan */}
      <div className="fixed bottom-0 left-0 right-0 z-40 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <SponsorSlider />
      </div>
    </div>
  )
}
