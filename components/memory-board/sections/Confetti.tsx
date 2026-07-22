"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { FilmStrip } from "../primitives/FilmStrip";
import { useLightbox } from "../lightbox-context";
import { confettiPhotos } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** A fast, energetic film-strip burst — confetti in the air, everyone mid-laugh. */
export function Confetti({ theme }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="confetti" theme={theme} tone="dark" contained={false}>
      <SectionHeading theme={theme} eyebrow="Chapter Four" heading="Confetti" tone="dark" />
      <FilmStrip photos={confettiPhotos} theme={theme} onOpen={(i) => open(confettiPhotos, i)} />
    </SectionShell>
  );
}
