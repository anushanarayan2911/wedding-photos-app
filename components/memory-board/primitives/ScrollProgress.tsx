"use client";

import type { RefObject } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { withOpacity } from "@/lib/theme";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import { SECTION_META } from "../data";

interface Props {
  theme: DashboardTheme;
  containerRef: RefObject<HTMLElement | null>;
  activeId: string | null;
}

/** Fixed slim rail: overall scroll progress plus the current section's label. */
export function ScrollProgress({ theme, containerRef, activeId }: Props) {
  const { scrollYProgress } = useScroll({ container: containerRef as RefObject<HTMLElement> });
  const barHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const activeLabel = SECTION_META.find((s) => s.id === activeId)?.label;

  return (
    <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 flex-col items-end gap-3 pointer-events-none">
      {activeLabel && (
        <span
          className="text-[11px] tracking-[0.25em] uppercase [writing-mode:vertical-rl] mb-2"
          style={{ color: theme.mutedColor }}
        >
          {activeLabel}
        </span>
      )}
      <div className="relative w-px h-36" style={{ backgroundColor: withOpacity(theme.bodyColor, 0.15) }}>
        <motion.div
          className="absolute top-0 left-0 w-px"
          style={{ backgroundColor: theme.primaryBtnBg, height: barHeight }}
        />
      </div>
    </div>
  );
}
