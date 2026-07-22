"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { FilmStrip } from "../primitives/FilmStrip";
import { useLightbox } from "../lightbox-context";
import { dinnerPhotos } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** A slower, wide-format film strip — the table-to-table pace of dinner. */
export function Dinner({ theme }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="dinner" theme={theme} tone="paper" contained={false}>
      <SectionHeading theme={theme} eyebrow="Chapter Eight" heading="Dinner" />
      <FilmStrip
        photos={dinnerPhotos}
        theme={theme}
        onOpen={(i) => open(dinnerPhotos, i)}
        itemClassName="aspect-[3/2] w-[85vw] sm:w-[520px]"
      />
    </SectionShell>
  );
}
