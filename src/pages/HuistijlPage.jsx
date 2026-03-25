const ASSETS = [
  {
    naam: 'VVZ\'49 Logo',
    beschrijving: 'Officieel clublogo',
    thumbnail: '/huistijl/logo-vvz.png',
    downloads: [
      { label: 'PNG', file: '/huistijl/logo-vvz.png' },
      { label: 'AI', file: '/huistijl/logo-vvz.ai' },
    ],
  },
]

export default function HuistijlPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <p className="text-gray-500 mb-8">Officiële huistijlmiddelen van VVZ'49 — logo's en andere bestanden</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {ASSETS.map((asset) => (
          <div key={asset.naam} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 p-6 flex items-center justify-center h-40">
              <img
                src={asset.thumbnail}
                alt={asset.naam}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-800 mb-0.5">{asset.naam}</h3>
              <p className="text-sm text-gray-500 mb-3">{asset.beschrijving}</p>
              <div className="flex flex-wrap gap-2">
                {asset.downloads.map(({ label, file }) => (
                  <a
                    key={file}
                    href={file}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-vvz-green text-white text-sm font-medium rounded-lg hover:bg-vvz-green/90 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                    </svg>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
