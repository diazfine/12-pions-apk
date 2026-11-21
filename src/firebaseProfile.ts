import type { User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserStats } from '../types';
import { defaultStats, loadUserStats, saveUserStats } from '../utils/statsStorage';

const PROFILE_KEY = 'dama_user_profile_v2';
const EQUIPPED_BOARD_KEY = 'equipped_board_theme';
const EQUIPPED_PAWNS_KEY = 'equipped_pawns_skin';
const OWNED_ITEMS_KEY = 'owned_shop_items';

interface FirestoreWinLoss {
  wins: number;
  losses: number;
}

interface FirestoreStatsPayload {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  bestCombo: number;
  totalCaptures: number;
  totalQueens: number;
  vsAiEasy: FirestoreWinLoss;
  vsAiMedium: FirestoreWinLoss;
  vsAiHard: FirestoreWinLoss;
  vsLocal: FirestoreWinLoss;
  vsOnline: FirestoreWinLoss;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function clampStr(value: unknown, maxLength: number, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function sanitizeFriendCode(code: unknown): string {
  if (typeof code === 'string') {
    const upper = code.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
    if (upper.length >= 4) return upper;
  }
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `PION-${randomDigits}`;
}

function sanitizePhotoUrl(photo: unknown): string | undefined {
  if (typeof photo !== 'string') return undefined;
  const trimmed = photo.trim();
  if (!trimmed || trimmed.length > 500) return undefined;
  // Never store large base64 data URLs inside Firestore; keep only HTTPS avatar URLs
  if (!trimmed.startsWith('https://')) return undefined;
  return trimmed;
}

function sanitizeStats(rawStats?: Partial<UserStats>): FirestoreStatsPayload {
  const s = { ...defaultStats, ...(rawStats || {}) };
  return {
    gamesPlayed: clampInt(s.gamesPlayed, 0, 10000000, 0),
    gamesWon: clampInt(s.gamesWon, 0, 10000000, 0),
    gamesLost: clampInt(s.gamesLost, 0, 10000000, 0),
    draws: clampInt(s.draws, 0, 10000000, 0),
    currentStreak: clampInt(s.currentStreak, 0, 1000000, 0),
    bestStreak: clampInt(s.bestStreak, 0, 1000000, 0),
    bestCombo: clampInt(s.bestCombo, 0, 1000, 0),
    totalCaptures: clampInt(s.totalCaptures, 0, 100000000, 0),
    totalQueens: clampInt(s.totalQueens, 0, 10000000, 0),
    vsAiEasy: {
      wins: clampInt(s.vsAiEasy?.wins, 0, 10000000, 0),
      losses: clampInt(s.vsAiEasy?.losses, 0, 10000000, 0),
    },
    vsAiMedium: {
      wins: clampInt(s.vsAiMedium?.wins, 0, 10000000, 0),
      losses: clampInt(s.vsAiMedium?.losses, 0, 10000000, 0),
    },
    vsAiHard: {
      wins: clampInt(s.vsAiHard?.wins, 0, 10000000, 0),
      losses: clampInt(s.vsAiHard?.losses, 0, 10000000, 0),
    },
    vsLocal: {
      wins: clampInt(s.vsLocal?.wins, 0, 10000000, 0),
      losses: clampInt(s.vsLocal?.losses, 0, 10000000, 0),
    },
    vsOnline: {
      wins: clampInt(s.vsOnline?.wins, 0, 10000000, 0),
      losses: clampInt(s.vsOnline?.losses, 0, 10000000, 0),
    },
  };
}

function getLocalShopState(): {
  equippedBoard: string;
  equippedPawns: string;
  ownedItems: string[];
} {
  let equippedBoard = 'board_emerald';
  let equippedPawns = 'pawns_classic';
  let ownedItems = ['board_emerald', 'pawns_classic'];

  try {
    equippedBoard = clampStr(localStorage.getItem(EQUIPPED_BOARD_KEY), 64, 'board_emerald');
    equippedPawns = clampStr(localStorage.getItem(EQUIPPED_PAWNS_KEY), 64, 'pawns_classic');
    const rawOwned = localStorage.getItem(OWNED_ITEMS_KEY);
    if (rawOwned) {
      const parsed = JSON.parse(rawOwned);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim().slice(0, 64))
          .slice(0, 50);
        if (cleaned.length > 0) {
          ownedItems = cleaned;
        }
      }
    }
  } catch {
    // Keep defaults
  }

