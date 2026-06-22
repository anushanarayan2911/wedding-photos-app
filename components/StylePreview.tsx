"use client";

import { useRouter } from "next/navigation";
import { SESSION_KEY } from "@/lib/theme";

interface FontResult {
  family: string;
  category: string;
}

interface ElementStyle {
  selector: string;
  fontFamily?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
}

interface ExtractResult {
  backgroundColors: string[];
  textColors: string[];
  accentColors: string[];
  fonts: FontResult[];
  googleFontsLinks: string[];
  elementStyles: ElementStyle[];
  pageTitle: string;
  url: string;
}

interface Props {
  result: ExtractResult | null;
  loading: boolean;
}

export default function StylePreview({ result, loading }: Props) {
  const router = useRouter();
  const hasResult = result && (
    result.backgroundColors.length > 0 ||
    result.textColors.length > 0 ||
    result.accentColors.length > 0
  );

  function handleContinue() {
    if (!result) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
    router.push("/dashboard");
  }

  return (
    <div className="border border-gray-200 rounded p-6 space-y-5">
      <p className="font-mono font-bold text-xs uppercase tracking-widest text-gray-700">
        Style Preview
      </p>

      <SwatchRow label="Background" colors={result?.backgroundColors ?? []} loading={loading} placeholderCount={4} />
      <SwatchRow label="Text" colors={result?.textColors ?? []} loading={loading} placeholderCount={3} />
      <SwatchRow label="UI / Accent" colors={result?.accentColors ?? []} loading={loading} placeholderCount={2} />

      {/* Fonts */}
      <div className="border border-gray-200 rounded px-4 py-3">
        <p className="text-xs font-mono text-gray-400 mb-2 uppercase tracking-wide">Fonts</p>
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-44" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
          </div>
        ) : result && result.fonts.length > 0 ? (
          <div className="space-y-1.5">
            {result.fonts.map((f, i) => (
              <p key={i} className="text-sm font-mono text-gray-700">
                {f.family}
                <span className="text-gray-400"> · {f.category}</span>
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm font-mono text-gray-400">No fonts detected</p>
        )}
      </div>

      {/* Typography (element-level styles) */}
      <div className="border border-gray-200 rounded px-4 py-3">
        <p className="text-xs font-mono text-gray-400 mb-2 uppercase tracking-wide">Typography</p>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
            ))}
          </div>
        ) : result && result.elementStyles?.length > 0 ? (
          <div className="space-y-2">
            {result.elementStyles.map((el, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-gray-500 w-8 flex-shrink-0 uppercase">
                  {el.selector}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {el.fontFamily && (
                    <span className="text-xs font-mono text-gray-700">{el.fontFamily}</span>
                  )}
                  {el.fontSize && (
                    <span className="text-xs font-mono text-gray-400">{el.fontSize}</span>
                  )}
                  {el.fontWeight && (
                    <span className="text-xs font-mono text-gray-400">{el.fontWeight}</span>
                  )}
                  {el.color && (
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block w-3 h-3 rounded-sm border border-gray-200 flex-shrink-0"
                        style={{ backgroundColor: el.color }}
                      />
                      <span className="text-xs font-mono text-gray-400">{el.color}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-mono text-gray-400">No element styles detected</p>
        )}
      </div>

      <button
        onClick={handleContinue}
        className="w-full border border-gray-300 rounded py-3 text-sm font-mono text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={loading || !hasResult}
      >
        Looks good, continue
      </button>
    </div>
  );
}

function SwatchRow({
  label,
  colors,
  loading,
  placeholderCount,
}: {
  label: string;
  colors: string[];
  loading: boolean;
  placeholderCount: number;
}) {
  return (
    <div>
      <p className="text-xs font-mono text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-2">
        {loading
          ? Array.from({ length: placeholderCount }).map((_, i) => (
              <div key={i} className="w-10 h-10 rounded bg-gray-200 animate-pulse" />
            ))
          : colors.length > 0
          ? colors.map((color, i) => <ColorSwatch key={i} color={color} />)
          : Array.from({ length: placeholderCount }).map((_, i) => (
              <div key={i} className="w-10 h-10 rounded bg-gray-100" />
            ))}
      </div>
    </div>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <div className="group relative">
      <div
        className="w-10 h-10 rounded border border-gray-200 shadow-sm"
        style={{ backgroundColor: color }}
      />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-mono z-10">
        {color}
      </span>
    </div>
  );
}
