"use client";

import { useRef, type RefObject } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PhotoFrame } from "./PhotoFrame";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "../types";
import { cn } from "@/lib/utils";

interface Props {
  photo: Photo;
  theme: DashboardTheme;
  containerRef?: RefObject<HTMLElement | null>;
  className?: string;
  strength?: number;
  onClick?: () => void;
}

/** A photo with gentle vertical parallax as it scrolls through the viewport. */
export function ParallaxImage({ photo, theme, containerRef, className, strength = 50, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container: containerRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-strength, strength]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.div style={{ y, position: "absolute", inset: "-12% 0", height: "124%" }}>
        <PhotoFrame photo={photo} theme={theme} className="w-full h-full" onClick={onClick} />
      </motion.div>
    </div>
  );
}
