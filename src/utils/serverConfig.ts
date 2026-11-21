import { Capacitor } from '@capacitor/core';

export const DEFAULT_REMOTE_SERVER_URL =
  'https://ais-pre-3lksjla3mwka57icdxz4l5-654478324591.europe-west1.run.app';

/**
 * Returns true only when executing inside a native mobile container (Capacitor APK / IPA),
 * never on normal Web links (including Cloud Run or local Express dev on localhost:3000).
 */
export function isNativeCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
  } catch {
    // Ignore Capacitor bridge lookup errors
  }
  const proto = window.location?.protocol || '';
  if (proto === 'capacitor:' || proto === 'ionic:' || proto === 'file:') {
    return true;
  }
  // Capacitor Android serves bundled dist assets at https://localhost (port empty)
  if (
    proto === 'https:' &&
    window.location?.hostname === 'localhost' &&
    !window.location?.port
  ) {
    return true;
  }
  return false;
}

/**
 * Returns the public HTTPS origin of the app:
 * - On Web: keeps exact `window.location.origin` (100% untouched).
 * - On APK: resolves `VITE_SERVER_URL` or the hosted Cloud Run server URL so share links never say https://localhost.
 */
export function getPublicAppUrl(): string {
  const envUrl = (import.meta.env.VITE_SERVER_URL || '').trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined' && !isNativeCapacitorApp()) {
    return window.location.origin;
  }
  return envUrl || DEFAULT_REMOTE_SERVER_URL;
}

/**
 * Returns the WebSocket endpoint for real-time 1v1 matchmaking & private friend rooms:
 * - On Web: uses same-origin `ws(s)://${window.location.host}/ws`.
 * - On APK: connects directly to the hosted backend `wss://<host>/ws` instead of dead `wss://localhost/ws`.
 */
export function getGameWebSocketUrl(): string {
  const envWs = (import.meta.env.VITE_WS_URL || '').trim();
  if (typeof window !== 'undefined' && !isNativeCapacitorApp()) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  if (envWs) {
    return envWs.endsWith('/ws') ? envWs : `${envWs.replace(/\/+$/, '')}/ws`;
  }
  const baseUrl = getPublicAppUrl();
  try {
    const parsed = new URL(baseUrl);
    const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${parsed.host}/ws`;
  } catch {
    return 'wss://ais-pre-3lksjla3mwka57icdxz4l5-654478324591.europe-west1.run.app/ws';
  }
}

/**
 * Safe clipboard write with DOM fallback for older Android WebViews.
 */
export async function copyTextSafely(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }
  return false;
}
