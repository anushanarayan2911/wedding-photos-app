import type { DashboardTheme } from "@/lib/dashboard-theme";
import { cn } from "@/lib/utils";

interface Props {
  quote: string;
  theme: DashboardTheme;
  name?: string;
  relation?: string;
  align?: "left" | "center";
  className?: string;
}

/** Large editorial pull-quote — the quote-first beat. */
export function QuoteBlock({ quote, theme, name, relation, align = "center", className }: Props) {
  return (
    <div className={cn("max-w-3xl mx-auto px-6", align === "center" ? "text-center" : "text-left", className)}>
      <p
        className="text-2xl md:text-4xl leading-snug"
        style={{ fontFamily: theme.h3Font, color: theme.h2Color }}
      >
        &ldquo;{quote}&rdquo;
      </p>
      {(name || relation) && (
        <p className="mt-6 text-sm uppercase tracking-[0.2em]" style={{ color: theme.mutedColor }}>
          {name}
          {relation ? ` · ${relation}` : ""}
        </p>
      )}
    </div>
  );
}
