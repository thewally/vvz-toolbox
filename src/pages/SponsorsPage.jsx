import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSponsors, getSponsorGroepen } from '../services/sponsors'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function SponsorCard({ sponsor, size }) {
  const heeftTekst = size === 'groot' && sponsor.beschrijving && sponsor.beschrijving.replace(/<[^>]+>/g, '').trim()

  const logo = sponsor.logo_url ? (
    <img
      src={sponsor.logo_url}
      alt={sponsor.naam}
      className={`w-auto object-contain transition-transform group-hover:scale-105 ${size === 'groot' ? 'max-h-24' : 'max-h-12'}`}
    />
  ) : (
    <span className={`font-medium text-gray-700 text-center ${size === 'groot' ? 'text-lg' : 'text-sm'}`}>{sponsor.naam}</span>
  )

  if (size === 'groot' && (sponsor.website_url || heeftTekst)) {
    return (
      <div
        className="group relative flex items-center justify-center rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-8 h-40 overflow-hidden"
        style={{ backgroundColor: sponsor.logo_achtergrond || '#ffffff' }}
      >
        {logo}
        <div className="absolute inset-0 flex opacity-0 group-hover:opacity-100 transition-opacity">
          {sponsor.website_url && (
            <a
              href={sponsor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center text-white text-xs font-medium text-center px-3 bg-black/60 hover:bg-black/75 transition-colors ${heeftTekst ? 'w-1/2' : 'w-full rounded-xl'}`}
            >
              Ga naar de website
            </a>
          )}
          {heeftTekst && (
            <Link
              to={`/sponsors/${sponsor.slug}`}
              className={`flex items-center justify-center text-white text-xs font-medium text-center px-3 bg-vvz-green/80 hover:bg-vvz-green transition-colors ${sponsor.website_url ? 'w-1/2' : 'w-full rounded-xl'}`}
            >
              Meer informatie over {sponsor.naam}
            </Link>
          )}
        </div>
      </div>
    )
  }

  const cls = `group flex items-center justify-center rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all ${size === 'groot' ? 'p-8 h-40' : 'p-4 h-24'}`

  return sponsor.website_url ? (
    <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer"
      className={cls} style={{ backgroundColor: sponsor.logo_achtergrond || '#ffffff' }}>
      {logo}
    </a>
  ) : (
    <div className={cls} style={{ backgroundColor: sponsor.logo_achtergrond || '#ffffff' }}>
      {logo}
    </div>
  )
}

function SponsorTextItem({ sponsor }) {
  return sponsor.website_url ? (
    <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer"
      className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 hover:text-vvz-green hover:border-vvz-green transition-colors">
      {sponsor.naam}
    </a>
  ) : (
    <span className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-700">
      {sponsor.naam}
    </span>
  )
}

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState([])
  const [groepen, setGroepen] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSponsors(), getSponsorGroepen()]).then(([s, g]) => {
      setSponsors(s.data ?? [])
      setGroepen(g.data ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">Laden...</div>

  const visibleGroepen = groepen.filter(g => g.pagina_weergave !== 'geen')

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-800">Onze sponsors</h2>
      </div>

      {visibleGroepen.map(groep => {
        const groepSponsors = sponsors.filter(s => s.groep_id === groep.id)
        if (groepSponsors.length === 0) return null

        const badgeStyle = {
          backgroundColor: `rgba(${hexToRgb(groep.kleur)}, 0.15)`,
          color: groep.kleur,
        }

        return (
          <section key={groep.id} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-lg font-semibold text-gray-700">{groep.naam}</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={badgeStyle}>Sponsor</span>
            </div>

            {groep.pagina_weergave === 'groot' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {groepSponsors.map(s => <SponsorCard key={s.id} sponsor={s} size="groot" />)}
              </div>
            )}

            {groep.pagina_weergave === 'klein' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {groepSponsors.map(s => <SponsorCard key={s.id} sponsor={s} size="klein" />)}
              </div>
            )}
          </section>
        )
      })}

      {/* Groepen met geen pagina_weergave maar wel sponsors: toon als tekstlijst */}
      {groepen.filter(g => g.pagina_weergave === 'geen').map(groep => {
        const groepSponsors = sponsors.filter(s => s.groep_id === groep.id)
        if (groepSponsors.length === 0) return null
        const badgeStyle = {
          backgroundColor: `rgba(${hexToRgb(groep.kleur)}, 0.15)`,
          color: groep.kleur,
        }
        return (
          <section key={groep.id} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-lg font-semibold text-gray-700">{groep.naam}</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={badgeStyle}>Sponsor</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {groepSponsors.map(s => <SponsorTextItem key={s.id} sponsor={s} />)}
            </div>
          </section>
        )
      })}

      {sponsors.length === 0 && (
        <p className="text-gray-400 text-center py-12">Nog geen sponsors toegevoegd.</p>
      )}
    </div>
  )
}
