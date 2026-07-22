"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { Masonry } from "../primitives/Masonry";
import { useLightbox } from "../lightbox-context";
import { lateNightPhotos } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** Little moments — the small interactions that normally disappear once the night ends. */
export function LateNight({ theme }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="late-night" theme={theme} tone="dark" contained={false}>
      <SectionHeading theme={theme} eyebrow="Little Moments" heading="Late Night" tone="dark" />
      <div className="max-w-4xl mx-auto px-6 md:px-10 pb-4">
        <Masonry photos={lateNightPhotos} theme={theme} onOpen={(i) => open(lateNightPhotos, i)} />
      </div>
    </SectionShell>
  );
}
