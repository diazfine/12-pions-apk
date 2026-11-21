import { Language } from '../types';

const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

const LOCALE_BY_LANG: Record<Language, string> = {
  FR: 'fr-FR',
  EN: 'en-US',
  ES: 'es-ES',
  WO: 'fr-SN',
  PT: 'pt-PT',
  AR: 'ar-EG',
  SW: 'sw-TZ',
  ZH: 'zh-CN',
  DE: 'de-DE',
  IT: 'it-IT',
  RU: 'ru-RU',
  JA: 'ja-JP',
  KO: 'ko-KR',
  HI: 'hi-IN',
  BN: 'bn-BD',
  TR: 'tr-TR',
  ID: 'id-ID',
  VI: 'vi-VN',
};

/**
 * Converts Western digits [0-9] to Eastern Arabic, Bengali, or Devanagari (Hindi) digits if active language demands it.
 */
export function formatDigits(val: number | string | null | undefined, lang: Language = 'FR'): string {
  if (val === null || val === undefined) return '';
  const str = String(val);

  // ⚠️ RÈGLE D'OR ABSOLUE : La marque officielle "12 PIONS" ne doit JAMAIS être modifiée,
  // traduite ou numériquement convertie. En arabe/RTL, on utilise l'isolat LTR (\u2066 ... \u2069)
  // pour empêcher formellement toute inversion bidirectionnelle de texte (ex: "PIONS 12").
  // IMPORTANT: Le placeholder ne doit JAMAIS contenir de chiffres [0-9] afin de ne pas être muté par le convertisseur de chiffres.
  const BRAND_PLACEHOLDER = '@@@IMMUTABLE_ROYAL_BRAND_TOKEN@@@';
  let preservedBrand = '12 PIONS';
  const brandMatch = str.match(/\b12\s*(?:pions|pion)\b/i);
  let working = str;
  if (brandMatch) {
    preservedBrand = brandMatch[0];
    working = str.replace(/\b12\s*(?:pions|pion)\b/gi, BRAND_PLACEHOLDER);
  }

  let converted = working;
  if (lang === 'AR') {
    converted = working.replace(/[0-9]/g, d => ARABIC_INDIC_DIGITS[Number(d)] || d);
  } else if (lang === 'BN') {
    converted = working.replace(/[0-9]/g, d => BENGALI_DIGITS[Number(d)] || d);
  } else if (lang === 'HI') {
    converted = working.replace(/[0-9]/g, d => DEVANAGARI_DIGITS[Number(d)] || d);
  }

  const finalBrand = lang === 'AR' ? `\u2066${preservedBrand}\u2069` : preservedBrand;
  if (brandMatch) {
    converted = converted.replace(new RegExp(BRAND_PLACEHOLDER, 'g'), finalBrand);
  }
  // Nettoie aussi d'éventuels tokens corrompus résiduels
  converted = converted.replace(/___BRAND_.*?___/gi, finalBrand);
  converted = converted.replace(/@@@IMMUTABLE_ROYAL_BRAND_TOKEN@@@/g, finalBrand);

  return converted;
}

/**
 * Formats numbers according to language grouping and numeral characters.
 * E.g.:
 * FR: 2 500
 * EN: 2,500
 * AR: ٢٬٥٠٠ (Eastern Arabic numerals with proper grouping)
 * BN: ২,৫০০
 */
export function formatNumber(
  val: number | string | null | undefined,
  lang: Language = 'FR',
  options?: Intl.NumberFormatOptions
): string {
  if (val === null || val === undefined || val === '') return '';

  if (typeof val === 'string') {
    // If it's a numeric string with optional sign/spaces/commas
    const cleaned = val.replace(/[\s,]/g, '');
    const parsed = Number(cleaned);
    if (!isNaN(parsed) && cleaned.length > 0 && /^[+-]?\d+(\.\d+)?$/.test(cleaned)) {
      const isPositiveWithPlus = val.trim().startsWith('+');
      const res = formatNumber(parsed, lang, options);
      return isPositiveWithPlus && !res.startsWith('+') ? `+${res}` : res;
    }
    return formatDigits(val, lang);
  }

  const num = val;
  const locale = LOCALE_BY_LANG[lang] || 'fr-FR';

  try {
    const formatted = new Intl.NumberFormat(locale, options).format(num);
    if (lang === 'AR' || lang === 'BN' || lang === 'HI') {
      return formatDigits(formatted, lang);
    }
    return formatted;
  } catch {
    return formatDigits(num, lang);
  }
}

/**
 * Formats a duration in seconds, e.g. "0:30" or "1:15" with localized numeral characters.
 */
export function formatTimeSeconds(seconds: number, lang: Language = 'FR'): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.floor(Math.max(0, seconds) % 60);
  const text = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  return formatDigits(text, lang);
}

/**
 * Formats a percentage number e.g. 75% -> "75 %" or "٧٥٪"
 */
export function formatPercent(val: number, lang: Language = 'FR'): string {
  const formatted = formatNumber(val, lang);
  if (lang === 'AR') {
    return `${formatted}٪`;
  }
  return `${formatted}%`;
}

/**
 * Replaces any ASCII digits 0-9 inside any composite text with the active language's digits.
 */
export function formatTextWithDigits(text: string, lang: Language = 'FR'): string {
  return formatDigits(text, lang);
}
