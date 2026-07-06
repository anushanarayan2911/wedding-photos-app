import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export interface ElementStyle {
  selector: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  fontSize?: string;
  fontWeight?: string;
}

export interface KeyImage {
  url: string;
  alt?: string;
  context: string;
}

export interface ExtractedStyles {
  backgroundColors: string[];
  textColors: string[];
  accentColors: string[];
  fonts: { family: string; category: string }[];
  googleFontsLinks: string[];
  elementStyles: ElementStyle[];
  keyImages: KeyImage[];
  pageTitle: string;
  url: string;
}

// ── Noise filters ─────────────────────────────────────────────────────────────

const NOISE_COLORS = new Set([
  "#000", "#000000", "#fff", "#ffffff",
  "rgb(0,0,0)", "rgb(255,255,255)",
  "rgba(0,0,0,0)", "rgba(0,0,0,1)",
  "rgba(255,255,255,0)", "rgba(255,255,255,1)",
  "transparent",
  // Wix platform constant — its default focus ring / rich-text-editor accent
  // colour, present in nearly every Wix site's vendor CSS regardless of the
  // site's own brand palette. Not a real design signal.
  "#116dff",
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

// ── CSS variable resolution ───────────────────────────────────────────────────

function buildCssVarMap(css: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const name = m[1].trim();
    const value = m[2].trim();
    if (!map.has(name)) map.set(name, value);
  }
  return map;
}

function resolveVars(value: string, varMap: Map<string, string>, depth = 0): string {
  if (depth > 4) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\s*\)/g, (_, name, fallback) => {
    const resolved = varMap.get(name.trim());
    if (resolved) return resolveVars(resolved.trim(), varMap, depth + 1);
    return fallback?.trim() ?? "";
  });
}

