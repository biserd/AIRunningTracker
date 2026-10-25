/** Omit unknown dates instead of telling crawlers every page changed today. */
export function sitemapDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) return undefined;
  return date.toISOString().slice(0, 10);
}
