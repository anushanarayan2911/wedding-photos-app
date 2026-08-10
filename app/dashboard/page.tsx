"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type ExtractedStyles, SESSION_KEY } from "@/lib/theme";
import { deriveDashboardTheme } from "@/lib/dashboard-theme";
import { Hero } from "@/components/memory-board/sections/Hero";
import { Welcome } from "@/components/memory-board/sections/Welcome";

export default function DashboardPage() {
  const router = useRouter();
  const [styles, setStyles] = useState<ExtractedStyles | null>(null);
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

  return (
    <main ref={mainRef} className="relative h-screen overflow-y-auto overflow-x-hidden">
      <Hero theme={theme} containerRef={mainRef} coupleName={coupleName} heroImg={theme.heroImg} />
      <Welcome theme={theme} coupleName={coupleName} galleryImgs={theme.galleryImgs} />

      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-4 text-[11px] uppercase tracking-widest bg-black/40 backdrop-blur-sm text-white/80 px-4 py-2 rounded-full">
        <button onClick={handleReset} className="hover:text-white transition-colors">Connect a different site</button>
        <span className="opacity-30">·</span>
        <button onClick={handleLogout} className="hover:text-white transition-colors">Log out</button>
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-sm text-gray-400 font-mono">Loading your dashboard…</p>
    </div>
  );
}
