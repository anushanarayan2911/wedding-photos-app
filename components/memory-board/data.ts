import type { TimelineEvent, SectionMeta } from "./types";

// ── Hero (opening beat, ahead of the story) ─────────────────────────────────
export const heroPlaceholder = {
  date: "June 14, 2025",
  venue: "Left Bank Barn",
  tagline: "Every wedding has one story everyone remembers, and a thousand small ones only the people who were there will ever know. This is both.",
};

// ── Day timeline (closing recap) ────────────────────────────────────────────
export const dayTimeline: TimelineEvent[] = [
  { time: "8:30am", title: "Getting ready", description: "Two houses, two very different playlists, one shared nervous energy." },
  { time: "12:30pm", title: "Ceremony", description: "Twenty minutes, one shared cry from row three." },
  { time: "2:00pm", title: "Portraits & drinks", description: "Garden games, warm prosecco, and too many good conversations to finish." },
  { time: "7:00pm", title: "Dinner & speeches", description: "Three speeches, two of them tearjerkers, one unexpected poem." },
  { time: "8:00pm", title: "Evening party", description: "The playlist everyone had been waiting for." },
  { time: "11:30pm", title: "Sparklers & send-off", description: "Last dance, last drink, first married midnight." },
];

// ── Section order + progress-rail labels ───────────────────────────────────
export const SECTION_META: SectionMeta[] = [
  { id: "hero", label: "Begin" },
  { id: "team-bride", label: "Team Bride" },
  { id: "team-groom", label: "Team Groom" },
  { id: "ceremony", label: "Ceremony" },
  { id: "couple", label: "The Couple" },
  { id: "party", label: "The Party" },
  { id: "add-photos", label: "Add Photos" },
  { id: "ending", label: "The End" },
];
