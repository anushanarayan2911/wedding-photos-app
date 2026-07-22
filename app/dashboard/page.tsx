"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { withOpacity, type ExtractedStyles, SESSION_KEY } from "@/lib/theme";
import { deriveDashboardTheme } from "@/lib/dashboard-theme";
import { MemoryBoard } from "@/components/memory-board/MemoryBoard";
import type { UploadedPhoto } from "@/components/memory-board/types";

const NAV_ITEMS = [
  { label: "Memory Board", active: true },
  { label: "Uploads", active: false },
  { label: "Share & Invite", active: false },
  { label: "Settings", active: false },
];

export default function DashboardPage() {
  const router = useRouter();
  const [styles, setStyles] = useState<ExtractedStyles | null>(null);
  const [uploads, setUploads] = useState<UploadedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const theme = useMemo(() => (styles ? deriveDashboardTheme(styles) : null), [styles]);

  function handleReset() {
    sessionStorage.removeItem(SESSION_KEY);
    router.push("/");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.removeItem(SESSION_KEY);
    router.push("/login");
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
    function applyStyles(parsed: ExtractedStyles) {
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
    }

    let cancelled = false;

    (async () => {
      // Require a logged-in account to view the dashboard.
      const sessionRes = await fetch("/api/auth/session").catch(() => null);
      const sessionData = sessionRes?.ok ? await sessionRes.json() : { user: null };
      if (cancelled) return;
      if (!sessionData.user) {
        router.push("/login");
        return;
      }

      // Fast path: paint from this browser's cached copy immediately...
      const raw = sessionStorage.getItem(SESSION_KEY);
      let cached: ExtractedStyles | null = null;
      if (raw) {
        try { cached = JSON.parse(raw); } catch { /* malformed cache — ignore */ }
      }
      if (cached && !cancelled) applyStyles(cached);

      // ...then reconcile with the account's saved site, which is the source
      // of truth (lets a couple log in on a new device and see their board).
      const stylesRes = await fetch("/api/account/styles").catch(() => null);
      if (cancelled) return;
      const stylesData = stylesRes?.ok ? await stylesRes.json() : { styles: null };
      if (stylesData.styles) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stylesData.styles));
        applyStyles(stylesData.styles);
      } else if (!cached) {
        router.push("/"); // no connected site yet
      }
    })();

    return () => { cancelled = true; };
  }, [router]);

  if (!theme || !styles) return <LoadingScreen />;

  const coupleName = styles.pageTitle || "Your Wedding Board";
  const decorativeImgs = theme.decorativeImgs;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: theme.bodyFontResolved, color: theme.bodyColor, fontWeight: theme.bodyFontWeight }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col h-screen"
        style={{
          backgroundColor: theme.sidebarBg,
          borderRight: `1px solid ${withOpacity(theme.navColor, 0.2)}`,
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-4 py-5"
          style={{ borderBottom: `1px solid ${withOpacity(theme.navColor, 0.2)}` }}
        >
          <div className="w-6 h-6 border-2 flex-shrink-0" style={{ borderColor: theme.navColor }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: theme.navColor }}
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
                      color: theme.activeNavColor,
                      fontWeight: 700,
                      backgroundColor: theme.navAccentBg,
                    }
                  : {
                      color: theme.navColor,
                      opacity: 0.65,
                    }
              }
            >
              <span
                className="w-3.5 h-3.5 border flex-shrink-0"
                style={{ borderColor: active ? theme.activeNavColor : theme.borderColor }}
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

        {/* Reset / account */}
        <div className="px-3 pb-5 space-y-0.5" style={{ borderTop: `1px solid ${theme.borderColor}`, paddingTop: "12px" }}>
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors hover:opacity-100"
            style={{ color: theme.bodyColor, opacity: 0.5 }}
          >
            <span className="w-3.5 h-3.5 flex-shrink-0 text-base leading-none">↩</span>
            Connect new site
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors hover:opacity-100"
            style={{ color: theme.bodyColor, opacity: 0.5 }}
          >
            <span className="w-3.5 h-3.5 flex-shrink-0 text-base leading-none">⏻</span>
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main ref={mainRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        {/* Slim editorial masthead */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between px-8 py-4"
          style={{ borderBottom: `1px solid ${theme.borderColor}`, backgroundColor: theme.contrastBg }}
        >
          <p className="text-sm" style={{ color: theme.mutedColor }}>{coupleName}</p>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              className="px-4 py-2 text-sm rounded"
              style={{
                border: `1.5px solid ${theme.primaryBtnBg}`,
                color: theme.primaryBtnBg,
                backgroundColor: "transparent",
              }}
            >
              Share Board Link
            </button>
            <button
              className="px-4 py-2 text-sm rounded"
              style={{
                backgroundColor: theme.primaryBtnBg,
                color: theme.primaryBtnText,
              }}
            >
              Download All
            </button>
          </div>
        </div>

        {/* The Memory Board experience */}
        <MemoryBoard
          theme={theme}
          coupleName={coupleName}
          uploads={uploads}
          isUploading={isUploading}
          uploadError={uploadError}
          fileInputRef={fileInputRef}
          onFiles={handleFiles}
          onDrop={handleDrop}
          mainRef={mainRef}
        />
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
