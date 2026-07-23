import type { DashboardTheme } from "@/lib/dashboard-theme";

interface Props {
  theme: DashboardTheme;
  message: string;
}

/** Soft placeholder for a category section with no photos yet — reads as intentional, not broken. */
export function EmptyState({ theme, message }: Props) {
  return (
    <div
      className="rounded-sm border border-dashed py-16 text-center text-sm"
      style={{ borderColor: theme.borderColor, color: theme.mutedColor }}
    >
      {message}
    </div>
  );
}
