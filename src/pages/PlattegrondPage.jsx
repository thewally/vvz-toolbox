const base = import.meta.env.BASE_URL

export default function PlattegrondPage() {
  const downloads = [
    { label: 'PDF (A4)', file: `${base}plattegrond/plattegrond-a4.pdf` },
    { label: 'PDF (A3)', file: `${base}plattegrond/plattegrond-a3.pdf` },
    { label: 'SVG', file: `${base}plattegrond/plattegrond.svg` },
    { label: 'EPS', file: `${base}plattegrond/plattegrond.eps` },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <p className="text-gray-500 mb-6">Sportpark Zonnegloren — overzicht van het complex en de veldindeling</p>

      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mb-8">
        <img
          src={`${base}plattegrond/plattegrond.svg`}
          alt="Plattegrond Sportpark Zonnegloren"
          className="w-full h-auto block"
        />
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Downloaden</h2>
      <div className="flex flex-wrap gap-3">
        {downloads.map(({ label, file }) => (
          <a
            key={file}
            href={file}
            download
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-vvz-green text-white font-medium rounded-lg hover:bg-vvz-green/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
