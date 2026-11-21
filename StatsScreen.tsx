import React, { useState } from 'react';
import { UserStats } from '../types';
import { loadUserStats, saveUserStats, defaultStats } from '../utils/statsStorage';
import { Trophy, Flame, Zap, Crown, Swords, ArrowLeft, RotateCcw, Award } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface StatsScreenProps {
  onBack: () => void;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ onBack }) => {
  const { t, formatNumber, formatPercent } = useTranslation();
  const [stats, setStats] = useState<UserStats>(loadUserStats);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  const totalGames = stats.gamesPlayed;
  const winRate = totalGames > 0 ? Math.round((stats.gamesWon / totalGames) * 100) : 0;

  const handleReset = () => {
    saveUserStats(defaultStats);
    setStats({ ...defaultStats });
    setShowConfirmReset(false);
  };

  return (
    <div className="w-full max-w-lg flex flex-col gap-4 py-2 animate-fade-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('home', 'Menu principal')}</span>
        </button>

        <h2 className="text-base font-black text-amber-400 tracking-wider flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>{t('playerStatsTitle', 'STATISTIQUES DU JOUEUR')}</span>
        </h2>
      </div>

      {/* Hero Overview Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#041a12]/95 border border-amber-500/25 rounded-2xl p-3 flex flex-col items-center text-center shadow-lg">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('games', 'Parties')}</span>
          <span className="text-2xl font-black text-amber-300 mt-0.5">{formatNumber(totalGames)}</span>
          <span className="text-[10px] text-emerald-400 font-semibold mt-1">
            {formatNumber(stats.gamesWon)} {t('victories', 'victoires')}
          </span>
        </div>

        <div className="bg-[#041a12]/95 border border-amber-500/25 rounded-2xl p-3 flex flex-col items-center text-center shadow-lg">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('winRateLabel', 'Victoires %')}</span>
          <span className="text-2xl font-black text-amber-300 mt-0.5">{formatPercent(winRate)}</span>
          <span className="text-[10px] text-gray-400 font-semibold mt-1">
            {formatNumber(stats.gamesLost)} {t('defeats', 'défaites')} · {formatNumber(stats.draws)} {t('draws', 'nulles')}
          </span>
        </div>

        <div className="bg-[#041a12]/95 border border-amber-500/25 rounded-2xl p-3 flex flex-col items-center text-center shadow-lg">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('winStreak', 'Série Victoires')}</span>
          <span className="text-2xl font-black text-amber-300 mt-0.5 flex items-center gap-1">
            <span>{formatNumber(stats.currentStreak)}</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </span>
          <span className="text-[10px] text-gray-400 font-semibold mt-1">
            {t('record', 'Record :')} {formatNumber(stats.bestStreak)}
          </span>
        </div>
      </div>

      {/* Combat Records */}
      <div className="bg-[#041a12]/95 border border-amber-500/25 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
        <h3 className="text-xs font-black text-amber-400 tracking-wider flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>{t('recordsAndPerformances', 'RECORDS & PERFORMANCES TACTIQUES')}</span>
        </h3>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#062a1e] p-2.5 rounded-xl border border-amber-500/20">
            <div className="flex items-center justify-center gap-1 text-amber-400 text-xs mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-[10px]">{t('maxCombo', 'Combo Max')}</span>
            </div>
            <div className="text-xl font-black text-white">
              {stats.bestCombo > 0 ? `×${formatNumber(stats.bestCombo)}` : '—'}
            </div>
            <span className="text-[9px] text-gray-400">{t('multiTakes', 'multi-prises')}</span>
          </div>

          <div className="bg-[#062a1e] p-2.5 rounded-xl border border-amber-500/20">
            <div className="flex items-center justify-center gap-1 text-amber-400 text-xs mb-1">
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-[10px]">{t('pawnsCaptured', 'Pions Capturés')}</span>
            </div>
            <div className="text-xl font-black text-white">{formatNumber(stats.totalCaptures)}</div>
            <span className="text-[9px] text-gray-400">{t('inTotal', 'au total')}</span>
          </div>

          <div className="bg-[#062a1e] p-2.5 rounded-xl border border-amber-500/20">
            <div className="flex items-center justify-center gap-1 text-amber-400 text-xs mb-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-[10px]">{t('sacredQueens', 'Dames Sacrées')}</span>
            </div>
            <div className="text-xl font-black text-white">{formatNumber(stats.totalQueens)}</div>
            <span className="text-[9px] text-gray-400">{t('promotions', 'promotions')}</span>
          </div>
        </div>
      </div>

      {/* Breakdown per Mode */}
      <div className="bg-[#041a12]/95 border border-amber-500/25 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
        <h3 className="text-xs font-black text-amber-400 tracking-wider flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-400" />
          <span>{t('breakdownByMode', 'BILAN PAR MODE DE JEU')}</span>
        </h3>

        <div className="flex flex-col divide-y divide-amber-500/10 text-xs">
          {/* AI Easy */}
          <div className="flex items-center justify-between py-2">
            <span className="font-semibold text-gray-300">{t('aiEasy', '🤖 Ordinateur — Facile')}</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{formatNumber(stats.vsAiEasy.wins)} {t('winShort', 'V')}</span>
              <span className="text-gray-500">/</span>
              <span className="text-rose-400 font-bold">{formatNumber(stats.vsAiEasy.losses)} {t('lossShort', 'D')}</span>
            </div>
          </div>

          {/* AI Medium */}
          <div className="flex items-center justify-between py-2">
            <span className="font-semibold text-gray-300">{t('aiMedium', '🤖 Ordinateur — Moyen')}</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{formatNumber(stats.vsAiMedium.wins)} {t('winShort', 'V')}</span>
              <span className="text-gray-500">/</span>
              <span className="text-rose-400 font-bold">{formatNumber(stats.vsAiMedium.losses)} {t('lossShort', 'D')}</span>
            </div>
          </div>

          {/* AI Hard */}
          <div className="flex items-center justify-between py-2">
            <span className="font-semibold text-gray-300">{t('aiHard', '🤖 Ordinateur — Difficile')}</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{formatNumber(stats.vsAiHard.wins)} {t('winShort', 'V')}</span>
              <span className="text-gray-500">/</span>
              <span className="text-rose-400 font-bold">{formatNumber(stats.vsAiHard.losses)} {t('lossShort', 'D')}</span>
            </div>
          </div>

          {/* Local 2-Player */}
          <div className="flex items-center justify-between py-2">
            <span className="font-semibold text-gray-300">{t('localMatch2P', '👥 Match Local (2 Joueurs)')}</span>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">
                {formatNumber(stats.vsLocal.wins + stats.vsLocal.losses)} {t('games', 'parties')}
              </span>
            </div>
          </div>

          {/* Online */}
          <div className="flex items-center justify-between py-2">
            <span className="font-semibold text-gray-300">{t('onlineMatches', '🌐 Parties en Ligne')}</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{formatNumber(stats.vsOnline.wins)} {t('winShort', 'V')}</span>
              <span className="text-gray-500">/</span>
              <span className="text-rose-400 font-bold">{formatNumber(stats.vsOnline.losses)} {t('lossShort', 'D')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reset stats button */}
      <div className="pt-2 flex justify-center">
        {showConfirmReset ? (
          <div className="bg-rose-950/80 border border-rose-500/40 p-3 rounded-xl flex items-center gap-3">
            <span className="text-xs text-rose-200">{t('confirmResetStats', 'Confirmer la remise à zéro ?')}</span>
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow"
            >
              {t('yesReset', 'Oui, réinitialiser')}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmReset(false)}
              className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold"
            >
              {t('cancel', 'Annuler')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowConfirmReset(true)}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('resetStats', 'Réinitialiser les statistiques')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
