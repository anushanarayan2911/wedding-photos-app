export interface ExtractedStyles {
  backgroundColors: string[];
  textColors: string[];
  accentColors: string[];
  fonts: { family: string; category: string }[];
  pageTitle: string;
  url: string;
}

export interface Theme {
  // Backgrounds
  sidebarBg: string;
  pageBg: string;
  cardBg: string;
  borderColor: string;
  // Typography colours
  headingColor: string;
  bodyColor: string;
  mutedColor: string;
  // Interactive
  primaryBtnBg: string;
  primaryBtnText: string;
  activeNavColor: string;
  // Fonts
  headingFont: string;   // serif/display — for page headings
  scriptFont: string;    // display/script — for couple name, decorative text
  bodyFont: string;      // sans-serif — for UI, labels, nav
  // Google Fonts import URL (best-effort)
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

// ── Google Fonts URL ──────────────────────────────────────────────────────────

function buildGoogleFontsUrl(fonts: { family: string; category: string }[]): string | null {
  const families = fonts
    .filter((f) => f.category !== "Monospace")
    .map((f) => `family=${encodeURIComponent(f.family)}:ital,wght@0,400;0,700;1,400`)
    .join("&");
  return families ? `https://fonts.googleapis.com/css2?${families}&display=swap` : null;
}

// ── Theme derivation ──────────────────────────────────────────────────────────

export function deriveTheme(styles: ExtractedStyles): Theme {
  const { backgroundColors, textColors, accentColors, fonts } = styles;

  // Sort bg colours: lightest first
  const sortedBg = [...backgroundColors].sort((a, b) => getLuminance(b) - getLuminance(a));
  const lightBgs = sortedBg.filter((c) => getLuminance(c) > 0.55);

  // Sort text colours: darkest first (most contrast)
  const sortedText = [...textColors].sort((a, b) => getLuminance(a) - getLuminance(b));

  // ── Backgrounds ──
  // Sidebar: lightest extracted bg (gives a subtle on-brand tint vs white main content)
  const sidebarBg = lightBgs[0] ?? "#f5f5f4";
  // Main page content: always white for a clean dashboard feel
  const pageBg = "#ffffff";
  // Cards: white; border uses second-lightest bg for subtle separation
  const cardBg = "#ffffff";
  const borderColor = lightBgs[1] ?? lightBgs[0] ?? "#e5e5e4";

  // ── Text ──
  const headingColor = sortedText[0] ?? sortedBg[sortedBg.length - 1] ?? "#1c1c1c";
  const bodyColor = sortedText[1] ?? headingColor;
  const mutedColor = "#9ca3af"; // always neutral for stat labels

  // ── Interactive ──
  // Primary button: use the heading colour (strongest brand colour)
  const primaryBtnBg = headingColor;
  const primaryBtnText = isLight(primaryBtnBg) ? "#1c1c1c" : "#ffffff";
  const activeNavColor = headingColor;

  // ── Fonts ──
  const displayFont = fonts.find((f) => f.category === "Display");
  const serifFont = fonts.find((f) => f.category === "Serif");
  const sansFont = fonts.find((f) => f.category === "Sans-serif");

  // Dashboard heading (e.g. "Couple Dashboard"): serif if available, else display
  const headingFontFamily = serifFont?.family ?? displayFont?.family ?? null;
  const headingFont = headingFontFamily
    ? `"${headingFontFamily}", Georgia, serif`
    : "Georgia, 'Times New Roman', serif";

  // Couple name / decorative text: script/display font if available
  const scriptFontFamily = displayFont?.family ?? serifFont?.family ?? null;
  const scriptFont = scriptFontFamily
    ? `"${scriptFontFamily}", cursive`
    : headingFont;

  // Body / UI text: sans-serif
  const bodyFont = sansFont?.family
    ? `"${sansFont.family}", system-ui, sans-serif`
    : "system-ui, -apple-system, sans-serif";

  const googleFontsUrl = buildGoogleFontsUrl(fonts);

  return {
    sidebarBg,
    pageBg,
    cardBg,
    borderColor,
    headingColor,
    bodyColor,
    mutedColor,
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
