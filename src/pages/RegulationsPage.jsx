import { useEffect, useState } from 'react'
import { fetchDocuments, getDocumentPublicUrl, formatFileSize } from '../services/documents'

const PRIVACY_URL = 'https://www.sportlink.com/privacy/'

export default function RegulationsPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data, error } = await fetchDocuments()
      if (!mounted) return
      if (error) {
        setError(error.message)
      } else {
        setDocuments(data ?? [])
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reglementen & Documenten</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Privacyverklaring - altijd bovenaan, niet verwijderbaar */}
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-lg bg-vvz-green/10 flex items-center justify-center text-vvz-green">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-800">Privacyverklaring</h2>
              <p className="text-sm text-gray-500 mt-0.5">Lees hoe VVZ'49 omgaat met persoonsgegevens</p>
            </div>
            <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </div>
        </a>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-400 px-1 pt-2">Nog geen documenten beschikbaar.</p>
        ) : (
          documents.map(doc => {
            const publicUrl = getDocumentPublicUrl(doc.file_path)
            return (
              <a
                key={doc.id}
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-lg bg-vvz-green/10 flex items-center justify-center text-vvz-green">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-800 truncate">{doc.title}</h2>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">
                      {doc.file_name}
                      {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}
