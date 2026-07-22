import { SectionShell } from "../primitives/SectionShell";
import { QuoteBlock } from "../primitives/QuoteBlock";
import { PhotoFrame } from "../primitives/PhotoFrame";
import { Reveal } from "../primitives/Reveal";
import { LightboxTrigger } from "../LightboxTrigger";
import { speechesPhoto, speechQuote } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** Quote-first: the words come before the image. */
export function Speeches({ theme }: Props) {
  return (
    <SectionShell id="speeches" theme={theme} tone="paper" eyebrow="Chapter Seven" heading="Speeches">
      <Reveal>
        <QuoteBlock theme={theme} quote={speechQuote.quote} name={speechQuote.name} relation={speechQuote.relation} />
      </Reveal>
      <Reveal delay={0.15} className="max-w-sm mx-auto mt-14">
        <LightboxTrigger photos={[speechesPhoto]} index={0}>
          <PhotoFrame photo={speechesPhoto} theme={theme} className="aspect-[4/5] rounded-sm" />
        </LightboxTrigger>
      </Reveal>
    </SectionShell>
  );
}
