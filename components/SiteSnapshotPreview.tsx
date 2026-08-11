"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SESSION_KEY, type SiteSnapshot } from "@/lib/site-snapshot";

interface Props {
  result: SiteSnapshot | null;
  loading: boolean;
}

export default function SiteSnapshotPreview({ result, loading }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleContinue() {
    if (!result) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/account/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: result }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save your site to your account");
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
      router.push("/dashboard");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded p-6 space-y-5">
      <p className="font-mono font-bold text-xs uppercase tracking-widest text-gray-700">
        Site Preview
      </p>

      <div className="rounded overflow-hidden bg-gray-100 border border-gray-200 h-72">
        {loading ? (
          <div className="w-full h-full animate-pulse bg-gray-200" />
        ) : result ? (
          <img
            src={result.screenshotUrl}
            alt={result.pageTitle || "Your wedding site"}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-mono text-gray-400">
            No screenshot yet
          </div>
        )}
      </div>

      {!loading && result?.pageTitle && (
        <p className="text-sm font-mono text-gray-700">{result.pageTitle}</p>
      )}

      {saveError && <p className="text-red-600 text-sm font-mono">{saveError}</p>}

      <button
        onClick={handleContinue}
        className="w-full border border-gray-300 rounded py-3 text-sm font-mono text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={loading || !result || saving}
      >
        {saving ? "Saving…" : "Looks good, continue"}
      </button>
    </div>
  );
}
