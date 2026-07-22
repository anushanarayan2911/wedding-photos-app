"use client";

import { FullBleedPhoto } from "../primitives/FullBleedPhoto";
import { PlayIcon } from "../icons";
import { useLightbox } from "../lightbox-context";
import { firstDancePhoto } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/**
 * Full-screen video-style moment. No real video asset exists yet, so this is
 * honest about it: a poster frame with a play affordance that opens the
 * still in the lightbox rather than faking playback.
 */
export function FirstDance({ theme }: Props) {
  const { open } = useLightbox();

  return (
    <section id="first-dance" className="relative">
      <FullBleedPhoto
        theme={theme}
        photo={firstDancePhoto}
        eyebrow="Chapter Ten"
        heading="The First Dance"
        caption="Filmed by a guest, three tables back."
        height="h-screen"
        onOpen={() => open([firstDancePhoto], 0)}
      />
      <button
        onClick={() => open([firstDancePhoto], 0)}
        aria-label="Play guest video"
        className="absolute inset-0 flex items-center justify-center"
      >
        <span className="w-20 h-20 rounded-full flex items-center justify-center bg-white/90 hover:bg-white transition-colors">
          <PlayIcon className="w-8 h-8 text-black translate-x-0.5" />
        </span>
      </button>
    </section>
  );
}
