import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export interface ExtractedStyles {
  backgroundColors: string[];
  textColors: string[];
  fonts: { family: string; category: string; weight?: string }[];
  url: string;
}

// ── Color extraction ────────────────────────────────────────────────────────

const COLOR_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)|hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*[\d.]+)?\s*\)/gi;

const NOISE_COLORS = new Set([
  "#000", "#000000", "#fff", "#ffffff",
  "rgb(0,0,0)", "rgb(255,255,255)",
  "rgba(0,0,0,0)", "rgba(0,0,0,1)", "rgba(255,255,255,0)", "rgba(255,255,255,1)",
  "transparent",
]);

/** Returns true for near-transparent rgba/hsla (alpha < 0.15). */
function isLowAlpha(c: string): boolean {
  const m = c.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i)
    ?? c.match(/hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*,\s*([\d.]+)\s*\)/i);
  if (m) return parseFloat(m[1]) < 0.15;
  return false;
}

function isNoiseColor(c: string): boolean {
  return NOISE_COLORS.has(c) || isLowAlpha(c);
}

/** Extract raw color tokens from a CSS value string (skips url() segments). */
function colorsFromValue(value: string): string[] {
  // Remove url(...) fragments first so we never pick up data URIs or image paths
  const stripped = value.replace(/url\([^)]*\)/gi, "");
  const matches = stripped.match(COLOR_RE) ?? [];
  return matches.map((m) => m.toLowerCase().trim()).filter((c) => !isNoiseColor(c));
}

/** Walk every declaration in the CSS and collect colors from specific properties. */
function extractColorsByProp(
  css: string,
  properties: string[]
): Map<string, number> {
  const counts = new Map<string, number>();
  // Match "property: value" pairs; the lookbehind stops us matching inside urls
  const propGroup = properties.join("|");
  const re = new RegExp(`(?:^|[;{,\\s])(?:${propGroup})\\s*:\\s*([^;}{]+)`, "gim");
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    for (const color of colorsFromValue(m[1])) {
      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }
  return counts;
}

/** Return top N colors sorted by frequency. */
function topColors(counts: Map<string, number>, n: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([color]) => color);
}

// ── Font extraction ─────────────────────────────────────────────────────────

const ICON_FONT_KEYWORDS = [
  "fontawesome", "font awesome", "material icons", "material-icons",
  "glyphicons", "icomoon", "ionicons", "themify", "genericons",
  "dashicons", "entypo", "linearicons", "feather", "remixicon",
  // UI library / slider internal fonts
  "slick", "swiper", "owl",
];

const SYSTEM_FONT_KEYWORDS = [
  "-apple-system", "blinkmacsystemfont", "system-ui", "ui-sans-serif",
  "ui-serif", "ui-monospace", "segoe ui", "helvetica neue",
];

const SKIP_FONT_VALUES = new Set(["inherit", "initial", "unset", "revert", "none"]);

function isUsableFont(name: string): boolean {
  const lower = name.toLowerCase();
  if (SKIP_FONT_VALUES.has(lower)) return false;
  if (ICON_FONT_KEYWORDS.some((k) => lower.includes(k))) return false;
  if (SYSTEM_FONT_KEYWORDS.some((k) => lower.includes(k))) return false;
  return true;
}

function categoriseFont(name: string): string {
  const lower = name.toLowerCase();
  const serif = ["serif", "times", "georgia", "garamond", "baskerville", "palatino",
    "playfair", "cormorant", "crimson", "merriweather", "lora", "libre baskerville",
    "bodoni", "caslon", "minion", "sabon", "didot", "trajan", "eb garamond"];
  const mono = ["mono", "code", "courier", "consolas", "fira", "source code", "roboto mono", "inconsolata"];
  const display = ["display", "headline", "poster", "abril", "lobster", "pacifico",
    "dancing", "great vibes", "sacramento", "satisfy", "allura", "alex brush",
    "pinyon", "mr dafoe", "rouge script", "tangerine", "italianno"];
  if (display.some((d) => lower.includes(d))) return "Display";
  if (mono.some((d) => lower.includes(d))) return "Monospace";
  if (serif.some((d) => lower.includes(d))) return "Serif";
  return "Sans-serif";
}

