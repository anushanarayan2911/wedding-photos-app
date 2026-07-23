"use client";

import { useState, type RefObject } from "react";
import { UploadIcon } from "../icons";
import { CATEGORIES, type CategoryId } from "../categories";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { UploadedPhoto } from "../types";
import { cn } from "@/lib/utils";

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
  onFiles: (files: FileList | null, category: CategoryId) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, category: CategoryId) => void;
}

/** The real upload flow, restyled to sit inside the narrative — tag a category, then add photos to it. */
export function UploadMoment({ theme, uploads, isUploading, uploadError, fileInputRef, onFiles, onDrop }: Props) {
  const [category, setCategory] = useState<CategoryId>(CATEGORIES[0].id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: theme.mutedColor }}>
            Add your memories
          </p>
          <h3
            className="text-2xl md:text-3xl"
            style={{ fontFamily: theme.h3Font, color: theme.h2Color, fontWeight: theme.h3FontWeight }}
          >
            Tag it, then add it to the story
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
          onChange={(e) => { onFiles(e.target.files, category); e.target.value = ""; }}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className="px-4 py-2 text-xs uppercase tracking-widest rounded-sm border transition-colors"
            style={
              category === c.id
                ? { backgroundColor: theme.primaryBtnBg, color: theme.primaryBtnText, borderColor: theme.primaryBtnBg }
                : { color: theme.mutedColor, borderColor: theme.borderColor }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {uploadError && <p className="text-sm mb-6" style={{ color: "#c0392b" }}>{uploadError}</p>}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(e, category)}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "rounded-sm border border-dashed py-16 flex items-center justify-center text-sm cursor-pointer",
          uploads.length > 0 && "mb-6"
        )}
        style={{ borderColor: theme.borderColor, color: theme.mutedColor }}
      >
        Drag photos here, or click to tag them "{CATEGORIES.find((c) => c.id === category)!.label}" and add them to the story
      </div>

      {uploads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {uploads.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square rounded-sm overflow-hidden group"
              style={{ border: `1px solid ${theme.borderColor}` }}
            >
              <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
              <span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-sm bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {CATEGORIES.find((c) => c.id === p.category)?.label ?? p.category}
              </span>
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
