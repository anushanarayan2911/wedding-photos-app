"use client";

import type { RefObject } from "react";
import { SectionShell } from "../primitives/SectionShell";
import { UploadMoment } from "../primitives/UploadMoment";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { UploadedPhoto } from "../types";
import type { CategoryId } from "../categories";

interface Props {
  theme: DashboardTheme;
  uploads: UploadedPhoto[];
  isUploading: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null, category: CategoryId) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, category: CategoryId) => void;
}

/** Where the couple keeps adding to the story — the real upload flow lives here. */
export function AddPhotos({ theme, uploads, isUploading, uploadError, fileInputRef, onFiles, onDrop }: Props) {
  return (
    <SectionShell id="add-photos" theme={theme} tone="paper" eyebrow="Keep It Going" heading="Add More Memories">
      <UploadMoment
        theme={theme}
        uploads={uploads}
        isUploading={isUploading}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
        onFiles={onFiles}
        onDrop={onDrop}
      />
    </SectionShell>
  );
}