function extractFonts(css: string): { family: string; category: string }[] {
  const found = new Map<string, string>();

  // font-family declarations
  const re = /font-family\s*:\s*([^;}{]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const stack = m[1].trim();
    // Take the first named font in the stack
    for (const raw of stack.split(",")) {
      const name = raw.replace(/['"]/g, "").trim();
      if (isUsableFont(name)) {
        found.set(name, categoriseFont(name));
        break;
      }
    }
  }

  // Google Fonts @import / link URLs: family=Playfair+Display:wght@400,700
  const gfRe = /family=([^&"')#\s]+)/gi;
  while ((m = gfRe.exec(css)) !== null) {
    const segment = decodeURIComponent(m[1]);
    // Can be pipe-separated: Lora|Playfair+Display
    for (const entry of segment.split("|")) {
      const name = entry.split(":")[0].replace(/\+/g, " ").trim();
      if (name && isUsableFont(name) && !found.has(name)) {
        found.set(name, categoriseFont(name));
      }
    }
  }

  return [...found.entries()]
    .map(([family, category]) => ({ family, category }))
    .slice(0, 5);
}

// ── CSS variable extraction (brand tokens in :root) ─────────────────────────

function extractCssVariableColors(css: string): string[] {
  // Find :root / html / body blocks and pull --var: <color> declarations
  const rootBlockRe = /(?::root|html|body)\s*\{([^}]+)\}/gi;
  const varColorRe = /--[\w-]+\s*:\s*([^;}{]+)/gi;
  const colors: string[] = [];
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = rootBlockRe.exec(css)) !== null) {
    const block = blockMatch[1];
    let varMatch: RegExpExecArray | null;
    while ((varMatch = varColorRe.exec(block)) !== null) {
      for (const color of colorsFromValue(varMatch[1])) {
        colors.push(color);
      }
    }
  }
  return colors;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Memoboard/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = await req.json();
    url = (body.url as string)?.trim();
    if (!url) throw new Error("Missing url");
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const html = await fetchText(url);
    const $ = cheerio.load(html);

    const cssChunks: string[] = [];

    $("style").each((_, el) => cssChunks.push($(el).text()));

    // Inline styles on <body> and major structural elements
    const inlineTargets = ["body", "header", "main", "section", "footer", "nav"];
    for (const tag of inlineTargets) {
      $(tag).each((_, el) => {
        const style = $(el).attr("style");
        if (style) cssChunks.push(`${tag} { ${style} }`);
      });
    }

    const sheetUrls: string[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      try { sheetUrls.push(new URL(href, url).toString()); } catch { /* skip */ }
    });

    const sheetTexts = await Promise.allSettled(sheetUrls.slice(0, 6).map(fetchText));
    for (const r of sheetTexts) {
      if (r.status === "fulfilled") cssChunks.push(r.value);
    }

    const allCss = cssChunks.join("\n");

    // Background colours: background-color + solid background shorthand
    const bgCounts = extractColorsByProp(allCss, ["background-color", "background"]);

    // Text colours: color property only
    const textCounts = extractColorsByProp(allCss, ["color"]);

    // Boost colours declared as CSS variables in :root/html/body
    const varColors = extractCssVariableColors(allCss);
    for (const c of varColors) {
      bgCounts.set(c, (bgCounts.get(c) ?? 0) + 5);
      textCounts.set(c, (textCounts.get(c) ?? 0) + 5);
    }

    // meta theme-color as a strong background signal
    const themeColor = $('meta[name="theme-color"]').attr("content")?.toLowerCase().trim();
    if (themeColor && !isNoiseColor(themeColor)) {
      bgCounts.set(themeColor, (bgCounts.get(themeColor) ?? 0) + 10);
    }

    const backgroundColors = topColors(bgCounts, 6);
    const textColors = topColors(textCounts, 4).filter(
      (c) => !backgroundColors.includes(c)
    );

    const fonts = extractFonts(allCss);

    const result: ExtractedStyles = { backgroundColors, textColors, fonts, url };
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
