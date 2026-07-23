"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { Masonry } from "../primitives/Masonry";
import { EmptyState } from "../primitives/EmptyState";
import { useLightbox } from "../lightbox-context";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";

interface Props {
  theme: DashboardTheme;
  photos: Photo[];
}

/** Energetic, chaotic-fun — a dense collage for the dance floor and everything after. */
export function TheParty({ theme, photos }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="party" theme={theme} tone="dark" contained={false}>
      <SectionHeading theme={theme} eyebrow="Dance Floor & Beyond" heading="The Party" tone="dark" />
      <div className="max-w-5xl mx-auto px-6 md:px-10 pb-4">
        {photos.length === 0 ? (
          <EmptyState theme={theme} message="No party photos yet — be the first to add one." />
        ) : (
          <Masonry photos={photos} theme={theme} onOpen={(i) => open(photos, i)} />
        )}
      </div>
    </SectionShell>
  );
}
