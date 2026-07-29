import type { CategoryId } from "./categories";

export interface Photo {
  id: string;
  src: string;
  alt: string;
  /** Intrinsic pixel dimensions, when known (local uploads always have them — enables next/image optimization). Omitted for externally-sourced photos (e.g. the site-scraped hero image). */
  width?: number;
  height?: number;
  caption?: string;
  credit?: "professional" | "guest";
}

export interface TimelineEvent {
  time: string;
  title: string;
  description: string;
}

export interface SectionMeta {
  id: string;
  label: string;
}

export interface UploadedPhoto {
  id: string;
  url: string;
  name: string;
  uploadedAt: string;
  category: CategoryId;
  width: number;
  height: number;
}
