"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SESSION_KEY, type SiteSnapshot } from "@/lib/site-snapshot";

export default function DashboardPage() {
  const router = useRouter();
  const [site, setSite] = useState<SiteSnapshot | null>(null);

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
      let cached: SiteSnapshot | null = null;
      if (raw) {
        try { cached = JSON.parse(raw); } catch { /* malformed cache — ignore */ }
      }
      if (cached && !cancelled) setSite(cached);

      // ...then reconcile with the account's saved site, which is the source
      // of truth (lets a couple log in on a new device and see their board).
      const siteRes = await fetch("/api/account/site").catch(() => null);
      if (cancelled) return;
      const siteData = siteRes?.ok ? await siteRes.json() : { site: null };
      if (siteData.site) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(siteData.site));
        setSite(siteData.site);
      } else if (!cached) {
        router.push("/"); // no connected site yet
      }
    })();

    return () => { cancelled = true; };
  }, [router]);

  if (!site) return <LoadingScreen />;

  return (
    <main className="relative h-screen overflow-y-auto overflow-x-hidden bg-white">
      <img
        src={site.screenshotUrl}
        alt={site.pageTitle || "Your wedding site"}
        className="w-full block"
      />

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
