/**
 * Resolves image URL from API.
 * - Absolute URLs are returned as-is.
 * - When NEXT_PUBLIC_API_URL points to a remote host (e.g. duckapi.alefmenu.com),
 *   builds full URLs so images load from the API origin.
 * - When using localhost, returns paths like /uploads/... which work via Next.js rewrites.
 */
export function resolveImageUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;

  const apiUrl =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : null;

  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      // Use origin for images (uploads live at root, not under /api/v1)
      if (parsed.hostname !== "localhost" || parsed.port !== "8080") {
        return `${parsed.origin}${normalized}`;
      }
    } catch {
      // fall through to normalized
    }
  }

  return normalized;
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
