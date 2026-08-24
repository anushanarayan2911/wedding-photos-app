import { useEffect } from 'react'
import type { DesignLanguageResult } from '../types'

const TAG_ID = 'design-language-font'

// Prefer the site's actual font file (from an @font-face rule) when we have
// one — most real sites self-host or license their fonts rather than use
// Google Fonts, so the name alone usually isn't enough to render it. Google
// Fonts is only a fallback for the (fairly rare) sites that use it.
export function useDesignFont(font: DesignLanguageResult['font'] | null | undefined) {
  useEffect(() => {
    if (!font?.family) return

    document.getElementById(TAG_ID)?.remove()

    if (font.src) {
      const style = document.createElement('style')
      style.id = TAG_ID
      style.textContent = `@font-face { font-family: "${font.family}"; src: url("${font.src}"); font-display: swap; }`
      document.head.appendChild(style)
      return
    }

    const link = document.createElement('link')
    link.id = TAG_ID
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:wght@400;700&display=swap`
    document.head.appendChild(link)
  }, [font?.family, font?.src])
}
