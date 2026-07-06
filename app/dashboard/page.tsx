"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deriveTheme, withOpacity, isLight, getLuminance, type ExtractedStyles, type Theme, SESSION_KEY } from "@/lib/theme";

interface UploadedPhoto {
  url: string;
  name: string;
  uploadedAt: string;
}

/** Relative time like "5m ago" / "2h ago" / "3d ago" for the most recent upload. */
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
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

const NAV_ITEMS = [
  { label: "Overview", active: true },
  { label: "Memory Board", active: false },
  { label: "Uploads", active: false },
  { label: "Share & Invite", active: false },
  { label: "Settings", active: false },
];


export default function DashboardPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [styles, setStyles] = useState<ExtractedStyles | null>(null);
  const [uploads, setUploads] = useState<UploadedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleReset() {
    sessionStorage.removeItem(SESSION_KEY);
    router.push("/");
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length) return;
    setIsUploading(true);
    setUploadError(null);
    const formData = new FormData();
    Array.from(fileList).forEach((file) => formData.append("files", file));
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUploads((prev) => [...(data.uploaded as UploadedPhoto[]), ...prev]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  useEffect(() => {
    fetch("/api/upload")
      .then((res) => res.json())
      .then((data) => setUploads(data.photos ?? []))
      .catch(() => {});
  }, []);

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

      // Build a per-family weight set from elementStyles so we can request the
      // exact weights used by the site (e.g. 300, 600) rather than always 400;700.
      // If the site uses weight 300 and we only load 400;700, the browser picks 400
      // which renders heavier than the original — this fixes that mismatch.
      const familyWeights = new Map<string, Set<string>>();
      for (const el of parsed.elementStyles ?? []) {
        if (!el.fontFamily) continue;
        const key = el.fontFamily.toLowerCase();
        if (!familyWeights.has(key)) familyWeights.set(key, new Set());
        if (el.fontWeight && /^\d{3}$/.test(el.fontWeight)) {
          familyWeights.get(key)!.add(el.fontWeight);
        }
      }
      const weightSpec = (familyLower: string) => {
        const ws = familyWeights.get(familyLower) ?? new Set<string>();
        const all = new Set(["400", "700", ...ws]);
        return [...all].sort((a, b) => parseInt(a) - parseInt(b)).join(";");
      };

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
        const spec = font.category === "Display" ? n : `${n}:wght@${weightSpec(font.family.toLowerCase())}`;
        injectLink(`https://fonts.googleapis.com/css2?family=${spec}&display=swap`);
        coveredNames.add(font.family.toLowerCase());
      }

      // 3. Fonts discovered via element-level CSS variable resolution (e.g. Wix --font_N vars)
      //    may not appear in parsed.fonts — inject them separately with their actual weights.
      for (const el of parsed.elementStyles ?? []) {
        if (!el.fontFamily) continue;
        if (coveredNames.has(el.fontFamily.toLowerCase())) continue;
        const n = encodeURIComponent(el.fontFamily).replace(/%20/g, "+");
        injectLink(`https://fonts.googleapis.com/css2?family=${n}:wght@${weightSpec(el.fontFamily.toLowerCase())}&display=swap`);
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

  const stats = [
    { label: "Photos Uploaded", value: String(uploads.length) },
    { label: "Contributors", value: "38" },
    { label: "Last Upload", value: uploads[0] ? formatRelativeTime(uploads[0].uploadedAt) : "—" },
  ];

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        ...(mainBg ? { backgroundColor: mainBg } : {}),
        fontFamily: bodyFontResolved, color: bodyColor, fontWeight: bodyFontWeight,
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col h-screen"
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

        {/* Decorative accent — mirrors how wedding sites use botanical motifs as dividers */}
        {decorativeImgs[0] && (
          <div className="flex justify-center px-4 py-2">
            <img
              src={decorativeImgs[0].url}
              alt=""
              aria-hidden
              className="w-24 h-24 object-contain pointer-events-none select-none"
              style={{ opacity: 0.22 }}
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        )}

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
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <div
          className="sticky top-0 z-10 relative overflow-hidden flex items-center justify-between px-8 py-10"
          style={{ borderBottom: `1px solid ${borderColor}`, backgroundColor: contrastBg }}
        >
          {/* Decorative corner element — mirrors how wedding sites use botanical
              motifs as corner frames on headers and hero sections */}
          {decorativeImgs[1] && (
            <img
              src={decorativeImgs[1].url}
              alt=""
              aria-hidden
              className="absolute top-0 right-0 h-full w-auto max-w-[140px] object-contain object-right-top pointer-events-none select-none"
              style={{ opacity: 0.18 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}

          <div className="relative">
            <h1
              className="text-2xl leading-tight"
              style={{ fontFamily: h1Font, color: h1Color, fontWeight: h1FontWeight }}
            >
              Couple Dashboard
            </h1>
            <p
              className="mt-1 text-base"
              style={{ color: mutedColor }}
            >
              {coupleName}
            </p>
          </div>

          <div className="relative flex items-center gap-3 flex-shrink-0 mt-1">
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
        <div
          className="flex-1 relative"
          style={!heroImg && mainBg ? { backgroundColor: mainBg } : undefined}
        >
          {heroImg && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${heroImg.url})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
                filter: "contrast(1.1) saturate(1.05)",
              }}
            />
          )}
          <div className="relative px-8 py-8 space-y-8">
          {/* Stats */}
          <div className="relative">
            {/* Decorative corner motif — mirrors botanical corner frames common on wedding sites */}
            {decorativeImgs[0] && (
              <img
                src={decorativeImgs[0].url}
                alt=""
                aria-hidden
                className="absolute -top-2 -right-4 w-28 h-28 object-contain pointer-events-none select-none"
                style={{ opacity: 0.15 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <h2
              className="text-sm uppercase tracking-widest mb-4"
              style={{ fontFamily: h2Font, color: h2Color, fontWeight: h2FontWeight }}
            >
              At a Glance
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {stats.map(({ label, value }) => (
                <div
                  key={label}
                  className="px-6 py-5 rounded"
                  style={{
                    backgroundColor: contrastBg,
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
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-base"
                style={{ fontFamily: h2Font, color: h2Color, fontWeight: h2FontWeight }}
              >
                Recent Uploads
              </h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 text-xs uppercase tracking-wide rounded disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryBtnBg, color: primaryBtnText }}
              >
                {isUploading ? "Uploading…" : "Upload Photos"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
              />
            </div>

            {uploadError && (
              <p className="text-sm mb-4" style={{ color: "#c0392b" }}>{uploadError}</p>
            )}

            {uploads.length === 0 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="rounded border-2 border-dashed py-12 flex items-center justify-center text-sm cursor-pointer"
                style={{ borderColor, color: mutedColor }}
              >
                Drag photos here, or click to upload
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="grid grid-cols-4 gap-3"
              >
                {uploads.map((photo) => (
                  <div
                    key={photo.url}
                    className="aspect-square rounded overflow-hidden"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>{/* end inner relative content wrapper */}
        </div>
      </main>
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
