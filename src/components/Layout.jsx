import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import SponsorSlider from './SponsorSlider'

export default function Layout() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className={`bg-vvz-green text-white no-print sticky top-0 z-40 transition-shadow duration-300 ${scrolled ? 'shadow-lg' : ''}`}>
        <TopNav />
        {/* Groot logo — gecentreerd, krimpt bij scrollen */}
        <Link
          to="/"
          aria-label="Home"
          className="absolute left-1/2 -translate-x-1/2 top-0 z-10 pointer-events-auto"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo-vvz.png`}
            alt="VVZ'49"
            className={`object-contain drop-shadow-md transition-all duration-300 ${scrolled ? 'h-12 w-12' : 'h-64 w-64'}`}
          />
        </Link>
      </header>
      <main className={`transition-all duration-300 ${scrolled ? 'pt-4' : 'pt-60'}`}>
        <Outlet />
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
