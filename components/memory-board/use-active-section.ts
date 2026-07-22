"use client";

import { useEffect, useState, type RefObject } from "react";

/** Tracks which section id is currently most visible within `containerRef`'s viewport. */
export function useActiveSection(sectionIds: string[], containerRef: RefObject<HTMLElement | null>) {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { root, threshold: [0.15, 0.3, 0.5, 0.7] }
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sectionIds, containerRef]);

  return activeId;
}
