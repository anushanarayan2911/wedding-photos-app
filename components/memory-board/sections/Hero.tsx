"use client";

import type { RefObject } from "react";
import { motion } from "framer-motion";
import { ParallaxImage } from "../primitives/ParallaxImage";
import { heroFallbackPhoto, heroPlaceholder } from "../data";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { KeyImage } from "@/lib/theme";
import type { Photo } from "../types";

interface Props {
  theme: DashboardTheme;
  containerRef: RefObject<HTMLElement | null>;
  coupleName: string;
  heroImg?: KeyImage;
}

/** The opening beat — sets the scene before the day's timeline begins. */
export function Hero({ theme, containerRef, coupleName, heroImg }: Props) {
  const photo: Photo = heroImg
    ? { id: "site-hero", src: heroImg.url, alt: heroImg.alt || coupleName }
    : heroFallbackPhoto;

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      <ParallaxImage photo={photo} theme={theme} containerRef={containerRef} className="absolute inset-0" strength={70} />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.6))" }}
      />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-6 text-white">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 0.85, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-xs tracking-[0.35em] uppercase mb-6"
        >
          {heroPlaceholder.date} · {heroPlaceholder.venue}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.4 }}
          className="text-5xl md:text-7xl mb-8"
          style={{ fontFamily: theme.h1Font }}
        >
          {coupleName}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="max-w-xl text-sm md:text-base leading-relaxed"
        >
          {heroPlaceholder.tagline}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7, y: [0, 8, 0] }}
          transition={{ opacity: { duration: 1, delay: 1.2 }, y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute bottom-10 text-xs tracking-[0.3em] uppercase"
        >
          Scroll to relive the day ↓
        </motion.div>
      </div>
    </section>
  );
}
