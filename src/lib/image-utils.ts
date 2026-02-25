/**
 * Resolves image URL from API: relative paths work via Next.js rewrites (/uploads/**).
 */
export function resolveImageUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

/**
 * Extracts the first image from Trip.images (array or object).
 */
export function getTripImage(
  images?: string[] | { [key: string]: string },
): string | null {
  if (!images) return null;
  if (Array.isArray(images)) return images[0] ?? null;
  const values = Object.values(images);
  return values[0] ?? null;
}
