"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { Masonry } from "../primitives/Masonry";
import { QuoteBlock } from "../primitives/QuoteBlock";
import { Reveal } from "../primitives/Reveal";
import { useLightbox } from "../lightbox-context";
import { drinksReceptionPhotos, receptionGuestQuotes } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** Masonry collage of the reception, threaded through with overheard guest lines. */
export function DrinksReception({ theme }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="drinks-reception" theme={theme} tone="paper" contained={false}>
      <SectionHeading theme={theme} eyebrow="Chapter Five" heading="Drinks Reception" />
      <div className="max-w-5xl mx-auto px-6 md:px-10">
        <Masonry photos={drinksReceptionPhotos} theme={theme} onOpen={(i) => open(drinksReceptionPhotos, i)} />
        <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-14">
          {receptionGuestQuotes.map((q) => (
            <QuoteBlock key={q.name} theme={theme} align="left" quote={q.quote} name={q.name} relation={q.relation} className="max-w-none px-0" />
          ))}
        </Reveal>
      </div>
    </SectionShell>
  );
}