// Parse CSS font shorthand: [style] [variant] [weight] size[/line-height] family
function parseFontShorthand(value: string): { family?: string; size?: string; weight?: string } {
  const sizeRe = /\b(\d[\d.]*(?:px|rem|em|vw|vh|pt|%))\s*(?:\/[\S]+)?\s+(.+)$/i;
  const sizeMatch = value.match(sizeRe);
  const size = sizeMatch?.[1];
  const familyRaw = sizeMatch?.[2]?.replace(/['"]/g, "").split(",")[0].trim();
  const family = familyRaw && isUsableFont(familyRaw) ? familyRaw : undefined;
  // Font shorthand format: [style] [variant] [weight] <size>[/lh] <family>
  // Search for the weight only in the portion BEFORE the font-size so we
  // don't confuse "normal" used for style/variant with the weight token.
  // Numeric weights (100-900) and bold/bolder/lighter are unambiguous.
  // "normal" is intentionally excluded — it appears for style and variant
  // too and renders as weight 400 which the browser applies by default.
  const beforeSize = sizeMatch
    ? value.slice(0, value.indexOf(sizeMatch[0])).trim()
    : "";
  const numericWeight = beforeSize.match(/\b(100|200|300|400|500|600|700|800|900)\b/);
  const keywordWeight = beforeSize.match(/\b(bold|bolder|lighter)\b/i);
  // If no unambiguous weight found but "normal" appears, treat it as weight 400.
  // Covers shorthand patterns like "normal normal normal 14px Arial" used by
  // some site builders where all three slots (style/variant/weight) are reset.
  const normalWeight = (!numericWeight && !keywordWeight && /\bnormal\b/i.test(beforeSize))
    ? "normal" : undefined;
  const weight = numericWeight?.[1] ?? keywordWeight?.[1] ?? normalWeight;
  return { family, size, weight };
}

function isGarbageValue(value: string): boolean {
  const lower = value.toLowerCase().trim();
  return (
    lower.includes("var(") ||
    lower === "inherit" ||
    lower === "currentcolor" ||
    lower === "initial" ||
    lower === "unset" ||
    lower === "revert" ||
    lower === ""
  );
}

// ── Element-level style extraction ───────────────────────────────────────────

const ELEMENT_SELECTORS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "body", "a", "li",
  "header", "nav", "section", "article", "footer", "button",
];

function selectorTargetsElement(selector: string, el: string): boolean {
  return selector.split(",").map(s => s.trim()).some(part => {
    const lastToken = (part.split(/[\s>+~]+/).pop() ?? "").toLowerCase();
    return (
      lastToken === el ||
      lastToken.startsWith(`${el}.`) ||
      lastToken.startsWith(`${el}:`) ||
      lastToken.startsWith(`${el}[`) ||
      lastToken.startsWith(`${el}#`)
    );
  });
}

function getPropValue(declarations: string, prop: string): string | undefined {
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;!]+)`, "i");
  return declarations.match(re)?.[1]?.trim();
}

function applyDeclarations(
  declarations: string,
  entry: ElementStyle,
  varMap: Map<string, string>
): void {
  const resolved = resolveVars(declarations, varMap);

  // font-family (explicit)
  const rawFamily = getPropValue(resolved, "font-family");
  if (rawFamily && !isGarbageValue(rawFamily)) {
    const clean = rawFamily.replace(/['"]/g, "").split(",")[0].trim();
    if (clean && isUsableFont(clean)) entry.fontFamily = clean;
  }

  // font shorthand — parses family, size, weight in one declaration
  const fontShorthand = getPropValue(resolved, "font");
  if (fontShorthand && !isGarbageValue(fontShorthand)) {
    const parsed = parseFontShorthand(fontShorthand);
    if (parsed.family && !entry.fontFamily) entry.fontFamily = parsed.family;
    if (parsed.size) entry.fontSize = parsed.size;
    if (parsed.weight) entry.fontWeight = parsed.weight;
  }

  // color
  const rawColor = getPropValue(resolved, "color");
  if (rawColor && !isGarbageValue(rawColor)) {
    const lower = rawColor.toLowerCase();
    if (!isNoiseColor(lower)) entry.color = lower;
  }

  // background-color (explicit)
  const bgColor = getPropValue(resolved, "background-color");
  if (bgColor && !isGarbageValue(bgColor)) {
    const lower = bgColor.toLowerCase();
    if (!isNoiseColor(lower)) entry.backgroundColor = lower;
  }

  // background shorthand — extract plain color token, skip gradients and images
  if (!entry.backgroundColor) {
    const bg = getPropValue(resolved, "background");
    if (bg && !isGarbageValue(bg) && !bg.toLowerCase().includes("gradient") && !bg.includes("url(")) {
      const cm = bg.match(/#[0-9a-f]{3,8}\b|rgba?\s*\([^)]+\)|hsla?\s*\([^)]+\)/i);
      if (cm) {
        const c = cm[0].toLowerCase();
        if (!isNoiseColor(c)) entry.backgroundColor = c;
      }
    }
  }

  // border-color (explicit)
  const borderCol = getPropValue(resolved, "border-color");
  if (borderCol && !isGarbageValue(borderCol)) {
    const lower = borderCol.toLowerCase();
    if (!isNoiseColor(lower)) entry.borderColor = lower;
  }

  // border shorthand — extract color token
  if (!entry.borderColor) {
    const border = getPropValue(resolved, "border");
    if (border && !isGarbageValue(border) && border.toLowerCase() !== "none") {
      const cm = border.match(/#[0-9a-f]{3,8}\b|rgba?\s*\([^)]+\)|hsla?\s*\([^)]+\)/i);
      if (cm) {
        const c = cm[0].toLowerCase();
        if (!isNoiseColor(c)) entry.borderColor = c;
      }
    }
  }

  // font-size (overrides shorthand value)
  const fontSize = getPropValue(resolved, "font-size");
  if (fontSize && !isGarbageValue(fontSize)) entry.fontSize = fontSize;

  // font-weight (overrides shorthand value)
  const fontWeight = getPropValue(resolved, "font-weight");
  if (fontWeight && !isGarbageValue(fontWeight)) entry.fontWeight = fontWeight;
}

function extractElementStyles(
  rules: CssRule[],
  $: ReturnType<typeof import("cheerio").load>,
  varMap: Map<string, string>
): ElementStyle[] {
  const map = new Map<string, ElementStyle>();

  // Pass 1: CSS rules that directly target semantic elements
  for (const { selector, declarations } of rules) {
    const normSel = selector.toLowerCase().replace(/\s+/g, " ");
    for (const el of ELEMENT_SELECTORS) {
      if (!selectorTargetsElement(normSel, el)) continue;
      const entry = map.get(el) ?? { selector: el };
      applyDeclarations(declarations, entry, varMap);
      map.set(el, entry);
    }
  }

  // Pass 2: DOM-based extraction — match CSS classes used on heading elements
  // (catches Wix/Squarespace patterns where font styling lives in a .font_N class)
  const classRules = new Map<string, CssRule[]>();
  for (const rule of rules) {
    const clsMatches = rule.selector.match(/\.([a-zA-Z_-][\w_-]*)/g) ?? [];
    for (const cls of clsMatches) {
      const name = cls.slice(1);
      if (!classRules.has(name)) classRules.set(name, []);
      classRules.get(name)!.push(rule);
    }
  }

  for (const el of ["h1", "h2", "h3", "h4", "h5", "h6", "header", "nav", "section", "article", "footer", "button"]) {
    const domEl = $(el).first();
    if (!domEl.length) continue;
    const entry = map.get(el) ?? { selector: el };

    // Apply styles from each CSS class the element carries
    const classes = (domEl.attr("class") ?? "").split(/\s+/).filter(Boolean);
    for (const cls of classes) {
      for (const rule of classRules.get(cls) ?? []) {
        applyDeclarations(rule.declarations, entry, varMap);
      }
    }

    // Inline styles take highest priority — applied last so they override
    const inlineStyle = domEl.attr("style") ?? "";
    if (inlineStyle) applyDeclarations(inlineStyle, entry, varMap);

    if (entry.fontFamily || entry.color || entry.fontSize || entry.fontWeight) map.set(el, entry);
  }

  return ELEMENT_SELECTORS
    .filter(el => {
      const e = map.get(el);
      return e && (e.fontFamily || e.color || e.backgroundColor || e.borderColor || e.fontSize || e.fontWeight);
    })
    .map(el => map.get(el)!);
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
  const mono = ["mono", "code", "courier", "consolas", "fira", "source code", "inconsolata"];
  if (mono.some((d) => lower.includes(d))) return "Monospace";
  // Serif checked before script so "Playfair Display" → Serif, not Script
  const serif = [
    "playfair", "cormorant", "garamond", "baskerville", "palatino",
    "times", "georgia", "crimson", "merriweather", "lora",
    "libre baskerville", "bodoni", "caslon", "didot", "trajan",
    "eb garamond", "noto serif", "pt serif", "source serif",
    "spectral", "neuton", "arvo", "bitter", "abril fatface",
  ];
  if (serif.some((d) => lower.includes(d))) return "Serif";
  // Script/decorative matched by specific names only — not the word "display"
  const script = [
    "sacramento", "great vibes", "dancing script", "pacifico", "lobster",
    "satisfy", "allura", "alex brush", "pinyon script", "mr dafoe",
    "rouge script", "tangerine", "italianno", "kaushan", "yellowtail",
    "marck script", "petit formal", "cookie", "merienda",
  ];
  if (script.some((d) => lower.includes(d))) return "Display";
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

// ── Key image extraction ──────────────────────────────────────────────────────

// ── CDN URL enhancement ───────────────────────────────────────────────────────
// Wedding sites often serve image URLs sized for thumbnails. Rewrite to the
// highest-quality version the CDN supports.

function enhanceImageUrl(url: string): string {
  try {
    // Wix: maintain aspect ratio at 1920px wide (safely within typical original ~2000px)
    if (url.includes("wixstatic.com")) {
      const cw = parseInt(url.match(/w_(\d+)/)?.[1] ?? "800");
      const ch = parseInt(url.match(/h_(\d+)/)?.[1] ?? "600");
      const tw = 1920;
      const th = Math.round(ch * tw / cw);
      return url
        .replace(/w_\d+/, `w_${tw}`)
        .replace(/h_\d+/, `h_${th}`)
        .replace(/q_\d+/, "q_95");
    }
    // Cloudinary: maintain aspect ratio at 1920px wide
    if (url.includes("cloudinary.com")) {
      const cw = parseInt(url.match(/\/w_(\d+)/)?.[1] ?? "800");
      const ch = parseInt(url.match(/\/h_(\d+)/)?.[1] ?? "600");
      const tw = 1920;
      const th = Math.round(ch * tw / cw);
      return url
        .replace(/\/w_\d+/, `/w_${tw}`)
        .replace(/\/h_\d+/, `/h_${th}`)
        .replace(/\/q_\d+/, "/q_95");
    }
    // Squarespace CDN
    if (url.includes("squarespace-cdn.com") || url.includes("static1.squarespace.com")) {
      const u = new URL(url);
      u.searchParams.set("format", "1920w");
      return u.toString();
    }
    // Imgix
    if (url.includes(".imgix.net")) {
      const u = new URL(url);
      u.searchParams.set("w", "1920");
      u.searchParams.set("q", "95");
      u.searchParams.set("auto", "format,compress");
      return u.toString();
    }
    // Shopify CDN
    if (url.includes("cdn.shopify.com")) {
      return url.replace(/_\d+x(\.\w+)(\?|$)/, "_1920x$1$2");
    }
  } catch { /* leave url unchanged */ }
  return url;
}

function extractKeyImages(
  rules: CssRule[],
  $: ReturnType<typeof import("cheerio").load>,
  baseUrl: string,
  varMap: Map<string, string>
): KeyImage[] {
  const scored: Array<{ url: string; alt?: string; context: string; score: number }> = [];
  const seen = new Set<string>();

  function add(rawUrl: string, alt: string | undefined, context: string, score: number) {
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed.startsWith("data:")) return;
    if (/1[xX]1|pixel\.gif|tracking|beacon|\.woff|\.ttf|\.eot|\.otf/i.test(trimmed)) return;
    let absolute: string;
    try { absolute = new URL(trimmed, baseUrl).toString(); } catch { return; }
    absolute = enhanceImageUrl(absolute);
    if (seen.has(absolute)) return;
    seen.add(absolute);
    scored.push({ url: absolute, alt: alt || undefined, context, score });
  }

  // First large content image in document order — skips logos, icons, tiny images.
  // A "large" image has explicit px dimensions ≥ 400 wide, or a CDN URL indicating
  // a large fill (wixstatic w_≥400, cloudinary w_≥400, imgix w≥400).
  const isLargeContentImage = (src: string, el: ReturnType<typeof $>): boolean => {
    const alt = (el.attr("alt") ?? "").toLowerCase();
    const cls = (el.attr("class") ?? "").toLowerCase();
    if (/logo|icon|avatar|sprite|badge/i.test(alt + " " + cls + " " + src)) return false;
    if (/\.svg(\?|$)/i.test(src)) return false;
    const w = parseInt(el.attr("width") ?? "0");
    const h = parseInt(el.attr("height") ?? "0");
    if (w >= 400 || h >= 300) return true;
    if (/wixstatic\.com.*w_(\d+)/.test(src) && parseInt(RegExp.$1) >= 400) return true;
    if (/cloudinary\.com.*\/w_(\d+)/.test(src) && parseInt(RegExp.$1) >= 400) return true;
    if (/[?&]w=(\d+)/.test(src) && parseInt(RegExp.$1) >= 400) return true;
    if (/[?&]width=(\d+)/.test(src) && parseInt(RegExp.$1) >= 400) return true;
    return false;
  };

  $("img").each((_, el) => {
    const $el = $(el);
    const src = $el.attr("src") ?? $el.attr("data-src") ?? $el.attr("data-lazy-src");
    if (!src || !isLargeContentImage(src, $el)) return;
    add(src, $el.attr("alt") ?? undefined, "first", 200);
    return false; // stop after first match
  });

  // og:image / twitter:image — most reliable signal
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) add(ogImage, undefined, "featured", 100);
  const twitterImage = $('meta[name="twitter:image"], meta[name="twitter:image:src"]').attr("content");
  if (twitterImage) add(twitterImage, undefined, "featured", 90);

  // Background images from CSS rules
  for (const { selector, declarations } of rules) {
    if (!declarations.includes("url(")) continue;
    const resolved = resolveVars(declarations, varMap);
    const urlRe = /url\(\s*['"]?([^'")]+?)['"]?\s*\)/gi;
    let m: RegExpExecArray | null;
    while ((m = urlRe.exec(resolved)) !== null) {
      const s = selector.toLowerCase();
      const score =
        /hero|banner|cover|splash|jumbotron|parallax|showcase/i.test(s) ? 70 :
        /header|section|main|body|page|layout|wrapper/i.test(s) ? 40 : 20;
      add(m[1], undefined, "background", score);
    }
  }

  // <img> tags in prominent sections
  const heroSelectors = ["header", "section", ".hero", "[class*='hero']", "[class*='banner']", "[class*='cover']", "figure", "picture"];
  for (const sel of heroSelectors) {
    try {
      $(sel).find("img").each((_, el) => {
        const src = $(el).attr("src") ?? $(el).attr("data-src") ?? $(el).attr("data-lazy-src");
        const alt = $(el).attr("alt");
        if (src) add(src, alt ?? undefined, "hero", 60);
      });
    } catch { /* invalid selector — skip */ }
  }

  // <img> with decorative alt text or class names
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? $(el).attr("data-src");
    const alt = $(el).attr("alt") ?? "";
    const cls = $(el).attr("class") ?? "";
    const combined = alt + " " + cls;
    const isDecorative =
      /flower|floral|bloom|petal|botanical|garden|vine|wreath|foliage|ornament|ribbon|lace|leaf|decor/i.test(combined);
    if (src) add(src, alt || undefined, isDecorative ? "decorative" : "page", isDecorative ? 80 : 10);
  });

  // Large <img> by explicit dimensions
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? $(el).attr("data-src");
    const w = parseInt($(el).attr("width") ?? "0");
    const h = parseInt($(el).attr("height") ?? "0");
    if (src && (w >= 400 || h >= 300)) {
      add(src, $(el).attr("alt") ?? undefined, "featured", 50);
    }
  });

  // General images — fill remaining slots, skip obvious icons/logos
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? $(el).attr("data-src");
    const alt = $(el).attr("alt") ?? "";
    if (!src) return;
    if (/logo|icon|avatar|sprite|arrow|btn|check|badge|star/i.test(alt + " " + src)) return;
    add(src, alt || undefined, "page", 5);
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ url, alt, context }) => ({ url, alt, context }));
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

    $("style").each((_, el) => { cssChunks.push($(el).text()); });

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
    const varMap = buildCssVarMap(allCss);
    // Resolve CSS custom properties before scoring — site builders (e.g. Wix)
    // define their whole brand palette as vars like `--color_15: 47,51,44` and
    // apply it via `rgb(var(--color_15))`. Scoring raw declarations would miss
    // every one of those and only see incidental literal colors from vendor
    // boilerplate CSS instead.
    const resolvedRules = rules.map((r) => ({ ...r, declarations: resolveVars(r.declarations, varMap) }));
    const scores = scoreColors(resolvedRules);

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

    const elementStyles = extractElementStyles(rules, $, varMap);
    const keyImages = extractKeyImages(rules, $, url, varMap);
    const cssFonts = extractFonts(allCss);

    // Collect Google Fonts stylesheet links directly from the HTML <head>
    // These have the exact family names the site actually uses — much more reliable
    // than reconstructing URLs from CSS declarations.
    const googleFontsLinks: string[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (href.includes("fonts.googleapis.com") && !googleFontsLinks.includes(href)) {
        googleFontsLinks.push(href);
      }
    });
    // Also pick up @import rules that reference Google Fonts
    const importRe = /url\(['"]?(https:\/\/fonts\.googleapis\.com[^'")]+)['"]?\)/gi;
    let im: RegExpExecArray | null;
    while ((im = importRe.exec(allCss)) !== null) {
      if (!googleFontsLinks.includes(im[1])) googleFontsLinks.push(im[1]);
    }

    // Add fonts found in GF link tags that aren't already in the CSS-declared list.
    // These are the verified font names (e.g. "Playfair Display" loaded via <link>
    // but never declared in any font-family CSS rule we could see).
    const gfLinkFonts: { family: string; category: string }[] = [];
    for (const gfLink of googleFontsLinks) {
      const re = /family=([^&]+)/g;
      let m2: RegExpExecArray | null;
      while ((m2 = re.exec(gfLink)) !== null) {
        const family = decodeURIComponent(m2[1]).split(":")[0].replace(/\+/g, " ").trim();
        if (
          family &&
          isUsableFont(family) &&
          !cssFonts.some((f) => f.family.toLowerCase() === family.toLowerCase())
        ) {
          gfLinkFonts.push({ family, category: categoriseFont(family) });
        }
      }
    }
    // GF-link fonts go first (verified), CSS-declared fonts follow
    const fonts = [...gfLinkFonts, ...cssFonts].slice(0, 7);

    // Best-effort page title for couple name
    const rawTitle =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      "";
    const pageTitle = rawTitle.split(/[|\-–—]/)[0].trim();

    return NextResponse.json({
      backgroundColors,
      textColors,
      accentColors,
      fonts,
      googleFontsLinks,
      elementStyles,
      keyImages,
      pageTitle,
      url,
    } satisfies ExtractedStyles);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
