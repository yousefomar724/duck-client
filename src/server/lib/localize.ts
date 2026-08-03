import type { LocalizedText } from '../models/supplier';

/**
 * Replaces the duplicated Go `resolve` closures inside `Trip.ToResponse` and
 * `Destination.ToResponse`: when `lang` is empty, the full `{en, ar}` value
 * is returned as-is (admin/edit forms rely on this via `omitLang: true` on
 * the frontend). When `lang` is given, resolve to that language, falling
 * back to `en`, else the raw value.
 */
export function resolveLocalized(
  value: LocalizedText | unknown,
  lang: string | null | undefined,
): unknown {
  if (value == null) return null;
  if (!lang) return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const map = value as Record<string, unknown>;
    if (lang in map) return map[lang];
    if ('en' in map) return map.en;
  }
  return value;
}
