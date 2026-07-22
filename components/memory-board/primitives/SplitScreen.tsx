import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  left: ReactNode;
  right: ReactNode;
  reverse?: boolean;
  className?: string;
}

/** Two-column layout for photo/photo or photo/text beats. */
export function SplitScreen({ left, right, reverse, className }: Props) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 min-h-[70vh]", className)}>
      <div className={reverse ? "md:order-2" : undefined}>{left}</div>
      <div className={reverse ? "md:order-1" : undefined}>{right}</div>
    </div>
  );
}
