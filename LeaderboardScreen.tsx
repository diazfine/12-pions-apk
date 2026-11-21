import React from 'react';
import { Translations } from '../utils/translations';
import { ArrowLeft, Trophy, Medal } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface LeaderboardScreenProps {
  t: Translations;
  onBack: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ t: propT, onBack }) => {
  const { t, formatNumber } = useTranslation();

  const players = [
    { rank: 1, name: 'DiawR', country: `🇸🇳 ${t('country_SN', 'Sénégal')}`, title: t('legend', propT?.legend || 'Légende'), badge: '👑', elo: 2380, winRate: '78%' },
    { rank: 2, name: 'KoulMB', country: `🇨🇮 ${t('country_CI', 'Côte d’Ivoire')}`, title: t('master', propT?.master || 'Maître'), badge: '💎', elo: 2145, winRate: '72%' },
    { rank: 3, name: 'ChenW', country: `🇨🇳 ${t('country_CN', 'Chine')}`, title: t('gold', propT?.gold || 'Or'), badge: '🥇', elo: 1820, winRate: '68%' },
    { rank: 4, name: 'AmadouM', country: `🇸🇳 ${t('country_SN', 'Sénégal')}`, title: t('gold', propT?.gold || 'Or'), badge: '🥇', elo: 1452, winRate: '61%', isMe: true },
    { rank: 5, name: 'TanakaH', country: `🇯🇵 ${t('country_JP', 'Japon')}`, title: t('silver', propT?.silver || 'Argent'), badge: '🥈', elo: 1245, winRate: '57%' },
    { rank: 6, name: 'FatoS', country: `🇲🇱 ${t('country_ML', 'Mali')}`, title: t('bronze', propT?.bronze || 'Bronze'), badge: '🥉', elo: 1180, winRate: '53%' },
    { rank: 7, name: 'OmarK', country: `🇲🇷 ${t('country_MR', 'Mauritanie')}`, title: t('bronze', propT?.bronze || 'Bronze'), badge: '🥉', elo: 1120, winRate: '51%' },
  ];

  return (
    <div className="w-full max-w-[480px] flex flex-col gap-4 py-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-[#041a12] px-3 py-1.5 rounded-lg border border-amber-500/30 shadow"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('home', propT?.home || 'Accueil')}</span>
        </button>
        <h2 className="text-lg font-black text-amber-400 tracking-wider flex items-center gap-1.5">
          <Trophy className="w-4 h-4" />
          <span>{t('leaderboardTitle', propT?.ranking ? propT.ranking.toUpperCase() : 'CLASSEMENT')}</span>
        </h2>
        <div className="w-16"></div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="bg-[#041a12]/95 border border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-[#062a1e] text-[10px] font-bold text-amber-400/80 uppercase tracking-wider border-b border-amber-500/20">
          <span className="col-span-2">{t('rankCol', '#')}</span>
          <span className="col-span-5">{t('playerCol', 'Joueur')}</span>
          <span className="col-span-3 text-right">{t('titleCol', 'Titre')}</span>
          <span className="col-span-2 text-right">{t('eloCol', 'ELO')}</span>
        </div>

        {/* Players List */}
        <div className="divide-y divide-amber-500/15">
          {players.map(p => (
            <div
              key={p.rank}
              className={`grid grid-cols-12 px-4 py-3 items-center text-xs transition-colors ${
                p.isMe
                  ? 'bg-amber-500/15 border-l-2 border-amber-400 font-bold'
                  : 'hover:bg-[#073224]'
              }`}
            >
              <div className="col-span-2 flex items-center gap-1.5">
                <span className="font-extrabold text-amber-300/80">{formatNumber(p.rank)}</span>
                <span className="text-sm">{p.badge}</span>
              </div>
              <div className="col-span-5 flex flex-col">
                <span className="text-[#f0e6c8] font-bold truncate flex items-center gap-1">
                  {p.name}
                  {p.isMe && <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 rounded">{t('meBadge', 'MOI')}</span>}
                </span>
                <span className="text-[10px] text-gray-400">{p.country}</span>
              </div>
              <div className="col-span-3 text-right">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  {p.title}
                </span>
              </div>
              <div className="col-span-2 text-right font-black text-amber-400">{formatNumber(p.elo)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 bg-[#041a12]/80 rounded-xl border border-amber-500/20 flex items-center gap-3 text-xs text-gray-300">
        <Medal className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <span>{t('leaderboardTip', 'Gagnez des parties contre l’ordinateur en mode Difficile pour augmenter votre score ELO !')}</span>
      </div>
    </div>
  );
};
