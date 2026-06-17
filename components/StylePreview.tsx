interface FontResult {
  family: string;
  category: string;
}

interface ExtractResult {
  colors: string[];
  fonts: FontResult[];
  url: string;
}

interface Props {
  result: ExtractResult | null;
  loading: boolean;
}

export default function StylePreview({ result, loading }: Props) {
  return (
    <div className="border border-gray-200 rounded p-6 space-y-5">
      <p className="font-mono font-bold text-xs uppercase tracking-widest text-gray-700">
        Style Preview
      </p>

      <div>
        <p className="text-xs font-mono text-gray-500 mb-3">
          Colors, fonts &amp; patterns detected:
        </p>

        {/* Color swatches */}
        <div className="flex flex-wrap gap-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded bg-gray-200 animate-pulse"
                />
              ))
            : result && result.colors.length > 0
            ? result.colors.map((color, i) => (
                <ColorSwatch key={i} color={color} />
              ))
            : Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-10 h-10 rounded bg-gray-200" />
              ))}
        </div>
      </div>

      {/* Font display */}
      <div className="border border-gray-200 rounded px-4 py-3">
        {loading ? (
          <div className="h-4 bg-gray-200 rounded animate-pulse w-40" />
        ) : result && result.fonts.length > 0 ? (
          <div className="space-y-1">
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

      <button
        className="w-full border border-gray-300 rounded py-3 text-sm font-mono text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
        disabled={loading || !result}
      >
        Looks good, continue
      </button>
    </div>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <div className="group relative">
      <div
        className="w-10 h-10 rounded border border-gray-200"
        style={{ backgroundColor: color }}
      />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-mono">
        {color}
      </span>
    </div>
  );
}
