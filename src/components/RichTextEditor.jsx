import { useEffect, useRef } from 'react'

const TOOLS = [
  { cmd: 'bold', icon: 'B', title: 'Vetgedrukt', style: 'font-bold' },
  { cmd: 'italic', icon: 'I', title: 'Cursief', style: 'italic' },
  { cmd: 'insertUnorderedList', icon: '≡', title: 'Opsomming' },
  { cmd: 'insertOrderedList', icon: '1.', title: 'Genummerde lijst' },
]

const HEADINGS = [
  { label: 'Normaal', tag: 'div' },
  { label: 'Kop 2', tag: 'h2' },
  { label: 'Kop 3', tag: 'h3' },
]

export default function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [])

  function exec(cmd, val = null) {
    editorRef.current.focus()
    document.execCommand(cmd, false, val)
    onChange(editorRef.current.innerHTML)
  }

  function handleInput() {
    onChange(editorRef.current.innerHTML)
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-vvz-green">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {TOOLS.map(t => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            onMouseDown={e => { e.preventDefault(); exec(t.cmd) }}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 text-gray-700 transition-colors ${t.style || ''}`}
          >
            {t.icon}
          </button>
        ))}
        <div className="w-px h-4 bg-gray-300 mx-1" />
        {HEADINGS.map(h => (
          <button
            key={h.tag}
            type="button"
            onMouseDown={e => { e.preventDefault(); exec('formatBlock', h.tag) }}
            className="px-2 py-1 text-xs rounded hover:bg-gray-200 text-gray-600 transition-colors"
          >
            {h.label}
          </button>
        ))}
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          type="button"
          title="Link invoegen"
          onMouseDown={e => {
            e.preventDefault()
            const url = prompt('URL:')
            if (url) exec('createLink', url)
          }}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 text-gray-600 transition-colors"
        >
          🔗
        </button>
        <button
          type="button"
          title="Opmaak wissen"
          onMouseDown={e => { e.preventDefault(); exec('removeFormat') }}
          className="px-2 py-1 text-xs rounded hover:bg-gray-200 text-gray-400 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Bewerkbaar gebied */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[120px] px-3 py-2 text-sm text-gray-800 focus:outline-none
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
          [&_a]:text-vvz-green [&_a]:underline"
      />
    </div>
  )
}
