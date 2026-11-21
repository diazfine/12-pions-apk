import { Language } from '../types';

/**
 * Detects the device language automatically and maps to available languages (FR, EN, ES, AR, JA)
 */
export function detectDeviceLanguage(): Language {
  if (typeof navigator === 'undefined') return 'FR';

  const navLang = (navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || 'fr').toLowerCase();

  if (navLang.startsWith('fr')) return 'FR';
  if (navLang.startsWith('en')) return 'EN';
  if (navLang.startsWith('es')) return 'ES';
  if (navLang.startsWith('pt')) return 'PT';
  if (navLang.startsWith('ar')) return 'AR';
  if (navLang.startsWith('de')) return 'DE';
  if (navLang.startsWith('it')) return 'IT';
  if (navLang.startsWith('ru')) return 'RU';
  if (navLang.startsWith('zh')) return 'ZH';
  if (navLang.startsWith('ja')) return 'JA';
  if (navLang.startsWith('hi')) return 'HI';
  if (navLang.startsWith('bn')) return 'BN';
  if (navLang.startsWith('tr')) return 'TR';
  if (navLang.startsWith('id')) return 'ID';
  if (navLang.startsWith('sw')) return 'SW';
  if (navLang.startsWith('vi')) return 'VI';
  if (navLang.startsWith('ko')) return 'KO';

  return 'FR'; // Default to French
}

export interface UserLocationInfo {
  country?: string;
  flag?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  granted: boolean;
}

/**
 * Requests device location and notification permissions with polite fallback
 */
export async function requestDevicePermissions(): Promise<{
  location: UserLocationInfo;
  notificationsGranted: boolean;
}> {
  let locationInfo: UserLocationInfo = {
    granted: false,
    country: 'Sénégal',
    flag: '🇸🇳',
  };
  let notificationsGranted = false;

  // 1. Notification permission request
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        notificationsGranted = perm === 'granted';
      } else {
        notificationsGranted = Notification.permission === 'granted';
      }
    }
  } catch {
    // Unsupported or blocked
  }

  // 2. Geolocation permission request
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 7000,
          maximumAge: 300000,
          enableHighAccuracy: false,
        });
      });

      locationInfo = {
        granted: true,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch {
      // Permission denied or timed out
    }
  }

  return {
    location: locationInfo,
    notificationsGranted,
  };
}

export const requestAllDevicePermissions = requestDevicePermissions;

export function getDeviceLanguageCode(): string {
  if (typeof navigator === 'undefined') return 'fr';
  return (navigator.language || 'fr').split('-')[0].toLowerCase();
}
