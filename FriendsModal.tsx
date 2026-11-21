import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  X,
  Swords,
  Search,
  Star,
  Sparkles,
  Share2,
  MessageCircle,
  Send,
  ArrowLeft,
  Smile,
  ShieldAlert,
} from 'lucide-react';
import { FriendItem } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { containsOrRequestsPhoneNumber } from './ChatSocialModal';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userFriendCode: string;
  friends: FriendItem[];
  onToggleSubscribe: (friendId: string) => void;
  onAddFriend: (codeOrName: string) => boolean;
  onChallengeFriend: (friend: FriendItem) => void;
  onShowToast: (msg: string) => void;
}

interface ChatMsg {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
}

const DEFAULT_FRIEND_CHATS: Record<string, ChatMsg[]> = {};

const QUICK_FRIEND_PHRASE_KEYS = [
  { key: 'chatQuickPhrase1', fallback: 'On se fait une belle partie ? ⚔️' },
  { key: 'chatQuickPhrase2', fallback: 'Rejoins mon salon pour un duel ! 🚪' },
  { key: 'chatQuickPhrase3', fallback: 'Chapeau pour ta belle victoire ! 🏆' },
  { key: 'chatQuickPhrase4', fallback: 'À tout de suite sur le plateau ! 👍' },
  { key: 'chatQuickPhrase5', fallback: 'Partant pour une revanche quand tu veux ! 🔥' },
];

