export interface Photo {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  credit?: "professional" | "guest";
}

export interface GuestQuote {
  name: string;
  relation: string;
  quote: string;
}

export interface FavouriteMemory {
  name: string;
  relation: string;
  quote: string;
  photo: Photo;
  isVideoMoment?: boolean;
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
  url: string;
  name: string;
  uploadedAt: string;
}
