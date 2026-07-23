import type { CategoryId } from "./categories";

export interface Photo {
  id: string;
  src: string;
  alt: string;
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
}
