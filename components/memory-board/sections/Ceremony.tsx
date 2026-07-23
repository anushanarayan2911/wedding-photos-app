"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { FullBleedPhoto } from "../primitives/FullBleedPhoto";
import { Masonry } from "../primitives/Masonry";
import { EmptyState } from "../primitives/EmptyState";
import { Reveal } from "../primitives/Reveal";
import { useLightbox } from "../lightbox-context";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";

interface Props {
  theme: DashboardTheme;
  photos: Photo[];
}

/** Formal, cinematic — one enormous photo of the vow, then the rest of the room in a collage. */
export function Ceremony({ theme, photos }: Props) {
  const { open } = useLightbox();
  const [featured, ...rest] = photos;

  return (
    <SectionShell id="ceremony" theme={theme} tone="paper" contained={false}>
      <SectionHeading theme={theme} eyebrow="The Ceremony" heading={'"I Do."'} />
      {!featured ? (
        <div className="max-w-5xl mx-auto px-6 md:px-10">
          <EmptyState theme={theme} message="No ceremony photos yet — be the first to add one." />
        </div>
      ) : (
        <>
          <Reveal>
            <FullBleedPhoto photo={featured} theme={theme} onOpen={() => open(photos, 0)} height="h-[70vh]" />
          </Reveal>
          {rest.length > 0 && (
            <div className="max-w-5xl mx-auto px-6 md:px-10 mt-14">
              <Masonry photos={rest} theme={theme} onOpen={(i) => open(photos, i + 1)} />
            </div>
          )}
        </>
      )}
    </SectionShell>
  );
}
