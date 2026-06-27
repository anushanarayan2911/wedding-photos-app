"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deriveTheme, withOpacity, isLight, getLuminance, type ExtractedStyles, type Theme, SESSION_KEY } from "@/lib/theme";

// ── Accessibility helpers ─────────────────────────────────────────────────────

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

const NAV_ITEMS = [
  { label: "Overview", active: true },
  { label: "Memory Board", active: false },
  { label: "Uploads", active: false },
  { label: "Share & Invite", active: false },
  { label: "Settings", active: false },
];

const STATS = [
  { label: "Photos Uploaded", value: "142" },
  { label: "Contributors", value: "38" },
  { label: "Last Upload", value: "2h ago" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [styles, setStyles] = useState<ExtractedStyles | null>(null);

  function handleReset() {
    sessionStorage.removeItem(SESSION_KEY);
    router.push("/");
  }

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const parsed: ExtractedStyles = JSON.parse(raw);
      const derived = deriveTheme(parsed);

      // Inject fonts so they start downloading immediately.
      const injectLink = (href: string) => {
        if (!document.head.querySelector(`link[href="${href}"]`)) {
          const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href });
          document.head.appendChild(link);
        }
      };

      // 1. Site's own GF links verbatim (exact variant specs — guaranteed to load)
      for (const href of parsed.googleFontsLinks ?? []) injectLink(href);

      // 2. One link per detected CSS font, each attempted independently from GF.
      //    Fonts on GF (e.g. Sacramento, Open Sans) will load.
      //    Commercial fonts (e.g. Gotham SSm) return 404 and are silently skipped.
      //    The CSS font-family stacks cascade to the next available font automatically.
      const coveredNames = new Set(
        (parsed.googleFontsLinks ?? []).map(l => {
          const m = l.match(/family=([^&:]+)/);
          return m ? decodeURIComponent(m[1]).replace(/\+/g, " ").toLowerCase() : "";
        })
      );
      for (const font of parsed.fonts ?? []) {
        if (coveredNames.has(font.family.toLowerCase())) continue;
        const n = encodeURIComponent(font.family).replace(/%20/g, "+");
        const spec = font.category === "Display" ? n : `${n}:wght@400;700`;
        injectLink(`https://fonts.googleapis.com/css2?family=${spec}&display=swap`);
        coveredNames.add(font.family.toLowerCase());
      }

      // 3. Fonts discovered via element-level CSS variable resolution (e.g. Wix --font_N vars)
      //    may not appear in parsed.fonts — inject them separately.
      for (const el of parsed.elementStyles ?? []) {
        if (!el.fontFamily) continue;
        if (coveredNames.has(el.fontFamily.toLowerCase())) continue;
        const n = encodeURIComponent(el.fontFamily).replace(/%20/g, "+");
        injectLink(`https://fonts.googleapis.com/css2?family=${n}:wght@400;700&display=swap`);
        coveredNames.add(el.fontFamily.toLowerCase());
      }

      setStyles(parsed);
      setTheme(derived);
    } catch {
      // sessionStorage data was malformed — show nothing
    }
  }, []);

  if (!theme || !styles) return <LoadingScreen />;

  const t = theme;
  const coupleName = styles.pageTitle || "Your Wedding Board";

  // Direct font mapping: each HTML tag gets the font the wedding site uses for that tag.
  // Cascade: if a level has no detected font, fall up to the next detected ancestor.
  const elStyles = styles.elementStyles ?? [];
  const h1El = elStyles.find(e => e.selector === "h1");
  const h2El = elStyles.find(e => e.selector === "h2");
  const h3El = elStyles.find(e => e.selector === "h3");
  const h4El = elStyles.find(e => e.selector === "h4");
  const pEl  = elStyles.find(e => e.selector === "p") ?? elStyles.find(e => e.selector === "body");

  const toStack = (family: string | undefined) =>
    family ? `"${family}", sans-serif` : "system-ui, sans-serif";

  const detectedBody = pEl?.fontFamily;
  const detectedH1   = h1El?.fontFamily ?? detectedBody;
  const detectedH2   = h2El?.fontFamily ?? detectedH1;
  const detectedH3   = h3El?.fontFamily ?? detectedH2;
  const detectedH4   = h4El?.fontFamily ?? detectedBody;

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

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  // Main content is always white — predictable surface for all text and cards.
  const mainBg  = "#ffffff";
  const cardBg  = "#ffffff";

  // Sidebar uses the site's primary accent colour (first entry in the
  // accent palette, which is sourced from UI elements like buttons and links).
  // Fall back through backgrounds sorted dark-first, then a neutral dark.
  const bgsByLuminance = [...backgroundColors].sort((a, b) => getLuminance(b) - getLuminance(a));
  const sidebarBg = accentColors[0]
    ?? bgsByLuminance[bgsByLuminance.length - 1]
    ?? "#1c1c1c";

  // Border: subtle against white
  const borderHint = sectionEl?.borderColor ?? articleEl?.borderColor
    ?? headerEl?.borderColor ?? navEl?.borderColor;
  const borderColor = borderHint ?? "rgba(0,0,0,0.1)";

  // ── Text colours — WCAG AA (4.5:1) against white ────────────────────────────
  const bodyColor = pickText(pEl?.color ?? bodyEl?.color, mainBg, textColors);
  const h1Color   = pickText(h1El?.color, mainBg, textColors);
  const h2Color   = pickText(h2El?.color ?? h1El?.color, mainBg, [h1Color, ...textColors]);
  const h3Color   = pickText(h3El?.color ?? h2El?.color, mainBg, [h2Color, h1Color, ...textColors]);
  const h4Color   = pickText(h4El?.color ?? pEl?.color, mainBg, textColors);

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

  const h1FontWeight = h1El?.fontWeight ?? "700";
  const h2FontWeight = h2El?.fontWeight ?? "700";
  const h3FontWeight = h3El?.fontWeight ?? "700";
  const h4FontWeight = h4El?.fontWeight ?? "600";
  const bodyFontWeight = pEl?.fontWeight;

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: mainBg, fontFamily: bodyFontResolved, color: bodyColor, fontWeight: bodyFontWeight }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col"
        style={{
          backgroundColor: sidebarBg,
          borderRight: `1px solid ${withOpacity(navColor, 0.2)}`,
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-4 py-5"
          style={{ borderBottom: `1px solid ${withOpacity(navColor, 0.2)}` }}
        >
          <div className="w-6 h-6 border-2 flex-shrink-0" style={{ borderColor: navColor }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: navColor }}
          >
            Memoboard
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ label, active }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors"
              style={
                active
                  ? {
                      color: activeNavColor,
                      fontWeight: 700,
                      backgroundColor: navAccentBg,
                    }
                  : {
                      color: navColor,
                      opacity: 0.65,
                    }
              }
            >
              <span
                className="w-3.5 h-3.5 border flex-shrink-0"
                style={{ borderColor: active ? activeNavColor : borderColor }}
              />
              {label}
            </button>
          ))}
        </nav>

        {/* Reset */}
        <div className="px-3 pb-5" style={{ borderTop: `1px solid ${borderColor}`, paddingTop: "12px" }}>
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors hover:opacity-100"
            style={{ color: bodyColor, opacity: 0.5 }}
          >
            <span className="w-3.5 h-3.5 flex-shrink-0 text-base leading-none">↩</span>
            Connect new site
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: mainBg }}>
        {/* Header */}
        <div
          className="flex items-start justify-between px-8 py-6"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <div>
            <h1
              className="text-2xl leading-tight"
              style={{ fontFamily: h1Font, color: h1Color, fontWeight: h1FontWeight }}
            >
              Couple Dashboard
            </h1>
            {/* Script font here is the most dramatic font demo */}
            <p
              className="mt-1 text-base"
              style={{ color: mutedColor }}
            >
              {coupleName}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 mt-1">
            <button
              className="px-4 py-2 text-sm rounded"
              style={{
                border: `1.5px solid ${primaryBtnBg}`,
                color: primaryBtnBg,
                backgroundColor: "transparent",
              }}
            >
              Share Board Link
            </button>
            <button
              className="px-4 py-2 text-sm rounded"
              style={{
                backgroundColor: primaryBtnBg,
                color: primaryBtnText,
              }}
            >
              Download All
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-8 py-8 space-y-8">
          {/* Stats */}
          <div>
            <h2
              className="text-sm uppercase tracking-widest mb-4"
              style={{ fontFamily: h2Font, color: h2Color, fontWeight: h2FontWeight }}
            >
              At a Glance
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {STATS.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded border px-6 py-5"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: borderColor,
                    borderTop: `3px solid ${h1Color}`,
                  }}
                >
                  <h4
                    className="text-xs uppercase tracking-widest mb-2"
                    style={{ color: h4Color, fontFamily: h4Font, fontWeight: h4FontWeight }}
                  >
                    {label}
                  </h4>
                  <h3
                    className="text-3xl leading-none"
                    style={{ fontFamily: h3Font, color: h3Color, fontWeight: h3FontWeight }}
                  >
                    {value}
                  </h3>
                </div>
              ))}
            </div>
          </div>

          {/* Recent uploads */}
          <div>
            <h2
              className="text-base mb-4"
              style={{ fontFamily: h2Font, color: h2Color, fontWeight: h2FontWeight }}
            >
              Recent Uploads
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <PhotoPlaceholder key={i} borderColor={borderColor} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PhotoPlaceholder({ borderColor }: { borderColor: string }) {
  return (
    <div
      className="aspect-square rounded overflow-hidden relative"
      style={{ backgroundColor: "#f3f3f3", border: `1px solid ${borderColor}` }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="0" x2="100%" y2="100%" stroke="#d1d1d1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="100%" y1="0" x2="0" y2="100%" stroke="#d1d1d1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-sm text-gray-400 font-mono">Loading your dashboard…</p>
    </div>
  );
}
