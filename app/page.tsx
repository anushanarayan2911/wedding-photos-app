"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";
import StylePreview from "@/components/StylePreview";

interface FontResult {
  family: string;
  category: string;
}

interface ElementStyle {
  selector: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  fontSize?: string;
  fontWeight?: string;
}

interface KeyImage {
  url: string;
  alt?: string;
  context: string;
}

interface ExtractResult {
  backgroundColors: string[];
  textColors: string[];
  accentColors: string[];
  fonts: FontResult[];
  googleFontsLinks: string[];
  elementStyles: ElementStyle[];
  keyImages?: KeyImage[];
  pageTitle: string;
  url: string;
}

type Status = "idle" | "loading" | "success" | "error";

export default function SyncPage() {
  const [inputUrl, setInputUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/extract-styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setResult(data);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      <main className="max-w-6xl mx-auto px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left — description */}
        <div className="pt-4">
          <h1 className="text-4xl font-bold font-mono mb-12 tracking-tight">
            Sync Your Board
          </h1>

          <ol className="space-y-8">
            <Step
              number={1}
              heading="Paste your wedding website URL"
              body="We'll scan your site for design elements."
            />
            <Step
              number={2}
              heading="We detect your design language"
              body="Fonts, colors, and textures are extracted."
            />
            <Step
              number={3}
              heading="Your board auto-matches style"
              body="Everything stays perfectly on-brand."
            />
          </ol>
        </div>

        {/* Right — form + preview */}
        <div className="space-y-4">
          <form onSubmit={handleConnect} className="space-y-3">
            <label className="block text-sm text-gray-600 font-mono">
              Wedding Website URL
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://withjoy.com/sarah-and-james"
              className="w-full border border-gray-300 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-black text-white font-mono py-3 rounded hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Scanning…" : "Connect Site"}
            </button>
          </form>

          {status === "error" && (
            <p className="text-red-600 text-sm font-mono">{errorMsg}</p>
          )}

          {(status === "success" || status === "loading") && (
            <StylePreview result={result} loading={status === "loading"} />
          )}
        </div>
      </main>
    </div>
  );
}

function Step({
  number,
  heading,
  body,
}: {
  number: number;
  heading: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-sm font-mono font-bold text-gray-700">
        {number}
      </span>
      <div>
        <p className="font-mono font-bold text-gray-900">{heading}</p>
        <p className="text-sm text-gray-500 mt-0.5">{body}</p>
      </div>
    </li>
  );
}
