import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Board, Coord, ValidMove, PieceColor, LastMove, UserProfile, Difficulty, MoveStep, MoveHistoryItem } from '../types';
import {
  createInitialBoard,
  calculateValidMoves,
  getAllCapturingPieces,
  selectPunishedPiece,
  cloneBoard,
  countPieces,
  applyPromotions,
  chooseBestAIMove,
  getAIMoves,
} from '../utils/gameLogic';
import { sound } from '../utils/audio';
import { socket } from '../utils/gameSocket';
import { recordGameResult } from '../utils/statsStorage';
import { getOrCreateUserProfile, saveUserProfile } from '../utils/userProfile';
import { Translations, getTranslations } from '../utils/translations';
import { useTranslation } from '../i18n/useTranslation';
import { GameBoard } from './GameBoard';
import { MoveHistoryBar } from './MoveHistoryBar';
import { GameChatOverlay, ActiveInGameChatBubble } from './GameChatOverlay';
import { FireworksCelebration } from './FireworksCelebration';
import confetti from 'canvas-confetti';
import {
  Users,
  Crown,
  KeyRound,
  ArrowLeft,
  Copy,
  Check,
  X,
  MessageCircle,
  Share2,
  AlertCircle,
  RotateCcw,
  ClipboardList,
  CheckCircle2,
  Trophy,
  Volume2,
  VolumeX,
  Music,
  Wifi,
  WifiOff,
  Sparkles,
  Globe,
  Edit3,
  Home,
  RefreshCw,
} from 'lucide-react';

interface FriendVsModeProps {
  initialMode?: 'friend' | 'online';
  autoCreateRoom?: boolean;
  challengeFriendName?: string;
  directJoinRoomCode?: string;
  directJoinRole?: 'host' | 'guest';
  onBack: () => void;
  onShowToast?: (msg: string) => void;
  onUpdateLastOpponent?: (opp: any) => void;
  t?: Translations;
}

type VsView = 'LOBBY' | 'WAITING' | 'MATCHMAKING' | 'GAME';

interface GameResultState {
  isOver: boolean;
  winner: PieceColor | 'draw';
  isWin: boolean;
  reason: 'self_forfeit' | 'opponent_left' | 'capture' | 'draw_50_moves' | 'draw_1v1' | 'draw' | 'blocked';
  message: string;
  coinsGained: number;
  xpGained: number;
}

