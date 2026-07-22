"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { PolaroidStack } from "../primitives/PolaroidStack";
import { useLightbox } from "../lightbox-context";
import { couplePortraitPhotos } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** An overlapping stack of the formal portraits, tipped out like polaroids from an envelope. */
export function CouplePortraits({ theme }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="couple-portraits" theme={theme} tone="paper" contained={false}>
      <SectionHeading theme={theme} eyebrow="Chapter Six" heading="Couple Portraits" />
      <PolaroidStack photos={couplePortraitPhotos} theme={theme} onOpen={(i) => open(couplePortraitPhotos, i)} />
    </SectionShell>
  );
}
