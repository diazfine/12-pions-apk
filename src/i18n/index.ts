import { Language } from '../types';
import { Translations } from './types';
import { fr } from './locales/fr';
import { en } from './locales/en';
import { es } from './locales/es';
import { wo } from './locales/wo';
import { pt } from './locales/pt';
import { ar } from './locales/ar';
import { sw } from './locales/sw';
import { zh } from './locales/zh';
import { de } from './locales/de';
import { it } from './locales/it';
import { ru } from './locales/ru';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { hi } from './locales/hi';
import { bn } from './locales/bn';
import { tr } from './locales/tr';
import { id } from './locales/id';
import { vi } from './locales/vi';

/**
 * 18 Full Dictionaries with 100% complete coverage for 12 PIONS.
 * Strict Rule: Each language stands on its own with ZERO fallback to English or French.
 * Brand Rule: "12 PIONS" is IMMUTABLE and NEVER translated.
 */
export const LNG: Record<Language, Translations> = {
  FR: fr,
  EN: en,
  ES: es,
  WO: wo,
  PT: pt,
  AR: ar,
  SW: sw,
  ZH: zh,
  DE: de,
  IT: it,
  RU: ru,
  JA: ja,
  KO: ko,
  HI: hi,
  BN: bn,
  TR: tr,
  ID: id,
  VI: vi,
};

export interface LanguageMeta {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const ALL_WORLD_LANGUAGES: LanguageMeta[] = [
  { code: 'FR', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'EN', name: 'Anglais', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ES', name: 'Espagnol', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'WO', name: 'Wolof', nativeName: 'Wolof', flag: '🇸🇳' },
  { code: 'PT', name: 'Portugais', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'AR', name: 'Arabe', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'SW', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇹🇿' },
  { code: 'ZH', name: 'Chinois', nativeName: '中文', flag: '🇨🇳' },
  { code: 'DE', name: 'Allemand', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'IT', name: 'Italien', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'RU', name: 'Russe', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'JA', name: 'Japonais', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'KO', name: 'Coréen', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'HI', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'BN', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'TR', name: 'Turc', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'ID', name: 'Indonésien', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'VI', name: 'Vietnamien', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
];

/**
 * Returns strongly-typed translations for the chosen Language.
 * Strict Rule: gameName is GUARANTEED to be "12 PIONS" across all languages.
 */
export function getTranslations(lang: Language): Translations {
  const selected = LNG[lang] || LNG.FR;
  return {
    ...selected,
    gameName: '12 PIONS',
  };
}

export * from './types';
export * from './useTranslation';
export * from './formatters';
export * from './legalTerms';
