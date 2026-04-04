/**
 * Verwijdert inline width/height van iframes en wraps ze in een responsive container.
 * Voorkomt dat YouTube/Vimeo iframes buiten het scherm uitsteken op mobiel.
 */
export function makeIframesResponsive(html) {
  if (!html) return ''
  return html.replace(
    /<iframe([^>]*)>/gi,
    (_, attrs) => {
      const cleaned = attrs
        .replace(/\s*width=["'][^"']*["']/gi, '')
        .replace(/\s*height=["'][^"']*["']/gi, '')
        .replace(/\s*style=["'][^"']*["']/gi, '')
      return `<div style="position:relative;width:100%;aspect-ratio:16/9;"><iframe${cleaned} style="position:absolute;inset:0;width:100%;height:100%;">`
    }
  ).replace(/<\/iframe>/gi, '</iframe></div>')
}
