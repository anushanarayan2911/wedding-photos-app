"use client";

import { motion } from "framer-motion";
import { PhotoFrame } from "./PhotoFrame";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";

interface Props {
  photos: Photo[];
  theme: DashboardTheme;
  onOpen?: (index: number) => void;
}

const ROTATIONS = [-6, 4, -3, 7, -8, 3, -5];

/** Overlapping rotated framed photos, like a stack tipped out of an envelope. */
export function PolaroidStack({ photos, theme, onOpen }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-10 md:gap-x-5 py-8">
      {photos.map((p, i) => (
        <motion.div
          key={p.id}
          className="p-3 pb-9 shadow-xl cursor-zoom-in"
          style={{ backgroundColor: theme.paperBg, rotate: ROTATIONS[i % ROTATIONS.length] }}
          whileHover={{ rotate: 0, scale: 1.05, zIndex: 10 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onClick={() => onOpen?.(i)}
        >
          <PhotoFrame photo={p} theme={theme} className="w-52 h-60 md:w-64 md:h-72" />
          {p.caption && (
            <p className="mt-3 text-center text-sm" style={{ color: theme.mutedColor, fontFamily: theme.bodyFontResolved }}>
              {p.caption}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
