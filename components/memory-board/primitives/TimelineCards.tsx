import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { TimelineEvent } from "../types";

interface Props {
  events: TimelineEvent[];
  theme: DashboardTheme;
}

/** Time-stamped recap cards along a vertical thread. */
export function TimelineCards({ events, theme }: Props) {
  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ backgroundColor: theme.borderColor }} />
      <div className="space-y-10">
        {events.map((e) => (
          <div key={e.time} className="relative pl-9">
            <span
              className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2"
              style={{ borderColor: theme.primaryBtnBg, backgroundColor: theme.paperBg }}
            />
            <p className="text-xs uppercase tracking-[0.2em] mb-1" style={{ color: theme.mutedColor }}>{e.time}</p>
            <h4
              className="text-lg mb-1"
              style={{ fontFamily: theme.h4Font, color: theme.h3Color, fontWeight: theme.h4FontWeight }}
            >
              {e.title}
            </h4>
            <p className="text-sm leading-relaxed" style={{ color: theme.bodyColor, opacity: 0.85 }}>{e.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
