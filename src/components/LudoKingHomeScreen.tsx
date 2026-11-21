import React, { useState, useEffect } from 'react';
import {
  Users,
  Bot,
  Settings,
  Mail,
  Plus,
  Sparkles,
  Share2,
  Trophy,
  ShoppingCart,
  Volume2,
  MessageCircle,
  Globe,
  Radio,
  Zap,
  Bell,
  BarChart3,
  Clapperboard,
} from 'lucide-react';
import { BoardWatermarkBackground } from './BoardWatermarkBackground';
import { UserProfile, FriendItem, DailyMission } from '../types';
import { useTranslation, formatNumber } from '../i18n';

interface LudoKingHomeScreenProps {
  userProfile: UserProfile;
  canSpinToday: boolean;
  friends: FriendItem[];
  dailyMissions: DailyMission[];
  unreadNotificationsCount?: number;
  hasUnreadChatMessages?: boolean;
  onPlayOnline: () => void;
  onPlayWithFriends: () => void;
  onVsComputer: () => void;
  onPassNPlay: () => void;
  onOpenTournament: () => void;
  onOpenLeaderboard: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onOpenSpin: () => void;
  onOpenShop?: () => void;
  onOpenFriends: () => void; // Opens Chat & Social Hub
  onOpenNotifications?: () => void; // Opens Notifications Modal
  onOpenShare?: () => void; // Opens Share Social Modal
  onOpenProfile?: () => void; // Opens User Profile Modal
  onOpenPromoVideo?: () => void; // Opens Commercial Promo Video Studio
  onOpenMissions: () => void;
  onClaimFreeBonus?: () => void;
  canClaimFreeBonusToday?: boolean;
  onExitApp?: () => void; // Opens Exit Confirmation Modal
  onShowToast: (msg: string) => void;
  t: Record<string, string>;
}