  return { equippedBoard, equippedPawns, ownedItems };
}

function applyShopStateLocally(equippedBoard: string, equippedPawns: string, ownedItems: string[]): void {
  try {
    localStorage.setItem(EQUIPPED_BOARD_KEY, equippedBoard);
    localStorage.setItem(EQUIPPED_PAWNS_KEY, equippedPawns);
    localStorage.setItem(OWNED_ITEMS_KEY, JSON.stringify(ownedItems));
  } catch {
    // Ignore storage quota errors
  }
}

function saveLocalProfileOnly(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

function isPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const message = (err as { message?: string }).message || '';
  return code === 'permission-denied' || message.includes('Missing or insufficient permissions');
}

function isNetworkOfflineError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const message = (err as { message?: string }).message || '';
  return (
    code === 'unavailable' ||
    message.includes('the client is offline') ||
    message.includes('Failed to get document because the client is offline')
  );
}

/**
 * Synchronizes a real authenticated Google FirebaseUser with Firestore (`users/{uid}` and `users/{uid}/private/info`).
 * - If a cloud profile already exists, restores the player's cloud coins, gems, level, XP, stats, and cosmetics.
 * - If it's a brand-new Google account, atomically initializes both documents and grants the one-time bonus.
 */
export async function syncGoogleUserToFirestore(
  firebaseUser: FirebaseUser,
  localProfile: UserProfile,
  options: { grantFirstTimeBonus: boolean } = { grantFirstTimeBonus: true }
): Promise<{ profile: UserProfile; isNewCloudAccount: boolean; bonusCoinsGranted: number }> {
  const uid = firebaseUser.uid;
  const userDocPath = `users/${uid}`;
  const privateDocPath = `users/${uid}/private/info`;
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.GET, userDocPath);
    }
    throw err;
  }

  const localStats = loadUserStats();
  const localShop = getLocalShopState();
  const googleDisplayName = clampStr(
    firebaseUser.displayName || localProfile.name,
    30,
    'Champion_Google'
  );
  const googlePhotoUrl = sanitizePhotoUrl(firebaseUser.photoURL);
  const googleEmail = firebaseUser.email ? clampStr(firebaseUser.email, 254, '') : '';

  if (existingSnap.exists()) {
    const data = existingSnap.data();
    const alreadyClaimedSyncBonus = Boolean(data.googleSyncBonusClaimed);
    const shouldGrantSyncBonus = options.grantFirstTimeBonus && !alreadyClaimedSyncBonus;
    const bonusCoinsGranted = shouldGrantSyncBonus ? 1000 : 0;

    const restoredStats = sanitizeStats(data.stats as Partial<UserStats>);
    saveUserStats(restoredStats);

    const restoredBoard = clampStr(data.equippedBoard, 64, localShop.equippedBoard);
    const restoredPawns = clampStr(data.equippedPawns, 64, localShop.equippedPawns);
    const restoredOwned =
      Array.isArray(data.ownedItems) && data.ownedItems.length > 0
        ? data.ownedItems
            .filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
            .slice(0, 50)
        : localShop.ownedItems;
    applyShopStateLocally(restoredBoard, restoredPawns, restoredOwned);

    const mergedCoins = clampInt(data.coins, 0, 100000000, 2500) + bonusCoinsGranted;
    const mergedGems = clampInt(data.gems, 0, 1000000, 10);

    const syncedProfile: UserProfile = {
      ...localProfile,
      uid,
      name: clampStr(data.name, 30, googleDisplayName),
      avatar: clampStr(data.avatar, 16, localProfile.avatar || '👑'),
      customPhoto: sanitizePhotoUrl(data.photoUrl) || googlePhotoUrl || localProfile.customPhoto,
      flag: clampStr(data.flag, 16, localProfile.flag || '🇸🇳'),
      countryName: clampStr(data.countryName, 80, localProfile.countryName || 'Sénégal'),
      email: googleEmail || localProfile.email,
      authProvider: 'google',
      coins: mergedCoins,
      gems: mergedGems,
      level: clampInt(data.level, 1, 1000, 1),
      xp: clampInt(data.xp, 0, 100000000, 150),
      friendCode: sanitizeFriendCode(data.friendCode || localProfile.friendCode),
      lastSpinDate: typeof data.lastSpinDate === 'string' ? data.lastSpinDate : localProfile.lastSpinDate,
      lastFreeBonusDate:
        typeof data.lastFreeBonusDate === 'string'
          ? data.lastFreeBonusDate
          : localProfile.lastFreeBonusDate,
      welcomeBonusClaimed: Boolean(data.welcomeBonusClaimed ?? true),
      googleSyncBonusClaimed: true,
    };

    if (shouldGrantSyncBonus || (googlePhotoUrl && data.photoUrl !== googlePhotoUrl)) {
      const updatePayload: Record<string, unknown> = {
        coins: mergedCoins,
        googleSyncBonusClaimed: true,
        updatedAt: serverTimestamp(),
      };
      if (googlePhotoUrl) {
        updatePayload.photoUrl = googlePhotoUrl;
      }
      try {
        await updateDoc(userRef, updatePayload);
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.UPDATE, userDocPath);
        }
        throw err;
      }
    }

    if (googleEmail) {
      try {
        const privSnap = await getDoc(privateRef);
        if (!privSnap.exists()) {
          const batch = writeBatch(db);
          batch.set(privateRef, {
            uid,
            email: googleEmail,
            authProvider: 'google',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        } else if (privSnap.data().email !== googleEmail) {
          await updateDoc(privateRef, {
            email: googleEmail,
            authProvider: 'google',
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          handleFirestoreError(err, OperationType.WRITE, privateDocPath);
        }
        throw err;
      }
    }

    saveLocalProfileOnly(syncedProfile);
    return {
      profile: syncedProfile,
      isNewCloudAccount: false,
      bonusCoinsGranted,
    };
  }

  // Brand-new cloud account: grant first-time bonus once if eligible
  const canGrantBonus = options.grantFirstTimeBonus && !localProfile.googleSyncBonusClaimed;
  const bonusCoinsGranted = canGrantBonus ? 1000 : 0;
  const bonusGemsGranted = canGrantBonus && !localProfile.welcomeBonusClaimed ? 10 : 0;

  const initialCoins = clampInt(localProfile.coins, 0, 100000000, 2500) + bonusCoinsGranted;
  const initialGems = clampInt(localProfile.gems, 0, 1000000, 10) + bonusGemsGranted;
  const initialLevel = clampInt(localProfile.level, 1, 1000, 1);
  const initialXp = clampInt(localProfile.xp, 0, 100000000, 150);
  const friendCode = sanitizeFriendCode(localProfile.friendCode);
  const avatar = clampStr(localProfile.avatar, 16, '👑');
  const flag = clampStr(localProfile.flag, 16, '🇸🇳');
  const countryName = clampStr(localProfile.countryName, 80, 'Sénégal');
  const cleanStats = sanitizeStats(localStats);

  const newUserDoc: Record<string, unknown> = {
    uid,
    name: googleDisplayName,
    avatar,
    flag,
    countryName,
    authProvider: 'google',
    coins: initialCoins,
    gems: initialGems,
    level: initialLevel,
    xp: initialXp,
    friendCode,
    welcomeBonusClaimed: true,
    googleSyncBonusClaimed: true,
    equippedBoard: localShop.equippedBoard,
    equippedPawns: localShop.equippedPawns,
    ownedItems: localShop.ownedItems,
    stats: cleanStats,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (googlePhotoUrl) {
    newUserDoc.photoUrl = googlePhotoUrl;
  }
  if (typeof localProfile.lastSpinDate === 'string' && localProfile.lastSpinDate.trim()) {
    newUserDoc.lastSpinDate = clampStr(localProfile.lastSpinDate, 20, '');
  }
  if (typeof localProfile.lastFreeBonusDate === 'string' && localProfile.lastFreeBonusDate.trim()) {
    newUserDoc.lastFreeBonusDate = clampStr(localProfile.lastFreeBonusDate, 20, '');
  }

  try {
    const batch = writeBatch(db);
    batch.set(userRef, newUserDoc);
    if (googleEmail) {
      batch.set(privateRef, {
        uid,
        email: googleEmail,
        authProvider: 'google',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.CREATE, userDocPath);
    }
    throw err;
  }

  const createdProfile: UserProfile = {
    ...localProfile,
    uid,
    name: googleDisplayName,
    avatar,
    customPhoto: googlePhotoUrl || localProfile.customPhoto,
    flag,
    countryName,
    email: googleEmail || localProfile.email,
    authProvider: 'google',
    coins: initialCoins,
    gems: initialGems,
    level: initialLevel,
    xp: initialXp,
    friendCode,
    welcomeBonusClaimed: true,
    googleSyncBonusClaimed: true,
  };

  saveLocalProfileOnly(createdProfile);
  return {
    profile: createdProfile,
    isNewCloudAccount: true,
    bonusCoinsGranted,
  };
}

/**
 * Loads the authenticated user's profile and progression from Firestore on session restore.
 */
export async function loadCloudProfileForUser(
  firebaseUser: FirebaseUser,
  localFallback: UserProfile
): Promise<UserProfile> {
  const result = await syncGoogleUserToFirestore(firebaseUser, localFallback, {
    grantFirstTimeBonus: false,
  });
  return result.profile;
}

/**
 * Persists profile edits, coins, gems, level, XP, shop cosmetics, and stats to Firestore
 * for the currently signed-in verified Google user.
 */
export async function persistProgressToFirestore(
  profile: UserProfile,
  explicitStats?: UserStats
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified || profile.authProvider !== 'google') {
    return;
  }

  const uid = currentUser.uid;
  const userDocPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  const shop = getLocalShopState();
  const stats = sanitizeStats(explicitStats || loadUserStats());

  const updatePayload: Record<string, unknown> = {
    name: clampStr(profile.name, 30, currentUser.displayName || 'Champion_Google'),
    avatar: clampStr(profile.avatar, 16, '👑'),
    flag: clampStr(profile.flag, 16, '🇸🇳'),
    countryName: clampStr(profile.countryName, 80, 'Sénégal'),
    coins: clampInt(profile.coins, 0, 100000000, 0),
    gems: clampInt(profile.gems, 0, 1000000, 10),
    level: clampInt(profile.level, 1, 1000, 1),
    xp: clampInt(profile.xp, 0, 100000000, 0),
    welcomeBonusClaimed: Boolean(profile.welcomeBonusClaimed ?? true),
    googleSyncBonusClaimed: Boolean(profile.googleSyncBonusClaimed ?? true),
    equippedBoard: shop.equippedBoard,
    equippedPawns: shop.equippedPawns,
    ownedItems: shop.ownedItems,
    stats,
    updatedAt: serverTimestamp(),
  };

  const photoUrl = sanitizePhotoUrl(profile.customPhoto || currentUser.photoURL);
  if (photoUrl) {
    updatePayload.photoUrl = photoUrl;
  }
  if (typeof profile.lastSpinDate === 'string' && profile.lastSpinDate.trim()) {
    updatePayload.lastSpinDate = clampStr(profile.lastSpinDate, 20, '');
  }
  if (typeof profile.lastFreeBonusDate === 'string' && profile.lastFreeBonusDate.trim()) {
    updatePayload.lastFreeBonusDate = clampStr(profile.lastFreeBonusDate, 20, '');
  }

  try {
    await updateDoc(userRef, updatePayload);
  } catch (err) {
    if (isNetworkOfflineError(err)) {
      // Allow local offline play cleanly; cloud sync will catch up on reconnect
      return;
    }
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.UPDATE, userDocPath);
    }
    console.warn('Firestore progress sync warning:', err);
  }
}