const QUICK_FRIEND_EMOJIS = ['👋', '👑', '🔥', '⚔️', '👏', '🎯', '😂', '💪'];

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  userFriendCode,
  friends,
  onToggleSubscribe,
  onAddFriend,
  onChallengeFriend,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'friends' | 'add' | 'suggestions' | 'chat'>('friends');
  const [searchInput, setSearchInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeChatFriend, setActiveChatFriend] = useState<FriendItem | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMsg[]>>(DEFAULT_FRIEND_CHATS);
  const [chatInputText, setChatInputText] = useState('');
  const replyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) {
        clearTimeout(replyTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(userFriendCode);
    setCopiedCode(true);
    onShowToast(t('toastFriendCodeCopied', 'Votre code ami a été copié avec succès !'));
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const ok = onAddFriend(searchInput.trim());
    if (ok) {
      setSearchInput('');
      setTab('friends');
    }
  };

  const openFriendChat = (friend: FriendItem) => {
    setActiveChatFriend(friend);
    setTab('chat');
  };

  const handleSendFriendMessage = (text: string) => {
    if (!activeChatFriend || !text.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`;
    const friendId = activeChatFriend.id;
    const friendName = activeChatFriend.name;
    const trimmed = text.trim();

    // Règle stricte : Interdiction de partager ou demander des numéros de téléphone
    const hasPhone = containsOrRequestsPhoneNumber(trimmed);
    if (hasPhone) {
      onShowToast(t('toastPhoneForbidden', '⚠️ Règle de sécurité : Les numéros de téléphone sont strictement interdits.'));
    }

    const newMsg: ChatMsg = {
      id: `${Date.now()}-${Math.random()}`,
      sender: 'me',
      text: trimmed,
      time: timeStr,
    };

    setChatHistories(prev => ({
      ...prev,
      [friendId]: [...(prev[friendId] || []), newMsg],
    }));
    setChatInputText('');

    if (replyTimeoutRef.current) {
      clearTimeout(replyTimeoutRef.current);
    }
  };

  const subscribedCount = friends.filter(f => f.subscribed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-gradient-to-b from-[#0a3828] via-[#06241b] to-[#03150f] border-2 border-amber-400/70 rounded-3xl p-5 shadow-[0_16px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(245,197,24,0.25)] flex flex-col gap-3.5 max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/25">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                {t('tooltipFriendsSubs', 'Amis & Abonnements')}
              </h2>
              <span className="text-[10px] text-amber-200/70">
                ★ {subscribedCount} · {friends.length} {t('friendsLabel', 'Amis')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User's own Friend Code Banner with 1-click copy */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-[#062c1f] to-emerald-950/80 p-3 rounded-2xl border border-amber-500/30 flex items-center justify-between gap-2 shadow-inner">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              {t.friendCodeLabel || 'Mon Code Ami Unique'}
            </span>
            <span className="text-base font-black text-amber-300 font-mono tracking-widest">
              {userFriendCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 font-black text-xs shadow hover:from-amber-300 hover:to-amber-500 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? (t.shareCopied || 'Copié !') : (t.shareCopyCodeBtn || 'Copier')}</span>
          </button>
        </div>

        {/* Tabs: Mes Amis / S'abonner / Découvrir / Chat */}
        <div className="grid grid-cols-3 gap-1 bg-[#041a12] p-1 rounded-xl border border-amber-500/25">
          <button
            type="button"
            onClick={() => { setTab('friends'); setActiveChatFriend(null); }}
            className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
              tab === 'friends'
                ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.friendsTab || 'Mes Amis'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('add'); setActiveChatFriend(null); }}
            className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
              tab === 'add'
                ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t.inviteFriends || "S'abonner"}</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('suggestions'); setActiveChatFriend(null); }}
            className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
              tab === 'suggestions'
                ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.discover || 'Découvrir'}</span>
          </button>
        </div>

        {/* TAB 1: FRIENDS LIST */}
        {tab === 'friends' && (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-64 pr-1 custom-scrollbar">
            {friends.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">
                {t('noFriendsSubscribed', "Vous n'avez pas encore d'amis abonnés. Partagez votre code ami ou ajoutez-en un ci-dessus !")}
              </div>
            ) : (
              friends.map(friend => (
                <div
                  key={friend.id}
                  className="bg-[#05261b] hover:bg-[#073224] border border-amber-500/25 rounded-2xl p-2.5 flex items-center justify-between gap-2 transition-all shadow-sm"
                >
                  {/* Avatar & Info */}
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 flex items-center justify-center text-xl shadow">
                        {friend.avatar}
                      </div>
                      {/* Status indicator */}
                      <div
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#05261b] ${
                          friend.status === 'online'
                            ? 'bg-emerald-400 animate-pulse'
                            : friend.status === 'playing'
                            ? 'bg-amber-400'
                            : 'bg-gray-500'
                        }`}
                        title={friend.status}
                      />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-gray-200">{friend.name}</span>
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/40">
                          {t('levelLabel', 'Niv.')} {friend.level}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-400">
                        {friend.status === 'online'
                          ? `🟢 ${t('onlineNow', 'En ligne')}`
                          : friend.status === 'playing'
                          ? `⚔️ ${t('inGameStatus', 'En partie')}`
                          : `⚫ ${t('offlineStatus', 'Hors-ligne')}`}
                        {friend.location ? ` · ${friend.location}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Subscribe, Chat, Challenge */}
                  <div className="flex items-center gap-1.5">
                    {/* Subscription Star Button */}
                    <button
                      type="button"
                      onClick={() => onToggleSubscribe(friend.id)}
                      className={`p-2 rounded-xl transition-all ${
                        friend.subscribed
                          ? 'bg-amber-400/20 border border-amber-400 text-amber-300'
                          : 'bg-white/5 border border-gray-700 text-gray-400 hover:text-white'
                      }`}
                      title={friend.subscribed ? t('subscribedFavTitle', 'Abonné (Favori)') : t('subscribeBtn', "S'abonner")}
                    >
                      <Star className={`w-4 h-4 ${friend.subscribed ? 'fill-current' : ''}`} />
                    </button>

                    {/* Chat Button (Ludo King Direct Friend Chat) */}
                    <button
                      type="button"
                      onClick={() => openFriendChat(friend)}
                      className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all"
                      title={t('chat', 'Discuter')}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    {/* Challenge Button */}
                    <button
                      type="button"
                      disabled={friend.status === 'offline'}
                      onClick={() => {
                        onChallengeFriend(friend);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 shadow transition-all ${
                        friend.status !== 'offline'
                          ? 'bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 border-b-2 border-rose-900 active:translate-y-0.5 text-white cursor-pointer'
                          : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                      }`}
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

        {/* TAB 4: DIRECT FRIEND CHAT (Ludo King Style) */}
        {tab === 'chat' && activeChatFriend && (
          <div className="flex flex-col gap-2.5">
            {/* Chat Friend Bar */}
            <div className="flex items-center justify-between bg-[#05261b] px-3 py-2 rounded-xl border border-amber-500/25">
              <button
                type="button"
                onClick={() => setTab('friends')}
                className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t('back', 'Retour')}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-lg">{activeChatFriend.avatar}</span>
                <span className="text-xs font-black text-white">{activeChatFriend.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onChallengeFriend(activeChatFriend);
                  onClose();
                }}
                className="text-[10px] font-black bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded-lg flex items-center gap-1"
              >
                <Swords className="w-3 h-3" />
                <span>{t('inviteTab', 'Inviter')}</span>
              </button>
            </div>

            {/* Chat Messages List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-44 p-2 bg-[#041a12] rounded-xl border border-amber-500/20 custom-scrollbar">
              {(chatHistories[activeChatFriend.id] || []).map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'me' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[82%] px-3 py-1.5 rounded-2xl text-xs font-medium ${
                      msg.sender === 'me'
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold rounded-br-none shadow-md'
                        : 'bg-[#083626] border border-amber-500/30 text-amber-100 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div className="text-[8px] opacity-70 mt-0.5 text-right">{msg.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Emojis Row */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {QUICK_FRIEND_EMOJIS.map((emo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendFriendMessage(emo)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-amber-400/20 text-base flex items-center justify-center transition-transform active:scale-125"
                >
                  {emo}
                </button>
              ))}
            </div>

            {/* Quick Phrases */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {QUICK_FRIEND_PHRASE_KEYS.map((item, idx) => {
                const localized = t(item.key, item.fallback);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendFriendMessage(localized)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#05261b] hover:bg-[#073224] border border-amber-500/30 text-[10px] font-bold text-amber-200 transition-colors"
                  >
                    {localized}
                  </button>
                );
              })}
            </div>

            {/* Input Form */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendFriendMessage(chatInputText);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                placeholder={t('chatWithFriendPlaceholder', 'Discuter avec cet ami...')}
                value={chatInputText}
                onChange={e => setChatInputText(e.target.value)}
                className="flex-1 bg-[#041a12] border border-amber-500/30 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 outline-none shadow-inner"
              />
              <button
                type="submit"
                disabled={!chatInputText.trim()}
                className="p-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 disabled:opacity-40 text-slate-950 font-black shadow"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: ADD FRIEND VIA CODE OR NAME */}
        {tab === 'add' && (
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-3 py-2">
            <p className="text-xs text-amber-200/80">
              {t('friendCodeHint', "Saisissez le code ami (ex: PION-9921) ou le pseudo d'un joueur pour vous abonner à son profil et l'inviter.")}
            </p>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('friendCodeOrPseudoPlaceholder', 'Code ami ou Pseudo...')}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full bg-[#041a12] border border-amber-500/30 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-gray-500 outline-none uppercase font-bold tracking-wider"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 font-black text-xs shadow hover:from-amber-300"
              >
                {t('addFriend', 'Ajouter')}
              </button>
            </div>

            <div className="bg-emerald-950/60 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-2 text-[11px] text-amber-200/80 mt-2">
              <Share2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                {t('privateLinkShareTip', "Astuce : Vous pouvez aussi partager directement le lien de votre salon privé sur WhatsApp, SMS ou Facebook depuis l'écran de jeu.")}
              </span>
            </div>
          </form>
        )}

        {/* TAB 3: SUGGESTIONS */}
        {tab === 'suggestions' && (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-64 pr-1 custom-scrollbar">
            <p className="text-[11px] text-gray-400 pb-1">
              {t('discoverActivePlayers', 'Joueurs récemment actifs sur le plateau avec qui vous pouvez vous abonner :')}
            </p>
            {[
              { id: 's1', name: 'Karim_Champion', avatar: '🦁', level: 9, location: `${t('country_MA', 'Maroc')} 🇲🇦` },
              { id: 's2', name: 'DamaMaster_Taha', avatar: '👑', level: 12, location: `${t('country_TN', 'Tunisie')} 🇹🇳` },
              { id: 's3', name: 'Amine_Pro', avatar: '🦅', level: 6, location: `${t('country_DZ', 'Algérie')} 🇩🇿` },
              { id: 's4', name: 'Ousmane_Dakar', avatar: '🐺', level: 8, location: `${t('country_SN', 'Sénégal')} 🇸🇳` },
            ].map(sug => (
              <div
                key={sug.id}
                className="bg-[#05261b] border border-amber-500/20 rounded-2xl p-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-600/30 border border-amber-400/40 flex items-center justify-center text-lg">
                    {sug.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-gray-200">{sug.name}</span>
                      <span className="text-[9px] text-amber-400 font-bold">{t('levelLabel', 'Niv.')} {sug.level}</span>
                    </div>
                    <span className="text-[9px] text-gray-400">{sug.location}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddFriend(sug.name);
                    onShowToast((t('toastSubscribedTo', 'Abonné à {name} ⭐')).replace('{name}', sug.name));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 text-slate-950 font-black text-xs shadow active:scale-95 flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{t('subscribeBtn', "S'abonner")}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
