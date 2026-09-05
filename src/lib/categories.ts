// Mirrors reference.md's "Wedding Day Photo Categories" and server/index.js's
// PHOTO_CATEGORIES — keep all three in sync if the categories change. Order
// here is the chronological order sections render in on the board.
export const PHOTO_CATEGORY_ORDER = [
  'Getting Ready',
  'First Look / Before the Ceremony',
  'The Ceremony',
  'Family & Group Photos',
  'Drinks Reception',
  'Wedding Breakfast / Dinner',
  'Speeches',
  'Cake Cutting',
  'First Dance',
  'The Party',
  'Little Moments',
]

export interface CategorizedPhoto {
  url: string
  category: string
}
