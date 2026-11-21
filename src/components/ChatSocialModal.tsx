import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  MessageCircle,
  Clock,
  Search,
  Swords,
  Send,
  ArrowLeft,
  X,
  UserPlus,
  UserCheck,
  UserX,
  ShieldAlert,
  Share2,
  Sparkles,
  Gift,
  Check,
  Copy,
  Lock,
  Plus,
  MoreVertical,
} from 'lucide-react';
import { FriendItem, LastOpponent, FriendRequestItem, SentFriendRequestItem } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { socket } from '../utils/gameSocket';
import { isVirtualProfileOrBot } from '../utils/virtualProfiles';

export interface ChatMessageItem {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
  lang?: string;
}

interface ChatSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  userFriendCode: string;
  userName?: string;
  userAvatar?: string;
  userFlag?: string;
  friends: FriendItem[];
  lastOpponent?: LastOpponent | null;
  incomingFriendRequests?: FriendRequestItem[];
  sentFriendRequests?: SentFriendRequestItem[];
  onSendFriendRequest?: (target: {
    id?: string;
    name: string;
    avatar?: string;
    flag?: string;
    country?: string;
    isBot?: boolean;
    friendCode?: string;
  }) => void;
  onAcceptFriendRequest?: (req: FriendRequestItem) => void;
  onDeclineFriendRequest?: (reqId: string) => void;
  onCancelSentFriendRequest?: (targetName: string, targetId?: string, targetCode?: string) => void;
  onToggleSubscribe?: (friendId: string) => void;
  onAddFriend: (friend: string | (Partial<FriendItem> & { name: string })) => boolean;
  onChallengeFriend: (friend: FriendItem) => void;
  onStartFriendDuel?: (roomId: string, role: 'host' | 'guest', opponent: any) => void;
  onUnreadMessagesCountChange?: (totalUnread: number) => void;
  onActiveChatOpenChange?: (isActive: boolean) => void;
  onShowToast: (msg: string) => void;
}

interface IncomingChallenge {
  id: string;
  roomId: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
    flag: string;
    friendCode?: string;
  };
  targetFriendId: string;
}

interface OutgoingChallenge {
  id: string;
  roomId?: string;
  friendId: string;
  friendName: string;
}

const INITIAL_REQUESTS: FriendRequestItem[] = [];
const INITIAL_BLOCKED: FriendRequestItem[] = [];
const DEFAULT_CHATS: Record<string, ChatMessageItem[]> = {};
const CHAT_STORAGE_KEY = 'd12_chats_history_clean_v3';
const UNREAD_COUNTS_STORAGE_KEY = 'd12_unread_counts_v1';
const LAST_CHAT_TS_STORAGE_KEY = 'd12_chat_last_ts_v1';

const QUICK_PHRASE_KEYS = [
  { key: 'chatQuickPhrase1', fallback: 'On se fait une belle partie ? ⚔️' },
  { key: 'chatQuickPhrase2', fallback: 'Rejoins mon salon pour un duel ! 🚪' },
  { key: 'chatQuickPhrase3', fallback: 'Chapeau pour ta belle victoire ! 🏆' },
  { key: 'chatQuickPhrase4', fallback: 'À tout de suite sur le plateau ! 👍' },
  { key: 'chatQuickPhrase5', fallback: 'Partant pour une revanche quand tu veux ! 🔥' },
  { key: 'chatQuickPhrase6', fallback: 'Superbe coup avec ta Dame ! 👑' },
];

/**
 * Détecte si un message contient ou demande un numéro de téléphone ou contact externe.
 * Règle stricte de sécurité : Interdiction absolue de demander ou d'échanger des coordonnées personnelles.
 */
export function containsOrRequestsPhoneNumber(text: string): boolean {
  const normalized = text.toLowerCase();
  const phoneKeywords = [
    'numéro', 'numero', 'téléphone', 'telephone', 'téléphon', 'telephon',
    'phone', 'cellphone', 'tel', 'whatsapp', 'wa.me', 'mon num',
    'ton num', 'donne ton num', 'donne moi ton num', 'donne ton numero',
    'donne ton numéro', 'passe ton num', 'passe ton numero', 'passe ton numéro',
    'mon 06', 'ton 06', 'mon 07', 'ton 07', 'appeler', 'appelle-moi', 'appelle moi',
    'call me', 'contactez-moi', 'contacte moi'
  ];

  if (phoneKeywords.some(kw => normalized.includes(kw))) {
    return true;
  }
  const digitsOnly = text.replace(/[^0-9]/g, '');
  if (digitsOnly.length >= 8) {
    return true;
  }
  const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/;
  return phoneRegex.test(text);
}

