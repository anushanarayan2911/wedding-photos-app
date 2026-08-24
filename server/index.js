import express from 'express'
import * as cheerio from 'cheerio'

const PORT = process.env.PORT || 3001

// Some sites' servers close connections in ways that trip an internal
// assertion in Node's fetch implementation (undici), which throws outside any
// promise chain we control and would otherwise crash this whole process —
// taking every other in-flight request down with it. This is a stateless
// proxy (no per-request state survives a request), so logging and staying up
// is the right tradeoff over letting one bad site poison the server for
// everyone else.
process.on('uncaughtException', (err) => {
  console.error('[uncaught exception]', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[unhandled rejection]', reason)
})

const GENERIC_FONT_KEYWORDS = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'inherit',
  'initial', 'unset', 'emoji', 'math', 'fangsong',
])

const SYSTEM_FONT_KEYWORDS = new Set([
  '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'helvetica',
  'helvetica neue', 'arial', 'noto sans', 'liberation sans',
  'apple color emoji', 'segoe ui emoji', 'segoe ui symbol', 'noto color emoji',
])

const IGNORED_COLORS = new Set([
  '#fff', '#ffffff', '#000', '#000000', 'white', 'black',
  'transparent', 'currentcolor', 'inherit', 'none',
])

// Component-library/framework CSS (icon fonts, carousel widgets, page-builder
// internals) generates rules that have nothing to do with the site's actual
// design language, but can otherwise dominate frequency-based extraction by
// sheer volume. Scoped out wherever we can tie a color/font back to its
// originating selector.
const NOISE_SELECTOR_PATTERN = /wix-ui-tpa|\btpa[_-]|swiper-|slick-|owl-carousel|\bicon(s)?\b|fa-solid|fa-regular|fa-brands|material-icons/i
const ICON_FONT_NAME_PATTERN = /icon(s)?(\s|$)|glyphicon|font\s?awesome|material\s?icons|ionicons|feather|remixicon|bootstrap-icons/i

const MONTHS_FULL = 'January|February|March|April|May|June|July|August|September|October|November|December'
const MONTHS_ABBR = 'Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec'
const ANY_MONTH = `(?:${MONTHS_FULL}|${MONTHS_ABBR})`

// "Month Day, Year" — June 22, 2025 / Jun. 22, 2025
const DATE_REGEX_MONTH_FIRST = new RegExp(`\\b${ANY_MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`, 'i')
// "Day [of] Month[,] Year" — 22nd of June, 2025 / 22 June 2025
const DATE_REGEX_DAY_FIRST = new RegExp(
  `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${ANY_MONTH})\\.?,?\\s+(\\d{4})\\b`,
  'i',
)

const MONTH_INDEX = new Map([
  ['january', 0], ['jan', 0],
  ['february', 1], ['feb', 1],
  ['march', 2], ['mar', 2],
  ['april', 3], ['apr', 3],
  ['may', 4],
  ['june', 5], ['jun', 5],
  ['july', 6], ['jul', 6],
  ['august', 7], ['aug', 7],
  ['september', 8], ['sept', 8], ['sep', 8],
  ['october', 9], ['oct', 9],
  ['november', 10], ['nov', 10],
  ['december', 11], ['dec', 11],
])
// Numeric MM/DD/YYYY or MM.DD.YYYY (US convention — ambiguous with DD/MM elsewhere, but MM/DD is by far the common case on US wedding sites)
const DATE_REGEX_NUMERIC = /\b(0?[1-9]|1[0-2])[/.](0?[1-9]|[12]\d|3[01])[/.](\d{4})\b/

const MONTH_NAME_SET = new Set([...MONTHS_FULL.split('|'), ...MONTHS_ABBR.split('|')].map((w) => w.toLowerCase()))

// Common page-chrome words that sit right next to a couple's names in a hero
// section ("In Details Andres & Gabriela ARE GETTING married") and would
// otherwise get swept into the match by a purely capitalized-word regex.
const NAME_FILLER_WORDS = new Set([
  'terms', 'conditions', 'privacy', 'faq', 'q', 'help', 'contact', 'copyright',
  'in', 'the', 'our', 'we', 'were', 'join', 'us', 'for', 'at', 'on', 'to',
  'and', 'of', 'a', 'an', 'is', 'are', 'will', 'be', 'you', 'your', 'please',
  'welcome', 'home', 'about', 'rsvp', 'schedule', 'registry', 'gallery',
  'travel', 'story', 'gift', 'gifts', 'thank', 'thanks', 'celebrate',
  'celebration', 'day', 'details', 'detail', 'info', 'information',
  'wedding', 'weddings', 'save', 'date', 'getting', 'married', 'marrying',
])

