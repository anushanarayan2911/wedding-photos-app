export interface DesignLanguageResult {
  colors: string[]
  font: { family: string; category: string; src?: string } | null
  couple: {
    names: string | null
    date: string | null
    tagline: string | null
  }
}
