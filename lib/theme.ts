export interface ExtractedStyles {
  backgroundColors: string[];
  textColors: string[];
  accentColors: string[];
  fonts: { family: string; category: string }[];
  googleFontsLinks: string[];
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

function getLuminance(color: string): number {
  const rgb = colorToRgb(color);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((c) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLight(color: string): boolean {
  return getLuminance(color) > 0.5;
}

function withOpacity(color: string, opacity: number): string {
  const rgb = colorToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
}

// ── Google Fonts helpers ──────────────────────────────────────────────────────

/** Parse family names out of one or more Google Fonts CSS URLs. */
function parseFamiliesFromGfLinks(links: string[]): string[] {
  const names: string[] = [];
  const re = /family=([^&]+)/g;
  for (const link of links) {
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

/** Build a Google Fonts URL from a list of font names (fallback when site has no GF link). */
function buildGoogleFontsUrl(fontNames: string[]): string | null {
  if (!fontNames.length) return null;
  const parts = fontNames.map((name) => {
    const n = name.replace(/\s+/g, "+");
    return categoriseFont(name) === "Display" ? `family=${n}` : `family=${n}:wght@400;700`;
  });
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}

// Fonts definitely on Google Fonts that we can load by name even when not in the site's GF links
const KNOWN_GF_FONTS = new Set([
  // Script / decorative
  "sacramento", "great vibes", "dancing script", "pacifico", "lobster",
  "satisfy", "allura", "tangerine", "alex brush", "pinyon script",
  "kaushan script", "yellowtail", "marck script", "cookie", "merienda",
  // Serif
  "playfair display", "lora", "merriweather", "cormorant garamond",
  "libre baskerville", "eb garamond", "crimson text", "pt serif",
  "noto serif", "source serif pro", "spectral", "arvo", "bitter",
  // Sans-serif
  "open sans", "roboto", "lato", "montserrat", "poppins", "raleway",
  "nunito", "ubuntu", "source sans pro", "pt sans", "quicksand",
  "josefin sans", "work sans", "mulish", "karla", "barlow", "inter",
  "dm sans", "outfit", "figtree", "plus jakarta sans", "noto sans",
]);

// ── Theme derivation ──────────────────────────────────────────────────────────

export function deriveTheme(styles: ExtractedStyles): Theme {
  const { backgroundColors, textColors, fonts, googleFontsLinks } = styles;

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

  // Heading / script: prefer verified GF fonts, then any detected font
  const headingFontEntry =
    pick("Serif", true) ?? pick("Display", true) ?? pick("Serif") ?? pick("Display");
  const scriptFontEntry =
    pick("Display", true) ?? pick("Display") ?? headingFontEntry;

  // Body: prefer verified GF sans → known GF sans (loadable) → any sans
  const knownGfSans = allFonts.find(
    (f) => f.category === "Sans-serif" && KNOWN_GF_FONTS.has(f.family.toLowerCase())
  );
  const bodyFontEntry = pick("Sans-serif", true) ?? knownGfSans ?? pick("Sans-serif");

  const headingFont = headingFontEntry
    ? `"${headingFontEntry.family}", Georgia, serif`
    : "Georgia, 'Times New Roman', serif";

  const scriptFont = scriptFontEntry
    ? `"${scriptFontEntry.family}", cursive`
    : headingFont;

  const bodyFont = bodyFontEntry
    ? `"${bodyFontEntry.family}", system-ui, sans-serif`
    : "system-ui, -apple-system, sans-serif";

  // ── Google Fonts URL ──
  // Build one combined URL:
  // 1. All families from the site's own GF links (verified exact names)
  // 2. Any Display/script fonts detected in CSS that aren't already covered
  //    (e.g. Sacramento loaded via @import not captured in <link> tags)
  const coveredLower = new Set(gfFamilies.map((n) => n.toLowerCase()));
  // Add Display/script and sans-serif fonts from CSS declarations that are
  // known to be on Google Fonts but weren't captured in the site's <link> tags
  const extraFonts = fonts
    .filter(
      (f) =>
        KNOWN_GF_FONTS.has(f.family.toLowerCase()) &&
        !coveredLower.has(f.family.toLowerCase())
    )
    .map((f) => f.family);
  const allGfNames = [...gfFamilies, ...extraFonts];
  const googleFontsUrl = buildGoogleFontsUrl(allGfNames.length ? allGfNames : fonts.map((f) => f.family));

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
