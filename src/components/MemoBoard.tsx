import { useMemo, useState, type ReactNode } from 'react'
import type { DesignLanguageResult } from '../types'
import { PHOTO_CATEGORY_ORDER, type CategorizedPhoto } from '../lib/categories'
import { toCssFontFamily } from '../lib/font'

interface MemoBoardProps {
  data: DesignLanguageResult
  sourceUrl: string | null
  uploadedPhotos: CategorizedPhoto[]
  onBack: () => void
}

const FALLBACK_GLANCE_ITEMS = [
  { label: 'Getting Ready', time: null },
  { label: 'Ceremony', time: null },
  { label: 'Reception', time: null },
  { label: 'Speeches', time: null },
  { label: 'Dancing', time: null },
  { label: 'Little Moments', time: null },
]

const ADD_MEMORY_OPTIONS = ['Add Photo', 'Add Video', 'Write a Memory']

function pickImage(images: string[], index: number): string | undefined {
  return images.length > 0 ? images[index % images.length] : undefined
}

function getRgb(cssColor: string): [number, number, number] {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return [255, 255, 255]

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1, 1)
  ctx.fillStyle = cssColor
  ctx.fillRect(0, 0, 1, 1)

  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

function withAlpha(cssColor: string, alpha: number) {
  const [r, g, b] = getRgb(cssColor)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getReadableTextColor(cssColor: string) {
  const [r, g, b] = getRgb(cssColor)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111111' : '#ffffff'
}

function isVibrant(cssColor: string) {
  const [r, g, b] = getRgb(cssColor)
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
  return s > 0.2 && l > 0.15 && l < 0.85
}

// colors[1] is just "the second-ranked color", not necessarily a good second
// brand color — it can be a plain gray body-text color, which would tint a
// whole section a muddy gray. Prefer another vibrant color if one exists,
// otherwise reuse the accent so alternating sections stay cohesive.
function pickSecondary(colors: string[], accent: string) {
  return colors.slice(1).find(isVibrant) ?? accent
}

// A real photo pulled from the site for this slot — renders nothing at all
// when the site didn't yield one, rather than a fake placeholder box.
function PhotoSlot({ src, label, className = '' }: { src?: string; label?: string; className?: string }) {
  if (!src) return null
  return <img src={src} alt={label ?? ''} className={`object-cover ${className}`} />
}

// Real wedding sites are laid out as full-width blocks of alternating color,
// not cards floating on one page-wide wash — this is the equivalent building
// block: a full-bleed background with content constrained to a readable width.
function FullBleedSection({
  background,
  headingFontFamily,
  title,
  subtitle,
  center = false,
  children,
}: {
  background: string
  headingFontFamily?: string
  title?: string
  subtitle?: string
  center?: boolean
  children: ReactNode
}) {
  return (
    <section className="w-full py-14" style={{ backgroundColor: background }}>
      <div className={`mx-auto max-w-4xl px-6 ${center ? 'text-center' : ''}`}>
        {title && (
          <h2 className="mb-1 text-xl font-bold" style={{ fontFamily: headingFontFamily }}>
            {title}
          </h2>
        )}
        {subtitle && <p className="mb-6 text-sm text-gray-500">{subtitle}</p>}
        {children}
      </div>
    </section>
  )
}

// The couple's way to link back here from their own wedding website — copies
// a URL that reopens this exact board (via ?site=), and shows it inline too
// since clipboard access isn't guaranteed everywhere.
function ShareBoardButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleClick() {
    setOpen(true)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable — the revealed input below still lets them copy manually
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} className="w-full px-5 py-3 text-sm font-bold hover:bg-gray-50">
        {copied ? 'Copied!' : 'Share This Board'}
      </button>
      {open && (
        <div className="border-t border-gray-300 p-3">
          <label className="mb-1 block text-left text-xs text-gray-500">
            Paste this link on your wedding website:
          </label>
          <input
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700"
          />
        </div>
      )}
    </div>
  )
}

