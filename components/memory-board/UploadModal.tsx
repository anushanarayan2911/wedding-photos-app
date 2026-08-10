"use client";

import { useState, type RefObject } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UploadIcon } from "./icons";
import { CATEGORIES, type CategoryId } from "./categories";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { UploadedPhoto } from "./types";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploads: UploadedPhoto[];
  isUploading: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null, category: CategoryId) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, category: CategoryId) => void;
}

/** Sidebar-triggered upload flow: tag a category, then drop or pick photos to add to the story. */
export function UploadModal({
  theme,
  open,
  onOpenChange,
  uploads,
  isUploading,
  uploadError,
  fileInputRef,
  onFiles,
  onDrop,
}: Props) {
  const [category, setCategory] = useState<CategoryId>(CATEGORIES[0].id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Upload photos" description="Add photos to your Memory Board">
        <div
          className="mx-auto w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-sm p-8"
          style={{ backgroundColor: theme.contrastBg, color: theme.bodyColor }}
        >
          <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: theme.mutedColor }}>
            Add your memories
          </p>
          <h3
            className="text-2xl md:text-3xl mb-6"
            style={{ fontFamily: theme.h3Font, color: theme.h2Color, fontWeight: theme.h3FontWeight }}
          >
            Tag it, then add it to the story
          </h3>

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
            className="rounded-sm border border-dashed py-16 flex items-center justify-center text-sm cursor-pointer text-center px-6"
            style={{ borderColor: theme.borderColor, color: theme.mutedColor }}
          >
            Drag photos here, or click to tag them &ldquo;{CATEGORIES.find((c) => c.id === category)!.label}&rdquo; and add them to
            the story
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              onFiles(e.target.files, category);
              e.target.value = "";
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="mt-6 px-5 py-3 text-xs uppercase tracking-widest rounded-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: theme.primaryBtnBg, color: theme.primaryBtnText }}
          >
            <UploadIcon className="w-3.5 h-3.5" />
            {isUploading ? "Uploading…" : "Upload photos"}
          </button>

          {uploads.length > 0 && (
            <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-8")}>
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
      </DialogContent>
    </Dialog>
  );
}
