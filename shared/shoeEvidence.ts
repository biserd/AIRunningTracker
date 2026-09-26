/** Preserve unknown evidence; a missing rating is not a zero score. */
export function shoeBoolean(value: boolean | null | undefined): string {
  return value == null ? "Not verified" : value ? "Yes" : "No";
}
export function shoeNumber(value: number | null | undefined, unit = ""): string {
  return value == null || !Number.isFinite(value) ? "Not published" : `${value}${unit}`;
}

export function ratedHigher(a: number | null, b: number | null): boolean {
  return a != null && b != null && Number.isFinite(a) && Number.isFinite(b) && a > b;
}

type Availability = { availability?: string | null; availableFrom?: string | null };
export function shoeAvailability(shoe: Availability): string {
  if (shoe.availability === 'upcoming') return shoe.availableFrom ? `Upcoming · expected ${shoe.availableFrom}` : 'Upcoming';
  return shoe.availability === 'available' ? 'Available when checked' : 'Availability not verified';
}
// Never infer stock from a date passing. Upcoming models need a fresh source check.
export function canRecommendShoe(shoe: Availability): boolean {
  return shoe.availability !== 'upcoming';
}

export function averageShoeRating(values: (number | null)[]): string {
  if (!values.length || values.some(value => value == null || !Number.isFinite(value))) return "Not rated";
  return ((values as number[]).reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

export function safeShoeSource(url: string | null | undefined): string | undefined {
  try {
    const parsed = new URL(url || "");
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : undefined;
  } catch { return undefined; }
}
