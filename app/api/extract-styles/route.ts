import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface ExtractedStyles {
  colors: string[];
  fonts: { family: string; category: string }[];
  url: string;
}

function parseColorsFromCss(css: string): string[] {
  const colorPatterns = [
    /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g,
    /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g,
    /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g,
    /hsl\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*\)/g,
  ];

  const found = new Set<string>();
  for (const pattern of colorPatterns) {
    const matches = css.match(pattern) ?? [];
    for (const m of matches) {
      const normalized = m.toLowerCase().trim();
      // Skip pure black/white/transparent noise
      if (
        normalized === "#000" ||
        normalized === "#000000" ||
        normalized === "#fff" ||
        normalized === "#ffffff" ||
        normalized === "rgb(0,0,0)" ||
        normalized === "rgb(255,255,255)"
      )
        continue;
      found.add(normalized);
    }
  }
  return Array.from(found).slice(0, 8);
}

function parseFontsFromCss(css: string): { family: string; category: string }[] {
  const found = new Map<string, string>();

  // font-family declarations
  const fontFamilyRe = /font-family\s*:\s*([^;}{]+)/gi;
  let match;
  while ((match = fontFamilyRe.exec(css)) !== null) {
    const raw = match[1].trim();
    // Take the first font in a stack
    const first = raw.split(",")[0].replace(/['"]/g, "").trim();
    if (!first || first.toLowerCase() === "inherit" || first.toLowerCase() === "initial") continue;
    const category = categoriseFont(first);
    found.set(first, category);
  }

  // @import Google Fonts URLs
  const importRe = /family=([^&"')]+)/g;
  while ((match = importRe.exec(css)) !== null) {
    const families = decodeURIComponent(match[1]).split("|");
    for (const f of families) {
      const name = f.split(":")[0].replace(/\+/g, " ").trim();
      if (name) found.set(name, categoriseFont(name));
    }
  }

  return Array.from(found.entries())
    .map(([family, category]) => ({ family, category }))
    .slice(0, 4);
}

function categoriseFont(name: string): string {
  const lower = name.toLowerCase();
  const serif = ["serif", "times", "georgia", "garamond", "baskerville", "palatino", "playfair", "cormorant", "libre baskerville", "crimson", "merriweather", "lora"];
  const mono = ["mono", "code", "courier", "consolas", "fira", "source code", "roboto mono"];
  const display = ["display", "headline", "poster", "abril", "lobster", "pacifico", "dancing", "great vibes", "sacramento"];
  if (display.some((d) => lower.includes(d))) return "Display";
  if (mono.some((m) => lower.includes(m))) return "Monospace";
  if (serif.some((s) => lower.includes(s))) return "Serif";
  return "Sans-serif";
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Memoboard/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = await req.json();
    url = body.url?.trim();
    if (!url) throw new Error("Missing url");
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    new URL(url); // validate
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const html = await fetchText(url);
    const $ = cheerio.load(html);

    const cssChunks: string[] = [];

    // Collect inline <style> blocks
    $("style").each((_, el) => {
      cssChunks.push($(el).text());
    });

    // Collect external stylesheets (same origin or absolute)
    const sheetUrls: string[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      try {
        sheetUrls.push(new URL(href, url).toString());
      } catch {
        // skip malformed
      }
    });

    // Fetch up to 5 external sheets in parallel
    const sheetTexts = await Promise.allSettled(
      sheetUrls.slice(0, 5).map(fetchText)
    );
    for (const result of sheetTexts) {
      if (result.status === "fulfilled") cssChunks.push(result.value);
    }

    const allCss = cssChunks.join("\n");

    const colors = parseColorsFromCss(allCss);
    const fonts = parseFontsFromCss(allCss);

    // Fallback: check <meta> theme-color
    const themeColor = $('meta[name="theme-color"]').attr("content");
    if (themeColor && !colors.includes(themeColor.toLowerCase())) {
      colors.unshift(themeColor);
    }

    const result: ExtractedStyles = { colors, fonts, url };
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
