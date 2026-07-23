"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { FullBleedPhoto } from "../primitives/FullBleedPhoto";
import { EmptyState } from "../primitives/EmptyState";
import { Reveal } from "../primitives/Reveal";
import { useLightbox } from "../lightbox-context";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";

interface Props {
  theme: DashboardTheme;
  photos: Photo[];
}

/** Romantic, dreamy — a stack of full-bleed portraits, just the two of them. */
export function TheCouple({ theme, photos }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="couple" theme={theme} tone="paper" contained={false}>
      <SectionHeading theme={theme} eyebrow="Just the Two of Them" heading="The Couple" />
      {photos.length === 0 ? (
        <div className="max-w-5xl mx-auto px-6 md:px-10">
          <EmptyState theme={theme} message="No couple photos yet — be the first to add one." />
        </div>
      ) : (
        <div className="space-y-4">
          {photos.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.05}>
              <FullBleedPhoto photo={p} theme={theme} onOpen={() => open(photos, i)} height="h-[60vh] md:h-[85vh]" />
            </Reveal>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
