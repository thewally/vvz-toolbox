export default function SponsorWordenPage() {
  const pakketten = [
    {
      naam: 'Goud',
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      header: 'bg-yellow-50',
      voordelen: [
        'Groot logo op de sponsorspagina (max. 3 sponsors naast elkaar)',
        'Eigen detailpagina met beschrijving en link naar uw website',
        'Groot logo in de sponsorslider op de homepage',
        'Maximale zichtbaarheid als hoofdsponsor',
      ],
    },
    {
      naam: 'Zilver',
      badge: 'bg-gray-100 text-gray-700 border-gray-200',
      header: 'bg-gray-50',
      voordelen: [
        'Logo op de sponsorspagina (max. 6 sponsors naast elkaar)',
        'Link naar uw website',
        'Logo in de sponsorslider op de homepage (gedeeld met één andere zilversponsor)',
      ],
    },
    {
      naam: 'Brons',
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
      header: 'bg-orange-50',
      voordelen: [
        'Naamsvermelding op de sponsorspagina',
        'Link naar uw website',
      ],
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-800">Sponsor worden?</h2>
        <p className="text-gray-500 mt-2">
          Steun VVZ'49 en vergroot uw zichtbaarheid in de regio Soest.
          Kies het pakket dat bij u past.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {pakketten.map(p => (
          <div key={p.naam} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className={`${p.header} px-6 py-5 flex items-center gap-3`}>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${p.badge}`}>{p.naam}</span>
            </div>
            <ul className="px-6 py-5 space-y-3">
              {p.voordelen.map((v, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-vvz-green shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {v}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-vvz-green/5 border border-vvz-green/20 rounded-2xl p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Interesse?</h3>
        <p className="text-gray-600 mb-4">
          Neem contact met ons op voor meer informatie over de sponsormogelijkheden bij VVZ'49.
        </p>
        <a
          href="mailto:info@vvz49.nl"
          className="inline-flex items-center gap-2 bg-vvz-green text-white px-6 py-3 rounded-xl font-medium hover:bg-vvz-green-dark transition-colors"
        >
          Stuur een e-mail
        </a>
      </div>
    </div>
  )
}
