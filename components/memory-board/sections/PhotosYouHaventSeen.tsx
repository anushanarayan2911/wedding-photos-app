"use client";

import type { RefObject } from "react";
import { SectionShell } from "../primitives/SectionShell";
import { Masonry } from "../primitives/Masonry";
import { UploadMoment } from "../primitives/UploadMoment";
import { Reveal } from "../primitives/Reveal";
import { useLightbox } from "../lightbox-context";
import { unseenPhotos } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { UploadedPhoto } from "../types";

interface Props {
  theme: DashboardTheme;
  uploads: UploadedPhoto[];
  isUploading: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

/** Resurfaced overlooked uploads, and the real place guests add their own — this is where the actual upload flow lives. */
export function PhotosYouHaventSeen({ theme, uploads, isUploading, uploadError, fileInputRef, onFiles, onDrop }: Props) {
  const { open } = useLightbox();

  return (
    <SectionShell
      id="unseen-photos"
      theme={theme}
      tone="paper"
      eyebrow="Chapter Thirteen"
      heading="Photos You Haven't Seen Before"
    >
      <Reveal className="mb-16">
        <Masonry photos={unseenPhotos} theme={theme} onOpen={(i) => open(unseenPhotos, i)} />
      </Reveal>

      <div className="pt-10 border-t" style={{ borderColor: theme.borderColor }}>
        <UploadMoment
          theme={theme}
          uploads={uploads}
          isUploading={isUploading}
          uploadError={uploadError}
          fileInputRef={fileInputRef}
          onFiles={onFiles}
          onDrop={onDrop}
        />
      </div>
    </SectionShell>
  );
}
