import { FullBleedPhoto } from "../primitives/FullBleedPhoto";
import { LightboxTrigger } from "../LightboxTrigger";
import { cakePhoto } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** One enormous photograph — no text competing with it beyond a caption. */
export function Cake({ theme }: Props) {
  return (
    <section id="cake" className="relative">
      <LightboxTrigger photos={[cakePhoto]} index={0}>
        <FullBleedPhoto theme={theme} photo={cakePhoto} eyebrow="Chapter Nine" heading="The Cake" height="h-[70vh]" />
      </LightboxTrigger>
    </section>
  );
}
