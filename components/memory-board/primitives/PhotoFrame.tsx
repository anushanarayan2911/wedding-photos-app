"use client";

import { useState } from "react";
import Image from "next/image";
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
  /** Responsive `sizes` hint for `fill` layouts — how wide this photo actually renders, so next/image doesn't fetch a full-viewport-sized file for a small thumbnail. Defaults to "100vw" (correct for full-bleed photos, wasteful for small ones — pass a tighter value when known). */
  sizes?: string;
}

/**
 * Renders a placeholder photo defensively: a themed gradient panel sits
 * behind the <img> at all times, so a stale/expired stock URL degrades to
 * an intentional-looking color block instead of a broken-image icon.
 *
 * Local uploads (`/uploads/...`) go through next/image for resizing,
 * lazy-loading, and format conversion — uploads can be up to 15MB at
 * arbitrary resolution, and serving them raw was the main cause of slow
 * scrolling. Externally-sourced photos (e.g. the site-scraped hero image)
 * stay on a plain <img> since their host isn't known ahead of time to
 * allowlist for optimization.
 */
export function PhotoFrame({ photo, theme, className, imgClassName, priority, onClick, fill = true, sizes = "100vw" }: Props) {
  const [failed, setFailed] = useState(false);
  const isLocalUpload = photo.src.startsWith("/uploads/");

  return (
    <div
      className={cn("relative overflow-hidden", onClick && "cursor-zoom-in", className)}
      style={{
        background: `linear-gradient(135deg, ${withOpacity(theme.primaryBtnBg, 0.28)}, ${withOpacity(theme.h1Color, 0.16)})`,
      }}
      onClick={onClick}
    >
      {!failed && isLocalUpload && (
        fill ? (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes={sizes}
            priority={priority}
            className={cn("object-cover", imgClassName)}
            onError={() => setFailed(true)}
          />
        ) : (
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width ?? 1600}
            height={photo.height ?? 1200}
            sizes={sizes}
            priority={priority}
            className={cn("w-full h-auto block", imgClassName)}
            onError={() => setFailed(true)}
          />
        )
      )}
      {!failed && !isLocalUpload && (
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
