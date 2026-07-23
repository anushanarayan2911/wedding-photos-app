"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { FilmStrip } from "../primitives/FilmStrip";
import { EmptyState } from "../primitives/EmptyState";
import { useLightbox } from "../lightbox-context";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";

interface Props {
  theme: DashboardTheme;
  photos: Photo[];
}

/** Candid, casual — a fast horizontal scroll for the groom's crew. */
export function TeamGroom({ theme, photos }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="team-groom" theme={theme} tone="dark" contained={false}>
      <SectionHeading theme={theme} eyebrow="Getting Ready" heading="Team Groom" tone="dark" />
      {photos.length === 0 ? (
        <div className="max-w-5xl mx-auto px-6 md:px-10">
          <EmptyState theme={theme} message="No Team Groom photos yet — be the first to add one." />
        </div>
      ) : (
        <FilmStrip photos={photos} theme={theme} onOpen={(i) => open(photos, i)} />
      )}
    </SectionShell>
  );
}
