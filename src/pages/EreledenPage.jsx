import { useEffect, useState, useRef } from 'react'
import { fetchEreleden } from '../services/ereleden'

const CATEGORIE_LABELS = {
  erevoorzitter: 'Erevoorzitters',
  erelid: 'Ereleden',
  lid_van_verdienste: 'Leden van verdienste',
}

const CATEGORIE_ORDER = ['erevoorzitter', 'erelid', 'lid_van_verdienste']

function EreledenTabel({ items }) {
  if (items.length === 0) return null
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', fontSize: 8, fontWeight: 700, color: '#388E3C', textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 2, width: 36 }}>JAAR</th>
          <th style={{ textAlign: 'left', fontSize: 8, fontWeight: 700, color: '#388E3C', textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 2 }}>NAAM</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={item.id} style={{ borderTop: '1px solid #d1fae5' }}>
            <td style={{ fontSize: 11, color: '#374151', padding: '3px 0', fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' }}>{item.jaar}</td>
            <td style={{ fontSize: 11, color: '#111827', padding: '3px 0 3px 8px', verticalAlign: 'top' }}>
              {item.naam}
              {item.overleden && <span style={{ marginLeft: 4, color: '#6b7280' }}>†</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PrintLayout({ ereleden }) {
  const erevoorzitters = ereleden.filter(e => e.categorie === 'erevoorzitter')
  const ereledeLijst = ereleden.filter(e => e.categorie === 'erelid')
  const ledenVerdienste = ereleden.filter(e => e.categorie === 'lid_van_verdienste')

  const datum = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '12mm 14mm',
      fontFamily: 'Georgia, serif',
      backgroundColor: '#fff',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header: dun-dik-dun met logo eroverheen */}
      <div style={{ position: 'relative', marginBottom: 20, paddingTop: 24 }}>
        <div style={{ borderTop: '1px solid #388E3C' }} />
        <div style={{ borderTop: '4px solid #388E3C', margin: '3px 0' }} />
        <div style={{ borderTop: '1px solid #388E3C' }} />
        <img
          src={`${import.meta.env.BASE_URL}logo-vvz.png`}
          alt="VVZ'49"
          style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            height: 52, width: 52, objectFit: 'contain', display: 'block',
          }}
        />
      </div>

      {/* Titel */}
      <div style={{ textAlign: 'center', marginBottom: 20, marginTop: 12 }}>
        <div style={{
          fontFamily: "'Pinyon Script', 'Playfair Display', cursive",
          fontSize: 72,
          fontWeight: 700,
          color: '#388E3C',
          lineHeight: 1.1,
        }}>
          Galerij der Ereleden
          <br />
          &amp;&nbsp;Leden van Verdienste
        </div>
      </div>

      {/* Twee kolommen + footer — gecentreerd, smallere vaste breedte */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{ display: 'flex', gap: 24, width: '150mm', alignItems: 'flex-start' }}>
          {/* Linker kolom: Erevoorzitters + Ereleden */}
          <div style={{ flex: 1 }}>
            {erevoorzitters.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontFamily: "'Playfair Display', 'Georgia', serif", fontStyle: 'italic', fontWeight: 700, fontSize: 15, color: '#388E3C', marginBottom: 4 }}>
                  Erevoorzitters
                </h2>
                <EreledenTabel items={erevoorzitters} />
              </div>
            )}
            {ereledeLijst.length > 0 && (
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', 'Georgia', serif", fontStyle: 'italic', fontWeight: 700, fontSize: 15, color: '#388E3C', marginBottom: 4 }}>
                  Ereleden
                </h2>
                <EreledenTabel items={ereledeLijst} />
              </div>
            )}
          </div>

          {/* Rechter kolom: Leden van verdienste */}
          <div style={{ flex: 1 }}>
            {ledenVerdienste.length > 0 && (
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', 'Georgia', serif", fontStyle: 'italic', fontWeight: 700, fontSize: 15, color: '#388E3C', marginBottom: 4 }}>
                  Leden van verdienste
                </h2>
                <EreledenTabel items={ledenVerdienste} />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer: datum rechts tot rechterkolom, lijnen volle breedte */}
      <div style={{ marginTop: 20 }}>
        <div style={{ textAlign: 'right', marginBottom: 4 }}>
          <span style={{ fontSize: 8, color: '#374151', letterSpacing: 0.5 }}>PER {datum}</span>
        </div>
        <div style={{ borderTop: '1px solid #388E3C' }} />
        <div style={{ borderTop: '4px solid #388E3C', margin: '3px 0' }} />
        <div style={{ borderTop: '1px solid #388E3C' }} />
      </div>
    </div>
  )
}

function EreledenSectie({ cat, items }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-vvz-green italic">{CATEGORIE_LABELS[cat]}</h2>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <th className="px-6 py-2 text-left w-20">Jaar</th>
            <th className="px-6 py-2 text-left">Naam</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-2.5 text-sm text-gray-500 tabular-nums">{item.jaar}</td>
              <td className="px-6 py-2.5 text-sm text-gray-800">
                {item.naam}
                {item.overleden && <span className="ml-1.5 text-gray-400">†</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function EreledenPage() {
  const [ereleden, setEreleden] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const printRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchEreleden()
      if (error) setError(error.message)
      else setEreleden(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function handlePrint() {
    const printContents = printRef.current?.innerHTML
    if (!printContents) return
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Galerij der Ereleden - VVZ'49</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Pinyon+Script:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; }
    @page { size: A4; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>${printContents}</body>
</html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
          Kon ereleden niet laden: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 pt-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Galerij der Ereleden &amp; Leden van Verdienste</h1>
        <button
          onClick={handlePrint}
          className="shrink-0 inline-flex items-center gap-2 bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exporteer PDF
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        {/* Linker kolom: Erevoorzitters + Ereleden */}
        <div className="space-y-6">
          {['erevoorzitter', 'erelid'].map(cat => {
            const items = ereleden.filter(e => e.categorie === cat)
            if (items.length === 0) return null
            return <EreledenSectie key={cat} cat={cat} items={items} />
          })}
        </div>
        {/* Rechter kolom: Leden van verdienste */}
        <div>
          {(() => {
            const items = ereleden.filter(e => e.categorie === 'lid_van_verdienste')
            if (items.length === 0) return null
            return <EreledenSectie cat="lid_van_verdienste" items={items} />
          })()}
        </div>
      </div>

      {/* Verborgen print layout */}
      <div ref={printRef} style={{ display: 'none' }}>
        <PrintLayout ereleden={ereleden} />
      </div>
    </div>
  )
}
