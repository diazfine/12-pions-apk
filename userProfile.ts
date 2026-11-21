import { UserProfile, FriendItem, DailyMission, NotificationItem } from '../types';
import { persistProgressToFirestore } from '../services/firebaseProfile';

const PROFILE_KEY = 'dama_user_profile_v2';
const FRIENDS_KEY = 'd12_friends_clean_v3';
const MISSIONS_KEY = 'dama_missions_v1';
const NOTIFICATIONS_KEY = 'd12_official_notifications_clean_v5';

export interface CountryFlagOption {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRY_FLAGS: CountryFlagOption[] = [
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
  { code: 'CI', name: 'Côte d’Ivoire', flag: '🇨🇮' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'CD', name: 'RD Congo', flag: '🇨🇩' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'MR', name: 'Mauritanie', flag: '🇲🇷' },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
  { code: 'UN', name: 'International', flag: '🌍' },
];

export const AVATAR_OPTIONS = ['👑', '🦁', '🦅', '🐺', '⚡', '💎', '🐉', '🥷', '🧙', '🐯', '🤴', '👸'];

export function getOrCreateUserProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        coins: typeof parsed.coins === 'number' && !isNaN(parsed.coins) ? parsed.coins : 2500,
        level: typeof parsed.level === 'number' && parsed.level > 0 ? parsed.level : 1,
        xp: typeof parsed.xp === 'number' && !isNaN(parsed.xp) ? parsed.xp : 150,
        flag: parsed.flag || '🇸🇳',
        countryName: parsed.countryName || 'Sénégal',
        authProvider: parsed.authProvider || 'guest',
      };
    }
  } catch (e) {
    console.error(e);
  }

  // Generate a random 4-digit code
  const codeNum = Math.floor(1000 + Math.random() * 9000);
  const initialProfile: UserProfile = {
    name: 'Champion_Royal',
    avatar: '👑',
    flag: '🇸🇳',
    countryName: 'Sénégal',
    authProvider: 'guest',
    coins: 2500, // 2500 pièces d'or de bienvenue
    level: 1,
    xp: 150,
    friendCode: `PION-${codeNum}`,
  };

  saveUserProfile(initialProfile);
  return initialProfile;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    if (profile.authProvider === 'google') {
      void persistProgressToFirestore(profile);
    }
  } catch (e) {
    console.error(e);
  }
}

export function getInitialNotifications(): NotificationItem[] {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }

  const defaultNotifications: NotificationItem[] = [
    {
      id: 'notif_welcome',
      title: 'notifWelcomeTitle',
      message: 'notifWelcomeDesc',
      type: 'system',
      icon: '👑',
      timestamp: 'today',
      isRead: false,
      actionLabel: 'play',
      actionTarget: 'play',
    },
    {
      id: 'notif_multiplayer',
      title: 'notifMultiplayerTitle',
      message: 'notifMultiplayerDesc',
      type: 'system',
      icon: '🌐',
      timestamp: 'today',
      isRead: false,
      actionLabel: 'chat',
      actionTarget: 'friends',
    },
    {
      id: 'notif_roadmap',
      title: 'notifRoadmapTitle',
      message: 'notifRoadmapDesc',
      type: 'system',
      icon: '🚀',
      timestamp: 'today',
      isRead: false,
      actionLabel: 'consult',
      actionTarget: 'profile',
    },
  ];

  saveNotifications(defaultNotifications);
  return defaultNotifications;
}

export function generateFreshNotifications(): NotificationItem[] {
  const pool: NotificationItem[] = [
    {
      id: `notif_welcome_${Date.now()}`,
      title: 'notifWelcomeTitle',
      message: 'notifWelcomeDesc',
      type: 'system',
      icon: '👑',
      timestamp: 'justNow',
      isRead: false,
      actionLabel: 'play',
      actionTarget: 'play',
    },
    {
      id: `notif_multiplayer_${Date.now()}`,
      title: 'notifMultiplayerTitle',
      message: 'notifMultiplayerDesc',
      type: 'system',
      icon: '🌐',
      timestamp: '5 min',
      isRead: false,
      actionLabel: 'chat',
      actionTarget: 'friends',
    },
    {
      id: `notif_roadmap_${Date.now()}`,
      title: 'notifRoadmapTitle',
      message: 'notifRoadmapDesc',
      type: 'system',
      icon: '🚀',
      timestamp: '10 min',
      isRead: false,
      actionLabel: 'consult',
      actionTarget: 'profile',
    },
    {
      id: `notif_tactic_${Date.now()}`,
      title: 'notifTacticTitle',
      message: 'notifTacticDesc',
      type: 'system',
      icon: '🎯',
      timestamp: '15 min',
      isRead: false,
    },
  ];

  saveNotifications(pool);
  return pool;
}

export function saveNotifications(notifications: NotificationItem[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error(e);
  }
}

export function getInitialFriends(): FriendItem[] {
  try {
    const saved = localStorage.getItem(FRIENDS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }

  // Base de départ totalement propre, naturelle et ouverte (aucun bot dans les amis)
  const initialFriends: FriendItem[] = [];
  saveFriends(initialFriends);
  return initialFriends;
}

export function saveFriends(friends: FriendItem[]): void {
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  } catch (e) {
    console.error(e);
  }
}

export function getDailyMissions(): DailyMission[] {
  try {
    const saved = localStorage.getItem(MISSIONS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }

  const defaultMissions: DailyMission[] = [
    {
      id: 'm1',
      title: 'Chasseur de Pions',
      desc: 'Effectuer 3 captures de pions',
      target: 3,
      current: 0,
      rewardCoins: 300,
      rewardXp: 150,
      completed: false,
      claimed: false,
      icon: '🎯',
    },
    {
      id: 'm2',
      title: 'Victoire Royale',
      desc: 'Remporter 1 partie',
      target: 1,
      current: 0,
      rewardCoins: 500,
      rewardXp: 250,
      completed: false,
      claimed: false,
      icon: '🏆',
    },
    {
      id: 'm3',
      title: 'Couronnement',
      desc: 'Promouvoir un pion en Dame',
      target: 1,
      current: 0,
      rewardCoins: 400,
      rewardXp: 200,
      completed: false,
      claimed: false,
      icon: '👑',
    },
    {
      id: 'm4',
      title: 'Roue de la Chance',
      desc: 'Tourner la roue de la fortune',
      target: 1,
      current: 0,
      rewardCoins: 250,
      rewardXp: 100,
      completed: false,
      claimed: false,
      icon: '🎁',
    },
  ];

  saveDailyMissions(defaultMissions);
  return defaultMissions;
}

export function saveDailyMissions(missions: DailyMission[]): void {
  try {
    localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredNotifications(): NotificationItem[] {
  return getInitialNotifications();
}

export function markAllNotificationsAsRead(): void {
  const notifs = getStoredNotifications();
  const updated = notifs.map(n => ({ ...n, isRead: true }));
  saveNotifications(updated);
}

export function markNotificationAsRead(id: string): void {
  const notifs = getStoredNotifications();
  const updated = notifs.map(n => (n.id === id ? { ...n, isRead: true } : n));
  saveNotifications(updated);
}

export function clearAllNotifications(): void {
  try {
    localStorage.removeItem(NOTIFICATIONS_KEY);
  } catch (e) {
    console.error(e);
  }
}
