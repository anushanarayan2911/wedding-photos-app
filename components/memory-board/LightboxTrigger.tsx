"use client";

import type { ReactNode } from "react";
import { useLightbox } from "./lightbox-context";
import type { Photo } from "./types";

interface Props {
  photos: Photo[];
  index: number;
  children: ReactNode;
}

/** Wraps a photo primitive so a click opens the lightbox on `photos[index]`, with the rest of `photos` browsable via arrows. */
export function LightboxTrigger({ photos, index, children }: Props) {
  const { open } = useLightbox();
  return (
    <div onClick={() => open(photos, index)} className="contents cursor-zoom-in">
      {children}
    </div>
  );
}
