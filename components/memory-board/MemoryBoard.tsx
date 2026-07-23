"use client";

import type { RefObject } from "react";
import { LightboxProvider } from "./lightbox-context";
import { useActiveSection } from "./use-active-section";
import { ScrollProgress } from "./primitives/ScrollProgress";
import { Hero } from "./sections/Hero";
import { TeamBride } from "./sections/TeamBride";
import { TeamGroom } from "./sections/TeamGroom";
import { Ceremony } from "./sections/Ceremony";
import { TheCouple } from "./sections/TheCouple";
import { TheParty } from "./sections/TheParty";
import { AddPhotos } from "./sections/AddPhotos";
import { Ending } from "./sections/Ending";
import { SECTION_META } from "./data";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { UploadedPhoto, Photo } from "./types";
import type { CategoryId } from "./categories";

interface Props {
  theme: DashboardTheme;
  coupleName: string;
  uploads: UploadedPhoto[];
  isUploading: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null, category: CategoryId) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, category: CategoryId) => void;
  mainRef: RefObject<HTMLElement | null>;
}

function toPhoto(u: UploadedPhoto): Photo {
  return { id: u.id, src: u.url, alt: u.name };
}

function byCategory(uploads: UploadedPhoto[], category: CategoryId): Photo[] {
  return uploads.filter((u) => u.category === category).map(toPhoto);
}

/** The cinematic retelling of the wedding day, grouped by who it's about — the Memory Board's core experience. */
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

      {/* Plain block wrapper: `main`'s flex layout would otherwise treat each
          section below as a flex item and shrink Hero's h-screen to 0 once
          total content height exceeds the viewport. */}
      <div>
        <Hero theme={theme} containerRef={mainRef} coupleName={coupleName} heroImg={theme.heroImg} />
        <TeamBride theme={theme} photos={byCategory(uploads, "team-bride")} />
        <TeamGroom theme={theme} photos={byCategory(uploads, "team-groom")} />
        <Ceremony theme={theme} photos={byCategory(uploads, "ceremony")} />
        <TheCouple theme={theme} photos={byCategory(uploads, "couple")} />
        <TheParty theme={theme} photos={byCategory(uploads, "party")} />
        <AddPhotos
          theme={theme}
          uploads={uploads}
          isUploading={isUploading}
          uploadError={uploadError}
          fileInputRef={fileInputRef}
          onFiles={onFiles}
          onDrop={onDrop}
        />
        <Ending theme={theme} coupleName={coupleName} />
      </div>
    </LightboxProvider>
  );
}
