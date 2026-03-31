import { Outlet } from 'react-router-dom'
import { useState, useCallback } from 'react'

export default function TrainingschemaLayout() {
  const [exportHandler, setExportHandler] = useState(null)
  const [exporting, setExporting] = useState(false)

  // SchedulePage registers its export handler via this callback
  const registerExportHandler = useCallback((handler) => {
    setExportHandler(() => handler)
  }, [])

  const handleExportClick = async () => {
    if (exportHandler && !exporting) {
      setExporting(true)
      try {
        await exportHandler()
      } finally {
        setExporting(false)
      }
    }
  }

  return (
    <div>
      {/* PDF Export balk (alleen zichtbaar als exportHandler geregistreerd is) */}
      {exportHandler && (
        <div className="bg-white border-b border-gray-200 shadow-sm no-print">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-end h-10">
            <button
              onClick={handleExportClick}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? 'Exporteren...' : 'PDF exporteren'}
            </button>
          </div>
        </div>
      )}

      <Outlet context={{ registerExportHandler }} />
    </div>
  )
}
