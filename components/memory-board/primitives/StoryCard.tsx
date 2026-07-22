import { PhotoFrame } from "./PhotoFrame";
import { PlayIcon } from "../icons";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { FavouriteMemory } from "../types";

interface Props {
  memory: FavouriteMemory;
  theme: DashboardTheme;
  onOpen?: () => void;
}

/**
 * A guest's favourite-memory card. `isVideoMoment` renders a poster + play
 * overlay tagged "Guest video" — honest about opening the still in the
 * lightbox rather than faking real video playback, since no video asset exists.
 */
export function StoryCard({ memory, theme, onOpen }: Props) {
  return (
    <div className="flex flex-col rounded-sm overflow-hidden shadow-sm" style={{ backgroundColor: theme.paperBg }}>
      <div className="relative aspect-[4/3] cursor-zoom-in" onClick={onOpen}>
        <PhotoFrame photo={memory.photo} theme={theme} className="absolute inset-0" />
        {memory.isVideoMoment && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="w-14 h-14 rounded-full flex items-center justify-center bg-white/90">
              <PlayIcon className="w-6 h-6 text-black translate-x-0.5" />
            </span>
            <span className="absolute bottom-3 left-3 text-[11px] tracking-wide uppercase bg-black/60 text-white px-2 py-1 rounded-sm">
              Guest video
            </span>
          </div>
        )}
      </div>
      <div className="p-6">
        <p className="text-base leading-relaxed mb-4" style={{ color: theme.bodyColor, fontFamily: theme.bodyFontResolved }}>
          &ldquo;{memory.quote}&rdquo;
        </p>
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.mutedColor }}>
          {memory.name} · {memory.relation}
        </p>
      </div>
    </div>
  );
}
