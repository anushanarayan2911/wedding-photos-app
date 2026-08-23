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

function extractColors(css) {
  const matches = css.match(/#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || []
  const counts = new Map()

  for (const raw of matches) {
    const value = raw.trim()
    if (IGNORED_COLORS.has(value.toLowerCase())) continue
    counts.set(value, (counts.get(value) || 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color)
}

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

    res.json({ colors, font })
  } catch (err) {
    console.error(`[design-language] ${target}:`, err.message)
    res.status(502).json({ error: 'Could not fetch or analyze that site.' })
  }
})

app.listen(PORT, () => {
  console.log(`Design-language API listening on http://localhost:${PORT}`)
})
