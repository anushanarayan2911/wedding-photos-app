import type { RefObject } from "react";
import { UploadIcon } from "../icons";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { UploadedPhoto } from "../types";

/** Relative time like "5m ago" / "2h ago" / "3d ago" for an upload timestamp. */
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

interface Props {
  theme: DashboardTheme;
  uploads: UploadedPhoto[];
  isUploading: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

/** The real guest-upload flow, restyled to sit inside the narrative instead of a bare grid. */
export function UploadMoment({ theme, uploads, isUploading, uploadError, fileInputRef, onFiles, onDrop }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: theme.mutedColor }}>
            Add your memories
          </p>
          <h3
            className="text-2xl md:text-3xl"
            style={{ fontFamily: theme.h3Font, color: theme.h2Color, fontWeight: theme.h3FontWeight }}
          >
            The moments only you caught
          </h3>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-5 py-3 text-xs uppercase tracking-widest rounded-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
          style={{ backgroundColor: theme.primaryBtnBg, color: theme.primaryBtnText }}
        >
          <UploadIcon className="w-3.5 h-3.5" />
          {isUploading ? "Uploading…" : "Upload photos"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {uploadError && <p className="text-sm mb-6" style={{ color: "#c0392b" }}>{uploadError}</p>}

      {uploads.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-sm border border-dashed py-16 flex items-center justify-center text-sm cursor-pointer"
          style={{ borderColor: theme.borderColor, color: theme.mutedColor }}
        >
          Drag photos here, or click to add them to the story
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
        >
          {uploads.map((p) => (
            <div
              key={p.url}
              className="relative aspect-square rounded-sm overflow-hidden group"
              style={{ border: `1px solid ${theme.borderColor}` }}
            >
              <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
              <span className="absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-sm bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {formatRelativeTime(p.uploadedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