export const ChatSocialModal: React.FC<ChatSocialModalProps> = ({
  isOpen,
  onClose,
  userFriendCode,
  userName = 'Champion',
  userAvatar = '👑',
  userFlag = '🇸🇳',
  friends,
  lastOpponent,
  incomingFriendRequests,
  sentFriendRequests: propSentFriendRequests,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onCancelSentFriendRequest,
  onAddFriend,
  onChallengeFriend,
  onStartFriendDuel,
  onUnreadMessagesCountChange,
  onActiveChatOpenChange,
  onShowToast,
}) => {
  const { t, language } = useTranslation();

  // 1. Amis | 2. Discussions | 3. Dernière lecture
  const [mainTab, setMainTab] = useState<'amis' | 'discussions' | 'derniere_lecture'>('amis');
  // Rubriques strictes de l'onglet Amis : Amis confirmés | Demandes reçues & envoyées | Utilisateurs bloqués (aucun bouton Inviter)
  const [friendsSubTab, setFriendsSubTab] = useState<'amis' | 'demandes' | 'bloque'>('amis');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Gestion de l'historique "Dernier Adversaire" : Le dernier adversaire affronté est impérativement tout en haut
  const [recentOpponents, setRecentOpponents] = useState<LastOpponent[]>(() => {
    try {
      const saved = localStorage.getItem('d12_recent_opponents_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    if (lastOpponent) return [lastOpponent];
    return [
      {
        id: 'opp_last',
        name: 'Ousmane Diallo',
        avatar: '🦅',
        flag: '🇸🇳',
        country: t('country_SN', 'Sénégal'),
        mode: t('online', 'En ligne'),
        date: t('todayTimeFallback', 'Aujourd’hui, 14:15'),
        result: 'win',
        userScore: 12,
        opponentScore: 8,
        isBot: false,
        friendCode: 'PION-4821',
      },
    ];
  });

  // Ordre d'affichage dynamique : le tout dernier adversaire affronté bascule immédiatement tout en haut de la liste
  useEffect(() => {
    if (lastOpponent) {
      setRecentOpponents(prev => {
        const remaining = prev.filter(
          o => o.name.toLowerCase() !== lastOpponent.name.toLowerCase() && o.id !== lastOpponent.id
        );
        const nextList = [lastOpponent, ...remaining].slice(0, 20);
        try {
          localStorage.setItem('d12_recent_opponents_v3', JSON.stringify(nextList));
        } catch {}
        return nextList;
      });
    }
  }, [lastOpponent]);

  // Active chat friend (Strictement réservé aux amis réels)
  const [activeChatFriend, setActiveChatFriend] = useState<FriendItem | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessageItem[]>>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [chatInputText, setChatInputText] = useState('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(UNREAD_COUNTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [lastMessageTs, setLastMessageTs] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(LAST_CHAT_TS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch {}
  }, [chatMessages]);

  useEffect(() => {
    try {
      localStorage.setItem(UNREAD_COUNTS_STORAGE_KEY, JSON.stringify(unreadCounts));
    } catch {}
    const total = (Object.values(unreadCounts) as number[]).reduce((sum, n) => sum + (Number(n) || 0), 0);
    onUnreadMessagesCountChange?.(total);
  }, [unreadCounts, onUnreadMessagesCountChange]);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_CHAT_TS_STORAGE_KEY, JSON.stringify(lastMessageTs));
    } catch {}
  }, [lastMessageTs]);

  const [contextMenuMsg, setContextMenuMsg] = useState<{
    id: string;
    text: string;
    sender: 'me' | 'them';
  } | null>(null);
  const [copiedToastVisible, setCopiedToastVisible] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartPosRef.current = null;
  };

  useEffect(() => {
    setContextMenuMsg(null);
    clearLongPressTimer();
  }, [activeChatFriend?.id, isOpen, mainTab]);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopyMessageText = async (text: string) => {
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {}

    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {}
    }

    setContextMenuMsg(null);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopiedToastVisible(true);
    copiedTimerRef.current = setTimeout(() => {
      setCopiedToastVisible(false);
    }, 2000);
  };

  // Challenges en direct avec présence
  const [outgoingChallenge, setOutgoingChallenge] = useState<OutgoingChallenge | null>(null);
  const [incomingChallenges, setIncomingChallenges] = useState<IncomingChallenge[]>([]);

  // Demandes d'amitié envoyées en attente (fallback local si prop non fournie)
  const [localSentFriendRequests, setLocalSentFriendRequests] = useState<SentFriendRequestItem[]>(() => {
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
  const sentFriendRequests = propSentFriendRequests ?? localSentFriendRequests;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll dynamique et fluide pour le flux de chat
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  useEffect(() => {
    if (activeChatFriend) {
      scrollToBottom('auto');
    }
  }, [activeChatFriend?.id]);

  useEffect(() => {
    if (activeChatFriend) {
      scrollToBottom('smooth');
    }
  }, [chatMessages, isTyping, outgoingChallenge, incomingChallenges]);

  // Social states (synchronisés avec App.tsx en priorité)
  const [localRequests, setLocalRequests] = useState<FriendRequestItem[]>(() => {
    try {
      const s = localStorage.getItem('d12_incoming_requests_v3');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_REQUESTS;
  });
  const requests = incomingFriendRequests ?? localRequests;
  const [blocked, setBlocked] = useState<FriendRequestItem[]>(INITIAL_BLOCKED);
  const [facebookClaimed, setFacebookClaimed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // ─── 4. GESTION STRICTE DE LA PRÉSENCE DANS LA RUBRIQUE DE CHAT ───
  // L'émetteur du défi doit impérativement rester dans le chat pour maintenir l'invitation active.
  useEffect(() => {
    if (isOpen && activeChatFriend) {
      socket.emit('enter_friend_chat', {
        friendId: activeChatFriend.id,
        friendCode: activeChatFriend.friendCode,
      });
    }

    return () => {
      if (activeChatFriend) {
        socket.emit('leave_friend_chat', {
          friendId: activeChatFriend.id,
        });
      }
    };
  }, [isOpen, activeChatFriend?.id]);

  // Si l'émetteur quitte la conversation ou ferme le modal, le défi s'annule instantanément
  useEffect(() => {
    return () => {
      if (outgoingChallenge) {
        socket.emit('cancel_friend_challenge', { challengeId: outgoingChallenge.id });
      }
    };
  }, [outgoingChallenge]);

  // Refs pour éviter toute closure périmée dans les écouteurs WebSocket
  const friendsRef = useRef(friends);
  friendsRef.current = friends;
  const activeChatFriendRef = useRef(activeChatFriend);
  activeChatFriendRef.current = activeChatFriend;
  const mainTabRef = useRef(mainTab);
  mainTabRef.current = mainTab;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onStartFriendDuelRef = useRef(onStartFriendDuel);
  onStartFriendDuelRef.current = onStartFriendDuel;
  const onShowToastRef = useRef(onShowToast);
  onShowToastRef.current = onShowToast;
  const tRef = useRef(t);
  tRef.current = t;

  const seenMsgIdsRef = useRef<Set<string>>(
    new Set(
      (Object.values(chatMessages) as ChatMessageItem[][])
        .flat()
        .map(m => m.id)
    )
  );

  const outgoingChallengeRef = useRef(outgoingChallenge);
  outgoingChallengeRef.current = outgoingChallenge;

  // Informer App.tsx lorsqu'une conversation 1-à-1 est ouverte (pour le bouton Retour physique)
  useEffect(() => {
    onActiveChatOpenChange?.(Boolean(isOpen && mainTab === 'discussions' && activeChatFriend));
  }, [isOpen, mainTab, activeChatFriend, onActiveChatOpenChange]);

  // Intercepter le bouton Retour physique de l'appareil pour revenir à la liste des discussions
  useEffect(() => {
    const handleDeviceBack = () => {
      if (outgoingChallengeRef.current) {
        socket.emit('cancel_friend_challenge', { challengeId: outgoingChallengeRef.current.id });
        setOutgoingChallenge(null);
      }
      setActiveChatFriend(null);
      setMainTab('discussions');
    };
    window.addEventListener('chat_modal_device_back', handleDeviceBack);
    return () => window.removeEventListener('chat_modal_device_back', handleDeviceBack);
  }, []);

  // Remettre à zéro le compteur de messages non lus dès que la conversation de cet ami est affichée
  useEffect(() => {
    if (isOpen && mainTab === 'discussions' && activeChatFriend) {
      setUnreadCounts(prev => {
        if (!prev[activeChatFriend.id]) return prev;
        const next = { ...prev };
        delete next[activeChatFriend.id];
        return next;
      });
    }
  }, [isOpen, mainTab, activeChatFriend]);

  // ─── ÉCOUTEURS WEBSOCKET TEMPS RÉEL (DÉFIS, CHAT, AMIS) ───
  useEffect(() => {
    const resolveCanonicalFriendId = (data: any): string | null => {
      const list = friendsRef.current || [];
      const fromId = data?.fromFriendId ? String(data.fromFriendId) : '';
      const fromCode = data?.fromFriendCode ? String(data.fromFriendCode).toUpperCase() : '';
      const fromName = data?.fromName ? String(data.fromName).toLowerCase() : '';

      const matched = list.find(
        f =>
          (fromId && f.id === fromId) ||
          (fromCode && f.friendCode && f.friendCode.toUpperCase() === fromCode) ||
          (fromId && f.friendCode && f.friendCode.toUpperCase() === fromId.toUpperCase()) ||
          (fromName && f.name.toLowerCase() === fromName)
      );
      if (matched) return matched.id;
      return fromId || fromCode || activeChatFriendRef.current?.id || null;
    };

    const appendIncomingMessage = (data: any) => {
      if (!data?.text) return;
      const friendId = resolveCanonicalFriendId(data);
      if (!friendId) return;

      const msgId = data.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      if (seenMsgIdsRef.current.has(msgId)) return;
      seenMsgIdsRef.current.add(msgId);

      const newMsg: ChatMessageItem = {
        id: msgId,
        sender: 'them',
        text: String(data.text),
        time: data.time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        lang: data.fromLang,
      };

      setChatMessages(prev => {
        const existing = prev[friendId] || [];
        if (existing.some(m => m.id === msgId)) return prev;
        return {
          ...prev,
          [friendId]: [...existing, newMsg],
        };
      });

      setLastMessageTs(prev => ({
        ...prev,
        [friendId]: Date.now(),
      }));

      const isCurrentlyViewingThisChat =
        isOpenRef.current &&
        mainTabRef.current === 'discussions' &&
        activeChatFriendRef.current?.id === friendId;

      if (!isCurrentlyViewingThisChat) {
        setUnreadCounts(prev => ({
          ...prev,
          [friendId]: (prev[friendId] || 0) + 1,
        }));
      }
    };

    const onIncomingChallenge = (data: any) => {
      if (!data?.challengeId) return;
      const newChal: IncomingChallenge = {
        id: data.challengeId,
        roomId: data.roomId,
        sender: data.sender,
        targetFriendId: data.targetFriendId,
      };
      setIncomingChallenges(prev => {
        const filtered = prev.filter(c => c.id !== newChal.id);
        return [...filtered, newChal];
      });
      onShowToastRef.current(
        tRef.current('toastIncomingLiveChallenge', '⚔️ {name} vous défie en direct ! Ouvrez la discussion pour répondre.')
          .replace('{name}', data.sender?.name || tRef.current('aFriendLabel', 'Un ami'))
      );
    };

    const onChallengeCancelled = (data: any) => {
      if (data?.challengeId) {
        setIncomingChallenges(prev => prev.filter(c => c.id !== data.challengeId));
      }
      onShowToastRef.current(
        data?.message || tRef.current('toastFriendLeftChatChallenge', "Votre ami a quitté la discussion. Le défi n'est plus actif.")
      );
    };

    const onChallengeDeclined = (data: any) => {
      setOutgoingChallenge(null);
      onShowToastRef.current(
        data?.message || tRef.current('toastFriendDeclinedChallenge', 'Votre ami a gentiment décliné le défi pour le moment.')
      );
    };

    const onChallengeExpired = (data: any) => {
      setIncomingChallenges([]);
      onShowToastRef.current(
        data?.message || tRef.current('toastOpponentLeftChatChallenge', 'Votre adversaire a quitté la discussion. Le défi est annulé.')
      );
    };

    const onDuelStart = (data: any) => {
      setOutgoingChallenge(null);
      setIncomingChallenges([]);
      onShowToastRef.current(
        data?.message || tRef.current('toastDuelValidated', '⚔️ Défi validé ! Les deux joueurs sont connectés.')
      );
      onCloseRef.current();
      if (onStartFriendDuelRef.current) {
        onStartFriendDuelRef.current(data.roomId, data.role || 'host', data.opponent);
      }
    };

    const onIncomingMessage = (data: any) => {
      appendIncomingMessage(data);
    };

    const onPendingMessages = (data: any) => {
      if (!Array.isArray(data?.messages)) return;
      data.messages.forEach((m: any) => appendIncomingMessage(m));
    };

    socket.on('INCOMING_FRIEND_CHALLENGE', onIncomingChallenge);
    socket.on('FRIEND_CHALLENGE_CANCELLED', onChallengeCancelled);
    socket.on('FRIEND_CHALLENGE_DECLINED', onChallengeDeclined);
    socket.on('CHALLENGE_EXPIRED', onChallengeExpired);
    socket.on('FRIEND_DUEL_START', onDuelStart);
    socket.on('INCOMING_FRIEND_MESSAGE', onIncomingMessage);
    socket.on('PENDING_FRIEND_MESSAGES', onPendingMessages);

    return () => {
      socket.off('INCOMING_FRIEND_CHALLENGE', onIncomingChallenge);
      socket.off('FRIEND_CHALLENGE_CANCELLED', onChallengeCancelled);
      socket.off('FRIEND_CHALLENGE_DECLINED', onChallengeDeclined);
      socket.off('CHALLENGE_EXPIRED', onChallengeExpired);
      socket.off('FRIEND_DUEL_START', onDuelStart);
      socket.off('INCOMING_FRIEND_MESSAGE', onIncomingMessage);
      socket.off('PENDING_FRIEND_MESSAGES', onPendingMessages);
    };
  }, []);

  if (!isOpen) return null;

  // Filtrage des amis confirmés
  const filteredFriends = friends.filter(
    f =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.friendCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(userFriendCode);
    setCopiedCode(true);
    onShowToast(t('toastFriendCodeCopied', 'Votre code ami a été copié avec succès !'));
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ─── 1. ENVOI FLUIDE ET NATUREL DES MESSAGES (100% JOUEURS RÉELS) ───
  const handleSendMessage = () => {
    if (!chatInputText.trim() || !activeChatFriend) return;

    // Règle 2 : Vérification absolue que l'interlocuteur est bien dans la liste d'amis
    const isFriend = friends.some(f => f.id === activeChatFriend.id || f.friendCode === activeChatFriend.friendCode);
    if (!isFriend) {
      onShowToast(t('toastFriendsOnlyMessage', "Pour échanger des messages, vous devez d'abord être amis. Envoyez une demande d'amitié !"));
      return;
    }

    const textToSend = chatInputText.trim();
    if (containsOrRequestsPhoneNumber(textToSend)) {
      onShowToast(t('toastPhoneForbidden', "⚠️ Règle de sécurité : L'échange de numéros de téléphone et coordonnées personnelles est interdit."));
    }

    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessageItem = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'me',
      text: textToSend,
      time: timeStr,
      lang: language,
    };

    const friendId = activeChatFriend.id;

    setChatMessages(prev => ({
      ...prev,
      [friendId]: [...(prev[friendId] || []), newMsg],
    }));
    setLastMessageTs(prev => ({
      ...prev,
      [friendId]: Date.now(),
    }));
    setChatInputText('');

    // Transmission en temps réel via le WebSocket aux joueurs réels connectés
    socket.emit('send_friend_message', {
      toFriendId: friendId,
      toFriendCode: activeChatFriend.friendCode,
      toFriendName: activeChatFriend.name,
      fromFriendId: userFriendCode,
      fromFriendCode: userFriendCode,
      fromName: userName,
      fromAvatar: userAvatar,
      fromLang: language,
      text: textToSend,
      time: timeStr,
      id: newMsg.id,
    });
  };

  // ─── 4. SYSTÈME DE DÉFI DIRECT ENTRE AMIS AVEC RÈGLE DE PRÉSENCE ───
  const handleLaunchChallenge = () => {
    if (!activeChatFriend) return;

    // Règle absolue : Défier un ami est strictement réservé aux amis acceptés
    const isFriend = friends.some(f => f.id === activeChatFriend.id || f.friendCode === activeChatFriend.friendCode);
    if (!isFriend) {
      onShowToast(t('toastFriendsOnlyChallenge', "La possibilité de défier un ami est strictement réservée aux utilisateurs de votre liste d'amis."));
      return;
    }

    const challengeId = 'chal_' + Date.now();
    setOutgoingChallenge({
      id: challengeId,
      friendId: activeChatFriend.id,
      friendName: activeChatFriend.name,
    });

    socket.emit('send_friend_challenge', {
      targetFriendId: activeChatFriend.id,
      targetFriendCode: activeChatFriend.friendCode,
      targetFriendName: activeChatFriend.name,
      sender: {
        id: userFriendCode,
        playerId: userFriendCode,
        name: userName,
        avatar: userAvatar,
        flag: userFlag,
        friendCode: userFriendCode,
      },
    });

    onShowToast(`⚔️ ${t('challengeSentTo', 'Défi lancé à')} ${activeChatFriend.name} ! ${t('stayInDiscussionNote', 'Restez dans la discussion.')}`);
  };

  const handleCancelOutgoingChallenge = () => {
    if (!outgoingChallenge) return;
    socket.emit('cancel_friend_challenge', { challengeId: outgoingChallenge.id });
    setOutgoingChallenge(null);
    onShowToast(t('challengeCancelledToast', 'Défi annulé.'));
  };

  const handleAcceptIncomingChallenge = (challengeId: string) => {
    socket.emit('accept_friend_challenge', { challengeId });
  };

  const handleDeclineIncomingChallenge = (challengeId: string) => {
    socket.emit('decline_friend_challenge', { challengeId });
    setIncomingChallenges(prev => prev.filter(c => c.id !== challengeId));
    onShowToast(t('challengeDeclinedToast', 'Défi décliné.'));
  };

  // ─── 3. ENVOI DE DEMANDE D'AMITIÉ FLUIDE ET IMMERSIF ───
  const handleSendFriendRequest = (target: {
    id?: string;
    name: string;
    avatar?: string;
    flag?: string;
    country?: string;
    isBot?: boolean;
    friendCode?: string;
  }) => {
    if (onSendFriendRequest) {
      onSendFriendRequest(target);
      return;
    }
    const isBot = Boolean(target.isBot || isVirtualProfileOrBot(target.name || target.id, target.isBot));
    const newItem: SentFriendRequestItem = {
      id: target.id || target.friendCode || target.name,
      name: target.name,
      avatar: target.avatar || '👑',
      flag: target.flag || '🌍',
      country: target.country || '',
      date: 'today',
      isBot,
      friendCode: target.friendCode,
    };

    setLocalSentFriendRequests(prev => {
      if (prev.some(p => p.name.toLowerCase() === target.name.toLowerCase())) return prev;
      const next = [...prev, newItem];
      try {
        localStorage.setItem('d12_sent_friend_requests_v3', JSON.stringify(next));
      } catch {}
      return next;
    });

    onShowToast(`${t('friendRequestSent', "Demande d'amitié envoyée ✓")} : ${target.name}`);
    socket.emit('send_friend_request', {
      targetName: target.name,
      targetId: target.id,
      targetCode: target.friendCode,
      isBot,
      senderCode: userFriendCode,
      senderId: userFriendCode,
      senderName: userName,
      senderAvatar: userAvatar,
      senderFlag: userFlag,
    });
  };

  const handleCancelSentRequest = (targetName: string, targetId?: string, targetCode?: string) => {
    if (onCancelSentFriendRequest) {
      onCancelSentFriendRequest(targetName, targetId, targetCode);
      return;
    }
    setLocalSentFriendRequests(prev => {
      const next = prev.filter(p => p.name.toLowerCase() !== targetName.toLowerCase());
      try {
        localStorage.setItem('d12_sent_friend_requests_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
    socket.emit('cancel_friend_request', {
      targetName,
      targetId,
      targetCode,
      senderCode: userFriendCode,
    });
    onShowToast(t('inviteCancelled', "Invitation annulée."));
  };

  const handleAcceptRequest = (req: FriendRequestItem) => {
    if (onAcceptFriendRequest) {
      onAcceptFriendRequest(req);
      return;
    }
    setLocalRequests(prev => {
      const next = prev.filter(r => r.id !== req.id);
      try {
        localStorage.setItem('d12_incoming_requests_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
    onAddFriend({
      id: req.friendCode || req.senderPlayerId || req.id,
      name: req.name,
      avatar: req.avatar,
      level: req.level,
      friendCode: req.friendCode || req.senderPlayerId || req.id,
      status: 'online',
      subscribed: true,
    });
    socket.emit('accept_friend_request', {
      requestId: req.id,
      senderName: req.name,
      senderCode: req.friendCode,
      senderId: req.senderPlayerId,
      senderAvatar: req.avatar,
      senderFlag: req.flag,
      senderLevel: req.level,
      acceptorCode: userFriendCode,
      acceptorId: userFriendCode,
      acceptorName: userName,
      acceptorAvatar: userAvatar,
      acceptorFlag: userFlag,
    });
    onShowToast(
      (t('friendRequestAcceptedToast', "Vous avez accepté l'invitation de {name} ! Vous êtes maintenant amis.") || '')
        .replace('{name}', req.name)
    );
  };

  const handleDeclineRequest = (reqId: string) => {
    if (onDeclineFriendRequest) {
      onDeclineFriendRequest(reqId);
      return;
    }
    setLocalRequests(prev => {
      const next = prev.filter(r => r.id !== reqId);
      try {
        localStorage.setItem('d12_incoming_requests_v3', JSON.stringify(next));
      } catch {}
      return next;
    });
    onShowToast(t('friendRequestRefusedToast', 'Demande d’amitié refusée.'));
  };

  const handleUnblock = (blkId: string) => {
    setBlocked(prev => prev.filter(b => b.id !== blkId));
    onShowToast(t('playerUnblockedToast', 'Joueur débloqué.'));
  };

  const openConversationWith = (friend: FriendItem) => {
    // Vérification stricte : Seuls les amis confirmés peuvent ouvrir un chat
    const isFriend = friends.some(f => f.id === friend.id || f.friendCode === friend.friendCode);
    if (!isFriend) {
      onShowToast(t('chatFriendsOnlyToast', "Pour échanger avec ce joueur, vous devez d'abord faire partie de vos amis respectifs."));
      return;
    }

    setIsTyping(false);
    setUnreadCounts(prev => {
      if (!prev[friend.id]) return prev;
      const next = { ...prev };
      delete next[friend.id];
      return next;
    });
    setActiveChatFriend(friend);
    setMainTab('discussions');
  };

  // Dernier adversaire
  const displayLastOpponent: LastOpponent = lastOpponent || {
    id: 'opp_last',
    name: 'Ousmane Diallo',
    avatar: '🦅',
    flag: '🇸🇳',
    country: t('country_SN', 'Sénégal'),
    mode: t('online', 'En ligne'),
    date: t('todayTimeFallback', 'Aujourd’hui, 14:15'),
    result: 'win',
    userScore: 12,
    opponentScore: 8,
    isBot: false,
    friendCode: 'PION-4821',
  };

  // Vérifier si le dernier adversaire est déjà un ami accepté
  const isOpponentFriend = friends.some(
    f =>
      f.id === displayLastOpponent.id ||
      f.name.toLowerCase() === displayLastOpponent.name.toLowerCase() ||
      (displayLastOpponent.friendCode && f.friendCode === displayLastOpponent.friendCode)
  );

  const isOpponentRequestPending = sentFriendRequests.some(
    p => p.name.toLowerCase() === displayLastOpponent.name.toLowerCase()
  );

  const getOpponentCountryName = (cName: string) => {
    if (!cName) return '';
    const lower = cName.toLowerCase();
    if (lower.includes('sénégal') || lower.includes('senegal')) return t('country_SN', 'Sénégal');
    if (lower.includes('côte') || lower.includes('ivoire') || lower.includes('ivory')) return t('country_CI', 'Côte d’Ivoire');
    if (lower.includes('mali')) return t('country_ML', 'Mali');
    if (lower.includes('mauritanie') || lower.includes('mauritania')) return t('country_MR', 'Mauritanie');
    if (lower.includes('chine') || lower.includes('china')) return t('country_CN', 'Chine');
    if (lower.includes('japon') || lower.includes('japan')) return t('country_JP', 'Japon');
    if (lower.includes('france')) return t('country_FR', 'France');
    return t(`country_${cName}`, cName);
  };

  // Vérifier si un défi entrant concerne l'ami actif
  const currentIncomingChallenge = activeChatFriend
    ? incomingChallenges.find(c => c.sender.name.toLowerCase() === activeChatFriend.name.toLowerCase())
    : null;

  const totalUnreadMessages = friends.reduce((sum, f) => sum + (unreadCounts[f.id] || 0), 0);
  const isInsideFullChat = Boolean(activeChatFriend && mainTab === 'discussions');

  const sortedFriendsForDiscussions = [...friends].sort((a, b) => {
    const aChal = incomingChallenges.some(c => c.sender.name.toLowerCase() === a.name.toLowerCase()) ? 1 : 0;
    const bChal = incomingChallenges.some(c => c.sender.name.toLowerCase() === b.name.toLowerCase()) ? 1 : 0;
    if (aChal !== bChal) return bChal - aChal;
    const aUnread = unreadCounts[a.id] || 0;
    const bUnread = unreadCounts[b.id] || 0;
    if (aUnread !== bUnread) return bUnread - aUnread;
    const aTs = lastMessageTs[a.id] || 0;
    const bTs = lastMessageTs[b.id] || 0;
    return bTs - aTs;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-stretch justify-center p-0 sm:p-2 animate-fade-in select-none">
      <div className="w-full sm:max-w-xl h-[100dvh] sm:h-[96dvh] max-h-[100dvh] bg-[#041a12] border-0 sm:border-2 sm:border-amber-500/40 rounded-none sm:rounded-3xl shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        
        {/* ─── EN-TÊTE PRINCIPAL (MASQUÉ EN MODE CHAT PLEIN ÉCRAN POUR MAXIMISER LA HAUTEUR) ─── */}
        {!isInsideFullChat && (
          <>
            <div className="p-3.5 bg-gradient-to-r from-[#02130d] via-[#06291d] to-[#02130d] border-b border-amber-500/25 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                    {t('chatAndCommunity', 'Chat & Communauté')}
                  </h2>
                  <span className="text-[10px] text-gray-400">
                    {t('friendCodeLabel', 'Mon Code Ami')} : <strong className="text-amber-300 font-mono">{userFriendCode}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  title={t('copyId', 'Copier ID')}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px] hidden sm:inline">{t('copyId', 'Copier ID')}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-[#082e20] hover:bg-[#0c422f] border border-amber-500/30 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── 3 ONGLETS PRINCIPAUX : 1. AMIS | 2. DISCUSSIONS | 3. DERNIÈRE LECTURE ─── */}
            <div className="grid grid-cols-3 bg-[#02110b] border-b border-amber-500/20 text-xs font-black shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMainTab('amis');
                  setActiveChatFriend(null);
                }}
                className={`py-2.5 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mainTab === 'amis'
                    ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400 shadow-inner'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('friendsTab', 'Amis')}</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 rounded-full font-mono">
                  {friends.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMainTab('discussions')}
                className={`py-2.5 flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  mainTab === 'discussions'
                    ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400 shadow-inner'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('chatsTab', 'Discussions')}</span>
                {incomingChallenges.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute top-2 right-3" />
                )}
                {totalUnreadMessages > 0 ? (
                  <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.75)]">
                    {totalUnreadMessages}
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-400/90 text-slate-950 px-1.5 rounded-full font-mono font-bold">
                    {friends.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMainTab('derniere_lecture');
                  setActiveChatFriend(null);
                }}
                className={`py-2.5 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mainTab === 'derniere_lecture'
                    ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400 shadow-inner'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('lastOpponentTab', 'Dernière lecture')}</span>
              </button>
            </div>
          </>
        )}

        {/* ─── ONGLET 1: AMIS (RECHERCHE, LISTE D'AMIS, INVITATIONS, DEMANDES, BLOQUÉS) ─── */}
        {mainTab === 'amis' && (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {/* Barre de recherche d'amis */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('searchFriends', 'Rechercher un ami par nom ou code...')}
                className="w-full bg-[#02130c] border border-amber-500/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 3 Sous-onglets stricts : Amis | Demandes | Bloqués (Le bouton Inviter / Facebook est définitivement supprimé) */}
            <div className="flex items-center gap-1.5 bg-[#02110c] p-1 rounded-xl border border-amber-500/20 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFriendsSubTab('amis')}
                className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  friendsSubTab === 'amis'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>{t('friendsTab', 'Amis')}</span>
                <span className="text-[9px] opacity-80 font-mono">({filteredFriends.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFriendsSubTab('demandes')}
                className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer relative ${
                  friendsSubTab === 'demandes'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>{t('requestsTab', 'Demandes')}</span>
                <span className="text-[9px] opacity-80 font-mono">({requests.length + sentFriendRequests.length})</span>
                {requests.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold animate-pulse">
                    {requests.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFriendsSubTab('bloque')}
                className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  friendsSubTab === 'bloque'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>{t('blockedTab', 'Bloqués')}</span>
                <span className="text-[9px] opacity-80 font-mono">({blocked.length})</span>
              </button>
            </div>

            {/* Rubrique 1 : Amis confirmés */}
            {friendsSubTab === 'amis' && (
              <div className="flex flex-col gap-2">
                {filteredFriends.length === 0 ? (
                  <div className="text-center py-8 bg-[#02130d] rounded-2xl border border-dashed border-amber-500/20 p-4">
                    <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-300 font-bold">{t('noFriendsFound', 'Aucun ami trouvé')}</p>
                    <p className="text-[10px] text-gray-500 mt-1 max-w-xs mx-auto">
                      {t('shareCodeToConnect', 'Partagez votre code ami pour inviter des passionnés et débloquer les discussions et défis !')}
                    </p>
                  </div>
                ) : (
                  filteredFriends.map(friend => (
                    <div
                      key={friend.id}
                      className="p-2.5 bg-[#06241a] hover:bg-[#082e22] border border-amber-500/20 rounded-2xl flex items-center justify-between transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#f0d472] to-[#b38600] p-0.5 shadow">
                            <div className="w-full h-full rounded-full bg-[#041a12] flex items-center justify-center text-lg">
                              {friend.avatar}
                            </div>
                          </div>
                          <div
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#041a12] ${
                              friend.status === 'online'
                                ? 'bg-emerald-400 animate-pulse'
                                : friend.status === 'playing'
                                ? 'bg-amber-400'
                                : 'bg-gray-500'
                            }`}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-amber-200">{friend.name}</span>
                            <span className="text-[9px] bg-amber-400/15 text-amber-300 px-1 rounded font-bold">
                              {t('levelLabel', 'Niv.')} {friend.level}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            {friend.status === 'online'
                              ? `🟢 ${t('onlineNow', 'En ligne')}`
                              : friend.status === 'playing'
                              ? `⚔️ ${t('inGameStatus', 'En partie')}`
                              : `⚪ ${t('offlineStatus', 'Hors ligne')}`}
                            <span>· {t('codeLabel', 'Code')} : {friend.friendCode}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openConversationWith(friend)}
                          className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 transition-colors cursor-pointer"
                          title={t('chat', 'Discuter')}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openConversationWith(friend)}
                          className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow transition-transform active:scale-95 cursor-pointer"
                          title={t('challengeBtn', 'Défier')}
                        >
                          <Swords className="w-3.5 h-3.5" />
                          <span>{t('challengeBtn', 'Défier')}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Rubrique 2 : Demandes d'amitié (Reçues & Envoyées en attente) */}
            {friendsSubTab === 'demandes' && (
              <div className="flex flex-col gap-3">
                {/* A. Demandes d'amitié reçues (avec boutons Accepter / Refuser) */}
                {requests.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 bg-gradient-to-r from-emerald-950/50 via-[#06291e] to-emerald-950/40 border border-emerald-500/40 rounded-2xl shadow-sm animate-fade-in">
                    <span className="text-[11px] font-black text-emerald-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('friendRequestsReceived', 'Demandes d’amitié reçues')}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        {requests.length}
                      </span>
                    </span>

                    <div className="flex flex-col gap-2 mt-0.5">
                      {requests.map(req => (
                        <div
                          key={req.id}
                          className="p-2.5 bg-[#041a12] border border-emerald-500/30 rounded-xl flex items-center justify-between shadow-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-base">
                              {req.avatar}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1">
                                <span>{req.flag}</span>
                                <span>{req.name}</span>
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {t('levelLabel', 'Niveau')} {req.level} · {req.time}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAcceptRequest(req)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            >
                              <Check className="w-3 h-3" />
                              <span>{t('acceptBtn', 'Accepter')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeclineRequest(req.id)}
                              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 cursor-pointer transition-all active:scale-95"
                              title={t('declineBtn', 'Refuser')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* B. Demandes envoyées en attente (En cours) */}
                {sentFriendRequests.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 bg-[#031c13] border border-amber-500/25 rounded-2xl shadow-sm animate-fade-in">
                    <span className="text-[11px] font-black text-amber-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>⏳</span>
                        <span>{t('pendingSentRequestsSection', 'Demandes envoyées (En cours)')}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                        {sentFriendRequests.length}
                      </span>
                    </span>

                    <div className="flex flex-col gap-2 mt-0.5">
                      {sentFriendRequests.map(req => (
                        <div
                          key={req.id || req.name}
                          className="p-2.5 bg-[#052219] border border-amber-500/20 rounded-xl flex items-center justify-between shadow-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-base">
                              {req.avatar || '👑'}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1">
                                <span>{req.flag || '🌍'}</span>
                                <span>{req.name}</span>
                              </div>
                              <div className="text-[10px] text-amber-400/90 flex items-center gap-1.5 mt-0.5 font-medium">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>{t('pendingStatus', 'En attente...')}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCancelSentRequest(req.name, req.id, req.friendCode)}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-rose-900/40 text-gray-400 hover:text-rose-200 border border-white/10 hover:border-rose-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-95"
                            title={t('cancelInvite', 'Annuler')}
                          >
                            {t('cancelInvite', 'Annuler')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* État vide si aucune demande reçue ni envoyée */}
                {requests.length === 0 && sentFriendRequests.length === 0 && (
                  <div className="text-center py-10 bg-[#02130d] rounded-2xl border border-dashed border-amber-500/20 p-6 flex flex-col items-center gap-2">
                    <UserPlus className="w-8 h-8 text-gray-500 mx-auto" />
                    <h4 className="text-xs font-black text-gray-300 uppercase tracking-wide">
                      {t('noPendingRequests', 'Aucune demande en attente')}
                    </h4>
                    <p className="text-[10px] text-gray-500 max-w-xs mx-auto">
                      {t('noPendingRequestsDesc', 'Les invitations reçues ou envoyées s’afficheront ici.')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Rubrique 3 : Bloqués */}
            {friendsSubTab === 'bloque' && (
              <div className="flex flex-col gap-2">
                {blocked.length === 0 ? (
                  <div className="text-center py-8 bg-[#02130d] rounded-2xl border border-dashed border-amber-500/20 p-4">
                    <ShieldAlert className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-300 font-bold">{t('noBlockedPlayers', 'Aucun joueur bloqué')}</p>
                  </div>
                ) : (
                  blocked.map(blk => (
                    <div
                      key={blk.id}
                      className="p-2.5 bg-[#06241a] border border-rose-500/20 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-base">
                          {blk.avatar}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{blk.name}</div>
                          <div className="text-[10px] text-gray-400">{blk.time}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUnblock(blk.id)}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {t('unblockBtn', 'Débloquer')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── ONGLET 2: DISCUSSIONS (STRICTEMENT RÉSERVÉES AUX AMIS) ─── */}
        {mainTab === 'discussions' && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {activeChatFriend ? (
              /* Conversation active avec l'ami */
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {/* Barre supérieure du chat plein écran */}
                <div className="px-3 py-2.5 bg-gradient-to-r from-[#02130d] via-[#06291d] to-[#02130d] border-b border-amber-500/25 flex items-center justify-between gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (outgoingChallenge) {
                        handleCancelOutgoingChallenge();
                      }
                      setActiveChatFriend(null);
                    }}
                    className="min-h-[40px] px-2 flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer rounded-xl hover:bg-amber-500/10 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('back', 'Retour')}</span>
                  </button>

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{activeChatFriend.avatar}</span>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-black text-white block leading-tight truncate">{activeChatFriend.name}</span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="truncate">{t('confirmedFriend', 'Ami confirmé')}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* 4. BOUTON DÉFIER : STRICTEMENT RÉSERVÉ AUX AMIS */}
                    <button
                      type="button"
                      onClick={handleLaunchChallenge}
                      disabled={Boolean(outgoingChallenge)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer ${
                        outgoingChallenge
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 active:scale-95'
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>{t('challengeBtn', 'Défier')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (outgoingChallenge) {
                          handleCancelOutgoingChallenge();
                        }
                        setActiveChatFriend(null);
                        setMainTab('discussions');
                      }}
                      className="w-10 h-10 rounded-full bg-[#082e20] hover:bg-[#0c422f] border border-amber-500/30 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      aria-label={t('back', 'Retour')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ─── 4. CARTE DE DÉFI EN DIRECT (CLIGNOTANTE DANS LA RUBRIQUE DE CHAT) ─── */}
                {/* A. Défi émis par moi-même (en attente avec règle de présence) */}
                {outgoingChallenge && outgoingChallenge.friendId === activeChatFriend.id && (
                  <div className="mx-3 my-2 p-3 bg-gradient-to-r from-[#0a3828] via-[#06241b] to-[#041a12] border-2 border-amber-400/90 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(245,197,24,0.35)] animate-pulse shrink-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl animate-bounce">⚔️</span>
                      <div>
                        <div className="text-xs font-black text-amber-300 uppercase tracking-wide">
                          {t('challengeSentTo', 'Défi lancé à')} {activeChatFriend.name} !
                        </div>
                        <div className="text-[10px] text-gray-200">
                          {t('stayInDiscussionNote', "Restez dans cette discussion. Si vous quittez, l'invitation s'arrête instantanément.")}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelOutgoingChallenge}
                      className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      {t('cancel', 'Annuler')}
                    </button>
                  </div>
                )}

                {/* B. Défi reçu de l'ami (Clignotant dans son chat avec choix Rejoindre / Refuser) */}
                {currentIncomingChallenge && (
                  <div className="mx-3 my-2 p-3.5 bg-gradient-to-r from-[#0a3828] via-[#06241b] to-[#041a12] border-2 border-amber-400 rounded-2xl shadow-[0_0_25px_rgba(245,197,24,0.5)] animate-pulse flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl animate-bounce">⚔️</span>
                      <div className="flex-1">
                        <div className="text-xs font-black text-amber-300 uppercase tracking-wide">
                          {activeChatFriend.name} {t('playerChallengesLive', 'vous défie en direct !')}
                        </div>
                        <div className="text-[10px] text-gray-200">
                          {t('friendWaitingInChatNote', 'Votre ami est présent dans la discussion et vous attend pour un duel simultané.')}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => handleDeclineIncomingChallenge(currentIncomingChallenge.id)}
                        className="py-2 bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-200 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all"
                      >
                        {t('declineBtn', 'Refuser')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptIncomingChallenge(currentIncomingChallenge.id)}
                        className="py-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>{t('joinDuelBtn', 'Rejoindre le duel')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── 1. FLUX DU CHAT OUVERT, FLUIDE ET DYNAMIQUE (TEXTE BRUT D'ORIGINE + COPIE CONTEXTUELLE) ─── */}
                <div
                  className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-[#03150d] scroll-smooth min-h-0 relative"
                  onClick={() => {
                    if (contextMenuMsg) setContextMenuMsg(null);
                  }}
                >
                  <div className="text-center my-1">
                    <span className="text-[10px] text-gray-500 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                      {t('privateFriendlyDiscussionNote', 'Discussion privée et amicale entre passionnés de 12 PIONS')}
                    </span>
                  </div>

                  {(chatMessages[activeChatFriend.id] || []).map(msg => {
                    const isMe = msg.sender === 'me';
                    const isMenuOpen = contextMenuMsg?.id === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`relative flex flex-col max-w-[85%] animate-fade-in ${
                          isMe ? 'self-end items-end' : 'self-start items-start'
                        }`}
                      >
                        <div className={`flex items-center gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div
                            onPointerDown={e => {
                              if (e.button !== 0 && e.pointerType === 'mouse') return;
                              clearLongPressTimer();
                              longPressStartPosRef.current = { x: e.clientX, y: e.clientY };
                              longPressTimerRef.current = setTimeout(() => {
                                setContextMenuMsg({ id: msg.id, text: msg.text, sender: msg.sender });
                              }, 420);
                            }}
                            onPointerMove={e => {
                              if (!longPressStartPosRef.current) return;
                              const dx = Math.abs(e.clientX - longPressStartPosRef.current.x);
                              const dy = Math.abs(e.clientY - longPressStartPosRef.current.y);
                              if (dx > 10 || dy > 10) clearLongPressTimer();
                            }}
                            onPointerUp={clearLongPressTimer}
                            onPointerCancel={clearLongPressTimer}
                            onContextMenu={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenuMsg({ id: msg.id, text: msg.text, sender: msg.sender });
                            }}
                            className={`p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed transition-all select-text ${
                              isMe
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-tr-none shadow-md font-medium'
                                : 'bg-[#0a3525] border border-amber-500/30 text-white rounded-tl-none shadow font-medium'
                            } ${isMenuOpen ? 'ring-2 ring-amber-300/80' : ''}`}
                          >
                            <div className="break-words whitespace-pre-wrap">{msg.text}</div>
                          </div>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setContextMenuMsg(prev =>
                                prev?.id === msg.id
                                  ? null
                                  : { id: msg.id, text: msg.text, sender: msg.sender }
                              );
                            }}
                            aria-label={t('copyTextBtn', 'Copier le texte')}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {isMenuOpen && (
                          <div
                            onClick={e => e.stopPropagation()}
                            className={`mt-1 z-30 bg-[#031d13] border border-amber-400/50 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.75)] p-1 animate-fade-in ${
                              isMe ? 'self-end' : 'self-start'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleCopyMessageText(msg.text)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-200 hover:bg-amber-500/20 hover:text-white whitespace-nowrap transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-amber-400" />
                              <span>{t('copyTextBtn', 'Copier le texte')}</span>
                            </button>
                          </div>
                        )}

                        <span className="text-[10px] text-gray-500 mt-0.5 px-1">{msg.time}</span>
                      </div>
                    );
                  })}

                  {/* Indicateur de frappe naturel et vivant */}
                  {isTyping && (
                    <div className="self-start flex items-center gap-2 bg-[#0a3525] border border-amber-500/30 text-gray-300 px-3 py-2 rounded-2xl rounded-tl-none animate-fade-in shadow">
                      <span className="text-[11px] font-medium text-amber-200">
                        {activeChatFriend.name} {t('replyingStatus', 'vous répond...')}
                      </span>
                      <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  )}

                  {/* Infobulle discrète de confirmation de copie */}
                  {copiedToastVisible && (
                    <div className="sticky bottom-2 self-center z-40 pointer-events-none px-3.5 py-1.5 rounded-full bg-emerald-500/95 text-slate-950 text-[11px] font-black shadow-[0_6px_20px_rgba(16,185,129,0.45)] flex items-center gap-1.5 animate-fade-in">
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('messageCopiedToast', 'Texte copié dans le presse-papier ✓')}</span>
                    </div>
                  )}

                  {/* Ancre automatique en bas pour le scroll fluide */}
                  <div ref={messagesEndRef} className="h-0" />
                </div>

                {/* Phrases rapides chaleureuses (localisées dans la langue de l'interface utilisateur) */}
                <div className="p-2 bg-[#02110c] border-t border-amber-500/20 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
                  {QUICK_PHRASE_KEYS.map((item, idx) => {
                    const localizedPhrase = t(item.key, item.fallback);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setChatInputText(localizedPhrase)}
                        className="shrink-0 min-h-[34px] text-[11px] bg-[#06241a] hover:bg-[#093325] border border-amber-500/25 text-amber-300 px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer"
                      >
                        {localizedPhrase}
                      </button>
                    );
                  })}
                </div>

                {/* Barre de saisie plein écran ancrée en bas */}
                <div className="p-3 bg-[#02130d] border-t border-amber-500/25 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={e => setChatInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder={t('typeMessagePlaceholder', 'Écrivez un message amical...')}
                    className="flex-1 min-h-[44px] bg-[#041a12] border border-amber-500/35 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white outline-none focus:border-amber-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="w-11 h-11 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow hover:from-amber-300 hover:to-amber-400 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Liste des discussions (Strictement réservée aux amis confirmés) */
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {friends.length === 0 ? (
                  <div className="text-center py-12 bg-[#02130d] rounded-2xl border border-dashed border-amber-500/20 p-6 flex flex-col items-center gap-2">
                    <Lock className="w-8 h-8 text-amber-400/60" />
                    <h3 className="text-xs font-black text-amber-300 uppercase tracking-wide">
                      {t('discussionsFriendsOnlyTitle', 'Discussions réservées aux amis')}
                    </h3>
                    <p className="text-[11px] text-gray-400 max-w-xs leading-relaxed">
                      {t('discussionsFriendsOnlyDesc', 'Conformément aux règles du jeu, les discussions sont ouvertes entre amis confirmés. Ajoutez vos partenaires de jeu pour discuter et vous défier !')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setMainTab('amis')}
                      className="mt-2 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      {t('addFriend', 'Ajouter un ami')}
                    </button>
                  </div>
                ) : (
                  sortedFriendsForDiscussions.map(friend => {
                    const msgs = chatMessages[friend.id] || [];
                    const lastMsg = msgs[msgs.length - 1];
                    const unreadCount = unreadCounts[friend.id] || 0;
                    const hasIncoming = incomingChallenges.some(c => c.sender.name.toLowerCase() === friend.name.toLowerCase());

                    let previewText = t('startFriendlyChat', 'Démarrer une discussion amicale...');
                    if (hasIncoming) {
                      previewText = t('liveChallengeReceivedDesc', '⚔️ Vous a envoyé un défi en direct ! Cliquez pour répondre.');
                    } else if (lastMsg) {
                      previewText = lastMsg.sender === 'me' ? `${t('meBadge', 'MOI')}: ${lastMsg.text}` : lastMsg.text;
                    }

                    return (
                      <div
                        key={friend.id}
                        onClick={() => openConversationWith(friend)}
                        className={`p-3 border rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          hasIncoming
                            ? 'bg-[#0a3828] border-amber-400 shadow-[0_0_15px_rgba(245,197,24,0.4)] animate-pulse'
                            : unreadCount > 0
                            ? 'bg-[#083022] hover:bg-[#0b3c2b] border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                            : 'bg-[#06241a] hover:bg-[#082e22] border-amber-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-b from-[#f0d472] to-[#b38600] p-0.5 shadow">
                              <div className="w-full h-full rounded-full bg-[#041a12] flex items-center justify-center text-xl">
                                {friend.avatar}
                              </div>
                            </div>
                            <div
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#041a12] ${
                                friend.status === 'online'
                                  ? 'bg-emerald-400'
                                  : friend.status === 'playing'
                                  ? 'bg-amber-400'
                                  : 'bg-gray-500'
                              }`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs truncate ${unreadCount > 0 ? 'font-black text-white' : 'font-black text-amber-200'}`}>
                                {friend.name}
                              </span>
                              <span className={`text-[10px] font-mono shrink-0 ${unreadCount > 0 ? 'text-emerald-300 font-bold' : 'text-gray-500'}`}>
                                {lastMsg ? lastMsg.time : ''}
                              </span>
                            </div>
                            <p
                              className={`text-[11px] truncate mt-0.5 ${
                                hasIncoming
                                  ? 'text-amber-300 font-bold'
                                  : unreadCount > 0
                                  ? 'text-white font-semibold'
                                  : 'text-gray-400'
                              }`}
                            >
                              {previewText}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasIncoming && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider animate-bounce">
                              {t('challengeLabel', 'Défi !')}
                            </span>
                          )}
                          {unreadCount > 0 && (
                            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.75)]">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── ONGLET 3: DERNIÈRE LECTURE (DERNIER ADVERSAIRE RENCONTRÉ) ─── */}
        {mainTab === 'derniere_lecture' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <div className="text-center">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                {t('lastOpponentTitle', 'Dernier Adversaire Rencontré')}
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {t('lastOpponentDesc', 'Consultez le résultat du duel et ajoutez ce joueur directement en ami')}
              </p>
            </div>

            {/* Liste ordonnée des derniers adversaires (le tout dernier joué est toujours en tête de liste) */}
            <div className="flex flex-col gap-3.5">
              {recentOpponents.map((opp, oppIndex) => {
                const oppCode = opp.friendCode ? opp.friendCode.toUpperCase() : '';
                const isOpponentFriend = friends.some(
                  f =>
                    (oppCode && f.friendCode && f.friendCode.toUpperCase() === oppCode) ||
                    f.id === opp.id ||
                    (!oppCode && f.name.toLowerCase() === opp.name.toLowerCase())
                );
                const isOpponentRequestPending = sentFriendRequests.some(
                  p =>
                    (oppCode && p.friendCode && p.friendCode.toUpperCase() === oppCode) ||
                    (opp.id && p.id === opp.id) ||
                    (!oppCode && p.name.toLowerCase() === opp.name.toLowerCase())
                );
                const incomingFromOpp = requests.find(
                  r =>
                    (oppCode && r.friendCode && r.friendCode.toUpperCase() === oppCode) ||
                    (opp.id && (r.senderPlayerId === opp.id || r.id === opp.id)) ||
                    (!oppCode && r.name.toLowerCase() === opp.name.toLowerCase())
                );

                return (
                  <div
                    key={opp.id ? `${opp.id}-${oppIndex}` : `${opp.name}-${oppIndex}`}
                    className="bg-[#06241a] border-2 border-amber-500/30 rounded-3xl p-4 flex flex-col gap-3.5 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {opp.date && opp.date.includes('Aujourd')
                            ? `${t('today', 'Aujourd’hui')}${opp.date.slice(opp.date.indexOf(','))}`
                            : opp.date || t('today', 'Aujourd’hui')}
                        </span>
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          opp.result === 'win'
                            ? 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            : opp.result === 'draw'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {opp.result === 'win'
                          ? t('victory', 'Victoire')
                          : opp.result === 'draw'
                          ? t('draw', 'Match Nul')
                          : t('defeat', 'Défaite')}
                      </span>
                    </div>

                    {/* Infos adversaire */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#f0d472] via-[#d4af37] to-[#8a6800] p-0.5 shadow-lg shrink-0">
                        <div className="w-full h-full rounded-2xl bg-[#041a12] flex items-center justify-center text-3xl">
                          {opp.avatar || '🦅'}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-base">{opp.flag || '🌍'}</span>
                          <h3 className="text-sm font-black text-white truncate">{opp.name}</h3>
                        </div>
                        <div className="text-[11px] text-gray-300 mt-0.5">
                          {t('gameModeLabel', 'Mode')} : <strong className="text-amber-300">{opp.mode === 'En ligne' || opp.mode === 'online' ? t('online', 'En ligne') : opp.mode}</strong>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {t('countryBtn', 'Pays')} : {getOpponentCountryName(opp.country)}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">{t('capturedPieces', 'Pions Pris')}</span>
                        <span className="text-lg font-black text-amber-300 font-mono">
                          {opp.userScore ?? 12} - {opp.opponentScore ?? 8}
                        </span>
                      </div>
                    </div>

                    {/* ─── ACTION STANDARD : BOUTON '+' (AJOUTER UN AMI) & STATUT FIGÉ POUR LES BOTS ─── */}
                    <div className="pt-2 border-t border-amber-500/20">
                      {isOpponentFriend ? (
                        <div className="flex items-center justify-between gap-2 p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl">
                          <div className="flex items-center gap-2 px-2 text-xs font-bold text-emerald-300">
                            <UserCheck className="w-4 h-4 text-emerald-400" />
                            <span>{t('alreadyFriend', 'Déjà dans vos amis')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const fObj = friends.find(
                                f =>
                                  (oppCode && f.friendCode && f.friendCode.toUpperCase() === oppCode) ||
                                  f.id === opp.id ||
                                  (!oppCode && f.name.toLowerCase() === opp.name.toLowerCase())
                              );
                              if (fObj) {
                                openConversationWith(fObj);
                              }
                            }}
                            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{t('chat', 'Chat')}</span>
                          </button>
                        </div>
                      ) : incomingFromOpp ? (
                        <div className="w-full py-2 px-3 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-emerald-400" />
                            <span>{t('friendRequestsReceived', 'Demande reçue')}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(incomingFromOpp)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t('acceptBtn', 'Accepter')}</span>
                          </button>
                        </div>
                      ) : isOpponentRequestPending ? (
                        <div className="w-full py-2.5 px-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-300">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span>⏳ {t('pendingStatus', 'En attente...')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancelSentRequest(opp.name, opp.id, opp.friendCode)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-rose-900/40 text-gray-400 hover:text-rose-200 border border-white/10 rounded-lg text-[11px] cursor-pointer transition-all"
                          >
                            {t('cancelInvite', 'Annuler')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendFriendRequest(opp)}
                          className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_4px_16px_rgba(245,197,24,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <div className="w-5 h-5 rounded-full bg-slate-950/20 flex items-center justify-center font-black">
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                          <span>{t('addFriend', 'Ajouter un ami')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note informative chaleureuse */}
            <div className="bg-[#02130d] border border-amber-500/20 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-gray-300">
              <span className="text-xl">🤝</span>
              <p className="text-[11px] leading-relaxed">
                {t('communityFairPlayNote', 'Échangez dans le respect des règles et du fair-play pour garantir une communauté conviviale et passionnée.')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
