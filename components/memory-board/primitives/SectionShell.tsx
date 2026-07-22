import type { ReactNode } from "react";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  theme: DashboardTheme;
  eyebrow?: string;
  heading?: string;
  tone?: "paper" | "dark" | "transparent";
  contained?: boolean;
  children: ReactNode;
  className?: string;
}

/** Shared section wrapper: anchors the id used by the progress rail, paints a tone, and optionally centers a heading above the content. */
export function SectionShell({ id, theme, eyebrow, heading, tone = "paper", contained = true, children, className }: Props) {
  const bg = tone === "dark" ? theme.sidebarBg : tone === "paper" ? theme.paperBg : "transparent";
  const textColor = tone === "dark" ? theme.navColor : theme.bodyColor;

  return (
    <section id={id} className={cn("relative", className)} style={{ backgroundColor: bg, color: textColor }}>
      <div className={contained ? "max-w-5xl mx-auto px-6 md:px-10 py-24 md:py-32" : undefined}>
        {(eyebrow || heading) && (
          <div className="mb-12 md:mb-16 text-center">
            {eyebrow && (
              <p
                className="text-xs tracking-[0.3em] uppercase mb-3"
                style={{ color: theme.mutedColor, fontFamily: theme.bodyFontResolved }}
              >
                {eyebrow}
              </p>
            )}
            {heading && (
              <h2
                className="text-3xl md:text-5xl"
                style={{ fontFamily: theme.h2Font, color: theme.h2Color, fontWeight: theme.h2FontWeight }}
              >
                {heading}
              </h2>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
