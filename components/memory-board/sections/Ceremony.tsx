import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { SplitScreen } from "../primitives/SplitScreen";
import { PhotoFrame } from "../primitives/PhotoFrame";
import { QuoteBlock } from "../primitives/QuoteBlock";
import { Reveal } from "../primitives/Reveal";
import { LightboxTrigger } from "../LightboxTrigger";
import { ceremonyPhotos, ceremonyGuestQuotes } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** Split-screen: the vow, and the room reacting to it. */
export function Ceremony({ theme }: Props) {
  return (
    <SectionShell id="ceremony" theme={theme} tone="paper" contained={false}>
      <SectionHeading theme={theme} eyebrow="Chapter Three" heading="The Ceremony" />
      <Reveal>
        <SplitScreen
          left={
            <LightboxTrigger photos={ceremonyPhotos} index={1}>
              <PhotoFrame photo={ceremonyPhotos[1]} theme={theme} className="h-[55vh] md:h-[75vh]" />
            </LightboxTrigger>
          }
          right={
            <div className="flex flex-col justify-center gap-10 px-8 md:px-14 py-14" style={{ backgroundColor: theme.paperBg }}>
              {ceremonyGuestQuotes.map((q) => (
                <QuoteBlock key={q.name} theme={theme} align="left" quote={q.quote} name={q.name} relation={q.relation} className="max-w-none px-0" />
              ))}
            </div>
          }
        />
      </Reveal>
      <div className="max-w-xs mx-auto mt-1">
        <LightboxTrigger photos={ceremonyPhotos} index={0}>
          <PhotoFrame photo={ceremonyPhotos[0]} theme={theme} className="aspect-square" />
        </LightboxTrigger>
      </div>
    </SectionShell>
  );
}
