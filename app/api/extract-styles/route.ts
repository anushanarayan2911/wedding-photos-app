import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export interface ExtractedStyles {
  backgroundColors: string[];
  textColors: string[];
  accentColors: string[];
  fonts: { family: string; category: string }[];
  url: string;
}

// ── Noise filters ─────────────────────────────────────────────────────────────

const NOISE_COLORS = new Set([
  "#000", "#000000", "#fff", "#ffffff",
  "rgb(0,0,0)", "rgb(255,255,255)",
  "rgba(0,0,0,0)", "rgba(0,0,0,1)",
  "rgba(255,255,255,0)", "rgba(255,255,255,1)",
  "transparent",
]);

function isLowAlpha(c: string): boolean {
  const m =
    c.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i) ??
    c.match(/hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*,\s*([\d.]+)\s*\)/i);
  return m ? parseFloat(m[1]) < 0.15 : false;
}

function isNoiseColor(c: string): boolean {
  return NOISE_COLORS.has(c) || isLowAlpha(c);
}

// ── Color token extraction ────────────────────────────────────────────────────

const COLOR_RE =
  /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)|hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*[\d.]+)?\s*\)/gi;

function colorsFromValue(value: string): string[] {
  const stripped = value.replace(/url\([^)]*\)/gi, "");
  return (stripped.match(COLOR_RE) ?? [])
    .map((m) => m.toLowerCase().trim())
    .filter((c) => !isNoiseColor(c));
}

// ── Selector classification ───────────────────────────────────────────────────

// Structural page elements → high-priority backgrounds
const BG_STRUCTURAL =
  /(?:^|[\s,>+~])(?:html|body|main|article|section|header|footer|#root|#app|#__next|#content)\b/i;
const BG_CLASS =
  /\.(?:page|container|wrapper|layout|content|hero|banner|bg[-_]|background|backdrop|overlay|site)/i;

// Text-bearing elements → high-priority text colours
const TEXT_STRUCTURAL =
  /(?:^|[\s,>+~])(?:h[1-6]|p|a|li|blockquote|label|cite|figcaption|address)\b/i;
const TEXT_CLASS =
  /\.(?:text[-_]|heading|title|subtitle|description|caption|copy|body|paragraph|label|link)/i;

// Explicit UI component selectors → accent / lower priority
const UI_SELECTOR =
  /(?:^|[\s,>+~])(?:button|input|select|textarea|nav|menu|aside)\b|\.(?:btn|button|badge|tag|chip|pill|card|cta|nav|menu|form|input)/i;

interface SelectorKind {
  isBackground: boolean;
  isText: boolean;
  isUi: boolean;
}

function classifySelector(selector: string): SelectorKind {
  const s = selector.replace(/::?[\w-]+/g, ""); // strip pseudo-elements/classes
  return {
    isBackground: BG_STRUCTURAL.test(s) || BG_CLASS.test(s),
    isText: TEXT_STRUCTURAL.test(s) || TEXT_CLASS.test(s),
    isUi: UI_SELECTOR.test(s),
  };
}

// ── CSS rule parser ───────────────────────────────────────────────────────────

interface CssRule {
  selector: string;
  declarations: string;
}

function parseCssRules(css: string): CssRule[] {
  // Strip comments
  let c = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Strip @keyframes entirely (colour values inside are animation noise)
  c = c.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g, "");
  // Flatten one level of @media / @supports / @layer so inner rules are visible
  c = c.replace(
    /@(?:media|supports|layer)[^{]*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g,
    "$1"
  );

  const rules: CssRule[] = [];
  const ruleRe = /([^{}@][^{}]*)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(c)) !== null) {
    const selector = m[1].trim();
    if (!selector) continue;
    rules.push({ selector, declarations: m[2] });
  }
  return rules;
}