function isNameWord(word) {
  if (!/^[A-Z][a-zA-Z'.-]*$/.test(word)) return false
  if (word === word.toUpperCase()) return false // ALL-CAPS chrome text ("ARE", "RSVP"), not a name
  const lower = word.toLowerCase()
  return !NAME_FILLER_WORDS.has(lower) && !MONTH_NAME_SET.has(lower)
}

// --- css noise filtering ----------------------------------------------------

// Strips out rules whose selector marks them as component-library/framework
// internals (icon fonts, carousel widgets, page-builder UI kits) before we do
// any frequency-based scanning. This is a lightweight, non-nested-aware CSS
// split — good enough here because backtracking naturally resolves nested
// blocks (e.g. `@media {...}`) into their innermost selector/body pairs.
function nonNoiseCssBody(css) {
  const parts = []
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = ruleRegex.exec(css))) {
    if (NOISE_SELECTOR_PATTERN.test(m[1])) continue
    parts.push(m[2])
  }
  return parts.join('\n')
}

// --- colors ---------------------------------------------------------------

function parseColor(str) {
  const value = str.trim()

  if (value.startsWith('#')) {
    let hex = value.slice(1)
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
    if (hex.length !== 6) return null
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    }
  }

  if (value.startsWith('rgb')) {
    const nums = (value.match(/[\d.]+/g) || []).map(Number)
    if (nums.length < 3) return null
    return { r: nums[0], g: nums[1], b: nums[2], a: nums[3] ?? 1 }
  }

  if (value.startsWith('hsl')) {
    const nums = (value.match(/[\d.]+/g) || []).map(Number)
    if (nums.length < 3) return null
    const [h, s, l] = [nums[0], nums[1] / 100, nums[2] / 100]
    const { r, g, b } = hslToRgb(h, s, l)
    return { r, g, b, a: nums[3] ?? 1 }
  }

  return null
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let [r, g, b] = [0, 0, 0]

  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

function isVibrant(color) {
  const parsed = parseColor(color)
  if (!parsed || parsed.a < 0.4) return false

  const { r, g, b } = parsed
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))

  return s > 0.2 && l > 0.15 && l < 0.85
}

function extractColors(css) {
  const matches = nonNoiseCssBody(css).match(/#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || []
  const counts = new Map()

  for (const raw of matches) {
    const value = raw.trim()
    if (IGNORED_COLORS.has(value.toLowerCase())) continue
    counts.set(value, (counts.get(value) || 0) + 1)
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color)
  const vibrant = ranked.filter(isVibrant)
  const muted = ranked.filter((c) => !vibrant.includes(c))

  return [...vibrant, ...muted]
}

// --- fonts ------------------------------------------------------------------

function extractCssVariables(css) {
  const vars = new Map()
  const re = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g
  let m
  while ((m = re.exec(css))) {
    vars.set(m[1], m[2].trim())
  }
  return vars
}

function toTokens(value) {
  return value
    .split(',')
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

function resolveVarTokens(tokens, vars, depth = 0) {
  if (depth > 5) return tokens
  const resolved = []
  for (const token of tokens) {
    const varMatch = token.match(/^var\(\s*--([a-zA-Z0-9_-]+)\s*(?:,\s*(.+))?\)$/i)
    if (varMatch) {
      const [, name, fallback] = varMatch
      const value = vars.get(name) ?? fallback
      if (value) resolved.push(...resolveVarTokens(toTokens(value), vars, depth + 1))
      continue
    }
    resolved.push(token)
  }
  return resolved
}

const FORMAT_PRIORITY = ['woff2', 'woff', 'truetype', 'ttf', 'opentype', 'otf']

// Most real sites self-host or license their fonts rather than use Google Fonts,
// so knowing the font *name* alone usually isn't enough to render it accurately.
// @font-face rules point straight at the actual font file, which we can load
// client-side instead of falling back to a generic serif/sans-serif look.
function extractFontFaces(css, baseUrl) {
  const map = new Map()
  const blocks = css.match(/@font-face\s*{[^}]*}/gi) || []

  for (const block of blocks) {
    const familyMatch = block.match(/font-family\s*:\s*(?:"([^"]+)"|'([^']+)'|([^;]+));/i)
    const srcMatch = block.match(/src\s*:\s*([^;]+);/i)
    if (!familyMatch || !srcMatch) continue

    const family = (familyMatch[1] || familyMatch[2] || familyMatch[3]).trim()
    const urls = [...srcMatch[1].matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)]+))\s*\)(?:\s*format\(\s*(?:"([^"]+)"|'([^']+)')\s*\))?/gi)]
      .map((m) => {
        const rawUrl = (m[1] || m[2] || m[3] || '').trim()
        const format = (m[4] || m[5] || '').toLowerCase()
        try {
          return { url: new URL(rawUrl, baseUrl).toString(), format }
        } catch {
          return null
        }
      })
      .filter(Boolean)

    if (urls.length === 0) continue

    const key = family.toLowerCase()
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(...urls)
  }

  return map
}

