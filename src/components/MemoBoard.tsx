import { useEffect, useMemo, type ReactNode } from 'react'
import type { DesignLanguageResult } from '../types'

interface MemoBoardProps {
  data: DesignLanguageResult
  onBack: () => void
}

const GLANCE_ITEMS = ['Getting Ready', 'Ceremony', 'Reception', 'Speeches', 'Dancing', 'Little Moments']

const MISSED_MOMENTS = [
  { title: 'The First Look', description: 'A quiet moment before the ceremony.' },
  { title: 'Cocktail Hour', description: 'Laughter and catching up.' },
  { title: 'The Send-Off', description: 'A sparkler farewell.' },
  { title: 'Late-Night Dancing', description: 'When the lights went low.' },
]

const GUEST_ITEMS = [
  { label: 'Guest Photo', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
  { label: 'Guest Video', text: 'A short clip from the dance floor.' },
  { label: 'Guest Photo', text: 'A candid from the reception.' },
  { label: 'Guest Quote', text: '"Lorem ipsum dolor sit amet, consectetur adipiscing elit."' },
  { label: 'Guest Quote', text: '"Lorem ipsum dolor sit amet, consectetur adipiscing elit."' },
  { label: 'Guest Memory', text: 'A written note from the day.' },
  { label: 'Guest Memory', text: 'A small moment that stuck.' },
]

const COUPLE_FAVORITES = [
  { title: 'Our First Look', description: 'Why we love this moment: it was the first time we saw each other.' },
  { title: 'The First Dance', description: 'Why we love this moment: it felt like time stopped.' },
  { title: 'The Send-Off', description: 'Why we love this moment: the sparklers were magic.' },
]

const ADD_MEMORY_OPTIONS = ['Add Photo', 'Add Video', 'Write a Memory']

function toCssFontFamily(font: DesignLanguageResult['font']) {
  if (!font) return undefined
  const generic = font.category.toLowerCase().replace(/\s+/g, '-')
  return `"${font.family}", ${generic}`
}

function getReadableTextColor(cssColor: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return '#ffffff'

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1, 1)
  ctx.fillStyle = cssColor
  ctx.fillRect(0, 0, 1, 1)

  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111111' : '#ffffff'
}

function PlaceholderImage({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-gray-300 text-xs font-bold text-gray-600 ${className}`}>
      {label}
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="mx-auto mb-6 max-w-4xl rounded-lg border border-gray-200 bg-white p-8">
      <h2 className="mb-1 text-xl font-bold">{title}</h2>
      {subtitle && <p className="mb-6 text-sm text-gray-500">{subtitle}</p>}
      {children}
    </section>
  )
}

export default function MemoBoard({ data, onBack }: MemoBoardProps) {
  const { colors, font, couple } = data

  const fontFamily = useMemo(() => toCssFontFamily(font), [font])
  const accent = colors[0] ?? '#111111'
  const accentText = useMemo(() => getReadableTextColor(accent), [accent])

  const names = couple.names ?? 'Your Names'
  const date = couple.date ?? 'Your Wedding Date'
  const tagline = couple.tagline ?? "A day filled with love, laughter, and moments we'll never forget."

  useEffect(() => {
    if (!font?.family) return

    const id = 'design-language-font'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:wght@400;700&display=swap`
  }, [font?.family])

  return (
    <div className="bg-gray-100 px-6 py-10" style={{ fontFamily }}>
      <button
        type="button"
        onClick={onBack}
        className="mx-auto mb-6 block max-w-4xl text-sm text-gray-500 hover:text-black"
      >
        ← Back
      </button>

      <section className="mx-auto mb-6 max-w-4xl rounded-lg border border-gray-200 bg-white p-8">
        <PlaceholderImage label="Hero Image" className="mb-6 h-56 w-full rounded-md" />
        <h1 className="mb-2 text-4xl font-bold">{names}</h1>
        <p className="mb-3 text-sm text-gray-500">{date}</p>
        <p className="mb-6 text-gray-600">{tagline}</p>
        <button
          type="button"
          className="rounded-md border px-5 py-2 text-sm font-bold"
          style={{ backgroundColor: accent, color: accentText, borderColor: accent }}
        >
          Relive the Day ↓
        </button>
      </section>

      <Section title="The Day at a Glance" subtitle="Jump to a moment in the timeline.">
        <div className="flex flex-wrap gap-8">
          {GLANCE_ITEMS.map((item) => (
            <div key={item} className="flex flex-col items-center gap-2 text-center text-sm">
              <div className="h-10 w-10 rounded-full" style={{ backgroundColor: accent, opacity: 0.85 }} />
              <span className="text-gray-600">{item}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Moments You Might Have Missed"
        subtitle="Some of the beautiful moments that happened while you were celebrating elsewhere."
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {MISSED_MOMENTS.map((moment) => (
            <div key={moment.title} className="rounded-md border border-gray-200 p-3">
              <PlaceholderImage className="mb-3 h-24 w-full rounded" />
              <h3 className="mb-1 text-sm font-bold">{moment.title}</h3>
              <p className="text-xs text-gray-500">{moment.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="From The Guests"
        subtitle="Photos, videos, quotes and memories shared by everyone who was there."
      >
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {GUEST_ITEMS.map((item, i) => (
            <div key={i} className="mb-4 break-inside-avoid rounded-md border border-gray-200 p-3">
              <PlaceholderImage className="mb-3 h-32 w-full rounded" />
              <h3 className="mb-1 text-sm font-bold">{item.label}</h3>
              <p className="text-xs text-gray-500">{item.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="From the Couple" subtitle={`Our favourite memories from the day, chosen by ${names}.`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COUPLE_FAVORITES.map((item) => (
            <div key={item.title} className="rounded-md border border-gray-200 p-3">
              <PlaceholderImage className="mb-3 h-32 w-full rounded" />
              <h3 className="mb-1 text-sm font-bold">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Add Your Memory" subtitle="Were you there? Share your photos, videos, or a written memory.">
        <button
          type="button"
          className="mb-6 rounded-md px-4 py-2 text-sm font-bold"
          style={{ backgroundColor: accent, color: accentText }}
        >
          + Add Your Memory
        </button>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ADD_MEMORY_OPTIONS.map((label) => (
            <div key={label} className="flex items-center gap-3 rounded-md border border-gray-200 p-4">
              <div className="h-8 w-8 rounded-full bg-gray-300" />
              <span className="text-sm font-bold">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <section className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white p-8 text-center">
        <PlaceholderImage label="Closing Image" className="mb-6 h-56 w-full rounded-md" />
        <h2 className="mb-2 text-2xl font-bold">Thank you for being part of our story.</h2>
        <p className="mb-6 text-gray-600">We're so grateful for every moment, every laugh, and every memory shared.</p>
        <div className="grid grid-cols-1 overflow-hidden rounded-md border border-gray-300 sm:grid-cols-2 sm:divide-x sm:divide-gray-300">
          <button type="button" className="px-5 py-3 text-sm font-bold hover:bg-gray-50">
            Share This Board
          </button>
          <button type="button" className="px-5 py-3 text-sm font-bold hover:bg-gray-50">
            Save Your Favourites
          </button>
        </div>
      </section>
    </div>
  )
}
