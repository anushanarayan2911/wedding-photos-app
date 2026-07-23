"use client";

import { SectionShell } from "../primitives/SectionShell";
import { PolaroidStack } from "../primitives/PolaroidStack";
import { EmptyState } from "../primitives/EmptyState";
import { useLightbox } from "../lightbox-context";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";

interface Props {
  theme: DashboardTheme;
  photos: Photo[];
}

/** Intimate, playful — a tipped-out stack of polaroids for the bride's crew. */
export function TeamBride({ theme, photos }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="team-bride" theme={theme} tone="paper" eyebrow="Getting Ready" heading="Team Bride">
      {photos.length === 0 ? (
        <EmptyState theme={theme} message="No Team Bride photos yet — be the first to add one." />
      ) : (
        <PolaroidStack photos={photos} theme={theme} onOpen={(i) => open(photos, i)} />
      )}
    </SectionShell>
  );
}
