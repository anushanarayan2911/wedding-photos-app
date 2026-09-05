export interface DesignLanguageResult {
  colors: string[]
  font: { family: string; category: string; src?: string } | null
  headingFont: { family: string; category: string; src?: string } | null
  bodyFont: { family: string; category: string; src?: string } | null
  background: string | null
  couple: {
    names: string | null
    date: string | null
    tagline: string | null
  }
  schedule: { label: string; time: string | null }[]
  images: string[]
}
