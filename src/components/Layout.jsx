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
      <main className="pt-60 relative">
        {/* Banner achter het logo */}
        <div className="absolute top-0 left-0 right-0 h-40 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <img
            src={`${import.meta.env.BASE_URL}banner-gras.jpg`}
            alt=""
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div className="relative" style={{ zIndex: 1 }}>
          <Outlet />
        </div>
      </main>
      <div className="mt-12 pb-28 no-print" />

      {/* Sponsor slider + footer — altijd zichtbaar onderaan */}
      <div className="fixed bottom-0 left-0 right-0 z-40 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <SponsorSlider />
        <footer className="bg-gray-200 py-2 text-center text-xs text-gray-600 no-print">
          © {new Date().getFullYear()} Website van VVZ'49 · Gemaakt door Arjen van der Wal
        </footer>
      </div>
    </div>
  )
}
