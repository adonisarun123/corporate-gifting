/**
 * Editorial imagery for category/occasion tiles and the homepage hero.
 * Unsplash licence (free commercial use, no attribution required). Replace with owned photography
 * before launch; keys are taxonomy slugs from the seed. Missing keys fall back to a designed gradient tile.
 */
export function unsplash(id: string, w = 800, h = 600): string {
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=75&auto=format`;
}

export const CATEGORY_IMAGES: Record<string, { id: string; alt: string }> = {
  drinkware: { id: "photo-1625708458528-802ec79b1ed8", alt: "Pastel insulated steel bottles on a white surface" },
  stationery: { id: "photo-1620275765334-4ed948bb4502", alt: "Hardcover notebook with a black pen" },
  bags: { id: "photo-1553062407-98eeb64c6a62", alt: "Navy laptop backpack against a white wall" },
  "technology-accessories": { id: "photo-1590658268037-6bf12165a8df", alt: "Wireless headphones on a white table" },
  apparel: { id: "photo-1720514496268-44bb31c03815", alt: "Folded polo shirts in three colours" },
  "desk-accessories": { id: "photo-1751107807635-a2ac6035e8dd", alt: "Bamboo desk organiser holding pens" },
  "food-hampers": { id: "photo-1702043239331-da06c5c269e4", alt: "Wooden dry-fruit box beside a potted plant" },
  wellness: { id: "photo-1572726729207-a78d6feb18d7", alt: "Two amber-glass candles" },
  "home-and-lifestyle": { id: "photo-1485955900006-10f4d324d411", alt: "Succulent in a teal ceramic pot" },
  "gift-kits": { id: "photo-1637904731042-2ef367b8c00c", alt: "Open gift box with assorted items" },
};

export const OCCASION_IMAGES: Record<string, { id: string; alt: string }> = {
  onboarding: { id: "photo-1637904731042-2ef367b8c00c", alt: "Welcome kit box with assorted items" },
  "employee-recognition": { id: "photo-1758691737138-7b9b1884b1db", alt: "Team celebrating at an office desk" },
  "work-anniversaries": { id: "photo-1620080207549-60efab274c16", alt: "Black and gold fountain pen" },
  conferences: { id: "photo-1574365569389-a10d488ca3fb", alt: "Canvas tote bag" },
  "festive-gifting": { id: "photo-1548741487-18d363dc4469", alt: "Open box of assorted chocolates" },
  "client-appreciation": { id: "photo-1709039549252-179925870591", alt: "Leather notebook with pen" },
  "company-milestones": { id: "photo-1758691737584-a8f17fb34475", alt: "Colleagues celebrating a milestone" },
};

export const HERO_IMAGES = {
  main: { id: "photo-1595246135406-803418233494", alt: "Kraft gift box with tissue paper, lid set aside" },
  parcel: { id: "photo-1764764138587-189f22804ec4", alt: "Kraft parcel tied with string and a wax seal" },
  team: { id: "photo-1758691737138-7b9b1884b1db", alt: "Team celebrating at an office desk" },
  kit: { id: "photo-1637904731042-2ef367b8c00c", alt: "Open welcome kit box" },
  bottles: { id: "photo-1625708458528-802ec79b1ed8", alt: "Pastel insulated bottles" },
};

/* Deterministic gradient fallback so a tile without a photo is still designed, not a broken image. */
export function tileGradient(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 30% 28%), hsl(${(h + 40) % 360} 35% 18%))`;
}
