import express from 'express'
import * as cheerio from 'cheerio'

const PORT = process.env.PORT || 3001

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

const MONTHS_FULL = 'January|February|March|April|May|June|July|August|September|October|November|December'
const MONTHS_ABBR = 'Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec'
const DATE_REGEX = new RegExp(`\\b(?:${MONTHS_FULL}|${MONTHS_ABBR})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`, 'i')

const NAME_STOPWORDS = new Set(['terms', 'conditions', 'privacy', 'faq', 'q', 'help', 'contact', 'copyright'])

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
  const matches = css.match(/#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || []
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

function extractFont(css) {
  const cssVars = extractCssVariables(css)
  const declarations = css.match(/font-family\s*:\s*([^;{}]+)/gi) || []
  const primaryCounts = new Map()
  const categoryByFont = new Map()

  for (const decl of declarations) {
    const value = decl.replace(/font-family\s*:\s*/i, '')
    const tokens = resolveVarTokens(toTokens(value), cssVars)
    if (tokens.length === 0) continue

    const primary = tokens.find(
      (t) => !GENERIC_FONT_KEYWORDS.has(t.toLowerCase()) && !SYSTEM_FONT_KEYWORDS.has(t.toLowerCase()),
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
  const generic = categoryByFont.get(family)
  const category = generic
    ? generic.replace('ui-', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Sans Serif'

  return { family, category }
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

function extractCoupleNamesFromText(text) {
  const namePart = "[A-Z][a-zA-Z'.-]+(?:\\s+[A-Z][a-zA-Z'.-]+){0,2}"

  const weddingOf = text.match(new RegExp(`wedding\\s+of\\s+(${namePart})\\s+(?:and|&)\\s+(${namePart})`, 'i'))
  if (weddingOf) return `${weddingOf[1]} & ${weddingOf[2]}`

  const ampersand = text.slice(0, 3000).match(new RegExp(`\\b(${namePart})\\s+&\\s+(${namePart})\\b`))
  if (ampersand && !NAME_STOPWORDS.has(ampersand[1].toLowerCase()) && !NAME_STOPWORDS.has(ampersand[2].toLowerCase())) {
    return `${ampersand[1]} & ${ampersand[2]}`
  }

  return null
}

function extractCoupleNames($, bodyText) {
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
      if (segment.length < 60 && /\s&\s|\band\b/i.test(segment)) {
        return segment.replace(/\s+and\s+/i, ' & ')
      }
    }
  }

  return extractCoupleNamesFromText(bodyText)
}

function extractDate($, bodyText) {
  const timeAttr = $('time[datetime]').first().attr('datetime')
  if (timeAttr) {
    const parsed = new Date(timeAttr)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }
  }

  const candidates = [
    $('meta[property="og:description"]').attr('content'),
    $('meta[name="description"]').attr('content'),
    $('title').first().text(),
    bodyText,
  ].filter(Boolean)

  for (const text of candidates) {
    const match = text.match(DATE_REGEX)
    if (match) return match[0].replace(/(\d)(st|nd|rd|th)/i, '$1')
  }

  return null
}

function extractTagline($) {
  const value = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content')
  return value ? value.trim() : null
}

// --- fetching -------------------------------------------------------------

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MemoBoardDesignBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
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
      stylesheetLinks.map((href) => fetchText(new URL(href, target).toString())),
    )
    for (const result of stylesheets) {
      if (result.status === 'fulfilled') css += `\n${result.value}`
    }

    const colors = extractColors(css).slice(0, 6)
    const font = extractFont(css)
    const bodyText = getVisibleText($)
    const couple = {
      names: extractCoupleNames($, bodyText),
      date: extractDate($, bodyText),
      tagline: extractTagline($),
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
