"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { FilmStrip } from "../primitives/FilmStrip";
import { useLightbox } from "../lightbox-context";
import { candidMomentsPhotos } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/**
 * The surprise beat: while the couple posed for portraits, this is what
 * everyone else was doing. Immediately follows CouplePortraits so the
 * "meanwhile" contrast reads as one continuous idea.
 */
export function CandidMoments({ theme }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="candid-moments" theme={theme} tone="dark" contained={false}>
      <SectionHeading theme={theme} eyebrow="While You Were Taking Portraits…" heading="Meanwhile" tone="dark" />
      <FilmStrip photos={candidMomentsPhotos} theme={theme} onOpen={(i) => open(candidMomentsPhotos, i)} />
    </SectionShell>
  );
}
