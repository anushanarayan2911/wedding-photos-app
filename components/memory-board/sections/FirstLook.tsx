import { FullBleedPhoto } from "../primitives/FullBleedPhoto";
import { QuoteBlock } from "../primitives/QuoteBlock";
import { Reveal } from "../primitives/Reveal";
import { LightboxTrigger } from "../LightboxTrigger";
import { firstLookPhoto } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** One enormous photograph — the reveal moment, followed by a single line that says everything. */
export function FirstLook({ theme }: Props) {
  return (
    <section id="first-look" className="relative">
      <LightboxTrigger photos={[firstLookPhoto]} index={0}>
        <FullBleedPhoto theme={theme} photo={firstLookPhoto} eyebrow="Chapter Two" heading="The First Look" />
      </LightboxTrigger>
      <div className="py-16 md:py-24" style={{ backgroundColor: theme.paperBg }}>
        <Reveal>
          <QuoteBlock
            theme={theme}
            quote="Neither of us practiced what we'd say. There wasn't anything to say."
          />
        </Reveal>
      </div>
    </section>
  );
}
