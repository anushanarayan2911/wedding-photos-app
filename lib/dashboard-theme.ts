import { getLuminance, isLight, withOpacity, type ExtractedStyles, type KeyImage } from "@/lib/theme";

export interface DashboardTheme {
  bodyColor: string;
  h1Color: string;
  h2Color: string;
  h3Color: string;
  h4Color: string;
  mutedColor: string;
  primaryBtnBg: string;
  primaryBtnText: string;
  navColor: string;
  activeNavColor: string;
  navAccentBg: string;
  sidebarBg: string;
  borderColor: string;
  contrastBg: string;
  mainBg: string | undefined;
  h1Font: string;
  h2Font: string;
  h3Font: string;
  h4Font: string;
  h1FontWeight: string;
  h2FontWeight: string;
  h3FontWeight: string;
  h4FontWeight: string;
  bodyFontResolved: string;
  bodyFontWeight: string | undefined;
  heroImg: KeyImage | undefined;
  decorativeImgs: KeyImage[];
  /** Near-white/cream surface for polaroid mattes, quote/story cards — independent of mainBg, which is often undefined when a hero image is present. */
  paperBg: string;
  /** Soft tint of the primary accent, for section eyebrows/badges. */
  accentSoft: string;
}

// ── Accessibility helpers ─────────────────────────────────────────────────────

/** True if a colour is fully (or near-fully) opaque — safe to paint a solid fill with.
 *  Sites use low-alpha rgba/hsla tints for hover states and dim overlays; those aren't
 *  real background colours and would just wash out if used as a solid sidebar fill. */
function isOpaque(color: string): boolean {
  const m =
    color.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i) ??
    color.match(/hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*,\s*([\d.]+)\s*\)/i);
  return !m || parseFloat(m[1]) >= 0.9;
}

/** HSL saturation (0–1) — higher means more chromatic / less grey. */
function getSaturation(color: string): number {
  const m =
    color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i) ??
    color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)?.map((v, i) => i === 0 ? v : v + v);
  const rgb = m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)].map(c => c / 255)
    : (() => { const rm = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return rm ? [+rm[1]/255,+rm[2]/255,+rm[3]/255] : null; })();
  if (!rgb) return 0;
  const max = Math.max(...rgb), min = Math.min(...rgb);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return d / (l > 0.5 ? 2 - max - min : max + min);
}

/** WCAG 2.1 contrast ratio between two colours. */
function contrastRatio(fg: string, bg: string): number {
  const l1 = getLuminance(fg) + 0.05;
  const l2 = getLuminance(bg) + 0.05;
  return Math.max(l1, l2) / Math.min(l1, l2);
}

/**
 * Returns `hint` if it meets 4.5:1 contrast against `bg`.
 * Otherwise walks `pool` and returns the first that does.
 * Falls back to pure black or white based on bg luminance.
 */
function pickText(hint: string | undefined, bg: string, pool: string[]): string {
  if (hint && contrastRatio(hint, bg) >= 4.5) return hint;
  const found = pool.find(c => contrastRatio(c, bg) >= 4.5);
  return found ?? (isLight(bg) ? "#1c1c1c" : "#f5f5f5");
}

/**
 * Returns `hint` if it meets 3:1 contrast (UI / large text).
 * Falls back through pool then to a safe absolute.
 */
function pickUi(hint: string | undefined, bg: string, pool: string[]): string {
  if (hint && contrastRatio(hint, bg) >= 3) return hint;
  const found = pool.find(c => contrastRatio(c, bg) >= 3);
  return found ?? (isLight(bg) ? "#1c1c1c" : "#f5f5f5");
}

