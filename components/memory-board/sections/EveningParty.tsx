"use client";

import { SectionShell } from "../primitives/SectionShell";
import { SectionHeading } from "../primitives/SectionHeading";
import { PolaroidStack } from "../primitives/PolaroidStack";
import { useLightbox } from "../lightbox-context";
import { eveningPartyPhotos } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** Through your guests' eyes — the dance floor, seen from a dozen different phones. */
export function EveningParty({ theme }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell id="evening-party" theme={theme} tone="dark" contained={false}>
      <SectionHeading theme={theme} eyebrow="Through Your Guests' Eyes" heading="The Evening Party" tone="dark" />
      <PolaroidStack photos={eveningPartyPhotos} theme={theme} onOpen={(i) => open(eveningPartyPhotos, i)} />
    </SectionShell>
  );
}
