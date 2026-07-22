"use client";

import { useState } from "react";
import { withOpacity } from "@/lib/theme";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";
import { cn } from "@/lib/utils";

interface Props {
  photo: Photo;
  theme: DashboardTheme;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  onClick?: () => void;
  /** true (default): absolute-fill + object-cover, for a parent with an explicit size (aspect ratio / height class). false: natural aspect ratio, static block image — for masonry layouts. */
  fill?: boolean;
}

/**
 * Renders a placeholder photo defensively: a themed gradient panel sits
 * behind the <img> at all times, so a stale/expired stock URL degrades to
 * an intentional-looking color block instead of a broken-image icon.
 */
export function PhotoFrame({ photo, theme, className, imgClassName, priority, onClick, fill = true }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn("relative overflow-hidden", onClick && "cursor-zoom-in", className)}
      style={{
        background: `linear-gradient(135deg, ${withOpacity(theme.primaryBtnBg, 0.28)}, ${withOpacity(theme.h1Color, 0.16)})`,
      }}
      onClick={onClick}
    >
      {!failed && (
        <img
          src={photo.src}
          alt={photo.alt}
          loading={priority ? "eager" : "lazy"}
          className={cn(fill ? "w-full h-full object-cover" : "w-full h-auto block", imgClassName)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
