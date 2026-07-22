import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { Reveal } from "../primitives/Reveal";
import { SplitScreen } from "../primitives/SplitScreen";
import { PhotoFrame } from "../primitives/PhotoFrame";
import { morningPrepPhotos } from "../data";
import { LightboxTrigger } from "../LightboxTrigger";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** Split-screen: two houses getting ready at once. */
export function MorningPreparations({ theme }: Props) {
  return (
    <SectionShell id="morning-preparations" theme={theme} tone="paper" contained={false}>
      <SectionHeading theme={theme} eyebrow="Chapter One" heading="Morning Preparations" />
      <Reveal>
        <SplitScreen
          left={
            <LightboxTrigger photos={morningPrepPhotos} index={0}>
              <PhotoFrame photo={morningPrepPhotos[0]} theme={theme} className="h-[55vh] md:h-[75vh]" />
            </LightboxTrigger>
          }
          right={
            <LightboxTrigger photos={morningPrepPhotos} index={1}>
              <PhotoFrame photo={morningPrepPhotos[1]} theme={theme} className="h-[55vh] md:h-[75vh]" />
            </LightboxTrigger>
          }
        />
      </Reveal>
      <Reveal delay={0.1} className="grid grid-cols-2 gap-1 mt-1">
        <LightboxTrigger photos={morningPrepPhotos} index={2}>
          <PhotoFrame photo={morningPrepPhotos[2]} theme={theme} className="h-[38vh]" />
        </LightboxTrigger>
        <LightboxTrigger photos={morningPrepPhotos} index={3}>
          <PhotoFrame photo={morningPrepPhotos[3]} theme={theme} className="h-[38vh]" />
        </LightboxTrigger>
      </Reveal>
    </SectionShell>
  );
}
