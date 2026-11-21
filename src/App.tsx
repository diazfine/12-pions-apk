import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Board,
  Coord,
  Difficulty,
  GameSettings,
  Language,
  LastMove,
  MoveHistoryItem,
  PieceColor,
  Screen,
  TournamentMatch,
  TournamentParticipant,
  TournamentState,
  ValidMove,
} from './types';
import {
  createInitialBoard,
  countPieces,
  calculateValidMoves,
  getAllCapturingPieces,
  selectPunishedPiece,
  applyPromotions,
  chooseBestAIMove,
  getCapturesOnBoard,
  getAIMoves,
  BOARD_SIZE,
  getBoardKey,
  recordAIMatchOutcome,
} from './utils/gameLogic';
import { sound } from './utils/audio';
import { socket } from './utils/gameSocket';
import { LNG, Translations, getTranslations } from './utils/translations';
import { recordGameResult } from './utils/statsStorage';
import { OnlineChannel } from './utils/onlineChannel';
import { isVirtualProfileOrBot } from './utils/virtualProfiles';
import {
  loadActiveTournament,
  saveActiveTournament,
  applyMatchResult,
  advanceRoundAiMatches,
  getNextReadyMatch,
} from './utils/tournamentLogic';
import { GameBoard } from './components/GameBoard';
import { GameHeader } from './components/GameHeader';
import { RulesScreen } from './components/RulesScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { StatsScreen } from './components/StatsScreen';
import { PuzzlesScreen } from './components/PuzzlesScreen';
import { OnlineMatchmakingScreen } from './components/OnlineMatchmakingScreen';
import { TournamentScreen } from './components/TournamentScreen';
import { MoveHistoryBar } from './components/MoveHistoryBar';
import { FriendVsMode } from './components/FriendVsMode';
import { DailySpinModal } from './components/DailySpinModal';
import { ShopModal } from './components/ShopModal';
import { GameChatOverlay, ActiveInGameChatBubble } from './components/GameChatOverlay';
import { ChatSocialModal } from './components/ChatSocialModal';
import { StartupSplashLogo } from './components/StartupSplashLogo';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { LudoKingHomeScreen } from './components/LudoKingHomeScreen';
import { FireworksCelebration } from './components/FireworksCelebration';
import { UserProfileModal } from './components/UserProfileModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ShareSocialModal } from './components/ShareSocialModal';
import { LocalPlayersModal } from './components/LocalPlayersModal';
import { OfflineNoticeModal } from './components/OfflineNoticeModal';
import {
  detectDeviceLanguage,
  requestAllDevicePermissions,
  getDeviceLanguageCode,
} from './utils/devicePermissions';
import { App as CapApp } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  UserProfile,
  FriendItem,
  DailyMission,
  LastOpponent,
  FriendRequestItem,
  SentFriendRequestItem,
} from './types';
import {
  getOrCreateUserProfile,
  saveUserProfile,
  getInitialFriends,
  saveFriends,
  getDailyMissions,
  saveDailyMissions,
  getStoredNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  clearAllNotifications,
  generateFreshNotifications,
} from './utils/userProfile';
import {
  AIModal,
  ConfirmLeaveModal,
  GameOverModal,
  PauseModal,
  SettingsModal,
  ExitAppModal,
  NewGameConfirmModal,
} from './components/Modals';
import { AuthOnboardingModal } from './components/AuthOnboardingModal';
import { getSessionToken, saveSessionToken } from './utils/nativeAuth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, testFirestoreConnection } from './firebase';
import { isInteractiveAuthSyncActive, loadCloudProfileForUser } from './services/firebaseProfile';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { TranslationProvider, getSavedOrDeviceLanguage, formatNumber, formatDigits } from './i18n';
import { Users, Bot, UserCheck, Globe, Trophy, Settings, BookOpen, Sparkles, BarChart3, Wifi, ChevronRight, Crown, Gift, MessageCircle, Target } from 'lucide-react';

if (typeof window !== 'undefined') {
  (window as any).Capacitor = (window as any).Capacitor || {};
  (window as any).Capacitor.Plugins = (window as any).Capacitor.Plugins || {};
  (window as any).Capacitor.Plugins.App = (window as any).Capacitor.Plugins.App || CapApp;
  try {
    StatusBar.hide().catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  } catch {}
}

