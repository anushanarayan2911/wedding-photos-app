"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Lightbox } from "./primitives/Lightbox";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import type { Photo } from "./types";

interface LightboxState {
  photos: Photo[];
  index: number;
}

interface LightboxContextValue {
  /** Opens the lightbox on `photos[index]`, letting the visitor arrow through the rest of that array. */
  open: (photos: Photo[], index: number) => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox() {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error("useLightbox must be used within a LightboxProvider");
  return ctx;
}

export function LightboxProvider({ theme, children }: { theme: DashboardTheme; children: ReactNode }) {
  const [state, setState] = useState<LightboxState | null>(null);

  const value = useMemo<LightboxContextValue>(
    () => ({ open: (photos, index) => setState({ photos, index }) }),
    []
  );

  return (
    <LightboxContext.Provider value={value}>
      {children}
      <Lightbox
        theme={theme}
        photos={state?.photos ?? []}
        index={state?.index ?? 0}
        open={state !== null}
        onOpenChange={(open) => { if (!open) setState(null); }}
        onIndexChange={(i) => setState((s) => (s ? { ...s, index: i } : s))}
      />
    </LightboxContext.Provider>
  );
}
