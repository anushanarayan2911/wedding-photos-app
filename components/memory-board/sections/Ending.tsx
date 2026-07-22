import { SectionShell } from "../primitives/SectionShell";
import { TimelineCards } from "../primitives/TimelineCards";
import { QuoteBlock } from "../primitives/QuoteBlock";
import { Reveal } from "../primitives/Reveal";
import { dayTimeline } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
  coupleName: string;
}

/** The closing beat: the whole day, recapped in one thread, then a last word. */
export function Ending({ theme, coupleName }: Props) {
  return (
    <SectionShell id="ending" theme={theme} tone="paper" eyebrow="The Day, In Full" heading="One Thread Through It All">
      <Reveal>
        <TimelineCards events={dayTimeline} theme={theme} />
      </Reveal>

      <Reveal delay={0.1} className="mt-24 md:mt-32 pt-16 border-t" style={{ borderColor: theme.borderColor }}>
        <QuoteBlock
          theme={theme}
          quote="Thank you for being there — for the parts we planned, and especially for the parts we didn't."
          name={coupleName}
        />
      </Reveal>

      <p className="text-center text-xs uppercase tracking-[0.3em] mt-16" style={{ color: theme.mutedColor }}>
        With love, always
      </p>
    </SectionShell>
  );
}
