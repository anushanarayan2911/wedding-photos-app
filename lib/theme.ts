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
  keyImages?: KeyImage[];
  pageTitle: string;
  url: string;
}

export interface Theme {
  sidebarBg: string;
  pageBg: string;
  cardBg: string;
  borderColor: string;
  headingColor: string;
  bodyColor: string;
  mutedColor: string;
  accentBg: string;       // very light tint of headingColor — for active nav, card accents
  primaryBtnBg: string;
  primaryBtnText: string;
  activeNavColor: string;
  headingFont: string;
  scriptFont: string;
  bodyFont: string;
  googleFontsUrl: string | null;
}

// ── Colour utilities ──────────────────────────────────────────────────────────

function colorToRgb(color: string): [number, number, number] | null {
  const h3 = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (h3) return [parseInt(h3[1] + h3[1], 16), parseInt(h3[2] + h3[2], 16), parseInt(h3[3] + h3[3], 16)];
  const h6 = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (h6) return [parseInt(h6[1], 16), parseInt(h6[2], 16), parseInt(h6[3], 16)];
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return [parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3])];
  return null;
}

export function getLuminance(color: string): number {
  const rgb = colorToRgb(color);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((c) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isLight(color: string): boolean {
  return getLuminance(color) > 0.5;
}

export function withOpacity(color: string, opacity: number): string {
  const rgb = colorToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
}

// ── Google Fonts helpers ──────────────────────────────────────────────────────

/** Parse family names out of one or more Google Fonts CSS URLs. */
function parseFamiliesFromGfLinks(links: string[]): string[] {
  const names: string[] = [];
  for (const link of links) {
    // Fresh regex per link — global regex reuses lastIndex across strings
    const re = /family=([^&]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(link)) !== null) {
      const name = decodeURIComponent(m[1]).split(":")[0].replace(/\+/g, " ").trim();
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return names;
}

function categoriseFont(name: string): string {
  const lower = name.toLowerCase();

  // Monospace — check first (most specific)
  const mono = ["mono", "code", "courier", "consolas", "fira", "source code", "inconsolata"];
  if (mono.some((d) => lower.includes(d))) return "Monospace";

  // Serif — check before script/display so "Playfair Display" → Serif not Script
  const serif = [
    "playfair", "cormorant", "garamond", "baskerville", "palatino",
    "times", "georgia", "crimson", "merriweather", "lora",
    "libre baskerville", "bodoni", "caslon", "didot", "trajan",
    "eb garamond", "noto serif", "pt serif", "source serif",
    "spectral", "neuton", "vollkorn", "gentium", "cardo", "arvo", "bitter",
    "josefin slab", "zilla slab", "abril fatface",
  ];
  if (serif.some((d) => lower.includes(d))) return "Serif";

  // Script / decorative — matched by specific font names only, NOT the word "display"
  const script = [
    "sacramento", "great vibes", "dancing script", "pacifico", "lobster",
    "satisfy", "allura", "alex brush", "pinyon script", "mr dafoe",
    "rouge script", "tangerine", "italianno", "brittany", "lavishly",
    "playlist", "cookie", "kaushan", "yellowtail", "marck script",
    "petit formal", "caractere", "dynalight", "merienda",
  ];
  if (script.some((d) => lower.includes(d))) return "Display";

  return "Sans-serif";
}

/** Build a Google Fonts URL from a list of font names. */
function buildGoogleFontsUrl(fontNames: string[]): string | null {
  if (!fontNames.length) return null;
  const parts = fontNames.map((name) => {
    const n = name.replace(/\s+/g, "+");
    return categoriseFont(name) === "Display" ? `family=${n}` : `family=${n}:wght@400;700`;
  });
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}

// ── Theme derivation ──────────────────────────────────────────────────────────

export function deriveTheme(styles: ExtractedStyles): Theme {
  const { backgroundColors, textColors, fonts } = styles;
  // Defensive: old session data may not have googleFontsLinks
  const googleFontsLinks = styles.googleFontsLinks ?? [];

  // ── Backgrounds ──
  const sortedBg = [...backgroundColors].sort((a, b) => getLuminance(b) - getLuminance(a));
  const lightBgs = sortedBg.filter((c) => getLuminance(c) > 0.55);
  const sidebarBg = lightBgs[0] ?? "#f5f5f4";
  const pageBg = "#ffffff";
  const cardBg = "#ffffff";
  const borderColor = lightBgs[1] ?? lightBgs[0] ?? "#e5e5e4";

  // ── Text ──
  const sortedText = [...textColors].sort((a, b) => getLuminance(a) - getLuminance(b));
  const headingColor = sortedText[0] ?? sortedBg[sortedBg.length - 1] ?? "#1c1c1c";
  const bodyColor = sortedText[1] ?? headingColor;
  // Muted: 50% opacity of heading colour — stays on-brand
  const mutedColor = withOpacity(headingColor, 0.5);
  // Accent bg: very light tint (8%) for active nav items, card accents etc.
  const accentBg = withOpacity(headingColor, 0.08);

  // ── Interactive ──
  const primaryBtnBg = headingColor;
  const primaryBtnText = isLight(primaryBtnBg) ? "#1c1c1c" : "#ffffff";
  const activeNavColor = headingColor;

  // ── Fonts ──
  // Prefer fonts that were actually loaded by the site via Google Fonts links.
  // These are guaranteed to have the right name and be downloadable.
  const gfFamilies = parseFamiliesFromGfLinks(googleFontsLinks);

  // Map extracted font entries to their category, then build priority lookup
  const allFonts = [
    // Verified GF names first (they'll actually load)
    ...gfFamilies.map((family) => ({ family, category: categoriseFont(family), verified: true })),
    // Then CSS-declared names (may be commercial, may not load)
    ...fonts.map((f) => ({ ...f, verified: false })),
  ];

  const pick = (category: string, verified?: boolean) =>
    allFonts.find((f) =>
      f.category === category && (verified === undefined || f.verified === verified)
    );

  // Build comprehensive font stacks from ALL detected fonts per category.
  // Verified GF fonts (from googleFontsLinks) come first since they're
  // guaranteed loadable; CSS-declared fonts follow as cascading fallbacks.
  // The dashboard injects a separate GF link per font, so each loads
  // independently — commercial fonts fail silently, GF fonts succeed.
  const unique = (arr: string[]) => [...new Set(arr)];

  const allSerifs = unique(allFonts.filter(f => f.category === "Serif").map(f => f.family));
  const allDisplays = unique(allFonts.filter(f => f.category === "Display").map(f => f.family));
  const allSans = unique(allFonts.filter(f => f.category === "Sans-serif").map(f => f.family));

  const headingFont = allSerifs.length
    ? allSerifs.map(f => `"${f}"`).join(", ") + ", Georgia, serif"
    : allDisplays.length
    ? allDisplays.map(f => `"${f}"`).join(", ") + ", cursive"
    : "Georgia, 'Times New Roman', serif";

  const scriptFont = allDisplays.length
    ? allDisplays.map(f => `"${f}"`).join(", ") + ", cursive"
    : headingFont;

  const bodyFont = allSans.length
    ? allSans.map(f => `"${f}"`).join(", ") + ", system-ui, sans-serif"
    : allSerifs.length
    ? allSerifs.map(f => `"${f}"`).join(", ") + ", Georgia, serif"
    : "system-ui, -apple-system, sans-serif";

  // ── Google Fonts URL ──
  // Combined URL for verified GF fonts only (safe to combine since all are known-good).
  // The dashboard additionally injects per-font links for CSS-declared fonts.
  const googleFontsUrl = buildGoogleFontsUrl(gfFamilies);

  return {
    sidebarBg,
    pageBg,
    cardBg,
    borderColor,
    headingColor,
    bodyColor,
    mutedColor,
    accentBg,
    primaryBtnBg,
    primaryBtnText,
    activeNavColor,
    headingFont,
    scriptFont,
    bodyFont,
    googleFontsUrl,
  };
}

export const SESSION_KEY = "memoboard_styles";