export const FriendVsMode: React.FC<FriendVsModeProps> = ({
  initialMode = 'friend',
  autoCreateRoom = false,
  challengeFriendName,
  directJoinRoomCode,
  directJoinRole,
  onBack,
  onShowToast,
  onUpdateLastOpponent,
  t: propT,
}) => {
  const { t: contextT, formatNumber, formatDigits, formatTime, language } = useTranslation();
  const t = useMemo(() => {
    const fn = (key: string, defaultVal?: string): string => {
      if (typeof contextT === 'function') {
        const val = contextT(key, defaultVal);
        if (val && val !== key) return val;
      }
      if (propT && (propT as any)[key]) {
        return (propT as any)[key];
      }
      return defaultVal !== undefined ? defaultVal : key;
    };
    const combined = {
      ...(typeof contextT === 'object' ? contextT : {}),
      ...(propT || {}),
    };
    return Object.assign(fn, combined) as any;
  }, [contextT, propT]);
  const [mode, setMode] = useState<'friend' | 'online'>(initialMode);
  const [view, setView] = useState<VsView>(initialMode === 'online' ? 'MATCHMAKING' : 'LOBBY');
  const [lobbyTab, setLobbyTab] = useState<'create' | 'join'>('create');
  const [searchTimer, setSearchTimer] = useState<number>(0);

  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [role, setRole] = useState<'host' | 'guest'>('host');
  const [myColor, setMyColor] = useState<PieceColor>('green');
  const [hostColorPref, setHostColorPref] = useState<'green' | 'red' | 'random'>('green');

  // Profil et Noms des joueurs (En Ligne & VS Amis) : Modifiables à tout moment
  const [userProfile, setUserProfile] = useState<UserProfile>(() => getOrCreateUserProfile());
  const [opponentName, setOpponentName] = useState<string>('CHAMPION_ROYAL');
  const [opponentAvatar, setOpponentAvatar] = useState<string>('👑');
  const [opponentPhoto, setOpponentPhoto] = useState<string | undefined>(undefined);
  const [opponentFlag, setOpponentFlag] = useState<string | undefined>(undefined);
  const [opponentCountry, setOpponentCountry] = useState<string | undefined>(undefined);
  const [opponentRating, setOpponentRating] = useState<number | undefined>(undefined);
  const [opponentLevel, setOpponentLevel] = useState<number | undefined>(undefined);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(() => getOrCreateUserProfile().name || 'Champion');
  const [isOfflineWarningOpen, setIsOfflineWarningOpen] = useState<boolean>(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOfflineWarningOpen(false);
    const handleOffline = () => setIsOfflineWarningOpen(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      sound.killAllCelebrationAudio();
    };
  }, []);

  const myColorRef = useRef<PieceColor>('green');
  const roleRef = useRef<'host' | 'guest'>('host');
  const roomCodeRef = useRef<string>('');
  const [isBotMatch, setIsBotMatch] = useState<boolean>(false);
  const isBotMatchRef = useRef<boolean>(false);
  const [matchNonce, setMatchNonce] = useState<number>(0);
  const [isAcceptingRematch, setIsAcceptingRematch] = useState<boolean>(false);

  const opponentFriendCodeRef = useRef<string | undefined>(undefined);
  const opponentIdRef = useRef<string | undefined>(undefined);
  const opponentNameRef = useRef<string>(opponentName);
  const opponentAvatarRef = useRef<string>(opponentAvatar);
  const opponentFlagRef = useRef<string | undefined>(opponentFlag);
  const opponentCountryRef = useRef<string | undefined>(opponentCountry);
  opponentNameRef.current = opponentName;
  opponentAvatarRef.current = opponentAvatar;
  opponentFlagRef.current = opponentFlag;
  opponentCountryRef.current = opponentCountry;

  const onShowToastRef = useRef(onShowToast);
  onShowToastRef.current = onShowToast;
  const onUpdateLastOpponentRef = useRef(onUpdateLastOpponent);
  onUpdateLastOpponentRef.current = onUpdateLastOpponent;
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    myColorRef.current = myColor;
  }, [myColor]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    isBotMatchRef.current = isBotMatch;
  }, [isBotMatch]);

  // End of match & forfeit states
  const [gameResult, setGameResult] = useState<GameResultState | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [isConfirmLeaveOpen, setIsConfirmLeaveOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => sound.sfxEnabled);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => sound.musicEnabled);
  const [activeChatBubble, setActiveChatBubble] = useState<ActiveInGameChatBubble | null>(null);
  const chatBubbleTimerRef = useRef<number | null>(null);

  // Pré-remplir le code si présent dans l'URL (?room=123456)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r) {
        const clean = r.trim().replace(/[^0-9]/g, '');
        if (clean.length >= 4) {
          setInputCode(clean);
          setLobbyTab('join');
        }
      }
    }
  }, []);

  // Connexion directe et simultanée lors d'un duel entre amis validé depuis le chat
  useEffect(() => {
    if (directJoinRoomCode) {
      const clean = directJoinRoomCode.trim();
      setRoomCode(clean);
      roomCodeRef.current = clean;
      const initialRole = directJoinRole || 'guest';
      setRole(initialRole);
      roleRef.current = initialRole;
      setMyColor(initialRole === 'host' ? 'green' : 'red');
      myColorRef.current = initialRole === 'host' ? 'green' : 'red';
      setView('GAME');
      viewRef.current = 'GAME';
      setIsWaiting(false);
      socket.setSessionInfo({
        roomId: clean,
        role: initialRole,
        playerId: userProfile.friendCode || userProfile.name,
        color: initialRole === 'host' ? 'green' : 'red',
      });
      socket.emit('join_room', {
        roomId: clean,
        role: initialRole,
        playerId: userProfile.friendCode || userProfile.id,
        friendCode: userProfile.friendCode,
        playerName: userProfile.name || 'Joueur',
        avatar: userProfile.avatar || '👑',
        customPhoto: userProfile.customPhoto,
        flag: userProfile.flag,
      });
    }
  }, [directJoinRoomCode, directJoinRole]);

  // Déclenchement automatique de la création de salon lorsqu'on clique sur "Défier"
  useEffect(() => {
    if (autoCreateRoom && initialMode === 'friend' && view === 'LOBBY' && !roomCode) {
      handleCreateRoom();
      if (challengeFriendName && onShowToast) {
        onShowToast(
          t('toastRoomCreatedForFriend', 'Salon créé pour défier {name} ! Partagez le code ou le lien.')
            .replace('{name}', challengeFriendName)
        );
      }
    }
  }, [autoCreateRoom]);

  // ─── GESTION DU MATCHMAKING EN LIGNE (AUTOMATIQUE & INSTANTANÉ) ───
  useEffect(() => {
    if (view !== 'MATCHMAKING') return;

    setSearchTimer(0);
    const interval = setInterval(() => {
      setSearchTimer((prev) => prev + 1);
    }, 1000);

    socket.emit('search_match', {
      preferredColor: 'random',
      playerId: userProfile.friendCode || userProfile.id,
      friendCode: userProfile.friendCode,
      playerName: userProfile.name || 'Joueur',
      avatar: userProfile.avatar || '👑',
      customPhoto: userProfile.customPhoto,
      flag: userProfile.flag,
    });

    return () => {
      clearInterval(interval);
      socket.emit('cancel_match', {});
    };
  }, [view]);

  const handleCancelMatchmaking = () => {
    sound.playSelect();
    socket.emit('cancel_match', {});
    onBack();
  };

  // Game state
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('green');
  const [selectedCoord, setSelectedCoord] = useState<Coord | null>(null);
  const [validMoves, setValidMoves] = useState<ValidMove[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [punishedCoords, setPunishedCoords] = useState<Coord[] | null>(null);

  // Status & timers
  const [timerSec, setTimerSec] = useState<number>(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const boardRef = useRef<Board>(board);
  boardRef.current = board;
  const currentTurnRef = useRef<PieceColor>(currentTurn);
  currentTurnRef.current = currentTurn;
  const timerSecRef = useRef<number>(30);
  timerSecRef.current = timerSec;
  const turnIdRef = useRef<number>(0);
  const viewRef = useRef<VsView>(view);
  viewRef.current = view;
  const gameResultRef = useRef<GameResultState | null>(gameResult);
  gameResultRef.current = gameResult;
  const consecutiveTimeoutsRef = useRef<{ green: number; red: number }>({ green: 0, red: 0 });

  // Rematch & Anti-Freeze states
  const [rematchStatus, setRematchStatus] = useState<'IDLE' | 'REQUESTING' | 'PENDING' | 'DECLINED'>('IDLE');
  const [incomingRematch, setIncomingRematch] = useState<{ requesterName: string } | null>(null);
  const [rematchRefusedByOpponent, setRematchRefusedByOpponent] = useState<boolean>(false);
  const [iRefusedRematch, setIRefusedRematch] = useState<boolean>(false);
  const [opponentHasLeft, setOpponentHasLeft] = useState<boolean>(false);

  // 💥 Multi-captures : Aligné à 100% sur le mode Local (enchaînement strict et maintien de tour)
  const [chainPiecePos, setChainPiecePos] = useState<Coord | null>(null);
  const [chainLastDir, setChainLastDir] = useState<[number, number] | null>(null);
  const chainPiecePosRef = useRef<Coord | null>(null);
  chainPiecePosRef.current = chainPiecePos;
  const [reconnectBufferSec, setReconnectBufferSec] = useState<number | null>(null);

  // ⚖️ Règle des 50 coups sans prise (En Ligne & Amis) : synchronisé avec le serveur
  const [movesWithoutCaptureCount, setMovesWithoutCaptureCount] = useState<number>(0);

  // ⚙️ Coordonnées & Historique unifié des coups / captures
  const [showCoords] = useState<boolean>(() => {
    try {
      const sV2 = localStorage.getItem('dama_settings_v2');
      if (sV2) return Boolean(JSON.parse(sV2).showCoords);
      const s = localStorage.getItem('checkers_settings');
      if (s) return Boolean(JSON.parse(s).showCoords);
    } catch {}
    return false;
  });
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);

  const toNotation = (r: number, c: number): string => {
    const cols = ['A', 'B', 'C', 'D', 'E'];
    return `${cols[c]}${5 - r}`;
  };

  const addMoveToHistory = (lMove: LastMove | null, pieceColor: PieceColor, isPromo = false) => {
    if (!lMove) return;
    setMoveHistory(prev => {
      const from = toNotation(lMove.fr, lMove.fc);
      const to = toNotation(lMove.tr, lMove.tc);
      const now = Date.now();
      const last = prev[prev.length - 1];
      if (last && last.from === from && last.to === to && last.color === pieceColor) {
        const lastTs = Number(last.id.split('-')[0]) || 0;
        if (now - lastTs < 1800) {
          return prev;
        }
      }
      const item: MoveHistoryItem = {
        id: `${now}-${Math.random()}`,
        from,
        to,
        color: pieceColor,
        isCap: Boolean(lMove.isCap),
        isPromo,
      };
      return [...prev.slice(-99), item];
    });
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    sound.sfxEnabled = next;
    setSfxEnabled(next);
    try {
      const sV2 = localStorage.getItem('dama_settings_v2');
      if (sV2) {
        const parsed = JSON.parse(sV2);
        localStorage.setItem('dama_settings_v2', JSON.stringify({ ...parsed, sfx: next }));
      }
    } catch {}
    if (next) sound.playSelect();
    if (onShowToast) {
      onShowToast(next ? t('toastSfxOn', '🔊 Effets sonores activés') : t('toastSfxOff', '🔇 Effets sonores désactivés'));
    }
  };

  const handleToggleMusic = () => {
    const next = !musicEnabled;
    sound.musicEnabled = next;
    setMusicEnabled(next);
    if (next) {
      sound.startMusic('game');
    } else {
      sound.stopMusic();
    }
    try {
      const sV2 = localStorage.getItem('dama_settings_v2');
      if (sV2) {
        const parsed = JSON.parse(sV2);
        localStorage.setItem('dama_settings_v2', JSON.stringify({ ...parsed, music: next }));
      }
    } catch {}
    if (onShowToast) {
      onShowToast(next ? t('toastMusicOn', '🎵 Musique activée') : t('toastMusicOff', '🔇 Musique désactivée'));
    }
  };

  // ⚖️ ARRÊT IMMÉDIAT ET AUTOMATIQUE AU 50E COUP SANS PRISE : VICTOIRE AU NOMBRE DE PIONS RESTANTS
  useEffect(() => {
    if (view === 'GAME' && !gameResult?.isOver && movesWithoutCaptureCount >= 50) {
      const curB = boardRef.current || board;
      const counts = countPieces(curB);
      let winner50: PieceColor | 'draw' = 'draw';
      let isWin = false;
      let msg = t('toastFiftyMoveDrawCounts', '🤝 50 coups sans prise : Match Nul ({green} vs {red} pions) !')
        .replace('{green}', String(counts.green))
        .replace('{red}', String(counts.red));
      if (counts.green > counts.red) {
        winner50 = 'green';
        isWin = (myColorRef.current === 'green');
        msg = t('toastFiftyMoveGreenWin', '⚖️ 50 coups sans prise : Victoire des Verts ({green} vs {red} pions) !')
          .replace('{green}', String(counts.green))
          .replace('{red}', String(counts.red));
      } else if (counts.red > counts.green) {
        winner50 = 'red';
        isWin = (myColorRef.current === 'red');
        msg = t('toastFiftyMoveRedWin', '⚖️ 50 coups sans prise : Victoire des Rouges ({red} vs {green} pions) !')
          .replace('{red}', String(counts.red))
          .replace('{green}', String(counts.green));
      }
      awardPlayerResult(isWin, winner50, 'draw_50_moves', msg);
      const curRoom = roomCode || roomCodeRef.current;
      if (curRoom) {
        socket.emit('claim_draw_50', { roomId: curRoom });
      }
    }
  }, [movesWithoutCaptureCount, view, gameResult?.isOver]);

  // Maintien actif de la session multijoueur pour reconnexion immédiate en cas de micro-coupure
  useEffect(() => {
    if (view === 'GAME' && roomCodeRef.current) {
      socket.setSessionInfo({
        roomId: roomCodeRef.current,
        role: roleRef.current,
        playerId: userProfile.id || `p_${Date.now()}`,
        color: myColorRef.current,
      });
    } else if (view === 'LOBBY') {
      socket.clearSessionInfo();
    }
  }, [view, roomCode, role, myColor, userProfile.id]);

  const isAutoMoveRunningRef = useRef<boolean>(false);
  const autoMoveLockTurnIdRef = useRef<number>(-1);

  const playAutoMove = (movingColor: PieceColor) => {
    // 🛡️ SÉCURITÉ : Un joueur local ne doit JAMAIS exécuter de coup automatique pour son adversaire humain
    // (L'adversaire ou le serveur autoritaire s'en charge de son côté)
    if (movingColor !== myColorRef.current && !isBotMatchRef.current && !roomCode?.startsWith('online_bot_') && !roomCodeRef.current?.startsWith('online_bot_')) {
      console.warn('[Anti-Bot Safeguard] Coup refusé : impossible de jouer pour un adversaire humain.');
      return;
    }

    // 🛡️ VERROU STRICT ANTI-DOUBLE COUP : un seul et unique coup auto par tour
    if (autoMoveLockTurnIdRef.current === turnIdRef.current) return;
    if (isAutoMoveRunningRef.current) return;
    if (currentTurnRef.current !== movingColor) return;
    if (viewRef.current !== 'GAME' || gameResultRef.current?.isOver) return;

    autoMoveLockTurnIdRef.current = turnIdRef.current;
    isAutoMoveRunningRef.current = true;

    try {
      const curBoard = boardRef.current || board;
      const oppCol: PieceColor = movingColor === 'green' ? 'red' : 'green';
      const isBot = (isBotMatchRef.current || Boolean(roomCode?.startsWith('online_bot_') || roomCodeRef.current?.startsWith('online_bot_'))) && movingColor !== myColorRef.current;
      // Grand maître (hard) pour le profil virtuel, easy pour le coup de pénalité de temps du joueur
      const diff: Difficulty = isBot ? 'hard' : 'easy';

      let autoStep: MoveStep | null = null;
      try {
        autoStep = chooseBestAIMove(curBoard, movingColor, oppCol, diff, []);
      } catch (err) {
        console.error('[Client AI Warning] Recovery fallback to safe legal move:', err);
      }

      if (!autoStep) {
        const safeMoves = getAIMoves(curBoard, movingColor);
        autoStep = safeMoves.length > 0 ? safeMoves[0] : null;
      }

      if (!autoStep) {
        awardPlayerResult(
          myColorRef.current !== movingColor,
          oppCol,
          'blocked',
          movingColor === myColorRef.current
            ? tRef.current('toastNoMovesLeft', 'Aucun coup disponible. Partie terminée.')
            : tRef.current('opponentBlockedWin', 'Victoire ! L’adversaire n’a plus aucun coup valide.')
        );
        return;
      }

      const nextBoard = cloneBoard(curBoard);
      const movingPiece = nextBoard[autoStep.fr][autoStep.fc];
      if (!movingPiece) return;

      nextBoard[autoStep.tr][autoStep.tc] = movingPiece;
      nextBoard[autoStep.fr][autoStep.fc] = null;

      const isCapture = Boolean(autoStep.isCap);
      if (isCapture && autoStep.cr !== undefined && autoStep.cc !== undefined) {
        nextBoard[autoStep.cr][autoStep.cc] = null;
        sound.playCapture();
      } else {
        sound.playMove();
      }

      applyPromotions(nextBoard, { r: autoStep.tr, c: autoStep.tc });

      const moveDetails: LastMove = {
        fr: autoStep.fr,
        fc: autoStep.fc,
        tr: autoStep.tr,
        tc: autoStep.tc,
        isCap: isCapture,
      };

      // Chaînage multi-capture pour le bot virtuel
      if (isCapture && isBot) {
        const stepDir: [number, number] = [
          Math.sign((autoStep.cr ?? autoStep.tr) - autoStep.fr) || 0,
          Math.sign((autoStep.cc ?? autoStep.tc) - autoStep.fc) || 0,
        ];
        const furtherCaps = calculateValidMoves(nextBoard, autoStep.tr, autoStep.tc, { r: autoStep.tr, c: autoStep.tc }, {}, stepDir).filter(m => m.t === 'c');

        if (furtherCaps.length > 0) {
          boardRef.current = nextBoard;
          setBoard(nextBoard);
          setTimerSec(30);
          setLastMove(moveDetails);

          const currentRoomCode = roomCode || roomCodeRef.current;
          socket.emit('MOVE_PIECE', {
            roomId: currentRoomCode,
            board: nextBoard,
            nextTurn: movingColor,
            turn: movingColor,
            currentTurn: movingColor,
            lastMove: moveDetails,
            isChainStep: true,
            wasPenalty: false,
            isAutoMove: true,
            movingColor,
          });

          // Étape suivante de la multi-capture
          setTimeout(() => {
            if (currentTurnRef.current === movingColor && viewRef.current === 'GAME' && !gameResultRef.current?.isOver) {
              autoMoveLockTurnIdRef.current = -1;
              playAutoMove(movingColor);
            }
          }, 350);
          return;
        }
      }

      const nextTurn: PieceColor = movingColor === 'green' ? 'red' : 'green';

      // Synchronisation immédiate des références avant le re-render React
      boardRef.current = nextBoard;
      currentTurnRef.current = nextTurn;
      turnIdRef.current += 1;

      setBoard(nextBoard);
      setCurrentTurn(nextTurn);
      setTimerSec(30);
      setLastMove(moveDetails);
      setSelectedCoord(null);
      setValidMoves([]);

      const currentRoomCode = roomCode || roomCodeRef.current;
      socket.emit('MOVE_PIECE', {
        roomId: currentRoomCode,
        board: nextBoard,
        nextTurn,
        turn: nextTurn,
        currentTurn: nextTurn,
        lastMove: moveDetails,
        wasPenalty: false,
        isChainStep: false,
        isAutoMove: true,
        movingColor,
      });

      addMoveToHistory(moveDetails, movingColor);

      const isCap = Boolean(moveDetails.isCap);
      const nextNoCap = isCap ? 0 : movesWithoutCaptureCount + 1;
      setMovesWithoutCaptureCount(nextNoCap);

      if (nextNoCap >= 50) {
        const counts = countPieces(nextBoard);
        let winner50: PieceColor | 'draw' = 'draw';
        let isWin = false;
        let msg = tRef.current('toastFiftyMoveDrawCounts', '🤝 50 coups sans prise : Match Nul ({green} vs {red} pions) !')
          .replace('{green}', String(counts.green))
          .replace('{red}', String(counts.red));
        if (counts.green > counts.red) {
          winner50 = 'green';
          isWin = (myColorRef.current === 'green');
          msg = tRef.current('toastFiftyMoveGreenWin', '⚖️ 50 coups sans prise : Victoire des Verts ({green} vs {red} pions) !')
            .replace('{green}', String(counts.green))
            .replace('{red}', String(counts.red));
        } else if (counts.red > counts.green) {
          winner50 = 'red';
          isWin = (myColorRef.current === 'red');
          msg = tRef.current('toastFiftyMoveRedWin', '⚖️ 50 coups sans prise : Victoire des Rouges ({red} vs {green} pions) !')
            .replace('{red}', String(counts.red))
            .replace('{green}', String(counts.green));
        }
        awardPlayerResult(isWin, winner50, 'draw_50_moves', msg);
        const currentRoomCode = roomCode || roomCodeRef.current;
        socket.emit('claim_draw_50', { roomId: currentRoomCode });
        return;
      }

      const counts = countPieces(nextBoard);
      if (counts.green === 0 && counts.red > 0) {
        awardPlayerResult(
          myColorRef.current === 'red',
          'red',
          'capture',
          myColorRef.current === 'red'
            ? tRef.current('toastCapturedAllGreen', 'Félicitations ! Vous avez capturé tous les pions verts !')
            : tRef.current('toastAllPawnsCaptured', 'Tous vos pions ont été capturés.')
        );
      } else if (counts.red === 0 && counts.green > 0) {
        awardPlayerResult(
          myColorRef.current === 'green',
          'green',
          'capture',
          myColorRef.current === 'green'
            ? tRef.current('toastCapturedAllRed', 'Félicitations ! Vous avez capturé tous les pions rouges !')
            : tRef.current('toastAllPawnsCaptured', 'Tous vos pions ont été capturés.')
        );
      } else if (counts.green === 1 && counts.red === 1) {
        const gCaps = getAllCapturingPieces(nextBoard, 'green');
        const rCaps = getAllCapturingPieces(nextBoard, 'red');
        if (gCaps.length === 0 && rCaps.length === 0) {
          awardPlayerResult(
            false,
            'draw',
            'draw_1v1',
            tRef.current('toastDrawOnePawnEach', '⚖️ Match nul ! 1 pion restant de chaque côté sans possibilité de capture.')
          );
        }
      }
    } finally {
      isAutoMoveRunningRef.current = false;
    }
  };

  // ─── GESTION DE LA TOUCHE RETOUR DE L'APPAREIL EN MODE VS AMIS & EN LIGNE ───
  // Fait EXACTEMENT la même chose que le bouton Accueil pendant une partie
  useEffect(() => {
    const handleDeviceBack = () => {
      if (view === 'GAME' && !gameResult?.isOver) {
        // Ouvre la confirmation d'abandon exactement comme le bouton Accueil
        setIsConfirmLeaveOpen(true);
      } else if (view === 'WAITING') {
        setIsWaiting(false);
        setView('LOBBY');
      } else if (view === 'MATCHMAKING') {
        socket.emit('cancel_match', {});
        onBack();
      } else if (view === 'LOBBY') {
        onBack();
      }
    };

    window.addEventListener('vs_friend_device_back', handleDeviceBack);
    return () => {
      window.removeEventListener('vs_friend_device_back', handleDeviceBack);
    };
  }, [view, gameResult, onBack]);

  // Interactive emoji reaction floating on board
  const [activeReaction, setActiveReaction] = useState<{
    emoji: string;
    from: 'me' | 'opponent';
  } | null>(null);

  // ─── AMBIANCE SONORE DU JEU EN LIGNE (SON DE JEU / PARTIE) ───
  useEffect(() => {
    if (view === 'GAME' || mode === 'online' || initialMode === 'online') {
      sound.startMusic('game');
    } else {
      sound.startMusic('menu');
    }
    return () => {
      sound.startMusic('menu', true);
    };
  }, [view, mode, initialMode]);

  // ─── COMPTE À REBOURS LOCAL SYNCHRONISÉ (30 SECONDES) & TOLÉRANCE MESURÉE ───
  useEffect(() => {
    if (view !== 'GAME' || gameResult) return;

    // Incrémente l'ID unique de ce tour pour isoler rigoureusement ce compte à rebours
    turnIdRef.current += 1;
    const currentTurnId = turnIdRef.current;
    const turnColor = currentTurn;

    let secondsLeft = 30;
    setTimerSec(30);

    const interval = setInterval(() => {
      // 1. Nettoyage strict : si le tour a changé ou si la partie est terminée, désactiver l'intervalle
      if (turnIdRef.current !== currentTurnId || currentTurnRef.current !== turnColor || gameResultRef.current?.isOver) {
        clearInterval(interval);
        return;
      }

      secondsLeft -= 1;
      setTimerSec(Math.max(0, secondsLeft));

      if (secondsLeft <= 5 && secondsLeft > 0 && currentTurnRef.current === myColorRef.current) {
        sound.playTimerTick();
      }

      // 🤖 SÉCURITÉ ANTI-TEMPS MORT PROACTIVE POUR LES PROFILS VIRTUELS (BOTS) EN LIGNE
      // UNIQUEMENT actif si la partie est un VRAI match contre un profil virtuel (bot)
      const isActualBotMatch = Boolean(isBotMatchRef.current === true || roomCode?.startsWith('online_bot_') || roomCodeRef.current?.startsWith('online_bot_'));
      const isBotTurn = isActualBotMatch && turnColor !== myColorRef.current;

      if (isBotTurn && !gameResultRef.current?.isOver) {
        // Dès 27 secondes restantes (après 3s sans action serveur), solliciter l'arbitrage immédiat du serveur
        if (secondsLeft === 27) {
          const curRoom = roomCode || roomCodeRef.current;
          if (curRoom) {
            socket.emit('check_turn_timeout', { roomId: curRoom });
          }
        }
        // Sécurité absolue pour bot virtuel : À 25 secondes restantes (après 5s max), forcer l'exécution automatique du coup du bot
        // Le bot virtuel ne descendra JAMAIS en dessous de 25s et ne bloquera JAMAIS le jeu à 0s
        if (secondsLeft <= 25) {
          clearInterval(interval);
          playAutoMove(turnColor);
          return;
        }
      }

      // 2. Condition STRICTE de déclenchement :
      // La fin de partie ne doit STRICTEMENT s'évaluer que si le compteur atteint physiquement 0 seconde (secondsLeft <= 0).
      if (secondsLeft <= 0) {
        clearInterval(interval);

        // C'est au tour du joueur local d'agir
        if (
          turnIdRef.current === currentTurnId &&
          currentTurnRef.current === turnColor &&
          turnColor === myColorRef.current &&
          !gameResultRef.current?.isOver
        ) {
          if (autoMoveLockTurnIdRef.current === currentTurnId) return;

          const priorExpirations = consecutiveTimeoutsRef.current[myColorRef.current] || 0;

          if (priorExpirations >= 1) {
            // 🛑 RÈGLE 3 : DEUXIÈME INACTIVITÉ CONSÉCUTIVE : arrêt instantané du match, défaite par forfait
            autoMoveLockTurnIdRef.current = currentTurnId;
            const oppColor: PieceColor = myColorRef.current === 'green' ? 'red' : 'green';
            const curRoom = roomCode || roomCodeRef.current;
            if (curRoom) {
              socket.emit('leave_room', {
                roomId: curRoom,
                reason: 'consecutive_timeout',
                forfeit: true,
                loser: myColorRef.current,
                winner: oppColor,
              });
            }
            awardPlayerResult(
              false,
              oppColor,
              'self_forfeit',
              tRef.current('toastDoubleInactivityForfeit', 'Défaite par forfait : Deuxième inactivité consécutive de 30 secondes.')
            );
            return;
          }

          // ⚠️ RÈGLE 1 : PREMIÈRE INACTIVITÉ (1er tour manqué de 30 secondes complètes)
          // Valable aussi bien contre un joueur humain que contre un profil virtuel (bot)
          consecutiveTimeoutsRef.current[myColorRef.current] = 1;
          sound.playPenalty();

          if (onShowToast) {
            onShowToast(
              tRef.current(
                'toastTimerWarningSelf30s',
                '⚠️ 1er avertissement : Temps écoulé (30s) ! Coup d’IA joué à votre place. Attention, 2e inactivité consécutive = défaite par forfait !'
              )
            );
          }
          playAutoMove(myColorRef.current);
        } else if (
          turnIdRef.current === currentTurnId &&
          currentTurnRef.current === turnColor &&
          turnColor !== myColorRef.current &&
          !gameResultRef.current?.isOver
        ) {
          // Si le minuteur de l'adversaire ou du bot virtuel arrive à 0, avertir le serveur pour arbitrage
          const curRoom = roomCode || roomCodeRef.current;
          if (curRoom) {
            socket.emit('check_turn_timeout', { roomId: curRoom });
          }

          // Uniquement pour les profils virtuels (bots), sécurité anti-freeze si le serveur tarde
          if (isActualBotMatch) {
            setTimeout(() => {
              if (
                turnIdRef.current === currentTurnId &&
                currentTurnRef.current === turnColor &&
                turnColor !== myColorRef.current &&
                !gameResultRef.current?.isOver &&
                viewRef.current === 'GAME' &&
                Boolean(isBotMatchRef.current === true || roomCodeRef.current?.startsWith('online_bot_'))
              ) {
                console.warn('[Watchdog Anti-Freeze] Exécution locale de sécurité du coup du bot pour', turnColor);
                playAutoMove(turnColor);
              }
            }, 1200);
          }
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [view, gameResult, currentTurn, matchNonce]);

  // ─── GESTION DES VICTOIRES / DÉFAITES ET STATISTIQUES ───
  const awardPlayerResult = (
    won: boolean,
    winnerCol: PieceColor | 'draw',
    reason: 'self_forfeit' | 'opponent_left' | 'capture' | 'draw_50_moves' | 'draw_1v1' | 'draw' | 'blocked',
    message: string
  ) => {
    // 🛑 RÈGLE STRICTE : Le statut de fin de match (Victoire / Défaite / Match nul) est immuable et figé.
    // Interdiction formelle de modifier ou d'écraser un résultat déjà décerné.
    if (gameResultRef.current?.isOver) {
      return;
    }

    // ⚔️ Réinitialisation stricte du flux de revanche à la fin de chaque partie :
    // Aucun bouton ne doit être bloqué sur "En attente de l'adversaire..." au lancement de l'écran de fin
    setRematchStatus('IDLE');
    setIncomingRematch(null);

    const isDraw = winnerCol === 'draw';
    const coins = isDraw ? 250 : won ? 500 : 150;
    const xp = isDraw ? 120 : won ? 250 : 80;

    // Persistance dans les statistiques de jeu avant la sauvegarde Cloud
    if (!isDraw) {
      try {
        recordGameResult(winnerCol as PieceColor, myColorRef.current, 'online');
      } catch (e) {
        console.error('Error recording stats:', e);
      }
    }

    // Mise à jour du profil utilisateur persistant
    try {
      const profile = getOrCreateUserProfile();
      const nextXp = profile.xp + xp;
      const xpThreshold = profile.level * 500;
      const nextLevel = nextXp >= xpThreshold ? profile.level + 1 : profile.level;
      const updatedProfile = {
        ...profile,
        coins: profile.coins + coins,
        xp: nextXp >= xpThreshold ? nextXp - xpThreshold : nextXp,
        level: nextLevel,
      };
      saveUserProfile(updatedProfile);
    } catch (e) {
      console.error('Error saving profile reward:', e);
    }

    const resObj: GameResultState = {
      isOver: true,
      winner: winnerCol,
      isWin: won,
      reason,
      message,
      coinsGained: coins,
      xpGained: xp,
    };
    gameResultRef.current = resObj;
    setGameResult(resObj);

    // Mise à jour de la dernière lecture (Dernier adversaire) avec le vrai friendCode de l'adversaire
    if (onUpdateLastOpponentRef.current) {
      try {
        const counts = countPieces(boardRef.current || board);
        const myCount = myColorRef.current === 'green' ? counts.green : counts.red;
        const oppCount = myColorRef.current === 'green' ? counts.red : counts.green;
        const realOppCode = !isBotMatchRef.current ? opponentFriendCodeRef.current : undefined;
        const realOppId = isBotMatchRef.current
          ? `bot_${roomCodeRef.current}`
          : (realOppCode || opponentIdRef.current || `player_${roomCodeRef.current}`);
        onUpdateLastOpponentRef.current({
          id: realOppId,
          name: opponentNameRef.current || tRef.current('opponentShortLabel', 'Adversaire'),
          avatar: opponentAvatarRef.current || '🦅',
          flag: opponentFlagRef.current || '🇸🇳',
          country: opponentCountryRef.current || 'International',
          mode: initialMode === 'friend' ? tRef.current('vsFriends', 'VS Amis') : tRef.current('online1v1', 'En Ligne 1v1'),
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          result: won ? 'win' : isDraw ? 'draw' : 'loss',
          userScore: Math.max(0, 12 - oppCount),
          opponentScore: Math.max(0, 12 - myCount),
          friendCode: realOppCode,
          isBot: isBotMatchRef.current,
        });
      } catch (err) {
        console.error('Error updating last opponent:', err);
      }
    }

    if (won) {
      sound.vibrate([120, 60, 180, 60, 300, 80, 600]);
      sound.startVictoryCelebrationLoop();
      setShowCelebration(true);
      if (onShowToastRef.current) {
        onShowToastRef.current(
          tRef.current('toastVictoryRewards', '🏆 Victoire ! +{coins} 🪙 et +{xp} XP remportés !')
            .replace('{coins}', String(coins))
            .replace('{xp}', String(xp))
        );
      }
    } else if (isDraw) {
      sound.stopVictoryCelebrationLoop(true);
      sound.playDraw();
      setShowCelebration(false);
      if (onShowToastRef.current) {
        onShowToastRef.current(
          tRef.current('toastDrawRewards', '⚖️ Match Nul ! +{coins} 🪙 et +{xp} XP remportés.')
            .replace('{coins}', String(coins))
            .replace('{xp}', String(xp))
        );
      }
    } else {
      sound.stopVictoryCelebrationLoop(true);
      sound.playDefeat();
      setShowCelebration(false);
      if (onShowToastRef.current) {
        onShowToastRef.current(
          tRef.current('toastLossRewards', 'Défaite enregistrée. +{coins} 🪙 et +{xp} XP.')
            .replace('{coins}', String(coins))
            .replace('{xp}', String(xp))
        );
      }
    }
  };

  // 🎆 CÉLÉBRATION DYNAMIQUE DE VICTOIRE STRICTEMENT IDENTIQUE AU MODE LOCAL / VS ORDINATEUR
  // (Fanfare royale, clameurs de joie en boucle, feux d'artifice spectaculaires et rafales de confettis)
  useEffect(() => {
    if (!gameResult?.isWin || !showCelebration) return;

    const fireVolley = () => {
      try {
        confetti({
          particleCount: 75,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#FFD700', '#F59E0B', '#EF4444', '#3B82F6'],
        });
      } catch {}
    };

    const fireSideCannons = () => {
      try {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 75,
          origin: { x: 0.05, y: 0.65 },
          colors: ['#FFD700', '#10B981', '#F59E0B', '#34D399', '#FFFFFF'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 75,
          origin: { x: 0.95, y: 0.65 },
          colors: ['#FFD700', '#10B981', '#F59E0B', '#34D399', '#FFFFFF'],
        });
      } catch {}
    };

    // Premier éclat immédiat au centre
    fireVolley();
    // Canons latéraux après 250ms pour une dynamique explosive
    const sideT = setTimeout(fireSideCannons, 250);

    // Rafales régulières toutes les 2,4 secondes tant que la modale de victoire est affichée
    const interval = window.setInterval(() => {
      fireVolley();
      setTimeout(fireSideCannons, 400);
    }, 2400);

    return () => {
      clearTimeout(sideT);
      window.clearInterval(interval);
    };
  }, [gameResult?.isWin, showCelebration]);

  // ─── ÉCOUTEURS WEBSOCKET ───
  useEffect(() => {
    const onRoomCreated = (data: any) => {
      const code = String(data.roomId || data.code || '').trim();
      if (code) {
        setRoomCode(code);
        roomCodeRef.current = code;
        setIsWaiting(true);
        setView('WAITING');
      }
    };

    const onAssignRole = (data: any) => {
      const assignedRole = data.role || data.payload?.role;
      const assignedColor = data.myColor || data.payload?.myColor;
      if (assignedColor === 'red' || assignedColor === 'green') {
        setMyColor(assignedColor);
        myColorRef.current = assignedColor;
      }
      if (assignedRole) {
        setRole(assignedRole);
        roleRef.current = assignedRole;
      }
      if (data.roomId || data.payload?.roomId) {
        const rId = String(data.roomId || data.payload?.roomId);
        setRoomCode(rId);
        roomCodeRef.current = rId;
      }
    };

    const onMatchFound = (data: any) => {
      const isBot = Boolean(
        data.isBotMatch === true ||
        data.payload?.isBotMatch === true ||
        (data.roomId && String(data.roomId).startsWith('online_bot_')) ||
        (data.payload?.roomId && String(data.payload.roomId).startsWith('online_bot_'))
      );
      setIsBotMatch(isBot);
      isBotMatchRef.current = isBot;

      const assignedRole = data.role || data.payload?.role;
      const assignedColor: PieceColor = data.myColor || data.payload?.myColor || (assignedRole === 'host' ? 'green' : 'red');
      if (assignedColor === 'green' || assignedColor === 'red') {
        setMyColor(assignedColor);
        myColorRef.current = assignedColor;
      }
      if (assignedRole) {
        setRole(assignedRole);
        roleRef.current = assignedRole;
      }
      if (data.roomId || data.payload?.roomId) {
        const rId = String(data.roomId || data.payload?.roomId);
        setRoomCode(rId);
        roomCodeRef.current = rId;
        socket.setSessionInfo({
          roomId: rId,
          role: assignedRole || roleRef.current,
          playerId: userProfile.id || `p_${Date.now()}`,
          color: (assignedColor === 'red' || assignedColor === 'green') ? assignedColor : myColorRef.current,
        });
      }
      const opp = data.opponentName || data.payload?.opponentName;
      if (opp) {
        setOpponentName(opp);
        opponentNameRef.current = opp;
      }
      const oppAv = data.opponentAvatar || data.payload?.opponentAvatar;
      if (oppAv) {
        setOpponentAvatar(oppAv);
        opponentAvatarRef.current = oppAv;
      }
      const oppPh = data.opponentPhoto || data.payload?.opponentPhoto;
      if (oppPh) {
        setOpponentPhoto(oppPh);
      }
      const oppFl = data.opponentFlag || data.payload?.opponentFlag;
      if (oppFl) {
        setOpponentFlag(oppFl);
        opponentFlagRef.current = oppFl;
      }
      const oppCo = data.opponentCountry || data.payload?.opponentCountry;
      if (oppCo) {
        setOpponentCountry(oppCo);
        opponentCountryRef.current = oppCo;
      }
      const oppFc = data.opponentFriendCode || data.payload?.opponentFriendCode;
      if (oppFc) {
        opponentFriendCodeRef.current = String(oppFc);
      }
      const oppIdVal = data.opponentId || data.payload?.opponentId;
      if (oppIdVal) {
        opponentIdRef.current = String(oppIdVal);
      }
      const oppRt = data.opponentRating || data.payload?.opponentRating;
      if (oppRt) {
        setOpponentRating(oppRt);
      }
      const oppLv = data.opponentLevel || data.payload?.opponentLevel;
      if (oppLv) {
        setOpponentLevel(oppLv);
      }
      const rawTurn = String(
        data.startingTurn || data.currentTurn || data.turn ||
        data.payload?.startingTurn || data.payload?.currentTurn || data.payload?.turn || ''
      ).toLowerCase();
      if (rawTurn === 'green' || rawTurn === 'red') {
        setCurrentTurn(rawTurn);
        currentTurnRef.current = rawTurn;
      }
      sound.playStartSound();
    };

    const onStartMatch = (data: any) => {
      const isBot = Boolean(
        data.isBotMatch === true ||
        data.payload?.isBotMatch === true ||
        (data.roomId && String(data.roomId).startsWith('online_bot_')) ||
        (data.payload?.roomId && String(data.payload.roomId).startsWith('online_bot_'))
      );
      setIsBotMatch(isBot);
      isBotMatchRef.current = isBot;

      const newBoard =
        data.board && Array.isArray(data.board) && data.board.length === 5
          ? data.board
          : (data.payload?.board && Array.isArray(data.payload.board) && data.payload.board.length === 5
            ? data.payload.board
            : createInitialBoard());

      const rawTurn = String(
        data.startingTurn || data.currentTurn || data.turn ||
        data.payload?.startingTurn || data.payload?.currentTurn || data.payload?.turn || ''
      ).toLowerCase();
      const nextTurn: PieceColor = rawTurn === 'red' || rawTurn === 'green'
        ? rawTurn
        : 'green';

      const assignedRole = data.role || data.payload?.role;
      const assignedColor = data.myColor || data.payload?.myColor;

      if (assignedColor === 'red' || assignedColor === 'green') {
        setMyColor(assignedColor);
        myColorRef.current = assignedColor;
      }
      if (assignedRole === 'host' || assignedRole === 'guest') {
        setRole(assignedRole);
        roleRef.current = assignedRole;
      }

      if (data.roomId || data.payload?.roomId) {
        const rId = String(data.roomId || data.payload?.roomId);
        setRoomCode(rId);
        roomCodeRef.current = rId;
        socket.setSessionInfo({
          roomId: rId,
          role: assignedRole || roleRef.current,
          playerId: userProfile.friendCode || userProfile.id || `p_${Date.now()}`,
          color: (assignedColor === 'red' || assignedColor === 'green') ? assignedColor : myColorRef.current,
        });
      }

      const opp = data.opponentName || data.payload?.opponentName;
      if (opp) {
        setOpponentName(opp);
        opponentNameRef.current = opp;
      }
      const oppAv = data.opponentAvatar || data.payload?.opponentAvatar;
      if (oppAv) {
        setOpponentAvatar(oppAv);
        opponentAvatarRef.current = oppAv;
      }
      const oppPh = data.opponentPhoto || data.payload?.opponentPhoto;
      if (oppPh) {
        setOpponentPhoto(oppPh);
      }
      const oppFl = data.opponentFlag || data.payload?.opponentFlag;
      if (oppFl) {
        setOpponentFlag(oppFl);
        opponentFlagRef.current = oppFl;
      }
      const oppCo = data.opponentCountry || data.payload?.opponentCountry;
      if (oppCo) {
        setOpponentCountry(oppCo);
        opponentCountryRef.current = oppCo;
      }
      const oppFc = data.opponentFriendCode || data.payload?.opponentFriendCode;
      if (oppFc) {
        opponentFriendCodeRef.current = String(oppFc);
      }
      const oppIdVal = data.opponentId || data.payload?.opponentId;
      if (oppIdVal) {
        opponentIdRef.current = String(oppIdVal);
      }
      const oppRt = data.opponentRating || data.payload?.opponentRating;
      if (oppRt) {
        setOpponentRating(oppRt);
      }
      const oppLv = data.opponentLevel || data.payload?.opponentLevel;
      if (oppLv) {
        setOpponentLevel(oppLv);
      }

      // Réinitialisation complète et atomique de la nouvelle session (Flush & Déverrouillage tactile)
      setIsAcceptingRematch(false);
      setIncomingRematch(null);
      setGameResult(null);
      gameResultRef.current = null;
      setBoard(newBoard);
      boardRef.current = newBoard;
      setCurrentTurn(nextTurn);
      currentTurnRef.current = nextTurn;
      setLastMove(null);
      setSelectedCoord(null);
      setValidMoves([]);
      setChainPiecePos(null);
      setChainLastDir(null);
      setPunishedCoords(null);
      setIsConfirmLeaveOpen(false);
      setIsHistoryOpen(false);
      setActiveChatBubble(null);
      setReconnectBufferSec(null);
      setMovesWithoutCaptureCount(0);
      setMoveHistory([]);
      setRematchStatus('IDLE');
      setRematchRefusedByOpponent(false);
      setIRefusedRematch(false);
      setOpponentHasLeft(false);
      consecutiveTimeoutsRef.current = { green: 0, red: 0 };
      setIsWaiting(false);
      turnIdRef.current = 0;
      autoMoveLockTurnIdRef.current = -1;
      isAutoMoveRunningRef.current = false;
      setTimerSec(30);
      timerSecRef.current = 30;
      setShowCelebration(false);
      setMatchNonce(n => n + 1);
      setView('GAME');
      viewRef.current = 'GAME';

      // 🛑 ARRÊT IMMÉDIAT ET NET DE TOUTE CÉLÉBRATION DE VICTOIRE / FEUX D'ARTIFICE
      sound.killAllCelebrationAudio();
      sound.stopMusic();
      sound.startMusic('game', true);
      sound.playStartSound();
      if (onShowToastRef.current) {
        const colName = nextTurn === 'green'
          ? tRef.current('greenPawnsUpper', 'VERTS')
          : tRef.current('redPawnsUpper', 'ROUGES');
        onShowToastRef.current(
          tRef.current('toastRandomTurnStart', '🚀 Début de partie ! Tirage au sort : les {color} commencent !')
            .replace('{color}', colName)
        );
      }
    };

    const onTurnAssigned = (data: any) => {
      if (!data) return;
      if (data.roomId && roomCodeRef.current && String(data.roomId) !== String(roomCodeRef.current)) return;
      const rawTurn = String(data.currentTurn || data.startingTurn || '').toLowerCase();
      if (rawTurn === 'green' || rawTurn === 'red') {
        setCurrentTurn(rawTurn);
        currentTurnRef.current = rawTurn;
      }
      const nextSec = typeof data.timerSec === 'number' ? data.timerSec : 30;
      setTimerSec(nextSec);
      timerSecRef.current = nextSec;
      setSelectedCoord(null);
      setValidMoves([]);
      setChainPiecePos(null);
      setChainLastDir(null);
    };

    // 🛡️ SERVEUR AUTORITAIRE UNIQUE : Synchronisation officielle absolue de l'état du jeu
    const onGameStateUpdate = (data: any) => {
      if (!data) return;

      const incomingBoard = data.board || data.payload?.board;
      if (incomingBoard && Array.isArray(incomingBoard) && incomingBoard.length === 5) {
        setBoard(incomingBoard);
        boardRef.current = incomingBoard;
      }

      const rawTurn = String(data.currentTurn || data.turn || data.nextTurn || '').toLowerCase();
      if (rawTurn === 'green' || rawTurn === 'red') {
        setCurrentTurn(rawTurn);
        currentTurnRef.current = rawTurn;
      }

      if (typeof data.turnId === 'number') {
        turnIdRef.current = data.turnId;
      }

      setTimerSec(data.timerSec !== undefined ? data.timerSec : 30);
      timerSecRef.current = data.timerSec !== undefined ? data.timerSec : 30;

      // ⚖️ Synchronisation de la règle des 50 coups sans prise
      if (typeof data.movesWithoutCapture === 'number') {
        setMovesWithoutCaptureCount(data.movesWithoutCapture);
        if (data.movesWithoutCapture >= 50 && !gameResultRef.current?.isOver) {
          const curB = data.board || boardRef.current || board;
          const counts = countPieces(curB);
          let winCol: PieceColor | 'draw' = (data.winner && (data.winner === 'green' || data.winner === 'red' || data.winner === 'draw'))
            ? data.winner
            : (counts.green > counts.red ? 'green' : counts.red > counts.green ? 'red' : 'draw');
          const isWin = winCol === myColorRef.current;
          const msg = data.message || (winCol === 'draw'
            ? tRef.current('toastFiftyMoveDrawCounts', '🤝 50 coups sans prise : Match Nul ({green} vs {red} pions) !')
                .replace('{green}', String(counts.green))
                .replace('{red}', String(counts.red))
            : isWin
            ? tRef.current('toastFiftyMoveMajorityWin', '⚖️ 50 coups sans prise : Victoire par majorité de pions ({win} vs {lose}) !')
                .replace('{win}', String(Math.max(counts.green, counts.red)))
                .replace('{lose}', String(Math.min(counts.green, counts.red)))
            : tRef.current('toastFiftyMoveMajorityLoss', '⚖️ 50 coups sans prise : Défaite ({lose} vs {win} pions).')
                .replace('{lose}', String(Math.min(counts.green, counts.red)))
                .replace('{win}', String(Math.max(counts.green, counts.red))));
          awardPlayerResult(isWin, winCol, 'draw_50_moves', msg);
          return;
        }
      }

      const isPenalty = Boolean(data.wasPenalty || data.payload?.wasPenalty);
      if (isPenalty) {
        sound.playPenalty();
        if (onShowToast) {
          onShowToast(tRef.current('toastPenaltySelf', '⚠️ Punition : Coup sans prise alors qu’une capture était disponible !'));
        }
        const coords = data.punishedCoords || data.payload?.punishedCoords;
        if (coords && Array.isArray(coords)) {
          setPunishedCoords(coords);
          setTimeout(() => {
            setPunishedCoords(null);
          }, 850);
        }
      } else {
        const lMove = data.lastMove || data.payload?.lastMove || null;
        if (lMove) {
          setLastMove(lMove);
          const movingCol: PieceColor = data.movingColor || (currentTurnRef.current === 'green' ? 'red' : 'green');
          const isFromOpponent = movingCol !== myColorRef.current || Boolean(data.isAutoMove) || Boolean(data.wasTimeout);
          if (isFromOpponent) {
            addMoveToHistory(lMove, movingCol);
            if (lMove.isCap) {
              sound.playCapture();
            } else {
              sound.playMove();
            }
          }
        }
      }

      // 💥 Aligner le Multijoueur sur le Mode Local : maintien strict du tour et des prises successives
      if (data.isChainStep) {
        if (data.movingColor === myColorRef.current) {
          // Mon enchaînement de multi-capture est actif : ne pas désélectionner pour permettre la prise suivante
        } else {
          // L'adversaire enchaîne des prises : mise à jour visuelle pour le défenseur
          setSelectedCoord(null);
          setValidMoves([]);
          setChainPiecePos(null);
          setChainLastDir(null);
          if (onShowToast) {
            onShowToast(tRef.current('toastOpponentMultiCapture', '💥 L’adversaire réalise une multi-capture...'));
          }
        }
      } else {
        setSelectedCoord(null);
        setValidMoves([]);
        setChainPiecePos(null);
        setChainLastDir(null);
      }

      // ⚖️ Arrêt officiel immédiat dès que les 50 coups sans prise sont décrétés
      if ((data.gameOverReason === 'draw_50_moves' || (typeof data.movesWithoutCapture === 'number' && data.movesWithoutCapture >= 50)) && !gameResultRef.current?.isOver) {
        const curB = data.board || boardRef.current || board;
        const counts = countPieces(curB);
        let winCol: PieceColor | 'draw' = (data.winner && (data.winner === 'green' || data.winner === 'red' || data.winner === 'draw'))
          ? data.winner
          : (counts.green > counts.red ? 'green' : counts.red > counts.green ? 'red' : 'draw');
        const isWin = winCol === myColorRef.current;
        const msg = data.message || (winCol === 'draw'
          ? tRef.current('toastFiftyMoveDrawCounts', '🤝 50 coups sans prise : Match Nul ({green} vs {red} pions) !')
              .replace('{green}', String(counts.green))
              .replace('{red}', String(counts.red))
          : isWin
          ? tRef.current('toastFiftyMoveMajorityWin', '⚖️ 50 coups sans prise : Victoire par majorité de pions ({win} vs {lose}) !')
              .replace('{win}', String(Math.max(counts.green, counts.red)))
              .replace('{lose}', String(Math.min(counts.green, counts.red)))
          : tRef.current('toastFiftyMoveMajorityLoss', '⚖️ 50 coups sans prise : Défaite ({lose} vs {win} pions).')
              .replace('{lose}', String(Math.min(counts.green, counts.red)))
              .replace('{win}', String(Math.max(counts.green, counts.red))));
        awardPlayerResult(isWin, winCol, 'draw_50_moves', msg);
        return;
      }

      // Si le serveur autoritaire décrète la fin du match
      if (data.gameOver && data.winner) {
        const is1v1Draw = data.gameOverReason === 'draw_1v1';
        const is50Draw = data.gameOverReason === 'draw_50_moves';
        if (data.winner === 'draw') {
          awardPlayerResult(
            false,
            'draw',
            is1v1Draw ? 'draw_1v1' : 'draw_50_moves',
            data.message || (is1v1Draw
              ? tRef.current('toastDrawOnePawnEach', '⚖️ Match nul ! 1 pion restant de chaque côté sans possibilité de capture.')
              : tRef.current('toastFiftyMoveEqualDraw', '⚖️ 50 coups sans prise : Match Nul (égalité de pions) !'))
          );
        } else {
          const isWinner = myColorRef.current === data.winner;
          const defaultMsg = is50Draw
            ? (isWinner
                ? tRef.current('toastFiftyMoveSimpleWin', '⚖️ 50 coups sans prise : Victoire par majorité de pions !')
                : tRef.current('toastFiftyMoveSimpleLoss', '⚖️ 50 coups sans prise : Défaite.'))
            : (isWinner
                ? tRef.current('toastCapturedAllOpponent', 'Félicitations ! Vous avez capturé tous les pions de votre adversaire !')
                : tRef.current('toastAllPawnsCaptured', 'Tous vos pions ont été capturés.'));
          awardPlayerResult(
            isWinner,
            data.winner,
            is50Draw ? 'draw_50_moves' : (data.gameOverReason || 'capture'),
            data.message || defaultMsg
          );
        }
      }
    };

    const onMovePiece = (data: any) => {
      // Délégué immédiatement au gestionnaire d'état autoritaire
      onGameStateUpdate(data);
    };

    // ⚔️ GESTION DU REMATCH (REVANCHE PROPRE)
    const onRematchRequested = (data: any) => {
      const currentReason = String(gameResultRef.current?.reason || '').toLowerCase();
      // Si la partie s'est terminée par abandon, déconnexion ou forfait, ignorer
      if (
        currentReason.includes('forfeit') ||
        currentReason.includes('left') ||
        currentReason.includes('abandon') ||
        currentReason.includes('timeout') ||
        currentReason.includes('surrender')
      ) {
        return;
      }
      sound.playSelect();
      setIncomingRematch({
        requesterName: data.requesterName || "L'adversaire",
      });
    };

    const onRematchPending = () => {
      setRematchStatus('PENDING');
    };

    const onRematchDeclined = (data: any) => {
      setIsAcceptingRematch(false);
      // 1. L'état d'attente est immédiatement annulé pour le demandeur
      setRematchStatus('IDLE');
      // 2. C'est lui, et lui seul (le demandeur initial), qui reçoit ce signal et voit "L'adversaire a refusé la revanche"
      setRematchRefusedByOpponent(true);
      if (onShowToastRef.current) {
        onShowToastRef.current(data?.message || tRef.current('rematchDeclinedToast', "L'adversaire a refusé la revanche."));
      }
    };

    // 🛡️ BUFFER DE 15 SECONDES : Tolérance aux micro-coupures réseau (4G/Wi-Fi)
    const onOpponentDisconnectedBuffer = (data: any) => {
      setReconnectBufferSec(data.bufferSec || 15);
      if (onShowToastRef.current) {
        onShowToastRef.current("⚠️ Micro-coupure adverse (4G/Wi-Fi). Maintien de session (15s)...");
      }
    };

    const onDisconnectBufferTick = (data: any) => {
      if (typeof data.remainingSec === 'number') {
        setReconnectBufferSec(data.remainingSec);
      }
    };

    const onOpponentReconnected = (data: any) => {
      setReconnectBufferSec(null);
      sound.playStartSound();
      if (onShowToastRef.current) {
        onShowToastRef.current(data?.message || tRef.current('toastReconnectedOpponent', "✅ L'adversaire s'est reconnecté ! Reprise de la partie."));
      }
    };

    const onReconnectSuccess = (data: any) => {
      setReconnectBufferSec(null);
      sound.playStartSound();
      if (data.board && Array.isArray(data.board)) {
        setBoard(data.board);
        boardRef.current = data.board;
      }
      if (data.currentTurn === 'green' || data.currentTurn === 'red') {
        setCurrentTurn(data.currentTurn);
        currentTurnRef.current = data.currentTurn;
      }
      if (typeof data.timerSec === 'number') {
        setTimerSec(data.timerSec);
      }
      setView('GAME');
      if (onShowToastRef.current) {
        onShowToastRef.current(tRef.current('toastSessionRestored', '✅ Session rétablie avec succès ! Vous retrouvez votre partie en cours.'));
      }
    };

    // Si l'adversaire quitte ou se déconnecte définitivement :
    const onOpponentLeft = (data: any) => {
      setReconnectBufferSec(null);
      setIsAcceptingRematch(false);
      setIncomingRematch(null); // Masquer instantanément la modale de revanche si affichée
      setRematchStatus('IDLE'); // Annuler l'état d'attente immédiatement

      // Si la partie était déjà terminée (écran de fin de match / lobby de fin) ou notification post-match :
      if (gameResultRef.current?.isOver || data?.isGameOver || data?.reason === 'post_game_leave') {
        setOpponentHasLeft(true);
        if (onShowToastRef.current) {
          onShowToastRef.current(data?.message || tRef.current('opponentLeftNotice', "L'adversaire a quitté la partie."));
        }
        return;
      }

      // Si la partie était EN COURS : Victoire par forfait (forfait immédiat de l'adversaire)
      const winnerCol = myColorRef.current;
      awardPlayerResult(
        true,
        winnerCol,
        'opponent_left',
        data?.message || tRef.current('toastVictoryByForfeit', '🏆 Victoire par forfait ! Votre adversaire a quitté la partie.')
      );
    };

    // Réception du tick timer serveur
    const onTimerTick = (data: any) => {
      if (typeof data.timerSec === 'number') {
        setTimerSec(data.timerSec);
        if (data.timerSec <= 5 && data.currentTurn === myColorRef.current) {
          sound.playTimerTick();
        }
      }
    };

    // Fin de temps de tour : passage au tour suivant décrété par le serveur
    const onTurnTimeout = (data: any) => {
      const rawTurn = String(data.nextTurn || data.currentTurn || '').toLowerCase();
      if (rawTurn === 'green' || rawTurn === 'red') {
        setCurrentTurn(rawTurn);
        currentTurnRef.current = rawTurn;
        setTimerSec(30);
        setSelectedCoord(null);
        setValidMoves([]);
        if (onShowToastRef.current) {
          const colLabel = rawTurn === 'green' ? tRef.current('greenPlayers', 'Verts') : tRef.current('redPlayers', 'Rouges');
          onShowToastRef.current(
            tRef.current('toastTurnTimeoutNext', '⏱️ Temps écoulé ! C’est au tour des {color}.').replace('{color}', colLabel)
          );
        }
      }
    };

    // Avertissement de tolérance mesurée (première expiration)
    const onTimeoutFirstWarning = (data: any) => {
      sound.playPenalty();
      const timedOutCol: PieceColor = String(data.timedOutColor || data.currentTurn || currentTurnRef.current || '').toLowerCase() === 'red' ? 'red' : 'green';
      consecutiveTimeoutsRef.current[timedOutCol] = 1;

      if (timedOutCol === myColorRef.current) {
        if (autoMoveLockTurnIdRef.current !== turnIdRef.current && currentTurnRef.current === myColorRef.current) {
          if (isBotMatchRef.current) {
            if (onShowToastRef.current) {
              onShowToastRef.current(tRef.current('toastTimerWarningSelf', '⚠️ 1er avertissement : Temps écoulé ! Coup automatique joué. Attention, à la prochaine inactivité consécutive, défaite par forfait !'));
            }
            playAutoMove(myColorRef.current);
          } else {
            if (onShowToastRef.current) {
              onShowToastRef.current(tRef.current('toastTimerWarningSelfNoAuto', '⚠️ 1er avertissement : Temps écoulé ! Attention, à la prochaine inactivité consécutive, défaite par forfait !'));
            }
          }
        }
      } else {
        if (onShowToastRef.current) {
          onShowToastRef.current(isBotMatchRef.current
            ? tRef.current('toastTimerAutoOppGeneric', '⚠️ Temps écoulé pour l’adversaire ! Coup automatique joué.')
            : tRef.current('toastTimerAutoOppWarn', '⚠️ Temps écoulé pour l’adversaire (1er avertissement).'));
        }
      }
    };

    // Le tour a été passé suite à expiration du minuteur (entre humains) sans déplacer de pions
    const onTurnPassed = (data: any) => {
      sound.playPenalty();
      const nextTurnCol: PieceColor = String(data.currentTurn || data.nextTurn || (currentTurnRef.current === 'green' ? 'red' : 'green')).toLowerCase() === 'red' ? 'red' : 'green';
      const timedOutCol: PieceColor = String(data.timedOutColor || (nextTurnCol === 'green' ? 'red' : 'green')).toLowerCase() === 'red' ? 'red' : 'green';

      consecutiveTimeoutsRef.current[timedOutCol] = 1;
      currentTurnRef.current = nextTurnCol;
      setCurrentTurn(nextTurnCol);
      setTimerSec(30);
      setSelectedCoord(null);
      setValidMoves([]);
      setChainPiecePos(null);
      setChainLastDir(null);

      if (onShowToastRef.current) {
        onShowToastRef.current(
          data.message || (timedOutCol === myColorRef.current
            ? tRef.current('toastTimerPassSelf', '⚠️ Temps écoulé ! Votre tour passe à l’adversaire sans déplacement de pion. Attention : à la prochaine inactivité, défaite par forfait !')
            : tRef.current('toastTimerPassOpp', '⚠️ Temps écoulé pour l’adversaire ! Le tour vous revient.'))
        );
      }
    };

    // Défaite par forfait suite à 2 expirations consécutives
    const onForfeitTimeout = (data: any) => {
      if (gameResultRef.current?.isOver) return;

      const isMyTurn = currentTurnRef.current === myColorRef.current;
      const isWinner = !isMyTurn;

      if (isWinner) {
        awardPlayerResult(
          true,
          myColorRef.current,
          'opponent_left',
          data?.winnerMessage || data?.message || tRef.current('toastVictoryByInactivity', 'Victoire par forfait ! L’adversaire a laissé expirer son minuteur deux fois consécutives.')
        );
      } else {
        const oppCol: PieceColor = myColorRef.current === 'green' ? 'red' : 'green';
        awardPlayerResult(
          false,
          oppCol,
          'self_forfeit',
          data?.loserMessage || data?.message || tRef.current('toastDoubleInactivityForfeit', 'Défaite par forfait : Deuxième inactivité consécutive de 30 secondes.')
        );
      }
    };

    // 🛑 FIN DE PARTIE SYNCHRONE : Un joueur n'a plus aucun coup légal (bloqué)
    const onPlayerStuck = (data: any) => {
      if (gameResultRef.current?.isOver) return;
      const winner = (data?.winner || (data?.stuckColor === 'green' ? 'red' : 'green')) as PieceColor;
      const isWinner = myColorRef.current === winner;
      awardPlayerResult(
        isWinner,
        winner,
        'blocked',
        data?.message || (isWinner
          ? (tRef.current('opponentBlockedWin', 'Victoire ! L’adversaire n’a plus aucun coup valide.'))
          : (tRef.current('playerBlockedLoss', 'Défaite : Vous n’avez plus aucun coup légal disponible.')))
      );
    };

    // Réception des réactions émojis
    const onChatEmote = (data: any) => {
      const emoji = data.emote || data.emoji;
      if (emoji && data.color !== myColorRef.current) {
        sound.playSelect();
        setActiveReaction({ emoji, from: 'opponent' });
        setTimeout(() => setActiveReaction(null), 2500);
      }
    };

    // Réception des messages rapides prédéfinis (traduits dans la langue locale du destinataire)
    const onChatMessage = (data: any) => {
      if (!data) return;
      if (data.senderColor && data.senderColor === myColorRef.current) return;
      const resolvedText = data.phraseKey
        ? tRef.current(data.phraseKey, data.text || '')
        : (data.text || '');
      if (!resolvedText) return;
      sound.playSelect();
      const oppLabel = opponentNameRef.current || (mode === 'online' ? tRef.current('opponentLabel', 'Adversaire') : tRef.current('friendLabel', 'Ami'));
      setActiveChatBubble({
        text: resolvedText,
        senderName: data.senderName || oppLabel,
        from: 'opponent',
      });
      if (chatBubbleTimerRef.current) clearTimeout(chatBubbleTimerRef.current);
      chatBubbleTimerRef.current = window.setTimeout(() => setActiveChatBubble(null), 3200);
    };

    const onJoinError = (data: any) => {
      setErrorMessage(
        data.message || tRef.current('toastWrongCode', 'Code incorrect. Veuillez recontrôler le code.')
      );
    };

    const onSelfLeft = (data: any) => {
      if (gameResultRef.current?.isOver) return;
      const opponentCol: PieceColor = myColorRef.current === 'green' ? 'red' : 'green';
      awardPlayerResult(
        false,
        opponentCol,
        'self_forfeit',
        data?.message || tRef.current('toastOnlineLeaveForfeit', 'Défaite par forfait : Vous avez quitté la partie en ligne.')
      );
    };

    const onGameOver = (data: any) => {
      if (gameResultRef.current?.isOver) return;
      if (
        data?.gameOverReason === 'draw_50_moves' ||
        (typeof data?.movesWithoutCapture === 'number' && data.movesWithoutCapture >= 50)
      ) {
        const curB = data?.board || boardRef.current || board;
        const counts = countPieces(curB);
        let winCol: PieceColor | 'draw' = (data?.winner && (data.winner === 'green' || data.winner === 'red' || data.winner === 'draw'))
          ? data.winner
          : (counts.green > counts.red ? 'green' : counts.red > counts.green ? 'red' : 'draw');
        const isWinner = winCol === myColorRef.current;
        const msg = data?.message || (winCol === 'draw'
          ? tRef.current('toastFiftyMoveDrawCounts', '🤝 50 coups sans prise : Match Nul ({green} vs {red} pions) !')
              .replace('{green}', String(counts.green))
              .replace('{red}', String(counts.red))
          : isWinner
          ? tRef.current('toastFiftyMoveMajorityWin', '⚖️ 50 coups sans prise : Victoire par majorité de pions ({win} vs {lose}) !')
              .replace('{win}', String(Math.max(counts.green, counts.red)))
              .replace('{lose}', String(Math.min(counts.green, counts.red)))
          : tRef.current('toastFiftyMoveMajorityLoss', '⚖️ 50 coups sans prise : Défaite ({lose} vs {win} pions).')
              .replace('{lose}', String(Math.min(counts.green, counts.red)))
              .replace('{win}', String(Math.max(counts.green, counts.red))));
        awardPlayerResult(
          isWinner,
          winCol,
          'draw_50_moves',
          msg
        );
      } else if (data?.winner === 'draw') {
        const is1v1Draw = data?.gameOverReason === 'draw_1v1';
        awardPlayerResult(
          false,
          'draw',
          is1v1Draw ? 'draw_1v1' : 'draw_50_moves',
          data?.message || (is1v1Draw
            ? tRef.current('toastDrawOnePawnEach', '⚖️ Match nul ! 1 pion restant de chaque côté sans possibilité de capture.')
            : tRef.current('drawMatchTitle', '⚖️ Match Nul !'))
        );
      } else if (data?.winner) {
        const isWinner = myColorRef.current === data.winner;
        awardPlayerResult(
          isWinner,
          data.winner,
          data.gameOverReason || 'capture',
          data.message || (isWinner ? tRef.current.youWon : tRef.current.youLost)
        );
      }
    };

    const onTimerReset = () => {
      setTimerSec(30);
      timerSecRef.current = 30;
    };

    socket.on('GAME_OVER', onGameOver);
    socket.on('game_over', onGameOver);
    socket.on('ROOM_CREATED', onRoomCreated);
    socket.on('ASSIGN_ROLE', onAssignRole);
    socket.on('MATCH_FOUND', onMatchFound);
    socket.on('START_MATCH', onStartMatch);
    socket.on('start_game', onStartMatch);
    socket.on('TURN_ASSIGNED', onTurnAssigned);
    socket.on('GAME_STATE_UPDATE', onGameStateUpdate);
    socket.on('MOVE_PIECE', onMovePiece);
    socket.on('REMATCH_REQUESTED', onRematchRequested);
    socket.on('REMATCH_PENDING', onRematchPending);
    socket.on('REMATCH_DECLINED', onRematchDeclined);
    socket.on('OPPONENT_DISCONNECTED_BUFFER', onOpponentDisconnectedBuffer);
    socket.on('DISCONNECT_BUFFER_TICK', onDisconnectBufferTick);
    socket.on('OPPONENT_RECONNECTED', onOpponentReconnected);
    socket.on('RECONNECT_SUCCESS', onReconnectSuccess);
    socket.on('OPPONENT_LEFT', onOpponentLeft);
    socket.on('PLAYER_LEFT', onOpponentLeft);
    socket.on('SELF_LEFT', onSelfLeft);
    socket.on('TIMER_TICK', onTimerTick);
    socket.on('TIMER_RESET', onTimerReset);
    socket.on('TURN_TIMEOUT', onTurnTimeout);
    socket.on('TURN_PASSED', onTurnPassed);
    socket.on('TIMEOUT_FIRST_WARNING', onTimeoutFirstWarning);
    socket.on('FORFEIT_TIMEOUT', onForfeitTimeout);
    socket.on('PLAYER_STUCK', onPlayerStuck);
    socket.on('NO_VALID_MOVES', onPlayerStuck);
    socket.on('chat_emote', onChatEmote);
    socket.on('SEND_REACTION', onChatEmote);
    socket.on('chat_message', onChatMessage);
    socket.on('CHAT_MESSAGE', onChatMessage);
    socket.on('JOIN_ERROR', onJoinError);

    return () => {
      socket.off('GAME_OVER', onGameOver);
      socket.off('game_over', onGameOver);
      socket.off('ROOM_CREATED', onRoomCreated);
      socket.off('ASSIGN_ROLE', onAssignRole);
      socket.off('MATCH_FOUND', onMatchFound);
      socket.off('START_MATCH', onStartMatch);
      socket.off('start_game', onStartMatch);
      socket.off('TURN_ASSIGNED', onTurnAssigned);
      socket.off('GAME_STATE_UPDATE', onGameStateUpdate);
      socket.off('MOVE_PIECE', onMovePiece);
      socket.off('REMATCH_REQUESTED', onRematchRequested);
      socket.off('REMATCH_PENDING', onRematchPending);
      socket.off('REMATCH_DECLINED', onRematchDeclined);
      socket.off('OPPONENT_DISCONNECTED_BUFFER', onOpponentDisconnectedBuffer);
      socket.off('DISCONNECT_BUFFER_TICK', onDisconnectBufferTick);
      socket.off('OPPONENT_RECONNECTED', onOpponentReconnected);
      socket.off('RECONNECT_SUCCESS', onReconnectSuccess);
      socket.off('OPPONENT_LEFT', onOpponentLeft);
      socket.off('PLAYER_LEFT', onOpponentLeft);
      socket.off('SELF_LEFT', onSelfLeft);
      socket.off('TIMER_TICK', onTimerTick);
      socket.off('TIMER_RESET', onTimerReset);
      socket.off('TURN_TIMEOUT', onTurnTimeout);
      socket.off('TURN_PASSED', onTurnPassed);
      socket.off('TIMEOUT_FIRST_WARNING', onTimeoutFirstWarning);
      socket.off('FORFEIT_TIMEOUT', onForfeitTimeout);
      socket.off('PLAYER_STUCK', onPlayerStuck);
      socket.off('NO_VALID_MOVES', onPlayerStuck);
      socket.off('chat_emote', onChatEmote);
      socket.off('SEND_REACTION', onChatEmote);
      socket.off('chat_message', onChatMessage);
      socket.off('CHAT_MESSAGE', onChatMessage);
      socket.off('JOIN_ERROR', onJoinError);
    };
  }, []);

  // Actions utilisateur
  const handleCreateRoom = () => {
    setErrorMessage(null);
    setRole('host');
    const initialCol: PieceColor = hostColorPref === 'red' ? 'red' : 'green';
    setMyColor(initialCol);
    myColorRef.current = initialCol;
    socket.emit('create_room', {
      role: 'host',
      preferredColor: hostColorPref,
      playerId: userProfile.friendCode || userProfile.id,
      friendCode: userProfile.friendCode,
      playerName: userProfile.name || t('host', 'Hôte'),
      avatar: userProfile.avatar || '👑',
      customPhoto: userProfile.customPhoto,
      flag: userProfile.flag,
    });
  };

  const handleJoinRoom = () => {
    const clean = inputCode.trim().replace(/[^0-9]/g, '');
    if (clean.length < 4) {
      setErrorMessage(t('toastInvalidRoomCode', 'Veuillez entrer un code à 6 chiffres valide (ex: 123456).'));
      return;
    }
    setErrorMessage(null);
    setRole('guest');
    setMyColor('red');
    setRoomCode(clean);
    socket.emit('join_room', {
      roomId: clean,
      role: 'guest',
      playerId: userProfile.friendCode || userProfile.id,
      friendCode: userProfile.friendCode,
      playerName: userProfile.name || t('guest', 'Invité'),
      avatar: userProfile.avatar || '👑',
      customPhoto: userProfile.customPhoto,
      flag: userProfile.flag,
    });
  };

  // 🎯 ABANDON EN COURS DE MATCH : LE JOUEUR QUI QUITTE PERD PAR FORFAIT
  const handleConfirmAbandon = () => {
    setIsConfirmLeaveOpen(false);
    const opponentCol: PieceColor = myColor === 'green' ? 'red' : 'green';

    if (roomCode || roomCodeRef.current) {
      socket.emit('leave_room', {
        roomId: roomCode || roomCodeRef.current,
        reason: 'surrender',
        forfeit: true,
        loser: myColor,
        winner: opponentCol,
      });
    }

    awardPlayerResult(
      false,
      opponentCol,
      'self_forfeit',
      t('toastOnlineLeaveForfeit', 'Défaite par forfait : Vous avez quitté la partie en ligne.')
    );
  };

  const handleReturnToLobby = () => {
    sound.killAllCelebrationAudio();
    sound.stopMusic();
    sound.startMusic('menu');
    consecutiveTimeoutsRef.current = { green: 0, red: 0 };
    setGameResult(null);
    setShowCelebration(false);
    setIncomingRematch(null);
    setRematchStatus('IDLE');
    setRematchRefusedByOpponent(false);
    setIRefusedRematch(false);
    setOpponentHasLeft(false);
    setReconnectBufferSec(null);
    setChainPiecePos(null);
    setChainLastDir(null);
    setSelectedCoord(null);
    setValidMoves([]);
    socket.clearSessionInfo();
    const curRoom = roomCode || roomCodeRef.current;
    if (curRoom) {
      socket.emit('leave_room', { roomId: curRoom });
    }
    setView('LOBBY');
    setIsWaiting(false);
    onBack();
  };

  // Envoi d'une réaction émoji
  const handleSendReaction = (emoji: string) => {
    sound.playSelect();
    setActiveReaction({ emoji, from: 'me' });
    setTimeout(() => setActiveReaction(null), 2500);

    const currentRoomCode = roomCode || roomCodeRef.current;
    socket.emit('chat_emote', {
      roomId: currentRoomCode,
      emote: emoji,
      emoji,
      color: myColor,
    });
  };

  // Envoi d'une phrase rapide prédéfinie (chat in-game multijoueur uniquement)
  const handleSendQuickPhrase = (phraseKey: string, localizedText: string) => {
    sound.playSelect();
    const myLabel = userProfile.name || t('you', 'Vous');
    setActiveChatBubble({
      text: localizedText,
      senderName: myLabel,
      from: 'me',
    });
    if (chatBubbleTimerRef.current) clearTimeout(chatBubbleTimerRef.current);
    chatBubbleTimerRef.current = window.setTimeout(() => setActiveChatBubble(null), 3000);

    const currentRoomCode = roomCode || roomCodeRef.current;
    socket.emit('chat_message', {
      roomId: currentRoomCode,
      phraseKey,
      text: localizedText,
      senderColor: myColor,
      senderName: myLabel,
    });
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameResult?.isOver) return;

    if (currentTurn !== myColor) {
      if (onShowToast) {
        onShowToast(`⏳ ${currentTurn === 'green' ? t.tG : t.tR}`);
      }
      return;
    }

    const piece = board[r]?.[c];

    // Si une pièce est déjà sélectionnée et qu'on clique sur une case de destination valide
    if (selectedCoord) {
      const move = validMoves.find((m) => m.r === r && m.c === c);
      if (move) {
        consecutiveTimeoutsRef.current[currentTurn] = 0;
        const newBoard = cloneBoard(board);
        const movingPiece = newBoard[selectedCoord.r][selectedCoord.c];
        newBoard[r][c] = movingPiece;
        newBoard[selectedCoord.r][selectedCoord.c] = null;

        // Capture si nécessaire
        let isCapture = false;
        if (move.cr !== undefined && move.cc !== undefined) {
          newBoard[move.cr][move.cc] = null;
          isCapture = true;
        }

        // Vérification de la punition automatique : si le joueur avait la possibilité de capturer mais a joué sans prise
        if (!isCapture) {
          const capturingPieces = getAllCapturingPieces(board, currentTurn);
          if (capturingPieces.length > 0) {
            // Un seul pion est puni : celui le plus proche du camp adverse
            const singlePunishedPiece = selectPunishedPiece(
              capturingPieces,
              currentTurn,
              { r: selectedCoord.r, c: selectedCoord.c },
              { r, c }
            );
            const piecesToPunish: Coord[] = [singlePunishedPiece];

            // Afficher le plateau avec le pion qui bonde
            setBoard(newBoard);
            setPunishedCoords(piecesToPunish);
            sound.playPenalty();
            if (onShowToast) {
              onShowToast(`⚠️ ${t.pun || 'Punition appliquée : Le pion qui devait capturer a été puni !'}`);
            }
            setSelectedCoord(null);
            setValidMoves([]);

            const nextTurn: PieceColor = currentTurn === 'green' ? 'red' : 'green';
            const moveDetails: LastMove = {
              fr: selectedCoord.r,
              fc: selectedCoord.c,
              tr: r,
              tc: c,
              isCap: false,
            };

            setTimeout(() => {
              const finalBoard = cloneBoard(newBoard);
              piecesToPunish.forEach((p) => {
                finalBoard[p.r][p.c] = null;
              });
              const promoted = applyPromotions(finalBoard, { r, c });
              if (promoted) {
                sound.playPromotion();
              }
              setPunishedCoords(null);
              setBoard(finalBoard);
              setCurrentTurn(nextTurn);
              setTimerSec(30);
              setLastMove(moveDetails);

              const currentRoomCode = roomCode || roomCodeRef.current;
              socket.emit('MOVE_PIECE', {
                roomId: currentRoomCode,
                board: finalBoard,
                nextTurn,
                turn: nextTurn,
                lastMove: moveDetails,
                wasPenalty: true,
                punishedCoords: piecesToPunish,
                movingColor: myColor,
                isAutoMove: false,
              });

              // Vérification de fin de match
              const counts = countPieces(finalBoard);
              if (counts.green === 0 && counts.red > 0) {
                awardPlayerResult(
                  myColor === 'red',
                  'red',
                  'capture',
                  myColor === 'red'
                    ? t('toastCapturedAllGreen', 'Félicitations ! Vous avez capturé tous les pions verts !')
                    : t('toastAllPawnsCaptured', 'Tous vos pions ont été capturés.')
                );
              } else if (counts.red === 0 && counts.green > 0) {
                awardPlayerResult(
                  myColor === 'green',
                  'green',
                  'capture',
                  myColor === 'green'
                    ? t('toastCapturedAllRed', 'Félicitations ! Vous avez capturé tous les pions rouges !')
                    : t('toastAllPawnsCaptured', 'Tous vos pions ont été capturés.')
                );
              } else if (counts.green === 1 && counts.red === 1) {
                const gCaps = getAllCapturingPieces(finalBoard, 'green');
                const rCaps = getAllCapturingPieces(finalBoard, 'red');
                if (gCaps.length === 0 && rCaps.length === 0) {
                  awardPlayerResult(
                    false,
                    'draw',
                    'draw_1v1',
                    t('toastDrawOnePawnEach', '⚖️ Match nul ! 1 pion restant de chaque côté sans possibilité de capture.')
                  );
                }
              }
            }, 850);
            return;
          }
        }

        // Promotions en Dames
        const promoted = applyPromotions(newBoard, { r, c });
        if (promoted) {
          sound.playPromotion();
        }

        const moveDetails: LastMove = {
          fr: selectedCoord.r,
          fc: selectedCoord.c,
          tr: r,
          tc: c,
          isCap: isCapture,
        };

        if (isCapture) {
          sound.playCapture();

          // 💥 VÉRIFICATION MULTI-CAPTURE (Enchaînement obligatoire des prises en cascade comme en Local)
          const stepDir: [number, number] = [
            Math.sign((move.cr ?? r) - selectedCoord.r) || 0,
            Math.sign((move.cc ?? c) - selectedCoord.c) || 0,
          ];
          const furtherCaptureMoves = calculateValidMoves(newBoard, r, c, { r, c }, {}, stepDir).filter((m) => m.t === 'c');

          if (furtherCaptureMoves.length > 0) {
            // MULTI-CAPTURE EN COURS : Le joueur conserve son tour et doit enchaîner
            setBoard(newBoard);
            boardRef.current = newBoard;
            setSelectedCoord({ r, c });
            setChainPiecePos({ r, c });
            setChainLastDir(stepDir);
            setValidMoves(furtherCaptureMoves);
            setTimerSec(30);
            timerSecRef.current = 30;
            setLastMove(moveDetails);
            addMoveToHistory(moveDetails, myColor);

            if (onShowToast) {
              onShowToast(t('toastMultiCaptureChain', '💥 Multi-capture ! Enchaînez votre prise !'));
            }

            const currentRoomCode = roomCode || roomCodeRef.current;
            socket.emit('MOVE_PIECE', {
              roomId: currentRoomCode,
              board: newBoard,
              nextTurn: currentTurn, // Le tour reste au joueur qui réalise la multi-capture !
              turn: currentTurn,
              currentTurn,
              lastMove: moveDetails,
              isChainStep: true,
              wasPenalty: false,
              movingColor: myColor,
              isAutoMove: false,
            });
            return;
          } else {
            setChainPiecePos(null);
            setChainLastDir(null);
          }
        } else {
          sound.playMove();
          setChainPiecePos(null);
          setChainLastDir(null);
        }

        const nextTurn: PieceColor = currentTurn === 'green' ? 'red' : 'green';

        const nextNoCap = isCapture ? 0 : movesWithoutCaptureCount + 1;
        setMovesWithoutCaptureCount(nextNoCap);

        addMoveToHistory(moveDetails, myColor);
        consecutiveTimeoutsRef.current[myColor] = 0;

        if (nextNoCap >= 50) {
          const counts = countPieces(newBoard);
          let winner50: PieceColor | 'draw' = 'draw';
          let isWin = false;
          let msg = t('toastFiftyMoveDrawCounts', '🤝 50 coups sans prise : Match Nul ({green} vs {red} pions) !')
            .replace('{green}', String(counts.green))
            .replace('{red}', String(counts.red));
          if (counts.green > counts.red) {
            winner50 = 'green';
            isWin = (myColor === 'green');
            msg = t('toastFiftyMoveGreenWin', '⚖️ 50 coups sans prise : Victoire des Verts ({green} vs {red} pions) !')
              .replace('{green}', String(counts.green))
              .replace('{red}', String(counts.red));
          } else if (counts.red > counts.green) {
            winner50 = 'red';
            isWin = (myColor === 'red');
            msg = t('toastFiftyMoveRedWin', '⚖️ 50 coups sans prise : Victoire des Rouges ({red} vs {green} pions) !')
              .replace('{red}', String(counts.red))
              .replace('{green}', String(counts.green));
          }
          awardPlayerResult(isWin, winner50, 'draw_50_moves', msg);
          const currentRoomCode = roomCode || roomCodeRef.current;
          socket.emit('claim_draw_50', { roomId: currentRoomCode });
          return;
        }

        setBoard(newBoard);
        boardRef.current = newBoard;
        setCurrentTurn(nextTurn);
        currentTurnRef.current = nextTurn;
        setTimerSec(30);
        timerSecRef.current = 30;
        setLastMove(moveDetails);
        setSelectedCoord(null);
        setValidMoves([]);
        setChainPiecePos(null);
        setChainLastDir(null);

        const currentRoomCode = roomCode || roomCodeRef.current;

        // Émission synchrone du coup à l'adversaire
        socket.emit('MOVE_PIECE', {
          roomId: currentRoomCode,
          board: newBoard,
          nextTurn,
          turn: nextTurn,
          lastMove: moveDetails,
          wasPenalty: false,
          isChainStep: false,
          movingColor: myColor,
          isAutoMove: false,
        });

        // Vérification de fin de match immédiate après mon coup
        const counts = countPieces(newBoard);
        if (counts.green === 0 && counts.red > 0) {
          awardPlayerResult(
            myColor === 'red',
            'red',
            'capture',
            myColor === 'red'
              ? t('toastCapturedAllGreen', 'Félicitations ! Vous avez capturé tous les pions verts !')
              : t('toastAllPawnsCaptured', 'Tous vos pions ont été capturés.')
          );
        } else if (counts.red === 0 && counts.green > 0) {
          awardPlayerResult(
            myColor === 'green',
            'green',
            'capture',
            myColor === 'green'
              ? t('toastCapturedAllRed', 'Félicitations ! Vous avez capturé tous les pions rouges !')
              : t('toastAllPawnsCaptured', 'Tous vos pions ont été capturés.')
          );
        } else if (counts.green === 1 && counts.red === 1) {
          const gCaps = getAllCapturingPieces(newBoard, 'green');
          const rCaps = getAllCapturingPieces(newBoard, 'red');
          if (gCaps.length === 0 && rCaps.length === 0) {
            awardPlayerResult(
              false,
              'draw',
              'draw_1v1',
              t('toastDrawOnePawnEach', '⚖️ Match nul ! 1 pion restant de chaque côté sans possibilité de capture.')
            );
          }
        }

        return;
      }

      // Si le joueur est en train d'enchaîner une multi-capture, interdiction de désélectionner ou de cliquer ailleurs
      if (chainPiecePos) {
        if (onShowToast) {
          onShowToast(t('toastMultiCaptureMandatory', '💥 Multi-capture obligatoire ! Enchaînez votre prise avec le même pion !'));
        }
        return;
      }
    }

    // Sélection d'une de ses pièces (interdit en cours de multi-capture)
    if (chainPiecePos) return;
    if (piece && piece.c === myColor) {
      setSelectedCoord({ r, c });
      const moves = calculateValidMoves(board, r, c, null, {});
      setValidMoves(moves);
      sound.playSelect();
    } else {
      setSelectedCoord(null);
      setValidMoves([]);
    }
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    if (onShowToast) onShowToast(t('toastCodeCopied', 'Code copié dans le presse-papier !'));
  };

  const handleCopyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    if (onShowToast) onShowToast(t('toastDirectLinkCopied', 'Lien direct copié !'));
  };

  const handleShareWhatsApp = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    const rawMsg = t(
      'friendShareWhatsApp',
      '👑 12 PIONS - Jeu de Stratégie Royal 👑\nRejoins-moi pour une partie de 12 PIONS ! Mon code de salle est : {code}\nClique ici pour rejoindre directement : {url}'
    )
      .replace('{code}', roomCode)
      .replace('{url}', url);
    const text = encodeURIComponent(rawMsg);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    if (!roomCode) return;
    const url = encodeURIComponent(
      `${window.location.origin}${window.location.pathname}?room=${roomCode}`
    );
    const fbMsg = t('friendShareFacebook', '👑 12 PIONS - Rejoins ma partie de jeu avec le code {code} !').replace(
      '{code}',
      roomCode
    );
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(fbMsg)}`,
      '_blank'
    );
  };

  const greenCount = countPieces(board).green;
  const redCount = countPieces(board).red;
  const isGreenTurn = currentTurn === 'green';
  const timerWarning = timerSec <= 8 ? 'dang' : timerSec <= 15 ? 'warn' : 'normal';

  const isMeGreen = myColor === 'green';
  const greenDisplayName = isMeGreen ? (userProfile.name || 'Champion') : (opponentName || 'CHAMPION_ROYAL');
  const redDisplayName = !isMeGreen ? (userProfile.name || 'Champion') : (opponentName || 'CHAMPION_ROYAL');
  const greenPhoto = isMeGreen ? userProfile.customPhoto : opponentPhoto;
  const redPhoto = !isMeGreen ? userProfile.customPhoto : opponentPhoto;
  const greenAvatar = isMeGreen ? (userProfile.avatar || '👑') : (opponentAvatar || '👑');
  const redAvatar = !isMeGreen ? (userProfile.avatar || '👑') : (opponentAvatar || '👑');
  const greenFlag = isMeGreen ? userProfile.flag : opponentFlag;
  const redFlag = !isMeGreen ? userProfile.flag : opponentFlag;

  const getLocalizedGameResultMessage = (res: GameResultState | null) => {
    if (!res) return '';
    if (res.reason === 'opponent_left') {
      return t('opponentForfeitWin', "Victoire par forfait ! Votre adversaire a abandonné la partie.");
    }
    if (res.reason === 'self_forfeit') {
      return t('selfForfeitLoss', "Défaite par forfait : Vous avez quitté ou abandonné la partie.");
    }
    if (res.reason === 'blocked') {
      return res.isWin
        ? t('opponentBlockedWin', "Victoire ! L’adversaire n’a plus aucun coup valide.")
        : t('playerBlockedLoss', "Défaite : Vous n’avez plus aucun coup légal disponible.");
    }
    if (res.reason === 'draw_50_moves') {
      if (res.winner === 'draw') {
        return t('drawFiftyMoves', "Match nul ! Règle des 50 coups sans capture atteinte.");
      }
      return res.isWin
        ? t('fiftyMovesWin', "Victoire par la règle des 50 coups sans prise ! Vous avez plus de pions restants.")
        : t('fiftyMovesLoss', "Défaite : Règle des 50 coups atteinte, l'adversaire a plus de pions restants.");
    }
    if (res.reason === 'draw_1v1' || res.reason === 'draw') {
      return t('draw1v1Message', "Match nul ! Il ne reste qu’un pion de chaque côté sans prise possible.");
    }
    if (res.reason === 'capture' || res.reason === 'elimination' || !res.reason || res.reason === 'normal') {
      return res.isWin
        ? t('captureWinMsg', "Félicitations ! Vous avez capturé tous les pions de votre adversaire !")
        : t('captureLossMsg', "Tous vos pions ont été capturés.");
    }
    if (res.isWin) {
      return t('captureWinMsg', "Félicitations ! Vous avez capturé tous les pions de votre adversaire !");
    }
    return res.message || t('captureLossMsg', "Tous vos pions ont été capturés.");
  };

  // ─── 1. AFFICHAGE DU MATCH (BANDEAU EXACT COMME SUR LA PHOTO) ───
  if (view === 'GAME') {
    return (
      <div className="w-full flex flex-col items-center gap-1.5 sm:gap-2 max-w-[440px] mx-auto animate-fade-in select-none relative pt-0">

        {/* ─── BANDEAU SUPÉRIEUR HAUT D'ÉCRAN (ESPACE VERTICAL MAXIMAL) ─── */}
        <div className="w-full flex flex-col gap-1.5 pt-0">
          {/* Ligne 1 : Barre d'outils tout en haut (Accueil, Relancer, 2J, Son, Musique, Historique unifié) */}
          <div className="w-full flex items-center justify-between px-2.5 py-1 sm:py-1.5 bg-[#052118]/95 backdrop-blur-md rounded-2xl border border-amber-500/35 shadow-md">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsConfirmLeaveOpen(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-gradient-to-b from-[#0e4835] to-[#06241a] hover:from-[#135d44] hover:to-[#093223] px-2.5 py-1 sm:py-1.5 rounded-xl border border-amber-500/35 shadow-sm transition-all active:scale-95 cursor-pointer"
                title={t('home', 'Accueil')}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('home', 'Accueil')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playSelect();
                  if (onShowToast) {
                    onShowToast(t('onlineRestartForbidden', "Partie en direct : la réinitialisation n'est pas autorisée en plein match."));
                  }
                }}
                className="flex items-center justify-center w-8 h-7 text-amber-300 hover:text-amber-200 bg-gradient-to-b from-[#0e4835] to-[#06241a] hover:from-[#135d44] hover:to-[#093223] rounded-xl border border-amber-500/35 shadow-sm transition-all active:scale-95 cursor-pointer"
                title={t.newGame || 'Recommencer'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-300 bg-[#0a3325] px-2 py-1 rounded-lg border border-amber-400/40 flex items-center gap-1 shadow-inner">
                <Users className="w-3 h-3 text-amber-400" />
                <span>{t('twoPlayersShort', `${formatDigits(2)}J`)}</span>
              </span>

              <button
                type="button"
                onClick={handleToggleSfx}
                className={`p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  sfxEnabled
                    ? 'text-emerald-300 bg-[#0e4835] hover:bg-[#135d44] border-emerald-500/40'
                    : 'text-rose-300 bg-[#1d1113] hover:bg-[#2a171a] border-rose-500/40'
                }`}
                title={t('tooltipMuteSfx', 'Couper / Activer les sons')}
              >
                {sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleToggleMusic}
                className={`relative p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  musicEnabled
                    ? 'text-amber-300 bg-[#0e4835] hover:bg-[#135d44] border-amber-500/40'
                    : 'text-gray-400 bg-[#111917] hover:bg-[#1a2623] border-gray-600/50'
                }`}
                title={t('tooltipMuteMusic', 'Couper / Activer la musique')}
              >
                <Music className="w-3.5 h-3.5" />
                {!musicEnabled && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-4 h-0.5 bg-rose-400 rotate-45 rounded-full" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playSelect();
                  setIsHistoryOpen((prev) => !prev);
                }}
                className={`relative p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  isHistoryOpen
                    ? 'text-slate-950 bg-amber-400 hover:bg-amber-300 border-amber-200 shadow-md'
                    : 'text-amber-200 hover:text-white bg-[#0e4835] hover:bg-[#135d44] border-amber-500/35'
                }`}
                title={t('tooltipCombinedHistory', 'Historique des coups et captures')}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                {moveHistory.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black flex items-center justify-center">
                    {moveHistory.length > 99 ? '99+' : formatNumber(moveHistory.length)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Ligne 1.5 : Affichage des profils avec Vraie Photo de profil personnalisée & Avatar de l'adversaire (Design épuré et harmonieux) */}
          <div className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#041a12]/90 backdrop-blur-md rounded-2xl border border-amber-500/25">
            {/* Profil Joueur Vert (à gauche - fixe pendant la partie) */}
            <div className="flex items-center gap-2 min-w-0 max-w-[46%]">
              {/* Photo ou Avatar avec badge de couleur et statut */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.35)] bg-gradient-to-br from-[#0c3c2a] to-[#041a12] flex items-center justify-center">
                  {greenPhoto ? (
                    <img src={greenPhoto} alt={greenDisplayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl sm:text-2xl select-none">{greenAvatar}</span>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#041a12] shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  {greenFlag && <span className="text-xs sm:text-sm flex-shrink-0" title={isMeGreen ? userProfile.country : opponentCountry}>{greenFlag}</span>}
                  <span className="text-[11px] sm:text-xs font-black text-emerald-300 uppercase tracking-tight truncate">
                    {greenDisplayName}
                  </span>
                </div>
                <span className="text-[8.5px] font-bold text-emerald-400/80 uppercase tracking-wider truncate">
                  {isMeGreen ? t('youGreen', '🟢 Vous (Verts)') : `🟢 ${mode === 'online' ? (opponentCountry || t('opponentLabel', 'Adversaire')) : t('friendLabel', 'Ami')}`}
                  {!isMeGreen && opponentRating ? ` • ${formatDigits(opponentRating)} pts` : ''}
                </span>
              </div>
            </div>

            {/* Badge Central VS */}
            <div className="flex flex-col items-center justify-center flex-shrink-0 px-1">
              <span className="text-[10px] sm:text-[11px] font-black text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/40 shadow-inner tracking-wider">
                VS
              </span>
            </div>

            {/* Profil Joueur Rouge (à droite - fixe pendant la partie) */}
            <div className="flex items-center justify-end gap-2 min-w-0 max-w-[46%] text-right">
              <div className="flex flex-col min-w-0 flex-1 items-end">
                <div className="flex items-center justify-end gap-1 min-w-0 max-w-full">
                  <span className="text-[11px] sm:text-xs font-black text-rose-300 uppercase tracking-tight truncate">
                    {redDisplayName}
                  </span>
                  {redFlag && <span className="text-xs sm:text-sm flex-shrink-0" title={!isMeGreen ? userProfile.country : opponentCountry}>{redFlag}</span>}
                </div>
                <span className="text-[8.5px] font-bold text-rose-400/80 uppercase tracking-wider truncate">
                  {!isMeGreen ? t('youRed', '🔴 Vous (Rouges)') : `🔴 ${mode === 'online' ? (opponentCountry || t('opponentLabel', 'Adversaire')) : t('friendLabel', 'Ami')}`}
                  {isMeGreen && opponentRating ? ` • ${formatDigits(opponentRating)} pts` : ''}
                </span>
              </div>

              {/* Photo ou Avatar avec badge de couleur et statut */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.35)] bg-gradient-to-br from-[#3b0c14] to-[#1a0408] flex items-center justify-center">
                  {redPhoto ? (
                    <img src={redPhoto} alt={redDisplayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl sm:text-2xl select-none">{redAvatar}</span>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#1a0408] shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Ligne 2 : Blocs de Compteurs de Pions des 2 Joueurs & Cercle de Compte à Rebours Central (30s) */}
          <div className="w-full flex items-center justify-between px-1 py-0.5 gap-2">
            {/* Bloc Pions Verts */}
            <div
              className={`flex-1 min-w-0 max-w-[42%] flex items-center gap-2.5 px-3 py-1.5 rounded-2xl transition-all duration-200 border-2 overflow-hidden ${
                isGreenTurn
                  ? `bg-gradient-to-r from-emerald-950 via-[#0a3827] to-emerald-950 border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.55)] scale-102 ring-2 ${
                      isMeGreen ? 'ring-emerald-300/80 animate-pulse' : 'ring-emerald-500/30'
                    }`
                  : 'bg-[#041a12]/90 border-amber-500/20 opacity-60'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#2E8B46] to-[#1E6B33] border-[1.5px] border-[#134923] shadow-md flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-white/25" />
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-xl font-black text-emerald-300 leading-none">
                  {formatNumber(greenCount)}
                </span>
                <span className="text-[8.5px] font-bold text-emerald-400/90 uppercase tracking-wider truncate mt-0.5">
                  {t.green ? `${t.green.toUpperCase()} ${t('pawnsLabelPlural', 'PIONS')}` : 'PIONS VERTS'}
                </span>
              </div>
            </div>

            {/* Cercle Central de Compte à Rebours - Anneau Arcade 30s */}
            <div className="flex flex-col items-center justify-center flex-shrink-0">
              <div
                className={`w-11 h-11 rounded-full flex flex-col items-center justify-center font-black border-2 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${
                  timerWarning === 'dang'
                    ? 'border-rose-500 text-rose-300 bg-rose-950/70 ring-2 ring-rose-500 animate-pulse'
                    : timerWarning === 'warn'
                    ? 'border-amber-400 text-amber-300 bg-amber-950/60'
                    : 'border-amber-400/80 text-amber-300 bg-gradient-to-b from-[#0a3828] to-[#041a12]'
                }`}
              >
                <span className="leading-none text-base font-mono">{formatNumber(timerSec)}</span>
                <span className="text-[6.5px] text-amber-300/70 uppercase tracking-tighter">
                  {t.secondsShort || 'SEC'}
                </span>
              </div>
              <span className="text-[8px] font-black text-amber-300/90 mt-0.5 uppercase tracking-wider whitespace-nowrap">
                {isGreenTurn ? t.tG : t.tR}
              </span>
            </div>

            {/* Bloc Pions Rouges */}
            <div
              className={`flex-1 min-w-0 max-w-[42%] flex items-center justify-end gap-2.5 px-3 py-1.5 rounded-2xl transition-all duration-200 border-2 overflow-hidden ${
                !isGreenTurn
                  ? `bg-gradient-to-r from-rose-950 via-[#2f0c13] to-rose-950 border-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.55)] scale-102 ring-2 ${
                      !isMeGreen ? 'ring-rose-300/80 animate-pulse' : 'ring-rose-500/30'
                    }`
                  : 'bg-[#041a12]/90 border-amber-500/20 opacity-60'
              }`}
            >
              <div className="flex flex-col min-w-0 flex-1 text-right justify-center">
                <span className="text-xl font-black text-rose-300 leading-none">
                  {formatNumber(redCount)}
                </span>
                <span className="text-[8.5px] font-bold text-rose-400/90 uppercase tracking-wider truncate mt-0.5">
                  {t.red ? `${t.red.toUpperCase()} ${t('pawnsLabelPlural', 'PIONS')}` : 'PIONS ROUGES'}
                </span>
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#CF2F35] to-[#B31D22] border-[1.5px] border-[#781216] shadow-md flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-white/25" />
              </div>
            </div>
          </div>

          {/* Ligne 3 : Sous-bandeau Salon */}
          <div className="w-full bg-[#052118] border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-gray-300 text-[11px]">
                {mode === 'online' ? t('online1v1', 'En Ligne 1v1') : t('roomColon', 'Salon :')}{' '}
                <strong className="text-amber-400 font-mono tracking-wider">
                  {mode === 'online' ? `(${t('matchmakingLabel', 'Matchmaking')})` : roomCode}
                </strong>
              </span>
              <span className="text-[10px] text-gray-400 font-medium">{t('connectedStatus', '(Connecté)')}</span>
            </div>
          </div>
        </div>

        {/* Alerte Maintien de Session (Buffer 15 secondes anti-forfait micro-coupure 4G/Wi-Fi) */}
        {reconnectBufferSec !== null && (
          <div className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-amber-950/95 via-amber-900/90 to-amber-950/95 border-2 border-amber-400 rounded-2xl text-amber-200 text-xs font-bold animate-pulse shadow-xl">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t('reconnectingNotice', 'Micro-coupure adverse (4G/Wi-Fi)... Maintien :')}</span>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-black/70 text-amber-300 font-mono text-sm font-black border border-amber-500/50">
              {formatNumber(reconnectBufferSec)} {t.secondsShort || 's'}
            </span>
          </div>
        )}

        {/* ─── PLATEAU DE JEU ─── */}
        <GameBoard
          key={`board_${roomCode}_${matchNonce}`}
          board={board}
          selectedCoord={selectedCoord}
          validMoves={validMoves}
          onCellClick={handleCellClick}
          flipped={myColor === 'green'}
          showCoords={showCoords}
          activeColor={currentTurn}
          disabled={Boolean(gameResult?.isOver) || Boolean(punishedCoords)}
          lastMove={lastMove}
          punishedCoords={punishedCoords}
          onReturnToMenu={() => setIsConfirmLeaveOpen(true)}
        />

        {/* ⚖️ Règle des 50 coups sans prise sous le plateau */}
        <div className="flex flex-col items-center justify-center gap-2 w-full">
          {/* Badge 50 coups sans prise réactif */}
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
              {t('movesWithoutCaptureLabel', 'Coups sans prise')} :{' '}
              <strong className="font-mono font-black">
                {formatDigits(movesWithoutCaptureCount)}/{formatDigits(50)}
              </strong>
            </span>
            {movesWithoutCaptureCount >= 40 && (
              <span className="text-[10px] uppercase font-black text-rose-400 animate-bounce">
                {t('imminentDraw', '⚠️ Imminent !')}
              </span>
            )}
          </div>

          {/* Panneau d'historique en bas (sous Coups sans prise, comme VS Ordinateur, sans masquer le plateau) */}
          {isHistoryOpen && (
            <div className="w-full flex justify-center animate-fade-in">
              <MoveHistoryBar history={moveHistory} turnCount={turnIdRef.current || moveHistory.length} />
            </div>
          )}
        </div>

        {/* Chat in-game (Messages rapides & Émojis) — sous Coups sans prise (ou sous l'historique s'il est ouvert) */}
        <GameChatOverlay
          onSendQuickPhrase={handleSendQuickPhrase}
          onSendEmoji={handleSendReaction}
          activeChatBubble={activeChatBubble}
        />

        {/* Émoji animé flottant lors d'une réaction rapide */}
        {activeReaction && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center animate-bounce">
            <span className="text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
              {activeReaction.emoji}
            </span>
            <span className="mt-1 px-3 py-0.5 rounded-full bg-black/80 text-[10px] font-bold text-amber-300 border border-amber-500/40">
              {activeReaction.from === 'me' ? (t.you || 'Vous') : (mode === 'online' ? t('opponentLabel', 'Adversaire') : t('friendLabel', 'Ami'))}
            </span>
          </div>
        )}

        {/* ─── MODALE DE CONFIRMATION D'ABANDON (QUAND ON QUITTE, ON PERD ET L'AUTRE GAGNE) ─── */}
        {isConfirmLeaveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm bg-gradient-to-b from-[#1a0f0f] via-[#241113] to-[#120809] border-2 border-rose-500 rounded-3xl p-6 text-center text-[#f0e6c8] flex flex-col items-center gap-3 shadow-2xl">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-lg font-black text-rose-300 uppercase tracking-wide">
                {t.leaveTitle || 'Abandonner la partie ?'}
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                {t('leaveForfeitWarning', `Si vous quittez la partie en cours, vous perdrez par forfait et votre adversaire remportera automatiquement la victoire.`)}
              </p>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={handleConfirmAbandon}
                  className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  {t('confirmForfeitBtn', "Confirmer l'abandon (Défaite)")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmLeaveOpen(false)}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {t.stayBtn || 'Continuer à jouer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODALE DE FIN DE PARTIE (STYLE D 12 PIONS VERT & OR) ─── */}
        {gameResult?.isOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in pointer-events-auto">
            <div
              className={`w-full max-w-sm bg-gradient-to-b border-2 rounded-3xl p-6 text-center flex flex-col items-center gap-3 shadow-2xl ${
                gameResult.winner === 'draw'
                  ? 'from-[#0a3828] via-[#06241b] to-[#041a12] border-amber-400 text-[#f0e6c8] shadow-[0_0_35px_rgba(245,158,11,0.3)]'
                  : gameResult.isWin
                  ? 'from-[#0a3828] via-[#06241b] to-[#041a12] border-amber-400 text-[#f0e6c8] shadow-[0_0_35px_rgba(245,158,11,0.3)]'
                  : 'from-[#2e0e13] via-[#1f090d] to-[#120406] border-rose-500 text-[#f0e6c8]'
              }`}
            >
              {/* Animated Badge & Icon (Harmonisé avec le mode VS Ordinateur / Local) */}
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg mb-1 ${
                  gameResult.winner === 'draw'
                    ? 'bg-slate-700/30 border-2 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : gameResult.isWin
                    ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_25px_rgba(245,197,24,0.6)] animate-bounce'
                    : 'bg-rose-500/20 border-2 border-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                }`}
              >
                <span>{gameResult.winner === 'draw' ? '🤝' : gameResult.isWin ? '🏆' : '💔'}</span>
              </div>

              <span
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full border ${
                  gameResult.winner === 'draw'
                    ? 'text-amber-300 bg-amber-500/20 border-amber-400/40'
                    : gameResult.isWin
                    ? 'text-amber-300 bg-amber-500/20 border-amber-400/40'
                    : 'text-rose-300 bg-rose-500/20 border-rose-400/40'
                }`}
              >
                {gameResult.winner === 'draw'
                  ? (t.equality || t.draw || 'Égalité')
                  : gameResult.isWin
                  ? (t.victory || 'Victoire')
                  : (t.defeat || 'Défaite')}
              </span>

              <h3
                className={`text-xl font-black uppercase tracking-wide ${
                  gameResult.winner === 'draw'
                    ? 'text-amber-300'
                    : gameResult.isWin
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#FFE082] via-[#F59E0B] to-[#FFE082]'
                    : 'text-rose-400'
                }`}
              >
                {gameResult.winner === 'draw'
                  ? (t.draw || t('draw', 'Match nul'))
                  : gameResult.isWin
                  ? (t.victory || t('victory', 'Victoire !'))
                  : (t.defeat || t('defeat', 'Défaite'))}
              </h3>

              <p className="text-xs text-gray-300 leading-relaxed px-2">
                {getLocalizedGameResultMessage(gameResult)}
              </p>

              {/* Récompenses en Pièces et XP D 12 PIONS */}
              <div className="flex items-center justify-center gap-4 my-2 px-4 py-2 bg-black/40 rounded-xl border border-white/10 w-full">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                  <span>🪙</span>
                  <span>+{formatNumber(gameResult.coinsGained)} {t('coinsLabel', 'Pièces')}</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                  <span>⚡</span>
                  <span>+{formatNumber(gameResult.xpGained)} XP</span>
                </div>
              </div>

              {/* Boutons D 12 PIONS : Revanche Propre & Retour Menu */}
              <div className="flex flex-col gap-2 w-full mt-1">
                {/* 1. Cas où l'adversaire a quitté la salle (retour au menu principal ou départ) */}
                {opponentHasLeft ? (
                  <div className="w-full py-3 px-4 bg-amber-950/70 border border-amber-500/50 rounded-xl text-amber-200 text-xs font-black text-center flex items-center justify-center gap-2 shadow-lg animate-fade-in">
                    <span className="text-base">🚪</span>
                    <span>{t('opponentLeftNotice', "L'adversaire a quitté la partie")}</span>
                  </div>
                ) : rematchRefusedByOpponent ? (
                  /* 2. C'est lui, et lui seul (le demandeur initial), qui voit le message : "L'adversaire a refusé la revanche" */
                  <div className="w-full py-3 px-4 bg-red-950/70 border border-red-500/50 rounded-xl text-red-200 text-xs font-black text-center flex items-center justify-center gap-2 shadow-lg animate-fade-in">
                    <span className="text-base">🚫</span>
                    <span>{t('rematchRefusedNotice', "L'adversaire a refusé la revanche")}</span>
                  </div>
                ) : iRefusedRematch ? (
                  /* 3. Pour le joueur qui a reçu la demande et qui a cliqué sur "Refuser" :
                        La boîte de dialogue a disparu instantanément. Pas de "L'adversaire a refusé la revanche" !
                        Confirmation discrète qu'il a refusé la revanche, avec uniquement le bouton "Retour au menu principal" accessible */
                  <div className="w-full py-2.5 px-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 animate-fade-in">
                    <span>✓</span>
                    <span>{t('youRefusedRematch', "Revanche déclinée")}</span>
                  </div>
                ) : (
                  /* 4. Cas normal : Affichage du bouton "Rejouer" (sauf en cas d'abandon volontaire ou forfait pour inactivité) */
                  (() => {
                    const r = String(gameResult?.reason || '').toLowerCase();
                    const isAbandonOrForfeit = Boolean(
                      r.includes('forfeit') ||
                      r.includes('abandon') ||
                      r.includes('timeout') ||
                      r.includes('left') ||
                      r.includes('surrender')
                    );
                    if (isAbandonOrForfeit) return null;

                    return (
                      <button
                        type="button"
                        disabled={rematchStatus === 'REQUESTING' || rematchStatus === 'PENDING'}
                        onClick={() => {
                          sound.killAllCelebrationAudio();
                          setShowCelebration(false);
                          setRematchStatus('REQUESTING');
                          socket.emit('request_rematch', { roomId: roomCodeRef.current });
                          if (onShowToast) onShowToast(t('rematchSentToast', "Demande envoyée... En attente de l'adversaire."));
                        }}
                        className={`w-full py-3 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${
                          rematchStatus === 'REQUESTING' || rematchStatus === 'PENDING'
                            ? 'bg-amber-600/50 text-amber-200 border border-amber-400/40 cursor-wait'
                            : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 shadow-[0_4px_16px_rgba(245,158,11,0.35)]'
                        }`}
                      >
                        <RefreshCw className={`w-4 h-4 ${rematchStatus === 'REQUESTING' || rematchStatus === 'PENDING' ? 'animate-spin' : ''}`} />
                        <span>
                          {rematchStatus === 'REQUESTING' || rematchStatus === 'PENDING'
                            ? (t('waitingRematch', "En attente de l'adversaire..."))
                            : (t('playAgain', 'Rejouer'))}
                        </span>
                      </button>
                    );
                  })()
                )}

                {/* 🏠 Retour au Menu Principal (Bouton Principal et Officiel) */}
                <button
                  type="button"
                  onClick={handleReturnToLobby}
                  className={`w-full py-3 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                    opponentHasLeft || rematchRefusedByOpponent
                      ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-teal-500 text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                      : (gameResult.isWin || gameResult.winner === 'draw'
                          ? 'bg-[#062a1e] hover:bg-[#0a3828] border border-amber-500/40 text-amber-200'
                          : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white')
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>{t('returnToMainMenu', 'Retour au Menu Principal')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ⚔️ NOTIFICATION / POPUP DE DEMANDE DE REVANCHE PAR L'ADVERSAIRE */}
        {incomingRematch && !opponentHasLeft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in pointer-events-auto">
            <div className="w-full max-w-sm bg-gradient-to-b from-[#0a3828] via-[#06241b] to-[#041a12] border-2 border-amber-400 text-[#f0e6c8] rounded-3xl p-6 text-center flex flex-col items-center gap-3 shadow-[0_0_40px_rgba(245,158,11,0.4)]">
              <span className="text-4xl animate-bounce">⚔️</span>
              <h3 className="text-lg font-black text-amber-300 uppercase tracking-wide">
                {t('rematchOfferTitle', 'Demande de Revanche')}
              </h3>
              <p className="text-xs text-gray-200 leading-relaxed px-2">
                <strong>{incomingRematch.requesterName}</strong> {t('rematchOfferDesc', 'souhaite une revanche !')}
              </p>
              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.killAllCelebrationAudio();
                    setIncomingRematch(null);
                    setIRefusedRematch(true);
                    socket.emit('decline_rematch', { roomId: roomCodeRef.current });
                    if (onShowToast) {
                      onShowToast(t('rematchRefusedToast', "Vous avez refusé la revanche."));
                    }
                  }}
                  className="py-3 bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>{t('decline', 'Refuser')}</span>
                </button>
                <button
                  type="button"
                  disabled={isAcceptingRematch}
                  onClick={() => {
                    sound.killAllCelebrationAudio();
                    setIsAcceptingRematch(true);
                    setShowCelebration(false);
                    socket.emit('accept_rematch', { roomId: roomCodeRef.current });
                  }}
                  className={`py-3 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isAcceptingRematch ? 'opacity-60 cursor-wait' : ''
                  }`}
                >
                  {isAcceptingRematch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{t('accept', 'Accepter')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🎆 Feux d'artifice spectaculaires (strictement identiques au mode Local / VS Ordinateur) */}
        <FireworksCelebration active={Boolean(showCelebration && gameResult?.isWin)} />
      </div>
    );
  }

  // ─── 2. ÉCRAN D'ATTENTE DE L'HÔTE (WAITING) ───
  if (view === 'WAITING' || isWaiting) {
    return (
      <div className="w-full max-w-sm mx-auto bg-gradient-to-b from-[#0a3828] via-[#06241b] to-[#03150f] border-2 border-amber-400/80 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col gap-4 text-center text-[#f0e6c8] select-none animate-fade-in">
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
          <button
            type="button"
            onClick={() => {
              setIsWaiting(false);
              setView('LOBBY');
            }}
            className="w-7 h-7 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 flex items-center justify-center text-amber-300 transition-colors cursor-pointer"
            title={t('back', 'Retour')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 uppercase tracking-wider">
            <Users className="w-4 h-4 text-amber-400" />
            <span>{t('roomCreatedTitle', 'Salle Créée')}</span>
          </div>
          <div className="w-7 h-7" />
        </div>

        {/* 🌟 LOGO DU JEU AU-DESSUS DU CODE & TEXTE DE PARTAGE (EXIGENCE EXPLICITE) */}
        <div className="w-full flex justify-center -mb-1">
          <img
            src="/logo du jeu.png"
            alt="Logo 12 PIONS"
            className="w-36 h-auto object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes('game-logo')) {
                target.src = '/game-logo.png';
              }
            }}
            referrerPolicy="no-referrer"
          />
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/15 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
            {t('host', 'Hôte')} • {t.green || 'Verts'}
          </span>
          <h3 className="text-sm font-bold text-gray-200 mt-2">
            {t('shareCodePrompt', 'Partagez ce code à 6 chiffres avec votre ami :')}
          </h3>
        </div>

        {/* Boîte d'affichage du Code à 6 Chiffres */}
        <div className="bg-[#051c14] border-2 border-amber-400/70 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-inner">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
            {t('roomCodeLabel', 'CODE DE SALLE UNIQUE')}
          </span>
          <div className="flex items-center justify-center gap-2 my-1">
            {roomCode.split('').map((digit, i) => (
              <div
                key={i}
                className="w-10 h-12 bg-black/60 border-2 border-amber-400/60 rounded-xl flex items-center justify-center font-mono text-2xl font-black text-[#FFD700] shadow-md"
              >
                {formatDigits(digit)}
              </div>
            ))}
          </div>

          {/* Résumé de la couleur choisie par l'Hôte */}
          <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-black/40 rounded-xl border border-amber-400/30 text-[11px]">
            <span className="text-amber-300/80 font-bold">{t('yourPawnsLabel', 'Vos pions :')}</span>
            <span className="font-black text-amber-300">
              {hostColorPref === 'green' ? `🟢 ${t.green || 'Verts'} (${t('host', 'Hôte')})` : hostColorPref === 'red' ? `🔴 ${t.red || 'Rouges'} (${t('host', 'Hôte')})` : `🎲 ${t('randomColor', 'Aléatoire')}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? (t('codeCopied', 'Code copié !')) : (t('copyCode', 'Copier le code'))}</span>
          </button>
        </div>

        {/* Partage Social */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-2 px-1 rounded-xl bg-gradient-to-b from-[#25D366] to-[#128C7E] text-white font-black text-[11px] flex flex-col items-center justify-center gap-1 shadow cursor-pointer active:scale-95 transition-transform"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handleShareFacebook}
            className="py-2 px-1 rounded-xl bg-gradient-to-b from-[#1877F2] to-[#0C58BD] text-white font-black text-[11px] flex flex-col items-center justify-center gap-1 shadow cursor-pointer active:scale-95 transition-transform"
          >
            <Share2 className="w-4 h-4" />
            <span>Facebook</span>
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="py-2 px-1 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 text-slate-950 font-black text-[11px] flex flex-col items-center justify-center gap-1 shadow cursor-pointer active:scale-95 transition-transform"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? (t('copied', 'Copié !')) : (t('link', 'Lien'))}</span>
          </button>
        </div>

        {/* Indicateur d'attente actif */}
        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-center gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-bold text-amber-200">
            {t('waitingFriendNotice', "En attente de votre ami... Dès qu'il valide le code, la partie démarre immédiatement !")}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsWaiting(false);
            setView('LOBBY');
          }}
          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
        >
          {t.cancel || 'Annuler'}
        </button>
      </div>
    );
  }

  // ─── 3. ÉCRAN DE MATCHMAKING EN LIGNE (RADAR ET SÉLECTION COULEUR) ───
  if (view === 'MATCHMAKING') {
    return (
      <div className="w-full max-w-sm flex flex-col items-center justify-center min-h-[65vh] py-4 animate-fade-in select-none mx-auto px-3">
        <div className="w-full bg-gradient-to-b from-[#0a3828] via-[#06241b] to-[#03150f] border-2 border-amber-400/80 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(245,197,24,0.25)] flex flex-col items-center text-center gap-5 relative overflow-hidden">
          {/* Top Gold Ribbon */}
          <div className="w-full -mt-2 py-1 px-4 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-lg shadow-md flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-current" />
            <span className="text-[11px] font-black text-slate-950 uppercase tracking-widest">
              {t.online || 'Partie En Ligne 1v1'}
            </span>
          </div>

          {/* ATTRIBUTION STRICTEMENT ÉQUITABLE ET ALÉATOIRE */}
          <div className="w-full flex flex-col items-center gap-2.5 bg-[#041a12]/80 p-3.5 rounded-2xl border border-amber-400/30 text-center shadow-inner">
            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-black uppercase tracking-wider">
              <span className="text-base">🎲</span>
              <span>{t('fairAllocation', 'Attribution Aléatoire Équitable')}</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-snug">
              {t('fairAllocationDesc', 'Les couleurs (Verts ou Rouges) ainsi que le joueur qui commence sont tirés au sort à 50% dès le match trouvé.')}
            </p>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/30 text-[10px] text-amber-200 font-bold">
              <span>⬇️ {t('pawnsBottomNotice', 'Vos pions seront positionnés en bas de votre écran')}</span>
            </div>
          </div>

          {/* Animated Radar Pulse */}
          <div className="relative w-32 h-32 flex items-center justify-center my-1">
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-ping" />
            <div className="absolute inset-3 rounded-full border border-amber-400/30" />
            <div className="absolute inset-6 rounded-full border border-amber-400/40" />
            <div className="absolute inset-9 rounded-full border border-amber-400/50" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-amber-400/20 to-transparent animate-spin duration-1000 pointer-events-none" />
            <div className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border-2 border-amber-200 flex items-center justify-center text-slate-950 font-black shadow-[0_0_25px_rgba(245,197,24,0.6)] z-10">
              <Wifi className="w-7 h-7 animate-pulse text-slate-950" />
            </div>
          </div>

          {/* Message de recherche */}
          <div className="flex flex-col items-center gap-1">
            <h3 className="text-sm sm:text-base font-black text-amber-300">
              {t('searchingOpponent', 'Recherche d’un adversaire mondial...')}
            </h3>
            <p className="text-xs text-gray-400">
              {t('connectingServer', 'Connexion en direct • Serveur 1v1')}
            </p>
            <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-black/40 rounded-full border border-amber-500/20 text-xs font-mono text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{formatTime(searchTimer)}</span>
            </div>
          </div>

          {/* Bouton Annuler */}
          <button
            type="button"
            onClick={handleCancelMatchmaking}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer mt-1"
          >
            {t.cancel || 'Annuler la recherche'}
          </button>
        </div>
      </div>
    );
  }

  // ─── 4. ÉCRAN D'ACCUEIL LOBBY (CRÉER OU REJOINDRE AVEC ONGLETS CLAIRS) ───
  return (
    <div className="w-full max-w-sm mx-auto bg-gradient-to-b from-[#0a3828] via-[#06241b] to-[#03150f] border-2 border-amber-400/80 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col gap-4 text-center text-[#f0e6c8] select-none animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
        <button
          type="button"
          onClick={onBack}
          className="w-7 h-7 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 flex items-center justify-center text-amber-300 transition-colors cursor-pointer"
          title={t.home || t.menuLeave || t('back', 'Retour au menu')}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm font-black text-amber-300 uppercase tracking-wider">
          <Users className="w-4 h-4 text-amber-400" />
          <span>{t('vsFriends', 'VS Friends')} {'\u2066(12 PIONS)\u2069'}</span>
        </div>
        <div className="w-7 h-7" />
      </div>

      <div>
        <h3 className="text-base font-black text-amber-300">
          {t('privateRoomTitle', 'Salon Privé 1v1')}
        </h3>
        <p className="text-xs text-gray-300/90 mt-1 leading-snug">
          {t('privateRoomDesc', 'Jouez en direct sur deux téléphones distincts avec un code de salle à 6 chiffres.')}
        </p>

        {/* Badge Nom du Joueur Modifiable */}
        <div className="flex items-center justify-center mt-2.5">
          <button
            type="button"
            onClick={() => {
              setNameInput(userProfile.name);
              setIsEditNameModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-black/40 hover:bg-black/60 border border-amber-400/40 rounded-full text-xs transition-all cursor-pointer shadow-sm group"
            title={t('editPlayerName', 'Modifier mon nom de joueur')}
          >
            <span className="text-[10px] text-gray-400">{t('playerLabelPrefix', 'Joueur :')}</span>
            <span className="font-black text-amber-300 truncate max-w-[120px]">{userProfile.name}</span>
            <Edit3 className="w-3 h-3 text-amber-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2 text-left animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 🎯 SÉLECTEUR D'ONGLETS POUR ÉVITER DE FAIRE DÉFILER LE CHAMP VERS LE BAS */}
      <div className="grid grid-cols-2 p-1 bg-black/50 rounded-2xl border border-amber-400/40 gap-1 shadow-inner">
        <button
          type="button"
          onClick={() => {
            sound.playSelect();
            setLobbyTab('create');
            setErrorMessage(null);
          }}
          className={`py-2 px-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            lobbyTab === 'create'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-md font-extrabold'
              : 'text-gray-300 hover:text-amber-200'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>{t('createRoomTab', 'Créer Salle')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playSelect();
            setLobbyTab('join');
            setErrorMessage(null);
          }}
          className={`py-2 px-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            lobbyTab === 'join'
              ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 text-slate-950 shadow-md font-extrabold'
              : 'text-gray-300 hover:text-emerald-200'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{t('joinRoomTab', 'Rejoindre')}</span>
        </button>
      </div>

      {/* ONGLET 1: REJOINDRE UNE SALLE (PLACÉ DIRECTEMENT EN HAUT POUR SAISIE IMMÉDIATE) */}
      {lobbyTab === 'join' && (
        <div className="p-4 rounded-2xl bg-[#051c14] border-2 border-emerald-500/50 flex flex-col gap-3 text-left animate-fade-in shadow-xl">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
              {t('enterCodePrompt', 'Entrez le Code à 6 Chiffres')}
            </span>
          </div>

          <p className="text-[11px] text-gray-300 leading-snug">
            {t('enterCodeSub', 'Saisissez le code de salon que votre ami vous a communiqué :')}
          </p>

          <div className="flex flex-col gap-2.5">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Ex : 123456"
              autoFocus
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.replace(/[^0-9]/g, ''));
                setErrorMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoinRoom();
              }}
              className="w-full bg-[#0b1015] border-2 border-emerald-400 focus:border-emerald-300 rounded-xl px-4 py-3 text-center font-mono text-3xl font-black tracking-[0.25em] text-[#FFD700] outline-none shadow-inner transition-colors"
            />

            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={inputCode.trim().length < 4}
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                inputCode.trim().length >= 4
                  ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.5)]'
                  : 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-600 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('validateCodeBtn', 'Valider le code & Jouer')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ONGLET 2: CRÉER UNE SALLE (HÔTE) AVEC CHOIX DE COULEUR AU PRÉALABLE */}
      {lobbyTab === 'create' && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border-2 border-amber-400/60 shadow-lg text-left animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-md font-black shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-amber-300 uppercase tracking-wide">
                {t('createRoomHeader', 'CRÉER UNE SALLE')}
              </div>
              <div className="text-[11px] text-gray-300">
                {t('createRoomSub', 'Générez un code et invitez un ami')}
              </div>
            </div>
          </div>

          {/* Choix des couleurs au préalable */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-amber-500/20">
            <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
              {t('hostColorPrompt', 'Couleur de vos pions (Hôte) :')}
            </span>
            <div className="grid grid-cols-3 gap-1.5 w-full">
              <button
                type="button"
                onClick={() => {
                  sound.playSelect();
                  setHostColorPref('green');
                }}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                  hostColorPref === 'green'
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'bg-black/30 border-white/10 text-gray-400 hover:text-emerald-300'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow flex items-center justify-center">
                  {hostColorPref === 'green' && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-[10px] font-black">{t.green || 'Verts'}</span>
                <span className="text-[8px] text-gray-400">({t('host', 'Hôte')})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playSelect();
                  setHostColorPref('red');
                }}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                  hostColorPref === 'red'
                    ? 'bg-rose-500/30 border-rose-400 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                    : 'bg-black/30 border-white/10 text-gray-400 hover:text-rose-300'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-rose-500 shadow flex items-center justify-center">
                  {hostColorPref === 'red' && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-[10px] font-black">{t.red || 'Rouges'}</span>
                <span className="text-[8px] text-gray-400">({t('host', 'Hôte')})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playSelect();
                  setHostColorPref('random');
                }}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                  hostColorPref === 'random'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,197,24,0.4)]'
                    : 'bg-black/30 border-white/10 text-gray-400 hover:text-amber-300'
                }`}
              >
                <span className="text-sm">🎲</span>
                <span className="text-[10px] font-black">{t('randomColor', 'Aléatoire')}</span>
                <span className="text-[8px] text-gray-400">50/50</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateRoom}
            className="w-full mt-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Crown className="w-4 h-4 text-slate-950" />
            <span>{t('generateRoomBtn', 'Générer le Salon & Obtenir le Code')}</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold border border-white/10 transition-colors cursor-pointer"
      >
        {t('returnToMainMenu', 'Retour au Menu Principal')}
      </button>

      {/* ─── MODALE MODIFICATION DU NOM DU JOUEUR (EN LIGNE & VS AMIS) ─── */}
      {isEditNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in text-center">
          <div className="w-full max-w-xs bg-gradient-to-b from-[#06241a] via-[#041a12] to-[#02100b] border-2 border-amber-400 rounded-3xl p-5 shadow-2xl">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 mb-2.5">
              <Edit3 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-amber-300 uppercase tracking-wide">
              {t('editPlayerName', 'Modifier mon nom de joueur')}
            </h4>
            <p className="text-[11px] text-gray-300 mt-1 mb-3">
              {t('editPlayerNameDesc', 'Ce nom sera visible par votre adversaire pendant la partie en ligne ou entre amis.')}
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={20}
              placeholder={t('yourPseudoPlaceholder', 'Votre nom ou pseudo...')}
              className="w-full bg-black/50 border border-amber-400/50 rounded-xl px-3 py-2 text-sm font-bold text-amber-200 focus:outline-none focus:border-amber-300 mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditNameModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-white/20 text-xs text-gray-300 hover:bg-white/5 cursor-pointer font-bold"
              >
                {t.cancel || 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmed = nameInput.trim();
                  if (trimmed) {
                    const updated: UserProfile = { ...userProfile, name: trimmed };
                    saveUserProfile(updated);
                    setUserProfile(updated);
                    setIsEditNameModalOpen(false);
                    if (onShowToast) onShowToast(`${t('nameUpdatedToast', 'Nom mis à jour : ')}${trimmed}`);
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer hover:brightness-105 active:scale-95"
              >
                {t.save || 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ALERTE DE CONNEXION INTERNET ABSENTE ─── */}
      {isOfflineWarningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-sm animate-fade-in text-center">
          <div className="w-full max-w-sm bg-gradient-to-b from-[#1c080d] to-[#0a0204] border-2 border-rose-500 rounded-3xl p-5 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-300 mb-3">
              <WifiOff className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-rose-300 uppercase tracking-wide">
              {t('noInternetConnection', t('noInternetTitle', 'Pas de Connexion Internet'))}
            </h4>
            <p className="text-xs text-gray-200 mt-2 mb-4 leading-relaxed font-medium">
              {t('offlineWarningMessage', t('noInternetDesc', 'Une connexion Internet active est nécessaire pour jouer en direct. Les modes VS Ordinateur et Jeu Local fonctionnent quant à eux 100% hors ligne !'))}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 hover:brightness-110 text-white font-black text-xs uppercase shadow cursor-pointer transition-all"
              >
                {t('backToOfflineModes', 'Retour aux modes Hors Ligne (IA & Local)')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