/** Derives the dashboard's real, WCAG-checked theme from a couple's extracted wedding-site styles. */
export function deriveDashboardTheme(styles: ExtractedStyles): DashboardTheme {
  const elStyles = styles.elementStyles ?? [];
  const h1El = elStyles.find(e => e.selector === "h1");
  const h2El = elStyles.find(e => e.selector === "h2");
  const h3El = elStyles.find(e => e.selector === "h3");
  const h4El = elStyles.find(e => e.selector === "h4");
  const pEl  = elStyles.find(e => e.selector === "p") ?? elStyles.find(e => e.selector === "body");

  const toStack = (family: string | undefined) =>
    family ? `"${family}", sans-serif` : "system-ui, sans-serif";

  const detectedBody = pEl?.fontFamily;
  const detectedH1   = h1El?.fontFamily ?? h2El?.fontFamily ?? detectedBody;
  const detectedH2   = h2El?.fontFamily ?? detectedH1;
  const detectedH3   = h3El?.fontFamily ?? detectedH2;
  const detectedH4   = h4El?.fontFamily ?? detectedH3 ?? detectedBody;

  const bodyFontResolved = toStack(detectedBody);
  const h1Font = toStack(detectedH1);
  const h2Font = toStack(detectedH2);
  const h3Font = toStack(detectedH3);
  const h4Font = toStack(detectedH4);

  // UI / structural elements
  const headerEl  = elStyles.find(e => e.selector === "header");
  const navEl     = elStyles.find(e => e.selector === "nav");
  const sectionEl = elStyles.find(e => e.selector === "section");
  const articleEl = elStyles.find(e => e.selector === "article");
  const buttonEl  = elStyles.find(e => e.selector === "button");
  const aEl       = elStyles.find(e => e.selector === "a");
  const bodyEl    = elStyles.find(e => e.selector === "body");

  const { backgroundColors, textColors, accentColors } = styles;

  // ── Images (computed early so mainBg can depend on heroImg) ──────────────────
  const keyImages = styles.keyImages ?? [];
  const heroImg = keyImages.find(img => img.context === "first")
    ?? keyImages.find(img => img.context === "featured" || img.context === "hero")
    ?? keyImages.find(img => img.context === "background");
  const decorativeImgs = keyImages.filter(img => img.context === "decorative");

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  const bgsByLuminance = [...backgroundColors].sort((a, b) => getLuminance(b) - getLuminance(a));

  // If there's a background image, don't force a colour — let the image show.
  // Otherwise use the site's lightest extracted background colour.
  const mainBg = heroImg ? undefined : (bgsByLuminance[0] ?? "#f8f7f4");

  // Use white as the contrast reference for text when the bg is transparent.
  const contrastBg = mainBg ?? "#ffffff";

  // Sidebar: use the site's own nav/header background colour when the scraper
  // found one — that's the actual navbar colour, not a guess. Otherwise fall
  // back to the most chromatically distinct *background* colour (mid-dark
  // range only — not white, not pure black). Deliberately excludes
  // textColors/accentColors — those are text and border/UI swatches, not
  // background values, and picking from them was giving the sidebar a text
  // colour instead of a background colour.
  const sidebarBg = navEl?.backgroundColor ?? headerEl?.backgroundColor ?? ((): string => {
    const candidates = backgroundColors
      .filter(c => isOpaque(c) && getLuminance(c) > 0.02 && getLuminance(c) < 0.75) // exclude translucent overlays, pure white, pure black
      .sort((a, b) => getSaturation(b) - getSaturation(a));
    return candidates[0] ?? bgsByLuminance[bgsByLuminance.length - 1] ?? "#1c1c1c";
  })();

  // Border: subtle against the content background
  const borderHint = sectionEl?.borderColor ?? articleEl?.borderColor
    ?? headerEl?.borderColor ?? navEl?.borderColor;
  const borderColor = borderHint ?? "rgba(0,0,0,0.1)";

  // ── Text colours — WCAG AA (4.5:1) against the content background ────────────
  const bodyColor = pickText(pEl?.color ?? bodyEl?.color, contrastBg, textColors);
  const h1Color   = pickText(h1El?.color ?? h2El?.color, contrastBg, textColors);
  const h2Color   = pickText(h2El?.color ?? h1El?.color, contrastBg, [h1Color, ...textColors]);
  const h3Color   = pickText(h3El?.color ?? h2El?.color, contrastBg, [h2Color, h1Color, ...textColors]);
  const h4Color   = pickText(h4El?.color ?? pEl?.color, contrastBg, textColors);

  // mutedColor: 60% opacity of body text
  const mutedColor = withOpacity(bodyColor, 0.6);

  // ── Interactive / accent ─────────────────────────────────────────────────────
  const primaryBtnBg =
    buttonEl?.backgroundColor
    ?? accentColors[0]
    ?? aEl?.color
    ?? h1Color;
  const primaryBtnText = contrastRatio(primaryBtnBg, "#ffffff") >= 4.5 ? "#ffffff" : "#1c1c1c";

  // ── Navigation — contrast against accent sidebarBg ───────────────────────────
  // pickText/pickUi verify the chosen colour reads clearly on the accent surface.
  const navTextPool = [bodyColor, h1Color, ...textColors];
  const navColor      = pickText(navEl?.color ?? aEl?.color, sidebarBg, navTextPool);
  const activeNavColor = pickUi(aEl?.color ?? primaryBtnBg, sidebarBg, [primaryBtnBg, ...navTextPool]);
  const navAccentBg   = withOpacity(navColor, 0.15);

  const h1FontWeight = h1El?.fontWeight ?? h2El?.fontWeight ?? "700";
  const h2FontWeight = h2El?.fontWeight ?? h1El?.fontWeight ?? "700";
  const h3FontWeight = h3El?.fontWeight ?? h2El?.fontWeight ?? "700";
  const h4FontWeight = h4El?.fontWeight ?? h3El?.fontWeight ?? pEl?.fontWeight ?? "600";
  const bodyFontWeight = pEl?.fontWeight;

  // ── Memory Board additions ────────────────────────────────────────────────
  // A light, warm surface for polaroid mattes / quote / story cards that stays
  // legible regardless of whether mainBg is set (it's undefined whenever a
  // hero image is present, since the image itself paints the background).
  const paperBg = isLight(contrastBg) ? contrastBg : "#faf8f4";
  const accentSoft = withOpacity(primaryBtnBg, 0.12);

  return {
    bodyColor, h1Color, h2Color, h3Color, h4Color, mutedColor,
    primaryBtnBg, primaryBtnText,
    navColor, activeNavColor, navAccentBg, sidebarBg,
    borderColor, contrastBg, mainBg,
    h1Font, h2Font, h3Font, h4Font,
    h1FontWeight, h2FontWeight, h3FontWeight, h4FontWeight,
    bodyFontResolved, bodyFontWeight,
    heroImg, decorativeImgs,
    paperBg, accentSoft,
  };
}
