"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { FilmStrip } from "../primitives/FilmStrip";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { KeyImage } from "@/lib/theme";
import type { Photo } from "../types";

interface Props {
  theme: DashboardTheme;
  coupleName: string;
  galleryImgs: KeyImage[];
}

/**
 * The landing page's second fold — most wedding sites follow their hero with a
 * strip of the couple's own photos before getting into the day's story. Recreates
 * that beat using real images pulled from the linked site (heroImg's runner-ups),
 * which otherwise went unused once a single hero shot was chosen.
 */
export function Welcome({ theme, coupleName, galleryImgs }: Props) {
  if (galleryImgs.length === 0) return null;

  const photos: Photo[] = galleryImgs.slice(0, 8).map((img, i) => ({
    id: `gallery-${i}`,
    src: img.url,
    alt: img.alt || coupleName,
  }));

  return (
    <SectionShell id="welcome" theme={theme} tone="paper" contained={false} className="py-20 md:py-28">
      {theme.decorativeImgs[0] && (
        <img
          src={theme.decorativeImgs[0].url}
          alt=""
          aria-hidden
          className="w-16 h-16 object-contain mx-auto mb-2 pointer-events-none select-none"
          style={{ opacity: 0.5 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <SectionHeading
        theme={theme}
        eyebrow="Welcome"
        heading="A Board For Every Moment"
        className="pt-0 pb-12 md:pb-16"
      />
      <FilmStrip photos={photos} theme={theme} />
    </SectionShell>
  );
}