export default function MemoBoard({ data, sourceUrl, uploadedPhotos, onBack }: MemoBoardProps) {
  const { colors, couple } = data
  const glanceItems = data.schedule.length > 0 ? data.schedule : FALLBACK_GLANCE_ITEMS

  // The board's structure now follows whichever categories the uploaded
  // photos actually fall into (see reference.md), in the day's chronological
  // order — no fixed set of sections with invented captions.
  const categorySections = useMemo(
    () =>
      PHOTO_CATEGORY_ORDER.map((category) => ({
        category,
        photos: uploadedPhotos.filter((photo) => photo.category === category),
      })).filter((section) => section.photos.length > 0),
    [uploadedPhotos],
  )

  // The couple's own uploads are more meaningful than anything scraped from
  // their site, so they take the first slots (the hero photo especially),
  // with the site's pulled photos filling in the rest.
  const images = useMemo(
    () => [...uploadedPhotos.map((photo) => photo.url), ...data.images],
    [uploadedPhotos, data.images],
  )

  const shareUrl = useMemo(() => {
    if (!sourceUrl) return null
    const url = new URL(window.location.href)
    url.search = ''
    url.searchParams.set('site', sourceUrl)
    return url.toString()
  }, [sourceUrl])

  const bodyFontFamily = useMemo(() => toCssFontFamily(data.bodyFont ?? data.font), [data.bodyFont, data.font])
  const headingFontFamily = useMemo(
    () => toCssFontFamily(data.headingFont ?? data.font),
    [data.headingFont, data.font],
  )

  const accent = colors[0] ?? '#111111'
  const secondary = useMemo(() => pickSecondary(colors, accent), [colors, accent])
  const accentText = useMemo(() => getReadableTextColor(accent), [accent])

  // Most sites are white, but plenty set something else at the page level
  // (cream, black, a soft tint) — that's as much a part of the look as the
  // accent color, so it stands in for the hardcoded white "base" sections.
  const siteBackground = data.background ?? '#ffffff'
  const baseText = useMemo(() => getReadableTextColor(siteBackground), [siteBackground])

  const accentTint = useMemo(() => withAlpha(accent, 0.12), [accent])
  const secondaryTint = useMemo(() => withAlpha(secondary, 0.12), [secondary])
  const closingTint = useMemo(() => withAlpha(secondary, 0.18), [secondary])
  const placeholderBackground = useMemo(() => withAlpha(secondary, 0.3), [secondary])

  // Cycled per category section so the number of "coloured sections" follows
  // however many categories actually have photos, instead of a fixed count.
  const sectionBackgrounds = [siteBackground, accentTint, secondaryTint]

  const names = couple.names ?? 'Your Names'
  const date = couple.date ?? 'Your Wedding Date'
  const tagline = couple.tagline ?? "A day filled with love, laughter, and moments we'll never forget."

  return (
    <div style={{ fontFamily: bodyFontFamily, backgroundColor: siteBackground, color: baseText }}>
      <div className="px-6 py-3" style={{ backgroundColor: siteBackground }}>
        <button
          type="button"
          onClick={onBack}
          className="mx-auto block max-w-4xl text-sm opacity-70 hover:opacity-100"
        >
          ← Back
        </button>
      </div>

      <FullBleedSection background={accentTint}>
        <PhotoSlot
          src={pickImage(images, 0)}
          label="Hero Image"
          className="mb-6 h-56 w-full rounded-md"
        />
        <h1 className="mb-2 text-4xl font-bold" style={{ fontFamily: headingFontFamily }}>
          {names}
        </h1>
        <p className="mb-3 text-sm text-gray-500">{date}</p>
        <p className="mb-6 text-gray-600">{tagline}</p>
        <button
          type="button"
          className="rounded-md border px-5 py-2 text-sm font-bold"
          style={{ backgroundColor: accent, color: accentText, borderColor: accent }}
        >
          Relive the Day ↓
        </button>
      </FullBleedSection>

      <FullBleedSection
        background={siteBackground}
        headingFontFamily={headingFontFamily}
        title="The Day at a Glance"
        subtitle="Jump to a moment in the timeline."
      >
        <div className="flex flex-wrap gap-8">
          {glanceItems.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2 text-center text-sm">
              <div className="h-10 w-10 rounded-full" style={{ backgroundColor: accent, opacity: 0.85 }} />
              <span className="text-gray-600">{item.label}</span>
              {item.time && <span className="text-xs text-gray-400">{item.time}</span>}
            </div>
          ))}
        </div>
      </FullBleedSection>

      {categorySections.map(({ category, photos }, i) => (
        <FullBleedSection
          key={category}
          background={sectionBackgrounds[i % sectionBackgrounds.length]}
          headingFontFamily={headingFontFamily}
          title={category}
          subtitle={`${photos.length} photo${photos.length === 1 ? '' : 's'} from this moment.`}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, photoIndex) => (
              <div key={photoIndex} className="aspect-[4/3] overflow-hidden rounded-md border border-gray-200">
                <img src={photo.url} alt={category} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </FullBleedSection>
      ))}

      <FullBleedSection
        background={sectionBackgrounds[categorySections.length % sectionBackgrounds.length]}
        headingFontFamily={headingFontFamily}
        title="Add Your Memory"
        subtitle="Were you there? Share your photos, videos, or a written memory."
      >
        <button
          type="button"
          className="mb-6 rounded-md px-4 py-2 text-sm font-bold"
          style={{ backgroundColor: accent, color: accentText }}
        >
          + Add Your Memory
        </button>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ADD_MEMORY_OPTIONS.map((label) => (
            <div key={label} className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-4 text-gray-900">
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: placeholderBackground }} />
              <span className="text-sm font-bold">{label}</span>
            </div>
          ))}
        </div>
      </FullBleedSection>

      <FullBleedSection background={closingTint} center>
        <PhotoSlot
          src={pickImage(images, images.length - 1)}
          label="Closing Image"
          className="mb-6 h-56 w-full rounded-md"
        />
        <h2 className="mb-2 text-2xl font-bold" style={{ fontFamily: headingFontFamily }}>
          Thank you for being part of our story.
        </h2>
        <p className="mb-6 text-gray-600">We're so grateful for every moment, every laugh, and every memory shared.</p>
        <div className="grid grid-cols-1 overflow-hidden rounded-md border border-gray-300 bg-white text-gray-900 sm:grid-cols-2 sm:divide-x sm:divide-gray-300">
          {shareUrl ? (
            <ShareBoardButton url={shareUrl} />
          ) : (
            <button type="button" disabled className="px-5 py-3 text-sm font-bold opacity-50">
              Share This Board
            </button>
          )}
          <button type="button" className="px-5 py-3 text-sm font-bold hover:bg-gray-50">
            Save Your Favourites
          </button>
        </div>
      </FullBleedSection>
    </div>
  )
}
