import { PhotoFrame } from "./PhotoFrame";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";
import { cn } from "@/lib/utils";

interface Props {
  photos: Photo[];
  theme: DashboardTheme;
  onOpen?: (index: number) => void;
  itemClassName?: string;
}

/** Horizontal scroll-snap row of photos — the fast, energetic beat. */
export function FilmStrip({ photos, theme, onOpen, itemClassName }: Props) {
  return (
    <div
      className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 px-6 md:px-10 -mx-6 md:-mx-10 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {photos.map((p, i) => (
        <div key={p.id} className={cn("snap-center shrink-0 w-[78vw] sm:w-[420px] aspect-[4/5]", itemClassName)}>
          <PhotoFrame
            photo={p}
            theme={theme}
            className="w-full h-full rounded-sm"
            onClick={onOpen ? () => onOpen(i) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
