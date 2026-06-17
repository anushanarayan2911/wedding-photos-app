"use client";

import { useEffect, useState } from "react";
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
  const [theme, setTheme] = useState<Theme | null>(null);
  const [styles, setStyles] = useState<ExtractedStyles | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const parsed: ExtractedStyles = JSON.parse(raw);
    setStyles(parsed);
    setTheme(deriveTheme(parsed));
  }, []);

  // Load Google Fonts dynamically
  useEffect(() => {
    if (!theme?.googleFontsUrl) return;
    const existing = document.querySelector(`link[data-memoboard-fonts]`);
    if (existing) existing.remove();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = theme.googleFontsUrl;
    link.setAttribute("data-memoboard-fonts", "1");
    document.head.appendChild(link);
  }, [theme?.googleFontsUrl]);

  if (!theme || !styles) {
    return <LoadingScreen />;
  }

  const coupleName = styles.pageTitle || "Your Wedding Board";

  const t = theme;

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: t.pageBg, fontFamily: t.bodyFont, color: t.bodyColor }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col border-r"
        style={{ backgroundColor: t.sidebarBg, borderColor: t.borderColor }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: t.borderColor }}>
          <div
            className="w-6 h-6 border-2 flex-shrink-0"
            style={{ borderColor: t.headingColor }}
          />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ fontFamily: t.bodyFont, color: t.headingColor }}
          >
            Memoboard
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-4 space-y-1">
          {NAV_ITEMS.map(({ label, active }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3 px-2 py-2 rounded text-sm text-left transition-colors"
              style={
                active
                  ? { color: t.activeNavColor, fontWeight: 700 }
                  : { color: t.bodyColor, opacity: 0.7 }
              }
            >
              <span
                className="w-4 h-4 border flex-shrink-0"
                style={{ borderColor: active ? t.activeNavColor : t.borderColor }}
              />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div
          className="flex items-start justify-between px-8 py-6 border-b"
          style={{ borderColor: t.borderColor }}
        >
          <div>
            <h1
              className="text-2xl font-bold leading-tight"
              style={{ fontFamily: t.headingFont, color: t.headingColor }}
            >
              Couple Dashboard
            </h1>
            <p
              className="text-sm mt-1"
              style={{ fontFamily: t.scriptFont, color: t.bodyColor, opacity: 0.75 }}
            >
              {coupleName}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              className="px-4 py-2 text-sm border rounded"
              style={{
                borderColor: t.primaryBtnBg,
                color: t.primaryBtnBg,
                fontFamily: t.bodyFont,
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

        {/* Content area */}
        <div className="flex-1 px-8 py-8 space-y-8">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            {STATS.map(({ label, value }) => (
              <div
                key={label}
                className="rounded border px-6 py-5"
                style={{ backgroundColor: t.cardBg, borderColor: t.borderColor }}
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
