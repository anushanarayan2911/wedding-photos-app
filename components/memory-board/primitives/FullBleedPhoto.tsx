import { PhotoFrame } from "./PhotoFrame";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";
import { cn } from "@/lib/utils";

interface Props {
  photo: Photo;
  theme: DashboardTheme;
  eyebrow?: string;
  heading?: string;
  caption?: string;
  height?: string;
  onOpen?: () => void;
  className?: string;
}

/** Edge-to-edge photo moment with a bottom scrim and overlaid heading — the "one enormous photograph" beat. */
export function FullBleedPhoto({ photo, theme, eyebrow, heading, caption, height = "h-[82vh]", onOpen, className }: Props) {
  return (
    <div className={cn("relative w-full", height, className)}>
      <PhotoFrame photo={photo} theme={theme} className="absolute inset-0" onClick={onOpen} priority />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 48%)" }}
      />
      {(eyebrow || heading || caption) && (
        <div className="absolute inset-x-0 bottom-0 px-6 md:px-16 pb-10 md:pb-16 text-white pointer-events-none">
          {eyebrow && <p className="text-xs tracking-[0.3em] uppercase mb-3 opacity-80">{eyebrow}</p>}
          {heading && (
            <h2 className="text-4xl md:text-6xl mb-2" style={{ fontFamily: theme.h1Font, fontWeight: theme.h1FontWeight }}>
              {heading}
            </h2>
          )}
          {caption && (
            <p className="text-sm md:text-base opacity-85" style={{ fontFamily: theme.bodyFontResolved }}>
              {caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
