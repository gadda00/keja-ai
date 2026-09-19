/**
 * Keja Property Passport ids (moved out of PropertyDetailView in wave 20 so
 * pure modules — the share kit, posters, tests — can compose them without
 * importing a view component).
 */
import type { Property } from '@/data/properties';

const AREA_CODE: Record<string, string> = {
  Kilimani: 'KLM', Westlands: 'WST', Lavington: 'LVT', Riverside: 'RSV', Karen: 'KRN',
  'Upper Hill': 'UPH', Kileleshwa: 'KLS', Runda: 'RND', Nyali: 'NYL', Diani: 'DNA',
  Kasarani: 'KSN', Madaraka: 'MDK', CBD: 'NBO', Eastleigh: 'EST', Nanyuki: 'NYK',
  Milimani: 'MLM', Ruaka: 'RUK', Syokimau: 'SYK', Kitengela: 'KTG', 'Athi River': 'ATH',
  Nakuru: 'NKR', Kisumu: 'KSM',
};

/** Stable, printable passport id for a listing (e.g. KEJA-KLM-000001). */
export function passportId(p: Property): string {
  const code = AREA_CODE[p.area] ?? p.area.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const seq = (p.id.match(/(\d+)$/)?.[1] ?? '0').padStart(6, '0');
  return `KEJA-${code}-${seq}`;
}