export const LudoKingHomeScreen: React.FC<LudoKingHomeScreenProps> = ({
  userProfile,
  canSpinToday,
  friends,
  dailyMissions,
  unreadNotificationsCount = 0,
  hasUnreadChatMessages = false,
  onPlayOnline,
  onPlayWithFriends,
  onVsComputer,
  onPassNPlay,
  onOpenTournament,
  onOpenLeaderboard,
  onOpenStats,
  onOpenSettings,
  onOpenSpin,
  onOpenShop,
  onOpenFriends,
  onOpenNotifications,
  onOpenShare,
  onOpenProfile,
  onOpenPromoVideo,
  onOpenMissions,
  onClaimFreeBonus,
  canClaimFreeBonusToday = true,
  onExitApp,
  onShowToast,
  t,
}) => {
  const { language } = useTranslation();
  const [isPouringCoins, setIsPouringCoins] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(true);
  const onlineFriendsCount = friends.filter(f => f.status === 'online').length;
  const unclaimedMissions = dailyMissions.filter(m => m.completed && !m.claimed).length;

  useEffect(() => {
    const standalone =
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && (navigator as unknown as { standalone?: boolean }).standalone === true) ||
      !!(typeof window !== 'undefined' && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
    setIsStandalone(!!standalone);
  }, []);

  return (
    <div className="relative w-full h-screen max-h-screen bg-[#041a12] overflow-hidden flex flex-col justify-between select-none">
      {/* ─── 1. FAINT GAME BOARD WATERMARK IN THE BACKGROUND ─── */}
      <BoardWatermarkBackground />

      {/* ─── ZONE SUPÉRIEURE DE LA BARRE D'ÉTAT (STRICTEMENT SAFE-AREA-INSET-TOP) ─── */}
      <div
        className="w-full bg-[#083023] shrink-0 z-30 pointer-events-none"
        style={{
          height: 'env(safe-area-inset-top, 0px)',
        }}
      />

      {/* ─── 2. LATERAL GOLDEN ACCENTS ─── */}
      <div className="absolute top-0 bottom-0 left-0 w-2 sm:w-3 bg-gradient-to-r from-[#FFE082] via-[#F59E0B] to-[#D97706] shadow-[2px_0_6px_rgba(0,0,0,0.5)] z-20 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-2 sm:w-3 bg-gradient-to-l from-[#FFE082] via-[#F59E0B] to-[#D97706] shadow-[-2px_0_6px_rgba(0,0,0,0.5)] z-20 pointer-events-none" />

      {/* ─── MAIN CONTAINER (RESPONSIVE FOR ALL PHONES, TABLETS & FOLDABLES) ─── */}
      <div className="relative z-10 flex-1 flex flex-col max-w-md md:max-w-lg lg:max-w-xl mx-auto w-full px-3 sm:px-4 md:px-6 pt-0.5 sm:pt-1 pb-16 sm:pb-18 justify-between overflow-hidden">
        
        {/* ─── TOP HEADER BAR (SANS AUCUNE LIGNE DORÉE, POSITIONNÉ IMMÉDIATEMENT SOUS LA SAFE AREA) ─── */}
        <header className="flex items-center justify-between gap-1.5 shrink-0 py-0.5 sm:py-1">
          {/* Avatar with level badge & green online dot */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <div
                onClick={onOpenProfile || onOpenMissions}
                className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-400 to-amber-700 border-2 border-[#FFE082] shadow-[0_3px_8px_rgba(0,0,0,0.6)] flex items-center justify-center text-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform overflow-hidden relative"
                title={t.profileTitle || 'Modifier mon profil'}
              >
                {userProfile.customPhoto ? (
                  <img
                    src={userProfile.customPhoto}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{userProfile.avatar}</span>
                )}
                {userProfile.flag && (
                  <span className="absolute bottom-0.5 right-0.5 text-[9px]">
                    {userProfile.flag}
                  </span>
                )}
              </div>
              <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow animate-pulse" />
              <div className="absolute -bottom-1.5 -left-1 px-1 py-0.2 bg-gradient-to-b from-amber-300 to-amber-500 rounded-full border border-amber-800 flex items-center justify-center shadow">
                <span className="text-[8px] font-black text-slate-950 flex items-center gap-0.5">
                  ⭐ {formatNumber(userProfile.level, language)}
                </span>
              </div>
            </div>

            {/* Settings button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-7 h-7 rounded-lg bg-gradient-to-b from-[#0e4835] to-[#06241a] border border-amber-400/50 hover:border-amber-300 flex items-center justify-center text-amber-200 shadow-md active:scale-95 transition-all cursor-pointer"
              title={t.settings || 'Paramètres'}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Notifications Shortcut next to Settings */}
            <button
              type="button"
              onClick={onOpenNotifications || onOpenFriends}
              className="relative w-7 h-7 rounded-lg bg-gradient-to-b from-[#0e4835] to-[#06241a] border border-amber-400/50 hover:border-amber-300 flex items-center justify-center text-amber-300 shadow-md active:scale-95 transition-all cursor-pointer"
              title={t.notifications || 'Notifications'}
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border border-white text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                  {formatNumber(unreadNotificationsCount, language)}
                </span>
              )}
            </button>

            {/* Promo Video Trailer button */}
            {onOpenPromoVideo && (
              <button
                type="button"
                onClick={onOpenPromoVideo}
                className="relative w-7 h-7 rounded-lg bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 border border-amber-300 hover:border-white flex items-center justify-center text-slate-950 shadow-md active:scale-95 transition-all cursor-pointer animate-pulse"
                title={t.tooltipOfficialPromoVideo || 'Vidéo Publicitaire Officielle (Spot HD)'}
              >
                <Clapperboard className="w-3.5 h-3.5 text-slate-950" />
              </button>
            )}
          </div>

          {/* Diamonds and Gold Coins Counter */}
          <div className="flex items-center gap-1.5">
            {/* Diamonds */}
            <div
              onClick={() => onShowToast(t.diamondsToast || '💎 Vous avez 50 Diamants Royaux !')}
              className="flex items-center bg-[#041a12]/90 border border-amber-400/80 rounded-full pl-1.5 pr-1 py-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer hover:brightness-110 active:scale-95 transition-transform"
            >
              <span className="text-[11px] mr-1">💎</span>
              <span className="text-[11px] font-black text-white font-mono">{formatNumber(50, language)}</span>
              <div className="w-3.5 h-3.5 ml-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-200 flex items-center justify-center text-slate-950 font-black text-[8px]">
                <Plus className="w-2.5 h-2.5" />
              </div>
            </div>

            {/* Gold Coins */}
            <div
              onClick={() => {
                if (canClaimFreeBonusToday && onClaimFreeBonus) {
                  setIsPouringCoins(true);
                  setTimeout(() => setIsPouringCoins(false), 2200);
                  onClaimFreeBonus();
                } else if (onOpenShop) {
                  onOpenShop();
                } else {
                  onShowToast(t.alreadyReceivedToday || 'Bonus quotidien déjà récupéré ! Revenez demain');
                }
              }}
              className={`relative flex items-center bg-[#041a12]/90 border border-amber-400 rounded-full pl-1.5 pr-1 py-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer hover:brightness-110 active:scale-95 transition-all ${
                isPouringCoins ? 'scale-110 ring-2 ring-amber-300 animate-pulse bg-amber-900/40' : ''
              }`}
            >
              <span className={`text-xs mr-1 ${isPouringCoins ? 'animate-bounce text-amber-200' : 'animate-spin-slow'}`}>🪙</span>
              <span className="text-[11px] font-black text-amber-300 font-mono">
                {formatNumber(userProfile.coins, language)}
              </span>
              <div className="w-3.5 h-3.5 ml-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-200 flex items-center justify-center text-slate-950 font-black text-[8px]">
                <Plus className="w-2.5 h-2.5" />
              </div>

              {/* Floating Flying Coins Streaming upward animation */}
              {isPouringCoins && (
                <div className="absolute -top-6 -left-3 pointer-events-none flex items-center gap-1 animate-bounce">
                  <span className="text-amber-300 font-black text-xs font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    +{formatNumber(1100, language)} 🪙
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ─── SLEEK REGAL LOGO (COMPACT 3D DESIGN) ─── */}
        <div className="relative flex flex-col items-center justify-center my-0 shrink-0">
          {/* Top Right Quick Badges: Share & Sans Pub */}
          <div className="absolute -right-1 top-0 flex flex-col items-end gap-1.5 z-10">
            <div
              onClick={onOpenShare || onOpenFriends}
              className="cursor-pointer hover:scale-105 active:scale-95 transition-transform bg-gradient-to-b from-[#0e4835] to-[#06241a] rounded-lg p-1 text-center shadow border border-amber-400 flex flex-col items-center"
              title={t.shareAppTitle || "Partager l'application (WhatsApp, SMS, Facebook...)"}
            >
              <Share2 className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[7px] font-black text-amber-300 leading-none mt-0.5">{t.shareApp || 'PARTAGE'}</span>
            </div>
            <div
              onClick={() => onShowToast(t.noAdsToast || 'Version 100% sans publicité !')}
              className="w-6 h-6 rounded-full bg-gradient-to-b from-rose-500 to-rose-700 border border-white flex items-center justify-center shadow cursor-pointer hover:scale-110 transition-transform"
              title={t.noAds || 'Sans Publicité'}
            >
              <span className="text-[6.5px] font-black text-white">{t.noAds || 'SANS PUB'}</span>
            </div>
          </div>

          {/* Official 12 PIONS Game Logo Artwork */}
          <div className="w-full flex justify-center mt-2 mb-2">
            <img 
              src="/logo du jeu.png" 
              alt="Logo 12 PIONS" 
              className="w-36 sm:w-40 h-auto object-contain mx-auto drop-shadow-md" 
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('game-logo')) {
                  target.src = '/game-logo.png';
                }
              }}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* ─── 4 ACTION CARDS (2X2 GRID) ─── */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 my-1 w-full shrink-0">
          {/* 1. EN LIGNE (GOLD & GREEN BRILLIANT) */}
          <button
            type="button"
            onClick={onPlayOnline}
            className="group relative bg-gradient-to-b from-[#FFF176] via-[#FFD54F] to-[#FFB300] hover:from-[#FFEE58] hover:to-[#FFA000] border-3 border-[#031c13] rounded-2xl p-2 flex flex-col items-center text-center shadow-[0_5px_0_#02120c,0_8px_16px_rgba(0,0,0,0.6)] active:translate-y-1 active:shadow-[0_1px_0_#02120c] transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/30 rounded-bl-full pointer-events-none" />

            <div className="w-full h-12 rounded-xl bg-gradient-to-b from-[#0e4835] to-[#052319] border border-amber-300 flex items-center justify-center relative overflow-hidden group-hover:scale-102 transition-transform shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:8px_8px] opacity-25" />
              
              <div className="relative flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-base shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-pulse">
                  🌍
                </div>
                <div className="absolute w-11 h-11 rounded-full border border-emerald-400/40 border-dashed animate-spin-slow pointer-events-none" />
              </div>

              <div className="absolute right-2 top-2 flex gap-0.5 items-end h-3">
                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                <span className="w-1 h-2 bg-emerald-400 rounded-full" />
                <span className="w-1 h-3 bg-emerald-400 rounded-full" />
              </div>
            </div>

            <span className="text-xs sm:text-sm font-black text-[#031c13] uppercase tracking-wider mt-1.5 leading-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#031c13]" />
              <span>{t.online || 'EN LIGNE'}</span>
            </span>
            <span className="text-[8px] font-black text-amber-950 mt-0.5">
              {t.onlinePlayersCount || `${formatNumber(128450, language)} ${t.onlinePlayers || 'Joueurs'}`}
            </span>
          </button>

          {/* 2. VS AMI (GOLD & GREEN BRILLIANT) */}
          <button
            type="button"
            id="btn-play-with-friends"
            onClick={onPlayWithFriends}
            className="group relative bg-gradient-to-b from-[#FFF176] via-[#FFD54F] to-[#FFB300] hover:from-[#FFEE58] hover:to-[#FFA000] border-3 border-[#031c13] rounded-2xl p-2 flex flex-col items-center text-center shadow-[0_5px_0_#02120c,0_8px_16px_rgba(0,0,0,0.6)] active:translate-y-1 active:shadow-[0_1px_0_#02120c] transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/30 rounded-bl-full pointer-events-none" />

            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 border border-white flex items-center justify-center shadow animate-bounce z-10">
              <Volume2 className="w-2.5 h-2.5" />
            </div>

            <div className="w-full h-12 rounded-xl bg-gradient-to-b from-[#0e4835] to-[#052319] border border-amber-300 flex items-center justify-center gap-2 relative overflow-hidden group-hover:scale-102 transition-transform shadow-inner">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-xs shadow">
                🟢
              </div>
              <div className="relative flex items-center">
                <div className="w-7 h-0.5 bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400 animate-pulse" />
                <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-400 border border-white flex items-center justify-center text-[9px] shadow animate-spin-slow">
                  🔑
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-400 flex items-center justify-center text-xs shadow">
                🔴
              </div>
            </div>

            <span className="text-xs sm:text-sm font-black text-[#031c13] uppercase tracking-wider mt-1.5 leading-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#031c13]" />
              <span>{t.vsFriend || 'AMIS'}</span>
            </span>
            <span className="text-[8px] font-black text-amber-950 mt-0.5">
              {t.friendSub || 'Salon Privé & Code'}
            </span>
          </button>

          {/* 3. ORDINATEUR */}
          <button
            type="button"
            onClick={onVsComputer}
            className="group relative bg-gradient-to-b from-[#FFF176] via-[#FFD54F] to-[#FFB300] hover:from-[#FFEE58] hover:to-[#FFA000] border-3 border-[#031c13] rounded-2xl p-2 flex flex-col items-center text-center shadow-[0_5px_0_#02120c,0_8px_16px_rgba(0,0,0,0.6)] active:translate-y-1 active:shadow-[0_1px_0_#02120c] transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/30 rounded-bl-full pointer-events-none" />

            <div className="w-full h-12 rounded-xl bg-gradient-to-b from-[#0e4835] to-[#052319] border border-amber-300 flex items-center justify-center relative overflow-hidden group-hover:scale-102 transition-transform shadow-inner">
              <span
                className="text-3xl font-black italic tracking-wider leading-none select-none"
                style={{
                  color: '#FFE082',
                  textShadow:
                    '0 1px 0 #D4AF37, 0 2px 0 #AA7A1E, 0 3px 0 #7A5308, 0 4px 6px rgba(0,0,0,0.9)',
                  fontFamily: 'serif',
                }}
              >
                vs
              </span>
            </div>

            <span className="text-xs sm:text-sm font-black text-[#031c13] uppercase tracking-wider mt-1.5 leading-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              {t.vsComp || 'ORDINATEUR'}
            </span>
            <span className="text-[8px] font-black text-amber-950 mt-0.5">
              {t.compSub || 'IA Solo · 3 Niveaux'}
            </span>
          </button>

          {/* 4. JEU LOCAL */}
          <button
            type="button"
            onClick={onPassNPlay}
            className="group relative bg-gradient-to-b from-[#FFF176] via-[#FFD54F] to-[#FFB300] hover:from-[#FFEE58] hover:to-[#FFA000] border-3 border-[#031c13] rounded-2xl p-2 flex flex-col items-center text-center shadow-[0_5px_0_#02120c,0_8px_16px_rgba(0,0,0,0.6)] active:translate-y-1 active:shadow-[0_1px_0_#02120c] transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/30 rounded-bl-full pointer-events-none" />

            <div className="w-full h-12 rounded-xl bg-gradient-to-b from-[#0e4835] to-[#052319] border border-amber-300 flex items-center justify-between px-1.5 relative overflow-hidden group-hover:scale-102 transition-transform shadow-inner">
              <div className="flex flex-col items-center">
                <span className="text-base transform scale-x-[-1]">🧑‍🦱</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 border border-white" />
              </div>

              <div className="flex flex-col items-center my-auto">
                <div className="w-12 h-6 rounded-sm bg-[#8a5522] border border-[#f5c518] shadow flex items-center justify-center p-0.5 relative">
                  <div className="w-full h-full bg-[#fffae0] border border-amber-700 grid grid-cols-5 gap-0.2 p-0.2">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xs ${idx % 2 === 0 ? 'bg-emerald-600' : 'bg-rose-600'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="w-6 h-1 bg-[#5c3814] rounded-b-xs" />
              </div>

              <div className="flex flex-col items-center">
                <span className="text-base">🧔</span>
                <span className="w-2 h-2 rounded-full bg-rose-400 border border-white" />
              </div>
            </div>

            <span className="text-xs sm:text-sm font-black text-[#031c13] uppercase tracking-wider mt-1.5 leading-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              {t.localPlay || 'JEU LOCAL'}
            </span>
            <span className="text-[8px] font-black text-amber-950 mt-0.5">
              {t.localSub || '2 Joueurs · 1 Écran'}
            </span>
          </button>
        </div>

        {/* ─── 5. SEASON CLAIM REWARDS STRIP ─── */}
        <div
          onClick={onOpenMissions}
          className="cursor-pointer my-1 w-full bg-gradient-to-r from-[#e5a00d] via-[#fff176] to-[#e5a00d] border border-white rounded-xl py-1.5 px-3 flex items-center justify-between shadow hover:brightness-105 active:scale-98 transition-all shrink-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-base animate-bounce">🎁</span>
            <div className="flex flex-col text-left">
              <span className="text-[10px] sm:text-xs font-black text-slate-950 uppercase tracking-tight">
                {t.seasonRewards || 'RÉCOMPENSES DE LA SAISON 1'}
              </span>
              <span className="text-[8px] font-bold text-amber-950">
                {t.seasonRewardsSub || 'Complétez vos missions et réclamez vos pièces !'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenMissions}
            className="px-2.5 py-0.5 rounded-full bg-slate-950 text-[#f5c518] font-black text-[9px] uppercase tracking-wider border border-[#f5c518] shadow cursor-pointer hover:bg-slate-900 active:scale-95"
          >
            {t.claim || 'RÉCLAMER'}
          </button>
        </div>

        {/* ─── 7. BOTTOM ACTION BUTTONS: GRATUITE COINS (LEFT) & ROUE DE LA FORTUNE (RIGHT) ─── */}
        <div className="flex items-center justify-between px-1.5 my-1 w-full shrink-0">
          {/* Bottom Left: "Gratuite" (Direct Coins Deposit, never opens wheel!) */}
          <div
            onClick={() => {
              if (canClaimFreeBonusToday) {
                setIsPouringCoins(true);
                setTimeout(() => setIsPouringCoins(false), 2200);
              }
              onClaimFreeBonus?.();
            }}
            className="cursor-pointer group flex flex-col items-center hover:scale-105 active:scale-95 transition-transform"
            title={t.freeCoinsBtn || 'Gratuite'}
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 border-2 border-amber-200 flex items-center justify-center shadow-[0_0_12px_rgba(245,197,24,0.5)]">
                <span className="text-xl filter drop-shadow">🪙</span>
              </div>
              <span className={`absolute -top-1.5 -right-1 px-1.5 py-0.2 border border-white text-white font-black text-[7.5px] rounded-full shadow ${
                canClaimFreeBonusToday ? 'bg-gradient-to-r from-rose-500 to-amber-500 animate-bounce' : 'bg-emerald-600'
              }`}>
                {t.freeCoinsBtn || 'Gratuite'}
              </span>
            </div>
            <span className="text-[8.5px] font-black text-amber-300 mt-0.5 drop-shadow font-mono">
              +{formatNumber(1100, language)} 🪙
            </span>
          </div>

          {/* Bottom Center: "Vidéo Promo" / Spot Publicitaire */}
          {onOpenPromoVideo && (
            <div
              onClick={onOpenPromoVideo}
              className="cursor-pointer group flex flex-col items-center hover:scale-105 active:scale-95 transition-transform"
              title={t.tooltipWatchPromoVideo || 'Regarder le Spot Publicitaire HD'}
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-600 via-amber-500 to-yellow-400 border-2 border-amber-200 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                  <span className="text-xl filter drop-shadow">🎬</span>
                </div>
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-gradient-to-r from-red-500 to-rose-600 border border-white text-white font-black text-[7px] rounded-full shadow animate-pulse">
                  {t.spotHdBadge || 'SPOT HD'}
                </span>
              </div>
              <span className="text-[8.5px] font-black text-amber-300 mt-0.5 drop-shadow font-mono">
                {t.promoVideoBtnLabel || 'VIDÉO PROMO'}
              </span>
            </div>
          )}

          {/* Bottom Right: "Roue de la fortune" (Animated Spinning Wheel Graphic) */}
          <div
            onClick={onOpenSpin}
            className="cursor-pointer group flex flex-col items-center hover:scale-105 active:scale-95 transition-transform"
            title={t.fortuneWheel || 'Roue de la fortune'}
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-b from-amber-300 via-amber-600 to-amber-800 border-2 border-amber-200 shadow-[0_0_12px_rgba(245,197,24,0.5)] flex items-center justify-center overflow-hidden">
                {/* SVG Mini Spinning Wheel with Continuous Smooth Rotation */}
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full animate-[spin_6s_linear_infinite]"
                >
                  {/* 6 colorful slices */}
                  <path d="M50,50 L50,0 A50,50 0 0,1 93.3,25 Z" fill="#E11D48" stroke="#F5C518" strokeWidth="1.5" />
                  <path d="M50,50 L93.3,25 A50,50 0 0,1 93.3,75 Z" fill="#2563EB" stroke="#F5C518" strokeWidth="1.5" />
                  <path d="M50,50 L93.3,75 A50,50 0 0,1 50,100 Z" fill="#16A34A" stroke="#F5C518" strokeWidth="1.5" />
                  <path d="M50,50 L50,100 A50,50 0 0,1 6.7,75 Z" fill="#F59E0B" stroke="#F5C518" strokeWidth="1.5" />
                  <path d="M50,50 L6.7,75 A50,50 0 0,1 6.7,25 Z" fill="#9333EA" stroke="#F5C518" strokeWidth="1.5" />
                  <path d="M50,50 L6.7,25 A50,50 0 0,1 50,0 Z" fill="#0D9488" stroke="#F5C518" strokeWidth="1.5" />
                  {/* Golden Center Hub */}
                  <circle cx="50" cy="50" r="14" fill="#F5C518" stroke="#78350F" strokeWidth="2" />
                  <circle cx="50" cy="50" r="6" fill="#78350F" />
                </svg>
              </div>

              {canSpinToday ? (
                <span className="absolute -top-1.5 -left-1 px-1.5 py-0.2 bg-gradient-to-r from-emerald-500 to-teal-500 border border-white text-white font-black text-[7px] rounded-full shadow animate-pulse">
                  {t.spinBadge || 'ROUE'}
                </span>
              ) : (
                <span className="absolute -top-1.5 -left-1 px-1 py-0.2 bg-amber-700 border border-amber-300 text-amber-100 font-bold text-[6.5px] rounded-full shadow">
                  ✓ Vu
                </span>
              )}
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-amber-200 mt-0.5 tracking-tight truncate max-w-[85px]">
                {t.fortuneWheel || 'Roue de la fortune'}
              </span>
              <span className="text-[7.5px] font-black text-amber-400 -mt-0.5 drop-shadow font-mono">
                🪙 {formatNumber(5000, language)} MAX
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── 8. BOTTOM NAVIGATION BAR ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-b from-[#083023] to-[#031710] border-t-2 border-amber-400/60 shadow-[0_-4px_16px_rgba(0,0,0,0.6)] px-4 py-1 flex items-center justify-around max-w-md mx-auto h-14">
        {/* Tab 1: CHAT */}
        <button
          type="button"
          onClick={onOpenFriends}
          className="relative flex flex-col items-center gap-0.5 text-amber-100/70 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <div className="relative">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            {/* 3. Notification Chat : Discret point rouge clignotant pour signaler un nouveau message */}
            {hasUnreadChatMessages && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute -top-1 -right-1 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.9)] ring-2 ring-[#083023]" />
            )}
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
            {t.chat || 'CHAT'}
          </span>
          {onlineFriendsCount > 0 && !hasUnreadChatMessages && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 right-1 animate-ping" />
          )}
        </button>

        {/* Tab 2: STATISTIQUES */}
        <button
          type="button"
          onClick={onOpenStats}
          className="flex flex-col items-center gap-0.5 text-amber-100/70 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 text-amber-300" />
          <span className="text-[9px] font-black uppercase tracking-wider">
            {t.stats || 'STATISTIQUES'}
          </span>
        </button>

        {/* Tab 3: CLASSEMENT */}
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="flex flex-col items-center gap-0.5 text-amber-100/70 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <Trophy className="w-4 h-4 text-amber-300" />
          <span className="text-[9px] font-black uppercase tracking-wider">
            {t.ranking || 'CLASSEMENT'}
          </span>
        </button>

        {/* Tab 4: BOUTIQUE */}
        <button
          type="button"
          onClick={onOpenShop || onOpenSpin}
          className="flex flex-col items-center gap-0.5 text-amber-100/70 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4 text-amber-300" />
          <span className="text-[9px] font-black uppercase tracking-wider">
            {t.shop || 'BOUTIQUE'}
          </span>
        </button>
      </nav>

      {/* 🪙 ANIMATION DES PIÈCES QUI MONTENT S'AJOUTER AU COMPTEUR GLOBAL EN HAUT À DROITE */}
      {isPouringCoins && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <style>{`
            @keyframes flyCoinStream {
              0% {
                transform: translate3d(0, 0, 0) scale(0.5) rotate(0deg);
                opacity: 0;
              }
              12% {
                opacity: 1;
                transform: translate3d(calc(var(--tx) * 0.12 - 12px), calc(var(--ty) * 0.18 - 30px), 0) scale(1.3) rotate(45deg);
              }
              55% {
                opacity: 1;
                transform: translate3d(calc(var(--tx) * 0.55), calc(var(--ty) * 0.55 - 50px), 0) scale(1.1) rotate(190deg);
              }
              88% {
                opacity: 1;
                transform: translate3d(calc(var(--tx) * 0.92), calc(var(--ty) * 0.92), 0) scale(0.9) rotate(320deg);
              }
              100% {
                transform: translate3d(var(--tx), var(--ty), 0) scale(0.35) rotate(360deg);
                opacity: 0;
              }
            }
          `}</style>
          {[...Array(12)].map((_, i) => {
            const spreadX = (i % 3 - 1) * 8;
            const spreadY = ((i % 4) - 1.5) * 6;
            return (
              <div
                key={i}
                className="absolute text-2xl sm:text-3xl filter drop-shadow-[0_2px_10px_rgba(245,158,11,0.9)]"
                style={{
                  left: `${36 + spreadX}px`,
                  bottom: `${75 + spreadY}px`,
                  '--tx': `calc(100vw - 110px + ${spreadX}px)`,
                  '--ty': `calc(-100vh + 105px + ${spreadY}px)`,
                  animation: `flyCoinStream 1.15s cubic-bezier(0.25, 1, 0.4, 1) forwards`,
                  animationDelay: `${i * 75}ms`,
                } as React.CSSProperties}
              >
                🪙
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
