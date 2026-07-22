import { PhotoFrame } from "./PhotoFrame";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";

interface Props {
  photos: Photo[];
  theme: DashboardTheme;
  onOpen?: (index: number) => void;
}

/** CSS-columns collage — natural photo aspect ratios, no JS masonry library needed. */
export function Masonry({ photos, theme, onOpen }: Props) {
  return (
    <div className="columns-2 md:columns-3 gap-4 [&>*]:mb-4">
      {photos.map((p, i) => (
        <div key={p.id} className="break-inside-avoid">
          <PhotoFrame
            photo={p}
            theme={theme}
            fill={false}
            className="rounded-sm"
            onClick={onOpen ? () => onOpen(i) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
