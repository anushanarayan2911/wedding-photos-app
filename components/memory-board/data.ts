import type { Photo, GuestQuote, FavouriteMemory, TimelineEvent, SectionMeta } from "./types";

/**
 * Curated placeholder wedding photography (Unsplash CDN). Hand-picked from
 * training knowledge rather than fetched/verified — a handful may 404 over
 * time. Every consumer renders these through <PhotoFrame>, which shows a
 * soft themed gradient behind the <img> and hides the tag on error, so a
 * stale URL degrades to an elegant color panel rather than a broken icon.
 */
function unsplash(id: string, w = 1600, h?: number) {
  const size = h ? `&w=${w}&h=${h}` : `&w=${w}`;
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80${size}`;
}

const photo = (id: string, alt: string, opts?: { w?: number; h?: number; caption?: string; credit?: Photo["credit"] }): Photo => ({
  id,
  src: unsplash(id, opts?.w, opts?.h),
  alt,
  caption: opts?.caption,
  credit: opts?.credit ?? "professional",
});

// ── Hero (opening beat, ahead of the timeline) ──────────────────────────────
export const heroFallbackPhoto = photo("1519741497674-611481863552d", "The couple on their wedding day", { h: 2200, caption: undefined });
export const heroPlaceholder = {
  date: "June 14, 2025",
  venue: "Left Bank Barn",
  tagline: "Every wedding has one story everyone remembers, and a thousand small ones only the people who were there will ever know. This is both.",
};

// ── Morning Preparations ──────────────────────────────────────────────────
export const morningPrepPhotos: Photo[] = [
  photo("1519741497674-611481863552", "Bride having her hair styled before the ceremony", { h: 2000, caption: "9:12am — final pins" }),
  photo("1594736797933-d0501ba2fe65", "Groom buttoning his shirt cuffs", { h: 2000, caption: "9:40am — getting dressed" }),
  photo("1600497584535-1a1c4a53e04a", "Wedding dress hanging in the morning light", { w: 1200, credit: "guest" }),
  photo("1606216794074-735e91aa2c92", "Bridesmaids laughing while getting ready", { credit: "guest" }),
];

// ── First Look ─────────────────────────────────────────────────────────────
export const firstLookPhoto = photo("1583939003579-730e3918a45a", "The couple seeing each other for the first time", { h: 1800, caption: "The first look" });

// ── Ceremony ───────────────────────────────────────────────────────────────
export const ceremonyPhotos: Photo[] = [
  photo("1465495976277-4387d4b0e4a6", "Wedding rings resting on an open book", { w: 1200 }),
  photo("1519225421980-715cb0215aed", "The couple exchanging vows at the altar", { h: 2000, caption: "\"I do.\"" }),
  photo("1511285560929-80b456fea0bc", "Guests seated for the ceremony", { credit: "guest" }),
];

// ── Confetti ───────────────────────────────────────────────────────────────
export const confettiPhotos: Photo[] = [
  photo("1520854221256-17451cc331bf", "Confetti thrown over the newlyweds", { w: 1000, h: 1250 }),
  photo("1523438885200-e635ba2c371e", "Guests cheering and throwing petals", { w: 1000, h: 1250, credit: "guest" }),
  photo("1519167758481-83f29c8d8b8f", "The couple laughing under a shower of confetti", { w: 1000, h: 1250 }),
  photo("1521543387112-56d3e10a05e4", "Confetti mid-air against the sky", { w: 1000, h: 1250, credit: "guest" }),
];

// ── Drinks Reception ───────────────────────────────────────────────────────
export const drinksReceptionPhotos: Photo[] = [
  photo("1470337458703-46ad1756a187", "Champagne glasses lined up for toasting", { w: 1000 }),
  photo("1529636798458-92182e662485", "Guests mingling in the garden", { w: 900, credit: "guest" }),
  photo("1505628346881-b72b27e84530", "Close friends sharing a toast", { w: 1100, credit: "guest" }),
  photo("1527529482837-4698179dc6ce", "A candid laugh between guests", { w: 900, credit: "guest" }),
  photo("1516572448122-a56a0fdcd3ec", "The couple greeting guests at the reception", { w: 1100 }),
];

// ── Couple Portraits ───────────────────────────────────────────────────────
export const couplePortraitPhotos: Photo[] = [
  photo("1509927083803-4bd519298ac4", "The newlyweds walking hand in hand", { w: 900, h: 1100 }),
  photo("1465495976277-facbb87a5b6e", "A quiet portrait of the couple", { w: 900, h: 1100 }),
  photo("1522673607200-164d1b6ce486", "The couple laughing together at golden hour", { w: 900, h: 1100 }),
];

// ── "While you were taking portraits..." candid moments ───────────────────
export const candidMomentsPhotos: Photo[] = [
  photo("1543269865-4433cd7d0b71", "Kids sneaking extra cake at the reception", { credit: "guest" }),
  photo("1522413452208-996ff3f3e740", "Guests dancing early to the DJ warm-up", { credit: "guest" }),
  photo("1519741497674-8a1a37c0a05e", "A grandparent wiping away happy tears", { credit: "guest" }),
  photo("1511795409834-ef04bbd61622", "Someone topping up the wine, unnoticed", { credit: "guest" }),
];

// ── Speeches ───────────────────────────────────────────────────────────────
export const speechesPhoto = photo("1519741497674-611481863552b", "The best man mid-speech", { h: 1400 });
export const speechQuote: GuestQuote = {
  name: "James",
  relation: "Best Man",
  quote: "I've known him since we were eleven, and I have genuinely never seen him look at anything the way he looks at her.",
};

// ── Dinner ─────────────────────────────────────────────────────────────────
export const dinnerPhotos: Photo[] = [
  photo("1414235077428-338989a2e8c0", "Tables set for the wedding breakfast", { w: 1000 }),
  photo("1555244162-803834f70033", "Guests deep in conversation over dinner", { w: 1000, credit: "guest" }),
  photo("1529636798458-92182e662485b", "Candlelight across the table settings", { w: 1000 }),
  photo("1470337458703-46ad1756a187b", "A toast raised mid-meal", { w: 1000, credit: "guest" }),
];

// ── Cake ───────────────────────────────────────────────────────────────────
export const cakePhoto = photo("1535254973040-607b474cb50d", "The couple cutting the wedding cake", { h: 1800, caption: "The cutting of the cake" });

// ── First Dance ────────────────────────────────────────────────────────────
export const firstDancePhoto = photo("1519741497674-611481863552c", "The couple's first dance under fairy lights", { h: 1600 });

// ── Evening Party ──────────────────────────────────────────────────────────
export const eveningPartyPhotos: Photo[] = [
  photo("1470229722913-7c0e2dbbafd3", "The dance floor in full swing", { w: 950, h: 1150, credit: "guest" }),
  photo("1493225457124-a3eb161ffa5f", "Friends dancing together", { w: 950, h: 1150, credit: "guest" }),
  photo("1521106581851-2c14e6a2e4a1", "The DJ booth mid-set", { w: 950, h: 1150, credit: "guest" }),
  photo("1478147427282-58a87a120781", "String lights over the dance floor", { w: 950, h: 1150 }),
  photo("1523438885200-e635ba2c371eb", "A spontaneous group photo on the dance floor", { w: 950, h: 1150, credit: "guest" }),
];

// ── Late Night ─────────────────────────────────────────────────────────────
export const lateNightPhotos: Photo[] = [
  photo("1516450360452-9312f5e86fc7", "Sparklers lighting up the send-off", { credit: "guest" }),
  photo("1522075469751-3a6694fb2f61", "Shoes off, dancing barefoot", { credit: "guest" }),
  photo("1517457373958-b7bdd4587205", "The last few guests under string lights", { credit: "guest" }),
  photo("1509281373149-e957c6296406", "A quiet moment on the way out", { credit: "guest" }),
];

// ── Photos you haven't seen before (overlooked guest snaps) ────────────────
export const unseenPhotos: Photo[] = [
  photo("1511285560929-80b456fea0bcc", "A candid shot from the back of the room", { credit: "guest" }),
  photo("1520854221256-17451cc331bfb", "A guest's blurry, joyful photo of the dance floor", { credit: "guest" }),
  photo("1527529482837-4698179dc6ceb", "An overlooked photo of the couple mid-laugh", { credit: "guest" }),
  photo("1470337458703-46ad1756a187c", "A quiet detail shot someone almost didn't upload", { credit: "guest" }),
  photo("1509281373149-e957c6296406b", "A photo taken on the walk to the car at the end of the night", { credit: "guest" }),
];

// ── Favourite memories (guest stories) ─────────────────────────────────────
export const favouriteMemories: FavouriteMemory[] = [
  {
    name: "Priya",
    relation: "College roommate",
    quote: "Watching her dad's face during the father-daughter dance undid all of us. Not a dry eye at our table.",
    photo: photo("1522413452208-996ff3f3e740b", "Father-daughter dance moment", { w: 1000, h: 1250, credit: "guest" }),
  },
  {
    name: "Marcus",
    relation: "Groom's brother",
    quote: "He tried to give a toast, got two sentences in, and just started laughing at how happy he was. Took him a full minute to recover.",
    photo: photo("1511285560929-80b456fea0bcb", "The groom's brother giving a toast", { w: 1000, h: 1250, credit: "guest" }),
    isVideoMoment: true,
  },
  {
    name: "Elena",
    relation: "Cousin of the bride",
    quote: "The flower girl fell asleep face-down in the cake table by 9pm. Iconic behavior, honestly.",
    photo: photo("1543269865-4433cd7d0b71b", "A flower girl asleep at the reception", { w: 1000, h: 1250, credit: "guest" }),
  },
  {
    name: "Tom & Sarah",
    relation: "Neighbours",
    quote: "We'd never met most of the guest list and left with three new phone numbers. That's a good wedding.",
    photo: photo("1529636798458-92182e662485c", "New friends laughing together at a table", { w: 1000, h: 1250, credit: "guest" }),
  },
];

// ── Guest quotes / reactions used throughout ───────────────────────────────
export const ceremonyGuestQuotes: GuestQuote[] = [
  { name: "Aunt Linda", relation: "Bride's aunt", quote: "I've been to a lot of weddings. I've never seen two people look that certain." },
  { name: "Ravi", relation: "Groomsman", quote: "He text me at 6am just to say 'today's the day.' Nobody needed to tell him that." },
];

export const receptionGuestQuotes: GuestQuote[] = [
  { name: "Beth", relation: "Bride's colleague", quote: "The canapés lasted four minutes. I regret nothing." },
  { name: "Old Uncle Frank", relation: "Great-uncle", quote: "Best open bar I've seen since 1987, and I'm including my own wedding." },
];

// ── Day timeline (closing recap) ────────────────────────────────────────────
export const dayTimeline: TimelineEvent[] = [
  { time: "8:30am", title: "Getting ready", description: "Two houses, two very different playlists, one shared nervous energy." },
  { time: "11:00am", title: "First look", description: "A quiet minute before the day got loud." },
  { time: "12:30pm", title: "Ceremony", description: "Twenty minutes, one shared cry from row three." },
  { time: "1:00pm", title: "Confetti & photos", description: "Petals, portraits, and a lot of squinting into the sun." },
  { time: "2:00pm", title: "Drinks reception", description: "Garden games, warm prosecco, and too many good conversations to finish." },
  { time: "4:30pm", title: "Speeches & dinner", description: "Three speeches, two of them tearjerkers, one unexpected poem." },
  { time: "7:00pm", title: "Cake & first dance", description: "One slightly wonky top tier, one perfect first song." },
  { time: "8:00pm", title: "Evening party", description: "The playlist everyone had been waiting for." },
  { time: "11:30pm", title: "Sparklers & send-off", description: "Last dance, last drink, first married midnight." },
];

// ── Section order + progress-rail labels ───────────────────────────────────
export const SECTION_META: SectionMeta[] = [
  { id: "hero", label: "Begin" },
  { id: "morning-preparations", label: "Morning" },
  { id: "first-look", label: "First Look" },
  { id: "ceremony", label: "Ceremony" },
  { id: "confetti", label: "Confetti" },
  { id: "drinks-reception", label: "Reception" },
  { id: "couple-portraits", label: "Portraits" },
  { id: "candid-moments", label: "Meanwhile…" },
  { id: "speeches", label: "Speeches" },
  { id: "dinner", label: "Dinner" },
  { id: "cake", label: "Cake" },
  { id: "first-dance", label: "First Dance" },
  { id: "evening-party", label: "Party" },
  { id: "late-night", label: "Late Night" },
  { id: "favourite-memories", label: "Favourites" },
  { id: "unseen-photos", label: "Unseen" },
  { id: "ending", label: "The End" },
];
