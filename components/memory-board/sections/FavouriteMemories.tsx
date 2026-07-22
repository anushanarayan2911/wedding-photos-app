"use client";

import { SectionShell } from "../primitives/SectionShell";
import { StoryCard } from "../primitives/StoryCard";
import { RevealStagger, RevealStaggerItem } from "../primitives/RevealStagger";
import { useLightbox } from "../lightbox-context";
import { favouriteMemories } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
}

/** Guest-submitted "favourite memory" cards — short stories that would otherwise never get told. */
export function FavouriteMemories({ theme }: Props) {
  const { open } = useLightbox();
  const photos = favouriteMemories.map((m) => m.photo);

  return (
    <SectionShell
      id="favourite-memories"
      theme={theme}
      tone="paper"
      eyebrow="From The Guest List"
      heading="Favourite Memories"
    >
      <RevealStagger className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {favouriteMemories.map((memory, i) => (
          <RevealStaggerItem key={memory.name}>
            <StoryCard memory={memory} theme={theme} onOpen={() => open(photos, i)} />
          </RevealStaggerItem>
        ))}
      </RevealStagger>
    </SectionShell>
  );
}
