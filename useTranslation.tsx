import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { Language } from '../types';
import { Translations } from './types';
import { LNG } from './index';
import { formatNumber, formatDigits, formatTimeSeconds, formatPercent } from './formatters';
import { getLocalizedCountryName } from '../utils/worldCountries';

export type TFunction = ((key: string, defaultVal?: string) => string) &
  Translations & {
    formatNumber: (val: number | string | null | undefined, opts?: Intl.NumberFormatOptions) => string;
    formatDigits: (val: number | string | null | undefined) => string;
    formatTime: (seconds: number) => string;
    formatPercent: (val: number) => string;
  };

export interface TranslationContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: TFunction;
  formatNumber: (val: number | string | null | undefined, opts?: Intl.NumberFormatOptions) => string;
  formatDigits: (val: number | string | null | undefined) => string;
  formatTime: (seconds: number) => string;
  formatPercent: (val: number) => string;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

/**
 * Automatically detects device language from browser / system settings
 */
export const detectDeviceLanguage = (): Language => {
  try {
    const nav = (typeof navigator !== 'undefined' ? (navigator.language || (navigator as any).userLanguage || '') : '').toLowerCase();
    if (nav.startsWith('en')) return 'EN';
    if (nav.startsWith('es')) return 'ES';
    if (nav.startsWith('ar')) return 'AR';
    if (nav.startsWith('pt')) return 'PT';
    if (nav.startsWith('de')) return 'DE';
    if (nav.startsWith('zh')) return 'ZH';
    if (nav.startsWith('sw')) return 'SW';
    if (nav.startsWith('wo')) return 'WO';
    if (nav.startsWith('it')) return 'IT';
    if (nav.startsWith('ru')) return 'RU';
    if (nav.startsWith('ja')) return 'JA';
    if (nav.startsWith('ko')) return 'KO';
    if (nav.startsWith('hi')) return 'HI';
    if (nav.startsWith('tr')) return 'TR';
    if (nav.startsWith('id')) return 'ID';
    if (nav.startsWith('vi')) return 'VI';
    if (nav.startsWith('bn')) return 'BN';
    if (nav.startsWith('fr')) return 'FR';
  } catch {}
  return 'FR';
};

/**
 * Returns saved language from localStorage if present, otherwise auto-detected device language
 */
export const getSavedOrDeviceLanguage = (): Language => {
  try {
    const stored = localStorage.getItem('dama_settings_v2');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.language && LNG[parsed.language as Language]) {
        return parsed.language as Language;
      }
    }
  } catch {}
  return detectDeviceLanguage();
};

