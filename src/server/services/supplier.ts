import type { SupplierDoc } from '../models/supplier';

/**
 * Mirrors Go's `SupplierService.formatResponse`: always resolves to a single
 * localized string — defaults to `en`, overridden by `lang` only when that
 * key exists AND is non-empty. Unlike trips/destinations, suppliers never
 * return the full bilingual object even when `lang` is omitted.
 */
export function formatSupplierResponse(supplier: SupplierDoc, lang: string) {
  const nameMap = supplier.name ?? { en: '', ar: '' };
  const aboutMap = supplier.about ?? { en: '', ar: '' };

  const name = (lang && (nameMap as unknown as Record<string, string>)[lang]) || nameMap.en || '';
  const about = (lang && (aboutMap as unknown as Record<string, string>)[lang]) || aboutMap.en || '';

  return {
    id: supplier.id,
    ID: supplier.id,
    user_id: supplier.user_id.toString(),
    // Go's formatResponse never populated Email on SupplierResponse (always empty string).
    email: '',
    name,
    about,
    icon: supplier.icon,
    rate: supplier.rate,
  };
}
