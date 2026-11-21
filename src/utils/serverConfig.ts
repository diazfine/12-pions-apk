import { Capacitor } from '@capacitor/core';

const DEFAULT_CLOUD_RUN_URL =
  'https://ais-pre-3lksjla3mwka57icdxz4l5-654478324591.europe-west1.run.app';

export function isNativeCapacitorApp(): boolean {
  try {
    return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getPublicAppUrl(): string {
  const envUrl = (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_PUBLIC_APP_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, '');
  }
  if (!isNativeCapacitorApp() && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return DEFAULT_CLOUD_RUN_URL;
}

export function getGameWebSocketUrl(): string {
  const envWs = (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_GAME_WS_URL;
  if (envWs && envWs.trim().length > 0) {
    return envWs.trim();
  }

  if (isNativeCapacitorApp()) {
    const baseUrl = DEFAULT_CLOUD_RUN_URL.replace(/^http/i, 'ws').replace(/\/+$/, '');
    return `${baseUrl}/ws`;
  }

  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  return `${DEFAULT_CLOUD_RUN_URL.replace(/^http/i, 'ws').replace(/\/+$/, '')}/ws`;
}