export default function App() {
  const [isAppTerminated, setIsAppTerminated] = useState<boolean>(false);
  // ─── SETTINGS & LOCALIZATION (Auto-detected from device or saved choice) ───
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const stored = localStorage.getItem('dama_settings_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          music: parsed.music ?? true,
          sfx: parsed.sfx ?? true,
          vibration: parsed.vibration ?? true,
          timer: true,
          language: parsed.language || getSavedOrDeviceLanguage(),
          showCoords: parsed.showCoords ?? false,
          showMoveHistory: parsed.showMoveHistory ?? false,
        };
      }
    } catch {}
    return {
      music: true,
      sfx: true,
      vibration: true,
      timer: true,
      language: getSavedOrDeviceLanguage(),
      showCoords: false,
      showMoveHistory: false,
    };
  });

  const t: Translations = useMemo(() => getTranslations(settings.language), [settings.language]);
  const tRef = useRef<Translations>(t);
  tRef.current = t;

  // ─── SCREENS & MODALS ───
  const [screen, setScreen] = useState<Screen>('menu');
  
  // ─── STARTUP SEQUENCING (Étape 1: SG -> Étape 2: 12 PIONS -> Étape 3: Inscription) ───
  const [startupPhase, setStartupPhase] = useState<'sg_publisher' | 'game_loading' | 'completed'>('sg_publisher');
  const [splashProgress, setSplashProgress] = useState<number>(0);

  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [isFriendModalOpen, setIsFriendModalOpen] = useState<boolean>(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState<boolean>(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // ─── GAMING RETENTION & SOCIAL (LUDO KING STYLE) ───
  const [userProfile, setUserProfile] = useState<UserProfile>(() => getOrCreateUserProfile());
  const [friends, setFriends] = useState<FriendItem[]>(() => getInitialFriends());
  const friendsRef = useRef<FriendItem[]>(friends);
  friendsRef.current = friends;
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendRequestItem[]>(() => {
    try {
      const s = localStorage.getItem('d12_incoming_requests_v3');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [sentFriendRequests, setSentFriendRequests] = useState<SentFriendRequestItem[]>(() => {
    try {
      const s = localStorage.getItem('d12_sent_friend_requests_v3');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) =>
            typeof item === 'string'
              ? { id: item, name: item, avatar: '👑', flag: '🌍', date: 'today' }
              : item
          );
        }
      }
    } catch {}
    return [];
  });
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>(() => getDailyMissions());
  const [notifications, setNotifications] = useState(() => getStoredNotifications());
  const [isSpinModalOpen, setIsSpinModalOpen] = useState<boolean>(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState<boolean>(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState<boolean>(false);
  const isFriendsModalOpenRef = useRef<boolean>(isFriendsModalOpen);
  isFriendsModalOpenRef.current = isFriendsModalOpen;
  const isChatConversationOpenRef = useRef<boolean>(false);
  const [hasUnreadChatMessages, setHasUnreadChatMessages] = useState<boolean>(false);
  const [totalUnreadChatMessages, setTotalUnreadChatMessages] = useState<number>(0);

  useEffect(() => {
    if (isFriendsModalOpen && totalUnreadChatMessages === 0) {
      setHasUnreadChatMessages(false);
    }
  }, [isFriendsModalOpen, totalUnreadChatMessages]);

  const [challengeTargetFriend, setChallengeTargetFriend] = useState<FriendItem | null>(null);
  const [directDuelRoomCode, setDirectDuelRoomCode] = useState<string | null>(null);
  const [directDuelRole, setDirectDuelRole] = useState<'host' | 'guest'>('host');
  const [isMissionsModalOpen, setIsMissionsModalOpen] = useState<boolean>(false);
  const [isOnlineHistoryOpen, setIsOnlineHistoryOpen] = useState<boolean>(false);
  const [activeChatBubble, setActiveChatBubble] = useState<ActiveInGameChatBubble | null>(null);
  const chatBubbleTimerRef = useRef<number | null>(null);
  const [activeReaction, setActiveReaction] = useState<{ emoji: string; color: PieceColor } | null>(null);
  const [lastOpponent, setLastOpponent] = useState<LastOpponent | null>({
    id: 'opp_default',
    name: 'Ousmane Diallo',
    avatar: '🦅',
    flag: '🇸🇳',
    country: t.country_SN,
    mode: t.online,
    date: t.todayTimeFallback,
    result: 'win',
    userScore: 12,
    opponentScore: 8,
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const canSpinToday = userProfile.lastSpinDate !== todayStr;
  const canClaimFreeBonusToday = userProfile.lastFreeBonusDate !== todayStr;

  // ─── GAME STATE ───
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [turn, setTurn] = useState<PieceColor>('green');
  const [selectedCoord, setSelectedCoord] = useState<Coord | null>(null);
  const [validMoves, setValidMoves] = useState<ValidMove[]>([]);
  const [chainPiecePos, setChainPiecePos] = useState<Coord | null>(null);
  const [capturedInChain, setCapturedInChain] = useState<Record<string, boolean>>({});
  const [chainLastDir, setChainLastDir] = useState<[number, number] | null>(null);

  // ─── GAME FEEL & HIGHLIGHTS ───
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [promotingCoord, setPromotingCoord] = useState<Coord | null>(null);

  // ─── MULTIPLAYER & MODES ───
  const [aiMode, setAiMode] = useState<boolean>(false);
  const [aiDiff, setAiDiff] = useState<Difficulty>('medium');
  const [playerColor, setPlayerColor] = useState<PieceColor>('green');
  const [boardFlipped, setBoardFlipped] = useState<boolean>(true);

  // ─── ONLINE P2P STATE ───
  const [onlineMode, setOnlineMode] = useState<boolean>(false);
  const [onlineRoomId, setOnlineRoomId] = useState<string>('');
  const [isOnlineHost, setIsOnlineHost] = useState<boolean>(false);
  const [isOnlineConnected, setIsOnlineConnected] = useState<boolean>(false);
  const [isOnlineGameStarted, setIsOnlineGameStarted] = useState<boolean>(false);
  const onlineChannelRef = useRef<OnlineChannel | null>(null);

  // ─── TOURNAMENT STATE ───
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(() => loadActiveTournament());
  const [activeTournamentMatch, setActiveTournamentMatch] = useState<{
    match: TournamentMatch;
    p1: TournamentParticipant;
    p2: TournamentParticipant;
  } | null>(null);
  const [tournamentEndInfo, setTournamentEndInfo] = useState<{
    roundName: string;
    winnerName: string;
    isUserWinner: boolean;
    isDraw?: boolean;
    loserName?: string;
  } | null>(null);

  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<PieceColor | 'draw' | null>(null);
  const [currentGameMode, setCurrentGameMode] = useState<'local' | 'ai' | 'friend' | 'online'>('local');
  const [endGameReason, setEndGameReason] = useState<'normal' | 'self_abandon' | 'opponent_left' | 'connection_lost' | null>(null);
  const [showFireworks, setShowFireworks] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [timerSec, setTimerSec] = useState<number>(30);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [forfeitMessage, setForfeitMessage] = useState<string | null>(null);
  const [movesCount, setMovesCount] = useState<number>(0);

  const posHistory = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);
  const timerSecRef = useRef<number>(30);
  timerSecRef.current = timerSec;
  const turnIdRef = useRef<number>(0);
  const currentTurnRef = useRef<PieceColor>(turn);
  currentTurnRef.current = turn;
  const aiTimeoutRef = useRef<number | null>(null);

  // Stats tracking for current match
  const turnCapturesCount = useRef<number>(0);
  const maxComboInMatch = useRef<number>(0);
  const totalMatchCaptures = useRef<number>(0);
  const totalMatchQueens = useRef<number>(0);

  // AI moves tracking for continuous adaptive learning
  const aiMovesTrack = useRef<{ key: string; moveStr: string }[]>([]);

  // 50-moves draw rule counter
  const movesWithoutCapture = useRef<number>(0);
  const [movesWithoutCaptureCount, setMovesWithoutCaptureCount] = useState<number>(0);
  const [punishedCoords, setPunishedCoords] = useState<Coord[] | null>(null);

  // Online network reconnection status
  const [isOnlineReconnecting, setIsOnlineReconnecting] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoinSuccess, setIsJoinSuccess] = useState<boolean>(false);

  // Device & browser back button handling (popstate, hardware key, gestures)
  const lastBackPressTime = useRef<number>(0);
  const [isExitAppModalOpen, setIsExitAppModalOpen] = useState<boolean>(false);
  const [isFirstLaunchModalOpen, setIsFirstLaunchModalOpen] = useState<boolean>(false);
  const [isNewGameConfirmModalOpen, setIsNewGameConfirmModalOpen] = useState<boolean>(false);

  // Noms des joueurs en mode Jeu Local (saisissables et modifiables)
  const [isLocalSetupModalOpen, setIsLocalSetupModalOpen] = useState<boolean>(false);
  const [localPlayer1Name, setLocalPlayer1Name] = useState<string>('');
  const [localPlayer2Name, setLocalPlayer2Name] = useState<string>('');

  // Alerte de perte de connexion Internet pour les modes En Ligne & VS Amis
  const [offlineNotice, setOfflineNotice] = useState<{ isOpen: boolean; modeTitle: string } | null>(null);

  // Synchronized mode and color refs to prevent stale closures in endgame callbacks
  const aiModeRef = useRef<boolean>(aiMode);
  aiModeRef.current = aiMode;
  const currentGameModeRef = useRef<'local' | 'ai' | 'friend' | 'online'>(currentGameMode);
  currentGameModeRef.current = currentGameMode;
  const playerColorRef = useRef<PieceColor>(playerColor);
  playerColorRef.current = playerColor;
  const onlineModeRef = useRef<boolean>(onlineMode);
  onlineModeRef.current = onlineMode;
  const screenRef = useRef<Screen>(screen);
  screenRef.current = screen;
  const isGameOverRef = useRef<boolean>(isGameOver);
  isGameOverRef.current = isGameOver;
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;
  const consecutiveTimeoutsRef = useRef<{ green: number; red: number }>({ green: 0, red: 0 });
  const boardRef = useRef<Board>(board);
  boardRef.current = board;
  const turnRef = useRef<PieceColor>(turn);
  turnRef.current = turn;
  const autoMoveLockTurnIdRef = useRef<number>(-1);
  const endGameRef = useRef<(winState: PieceColor | 'draw', reason?: 'normal' | 'self_abandon' | 'opponent_left' | 'connection_lost') => void>(() => {});

  // ─── GESTION DU CYCLE DE VIE MOBILE (JEU LOCAL & VS ORDINATEUR) ───
  // Dès qu'une interruption survient (bouton Accueil, appel entrant, multitâche, changement d'application),
  // la partie se met automatiquement en pause en gelant le minuteur et en affichant l'écran de pause.
  useEffect(() => {
    const handlePhoneInterruption = () => {
      // 1. Coupe immédiatement TOUTE lecture audio (victoire, feux d'artifice, fanfare, musique)
      sound.pauseForBackground();
      sound.killAllCelebrationAudio();

      // 2. Mise en pause du match local/IA
      if (
        screenRef.current === 'game' &&
        !isGameOverRef.current &&
        !isPausedRef.current &&
        !onlineModeRef.current &&
        (currentGameModeRef.current === 'local' || currentGameModeRef.current === 'ai' || aiModeRef.current)
      ) {
        sound.setGamePaused(true);
        setIsPaused(true);
        setIsPauseModalOpen(true);
      }
    };

    const handleVisibility = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handlePhoneInterruption();
      }
    };

    const handleBlur = () => {
      handlePhoneInterruption();
    };

    const handlePageHide = () => {
      handlePhoneInterruption();
    };

    const handleFreeze = () => {
      handlePhoneInterruption();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('freeze', handleFreeze);

    let capAppStateHandle: any = null;
    let capAppPauseHandle: any = null;
    try {
      CapApp.addListener('appStateChange', (state) => {
        if (!state.isActive) {
          handlePhoneInterruption();
        }
      }).then(h => {
        capAppStateHandle = h;
      });

      CapApp.addListener('pause', () => {
        handlePhoneInterruption();
      }).then(h => {
        capAppPauseHandle = h;
      });
    } catch {}

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('freeze', handleFreeze);
      if (capAppStateHandle && typeof capAppStateHandle.remove === 'function') {
        capAppStateHandle.remove();
      }
      if (capAppPauseHandle && typeof capAppPauseHandle.remove === 'function') {
        capAppPauseHandle.remove();
      }
    };
  }, []);

  // Mode Immersif Mobile Natif (Masquage natif Capacitor & Android Sticky Immersive sans bannière Web)
  useEffect(() => {
    const applyNativeImmersiveMode = async () => {
      try {
        await StatusBar.hide();
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setBackgroundColor({ color: '#083023' });
      } catch {}
    };

    applyNativeImmersiveMode();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        applyNativeImmersiveMode();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', applyNativeImmersiveMode);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', applyNativeImmersiveMode);
    };
  }, []);

  // Demander confirmation avant de fermer ou quitter l'application (navigateur / onglet)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    sound.vibrationEnabled = settings.vibration;
  }, [settings.vibration]);

  // Continuous looping background music: strictly silent during splash screens, fade-in upon reaching HOME menu
  useEffect(() => {
    sound.sfxEnabled = settings.sfx;
    sound.vibrationEnabled = settings.vibration;
    if (startupPhase !== 'completed') {
      sound.stopMusic();
      return;
    }
    if (settings.music) {
      if (screen === 'menu') {
        sound.startMusic('menu', true);
      } else if (screen === 'game' || screen === 'online') {
        sound.startMusic('game');
      }
    } else {
      sound.stopMusic();
    }
  }, [settings.sfx, settings.music, screen, startupPhase]);

  // Unlock WebAudio on first user gesture (strictly silent while in splash screens)
  useEffect(() => {
    const unlockAudio = () => {
      sound.initContext();
      if (startupPhase === 'completed' && settings.music) {
        if (screen === 'menu') {
          sound.startMusic('menu');
        } else if (screen === 'game' || screen === 'online') {
          sound.startMusic('game');
        }
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [settings.music, screen, startupPhase]);

  // ─── STARTUP SEQUENCING ───
  // Étape 1 : Affichage exclusif du logo éditeur SG (2 secondes)
  useEffect(() => {
    const timer = setTimeout(() => {
      setStartupPhase('game_loading');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Étape 2 : Transition vers le chargement 12 PIONS avec barre de progression
  useEffect(() => {
    if (startupPhase !== 'game_loading') return;

    const timer = setInterval(() => {
      setSplashProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setStartupPhase('completed');
            // Étape 3 : Dès la première ouverture de l'application, demander la connexion par mail, facebook ou mode invité
            try {
              const sessionToken = getSessionToken();
              const authCompleted = localStorage.getItem('auth_onboarding_completed');
              if (sessionToken && authCompleted === 'true') {
                setIsFirstLaunchModalOpen(false);
              } else {
                setIsFirstLaunchModalOpen(true);
              }
            } catch {
              setIsFirstLaunchModalOpen(true);
            }
          }, 350);
          return 100;
        }
        return prev + 10;
      });
    }, 180);

    return () => clearInterval(timer);
  }, [startupPhase]);

  const handleSkipSplash = () => {
    if (startupPhase === 'sg_publisher') {
      setStartupPhase('game_loading');
    } else if (startupPhase === 'game_loading') {
      setSplashProgress(100);
      setStartupPhase('completed');
      try {
        const sessionToken = getSessionToken();
        const authCompleted = localStorage.getItem('auth_onboarding_completed');
        if (sessionToken && authCompleted === 'true') {
          setIsFirstLaunchModalOpen(false);
        } else {
          setIsFirstLaunchModalOpen(true);
        }
      } catch {
        setIsFirstLaunchModalOpen(true);
      }
    }
  };

  // Device language detection & permissions: "adaptez toujours à la langue de l'appareil de celui qui l'utilise et il faut aussi la localisation et toutes les autres autorisations qui vont avec"
  useEffect(() => {
    // 1. Language adaptation
    try {
      const detectedLang = detectDeviceLanguage();
      setSettings(prev => ({
        ...prev,
        language: detectedLang,
      }));
    } catch {
      // Keep default
    }

    // 2. Request device permissions (geolocation, notifications)
    requestAllDevicePermissions().then(result => {
      if (result.location.granted && result.location.latitude) {
        // Location retrieved
      }
    });

    // 3. Test Firestore connectivity & restore signed-in Google user profile from Cloud
    void testFirestoreConnection();
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser || !fbUser.emailVerified || isInteractiveAuthSyncActive()) return;
      try {
        const cloudProfile = await loadCloudProfileForUser(fbUser, userProfileRef.current);
        setUserProfile(cloudProfile);
        saveSessionToken('firebase_google_session', {
          id: fbUser.uid,
          name: cloudProfile.name,
          email: cloudProfile.email,
          imageUrl: cloudProfile.customPhoto || cloudProfile.avatar,
          provider: 'google',
        });
        localStorage.setItem('auth_onboarding_completed', 'true');
        setIsFirstLaunchModalOpen(false);
      } catch (err) {
        console.warn('Cloud profile restore skipped:', err);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(current => (current === msg ? null : current));
    }, 2800);
  }, []);

  const userProfileRef = useRef<UserProfile>(userProfile);
  userProfileRef.current = userProfile;

  // 🤝 Synchronisation de la présence en direct du joueur (changement de profil + reconnexion WebSocket)
  const emitRegisterPlayer = useCallback(() => {
    const prof = userProfileRef.current;
    if (!prof) return;
    socket.emit('register_player', {
      playerId: prof.friendCode,
      friendCode: prof.friendCode,
      playerName: prof.name,
      avatar: prof.avatar,
      flag: prof.flag,
      level: prof.level,
    });
  }, []);

  useEffect(() => {
    emitRegisterPlayer();
  }, [userProfile?.name, userProfile?.avatar, userProfile?.friendCode, userProfile?.level, emitRegisterPlayer]);

  useEffect(() => {
    const onSocketConnect = () => {
      emitRegisterPlayer();
    };
    socket.on('connect', onSocketConnect);
    return () => {
      socket.off('connect', onSocketConnect);
    };
  }, [emitRegisterPlayer]);

  const handleAddFriend = useCallback((friendInput: string | (Partial<FriendItem> & { name: string })): boolean => {
    const isObj = typeof friendInput !== 'string';
    const rawName = (isObj ? friendInput.name : friendInput).trim();
    const rawCode = isObj && friendInput.friendCode ? String(friendInput.friendCode).trim().toUpperCase() : '';
    const rawId = isObj && friendInput.id ? String(friendInput.id).trim() : '';
    if (!rawName && !rawCode) return false;

    if (isVirtualProfileOrBot(rawName || rawId)) {
      showToast(tRef.current.toastFriendRequestNoReply.replace('{name}', rawName));
      return false;
    }

    const alreadyExists = friendsRef.current.some(f =>
      (rawCode && f.friendCode && f.friendCode.toUpperCase() === rawCode) ||
      (rawId && f.id === rawId) ||
      (!rawCode && rawName && f.name.toLowerCase() === rawName.toLowerCase())
    );

    const avatars = ['🦁', '👑', '🦅', '🐺', '🐆', '⚡'];
    setFriends(prev => {
      const existsInPrev = prev.some(f =>
        (rawCode && f.friendCode && f.friendCode.toUpperCase() === rawCode) ||
        (rawId && f.id === rawId) ||
        (!rawCode && rawName && f.name.toLowerCase() === rawName.toLowerCase())
      );
      if (existsInPrev) return prev;
      const resolvedCode = rawCode || (rawName.toUpperCase().startsWith('PION-') ? rawName.toUpperCase() : `PION-${Math.floor(1000 + Math.random() * 9000)}`);
      const newFriend: FriendItem = {
        id: rawId || resolvedCode || `f-${Date.now()}`,
        name: rawName.toUpperCase().startsWith('PION-') ? `${tRef.current.friendLabel}_${rawName.slice(5)}` : rawName,
        avatar: (isObj && friendInput.avatar) || avatars[Math.floor(Math.random() * avatars.length)],
        status: (isObj && friendInput.status) || 'online',
        level: (isObj && friendInput.level) || 1,
        subscribed: true,
        friendCode: resolvedCode,
        mutualGames: (isObj && friendInput.mutualGames) || 0,
      };
      const nextFriends = [newFriend, ...prev];
      saveFriends(nextFriends);
      return nextFriends;
    });

    return !alreadyExists;
  }, [showToast]);

  const handleSendFriendRequest = useCallback((target: {
    id?: string;
    name: string;
    avatar?: string;
    flag?: string;
    country?: string;
    isBot?: boolean;
    friendCode?: string;
  }) => {
    const prof = userProfileRef.current;
    const isBot = Boolean(target.isBot || isVirtualProfileOrBot(target.name || target.id, target.isBot));
    const targetCode = target.friendCode ? target.friendCode.toUpperCase() : undefined;
    const newItem: SentFriendRequestItem = {
      id: target.id || targetCode || target.name,
      name: target.name,
      avatar: target.avatar || '👑',
      flag: target.flag || '🌍',
      country: target.country || '',
      date: 'today',
      isBot,
      friendCode: targetCode,
    };

    setSentFriendRequests(prev => {
      const dup = prev.some(p =>
        (targetCode && p.friendCode && p.friendCode.toUpperCase() === targetCode) ||
        p.name.toLowerCase() === target.name.toLowerCase()
      );
      if (dup) return prev;
      const next = [...prev, newItem];
      try {
        localStorage.setItem('d12_sent_friend_requests_v3', JSON.stringify(next));
      } catch {}
      return next;
    });

    showToast(`${t.friendRequestSent} : ${target.name}`);
    socket.emit('send_friend_request', {
      targetName: target.name,
      targetId: target.id,
      targetCode,
      isBot,
      senderCode: prof.friendCode,
      senderId: prof.friendCode,
      senderName: prof.name,
      senderAvatar: prof.avatar,
      senderFlag: prof.flag,
      senderLevel: prof.level,
    });
  }, [showToast, t]);

  const handleAcceptFriendRequest = useCallback((req: FriendRequestItem) => {
    const prof = userProfileRef.current;
    setIncomingFriendRequests(prev => {
      const next = prev.filter(r =>
        r.id !== req.id &&
        !(req.friendCode && r.friendCode && r.friendCode.toUpperCase() === req.friendCode.toUpperCase())
      );
      try {
        localStorage.setItem('d12_incoming_requests_v3', JSON.stringify(next));
      } catch {}
      return next;
    });

    const friendCode = req.friendCode || req.senderPlayerId || req.id;
    handleAddFriend({
      id: friendCode,
      name: req.name,
      avatar: req.avatar || '👑',
      level: req.level || 1,
      friendCode,
      status: 'online',
      subscribed: true,
    });

    socket.emit('accept_friend_request', {
      requestId: req.id,
      senderCode: req.friendCode,
      senderId: req.senderPlayerId || req.friendCode,
      senderName: req.name,
      senderAvatar: req.avatar,
      senderFlag: req.flag,
      senderLevel: req.level,
      acceptorCode: prof.friendCode,
      acceptorId: prof.friendCode,
      acceptorName: prof.name,
      acceptorAvatar: prof.avatar,
      acceptorFlag: prof.flag,
      acceptorLevel: prof.level,
    });

    showToast(t.friendRequestAcceptedToast.replace('{name}', req.name));
  }, [handleAddFriend, showToast, t]);

  const handleDeclineFriendRequest = useCallback((reqId: string) => {
    setIncomingFriendRequests(prev => {
      const next = prev.filter(r => r.id !== reqId);
      try {
        localStorage.setItem('d12_incoming_requests_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast(t.friendRequestRefusedToast);
  }, [showToast, t]);

  const handleCancelSentFriendRequest = useCallback((targetName: string, targetId?: string, targetCode?: string) => {
    const prof = userProfileRef.current;
    setSentFriendRequests(prev => {
      const next = prev.filter(p =>
        !(targetCode && p.friendCode && p.friendCode.toUpperCase() === targetCode.toUpperCase()) &&
        !(targetId && p.id === targetId) &&
        p.name.toLowerCase() !== targetName.toLowerCase()
      );
      try {
        localStorage.setItem('d12_sent_friend_requests_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
    socket.emit('cancel_friend_request', {
      targetName,
      targetId,
      targetCode,
      senderCode: prof.friendCode,
    });
    showToast(t.inviteCancelled);
  }, [showToast, t]);

  // ⚔️ Écouteurs globaux temps réel (défis directs, demandes d'amitié, acceptations)
  useEffect(() => {
    const onFriendDuelStart = (data: any) => {
      if (!data?.roomId) return;
      setIsFriendsModalOpen(false);
      setDirectDuelRoomCode(data.roomId);
      setDirectDuelRole(data.role || 'host');
      setChallengeTargetFriend({
        id: data.opponent?.id || 'friend_opp',
        name: data.opponent?.name || tRef.current.friendLabel,
        avatar: data.opponent?.avatar || '👑',
        status: 'playing',
        level: 1,
        subscribed: true,
        friendCode: data.opponent?.friendCode || data.roomId,
      });
      showToast(tRef.current.toastChallengeAcceptedLaunch.replace('{name}', data.opponent?.name || tRef.current.opponentLabel));
      setScreen('vs_friend');
      sound.playStartSound();
      sound.startMusic('game', true);
    };

    const onIncomingFriendMessage = () => {
      if (!isFriendsModalOpenRef.current) {
        setHasUnreadChatMessages(true);
      }
    };

    const onIncomingFriendRequest = (data: any) => {
      const req = data?.request as FriendRequestItem | undefined;
      if (!req) return;
      const myCode = userProfileRef.current?.friendCode?.toUpperCase();
      if (myCode && req.friendCode && req.friendCode.toUpperCase() === myCode) return;

      setIncomingFriendRequests(prev => {
        const exists = prev.some(r =>
          (req.friendCode && r.friendCode && r.friendCode.toUpperCase() === req.friendCode.toUpperCase()) ||
          (req.senderPlayerId && r.senderPlayerId && r.senderPlayerId === req.senderPlayerId) ||
          (!req.friendCode && r.name.toLowerCase() === req.name.toLowerCase())
        );
        if (exists) return prev;
        const next = [req, ...prev];
        try {
          localStorage.setItem('d12_incoming_requests_v3', JSON.stringify(next));
        } catch {}
        return next;
      });
      if (!isFriendsModalOpenRef.current) {
        setHasUnreadChatMessages(true);
      }
      sound.playSelect();
      showToast(tRef.current.toastNewFriendRequestFrom.replace('{name}', req.name));
    };

    const onPendingFriendRequests = (data: any) => {
      if (!Array.isArray(data?.requests)) return;
      const myCode = userProfileRef.current?.friendCode?.toUpperCase();
      const filteredIncoming = (data.requests as FriendRequestItem[]).filter(
        r => !(myCode && r.friendCode && r.friendCode.toUpperCase() === myCode)
      );
      if (filteredIncoming.length === 0) return;

      setIncomingFriendRequests(prev => {
        const combined = [...filteredIncoming, ...prev];
        const unique = Array.from(
          new Map(combined.map(r => [r.friendCode ? r.friendCode.toUpperCase() : (r.id || r.name.toLowerCase()), r])).values()
        );
        try {
          localStorage.setItem('d12_incoming_requests_v3', JSON.stringify(unique));
        } catch {}
        return unique;
      });
    };

    const applyAcceptedFriend = (friendObj: any, showNotification: boolean) => {
      if (!friendObj?.name && !friendObj?.friendCode) return;
      const fCode = friendObj.friendCode ? String(friendObj.friendCode).toUpperCase() : '';
      const fId = friendObj.id ? String(friendObj.id) : '';
      const fName = String(friendObj.name || tRef.current.friendLabel);

      setSentFriendRequests(prev => {
        const next = prev.filter(p =>
          !(fCode && p.friendCode && p.friendCode.toUpperCase() === fCode) &&
          !(fId && p.id === fId) &&
          p.name.toLowerCase() !== fName.toLowerCase()
        );
        try {
          localStorage.setItem('d12_sent_friend_requests_v3', JSON.stringify(next));
        } catch {}
        return next;
      });

      handleAddFriend({
        id: fId || fCode || `f-${Date.now()}`,
        name: fName,
        avatar: friendObj.avatar || '👑',
        level: friendObj.level || 1,
        friendCode: fCode || fId,
        status: 'online',
        subscribed: true,
      });

      if (showNotification) {
        sound.playSelect();
        showToast(tRef.current.toastFriendAcceptedYourRequest.replace('{name}', fName));
      }
    };

    const onFriendRequestAccepted = (data: any) => {
      if (data?.friend) {
        applyAcceptedFriend(data.friend, true);
      }
    };

    const onPendingAcceptedFriends = (data: any) => {
      if (Array.isArray(data?.friends)) {
        data.friends.forEach((f: any, idx: number) => applyAcceptedFriend(f, idx === 0));
      }
    };

    const onFriendRequestAcceptAck = (data: any) => {
      if (data?.friend) {
        handleAddFriend({
          id: data.friend.id || data.friend.friendCode,
          name: data.friend.name || tRef.current.friendLabel,
          avatar: data.friend.avatar || '👑',
          level: data.friend.level || 1,
          friendCode: data.friend.friendCode || data.friend.id,
          status: data.friend.status || 'online',
          subscribed: true,
        });
      }
    };

    const onFriendRequestCancelled = (data: any) => {
      const sCode = data?.senderCode ? String(data.senderCode).toUpperCase() : '';
      const sName = data?.senderName ? String(data.senderName).toLowerCase() : '';
      if (!sCode && !sName) return;
      setIncomingFriendRequests(prev => {
        const next = prev.filter(r =>
          !(sCode && r.friendCode && r.friendCode.toUpperCase() === sCode) &&
          !(sName && r.name.toLowerCase() === sName)
        );
        try {
          localStorage.setItem('d12_incoming_requests_v3', JSON.stringify(next));
        } catch {}
        return next;
      });
    };

    socket.on('FRIEND_DUEL_START', onFriendDuelStart);
    socket.on('friend_duel_start', onFriendDuelStart);
    socket.on('INCOMING_FRIEND_MESSAGE', onIncomingFriendMessage);
    socket.on('INCOMING_FRIEND_REQUEST', onIncomingFriendRequest);
    socket.on('PENDING_FRIEND_REQUESTS', onPendingFriendRequests);
    socket.on('FRIEND_REQUEST_ACCEPTED', onFriendRequestAccepted);
    socket.on('PENDING_ACCEPTED_FRIENDS', onPendingAcceptedFriends);
    socket.on('FRIEND_REQUEST_ACCEPT_ACK', onFriendRequestAcceptAck);
    socket.on('FRIEND_REQUEST_CANCELLED', onFriendRequestCancelled);

    return () => {
      socket.off('FRIEND_DUEL_START', onFriendDuelStart);
      socket.off('friend_duel_start', onFriendDuelStart);
      socket.off('INCOMING_FRIEND_MESSAGE', onIncomingFriendMessage);
      socket.off('INCOMING_FRIEND_REQUEST', onIncomingFriendRequest);
      socket.off('PENDING_FRIEND_REQUESTS', onPendingFriendRequests);
      socket.off('FRIEND_REQUEST_ACCEPTED', onFriendRequestAccepted);
      socket.off('PENDING_ACCEPTED_FRIENDS', onPendingAcceptedFriends);
      socket.off('FRIEND_REQUEST_ACCEPT_ACK', onFriendRequestAcceptAck);
      socket.off('FRIEND_REQUEST_CANCELLED', onFriendRequestCancelled);
    };
  }, [showToast, handleAddFriend]);

  const handleExecuteExitApp = useCallback(() => {
    setIsExitAppModalOpen(false);
    showToast(tRef.current.toastThanksPlaying);
    try {
      (window as any).Capacitor?.Plugins?.App?.exitApp?.();
    } catch {}
    try {
      CapApp.exitApp();
    } catch {}
    try {
      window.close();
    } catch {}
    // Sur navigateur web ou mobile sans permission de fermeture, afficher l'écran d'arrêt propre
    setIsAppTerminated(true);
  }, [showToast]);

  const handleConfirmLeaveRef = useRef<() => void>(() => {});
  const handleCloseFriendModalRef = useRef<() => void>(() => {});
  const handleMenuClickRef = useRef<() => void>(() => {});

  // Keep all latest UI & navigation state in a ref to prevent listener thrashing & re-registration bugs
  const backStateRef = useRef({
    isFirstLaunchModalOpen,
    isNewGameConfirmModalOpen,
    isExitAppModalOpen,
    isLeaveModalOpen,
    isSettingsModalOpen,
    isGameOverModalOpen,
    isSpinModalOpen,
    isShopModalOpen,
    isMissionsModalOpen,
    isFriendsModalOpen,
    isProfileModalOpen,
    isNotificationsModalOpen,
    isShareModalOpen,
    isAIModalOpen,
    isFriendModalOpen,
    isPauseModalOpen,
    isLocalSetupModalOpen,
    isGameOver,
    screen,
  });

  backStateRef.current = {
    isFirstLaunchModalOpen,
    isNewGameConfirmModalOpen,
    isExitAppModalOpen,
    isLeaveModalOpen,
    isSettingsModalOpen,
    isGameOverModalOpen,
    isSpinModalOpen,
    isShopModalOpen,
    isMissionsModalOpen,
    isFriendsModalOpen,
    isProfileModalOpen,
    isNotificationsModalOpen,
    isShareModalOpen,
    isAIModalOpen,
    isFriendModalOpen,
    isPauseModalOpen,
    isLocalSetupModalOpen,
    isGameOver,
    screen,
  };

  // ─── DEVICE & BROWSER BACK-BUTTON HANDLING ───
  // Supports physical Android back buttons, browser navigation, swipe gestures, and Escape key
  useEffect(() => {
    // Prime history so popstate events can be reliably intercepted
    try {
      window.history.pushState({ app: '12pions_base' }, '', window.location.href);
    } catch {
      // Ignore in restricted iframes
    }

    const handleBackAction = () => {
      // Keep history primed
      try {
        window.history.pushState({ app: '12pions_active' }, '', window.location.href);
      } catch {
        // Ignore
      }

      const s = backStateRef.current;

      // 1. Si la modal de confirmation d'abandon est ouverte, la touche Retour la referme (annule l'abandon)
      if (s.isLeaveModalOpen) {
        setIsLeaveModalOpen(false);
        return;
      }

      // 2. Si la modal de fin de partie est affichée, la touche Retour ramène au menu principal
      if (s.isGameOverModalOpen) {
        setIsGameOverModalOpen(false);
        setShowFireworks(false);
        setForfeitMessage(null);
        setEndGameReason(null);
        if (onlineChannelRef.current) {
          onlineChannelRef.current.destroy();
          onlineChannelRef.current = null;
        }
        setOnlineMode(false);
        setIsOnlineConnected(false);
        setIsOnlineGameStarted(false);
        setActiveTournamentMatch(null);
        setTournamentEndInfo(null);
        setScreen('menu');
        sound.stopMusic();
        return;
      }

      // 3. Si la modal de sortie d'application est DÉJÀ ouverte sur le menu et que l'utilisateur appuie encore sur Retour :
      // Ferme la boîte de dialogue de confirmation en toute sécurité
      if (s.isExitAppModalOpen) {
        setIsExitAppModalOpen(false);
        return;
      }

      // 4. Fermeture des fenêtres modales par ordre de priorité
      if (s.isShopModalOpen) {
        setIsShopModalOpen(false);
        return;
      }
      if (s.isFirstLaunchModalOpen) {
        setIsFirstLaunchModalOpen(false);
        return;
      }
      if (s.isNewGameConfirmModalOpen) {
        setIsNewGameConfirmModalOpen(false);
        return;
      }
      if (s.isSettingsModalOpen) {
        setIsSettingsModalOpen(false);
        return;
      }
      if (s.isSpinModalOpen) {
        setIsSpinModalOpen(false);
        return;
      }
      if (s.isMissionsModalOpen) {
        setIsMissionsModalOpen(false);
        return;
      }
      if (s.isFriendsModalOpen) {
        if (isChatConversationOpenRef.current) {
          window.dispatchEvent(new CustomEvent('chat_modal_device_back'));
          return;
        }
        setIsFriendsModalOpen(false);
        return;
      }
      if (s.isProfileModalOpen) {
        setIsProfileModalOpen(false);
        return;
      }
      if (s.isNotificationsModalOpen) {
        setIsNotificationsModalOpen(false);
        return;
      }
      if (s.isShareModalOpen) {
        setIsShareModalOpen(false);
        return;
      }
      if (s.isAIModalOpen) {
        setIsAIModalOpen(false);
        return;
      }
      if (s.isLocalSetupModalOpen) {
        setIsLocalSetupModalOpen(false);
        return;
      }
      if (s.isFriendModalOpen) {
        handleCloseFriendModalRef.current();
        return;
      }
      if (s.isPauseModalOpen) {
        setIsPauseModalOpen(false);
        return;
      }

      // 5. GESTION DE LA TOUCHE RETOUR PHYSIQUE (ANDROID / CAPACITOR / BROWSER) :
      // En mode VS Amis ('vs_friend') et En Ligne ('online') : déclenche l'événement pour gérer l'abandon/lobby de manière synchrone
      if (s.screen === 'vs_friend' || s.screen === 'online') {
        window.dispatchEvent(new CustomEvent('vs_friend_device_back'));
        return;
      }

      // Pendant une partie de jeu ('game' / En Ligne / IA / Tournoi / Local) :
      // Fait EXACTEMENT la même chose que le bouton "Accueil" pendant une partie
      if (s.screen === 'game') {
        if (!s.isGameOver) {
          handleMenuClickRef.current();
          return;
        } else {
          setScreen('menu');
          sound.stopMusic();
          return;
        }
      }

      // 6. Si sur un autre écran (tournoi, stats, règles, classements, matchmaking), retour direct au menu principal
      if (s.screen !== 'menu') {
        sound.stopMusic();
        setScreen('menu');
        return;
      }

      // 7. Sur l'écran HOME ('menu') uniquement : intercepter le bouton Retour Android et afficher la pop-up de confirmation
      setIsExitAppModalOpen(true);
      if (sound.vibrationEnabled) {
        try {
          Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        } catch {
          // Ignore
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        // Only trigger on Backspace if user is not actively typing in an input
        if (e.key === 'Backspace') {
          const activeTag = document.activeElement?.tagName?.toLowerCase();
          if (activeTag === 'input' || activeTag === 'textarea') {
            return;
          }
        }
        e.preventDefault();
        handleBackAction();
      }
    };

    let capListenerHandle: any = null;
    try {
      CapApp.addListener('backButton', (data: any) => {
        // Empêche la fermeture forcée de l'application sur Android / Capacitor
        if (data && typeof data.preventDefault === 'function') {
          data.preventDefault();
        }
        handleBackAction();
      }).then(handle => {
        capListenerHandle = handle;
      });
    } catch {
      // Running in standard web mode
    }

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleBackAction();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      if (capListenerHandle && typeof capListenerHandle.remove === 'function') {
        capListenerHandle.remove();
      }
    };
  }, [handleExecuteExitApp]);

  // Update Settings
  const handleUpdateSetting = (key: keyof GameSettings, val: unknown) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: val, timer: true };
      try {
        localStorage.setItem('dama_settings_v2', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Helper: Notation A1..E5
  const toNotation = (r: number, c: number): string => {
    const cols = ['A', 'B', 'C', 'D', 'E'];
    return `${cols[c]}${5 - r}`;
  };

  // ─── START & RESET GAME ───
  const startNewGame = useCallback(
    (isAi: boolean, diff: Difficulty = 'medium', pColor: PieceColor = 'green') => {
      const initial = createInitialBoard();
      setBoard(initial);
      // 🎯 RÈGLE ALÉATOIRE DANS TOUS LES MODES : Tirage au sort de la couleur qui démarre (50/50)
      const startingTurn: PieceColor = Math.random() < 0.5 ? 'green' : 'red';
      setTurn(startingTurn);

      setSelectedCoord(null);
      setValidMoves([]);
      setChainPiecePos(null);
      setCapturedInChain({});
      setChainLastDir(null);

      // Reset indicators & histories
      setLastMove(null);
      setMoveHistory([]);
      setPromotingCoord(null);
      turnCapturesCount.current = 0;
      maxComboInMatch.current = 0;
      totalMatchCaptures.current = 0;
      totalMatchQueens.current = 0;

      setAiMode(isAi);
      setAiDiff(diff);
      setPlayerColor(pColor);
      setCurrentGameMode(isAi ? 'ai' : 'local');
      setEndGameReason(null);
      sound.stopVictoryCelebrationLoop(true);
      setShowFireworks(false);
      setForfeitMessage(null);

      // Orientation: Player's pieces at bottom
      if (isAi) {
        setBoardFlipped(pColor === 'green');
      } else {
        setBoardFlipped(pColor === 'green');
      }

      setIsGameOver(false);
      setWinner(null);
      setIsPaused(false);
      sound.setGamePaused(false);
      consecutiveTimeoutsRef.current = { green: 0, red: 0 };
      setPunishedCoords(null);
      setMovesCount(0);
      setTimerSec(30);
      posHistory.current = [];
      aiMovesTrack.current = [];
      movesWithoutCapture.current = 0;
      setMovesWithoutCaptureCount(0);

      setBannerMessage(null);
      setScreen('game');

      const turnText = startingTurn === 'green' ? t.tG : t.tR;
      showToast(startingTurn === 'green' ? `🟢 ${turnText}` : `🔴 ${turnText}`);

      // Le son de partie démarre au lancement du jeu et ne s'arrête qu'à la fin de partie
      if (settings.music) {
        sound.startMusic('game');
      } else {
        sound.stopMusic();
      }
    },
    [settings.music, showToast, t.tG, t.tR]
  );

  // ─── CHECK ENDGAME CONDITION ───
  const checkGameOver = useCallback(
    (currentBoard: Board, nextTurn: PieceColor): boolean => {
      // 0. Règle des 50 coups sans prise : Victoire par avantage de pions (ou Nul si stricte égalité)
      if (movesWithoutCapture.current >= 50) {
        const counts = countPieces(currentBoard);
        let winner50: PieceColor | 'draw' = 'draw';
        let msg = tRef.current.toastFiftyMoveDrawCounts.replace('{green}', String(counts.green)).replace('{red}', String(counts.red));
        if (counts.green > counts.red) {
          winner50 = 'green';
          msg = tRef.current.toastFiftyMoveGreenWin.replace('{green}', String(counts.green)).replace('{red}', String(counts.red));
        } else if (counts.red > counts.green) {
          winner50 = 'red';
          msg = tRef.current.toastFiftyMoveRedWin.replace('{red}', String(counts.red)).replace('{green}', String(counts.green));
        }
        if (onlineMode && onlineChannelRef.current) {
          onlineChannelRef.current.sendGameOver(winner50, 'draw_50_moves', msg);
        }
        endGameRef.current(winner50);
        showToast(msg);
        return true;
      }

      const counts = countPieces(currentBoard);

      // 1. All opponent pieces captured (only if other player still has pieces)
      if (counts.green === 0 && counts.red > 0) {
        endGameRef.current('red');
        return true;
      }
      if (counts.red === 0 && counts.green > 0) {
        endGameRef.current('green');
        return true;
      }

      // 2. Both players have only 1 piece and neither can capture the other -> MATCH NUL !
      if (counts.green === 1 && counts.red === 1) {
        const gCaps = getAllCapturingPieces(currentBoard, 'green');
        const rCaps = getAllCapturingPieces(currentBoard, 'red');
        if (gCaps.length === 0 && rCaps.length === 0) {
          if (onlineMode && onlineChannelRef.current) {
            onlineChannelRef.current.sendGameOver('draw', 'draw_1v1', tRef.current.toastDrawOnePawnEach);
          }
          endGameRef.current('draw');
          return true;
        }
      }

      // 3. Règle des 50 coups consécutifs sans prise : Victoire au nombre de pions restants
      if (movesWithoutCapture.current >= 50) {
        let winner50: PieceColor | 'draw' = 'draw';
        let msg = tRef.current.toastFiftyMoveDrawCounts.replace('{green}', String(counts.green)).replace('{red}', String(counts.red));
        if (counts.green > counts.red) {
          winner50 = 'green';
          msg = tRef.current.toastFiftyMoveGreenWin.replace('{green}', String(counts.green)).replace('{red}', String(counts.red));
        } else if (counts.red > counts.green) {
          winner50 = 'red';
          msg = tRef.current.toastFiftyMoveRedWin.replace('{red}', String(counts.red)).replace('{green}', String(counts.green));
        }
        if (onlineMode && onlineChannelRef.current) {
          onlineChannelRef.current.sendGameOver(winner50, 'draw_50_moves', msg);
        }
        endGameRef.current(winner50);
        showToast(msg);
        return true;
      }

      // 4. Blocked condition: active player has no legal moves (immobilized)
      const possibleMoves = getAIMoves(currentBoard, nextTurn);
      if (possibleMoves.length === 0) {
        const winningColor: PieceColor = nextTurn === 'green' ? 'red' : 'green';
        const stuckToast = nextTurn === 'green'
          ? (t.greenBlocked || '⚠️ Les Verts sont bloqués sans aucun coup légal !')
          : (t.redBlocked || '⚠️ Les Rouges sont bloqués sans aucun coup légal !');
        showToast(stuckToast);

        if (onlineMode && onlineChannelRef.current) {
          onlineChannelRef.current.sendPlayerStuck(nextTurn, winningColor, stuckToast);
        }

        endGameRef.current(winningColor, 'normal');
        return true;
      }

      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const endGame = (
    winState: PieceColor | 'draw',
    reason: 'normal' | 'self_abandon' | 'opponent_left' | 'connection_lost' = 'normal'
  ) => {
    setIsGameOver(true);
    setWinner(winState);
    setEndGameReason(reason);
    sound.stopMusic();

    const effectiveAiMode = aiModeRef.current ?? aiMode;
    const effectiveOnlineMode = onlineModeRef.current ?? onlineMode;
    const effectiveGameMode = currentGameModeRef.current ?? currentGameMode;
    const effectivePlayerColor = playerColorRef.current ?? playerColor;

    const isUserWin = winState !== 'draw' && winState === effectivePlayerColor;
    const isDraw = winState === 'draw';

    // ─── SOUNDS & VISUAL CELEBRATION DISPATCH ───
    if (effectiveGameMode === 'local' && !effectiveAiMode && !effectiveOnlineMode) {
      // Mode VS Local (2 Joueurs sur le même écran)
      if (isDraw) {
        sound.stopVictoryCelebrationLoop(true);
        sound.playDraw();
        setShowFireworks(false);
      } else {
        sound.startVictoryCelebrationLoop();
        setShowFireworks(true);
      }
    } else {
      // Modes VS Ordinateur (IA), VS Amis et En Ligne (Vue Personnelle)
      if (isDraw) {
        sound.stopVictoryCelebrationLoop(true);
        sound.playDraw();
        setShowFireworks(false);
      } else if (reason === 'self_abandon' || (!isUserWin && !isDraw)) {
        // Défaite du joueur local (notamment contre l'IA / ordinateur) : Son de défaite officiel garanti
        sound.stopVictoryCelebrationLoop();
        sound.playDefeat();
        setShowFireworks(false);
      } else if (reason === 'opponent_left' || isUserWin) {
        // Victoire du joueur local : Félicitations, vous avez gagné !
        sound.startVictoryCelebrationLoop();
        setShowFireworks(true);
      } else {
        // Match nul
        sound.stopVictoryCelebrationLoop(true);
        sound.playDraw();
        setShowFireworks(false);
      }
    }

    // Persist stats
    const currentMode = onlineMode ? 'online' : aiMode ? 'ai' : 'local';
    recordGameResult(
      winState,
      playerColor,
      currentMode,
      aiDiff,
      maxComboInMatch.current,
      totalMatchCaptures.current,
      totalMatchQueens.current
    );

    // AI Adaptive Machine Learning: record match outcome to improve strategy
    if (aiMode && winState !== 'draw') {
      const aiColor: PieceColor = playerColor === 'green' ? 'red' : 'green';
      const aiWon = winState === aiColor;
      recordAIMatchOutcome(aiMovesTrack.current, aiWon);
    }

    // Reward player with coins & XP
    const coinsReward = isUserWin ? 500 : 150;
    const xpReward = isUserWin ? 250 : 80;

    setUserProfile(prev => {
      const nextXp = prev.xp + xpReward;
      const xpThreshold = prev.level * 500;
      const nextLevel = nextXp >= xpThreshold ? prev.level + 1 : prev.level;
      const updated = {
        ...prev,
        coins: prev.coins + coinsReward,
        xp: nextXp >= xpThreshold ? nextXp - xpThreshold : nextXp,
        level: nextLevel,
      };
      saveUserProfile(updated);
      return updated;
    });

    if (currentGameMode === 'local') {
      if (winState !== 'draw') {
        const isP1Custom = localPlayer1Name && localPlayer1Name.trim() && localPlayer1Name.trim().toLowerCase() !== 'joueur 1' && localPlayer1Name.trim().toLowerCase() !== t.player1Default.toLowerCase();
        const isP2Custom = localPlayer2Name && localPlayer2Name.trim() && localPlayer2Name.trim().toLowerCase() !== 'joueur 2' && localPlayer2Name.trim().toLowerCase() !== t.player2Default.toLowerCase();
        const winMsg = winState === 'green'
          ? (isP1Custom ? t.toastLocalWinnerCustom.replace('{name}', localPlayer1Name) : t.toastLocalGreenWon)
          : (isP2Custom ? t.toastLocalWinnerCustom.replace('{name}', localPlayer2Name) : t.toastLocalRedWon);
        showToast(`🏆 ${winMsg}`);
      } else {
        showToast(t.toastDrawTwoPlayers);
      }
    } else if (isUserWin) {
      setDailyMissions(prev => {
        const updated = prev.map(m =>
          m.id === 'm2' ? { ...m, current: Math.min(m.target, m.current + 1), completed: true } : m
        );
        saveDailyMissions(updated);
        return updated;
      });
      showToast(t.toastVictoryRewards.replace('{coins}', String(coinsReward)).replace('{xp}', String(xpReward)));
    } else {
      showToast(t.toastGameFinishedRewards.replace('{coins}', String(coinsReward)).replace('{xp}', String(xpReward)));
    }

    // Record Last Opponent for Chat "Dernière lecture"
    const finalCounts = countPieces(board);
    const oppName = onlineMode
      ? (onlineRoomId ? t.opponentRoomLabel.replace('{room}', onlineRoomId) : t.worldChampionLabel)
      : aiMode
      ? `${t.computer} (${aiDiff.toUpperCase()})`
      : t.player2LocalDefault;
    const oppAvatar = onlineMode ? '🦅' : aiMode ? '🤖' : '🧔';
    const oppFlag = onlineMode ? '🌐' : '🇸🇳';
    const oppCountry = onlineMode ? t.internationalLabel : t.country_SN;
    const finalResult = isUserWin ? 'win' : winState === 'draw' ? 'draw' : 'loss';
    setLastOpponent({
      id: `opp_${Date.now()}`,
      name: oppName,
      avatar: oppAvatar,
      flag: oppFlag,
      country: oppCountry,
      mode: onlineMode ? t.online : aiMode ? t.computer : t.localPlay,
      date: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      result: finalResult,
      userScore: playerColor === 'green' ? Math.max(1, 12 - finalCounts.red) : Math.max(1, 12 - finalCounts.green),
      opponentScore: playerColor === 'green' ? Math.max(0, 12 - finalCounts.green) : Math.max(0, 12 - finalCounts.red),
    });

    // Tournament match progression
    if (activeTournamentMatch && tournamentState) {
      const { match, p1, p2 } = activeTournamentMatch;
      const isDraw = winState === 'draw';
      let winnerParticipantId: string | null = null;
      let winnerObj: TournamentParticipant | null = null;
      let loserObj: TournamentParticipant | null = null;

      if (!isDraw) {
        if (winState === 'green') {
          winnerParticipantId = playerColor === 'green' ? p1.id : p2.id;
        } else if (winState === 'red') {
          winnerParticipantId = playerColor === 'green' ? p2.id : p1.id;
        } else {
          const counts = countPieces(board);
          if (counts.green > counts.red) {
            winnerParticipantId = playerColor === 'green' ? p1.id : p2.id;
          } else if (counts.red > counts.green) {
            winnerParticipantId = playerColor === 'green' ? p2.id : p1.id;
          }
        }

        if (winnerParticipantId) {
          winnerObj = winnerParticipantId === p1.id ? p1 : p2;
          loserObj = winnerParticipantId === p1.id ? p2 : p1;
        }
      }

      const counts = countPieces(board);
      const score1 = Math.max(0, 12 - (playerColor === 'green' ? counts.red : counts.green));
      const score2 = Math.max(0, 12 - (playerColor === 'green' ? counts.green : counts.red));

      let updatedTourn = applyMatchResult(
        tournamentState,
        match.id,
        winnerParticipantId,
        score1,
        score2
      );

      // Auto-advance other bot matches in current phase so tournament transitions (Quarts -> Demis -> Finale)
      if (updatedTourn.mode !== 'local') {
        updatedTourn = advanceRoundAiMatches(updatedTourn);
      }
      setTournamentState(updatedTourn);
      saveActiveTournament(updatedTourn);

      const resolvedMatch = updatedTourn.matches.find(m => m.id === match.id);
      const effectiveWinnerId = resolvedMatch?.winnerId || winnerParticipantId;
      const effectiveWinnerObj = effectiveWinnerId ? updatedTourn.participants.find(p => p.id === effectiveWinnerId) : null;
      const effectiveLoserObj = effectiveWinnerId === p1.id ? p2 : p1;

      setTournamentEndInfo({
        roundName: match.roundName,
        winnerName: effectiveWinnerObj?.name || t.winner,
        isUserWinner: effectiveWinnerId === updatedTourn.userParticipantId,
        isDraw: false,
        loserName: effectiveLoserObj?.name || t.opponentShortLabel,
      });
    } else {
      setTournamentEndInfo(null);
    }

    setTimeout(() => {
      setIsGameOverModalOpen(true);
    }, 700);
  };
  endGameRef.current = endGame;

  // ─── TOURNAMENT MATCH HANDLERS ───
  const handleLaunchTournamentMatch = (
    match: TournamentMatch,
    p1: TournamentParticipant,
    p2: TournamentParticipant
  ) => {
    setActiveTournamentMatch({ match, p1, p2 });
    setOnlineMode(false);

    if (p1.isHuman && !p2.isHuman) {
      // User is green, AI is red
      startNewGame(true, p2.diff || 'medium', 'green');
    } else if (!p1.isHuman && p2.isHuman) {
      // AI is green, User is red
      startNewGame(true, p1.diff || 'medium', 'red');
    } else {
      // Local Pass & Play match (both human or custom)
      startNewGame(false, 'medium', 'green');
    }

    setBannerMessage(`🏆 ${match.roundName} : ${p1.name} vs ${p2.name}`);
    setScreen('game');
  };

  const handleReturnToTournament = () => {
    setIsGameOverModalOpen(false);
    setActiveTournamentMatch(null);
    setTournamentEndInfo(null);
    setScreen('tournament');
  };

  const handleTournamentBack = () => {
    setActiveTournamentMatch(null);
    setTournamentEndInfo(null);
    setScreen('menu');
  };

  const handleAbandonTournament = useCallback((returnToMenu: boolean = false) => {
    saveActiveTournament(null);
    setTournamentState(null);
    setActiveTournamentMatch(null);
    setTournamentEndInfo(null);
    try {
      localStorage.removeItem('12pions_tournament_state');
      localStorage.removeItem('kharbga_active_tournament_v1');
    } catch {}
    showToast(tRef.current.toastTournamentReset);
    if (returnToMenu) {
      setScreen('menu');
    }
  }, [showToast]);

  // ─── START ONLINE MULTIPLAYER ───
  const startOnlineGame = (
    roomId: string,
    isHost: boolean,
    color: PieceColor,
    mode: 'friend' | 'online' = 'online',
    existingChannel?: OnlineChannel,
    startingTurn: PieceColor = 'green'
  ) => {
    if (onlineChannelRef.current && onlineChannelRef.current !== existingChannel) {
      onlineChannelRef.current.destroy();
    }

    setCurrentGameMode(mode);
    setEndGameReason(null);
    setShowFireworks(false);
    sound.stopVictoryCelebrationLoop(true);
    if (settings.music) {
      sound.startMusic('game', true);
    }
    setForfeitMessage(null);
    setOnlineMode(true);
    setOnlineRoomId(roomId);
    setIsOnlineHost(isHost);
    setIsOnlineConnected(mode === 'online');
    setPlayerColor(color);
    setBoardFlipped(color === 'green');
    setTurn(startingTurn);
    turnRef.current = startingTurn;
    setAiMode(false);
    consecutiveTimeoutsRef.current = { green: 0, red: 0 };
    movesWithoutCapture.current = 0;
    setMovesWithoutCaptureCount(0);
    setMovesCount(0);
    setSelectedCoord(null);
    setValidMoves([]);
    setChainPiecePos(null);
    setCapturedInChain({});
    setLastMove(null);
    setMoveHistory([]);
    setPromotingCoord(null);
    turnCapturesCount.current = 0;
    maxComboInMatch.current = 0;
    totalMatchCaptures.current = 0;
    totalMatchQueens.current = 0;
    setIsGameOver(false);
    setIsGameOverModalOpen(false);
    setIsOnlineHistoryOpen(false);
    setActiveChatBubble(null);
    setWinner(null);

    const initialBoard = createInitialBoard();
    setBoard(initialBoard);
    boardRef.current = initialBoard;

    const channel = existingChannel || new OnlineChannel(roomId, isHost, color);
    onlineChannelRef.current = channel;

    channel.onConnected = () => {
      setIsOnlineConnected(true);
      setIsOnlineReconnecting(false);
      showToast(tRef.current.toastOpponentConnected);
    };

    channel.onTimeoutWarning = (data) => {
      sound.playPenalty();
      const timedOutCol: PieceColor = (data.timedOutColor || turnRef.current || 'green') as PieceColor;
      const oppCol: PieceColor = playerColor === 'green' ? 'red' : 'green';

      if (timedOutCol === playerColor) {
        consecutiveTimeoutsRef.current[playerColor] = 1;
        showToast(tRef.current.toastTimerWarningSelf);
        const curB = boardRef.current || board;
        const autoMove = chooseBestAIMove(curB, playerColor, oppCol, 'easy', posHistory.current);
        if (autoMove) {
          executeAIMove(autoMove);
          if (onlineChannelRef.current) {
            onlineChannelRef.current.sendMove({
              fr: autoMove.fr,
              fc: autoMove.fc,
              tr: autoMove.tr,
              tc: autoMove.tc,
              isCap: autoMove.isCap,
              cr: autoMove.cr,
              cc: autoMove.cc,
              isAutoMove: true,
              movingColor: playerColor,
              nextTurn: oppCol,
            });
          }
        } else {
          finishTurn(curB, oppCol, false);
        }
      } else {
        consecutiveTimeoutsRef.current[oppCol] = 1;
        showToast(tRef.current.toastTimerAutoOppGeneric);
        if (isOnlineHost) {
          setTimeout(() => {
            if (turnRef.current === oppCol && !isGameOverRef.current) {
              const curB = boardRef.current || board;
              const autoMove = chooseBestAIMove(curB, oppCol, playerColor, 'easy', posHistory.current);
              if (autoMove) {
                executeAIMove(autoMove);
                if (onlineChannelRef.current) {
                  onlineChannelRef.current.sendMove({
                    fr: autoMove.fr,
                    fc: autoMove.fc,
                    tr: autoMove.tr,
                    tc: autoMove.tc,
                    isCap: autoMove.isCap,
                    cr: autoMove.cr,
                    cc: autoMove.cc,
                    isAutoMove: true,
                    movingColor: oppCol,
                    nextTurn: playerColor,
                  });
                }
              }
            }
          }, 1200);
        }
      }
    };

    channel.onForfeitTimeout = (data) => {
      if (isGameOver) return;
      if (timerRef.current) clearInterval(timerRef.current);
      const isWinner = data.winner === playerColor;
      const oppCol: PieceColor = playerColor === 'green' ? 'red' : 'green';
      if (isWinner) {
        const msg = data.winnerMessage || data.message || tRef.current.toastVictoryByInactivity;
        setForfeitMessage(msg);
        setWinner(playerColor);
        setEndGameReason('opponent_left');
        setIsGameOver(true);
        setScreen('game');
        setShowFireworks(true);
        sound.stopMusic();
        sound.startVictoryCelebrationLoop();
        setIsGameOverModalOpen(true);
        recordGameResult(
          playerColor,
          oppCol,
          'online',
          undefined,
          maxComboInMatch.current,
          totalMatchCaptures.current,
          totalMatchQueens.current
        );
      } else {
        const msg = data.loserMessage || data.message || tRef.current.timeoutForfeitLoss;
        setForfeitMessage(msg);
        setWinner(oppCol);
        setEndGameReason('self_abandon');
        setIsGameOver(true);
        setScreen('game');
        setShowFireworks(false);
        sound.stopMusic();
        sound.playDefeat();
        setIsGameOverModalOpen(true);
      }
    };

    channel.onPlayerStuck = (data) => {
      if (isGameOver) return;
      const winner = data.winner as PieceColor;
      const isWinner = winner === playerColor;
      showToast(
        data.message ||
        (isWinner
          ? (t.opponentBlockedWin || '🏆 Victoire ! L’adversaire n’a plus aucun coup valide.')
          : (t.playerBlockedLoss || 'Défaite : Vous n’avez plus aucun coup légal disponible.'))
      );
      endGame(winner, 'normal');
    };

    channel.onReconnecting = (attempt?: number) => {
      setIsOnlineReconnecting(true);
      showToast(tRef.current.toastReconnectingAttempt.replace('{attempt}', String(attempt ?? 1)));
    };

    channel.onReconnected = () => {
      setIsOnlineReconnecting(false);
      setIsOnlineConnected(true);
      showToast(tRef.current.toastReconnectedOpponent);
    };

    channel.onConnectionLost = () => {
      setIsOnlineReconnecting(false);
      setIsOnlineConnected(false);
      showToast(tRef.current.toastConnectionLost);
    };

    channel.onJoinError = (errMsg: string) => {
      setJoinError(errMsg);
      setIsJoinSuccess(false);
      showToast(`❌ ${errMsg}`);
      sound.playError();
    };

    channel.onJoinSuccess = (rId: string) => {
      setJoinError(null);
      setIsJoinSuccess(true);
      showToast(tRef.current.toastRoomVerified.replace('{room}', rId));
    };

    channel.onMove = (payload: any) => {
      executeRemoteMove(payload);
    };

    channel.onChainStep = (payload: any) => {
      executeRemoteChainStep(payload);
    };

    channel.onPenalty = (payload: any) => {
      executeRemotePenalty(payload);
    };

    channel.onRematch = () => {
      showToast(tRef.current.toastOpponentProposesRematch);
      sound.stopVictoryCelebrationLoop(true);
      setShowFireworks(false);
      startOnlineGame(roomId, isHost, color, mode, channel);
    };

    channel.onRoleAssigned = (data) => {
      const isHostRole = data.role === 'host';
      setIsOnlineHost(isHostRole);
      // In Kharbga 12 Pions, colors are 'green' and 'red'
      const assignedColor: PieceColor = data.myColor === 'red' ? 'red' : 'green';
      const assignedTurn: PieceColor = data.startingTurn === 'red' ? 'red' : 'green';
      setPlayerColor(assignedColor);
      setTurn(assignedTurn);
      turnRef.current = assignedTurn;
      // Ergonomie dynamique (Rotation à 180°):
      // Si vert: flipped = true (Verts en bas). Si rouge: flipped = false (Rouges en bas).
      setBoardFlipped(assignedColor === 'green');
      showToast(tRef.current.toastPlayingWithColor.replace('{color}', assignedColor === 'green' ? tRef.current.greenPawnsUpper : tRef.current.redPawnsUpper));
    };

    channel.onTimerTick = (sec: number) => {
      setTimerSec(sec);
    };

    channel.onTurnTimeout = (nextTurn) => {
      const assignedNext: PieceColor = nextTurn === 'red' ? 'red' : 'green';
      setTurn(assignedNext);
      showToast(tRef.current.toastTurnTimeoutNext.replace('{color}', assignedNext === 'green' ? tRef.current.greenPlayers : tRef.current.redPlayers));
    };

    channel.onOpponentLeft = (msg?: string) => {
      setIsOnlineConnected(false);
      setIsFriendModalOpen(false);
      setIsPauseModalOpen(false);
      setIsLeaveModalOpen(false);
      const oppCol: PieceColor = playerColor === 'green' ? 'red' : 'green';
      const forfeitTxt = msg || tRef.current.opponentLeftWon;
      setForfeitMessage(forfeitTxt);
      setWinner(playerColor);
      setEndGameReason('opponent_left');
      setIsGameOver(true);
      setScreen('game');
      setIsGameOverModalOpen(true);
      setShowFireworks(true);
      sound.stopMusic();
      sound.startVictoryCelebrationLoop();

      // Persistance des statistiques
      recordGameResult(
        playerColor,
        oppCol,
        'online',
        undefined,
        maxComboInMatch.current,
        totalMatchCaptures.current,
        totalMatchQueens.current
      );

      // Profil utilisateur : récompense de victoire (+500 pièces et +250 XP)
      setUserProfile(prev => {
        const nextXp = prev.xp + 250;
        const xpThreshold = prev.level * 500;
        const nextLevel = nextXp >= xpThreshold ? prev.level + 1 : prev.level;
        const updated = {
          ...prev,
          coins: prev.coins + 500,
          xp: nextXp >= xpThreshold ? nextXp - xpThreshold : nextXp,
          level: nextLevel,
          stats: {
            ...prev.stats,
            wins: prev.stats.wins + 1,
            winStreak: prev.stats.winStreak + 1,
          },
        };
        saveUserProfile(updated);
        return updated;
      });
      showToast(tRef.current.toastVictoryByForfeit);
    };

    channel.onStartGame = (payload) => {
      sound.stopVictoryCelebrationLoop(true);
      setShowFireworks(false);
      sound.stopMusic();
      if (settings.music) sound.startMusic('game', true);
      setIsOnlineGameStarted(true);
      setIsOnlineConnected(true);
      setIsFriendModalOpen(false);
      setIsGameOver(false);
      setIsGameOverModalOpen(false);
      setWinner(null);
      setEndGameReason(null);
      setForfeitMessage(null);
      setSelectedCoord(null);
      setValidMoves([]);
      setChainPiecePos(null);
      setCapturedInChain({});
      setLastMove(null);
      setMoveHistory([]);
      setMovesCount(0);
      setMovesWithoutCaptureCount(0);
      movesWithoutCapture.current = 0;

      // Initialiser le plateau 5x5 officiel de départ (grille complète avec les 24 pions)
      const startingBoard = (payload?.board && Array.isArray(payload.board) && payload.board.length === 5)
        ? payload.board
        : createInitialBoard();
      setBoard(startingBoard);
      boardRef.current = startingBoard;

      // Attribution des rôles et rotation à 180° :
      // Hôte = Verts / Invité = Rouges (ou selon payload)
      // Si vert: boardFlipped = true (Verts en bas). Si rouge: boardFlipped = false (Rouges en bas / rotation à 180°).
      let myAssignedColor: PieceColor = color === 'red' ? 'red' : 'green';
      if (payload) {
        if (!isHost && payload.guestColor) {
          myAssignedColor = payload.guestColor === 'red' ? 'red' : 'green';
        } else if (isHost && payload.hostColor) {
          myAssignedColor = payload.hostColor === 'red' ? 'red' : 'green';
        }
        const sTurn: PieceColor = (payload.currentTurn || payload.startingTurn) === 'red' ? 'red' : 'green';
        setTurn(sTurn);
        turnRef.current = sTurn;
      } else {
        setTurn('green');
        turnRef.current = 'green';
      }

      setPlayerColor(myAssignedColor);
      playerColorRef.current = myAssignedColor;
      setBoardFlipped(myAssignedColor === 'green');

      showToast(tRef.current.toastMatchBegins);
      // Son neutre de début de jeu (strictement aucun son de célébration/victoire)
      sound.playStartSound();
      // Bascule la vue à 'game' UNIQUEMENT APRÈS chargement du plateau
      setScreen('game');
    };

    channel.onEmote = (emoji: string) => {
      const oppColor: PieceColor = color === 'green' ? 'red' : 'green';
      sound.playSelect();
      setActiveReaction({ emoji, color: oppColor });
      setTimeout(() => setActiveReaction(null), 3000);
    };

    channel.onChatMessage = (payload: any) => {
      if (!payload) return;
      if (payload.senderColor && payload.senderColor === (playerColorRef.current || color)) return;
      const resolvedText = payload.phraseKey
        ? tRef.current(payload.phraseKey, payload.text || '')
        : (payload.text || '');
      if (!resolvedText) return;
      sound.playSelect();
      setActiveChatBubble({
        text: resolvedText,
        senderName: payload.senderName || tRef.current.opponentShortLabel || 'Adversaire',
        from: 'opponent',
      });
      if (chatBubbleTimerRef.current) clearTimeout(chatBubbleTimerRef.current);
      chatBubbleTimerRef.current = window.setTimeout(() => setActiveChatBubble(null), 3200);
    };

    if (mode === 'online') {
      setIsOnlineGameStarted(true);
      setIsOnlineConnected(true);
      setScreen('game');
    } else {
      setIsOnlineGameStarted(false);
    }
  };

  const handleHostLaunchGame = () => {
    setIsOnlineGameStarted(true);
    const guestColor: PieceColor = playerColor === 'green' ? 'red' : 'green';
    const initialBoard = createInitialBoard();
    setBoard(initialBoard);
    setTurn('green');
    if (onlineChannelRef.current) {
      onlineChannelRef.current.sendStartGame({
        hostColor: playerColor,
        guestColor,
        startingTurn: 'green',
        board: initialBoard,
      });
    }
    showToast(t.toastHostLaunchedMatch);
    sound.playStartSound();
    setScreen('game');
  };

  const handleOpenFriendModal = () => {
    setIsOnlineGameStarted(false);
    setIsJoinSuccess(false);
    setJoinError(null);
    setIsOnlineConnected(false);
    setOnlineMode(false);
    setCurrentGameMode('friend');
    setIsFriendModalOpen(true);
  };

  const handleCloseFriendModal = () => {
    setIsFriendModalOpen(false);
    setJoinError(null);
    setIsJoinSuccess(false);
    setIsOnlineGameStarted(false);
    if (onlineMode && !isOnlineGameStarted) {
      if (onlineChannelRef.current) {
        onlineChannelRef.current.destroy();
      }
      setOnlineMode(false);
      setIsOnlineConnected(false);
    }
  };
  handleCloseFriendModalRef.current = handleCloseFriendModal;

  // Auto-join via URL parameter (?join=CODE or ?room=CODE)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get('join') || params.get('room') || params.get('salon');
      if (inviteCode && inviteCode.trim()) {
        const cleanCode = inviteCode.trim().toUpperCase();
        setTimeout(() => {
          startOnlineGame(cleanCode, false, 'red');
          setScreen('game');
          showToast(tRef.current.toastConnectingRoom.replace('{room}', cleanCode));
        }, 1600);
      }
    } catch {
      // Ignore in restricted environments
    }
  }, []);

  // ─── RETENTION & SOCIAL HANDLERS (LUDO KING STYLE) ───
  const handleClaimSpinReward = (coins: number) => {
    setUserProfile(prev => {
      const nextXp = prev.xp + 50;
      const xpThreshold = prev.level * 500;
      const nextLevel = nextXp >= xpThreshold ? prev.level + 1 : prev.level;
      const currentCoins = Number(prev.coins) || 0;
      const updated: UserProfile = {
        ...prev,
        coins: currentCoins + (Number(coins) || 0),
        xp: nextXp >= xpThreshold ? nextXp - xpThreshold : nextXp,
        level: nextLevel,
        lastSpinDate: todayStr,
      };
      saveUserProfile(updated);
      return updated;
    });

    setDailyMissions(prev => {
      const updated = prev.map(m =>
        m.id === 'm4' ? { ...m, current: 1, completed: true } : m
      );
      saveDailyMissions(updated);
      return updated;
    });

    showToast(t.toastCoinsAdded.replace('{coins}', coins.toLocaleString()));
  };

  const handleClaimFreeDailyBonus = () => {
    // 🚫 Neutralisation formelle et absolue de tout feu d'artifice (visuel et sonore)
    setShowFireworks(false);
    sound.stopVictoryCelebrationLoop();

    if (!canClaimFreeBonusToday) {
      showToast(t.alreadyReceivedToday || 'Bonus quotidien déjà récupéré ! Revenez demain');
      return;
    }
    const bonusAmount = 1100;
    // Uniquement l'effet sonore authentique de pièces de monnaie qui s'égrènent
    sound.playCoins();
    setUserProfile(prev => {
      const currentCoins = Number(prev.coins) || 0;
      const updated: UserProfile = {
        ...prev,
        coins: currentCoins + bonusAmount,
        lastFreeBonusDate: todayStr,
      };
      saveUserProfile(updated);
      return updated;
    });
    // Conserver uniquement l'effet sonore des pièces et l'animation du compteur (feux d'artifice réservés aux victoires)
    showToast(`🪙 +${bonusAmount.toLocaleString()} ${t.freeCoinsBtn || 'Pièces'} ${t.receivedBtn || 'ajoutées'} !`);
  };

  const handleClaimMission = (missionId: string) => {
    const mission = dailyMissions.find(m => m.id === missionId);
    if (!mission || mission.claimed || mission.current < mission.target) return;

    sound.playCoins();
    setUserProfile(prev => {
      const nextXp = prev.xp + mission.rewardXp;
      const xpThreshold = prev.level * 500;
      const nextLevel = nextXp >= xpThreshold ? prev.level + 1 : prev.level;
      const updated: UserProfile = {
        ...prev,
        coins: prev.coins + mission.rewardCoins,
        xp: nextXp >= xpThreshold ? nextXp - xpThreshold : nextXp,
        level: nextLevel,
      };
      saveUserProfile(updated);
      return updated;
    });

    setDailyMissions(prev => {
      const updated = prev.map(m =>
        m.id === missionId ? { ...m, claimed: true } : m
      );
      saveDailyMissions(updated);
      return updated;
    });

    showToast(t.toastMissionClaimed.replace('{coins}', String(mission.rewardCoins)).replace('{xp}', String(mission.rewardXp)));
  };

  const handleToggleSubscribeFriend = (friendId: string) => {
    setFriends(prev => {
      const updated = prev.map(f =>
        f.id === friendId ? { ...f, subscribed: !f.subscribed } : f
      );
      saveFriends(updated);
      const target = updated.find(f => f.id === friendId);
      if (target) {
        showToast(target.subscribed ? t.toastSubscribedTo.replace('{name}', target.name) : t.toastUnsubscribedFrom.replace('{name}', target.name));
      }
      return updated;
    });
  };

  const handleChallengeFriend = (friend: FriendItem) => {
    setIsFriendsModalOpen(false);
    setChallengeTargetFriend(friend);
    showToast(t.toastOpeningChallengeRoom.replace('{name}', friend.name));
    setScreen('vs_friend');
  };

  const handleSendQuickPhrase = (phraseKey: string, localizedText: string) => {
    if (!onlineMode || aiMode) return;
    sound.playSelect();
    const senderName = userProfile.name || t.you || 'Vous';
    setActiveChatBubble({
      text: localizedText,
      senderName,
      from: 'me',
    });
    if (chatBubbleTimerRef.current) clearTimeout(chatBubbleTimerRef.current);
    chatBubbleTimerRef.current = window.setTimeout(() => setActiveChatBubble(null), 3000);

    if (onlineChannelRef.current) {
      onlineChannelRef.current.sendChatMessage({
        phraseKey,
        text: localizedText,
        senderColor: playerColor,
        senderName,
      });
    }
  };

  const handleSendInGameEmoji = (emoji: string) => {
    if (!onlineMode || aiMode) return;
    sound.playSelect();
    setActiveReaction({ emoji, color: playerColor });
    setTimeout(() => setActiveReaction(null), 2500);

    if (onlineChannelRef.current) {
      onlineChannelRef.current.sendEmote(emoji);
    }
  };

  // Destroy online channel on unmount
  useEffect(() => {
    return () => {
      if (onlineChannelRef.current) {
        onlineChannelRef.current.destroy();
      }
    };
  }, []);

  // Auto-join room from URL query param (shared on WhatsApp / SMS / Facebook)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        const cleanRoom = roomParam.trim().toUpperCase();
        setTimeout(() => {
          startOnlineGame(cleanRoom, false, 'red');
          showToast(tRef.current.toastRoomJoined.replace('{room}', cleanRoom));
        }, 800);
      }
    }
  }, []);

  // Remote Move Execution
  const executeRemoteMove = (data: {
    fr?: number;
    fc?: number;
    tr?: number;
    tc?: number;
    isCap?: boolean;
    cr?: number;
    cc?: number;
    newChain?: Record<string, boolean>;
    nextTurn?: PieceColor;
    board?: Board;
    wasPenalty?: boolean;
    punishedCoords?: Coord[];
    isAutoMove?: boolean;
    movingColor?: PieceColor;
    senderPlayerId?: string;
    playerId?: string;
    lastMove?: LastMove;
    payload?: any;
  }) => {
    // 1. Guard against local echo: ignore if sent by myself
    if (data.senderPlayerId && data.senderPlayerId === onlineChannelRef.current?.myPlayerId) {
      return;
    }
    if (data.playerId && data.playerId === onlineChannelRef.current?.myPlayerId) {
      return;
    }
    const movingColor: PieceColor =
      data.movingColor ||
      data.payload?.movingColor ||
      (playerColor === 'green' ? 'red' : 'green');

    if (onlineMode && movingColor === playerColor) {
      return;
    }

    const remoteGameOver = Boolean((data as any).gameOver || data.payload?.gameOver);
    const remoteWinner = ((data as any).winner || data.payload?.winner) as PieceColor | undefined;
    if (remoteGameOver && remoteWinner) {
      endGame(remoteWinner, 'normal');
      return;
    }

    const fr = data.fr ?? data.lastMove?.fr ?? data.payload?.fr;
    const fc = data.fc ?? data.lastMove?.fc ?? data.payload?.fc;
    const tr = data.tr ?? data.lastMove?.tr ?? data.payload?.tr;
    const tc = data.tc ?? data.lastMove?.tc ?? data.payload?.tc;
    const isCap = data.isCap ?? data.lastMove?.isCap ?? data.payload?.isCap ?? false;
    const incomingBoard = data.board || data.payload?.board;

    const curBoard = boardRef.current || board;
    let next: Board;

    if (incomingBoard && Array.isArray(incomingBoard) && incomingBoard.length === 5) {
      next = incomingBoard.map(row => row.map(cell => (cell ? { ...cell } : null)));
    } else {
      next = curBoard.map(row => row.map(cell => (cell ? { ...cell } : null)));
      if (fr !== undefined && fc !== undefined && tr !== undefined && tc !== undefined) {
        const p = next[fr]?.[fc];
        if (p) {
          next[tr][tc] = p;
          next[fr][fc] = null;

          if (isCap) {
            if (data.newChain) {
              for (const key of Object.keys(data.newChain)) {
                const [kr, kc] = key.split(',').map(Number);
                if (next[kr]?.[kc]) next[kr][kc] = null;
              }
            } else if (data.cr !== undefined && data.cc !== undefined && next[data.cr]?.[data.cc]) {
              next[data.cr][data.cc] = null;
            }
          }
        }
      }
    }

    // RÈGLE 2 : Si l'adversaire a joué lui-même son coup (non auto), réinitialiser son compteur à 0
    if (!data.isAutoMove) {
      consecutiveTimeoutsRef.current[movingColor] = 0;
    }

    if (data.wasPenalty) {
      sound.playPenalty();
      showToast(tRef.current.toastPenaltyOpponent);
      if (data.punishedCoords && data.punishedCoords.length > 0) {
        setPunishedCoords(data.punishedCoords);
        setTimeout(() => {
          setPunishedCoords(null);
        }, 850);
      }
    } else if (isCap) {
      sound.playCapture();
    } else {
      sound.playMove();
    }

    let promoted = false;
    if (tr !== undefined && tc !== undefined) {
      promoted = applyPromotions(next, { r: tr, c: tc });
      if (promoted) {
        sound.playPromotion();
        setPromotingCoord({ r: tr, c: tc });
        setTimeout(() => setPromotingCoord(null), 1400);
      }
    }

    if (fr !== undefined && fc !== undefined && tr !== undefined && tc !== undefined) {
      setLastMove({ fr, fc, tr, tc, isCap });
      setMoveHistory(prev => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          from: toNotation(fr, fc),
          to: toNotation(tr, tc),
          color: movingColor,
          isCap,
          isPromo: promoted,
        },
      ]);
    }

    const calculatedNextTurn: PieceColor =
      data.nextTurn || (data as any).currentTurn || (movingColor === 'green' ? 'red' : 'green');

    // 🛡️ Mise à jour séquentielle propre hors fonction de rappel
    setBoard(next);
    boardRef.current = next;
    finishTurn(next, calculatedNextTurn, isCap);
  };

  const executeRemoteChainStep = (data: {
    fr: number;
    fc: number;
    tr: number;
    tc: number;
    cr: number;
    cc: number;
    board?: Board;
  }) => {
    let next: Board;
    const curBoard = boardRef.current || board;
    if (data.board && Array.isArray(data.board) && data.board.length === 5) {
      next = data.board.map(row => row.map(cell => (cell ? { ...cell } : null)));
    } else {
      next = curBoard.map(row => row.map(cell => (cell ? { ...cell } : null)));
      const p = next[data.fr]?.[data.fc];
      if (p) {
        next[data.tr][data.tc] = p;
        next[data.fr][data.fc] = null;
      }
    }
    if (data.cr !== undefined && data.cc !== undefined && next[data.cr]?.[data.cc]) {
      next[data.cr][data.cc] = null;
    }

    sound.playCapture();
    setLastMove({ fr: data.fr, fc: data.fc, tr: data.tr, tc: data.tc, isCap: true });
    setBoard(next);
    boardRef.current = next;
    setTimerSec(30);
    showToast(tRef.current.toastOpponentMultiCapture);
  };

  const executeRemotePenalty = (data: { fr: number; fc: number; tr: number; tc: number }) => {
    const curBoard = boardRef.current || board;
    const next = curBoard.map(row => row.map(cell => (cell ? { ...cell } : null)));
    const p = next[data.fr]?.[data.fc];
    if (!p) return;

    next[data.tr][data.tc] = p;
    next[data.fr][data.fc] = null;

    sound.playMove();
    applyPromotions(next);
    setLastMove({ fr: data.fr, fc: data.fc, tr: data.tr, tc: data.tc, isCap: false });
    setBoard(next);
    boardRef.current = next;
    finishTurn(next, playerColor);
  };

  // ─── TURN TIMER EFFECT ───
  useEffect(() => {
    if (!settings.timer || isGameOver || isPaused || screen !== 'game' || onlineMode) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    turnIdRef.current += 1;
    const currentTurnId = turnIdRef.current;
    const turnColor = turn;

    setTimerSec(30);

    timerRef.current = window.setInterval(() => {
      // 1. Nettoyage strict : si le tour a changé entre-temps, arrêter l'intervalle
      if (turnIdRef.current !== currentTurnId || currentTurnRef.current !== turnColor) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      let reachedZero = false;
      setTimerSec(prev => {
        if (turnIdRef.current !== currentTurnId || currentTurnRef.current !== turnColor) {
          return 30;
        }
        const nextSec = prev - 1;
        if (nextSec <= 0) {
          reachedZero = true;
          return 0;
        }
        return nextSec;
      });

      // 2. Condition STRICTE : se déclenche physiquement lorsque le compteur arrive à 0 seconde
      // ET que le tour appartient toujours au même joueur (aucune action effectuée)
      // ET qu'aucun coup auto n'a déjà été déclenché pour ce tour (verrou strict anti-double coup)
      if (
        reachedZero &&
        turnIdRef.current === currentTurnId &&
        currentTurnRef.current === turnColor &&
        autoMoveLockTurnIdRef.current !== currentTurnId
      ) {
        autoMoveLockTurnIdRef.current = currentTurnId;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const activeColor = turnColor;
        const oppColor: PieceColor = activeColor === 'green' ? 'red' : 'green';
        const priorTimeouts = consecutiveTimeoutsRef.current[activeColor] || 0;

        if (priorTimeouts >= 1) {
          // 🛑 DEUXIÈME INACTIVITÉ CONSÉCUTIVE : arrêt instantané du match, défaite par forfait
          sound.playDefeat();
          setForfeitMessage(tRef.current.toastDoubleInactivityForfeit);
          endGame(oppColor);
          showToast(tRef.current.toastDefeatByInactivity);
          return;
        }

        // ⚠️ PREMIÈRE INACTIVITÉ (1er tour manqué) : Coup d'IA automatique joué à sa place
        consecutiveTimeoutsRef.current[activeColor] = 1;
        sound.playPenalty();
        showToast(tRef.current.toastTimerWarningSelf30s);

        const autoMove = chooseBestAIMove(board, activeColor, oppColor, 'easy', posHistory.current);

        if (autoMove) {
          executeAIMove(autoMove);
        } else {
          endGame(oppColor);
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [settings.timer, isGameOver, isPaused, screen, turn, onlineMode, showToast, t.tim]);

  // ─── AI TRIGGER EFFECT ───
  useEffect(() => {
    const aiColor: PieceColor = playerColor === 'green' ? 'red' : 'green';

    if (
      aiMode &&
      turn === aiColor &&
      !isGameOver &&
      !isPaused &&
      screen === 'game'
    ) {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

      const delay = aiDiff === 'easy' ? 450 : aiDiff === 'medium' ? 700 : 950;

      aiTimeoutRef.current = window.setTimeout(() => {
        const move = chooseBestAIMove(board, aiColor, playerColor, aiDiff, posHistory.current);
        if (!move) {
          // AI has no moves, player wins
          endGame(playerColor);
          return;
        }

        executeAIMove(move);
      }, delay);
    }

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiMode, turn, isGameOver, isPaused, screen, board]);

  // AI execution with chain captures (and auto-play moves)
  const executeAIMove = (step: { fr: number; fc: number; tr: number; tc: number; cr?: number; cc?: number; isCap: boolean }) => {
    const nextBoard = board.map(row => row.map(cell => (cell ? { ...cell } : null)));
    const movingPiece = nextBoard[step.fr][step.fc];
    if (!movingPiece) return;
    const movingColor = movingPiece.c;
    const opponentColor: PieceColor = movingColor === 'green' ? 'red' : 'green';

    // Record position and move for adaptive machine learning
    try {
      const boardKey = getBoardKey(board);
      aiMovesTrack.current.push({
        key: boardKey,
        moveStr: `${step.fr}${step.fc}->${step.tr}${step.tc}`,
      });
    } catch {
      // Ignore
    }

    nextBoard[step.tr][step.tc] = movingPiece;
    nextBoard[step.fr][step.fc] = null;

    setLastMove({ fr: step.fr, fc: step.fc, tr: step.tr, tc: step.tc, isCap: step.isCap });

    if (step.isCap && step.cr !== undefined && step.cc !== undefined) {
      sound.playCapture();
      const newChain: Record<string, boolean> = { [`${step.cr},${step.cc}`]: true };
      const promoted = applyPromotions(nextBoard, { r: step.tr, c: step.tc });
      if (promoted) {
        sound.playPromotion();
        setPromotingCoord({ r: step.tr, c: step.tc });
        setTimeout(() => setPromotingCoord(null), 1400);
      }

      setMoveHistory(prev => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          from: toNotation(step.fr, step.fc),
          to: toNotation(step.tr, step.tc),
          color: movingColor,
          isCap: true,
          isPromo: promoted,
        },
      ]);

      // Retrait immédiat de la pièce capturée pour décomposer visuellement chaque saut
      if (step.cr !== undefined && step.cc !== undefined) {
        nextBoard[step.cr][step.cc] = null;
      }
      setBoard(nextBoard);

      // Check if multi-capture is possible with reversal restriction
      const stepDir: [number, number] = [Math.sign(step.cr - step.fr) || 0, Math.sign(step.cc - step.fc) || 0];
      const further = getCapturesOnBoard(nextBoard, step.tr, step.tc, movingPiece, newChain, stepDir);
      if (further.length > 0) {
        // Décomposition séquentielle mesurée à 520ms par saut
        setTimeout(() => {
          continueAIChain(nextBoard, step.tr, step.tc, movingPiece, newChain, stepDir);
        }, 520);
        return;
      }

      applyPromotions(nextBoard);
      finishTurn(nextBoard, opponentColor, true);
    } else {
      // Vérification si l'IA avait une capture possible avant ce coup sans prise
      const capturingBeforeMove = getAllCapturingPieces(board, movingColor);
      const wasPenalty = capturingBeforeMove.length > 0;

      if (wasPenalty) {
        // Punition unique : seul le pion qui devait capturer le plus proche du camp adverse est puni
        const singlePunishedPiece = selectPunishedPiece(
          capturingBeforeMove,
          movingColor,
          { r: step.fr, c: step.fc },
          { r: step.tr, c: step.tc }
        );
        const piecesToPunish: Coord[] = [singlePunishedPiece];

        // Afficher immédiatement le plateau avec le pion qui bonde
        setBoard(nextBoard);
        setPunishedCoords(piecesToPunish);
        sound.playPenalty();
        showToast(tRef.current.toastPenaltyAI);

        setTimeout(() => {
          const finalBoard = nextBoard.map(row => row.map(cell => (cell ? { ...cell } : null)));
          piecesToPunish.forEach(p => {
            finalBoard[p.r][p.c] = null;
          });
          const promoted = applyPromotions(finalBoard, { r: step.tr, c: step.tc });
          if (promoted) {
            sound.playPromotion();
            setPromotingCoord({ r: step.tr, c: step.tc });
            setTimeout(() => setPromotingCoord(null), 1400);
          }
          setPunishedCoords(null);
          setBoard(finalBoard);

          setMoveHistory(prev => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              from: toNotation(step.fr, step.fc),
              to: toNotation(step.tr, step.tc),
              color: movingColor,
              isCap: false,
              isPromo: promoted,
            },
          ]);

          finishTurn(finalBoard, opponentColor, false);
        }, 850);
        return;
      }

      sound.playMove();

      const promoted = applyPromotions(nextBoard, { r: step.tr, c: step.tc });
      if (promoted) {
        sound.playPromotion();
        setPromotingCoord({ r: step.tr, c: step.tc });
        setTimeout(() => setPromotingCoord(null), 1400);
      }

      setMoveHistory(prev => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          from: toNotation(step.fr, step.fc),
          to: toNotation(step.tr, step.tc),
          color: movingColor,
          isCap: false,
          isPromo: promoted,
        },
      ]);

      finishTurn(nextBoard, opponentColor, false);
    }
  };

  const continueAIChain = (
    currentBoard: Board,
    r: number,
    c: number,
    piece: { c: PieceColor; d: boolean },
    chainCaps: Record<string, boolean>,
    lastDir?: [number, number]
  ) => {
    const further = getCapturesOnBoard(currentBoard, r, c, piece, chainCaps, lastDir);
    const opponentColor: PieceColor = piece.c === 'green' ? 'red' : 'green';
    if (!further.length) {
      // Clear all captured pieces
      for (const key of Object.keys(chainCaps)) {
        const [kr, kc] = key.split(',').map(Number);
        currentBoard[kr][kc] = null;
      }
      applyPromotions(currentBoard);
      finishTurn(currentBoard, opponentColor, true);
      return;
    }

    const nextCap = further[0];
    currentBoard[nextCap.r][nextCap.c] = piece;
    currentBoard[r][c] = null;
    if (nextCap.cr !== undefined && nextCap.cc !== undefined) {
      currentBoard[nextCap.cr][nextCap.cc] = null;
    }
    chainCaps[`${nextCap.cr},${nextCap.cc}`] = true;

    sound.playCapture();
    const promoted = applyPromotions(currentBoard, { r: nextCap.r, c: nextCap.c });
    if (promoted) {
      sound.playPromotion();
      setPromotingCoord({ r: nextCap.r, c: nextCap.c });
      setTimeout(() => setPromotingCoord(null), 1400);
    }

    setLastMove({ fr: r, fc: c, tr: nextCap.r, tc: nextCap.c, isCap: true });
    setBoard([...currentBoard.map(row => [...row])]);

    const nextDir: [number, number] = [Math.sign(nextCap.cr - r) || 0, Math.sign(nextCap.cc - c) || 0];
    const more = getCapturesOnBoard(currentBoard, nextCap.r, nextCap.c, piece, chainCaps, nextDir);
    if (more.length > 0) {
      setTimeout(() => {
        continueAIChain(currentBoard, nextCap.r, nextCap.c, piece, chainCaps, nextDir);
      }, 520);
    } else {
      for (const key of Object.keys(chainCaps)) {
        const [kr, kc] = key.split(',').map(Number);
        currentBoard[kr][kc] = null;
      }
      applyPromotions(currentBoard);
      finishTurn(currentBoard, opponentColor, true);
    }
  };

  const finishTurn = (b: Board, nextColor: PieceColor, isCapture: boolean = false) => {
    if (isCapture) {
      movesWithoutCapture.current = 0;
      setMovesWithoutCaptureCount(0);
    } else {
      movesWithoutCapture.current += 1;
      setMovesWithoutCaptureCount(movesWithoutCapture.current);
    }
    turnCapturesCount.current = 0;
    setBoard([...b.map(row => [...row])]);
    setMovesCount(m => m + 1);
    setTimerSec(30);
    setSelectedCoord(null);
    setValidMoves([]);
    setChainPiecePos(null);
    setCapturedInChain({});
    setChainLastDir(null);

    if (!checkGameOver(b, nextColor)) {
      setTurn(nextColor);
    }
  };

  // ─── USER INTERACTION (CLICK CELL) ───
  const handleCellClick = (r: number, c: number) => {
    if (isGameOver || isPaused) return;

    // Strict role check in online mode: disable board totally if it's not my turn or if game is not started
    if (onlineMode) {
      if (!isOnlineGameStarted) {
        showToast(t.toastWaitingHostLaunch);
        return;
      }
      if (turn !== playerColor) {
        // Interdiction totale de toucher/déplacer les pions de l'adversaire
        return;
      }
    }

    const aiColor: PieceColor = playerColor === 'green' ? 'red' : 'green';
    if (aiMode && turn === aiColor) return; // Block input while AI thinks

    // Piece was already selected, check if user clicked on a valid destination
    if (selectedCoord) {
      const destinationMove = validMoves.find(vm => vm.r === r && vm.c === c);

      if (destinationMove) {
        executeUserMove(destinationMove);
        return;
      }

      // If in a multi-capture chain, clicking another cell does NOT unselect
      if (chainPiecePos) return;

      // Clicked on friendly piece: reselect
      const clickedPiece = board[r][c];
      if (clickedPiece && clickedPiece.c === turn) {
        if (onlineMode && clickedPiece.c !== playerColor) return;
        sound.playSelect();
        setSelectedCoord({ r, c });
        setValidMoves(calculateValidMoves(board, r, c, null, {}));
        return;
      }

      // Clicked elsewhere: unselect
      setSelectedCoord(null);
      setValidMoves([]);
      return;
    }

    // No piece selected yet: select clicked piece only if friendly AND matches current player's color
    const p = board[r][c];
    if (p && p.c === turn) {
      if (onlineMode && p.c !== playerColor) return;
      sound.playSelect();
      setSelectedCoord({ r, c });
      setValidMoves(calculateValidMoves(board, r, c, null, {}));
    }
  };

  const executeUserMove = (move: ValidMove) => {
    if (!selectedCoord) return;

    const nextBoard = board.map(row => row.map(cell => (cell ? { ...cell } : null)));
    const movingPiece = nextBoard[selectedCoord.r][selectedCoord.c];
    if (!movingPiece) return;

    // Coup manuel légal joué : remise à zéro immédiate du compteur d'expirations consécutives
    consecutiveTimeoutsRef.current[movingPiece.c] = 0;

    const fr = selectedCoord.r;
    const fc = selectedCoord.c;

    // Check if player had the possibility to capture before this move
    const capturingPieces = getAllCapturingPieces(board, turn);
    const wasPenalty = move.t !== 'c' && capturingPieces.length > 0;

    // 1. CAPTURE MOVE: Jumping over an opponent piece
    if (move.t === 'c' && move.cr !== undefined && move.cc !== undefined) {
      nextBoard[move.r][move.c] = movingPiece;
      nextBoard[fr][fc] = null;

      const newChain = { ...capturedInChain, [`${move.cr},${move.cc}`]: true };
      setCapturedInChain(newChain);

      sound.playCapture();
      turnCapturesCount.current += 1;
      totalMatchCaptures.current += 1;
      if (turnCapturesCount.current > maxComboInMatch.current) {
        maxComboInMatch.current = turnCapturesCount.current;
      }

      const promoted = applyPromotions(nextBoard, { r: move.r, c: move.c });
      if (promoted) {
        sound.playPromotion();
        setPromotingCoord({ r: move.r, c: move.c });
        setTimeout(() => setPromotingCoord(null), 1400);
        totalMatchQueens.current += 1;
      }

      setLastMove({ fr, fc, tr: move.r, tc: move.c, isCap: true });
      setMoveHistory(prev => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          from: toNotation(fr, fc),
          to: toNotation(move.r, move.c),
          color: turn,
          isCap: true,
          isPromo: promoted,
          capCount: turnCapturesCount.current,
        },
      ]);

      // Check if this piece can capture again from its new square!
      // Enforcing no immediate 180° reversal on same axis
      const stepDir: [number, number] = [Math.sign(move.cr - fr) || 0, Math.sign(move.cc - fc) || 0];
      const furtherCaps = getCapturesOnBoard(nextBoard, move.r, move.c, movingPiece, newChain, stepDir);

      if (furtherCaps.length > 0) {
        // MULTI-CAPTURE CONTINUATION
        setBoard(nextBoard);
        setSelectedCoord({ r: move.r, c: move.c });
        setChainPiecePos({ r: move.r, c: move.c });
        setChainLastDir(stepDir);
        setValidMoves(
          furtherCaps.map(f => ({ r: f.r, c: f.c, cr: f.cr, cc: f.cc, t: 'c' }))
        );
        showToast(`💥 ${t.mul}`);
        setBannerMessage(t.mul);

        if (onlineMode && onlineChannelRef.current) {
          onlineChannelRef.current.sendChainStep({
            fr,
            fc,
            tr: move.r,
            tc: move.c,
            cr: move.cr,
            cc: move.cc,
            board: nextBoard,
          });
        }
        return;
      }

      // End of chain: erase all jumped pieces
      for (const key of Object.keys(newChain)) {
        const [kr, kc] = key.split(',').map(Number);
        nextBoard[kr][kc] = null;
      }
      applyPromotions(nextBoard);

      const nextTurn = turn === 'green' ? 'red' : 'green';

      if (onlineMode && onlineChannelRef.current) {
        onlineChannelRef.current.sendMove({
          fr,
          fc,
          tr: move.r,
          tc: move.c,
          isCap: true,
          cr: move.cr,
          cc: move.cc,
          newChain,
          nextTurn,
          board: nextBoard,
          movingColor: turn,
          isAutoMove: false,
        });
      }

      setBannerMessage(null);
      finishTurn(nextBoard, nextTurn, true);
      return;
    }

    // 2. NORMAL MOVE: Clean slide/forward step
    nextBoard[move.r][move.c] = movingPiece;
    nextBoard[fr][fc] = null;

    if (wasPenalty) {
      // Règle de punition : UN SEUL pion est puni, celui qui devait capturer le plus proche du camp adverse
      const singlePunishedPiece = selectPunishedPiece(
        capturingPieces,
        turn,
        { r: fr, c: fc },
        { r: move.r, c: move.c }
      );
      const piecesToPunish: Coord[] = [singlePunishedPiece];

      // Afficher immédiatement le plateau avec le pion déplacé et le pion puni qui bonde / clignote
      setBoard(nextBoard);
      setPunishedCoords(piecesToPunish);
      setSelectedCoord(null);
      setValidMoves([]);
      sound.playPenalty();
      showToast(`⚠️ ${t.pun || 'Punition appliquée : Le pion qui devait capturer a été puni !'}`);

      // Laisser le pion bonder pendant 850ms pour que le joueur voie clairement quel pion a été puni
      setTimeout(() => {
        const finalBoard = nextBoard.map(row => row.map(cell => (cell ? { ...cell } : null)));
        piecesToPunish.forEach(p => {
          finalBoard[p.r][p.c] = null;
        });

        const promoted = applyPromotions(finalBoard, { r: move.r, c: move.c });
        if (promoted) {
          sound.playPromotion();
          setPromotingCoord({ r: move.r, c: move.c });
          setTimeout(() => setPromotingCoord(null), 1400);
          totalMatchQueens.current += 1;
        }

        setPunishedCoords(null);
        setBoard(finalBoard);

        setLastMove({ fr, fc, tr: move.r, tc: move.c, isCap: false });
        setMoveHistory(prev => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            from: toNotation(fr, fc),
            to: toNotation(move.r, move.c),
            color: turn,
            isCap: false,
            isPromo: promoted,
          },
        ]);

        const nextTurn = turn === 'green' ? 'red' : 'green';
        if (onlineMode && onlineChannelRef.current) {
          onlineChannelRef.current.sendMove({
            fr,
            fc,
            tr: move.r,
            tc: move.c,
            isCap: false,
            wasPenalty: true,
            punishedCoords: piecesToPunish,
            nextTurn,
            board: finalBoard,
            movingColor: turn,
            isAutoMove: false,
          });
        }

        setBannerMessage(null);
        finishTurn(finalBoard, nextTurn, false);
      }, 850);
      return;
    }

    sound.playMove();

    const promoted = applyPromotions(nextBoard, { r: move.r, c: move.c });
    if (promoted) {
      sound.playPromotion();
      setPromotingCoord({ r: move.r, c: move.c });
      setTimeout(() => setPromotingCoord(null), 1400);
      totalMatchQueens.current += 1;
    }

    setLastMove({ fr, fc, tr: move.r, tc: move.c, isCap: false });
    setMoveHistory(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        from: toNotation(fr, fc),
        to: toNotation(move.r, move.c),
        color: turn,
        isCap: false,
        isPromo: promoted,
      },
    ]);

    const nextTurn = turn === 'green' ? 'red' : 'green';
    if (onlineMode && onlineChannelRef.current) {
      onlineChannelRef.current.sendMove({
        fr,
        fc,
        tr: move.r,
        tc: move.c,
        isCap: false,
        wasPenalty,
        nextTurn,
        board: nextBoard,
        movingColor: turn,
        isAutoMove: false,
      });
    }

    setBannerMessage(null);
    finishTurn(nextBoard, nextTurn, false);
  };

  // ─── LEAVE CONFIRMATION ───
  const handleMenuClick = () => {
    sound.stopVictoryCelebrationLoop();
    setShowFireworks(false);
    if (isGameOver) {
      setScreen('menu');
      sound.stopMusic();
      return;
    }
    setIsLeaveModalOpen(true);
  };
  handleMenuClickRef.current = handleMenuClick;

  const handleConfirmLeave = () => {
    sound.stopVictoryCelebrationLoop();
    setShowFireworks(false);
    setIsLeaveModalOpen(false);
    setIsPauseModalOpen(false);
    setIsPaused(false);
    sound.stopMusic();

    // ─── GESTION DE L'ABANDON EN LIGNE (IDENTIQUE AU MODE VS AMIS) ───
    // Le joueur qui quitte perd par forfait, l'adversaire gagne
    if (onlineMode && !isGameOver) {
      const oppColor: PieceColor = playerColor === 'green' ? 'red' : 'green';
      if (onlineChannelRef.current) {
        onlineChannelRef.current.sendSurrender();
        onlineChannelRef.current.destroy();
        onlineChannelRef.current = null;
      }
      setIsOnlineConnected(false);
      setIsOnlineGameStarted(false);
      setIsGameOver(true);
      setWinner(oppColor);
      setEndGameReason('self_abandon');
      setForfeitMessage(t.toastOnlineLeaveForfeit);
      setIsGameOverModalOpen(true);
      setShowFireworks(false);
      sound.playDefeat();
      showToast(t.toastOnlineLeaveWarning);

      // Persistance dans les statistiques
      recordGameResult(
        oppColor,
        playerColor,
        'online',
        undefined,
        maxComboInMatch.current,
        totalMatchCaptures.current,
        totalMatchQueens.current
      );

      // Profil utilisateur (+150 pièces et +80 XP)
      setUserProfile(prev => {
        const nextXp = prev.xp + 80;
        const xpThreshold = prev.level * 500;
        const nextLevel = nextXp >= xpThreshold ? prev.level + 1 : prev.level;
        const updated = {
          ...prev,
          coins: prev.coins + 150,
          xp: nextXp >= xpThreshold ? nextXp - xpThreshold : nextXp,
          level: nextLevel,
          stats: {
            ...prev.stats,
            losses: prev.stats.losses + 1,
            winStreak: 0,
          },
        };
        saveUserProfile(updated);
        return updated;
      });
      return;
    }

    // VS AI Mode : En cas d'abandon contre l'ordinateur, déclenche la défaite officielle
    if (aiMode && !isGameOver) {
      const oppColor: PieceColor = playerColor === 'green' ? 'red' : 'green';
      setIsGameOver(true);
      setWinner(oppColor);
      setEndGameReason('self_abandon');
      setIsGameOverModalOpen(true);
      setShowFireworks(false);
      sound.playDefeat();
      showToast(t.toastLostByAbandon);

      recordGameResult(
        oppColor,
        playerColor,
        'ai',
        aiDiff,
        maxComboInMatch.current,
        totalMatchCaptures.current,
        totalMatchQueens.current
      );
      return;
    }

    if (activeTournamentMatch) {
      setActiveTournamentMatch(null);
      setTournamentEndInfo(null);
      setScreen('tournament');
    } else {
      setScreen('menu');
    }
  };
  handleConfirmLeaveRef.current = handleConfirmLeave;

  const handleTogglePause = () => {
    if (isGameOver) return;
    setIsPaused(p => {
      const next = !p;
      if (next) {
        sound.stopMusic();
        sound.setGamePaused(true);
        setIsPauseModalOpen(true);
      } else {
        sound.setGamePaused(false);
        // Reprendre la musique de la partie (et non la musique du menu)
        if (settings.music) sound.startMusic('game');
        setIsPauseModalOpen(false);
      }
      return next;
    });
  };

  // Piece counts
  const pieceCounts = countPieces(board);

  return (
    <TranslationProvider language={settings.language} onLanguageChange={newLang => handleUpdateSetting('language', newLang)}>
      <div className="min-h-screen bg-gradient-to-b from-[#041a12] via-[#07261a] to-[#02110c] text-[#f0e6c8] flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden">
      {/* ─── STARTUP SPLASH SEQUENCING (Étape 1: SG -> Étape 2: 12 PIONS) ─── */}
      {startupPhase !== 'completed' && (
        <StartupSplashLogo
          step={startupPhase}
          progress={splashProgress}
          onSkip={handleSkipSplash}
        />
      )}

      {/* ─── MAIN APPLICATION HEADER (HIDDEN ON HOME SCREEN, IN-GAME, ONLINE & VS FRIENDS) ─── */}
      {screen !== 'game' && screen !== 'menu' && screen !== 'online' && screen !== 'vs_friend' && (
        <header className="sticky top-0 z-30 bg-[#052118]/95 backdrop-blur-md border-b border-amber-500/30 px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              onClick={() => setScreen('menu')}
              className="flex items-center gap-1.5 cursor-pointer text-amber-400 font-black text-sm sm:text-base tracking-wider hover:opacity-90"
            >
              <span>⭐</span>
              <span className="hidden xs:inline">12 PIONS</span>
            </div>

            {/* User Profile Badge (XP & Level) */}
            <button
              type="button"
              onClick={() => setIsMissionsModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-amber-500/20 transition-all text-left"
              title={t.tooltipViewLevelMissions}
            >
              <div className="w-5 h-5 rounded-lg bg-amber-500/30 flex items-center justify-center text-xs">
                {userProfile.avatar}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-amber-300 leading-none">
                  {t.levelTag || t.levelLabel || 'LVL.'} {formatNumber(userProfile.level, settings.language)}
                </span>
                <span className="text-[8px] text-gray-400 leading-none mt-0.5 font-mono">
                  {formatNumber(userProfile.xp, settings.language)} XP
                </span>
              </div>
            </button>

            {/* Virtual Coins Pill */}
            <button
              type="button"
              onClick={() => setIsSpinModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-600/30 to-amber-500/20 border border-amber-400/40 hover:border-amber-300 shadow-sm text-amber-300 font-black text-xs transition-all active:scale-95 cursor-pointer"
              title={t.spinWheel}
            >
              <span className="text-sm leading-none">🪙</span>
              <span className="font-mono">{formatNumber(userProfile.coins, settings.language)}</span>
              {canSpinToday && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-0.5" />
              )}
            </button>
          </div>

          <nav className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setIsFriendsModalOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold text-gray-300 hover:text-amber-300 hover:bg-amber-500/10 transition-colors flex items-center gap-1 relative"
              title={t.tooltipFriendsSubs}
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{t.friendsLabel}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1 sm:static" />
            </button>

            {screen !== 'stats' && screen !== 'lb' && (
              <button
                type="button"
                onClick={() => setScreen('menu')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  screen === 'menu'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.home}
              </button>
            )}
            <button
              type="button"
              onClick={() => setScreen('puzzles')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                screen === 'puzzles'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="hidden xs:inline">{t.puzzles}</span>
            </button>
            <button
              type="button"
              onClick={() => setScreen('stats')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                screen === 'stats'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <BarChart3 className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">{t.stats}</span>
            </button>
            <button
              type="button"
              onClick={() => setScreen('rules')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                screen === 'rules'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.rules}
            </button>
            <button
              type="button"
              onClick={() => setScreen('lb')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                screen === 'lb'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.ranking}
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
              title={t.settings}
            >
              <Settings className="w-4 h-4" />
            </button>
          </nav>
        </header>
      )}

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#0f0f1e]/95 border border-amber-400 rounded-xl px-4 py-2 text-xs font-bold text-amber-300 shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* ─── SCREEN CONTENT ─── */}
      <main className={`flex-1 flex flex-col items-center justify-center ${screen === 'menu' ? 'p-0 max-w-none w-full' : (screen === 'online' || screen === 'vs_friend') ? 'p-1 sm:p-2 max-w-lg mx-auto w-full' : 'p-3 sm:p-4 max-w-lg mx-auto w-full'}`}>
        {/* 1. LUDO KING ARCADE HOME SCREEN (WITH LOW OPACITY GAME BOARD WATERMARK) */}
        {screen === 'menu' && (
          <LudoKingHomeScreen
            userProfile={userProfile}
            canSpinToday={canSpinToday}
            friends={friends}
            dailyMissions={dailyMissions}
            unreadNotificationsCount={notifications.filter(n => !n.isRead).length}
            hasUnreadChatMessages={totalUnreadChatMessages > 0 || hasUnreadChatMessages || incomingFriendRequests.length > 0}
            onPlayOnline={() => {
              if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                setOfflineNotice({ isOpen: true, modeTitle: t.online1v1 });
                return;
              }
              setScreen('online');
            }}
            onPlayWithFriends={() => {
              if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                setOfflineNotice({ isOpen: true, modeTitle: t.vsFriends });
                return;
              }
              setScreen('vs_friend');
            }}
            onVsComputer={() => setIsAIModalOpen(true)}
            onPassNPlay={() => setIsLocalSetupModalOpen(true)}
            onOpenTournament={() => setScreen('menu')}
            onOpenLeaderboard={() => setScreen('lb')}
            onOpenStats={() => setScreen('stats')}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onOpenSpin={() => setIsSpinModalOpen(true)}
            onOpenShop={() => setIsShopModalOpen(true)}
            onOpenFriends={() => {
              setHasUnreadChatMessages(false);
              setIsFriendsModalOpen(true);
            }}
            onOpenNotifications={() => setIsNotificationsModalOpen(true)}
            onOpenShare={() => setIsShareModalOpen(true)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenMissions={() => setIsMissionsModalOpen(true)}
            onClaimFreeBonus={handleClaimFreeDailyBonus}
            canClaimFreeBonusToday={canClaimFreeBonusToday}
            onExitApp={() => setIsExitAppModalOpen(true)}
            onShowToast={showToast}
            t={t}
          />
        )}

        {/* 2. GAMEPLAY SCREEN */}
        {screen === 'game' && (
          <div className="w-full flex flex-col items-center gap-2.5">
            <GameHeader
              greenCount={pieceCounts.green}
              redCount={pieceCounts.red}
              turn={turn}
              timerSec={timerSec}
              timerOn={settings.timer}
              aiMode={aiMode}
              aiDiff={aiDiff}
              playerColor={playerColor}
              player1Name={localPlayer1Name}
              player2Name={localPlayer2Name}
              t={t}
              onMenuClick={handleMenuClick}
              onPauseClick={handleTogglePause}
              onResetClick={() => {
                if (movesCount > 0 && !winner) {
                  setIsNewGameConfirmModalOpen(true);
                } else {
                  startNewGame(aiMode, aiDiff, playerColor);
                }
              }}
              onSettingsClick={() => setIsSettingsModalOpen(true)}
              isOnlineMode={onlineMode}
              isHistoryOpen={isOnlineHistoryOpen}
              onToggleHistory={() => {
                sound.playSelect();
                setIsOnlineHistoryOpen((prev) => !prev);
              }}
              historyCount={moveHistory.length}
              soundEnabled={settings.sfx}
              musicEnabled={settings.music}
              onToggleSound={() => {
                const next = !settings.sfx;
                handleUpdateSetting('sfx', next);
                showToast(next ? (t.toastSfxOn || '🔊 Effets sonores activés') : (t.toastSfxOff || '🔇 Effets sonores désactivés'));
              }}
              onToggleMusic={() => {
                const next = !settings.music;
                handleUpdateSetting('music', next);
                sound.toggleMusic(next);
                showToast(next ? (t.toastMusicOn || '🎵 Musique activée') : (t.toastMusicOff || '🔇 Musique désactivée'));
              }}
            />

            {/* Online match status bar */}
            {onlineMode && (
              <div className="w-full max-w-[370px] sm:max-w-[420px] bg-[#052118] border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs shadow-md">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnlineConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-bold text-gray-300 text-[11px]">
                    {t.roomColon || 'Salon :'} <strong className="text-amber-400 font-mono">{onlineRoomId}</strong>
                  </span>
                  <span className="text-[10px] text-gray-400">
                    ({isOnlineConnected ? (t.connectedStatus?.replace(/[()]/g, '') || 'Connecté') : (t.waitingStatus?.replace(/[()]/g, '') || 'En attente...')})
                  </span>
                </div>
              </div>
            )}

            {/* In-game Warning / Instructions Banner */}
            {bannerMessage && (
              <div className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-400/40 px-3 py-1 rounded-full text-center animate-pulse">
                {bannerMessage}
              </div>
            )}

            {/* Tournament Match Status Banner */}
            {activeTournamentMatch && (
              <div className="w-full max-w-[370px] sm:max-w-[420px] bg-gradient-to-r from-amber-500/20 via-[#161205] to-amber-500/20 border border-amber-400/50 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🏆</span>
                  <span className="font-extrabold text-amber-300 text-[11px] tracking-wide uppercase">
                    {activeTournamentMatch.match.roundName}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-gray-200">
                  <span>
                    {activeTournamentMatch.p1.flag} {activeTournamentMatch.p1.name}
                  </span>
                  <span className="mx-1.5 text-amber-400 font-mono">VS</span>
                  <span>
                    {activeTournamentMatch.p2.flag} {activeTournamentMatch.p2.name}
                  </span>
                </div>
              </div>
            )}

            {/* Interactive 5x5 Board with Last Move & Promotion glow */}
            <GameBoard
              board={board}
              selectedCoord={selectedCoord}
              validMoves={validMoves}
              onCellClick={handleCellClick}
              flipped={boardFlipped}
              showCoords={settings.showCoords}
              activeColor={turn}
              disabled={
                isGameOver ||
                isPaused ||
                Boolean(punishedCoords) ||
                (aiMode && turn !== playerColor) ||
                (onlineMode && (!isOnlineGameStarted || turn !== playerColor))
              }
              lastMove={lastMove}
              promotingCoord={promotingCoord}
              punishedCoords={punishedCoords}
              onReturnToMenu={handleConfirmLeave}
            />

            {/* 50-Moves Anti-Blocking Rule Reactive Badge */}
            <div
              className={`px-3.5 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-2 shadow-sm select-none ${
                movesWithoutCaptureCount >= 40
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : movesWithoutCaptureCount >= 25
                  ? 'bg-amber-950/70 border-amber-500/70 text-amber-300'
                  : 'bg-[#041d14]/90 border-emerald-500/40 text-emerald-300/90'
              }`}
            >
              <span>⚖️</span>
              <span>
                {t.movesWithoutCaptureLabel || 'Coups sans prise'} :{' '}
                <strong className="font-mono font-black">
                  {formatDigits(movesWithoutCaptureCount, settings.language)}/{formatDigits(50, settings.language)}
                </strong>
              </span>
              {movesWithoutCaptureCount >= 40 && (
                <span className="text-[10px] uppercase font-black text-rose-400 animate-bounce">
                  {t.imminentDraw || '⚠️ Imminent !'}
                </span>
              )}
            </div>

            {/* Live Move History Bar — En ligne : ouvert via le bouton haut sous "Coups sans prise" */}
            {((!onlineMode && settings.showMoveHistory) || (onlineMode && isOnlineHistoryOpen)) && (
              <div className="w-full flex justify-center animate-fade-in">
                <MoveHistoryBar history={moveHistory} turnCount={movesCount} />
              </div>
            )}

            {/* Bottom Color Tag for VS Computer only (supprimé en En Ligne / Amis) */}
            {aiMode && !onlineMode && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="text-[11px] font-bold tracking-widest text-amber-300 bg-[#052118] px-3.5 py-1.5 rounded-full border border-amber-500/30 shadow-md">
                  {playerColor === 'green' ? `🟢 ${t.you} : ${t.green ? t.green.toUpperCase() : 'VERT'}` : `🔴 ${t.you} : ${t.red ? t.red.toUpperCase() : 'ROUGE'}`}
                </div>
              </div>
            )}

            {/* Floating Animated Reaction (Online & Friend modes only) */}
            {onlineMode && !aiMode && activeReaction && (
              <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center animate-bounce">
                <div className="text-6xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                  {activeReaction.emoji}
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full mt-1 border shadow-md ${
                    activeReaction.color === 'green'
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                      : 'bg-rose-950/90 text-rose-300 border-rose-500/50'
                  }`}
                >
                  {activeReaction.color === playerColor ? t.meShortLabel : t.opponentShortLabel}
                </span>
              </div>
            )}

            {/* Game Chat & Emojis — Strictement en mode En Ligne et Amis, tout en bas de l'écran */}
            {onlineMode && !aiMode && (currentGameMode === 'online' || currentGameMode === 'friend') && (
              <GameChatOverlay
                onSendQuickPhrase={handleSendQuickPhrase}
                onSendEmoji={handleSendInGameEmoji}
                activeChatBubble={activeChatBubble}
              />
            )}
          </div>
        )}

        {/* 3. RULES SCREEN */}
        {screen === 'rules' && (
          <RulesScreen
            t={t}
            onBack={() => setScreen('menu')}
            onPlay={() => startNewGame(false)}
          />
        )}

        {/* 4. LEADERBOARD SCREEN */}
        {screen === 'lb' && (
          <LeaderboardScreen
            t={t}
            onBack={() => setScreen('menu')}
          />
        )}

        {/* 5. STATS SCREEN */}
        {screen === 'stats' && <StatsScreen onBack={() => setScreen('menu')} />}

        {/* 6. PUZZLES SCREEN */}
        {screen === 'puzzles' && <PuzzlesScreen onBack={() => setScreen('menu')} />}

        {/* 7. ONLINE MATCHMAKING SCREEN (RECHERCHE DE SERVEUR 1V1 EN LIGNE) */}
        {screen === 'online' && (
          <FriendVsMode
            initialMode="online"
            onBack={() => {
              setScreen('menu');
              sound.startMusic('menu', true);
            }}
            onUpdateLastOpponent={(opp: LastOpponent) => setLastOpponent(opp)}
            onShowToast={showToast}
            t={t}
          />
        )}

        {/* 8. TOURNAMENT SCREEN (Caché pour la publication officielle) */}
        {screen === 'tournament' && (
          <div className="w-full flex flex-col items-center justify-center p-8 text-center">
            <span className="text-sm font-bold text-amber-300">{t.redirectingHome}</span>
            {(() => {
              setTimeout(() => setScreen('menu'), 50);
              return null;
            })()}
          </div>
        )}

        {/* 9. VS FRIENDS (SALON PRIVÉ 1V1 AVEC CODE À 6 CHIFFRES) */}
        {screen === 'vs_friend' && (
          <FriendVsMode
            initialMode="friend"
            autoCreateRoom={!directDuelRoomCode && !!challengeTargetFriend}
            challengeFriendName={challengeTargetFriend?.name}
            directJoinRoomCode={directDuelRoomCode || undefined}
            directJoinRole={directDuelRole}
            onBack={() => {
              setChallengeTargetFriend(null);
              setDirectDuelRoomCode(null);
              setScreen('menu');
              sound.startMusic('menu', true);
            }}
            onUpdateLastOpponent={(opp: LastOpponent) => setLastOpponent(opp)}
            onShowToast={showToast}
            t={t}
          />
        )}
      </main>

      {/* ─── MODALS ─── */}
      <AIModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onStart={(diff, color) => {
          setIsAIModalOpen(false);
          startNewGame(true, diff, color);
        }}
        t={t}
      />

      <PauseModal
        isOpen={isPauseModalOpen}
        onResume={() => {
          sound.setGamePaused(false);
          setIsPaused(false);
          setIsPauseModalOpen(false);
          // Le son de la partie reprend fidèlement sans basculer sur le menu
          if (settings.music) sound.startMusic('game');
        }}
        onRestart={() => {
          setIsPauseModalOpen(false);
          startNewGame(aiMode, aiDiff, playerColor);
        }}
        onLeave={handleConfirmLeave}
        t={t}
      />

      <ConfirmLeaveModal
        isOpen={isLeaveModalOpen}
        onStay={() => setIsLeaveModalOpen(false)}
        onConfirm={handleConfirmLeave}
        t={t}
        isOnline={onlineMode}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdate={handleUpdateSetting}
        t={t}
        inGame={screen === 'game'}
        onExitApp={() => setIsExitAppModalOpen(true)}
        onOpenPuzzles={() => setScreen('puzzles')}
        onOpenRules={() => setScreen('rules')}
      />

      {(() => {
        const nextTournMatch = tournamentState ? getNextReadyMatch(tournamentState) : null;
        return (
          <>
            <GameOverModal
              isOpen={isGameOverModalOpen}
              winner={winner}
              forfeitMessage={forfeitMessage}
              playerColor={playerColorRef.current || playerColor}
              gameMode={currentGameModeRef.current || currentGameMode}
              endGameReason={endGameReason}
              player1Name={localPlayer1Name}
              player2Name={localPlayer2Name}
              onRematch={() => {
                sound.killAllCelebrationAudio();
                setIsGameOverModalOpen(false);
                setShowFireworks(false);
                setForfeitMessage(null);
                setEndGameReason(null);
                if (currentGameMode === 'online' && onlineRoomId) {
                  if (onlineChannelRef.current) {
                    onlineChannelRef.current.sendRematch();
                  }
                  startOnlineGame(onlineRoomId, isOnlineHost, playerColor, 'online', onlineChannelRef.current || undefined);
                } else {
                  startNewGame(aiMode, aiDiff, playerColor);
                }
              }}
              onMenu={() => {
                sound.killAllCelebrationAudio();
                setIsGameOverModalOpen(false);
                setShowFireworks(false);
                setForfeitMessage(null);
                setEndGameReason(null);
                if (onlineChannelRef.current) {
                  onlineChannelRef.current.destroy();
                  onlineChannelRef.current = null;
                }
                setOnlineMode(false);
                setIsOnlineConnected(false);
                setIsOnlineGameStarted(false);
                setActiveTournamentMatch(null);
                setTournamentEndInfo(null);
                setScreen('menu');
                sound.startMusic('menu', true);
              }}
              t={t}
              movesCount={movesCount}
              tournamentInfo={tournamentEndInfo}
              onBackToTournament={
                activeTournamentMatch
                  ? () => {
                      sound.stopVictoryCelebrationLoop();
                      setShowFireworks(false);
                      handleReturnToTournament();
                    }
                  : undefined
              }
              onNextTournamentMatch={
                activeTournamentMatch && nextTournMatch
                  ? () => {
                      sound.stopVictoryCelebrationLoop();
                      setIsGameOverModalOpen(false);
                      setShowFireworks(false);
                      setEndGameReason(null);
                      handleLaunchTournamentMatch(
                        nextTournMatch.match,
                        nextTournMatch.p1,
                        nextTournMatch.p2
                      );
                    }
                  : undefined
              }
              nextTournamentMatchLabel={
                nextTournMatch
                  ? t.nextTournamentMatchLabelFmt
                      .replace('{round}', nextTournMatch.match.roundName)
                      .replace('{p1}', nextTournMatch.p1.name)
                      .replace('{p2}', nextTournMatch.p2.name)
                  : null
              }
            />
            {/* Feux d'artifice strictement réservés à l'écran de victoire en fin de match */}
            <FireworksCelebration active={Boolean(showFireworks && isGameOverModalOpen && screen === 'game')} />
          </>
        );
      })()}

      {/* ─── RETENTION & SOCIAL MODALS (LUDO KING ADDICTIVE FEATURES) ─── */}
      <DailySpinModal
        isOpen={isSpinModalOpen}
        onClose={() => setIsSpinModalOpen(false)}
        onClaimReward={handleClaimSpinReward}
        canSpin={canSpinToday}
        lastSpinDate={userProfile.lastSpinDate}
        userCoins={userProfile.coins}
      />

      <ShopModal
        isOpen={isShopModalOpen}
        onClose={() => setIsShopModalOpen(false)}
        userProfile={userProfile}
        onAddCoins={(amount) => {
          sound.playCoins();
          setUserProfile(prev => {
            const updated = { ...prev, coins: prev.coins + amount };
            saveUserProfile(updated);
            return updated;
          });
        }}
        onShowToast={showToast}
      />

      <DailyMissionsModal
        isOpen={isMissionsModalOpen}
        onClose={() => setIsMissionsModalOpen(false)}
        userProfile={userProfile}
        missions={dailyMissions}
        onClaimMission={handleClaimMission}
        canClaimFreeBonusToday={canClaimFreeBonusToday}
        onClaimFreeBonus={handleClaimFreeDailyBonus}
      />

      <ChatSocialModal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        userFriendCode={userProfile.friendCode}
        userName={userProfile.name}
        userAvatar={userProfile.avatar}
        userFlag={userProfile.flag}
        friends={friends}
        lastOpponent={lastOpponent}
        incomingFriendRequests={incomingFriendRequests}
        sentFriendRequests={sentFriendRequests}
        onSendFriendRequest={handleSendFriendRequest}
        onAcceptFriendRequest={handleAcceptFriendRequest}
        onDeclineFriendRequest={handleDeclineFriendRequest}
        onCancelSentFriendRequest={handleCancelSentFriendRequest}
        onToggleSubscribe={handleToggleSubscribeFriend}
        onAddFriend={handleAddFriend}
        onChallengeFriend={handleChallengeFriend}
        onStartFriendDuel={(roomId, role, opp) => {
          setIsFriendsModalOpen(false);
          setDirectDuelRoomCode(roomId);
          setDirectDuelRole(role);
          setChallengeTargetFriend({
            id: opp?.id || 'opp',
            name: opp?.name || t.friendLabel,
            avatar: opp?.avatar || '👑',
            status: 'playing',
            level: 1,
            subscribed: true,
            friendCode: opp?.friendCode || roomId,
          });
          setScreen('vs_friend');
          sound.playStartSound();
          sound.startMusic('game', true);
        }}
        onUnreadMessagesCountChange={(total) => {
          setTotalUnreadChatMessages(total);
          if (total > 0) setHasUnreadChatMessages(true);
        }}
        onActiveChatOpenChange={(isActive) => {
          isChatConversationOpenRef.current = isActive;
        }}
        onShowToast={showToast}
      />

      {/* User Profile Modal (Edit Name, Choose Country Flag, Upload Local Photo, Link Email/Facebook, Choose All World Languages) */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onUpdateProfile={updated => {
          setUserProfile(updated);
          saveUserProfile(updated);
        }}
        onShowToast={showToast}
        currentLanguage={settings.language}
        onChangeLanguage={lang => handleUpdateSetting('language', lang)}
      />

      {/* Royal Notifications Modal (SMS logo / Bell next to Settings) */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        onNotificationAction={target => {
          if (target === 'tournament') setScreen('puzzles');
          else if (target === 'spin') setIsSpinModalOpen(true);
          else if (target === 'missions') setIsMissionsModalOpen(true);
          else if (target === 'friends') setIsFriendsModalOpen(true);
          else if (target === 'online') setScreen('online');
        }}
        onMarkAsRead={id => {
          markNotificationAsRead(id);
          setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
        }}
        onRefresh={() => {
          const fresh = generateFreshNotifications();
          setNotifications(fresh);
          showToast(t.notificationsRefreshed || '🔔 Notifications actualisées en direct');
        }}
        onMarkAllAsRead={() => {
          markAllNotificationsAsRead();
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }}
        onClearAll={() => {
          clearAllNotifications();
          setNotifications([]);
        }}
      />

      {/* Cross-Platform Social Sharing Modal (WhatsApp, SMS, Facebook, Twitter, Telegram, Clipboard) */}
      <ShareSocialModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        userFriendCode={userProfile.friendCode}
        onShowToast={showToast}
      />

      {/* New Game Reset Confirmation Modal */}
      <NewGameConfirmModal
        isOpen={isNewGameConfirmModalOpen}
        onCancel={() => setIsNewGameConfirmModalOpen(false)}
        onConfirm={() => {
          setIsNewGameConfirmModalOpen(false);
          startNewGame(aiMode, aiDiff, playerColor);
        }}
        t={t}
      />

      {/* First Launch Onboarding & Authentication Modal */}
      <AuthOnboardingModal
        isOpen={isFirstLaunchModalOpen}
        userProfile={userProfile}
        onComplete={(updated) => {
          setUserProfile(updated);
          setIsFirstLaunchModalOpen(false);
          showToast(t.toastWelcomeBonus.replace('{name}', updated.name));
        }}
        t={(key, def) => (t as any)[key] || def || key}
      />

      {/* Hardware / Browser Back Button Exit Confirmation on Home Screen */}
      <ExitAppModal
        isOpen={isExitAppModalOpen}
        onStay={() => setIsExitAppModalOpen(false)}
        onExit={handleExecuteExitApp}
        t={t}
      />

      {/* Configuration des noms des joueurs pour le mode Jeu Local (Pass & Play) */}
      <LocalPlayersModal
        isOpen={isLocalSetupModalOpen}
        onClose={() => setIsLocalSetupModalOpen(false)}
        defaultP1Name={localPlayer1Name}
        defaultP2Name={localPlayer2Name}
        onStartGame={(p1, p2, startingTurnPref) => {
          setLocalPlayer1Name(p1);
          setLocalPlayer2Name(p2);
          setIsLocalSetupModalOpen(false);
          const startingColor = startingTurnPref === 'random' ? (Math.random() < 0.5 ? 'green' : 'red') : startingTurnPref;
          startNewGame(false, 'medium', startingColor);
          showToast(t.toastLocalMatchStart.replace('{p1}', p1).replace('{p2}', p2));
        }}
      />

      {/* Alerte explicite de connexion Internet pour les modes En Ligne & VS Amis */}
      <OfflineNoticeModal
        isOpen={!!offlineNotice?.isOpen}
        onClose={() => setOfflineNotice(null)}
        modeTitle={offlineNotice?.modeTitle || t.online}
        onPlayVsAi={() => {
          setOfflineNotice(null);
          setIsAIModalOpen(true);
        }}
        onPlayLocal={() => {
          setOfflineNotice(null);
          setIsLocalSetupModalOpen(true);
        }}
      />

      {/* Clean Terminated Screen for Browser / Mobile Web when window.close() cannot close tab directly */}
      {isAppTerminated && (
        <div className="fixed inset-0 z-[100] bg-[#042f2e] text-[#f0e6c8] flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
          <div className="relative mb-6">
            <img
              src="/logo du jeu.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/game-logo.png';
              }}
              alt="12 PIONS"
              className="w-36 h-36 object-contain rounded-2xl drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] border-2 border-amber-400/50"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-amber-400 uppercase tracking-wider mb-2">
            {t.appClosedTitle}
          </h1>
          <p className="text-sm text-amber-100/80 max-w-xs mb-8">
            {t.appClosedDesc}
          </p>
          <button
            type="button"
            onClick={() => setIsAppTerminated(false)}
            className="px-6 py-3 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 border-b-4 border-amber-800 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-all cursor-pointer"
          >
            {t.relaunchGameBtn}
          </button>
        </div>
      )}
    </div>
  </TranslationProvider>
  );
}
