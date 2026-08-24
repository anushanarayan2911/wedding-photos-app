import type { DesignLanguageResult } from '../types'

export function toCssFontFamily(font: DesignLanguageResult['font']) {
  if (!font) return undefined
  const generic = font.category.toLowerCase().replace(/\s+/g, '-')
  return `"${font.family}", ${generic}`
}