function getDeclarationValue(declarations: string, property: string): string[] {
  const re = new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*([^;}{]+)`, "gi");
  const values: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(declarations)) !== null) {
    const val = m[1].trim();
    if (!val.includes("url(")) values.push(val);
  }
  return values;
}

// ── Weighted color scoring ────────────────────────────────────────────────────

type Bucket = "background" | "text" | "accent";

interface ColorScore {
  background: number;
  text: number;
  accent: number;
}

function scoreColors(rules: CssRule[]): Map<string, ColorScore> {
  const scores = new Map<string, ColorScore>();

  function add(color: string, bucket: Bucket, weight: number) {
    const s = scores.get(color) ?? { background: 0, text: 0, accent: 0 };
    s[bucket] += weight;
    scores.set(color, s);
  }

  for (const { selector, declarations } of rules) {
    const kind = classifySelector(selector);

    // Background-color / background shorthand
    for (const prop of ["background-color", "background"]) {
      for (const val of getDeclarationValue(declarations, prop)) {
        for (const color of colorsFromValue(val)) {
          if (kind.isBackground) add(color, "background", 10);
          else if (kind.isUi) add(color, "accent", 3);
          else add(color, "background", 4); // unclassified — lean background
        }
      }
    }

    // color (text colour)
    for (const val of getDeclarationValue(declarations, "color")) {
      for (const color of colorsFromValue(val)) {
        if (kind.isText) add(color, "text", 10);
        else if (kind.isBackground) add(color, "text", 7); // body text colour
        else if (kind.isUi) add(color, "accent", 3);
        else add(color, "text", 4);
      }
    }

    // border-color → accent signal
    for (const prop of ["border-color", "border", "outline-color"]) {
      for (const val of getDeclarationValue(declarations, prop)) {
        for (const color of colorsFromValue(val)) {
          add(color, "accent", kind.isUi ? 5 : 2);
        }
      }
    }
  }

  return scores;
}

function topByBucket(
  scores: Map<string, ColorScore>,
  bucket: Bucket,
  exclude: Set<string>,
  n: number
): string[] {
  return [...scores.entries()]
    .filter(([c]) => !exclude.has(c))
    .sort((a, b) => b[1][bucket] - a[1][bucket])
    .filter(([, s]) => s[bucket] > 0)
    .slice(0, n)
    .map(([c]) => c);
}

// ── CSS variable colors (brand tokens in :root) ───────────────────────────────

function extractCssVariableColors(css: string): string[] {
  const rootBlockRe = /(?::root|html|body)\s*\{([^}]+)\}/gi;
  const varColorRe = /--[\w-]+\s*:\s*([^;}{]+)/gi;
  const colors: string[] = [];
  let bm: RegExpExecArray | null;
  while ((bm = rootBlockRe.exec(css)) !== null) {
    let vm: RegExpExecArray | null;
    while ((vm = varColorRe.exec(bm[1])) !== null) {
      colors.push(...colorsFromValue(vm[1]));
    }
  }
  return colors;
}

// ── Font extraction ───────────────────────────────────────────────────────────

const ICON_FONT_KEYWORDS = [
  "fontawesome", "font awesome", "material icons", "material-icons",
  "glyphicons", "icomoon", "ionicons", "themify", "genericons",
  "dashicons", "entypo", "linearicons", "feather", "remixicon",
  "slick", "swiper", "owl",
];

const SYSTEM_FONT_KEYWORDS = [
  "-apple-system", "blinkmacsystemfont", "system-ui", "ui-sans-serif",
  "ui-serif", "ui-monospace", "segoe ui", "helvetica neue",
];

const SKIP_FONT_VALUES = new Set(["inherit", "initial", "unset", "revert", "none"]);

function isUsableFont(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    !SKIP_FONT_VALUES.has(lower) &&
    !ICON_FONT_KEYWORDS.some((k) => lower.includes(k)) &&
    !SYSTEM_FONT_KEYWORDS.some((k) => lower.includes(k))
  );
}

function categoriseFont(name: string): string {
  const lower = name.toLowerCase();
  const serif = [
    "serif", "times", "georgia", "garamond", "baskerville", "palatino",
    "playfair", "cormorant", "crimson", "merriweather", "lora",
    "libre baskerville", "bodoni", "caslon", "didot", "trajan", "eb garamond",
  ];
  const mono = ["mono", "code", "courier", "consolas", "fira", "source code", "roboto mono", "inconsolata"];
  const display = [
    "display", "headline", "poster", "abril", "lobster", "pacifico",
    "dancing", "great vibes", "sacramento", "satisfy", "allura", "alex brush",
    "pinyon", "mr dafoe", "rouge script", "tangerine", "italianno",
  ];
  if (display.some((d) => lower.includes(d))) return "Display";
  if (mono.some((d) => lower.includes(d))) return "Monospace";
  if (serif.some((d) => lower.includes(d))) return "Serif";
  return "Sans-serif";
}

function extractFonts(css: string): { family: string; category: string }[] {
  const found = new Map<string, string>();

  const re = /font-family\s*:\s*([^;}{]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    for (const raw of m[1].split(",")) {
      const name = raw.replace(/['"]/g, "").trim();
      if (isUsableFont(name)) {
        found.set(name, categoriseFont(name));
        break;
      }
    }
  }

  const gfRe = /family=([^&"')#\s]+)/gi;
  while ((m = gfRe.exec(css)) !== null) {
    for (const entry of decodeURIComponent(m[1]).split("|")) {
      const name = entry.split(":")[0].replace(/\+/g, " ").trim();
      if (name && isUsableFont(name) && !found.has(name)) {
        found.set(name, categoriseFont(name));
      }
    }
  }

  return [...found.entries()].map(([family, category]) => ({ family, category })).slice(0, 5);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Memoboard/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── Route handler ─────────────────────────────────────────────────────────────

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

    // Inline styles on structural elements — prepend selector so classifier works
    for (const tag of ["body", "header", "main", "section", "footer", "nav", "article"]) {
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
    const rules = parseCssRules(allCss);
    const scores = scoreColors(rules);

    // Boost CSS variable colors declared in :root/html/body as brand tokens
    for (const c of extractCssVariableColors(allCss)) {
      const s = scores.get(c) ?? { background: 0, text: 0, accent: 0 };
      s.background += 6;
      s.text += 6;
      scores.set(c, s);
    }

    // meta theme-color → strong background signal
    const themeColor = $('meta[name="theme-color"]').attr("content")?.toLowerCase().trim();
    if (themeColor && !isNoiseColor(themeColor)) {
      const s = scores.get(themeColor) ?? { background: 0, text: 0, accent: 0 };
      s.background += 15;
      scores.set(themeColor, s);
    }

    const used = new Set<string>();
    const backgroundColors = topByBucket(scores, "background", used, 5);
    backgroundColors.forEach((c) => used.add(c));
    const textColors = topByBucket(scores, "text", used, 4);
    textColors.forEach((c) => used.add(c));
    const accentColors = topByBucket(scores, "accent", used, 3);

    const fonts = extractFonts(allCss);

    return NextResponse.json({
      backgroundColors,
      textColors,
      accentColors,
      fonts,
      url,
    } satisfies ExtractedStyles);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
