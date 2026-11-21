import { UserProfile } from '../types';
import { saveUserProfile } from './userProfile';

export interface CloudSaveData {
  version: number;
  provider: 'gamecenter' | 'googleplay';
  accountId: string;
  playerName: string;
  avatar: string;
  flag: string;
  countryName: string;
  coins: number;
  gems?: number;
  level: number;
  xp: number;
  friendCode: string;
  lastSyncTimestamp: number;
  lastSyncFormatted: string;
  devicePlatform: string;
}

export function isAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const platform =
    (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    '';
  return (
    /iPad|iPhone|iPod|Macintosh|Mac OS X/i.test(userAgent) ||
    /Mac|iPhone|iPad|iPod/i.test(platform)
  );
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  return /Android/i.test(userAgent);
}

/**
 * Apple Game Center native cloud save requires an Xcode / App Store build with GameKit configured.
 * Strictly no fake mock success or free coins on Web / unconfigured builds.
 */
export async function syncWithGameCenter(
  currentProfile: UserProfile
): Promise<{ success: boolean; profile: UserProfile; message: string }> {
  return {
    success: false,
    profile: currentProfile,
    message:
      'Apple Game Center nécessite le build natif iOS (App Store / GameKit). Utilisez la connexion Google ci-dessous pour sauvegarder votre profil en ligne.',
  };
}

/**
 * Google Play Games Services requires Android Play Console OAuth + SHA-1 + Play Games App ID.
 * Strictly no fake mock success or free coins on Web / unconfigured builds.
 */
export async function syncWithGooglePlayGames(
  currentProfile: UserProfile
): Promise<{ success: boolean; profile: UserProfile; message: string }> {
  return {
    success: false,
    profile: currentProfile,
    message:
      'Google Play Jeux nécessite la publication Android (Play Console + SHA-1). Utilisez la connexion Google ci-dessous pour sauvegarder votre profil en ligne.',
  };
}

export function autoSaveProgressToCloud(_profile: UserProfile): void {
  // Real cloud auto-save is handled via Firestore in src/services/firebaseProfile.ts
}

export function disconnectGameCenter(currentProfile: UserProfile): UserProfile {
  const updated: UserProfile = {
    ...currentProfile,
    gameCenterSynced: false,
    gameCenterId: undefined,
    gameCenterUsername: undefined,
    lastGameCenterSync: undefined,
  };
  saveUserProfile(updated);
  return updated;
}

export function disconnectGooglePlay(currentProfile: UserProfile): UserProfile {
  const updated: UserProfile = {
    ...currentProfile,
    googlePlaySynced: false,
    googlePlayId: undefined,
    googlePlayUsername: undefined,
    lastGooglePlaySync: undefined,
  };
  saveUserProfile(updated);
  return updated;
}
