"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deriveTheme, type ExtractedStyles, type Theme, SESSION_KEY } from "@/lib/theme";

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
  const firstFont = styles.fonts[0]?.family ?? null;

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: t.pageBg, fontFamily: t.bodyFont, color: t.bodyColor }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col"
        style={{
          backgroundColor: t.sidebarBg,
          borderRight: `1px solid ${t.borderColor}`,
          // Prominent left accent bar — makes brand colour unmistakably visible
          borderLeft: `4px solid ${t.headingColor}`,
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-4 py-5"
          style={{ borderBottom: `1px solid ${t.borderColor}` }}
        >
          <div className="w-6 h-6 border-2 flex-shrink-0" style={{ borderColor: t.headingColor }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ fontFamily: t.bodyFont, color: t.headingColor }}
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
                      color: t.activeNavColor,
                      fontWeight: 700,
                      fontFamily: t.bodyFont,
                      backgroundColor: t.accentBg,
                    }
                  : {
                      color: t.bodyColor,
                      opacity: 0.65,
                      fontFamily: t.bodyFont,
                    }
              }
            >
              <span
                className="w-3.5 h-3.5 border flex-shrink-0"
                style={{ borderColor: active ? t.activeNavColor : t.borderColor }}
              />
              {label}
            </button>
          ))}
        </nav>

        {/* Reset */}
        <div className="px-3 pb-5" style={{ borderTop: `1px solid ${t.borderColor}`, paddingTop: "12px" }}>
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors hover:opacity-100"
            style={{ color: t.bodyColor, opacity: 0.5, fontFamily: t.bodyFont }}
          >
            <span className="w-3.5 h-3.5 flex-shrink-0 text-base leading-none">↩</span>
            Connect new site
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div
          className="flex items-start justify-between px-8 py-6"
          style={{ borderBottom: `1px solid ${t.borderColor}` }}
        >
          <div>
            <h1
              className="text-2xl font-bold leading-tight"
              style={{ fontFamily: firstFont ? `"${firstFont}", serif` : t.headingFont, color: t.headingColor }}
            >
              Couple Dashboard
            </h1>
            {/* Script font here is the most dramatic font demo */}
            <p
              className="mt-1 text-base"
              style={{ fontFamily: t.scriptFont, color: t.mutedColor }}
            >
              {coupleName}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 mt-1">
            <button
              className="px-4 py-2 text-sm rounded"
              style={{
                border: `1.5px solid ${t.primaryBtnBg}`,
                color: t.primaryBtnBg,
                fontFamily: t.bodyFont,
                backgroundColor: "transparent",
              }}
            >
              Share Board Link
            </button>
            <button
              className="px-4 py-2 text-sm rounded"
              style={{
                backgroundColor: t.primaryBtnBg,
                color: t.primaryBtnText,
                fontFamily: t.bodyFont,
              }}
            >
              Download All
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-8 py-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {STATS.map(({ label, value }) => (
              <div
                key={label}
                className="rounded border px-6 py-5"
                style={{
                  backgroundColor: t.cardBg,
                  borderColor: t.borderColor,
                  // Top accent line — brand colour on every card
                  borderTop: `3px solid ${t.headingColor}`,
                }}
              >
                <p
                  className="text-xs uppercase tracking-widest mb-2"
                  style={{ color: t.mutedColor, fontFamily: t.bodyFont }}
                >
                  {label}
                </p>
                <p
                  className="text-3xl font-bold"
                  style={{ fontFamily: t.headingFont, color: t.headingColor }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Recent uploads */}
          <div>
            <h2
              className="text-base font-bold mb-4"
              style={{ fontFamily: t.headingFont, color: t.headingColor }}
            >
              Recent Uploads
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <PhotoPlaceholder key={i} borderColor={t.borderColor} />
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
