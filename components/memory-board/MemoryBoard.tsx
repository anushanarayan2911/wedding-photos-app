"use client";

import type { RefObject } from "react";
import { LightboxProvider } from "./lightbox-context";
import { useActiveSection } from "./use-active-section";
import { ScrollProgress } from "./primitives/ScrollProgress";
import { Hero } from "./sections/Hero";
import { MorningPreparations } from "./sections/MorningPreparations";
import { FirstLook } from "./sections/FirstLook";
import { Ceremony } from "./sections/Ceremony";
import { Confetti } from "./sections/Confetti";
import { DrinksReception } from "./sections/DrinksReception";
import { CouplePortraits } from "./sections/CouplePortraits";
import { CandidMoments } from "./sections/CandidMoments";
import { Speeches } from "./sections/Speeches";
import { Dinner } from "./sections/Dinner";
import { Cake } from "./sections/Cake";
import { FirstDance } from "./sections/FirstDance";
import { EveningParty } from "./sections/EveningParty";
import { LateNight } from "./sections/LateNight";
import { FavouriteMemories } from "./sections/FavouriteMemories";
import { PhotosYouHaventSeen } from "./sections/PhotosYouHaventSeen";
import { Ending } from "./sections/Ending";
import { SECTION_META } from "./data";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { UploadedPhoto } from "./types";

interface Props {
  theme: DashboardTheme;
  coupleName: string;
  uploads: UploadedPhoto[];
  isUploading: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  mainRef: RefObject<HTMLElement | null>;
}

/** The cinematic, chronological retelling of the wedding day — the Memory Board's core experience. */
export function MemoryBoard({
  theme,
  coupleName,
  uploads,
  isUploading,
  uploadError,
  fileInputRef,
  onFiles,
  onDrop,
  mainRef,
}: Props) {
  const activeId = useActiveSection(
    SECTION_META.map((s) => s.id),
    mainRef
  );

  return (
    <LightboxProvider theme={theme}>
      <ScrollProgress theme={theme} containerRef={mainRef} activeId={activeId} />

      <Hero theme={theme} containerRef={mainRef} coupleName={coupleName} heroImg={theme.heroImg} />
      <MorningPreparations theme={theme} />
      <FirstLook theme={theme} />
      <Ceremony theme={theme} />
      <Confetti theme={theme} />
      <DrinksReception theme={theme} />
      <CouplePortraits theme={theme} />
      <CandidMoments theme={theme} />
      <Speeches theme={theme} />
      <Dinner theme={theme} />
      <Cake theme={theme} />
      <FirstDance theme={theme} />
      <EveningParty theme={theme} />
      <LateNight theme={theme} />
      <FavouriteMemories theme={theme} />
      <PhotosYouHaventSeen
        theme={theme}
        uploads={uploads}
        isUploading={isUploading}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
        onFiles={onFiles}
        onDrop={onDrop}
      />
      <Ending theme={theme} coupleName={coupleName} />
    </LightboxProvider>
  );
}
