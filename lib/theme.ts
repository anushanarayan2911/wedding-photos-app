export interface ElementStyle {
  selector: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  fontSize?: string;
  fontWeight?: string;
}

export interface KeyImage {
  url: string;
  alt?: string;
  context: string;
}

export interface ExtractedStyles {
  backgroundColors: string[];
  textColors: string[];
  accentColors: string[];
  fonts: { family: string; category: string }[];
  googleFontsLinks: string[];
  elementStyles: ElementStyle[];
  keyImages?: KeyImage[];
  pageTitle: string;
  url: string;
}

// ── Colour utilities ──────────────────────────────────────────────────────────

function colorToRgb(color: string): [number, number, number] | null {
  const h3 = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (h3) return [parseInt(h3[1] + h3[1], 16), parseInt(h3[2] + h3[2], 16), parseInt(h3[3] + h3[3], 16)];
  const h6 = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (h6) return [parseInt(h6[1], 16), parseInt(h6[2], 16), parseInt(h6[3], 16)];
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return [parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3])];
  return null;
}

export function getLuminance(color: string): number {
  const rgb = colorToRgb(color);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((c) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isLight(color: string): boolean {
  return getLuminance(color) > 0.5;
}

export function withOpacity(color: string, opacity: number): string {
  const rgb = colorToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
}

export const SESSION_KEY = "memoboard_styles";
