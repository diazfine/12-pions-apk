import React from 'react';
import { Target, Trophy, Sparkles, Check, X, Award, ChevronRight, Gift, Crown, Coins } from 'lucide-react';
import { DailyMission, UserProfile } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface DailyMissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  missions: DailyMission[];
  onClaimMission: (missionId: string) => void;
  canClaimFreeBonusToday?: boolean;
  onClaimFreeBonus?: () => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  missions,
  onClaimMission,
  canClaimFreeBonusToday,
  onClaimFreeBonus,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const xpForNextLevel = userProfile.level * 500;
  const xpProgress = Math.min(100, Math.round((userProfile.xp / xpForNextLevel) * 100));

  const completedCount = missions.filter(m => m.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-gradient-to-b from-[#0a3828] via-[#06241b] to-[#03150f] border-2 border-amber-400/70 rounded-3xl p-3 sm:p-4 shadow-[0_16px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(245,197,24,0.25)] flex flex-col gap-3 max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                {t.dailyGiftsTitle || 'CADEAUX & RÉCOMPENSES'}
              </h2>
              <span className="text-[10px] text-amber-200/70">
                {t.seasonRewardsSub || 'Réclamez vos pièces et complétez vos missions !'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">

          {/* ─── 1. FREE GIFTS & COINS SECTION ─── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-300 uppercase tracking-wider px-1">
              <span>🎁 {t.giftsToReceive || 'Cadeaux & Bonus à Recevoir'}</span>
              <span className="text-[10px] text-amber-400/80 font-mono font-bold">
                🪙 {userProfile.coins.toLocaleString()} {t.gold || 'Pièces'}
              </span>
            </div>

            {/* Gift 1: Free Daily Bonus (+1 100 Coins) */}
            <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              canClaimFreeBonusToday
                ? 'bg-gradient-to-r from-amber-950/80 via-[#0a402d] to-amber-950/70 border-amber-400 shadow-[0_0_15px_rgba(245,197,24,0.3)]'
                : 'bg-[#041d14]/70 border-amber-500/20 opacity-80'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-xl shadow">
                  🎁
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-amber-200">
                    {t.freeGiftTitle || 'Bonus Quotidien Gratuit'}
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-bold">
                    {t('freeDailyBonusDetails', '+1 100 Pièces d’or gratuites')}
                  </span>
                </div>
              </div>

              <div>
                {canClaimFreeBonusToday ? (
                  <button
                    type="button"
                    onClick={onClaimFreeBonus}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer animate-pulse"
                  >
                    {t.receiveBtn || 'RECEVOIR'}
                  </button>
                ) : (
                  <div className="px-3 py-1 rounded-xl bg-gray-800/80 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.receivedBtn || '✓ Reçu'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gift 2: Royal Connection Gift (+500 Coins) */}
            <div className="p-3 rounded-2xl border border-amber-500/20 bg-[#041d14]/70 flex items-center justify-between gap-3 opacity-85">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-xl shadow">
                  👑
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-amber-200">
                    {t.welcomePackTitle || 'Cadeau de Connexion Royale'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {t('royalConnectionGiftDetails', '+500 Pièces & +50 XP (Actif)')}
                  </span>
                </div>
              </div>

              <div className="px-3 py-1 rounded-xl bg-gray-800/80 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{t.receivedBtn || '✓ Reçu'}</span>
              </div>
            </div>
          </div>

          {/* Level & XP Progress Card */}
          <div className="bg-gradient-to-r from-emerald-950/80 via-[#062c1f] to-emerald-950/80 p-3 rounded-2xl border border-amber-500/30 flex flex-col gap-2 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-200 flex items-center justify-center text-slate-950 font-black text-sm shadow">
                  {userProfile.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-200">{userProfile.name}</span>
                    <span className="text-[9px] font-black text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-400/40">
                      {t('levelTag', 'NIVEAU')} {userProfile.level}
                    </span>
                  </div>
                  <span className="text-[9.5px] text-gray-400">
                    {userProfile.level >= 10
                      ? t('titleGrandmaster', 'Grand Maître Légendaire')
                      : userProfile.level >= 5
                      ? t('titleVeteran', 'Tacticien Vétéran')
                      : t('titleChallenger', 'Challenger Prometteur')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-amber-400">
                  {userProfile.xp} / {xpForNextLevel} XP
                </span>
                <span className="text-[8.5px] text-gray-400">{t('nextLevel', 'Prochain niveau')}</span>
              </div>
            </div>

            {/* XP Bar */}
            <div className="w-full bg-[#041a12] h-2 rounded-full overflow-hidden p-0.5 border border-amber-500/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 transition-all duration-500 shadow-sm"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>

          {/* Daily Missions List */}
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>🎯 {t('dailyMissions', 'Missions Quotidiennes')}</span>
              <span className="text-[10px] text-amber-200/70 font-normal">
                {completedCount}/{missions.length} {t('missionsCompletedCount', 'accomplies')}
              </span>
            </div>

            {missions.map(m => {
              const isReady = m.current >= m.target && !m.claimed;
              const isFinished = m.claimed;

              return (
                <div
                  key={m.id}
                  className={`px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 w-full min-w-0 overflow-hidden box-border ${
                    isFinished
                      ? 'bg-[#03150e]/60 border-emerald-950 opacity-60'
                      : isReady
                      ? 'bg-gradient-to-r from-emerald-950/70 via-[#073524] to-emerald-950/60 border-amber-400/80 shadow-[0_0_15px_rgba(245,197,24,0.2)]'
                      : 'bg-[#05261b] border-amber-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#041a12] border border-amber-500/20 flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                      {m.icon}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[11px] sm:text-xs font-black text-gray-200 leading-tight truncate">
                        {t(`mission_${m.id}_title`, m.title)}
                      </span>
                      <span className="text-[9px] sm:text-[9.5px] text-gray-400 leading-tight mt-0.5 truncate">
                        {t(`mission_${m.id}_desc`, m.desc)} ({Math.min(m.current, m.target)}/{m.target})
                      </span>

                      {/* Mini progress bar */}
                      {!isFinished && (
                        <div className="w-16 sm:w-24 bg-[#041a12] h-1.5 rounded-full overflow-hidden mt-1 max-w-full">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round((m.current / m.target) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reward & Button */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-[10px] sm:text-[11px] font-black text-amber-300 whitespace-nowrap">+{m.rewardCoins} 🪙</span>
                      <span className="text-[8px] sm:text-[8.5px] font-bold text-emerald-400 whitespace-nowrap">+{m.rewardXp} XP</span>
                    </div>

                    {isFinished ? (
                      <div className="px-2 py-1 rounded-xl bg-gray-800 text-gray-400 flex items-center gap-1 text-[10px] font-black flex-shrink-0 whitespace-nowrap">
                        <Check className="w-3 h-3" />
                        <span>{t.receivedBtn || '✓ Reçu'}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!isReady}
                        onClick={() => onClaimMission(m.id)}
                        className={`px-2 sm:px-2.5 py-1 rounded-xl font-black text-[10px] sm:text-[11px] shadow transition-all flex-shrink-0 whitespace-nowrap text-center ${
                          isReady
                            ? 'bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 text-slate-950 cursor-pointer animate-pulse'
                            : 'bg-gray-800/90 text-gray-400 border border-gray-700/80 cursor-not-allowed'
                        }`}
                      >
                        {isReady ? (t.receiveBtn || 'Recevoir') : t('inProgress', 'En cours')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

