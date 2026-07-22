"use client";

import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PhotoFrame } from "./PhotoFrame";
import { ChevronIcon } from "../icons";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";

interface Props {
  theme: DashboardTheme;
  photos: Photo[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}

/** Expanding photo viewer — arrows through the surrounding-context photo array that opened it. */
export function Lightbox({ theme, photos, index, open, onOpenChange, onIndexChange }: Props) {
  const current = photos[index];

  useEffect(() => {
    if (!open || photos.length < 2) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, photos.length, onIndexChange]);

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={current.alt} description={current.caption ?? ""}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-full max-h-[75vh] aspect-[4/3] md:aspect-[16/10]">
            <PhotoFrame photo={current} theme={theme} className="absolute inset-0 rounded-sm" priority />
          </div>

          {current.caption && (
            <p className="text-sm text-white/80 text-center max-w-xl">{current.caption}</p>
          )}

          {photos.length > 1 && (
            <div className="flex items-center gap-6 text-white/70">
              <button
                onClick={() => onIndexChange((index - 1 + photos.length) % photos.length)}
                aria-label="Previous photo"
                className="hover:text-white transition-colors"
              >
                <ChevronIcon direction="left" className="w-6 h-6" />
              </button>
              <span className="text-xs tracking-widest uppercase">
                {index + 1} / {photos.length}
              </span>
              <button
                onClick={() => onIndexChange((index + 1) % photos.length)}
                aria-label="Next photo"
                className="hover:text-white transition-colors"
              >
                <ChevronIcon direction="right" className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
