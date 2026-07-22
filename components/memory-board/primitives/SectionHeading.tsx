import type { DashboardTheme } from "@/lib/dashboard-theme";
import { cn } from "@/lib/utils";

interface Props {
  theme: DashboardTheme;
  eyebrow?: string;
  heading: string;
  className?: string;
  /** Must match the parent SectionShell's tone — picks WCAG-checked colors for that background instead of assuming a light paper surface. */
  tone?: "paper" | "dark" | "transparent";
}

/** Standalone eyebrow + heading block for full-bleed sections that skip SectionShell's contained wrapper. */
export function SectionHeading({ theme, eyebrow, heading, className, tone = "paper" }: Props) {
  const eyebrowColor = tone === "dark" ? theme.navColor : theme.mutedColor;
  const headingColor = tone === "dark" ? theme.navColor : theme.h2Color;

  return (
    <div className={cn("max-w-3xl mx-auto px-6 text-center pt-20 md:pt-28 pb-10 md:pb-14", className)}>
      {eyebrow && (
        <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: eyebrowColor }}>
          {eyebrow}
        </p>
      )}
      <h2
        className="text-3xl md:text-5xl"
        style={{ fontFamily: theme.h2Font, color: headingColor, fontWeight: theme.h2FontWeight }}
      >
        {heading}
      </h2>
    </div>
  );
}
