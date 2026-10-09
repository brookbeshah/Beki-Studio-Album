import enData from './en.json';
import amData from './am.json';
import tiData from './ti.json';
import omData from './om.json';

import { en as enTs } from './en';
import { am as amTs } from './am';
import { ti as tiTs } from './ti';
import { om as omTs } from './om';

export type SupportedLocale = 'en' | 'am' | 'ti' | 'om';

export interface LanguageOption {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  shortLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', shortLabel: 'EN' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', shortLabel: 'አማ' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', shortLabel: 'ትግ' },
  { code: 'om', name: 'Afaan Oromoo', nativeName: 'Afaan Oromoo', shortLabel: 'OR' },
];

/**
 * Recursively flatten nested JSON objects into dot-notated key-value dictionary.
 * e.g., { common: { save: "Save" } } -> { "common.save": "Save" }
 */
function flattenTranslations(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenTranslations(value as Record<string, unknown>, prefixedKey));
    } else if (typeof value === 'string') {
      flattened[prefixedKey] = value;
    }
  }

  return flattened;
}

// Flatten JSON files
const rawEnFlat = flattenTranslations(enData);
const rawAmFlat = flattenTranslations(amData);
const rawTiFlat = flattenTranslations(tiData);
const rawOmFlat = flattenTranslations(omData);

// Merge with flat TypeScript keys (ensuring total union coverage)
export const enFlat: Record<string, string> = { ...enTs, ...rawEnFlat };
export const amFlat: Record<string, string> = { ...amTs, ...rawAmFlat };
export const tiFlat: Record<string, string> = { ...tiTs, ...rawTiFlat };
export const omFlat: Record<string, string> = { ...omTs, ...rawOmFlat };

// Direct exports of the parsed JSON objects
export { enData, amData, tiData, omData };

// Direct exports of the TS objects
export { enTs, amTs, tiTs, omTs };

// Export the unified flattened dictionary for ultra-fast direct lookup
export const translations: Record<SupportedLocale, Record<string, string>> = {
  en: enFlat,
  am: amFlat,
  ti: tiFlat,
  om: omFlat,
};

/**
 * Developer verification utility to compare keys across all locales
 * and ensure structural parity.
 */
export function validateTranslations(): {
  isValid: boolean;
  totalKeys: number;
  missingInAmharic: string[];
  missingInTigrinya: string[];
  missingInOromo: string[];
} {
  const enKeys = Object.keys(enFlat);
  const missingInAmharic = enKeys.filter((k) => !amFlat[k]);
  const missingInTigrinya = enKeys.filter((k) => !tiFlat[k]);
  const missingInOromo = enKeys.filter((k) => !omFlat[k]);

  const isValid =
    missingInAmharic.length === 0 &&
    missingInTigrinya.length === 0 &&
    missingInOromo.length === 0;

  if (!isValid && typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
    console.warn('[i18n Validation] Discrepancies found in translation keys:', {
      missingInAmharic,
      missingInTigrinya,
      missingInOromo,
    });
  }

  return {
    isValid,
    totalKeys: enKeys.length,
    missingInAmharic,
    missingInTigrinya,
    missingInOromo,
  };
}

// Run key verification in development mode
if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
  validateTranslations();
}
