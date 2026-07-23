export const CATEGORIES = [
  { id: "team-bride", label: "Team Bride" },
  { id: "team-groom", label: "Team Groom" },
  { id: "ceremony", label: "The Ceremony" },
  { id: "couple", label: "The Couple" },
  { id: "party", label: "The Party" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as string[]).includes(value);
}

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)!.label;
}