export const TranslationProvider: React.FC<{
  children: ReactNode;
  language?: Language;
  initialLanguage?: Language;
  onLanguageChange?: (lang: Language) => void;
}> = ({ children, language: controlledLanguage, initialLanguage, onLanguageChange }) => {
  const [internalLang, setInternalLang] = useState<Language>(() => {
    if (controlledLanguage && LNG[controlledLanguage]) return controlledLanguage;
    if (initialLanguage && LNG[initialLanguage]) return initialLanguage;
    return getSavedOrDeviceLanguage();
  });

  const activeLanguage = controlledLanguage && LNG[controlledLanguage] ? controlledLanguage : internalLang;

  const changeLanguage = (newLang: Language) => {
    setInternalLang(newLang);
    try {
      const stored = localStorage.getItem('dama_settings_v2');
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem('dama_settings_v2', JSON.stringify({ ...parsed, language: newLang }));
    } catch {}
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  };

  const fnFormatNumber = (val: number | string | null | undefined, opts?: Intl.NumberFormatOptions) =>
    formatNumber(val, activeLanguage, opts);
  const fnFormatDigits = (val: number | string | null | undefined) =>
    formatDigits(val, activeLanguage);
  const fnFormatTime = (secs: number) =>
    formatTimeSeconds(secs, activeLanguage);
  const fnFormatPercent = (val: number) =>
    formatPercent(val, activeLanguage);

  const t: TFunction = useMemo(() => {
    const raw: Translations = LNG[activeLanguage] || LNG.FR;
    const fallbackEn = LNG.EN || raw;
    const fallbackFr = LNG.FR || raw;

    const fn = (key: string, defaultVal?: string): string => {
      // ⚠️ EXCEPTION ABSOLUE : La marque officielle "12 PIONS" ne doit JAMAIS être traduite !
      if (key === '12 PIONS' || key === 'gameName') {
        return '12 PIONS';
      }
      let val = (raw as Record<string, string | undefined>)[key];
      if (val === undefined || val === null || val === '') {
        const enVal = (fallbackEn as Record<string, string | undefined>)[key];
        if (enVal !== undefined && enVal !== null && enVal !== '') {
          val = enVal;
        } else {
          const frVal = (fallbackFr as Record<string, string | undefined>)[key];
          if (frVal !== undefined && frVal !== null && frVal !== '') {
            val = frVal;
          } else if (key.startsWith('country_')) {
            const countryCode = key.slice(8);
            val = getLocalizedCountryName(countryCode, defaultVal || key, activeLanguage);
          } else {
            val = defaultVal !== undefined ? defaultVal : key;
          }
        }
      }

      const finalBrand = activeLanguage === 'AR' ? '\u206612 PIONS\u2069' : '12 PIONS';

      // Convert digits for languages with native numeral sets (AR, BN, HI),
      // while strictly preserving the immutable brand "12 PIONS"
      if (val && (activeLanguage === 'AR' || activeLanguage === 'BN' || activeLanguage === 'HI')) {
        const BRAND_PLACEHOLDER = '@@@IMMUTABLE_ROYAL_BRAND_TOKEN@@@';
        const protectedText = val.replace(/\b12\s*(?:PIONS|pions|Pion|pion)\b/g, BRAND_PLACEHOLDER);
        const withFormattedDigits = formatDigits(protectedText, activeLanguage);
        let result = withFormattedDigits.replace(new RegExp(BRAND_PLACEHOLDER, 'g'), finalBrand);
        result = result.replace(/___BRAND_.*?___/gi, finalBrand);
        result = result.replace(/@@@IMMUTABLE_ROYAL_BRAND_TOKEN@@@/g, finalBrand);
        return result;
      }

      if (val && typeof val === 'string') {
        let cleanVal = val.replace(/___BRAND_.*?___/gi, finalBrand);
        cleanVal = cleanVal.replace(/@@@IMMUTABLE_ROYAL_BRAND_TOKEN@@@/g, finalBrand);
        return cleanVal;
      }

      return val;
    };

    return Object.assign(fn, raw, {
      gameName: '12 PIONS',
      formatNumber: fnFormatNumber,
      formatDigits: fnFormatDigits,
      formatTime: fnFormatTime,
      formatPercent: fnFormatPercent,
    }) as TFunction;
  }, [activeLanguage]);

  return (
    <TranslationContext.Provider
      value={{
        language: activeLanguage,
        changeLanguage,
        t,
        formatNumber: fnFormatNumber,
        formatDigits: fnFormatDigits,
        formatTime: fnFormatTime,
        formatPercent: fnFormatPercent,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

export function useTranslation(): TranslationContextType {
  const context = useContext(TranslationContext);
  if (!context) {
    const fallbackLang = getSavedOrDeviceLanguage();
    const raw = LNG[fallbackLang] || LNG.FR;
    const fallbackEn = LNG.EN || raw;
    const fallbackFr = LNG.FR || raw;

    const fnFormatNumber = (val: number | string | null | undefined, opts?: Intl.NumberFormatOptions) =>
      formatNumber(val, fallbackLang, opts);
    const fnFormatDigits = (val: number | string | null | undefined) =>
      formatDigits(val, fallbackLang);
    const fnFormatTime = (secs: number) =>
      formatTimeSeconds(secs, fallbackLang);
    const fnFormatPercent = (val: number) =>
      formatPercent(val, fallbackLang);

    const fn = (key: string, defaultVal?: string): string => {
      if (key === '12 PIONS' || key === 'gameName') return '12 PIONS';
      let val = (raw as Record<string, string | undefined>)[key];
      if (val === undefined || val === null || val === '') {
        const enVal = (fallbackEn as Record<string, string | undefined>)[key];
        if (enVal !== undefined && enVal !== null && enVal !== '') {
          val = enVal;
        } else {
          const frVal = (fallbackFr as Record<string, string | undefined>)[key];
          if (frVal !== undefined && frVal !== null && frVal !== '') {
            val = frVal;
          } else if (key.startsWith('country_')) {
            const countryCode = key.slice(8);
            val = getLocalizedCountryName(countryCode, defaultVal || key, fallbackLang);
          } else {
            val = defaultVal ?? key;
          }
        }
      }

      const finalBrand = fallbackLang === 'AR' ? '\u206612 PIONS\u2069' : '12 PIONS';

      if (val && (fallbackLang === 'AR' || fallbackLang === 'BN' || fallbackLang === 'HI')) {
        const BRAND_PLACEHOLDER = '@@@IMMUTABLE_ROYAL_BRAND_TOKEN@@@';
        const protectedText = val.replace(/\b12\s*(?:PIONS|pions|Pion|pion)\b/g, BRAND_PLACEHOLDER);
        const withFormattedDigits = formatDigits(protectedText, fallbackLang);
        let result = withFormattedDigits.replace(new RegExp(BRAND_PLACEHOLDER, 'g'), finalBrand);
        result = result.replace(/___BRAND_.*?___/gi, finalBrand);
        result = result.replace(/@@@IMMUTABLE_ROYAL_BRAND_TOKEN@@@/g, finalBrand);
        return result;
      }

      if (val && typeof val === 'string') {
        let cleanVal = val.replace(/___BRAND_.*?___/gi, finalBrand);
        cleanVal = cleanVal.replace(/@@@IMMUTABLE_ROYAL_BRAND_TOKEN@@@/g, finalBrand);
        return cleanVal;
      }

      return val;
    };
    const t = Object.assign(fn, raw, {
      gameName: '12 PIONS',
      formatNumber: fnFormatNumber,
      formatDigits: fnFormatDigits,
      formatTime: fnFormatTime,
      formatPercent: fnFormatPercent,
    }) as TFunction;

    return {
      language: fallbackLang,
      changeLanguage: () => {},
      t,
      formatNumber: fnFormatNumber,
      formatDigits: fnFormatDigits,
      formatTime: fnFormatTime,
      formatPercent: fnFormatPercent,
    };
  }
  return context;
}
