import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSponsors } from '../services/sponsors'

const CATEGORIE_LABELS = { goud: 'Goud', zilver: 'Zilver', brons: 'Brons', jeugdplan: 'Jeugdplan' }

const CATEGORIE_BADGE = {
  goud: 'bg-yellow-100 text-yellow-800',
  zilver: 'bg-gray-100 text-gray-700',
  brons: 'bg-orange-100 text-orange-800',
  jeugdplan: 'bg-green-100 text-green-800',
}

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSponsors().then(({ data }) => {
      setSponsors(data ?? [])
      setLoading(false)
    })
  }, [])

  const goud = sponsors.filter(s => s.categorie === 'goud')
  const zilver = sponsors.filter(s => s.categorie === 'zilver')
  const brons = sponsors.filter(s => s.categorie === 'brons')
  const jeugdplan = sponsors.filter(s => s.categorie === 'jeugdplan')

  if (loading) return <div className="text-center py-12 text-gray-400">Laden...</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-800">Onze sponsors</h2>
      </div>

      {/* Goud */}
      {goud.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-700">Goud</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORIE_BADGE.goud}`}>Hoofdsponsors</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {goud.map(s => (
              <Link
                key={s.id}
                to={`/sponsors/${s.slug}`}
              className="group flex items-center justify-center rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-8 h-40"
            style={{ backgroundColor: s.logo_achtergrond || '#ffffff' }}
              >
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.naam} className="max-h-24 w-auto object-contain group-hover:scale-105 transition-transform" />
                ) : (
                  <span className="text-lg font-semibold text-gray-700">{s.naam}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Zilver */}
      {zilver.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-700">Zilver</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORIE_BADGE.zilver}`}>Sponsors</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {zilver.map(s => (
              <a
                key={s.id}
                href={s.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4 h-24"
                style={{ backgroundColor: s.logo_achtergrond || '#ffffff' }}
              >
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.naam} className="max-h-12 w-auto object-contain group-hover:scale-105 transition-transform" />
                ) : (
                  <span className="text-sm font-medium text-gray-700 text-center">{s.naam}</span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Brons */}
      {brons.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-700">Brons</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORIE_BADGE.brons}`}>Sponsors</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {brons.map(s =>
              s.website_url ? (
                <a key={s.id} href={s.website_url} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 hover:text-vvz-green hover:border-vvz-green transition-colors">
                  {s.naam}
                </a>
              ) : (
                <span key={s.id} className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-700">
                  {s.naam}
                </span>
              )
            )}
          </div>
        </section>
      )}

      {/* Jeugdplan */}
      {jeugdplan.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-700">Jeugdplan</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORIE_BADGE.jeugdplan}`}>Sponsors</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {jeugdplan.map(s =>
              s.website_url ? (
                <a key={s.id} href={s.website_url} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 hover:text-vvz-green hover:border-vvz-green transition-colors">
                  {s.naam}
                </a>
              ) : (
                <span key={s.id} className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-700">
                  {s.naam}
                </span>
              )
            )}
          </div>
        </section>
      )}

      {sponsors.length === 0 && (
        <p className="text-gray-400 text-center py-12">Nog geen sponsors toegevoegd.</p>
      )}
    </div>
  )
}