function bestFontSrc(faces) {
  for (const format of FORMAT_PRIORITY) {
    const match = faces.find((f) => f.format === format)
    if (match) return match.url
  }
  return faces[0]?.url ?? null
}

function categoryFromGeneric(generic) {
  return generic
    ? generic.replace('ui-', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Sans Serif'
}

function primaryAndCategoryFromTokens(tokens) {
  const primary = tokens.find(
    (t) =>
      !GENERIC_FONT_KEYWORDS.has(t.toLowerCase()) &&
      !SYSTEM_FONT_KEYWORDS.has(t.toLowerCase()) &&
      !ICON_FONT_NAME_PATTERN.test(t),
  )
  if (!primary) return null
  const generic = tokens.find((t) => GENERIC_FONT_KEYWORDS.has(t.toLowerCase()))
  return { family: primary, category: categoryFromGeneric(generic) }
}

// Big page-builder platforms (Wix and others following the same convention)
// expose separate font tokens per text role — body vs. heading/title — as CSS
// custom properties. The heading font is a much stronger "brand font" signal
// than raw frequency: a site's component framework can reference its body
// font thousands of times (once per button, tooltip, avatar, ...), which
// would otherwise drown out a deliberately different, more distinctive
// heading font in a plain frequency count.
function findHeadingFont(cssVars) {
  const names = [...cssVars.keys()]
  const key =
    names.find((name) => /title/i.test(name) && /family$/i.test(name)) ??
    names.find((name) => /heading/i.test(name) && /family$/i.test(name))
  if (!key) return null

  const tokens = resolveVarTokens(toTokens(cssVars.get(key)), cssVars)
  return primaryAndCategoryFromTokens(tokens)
}

function extractFont(css, baseUrl) {
  const cssVars = extractCssVariables(css)

  let result = findHeadingFont(cssVars)

  if (!result) {
    const declarations = nonNoiseCssBody(css).match(/font-family\s*:\s*([^;{}]+)/gi) || []
    const primaryCounts = new Map()
    const categoryByFont = new Map()

    for (const decl of declarations) {
      const value = decl.replace(/font-family\s*:\s*/i, '')
      const tokens = resolveVarTokens(toTokens(value), cssVars)
      if (tokens.length === 0) continue

      const primary = tokens.find(
        (t) =>
          !GENERIC_FONT_KEYWORDS.has(t.toLowerCase()) &&
          !SYSTEM_FONT_KEYWORDS.has(t.toLowerCase()) &&
          !ICON_FONT_NAME_PATTERN.test(t),
      )
      if (!primary) continue

      primaryCounts.set(primary, (primaryCounts.get(primary) || 0) + 1)

      const generic = tokens.find((t) => GENERIC_FONT_KEYWORDS.has(t.toLowerCase()))
      if (generic && !categoryByFont.has(primary)) {
        categoryByFont.set(primary, generic)
      }
    }

    const sorted = [...primaryCounts.entries()].sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return null

    const [family] = sorted[0]
    result = { family, category: categoryFromGeneric(categoryByFont.get(family)) }
  }

  const fontFaces = extractFontFaces(css, baseUrl)
  const faces = fontFaces.get(result.family.toLowerCase())
  const src = faces ? bestFontSrc(faces) : null

  return src ? { ...result, src } : result
}

// --- couple info --------------------------------------------------------

// cheerio's .text() concatenates sibling elements with no whitespace between
// them (e.g. a "When" label immediately followed by "December 11, 2021" comes
// back as "WhenDecember 11, 2021"), which breaks \b-anchored regexes. Replacing
// every tag with a space before extracting text keeps element boundaries intact.
function getVisibleText($, limit = 20000) {
  const clone = $('body').clone()
  clone.find('script, style, noscript, svg, template').remove()
  const spaced = (clone.html() || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const decoded = cheerio.load(`<div>${spaced}</div>`)('div').text()
  return decoded.slice(0, limit)
}

// Many site builders (Squarespace, custom Next.js sites, etc.) embed
// schema.org structured data for SEO/social previews — an Event block there
// is a far more reliable source than scraping visible text, when present.
function extractJsonLdEvent($) {
  const items = []

  $('script[type="application/ld+json"]').each((_, el) => {
    let parsed
    try {
      parsed = JSON.parse($(el).text())
    } catch {
      return
    }
    const entries = Array.isArray(parsed) ? parsed : [parsed]
    for (const entry of entries) {
      if (entry && Array.isArray(entry['@graph'])) items.push(...entry['@graph'])
      else if (entry) items.push(entry)
    }
  })

  return (
    items.find((item) => {
      const type = item?.['@type']
      const types = Array.isArray(type) ? type : [type]
      return types.some((t) => typeof t === 'string' && /event/i.test(t))
    }) ?? null
  )
}

// Reads the calendar date directly out of the ISO string rather than round-tripping
// through a full Date parse — a datetime like "2025-06-22T16:00:00-07:00" represents
// June 22 wherever the event actually is, but new Date(iso).toLocaleDateString()
// reinterprets it in *this server's* local timezone, which can silently shift it to
// the next (or previous) calendar day depending on where the process happens to run.
function formatIsoDate(iso) {
  const dateOnly = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  }

  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// A flattened page can read "In Details Andres & Gabriela ARE GETTING" where
// visually only "Andres & Gabriela" was ever the couple's name — surrounding
// chrome (nav labels, headings, all-caps decorative text) sits right up
// against it with no punctuation to anchor a stricter regex on. Rather than
// trust the regex's word-count captures directly, trim each side down to
// only the run of words immediately adjacent to the conjunction that
// actually look like name words.
function trimToNameWords(text, direction) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (direction === 'keepEnd') {
    let start = words.length
    while (start > 0 && isNameWord(words[start - 1])) start--
    return words.slice(start).join(' ')
  }
  let end = 0
  while (end < words.length && isNameWord(words[end])) end++
  return words.slice(0, end).join(' ')
}

function extractCoupleNamesFromText(text) {
  const namePart = "[A-Z][a-zA-Z'.-]+(?:\\s+[A-Z][a-zA-Z'.-]+){0,2}"

  const weddingOf = text.match(new RegExp(`wedding\\s+of\\s+(${namePart})\\s+(?:and|&|\\+)\\s+(${namePart})`, 'i'))
  if (weddingOf) {
    const left = trimToNameWords(weddingOf[1], 'keepEnd')
    const right = trimToNameWords(weddingOf[2], 'keepStart')
    if (left && right) return `${left} & ${right}`
  }

  const conjunction = text.slice(0, 3000).match(new RegExp(`\\b(${namePart})\\s+(?:&|\\+)\\s+(${namePart})\\b`))
  if (conjunction) {
    const left = trimToNameWords(conjunction[1], 'keepEnd')
    const right = trimToNameWords(conjunction[2], 'keepStart')
    if (left && right) return `${left} & ${right}`
  }

  return null
}

function extractCoupleNames($, bodyText, jsonLdEvent) {
  if (jsonLdEvent?.name) {
    const fromJsonLd = extractCoupleNamesFromText(String(jsonLdEvent.name))
    if (fromJsonLd) return fromJsonLd
  }

  const candidates = [
    $('meta[property="og:title"]').attr('content'),
    $('meta[name="twitter:title"]').attr('content'),
    $('title').first().text(),
    $('h1').first().text(),
  ]
    .filter(Boolean)
    .map((s) => s.trim())

  for (const candidate of candidates) {
    const segments = candidate.split(/[|\-–—]/).map((s) => s.trim()).filter(Boolean)
    for (const segment of segments) {
      if (segment.length < 60 && /\s&\s|\s\+\s|\band\b/i.test(segment)) {
        return segment.replace(/\s+and\s+/i, ' & ').replace(/\s+\+\s+/, ' & ')
      }
    }
  }

  return extractCoupleNamesFromText(bodyText)
}

function extractDate($, bodyText, jsonLdEvent) {
  if (jsonLdEvent?.startDate) {
    const formatted = formatIsoDate(jsonLdEvent.startDate)
    if (formatted) return formatted
  }

  const timeAttr = $('time[datetime]').first().attr('datetime')
  if (timeAttr) {
    const formatted = formatIsoDate(timeAttr)
    if (formatted) return formatted
  }

  const candidates = [
    $('meta[property="og:description"]').attr('content'),
    $('meta[name="description"]').attr('content'),
    $('title').first().text(),
    bodyText,
  ].filter(Boolean)

  for (const text of candidates) {
    const monthFirst = text.match(DATE_REGEX_MONTH_FIRST)
    if (monthFirst) return monthFirst[0].replace(/(\d)(st|nd|rd|th)/i, '$1')

    const dayFirst = text.match(DATE_REGEX_DAY_FIRST)
    if (dayFirst) {
      const [, day, monthName, year] = dayFirst
      const monthIndex = MONTH_INDEX.get(monthName.toLowerCase())
      if (monthIndex !== undefined) {
        const formatted = formatIsoDate(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`)
        if (formatted) return formatted
      }
    }

    const numeric = text.match(DATE_REGEX_NUMERIC)
    if (numeric) {
      const [, month, day, year] = numeric
      const formatted = formatIsoDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`)
      if (formatted) return formatted
    }
  }

  return null
}

function extractTagline($, jsonLdEvent) {
  const value =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    jsonLdEvent?.description
  return value ? String(value).trim() : null
}

// --- fetching -------------------------------------------------------------

// A Referer matters here — some sites 404 their own stylesheet/font endpoints
// when requested without one, to discourage hotlinking (e.g. Apple's dynamic
// SF Pro font-face CSS).
async function fetchText(url, referer) {
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; MemoBoardDesignBot/1.0)' }
  if (referer) headers.Referer = referer

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.text()
}

const app = express()
app.use(express.json())

app.post('/api/design-language', async (req, res) => {
  const { url } = req.body ?? {}

  if (typeof url !== 'string' || url.trim() === '') {
    return res.status(400).json({ error: 'A URL is required.' })
  }

  let target
  try {
    target = new URL(url)
  } catch {
    return res.status(400).json({ error: 'That does not look like a valid URL.' })
  }

  try {
    const html = await fetchText(target.toString())
    const $ = cheerio.load(html)

    let css = $('style').text()

    const stylesheetLinks = $('link[rel="stylesheet"]')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(Boolean)
      .slice(0, 5)

    const stylesheets = await Promise.allSettled(
      stylesheetLinks.map((href) => fetchText(new URL(href, target).toString(), target.toString())),
    )
    for (const result of stylesheets) {
      if (result.status === 'fulfilled') css += `\n${result.value}`
    }

    const colors = extractColors(css).slice(0, 6)
    const font = extractFont(css, target.toString())
    const bodyText = getVisibleText($)
    const jsonLdEvent = extractJsonLdEvent($)
    const couple = {
      names: extractCoupleNames($, bodyText, jsonLdEvent),
      date: extractDate($, bodyText, jsonLdEvent),
      tagline: extractTagline($, jsonLdEvent),
    }

    res.json({ colors, font, couple })
  } catch (err) {
    console.error(`[design-language] ${target}:`, err.message)
    res.status(502).json({ error: 'Could not fetch or analyze that site.' })
  }
})

app.listen(PORT, () => {
  console.log(`Design-language API listening on http://localhost:${PORT}`)
})
