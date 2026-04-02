import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { useRef, useCallback, useEffect } from 'react'
import { uploadPageImage } from '../services/pages'

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-vvz-green focus:ring-offset-1 ${
        active
          ? 'bg-vvz-green text-white'
          : 'text-gray-600 hover:bg-gray-100'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

export default function TipTapEditor({ content, onChange, disabled = false }) {
  const fileInputRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Youtube.configure({ controls: false }),
      Link.configure({ openOnClick: false }),
      Underline,
    ],
    content: content || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || '')
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    const { data, error } = await uploadPageImage(file)
    if (error) {
      alert('Afbeelding uploaden mislukt: ' + error.message)
      return
    }
    editor.chain().focus().setImage({ src: data.url }).run()
    e.target.value = ''
  }, [editor])

  const handleAddLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL invoeren:', previousUrl || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const handleAddYoutube = useCallback(() => {
    if (!editor) return
    const url = window.prompt('YouTube URL invoeren:')
    if (!url) return
    editor.commands.setYoutubeVideo({ src: url })
  }, [editor])

  if (!editor) return null

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${disabled ? 'opacity-60' : ''}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50" role="toolbar" aria-label="Tekst opmaak">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          disabled={disabled}
          title="Vet"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          disabled={disabled}
          title="Cursief"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          disabled={disabled}
          title="Onderstreept"
        >
          <u>U</u>
        </ToolbarButton>

        <span className="w-px bg-gray-300 mx-1" role="separator" aria-orientation="vertical" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          disabled={disabled}
          title="Kop 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          disabled={disabled}
          title="Kop 3"
        >
          H3
        </ToolbarButton>

        <span className="w-px bg-gray-300 mx-1" role="separator" aria-orientation="vertical" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          disabled={disabled}
          title="Opsomming"
        >
          &#8226; Lijst
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          disabled={disabled}
          title="Genummerde lijst"
        >
          1. Lijst
        </ToolbarButton>

        <span className="w-px bg-gray-300 mx-1" role="separator" aria-orientation="vertical" />

        <ToolbarButton
          onClick={handleAddLink}
          active={editor.isActive('link')}
          disabled={disabled}
          title="Link"
        >
          Link
        </ToolbarButton>
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Afbeelding uploaden"
        >
          Afbeelding
        </ToolbarButton>
        <ToolbarButton
          onClick={handleAddYoutube}
          disabled={disabled}
          title="YouTube video"
        >
          YouTube
        </ToolbarButton>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleImageUpload}
        />
      </div>

      {/* Editor content */}
      <div className="prose max-w-none p-4 min-h-[200px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
