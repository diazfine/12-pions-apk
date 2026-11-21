import React from 'react';
import { PieceColor, Difficulty } from '../types';
import { Translations } from '../utils/translations';
import { Pause, RotateCcw, ArrowLeft, Settings, Volume2, VolumeX, Music, ClipboardList } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface GameHeaderProps {
  greenCount: number;
  redCount: number;
  turn: PieceColor;
  timerSec: number;
  timerOn: boolean;
  aiMode: boolean;
  aiDiff: Difficulty;
  playerColor: PieceColor;
  t: Translations;
  onMenuClick: () => void;
  onPauseClick: () => void;
  onResetClick: () => void;
  onSettingsClick: () => void;
  isOnlineMode?: boolean;
  isHistoryOpen?: boolean;
  onToggleHistory?: () => void;
  historyCount?: number;
  soundEnabled?: boolean;
  musicEnabled?: boolean;
  onToggleSound?: () => void;
  onToggleMusic?: () => void;
  player1Name?: string;
  player2Name?: string;
  onEditPlayerNames?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  greenCount,
  redCount,
  turn,
  timerSec,
  timerOn,
  aiMode,
  aiDiff,
  playerColor,
  t: propT,
  onMenuClick,
  onPauseClick,
  onResetClick,
  onSettingsClick,
  isOnlineMode = false,
  isHistoryOpen = false,
  onToggleHistory,
  historyCount = 0,
  soundEnabled = true,
  musicEnabled = true,
  onToggleSound,
  onToggleMusic,
  player1Name,
  player2Name,
}) => {
  const { t, formatNumber, language } = useTranslation();
  const isGreenTurn = turn === 'green';
  const timerWarning = timerSec <= 8 ? 'dang' : timerSec <= 15 ? 'warn' : 'normal';

  const getAiDiffLabel = (diff: Difficulty) => {
    const diffStr = diff === 'easy' ? (t.easy || 'Facile') : diff === 'hard' ? (t.hard || 'Difficile') : (t.medium || 'Moyen');
    const aiTag = t('aiShort', 'AI');
    if (language === 'AR') {
      return `${diffStr} (${aiTag})`;
    }
    return `${aiTag} ${diffStr}`;
  };

  const p1Default = t('player1Default', 'Player 1');
  const p2Default = t('player2Default', 'Player 2');
  const youLabel = (t.you || 'YOU').toUpperCase();

  const isDefaultName = (name?: string, num: 1 | 2 = 1) => {
    if (!name || !name.trim()) return true;
    const n = name.trim().toLowerCase();
    const defaults = [
      'joueur 1', 'joueur 2', 'player 1', 'player 2', 'jugador 1', 'jugador 2',
      'jogador 1', 'jogador 2', 'spieler 1', 'spieler 2', 'mchezaji 1', 'mchezaji 2',
      'poorkat 1', 'poorkat 2', 'po-kat 1', 'po-kat 2', '玩家 1', '玩家 2',
      'اللاعب ١', 'اللاعب ٢', 'اللاعب 1', 'اللاعب 2', 'giocatore 1', 'giocatore 2',
      'игрок 1', 'игрок 2', 'プレイヤー 1', 'プレイヤー 2', '플레이어 1', '플레이어 2',
      'खिलाड़ी 1', 'खिलाड़ी 2', 'খেলোয়াড় ১', 'খেলোয়াড় ২', 'oyuncu 1', 'oyuncu 2',
      'pemain 1', 'pemain 2', 'người chơi 1', 'người chơi 2',
      p1Default.toLowerCase(), p2Default.toLowerCase(),
    ];
    return defaults.includes(n) || n === `joueur ${num}` || n === `player ${num}`;
  };

  const isDefaultP1 = isDefaultName(player1Name, 1);
  const isDefaultP2 = isDefaultName(player2Name, 2);

  const greenDisplayName = aiMode
    ? (playerColor === 'green' ? youLabel : getAiDiffLabel(aiDiff))
    : (isDefaultP1 ? p1Default : player1Name!.trim());

  const redDisplayName = aiMode
    ? (playerColor === 'red' ? youLabel : getAiDiffLabel(aiDiff))
    : (isDefaultP2 ? p2Default : player2Name!.trim());

  return (
    <div className="w-full max-w-[440px] flex flex-col gap-2 select-none">
      {/* ─── TOP HEADER: Aligned [Accueil], [Nouvelle Partie], [Conseils] on Left, Mode & Controls on Right ─── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#052118]/95 backdrop-blur-md rounded-2xl border border-amber-500/35 shadow-lg">
        {/* Left Action Buttons Group */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-gradient-to-b from-[#0e4835] to-[#06241a] hover:from-[#135d44] hover:to-[#093223] px-2.5 py-1.5 rounded-xl border border-amber-500/35 shadow-sm transition-all active:scale-95 cursor-pointer"
            title={t.home}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.home}</span>
          </button>

          <button
            type="button"
            onClick={onResetClick}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-gradient-to-b from-[#0e4835] to-[#06241a] hover:from-[#135d44] hover:to-[#093223] px-2.5 py-1.5 rounded-xl border border-amber-500/35 shadow-sm transition-all active:scale-95 cursor-pointer"
            title={t.newGame}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{t.newGame}</span>
          </button>
        </div>

        {/* Right Mode Indicator & Settings Controls */}
        <div className="flex items-center gap-1.5">
          {aiMode ? (
            <span className="text-[10px] font-bold text-amber-300 bg-[#0a3325] px-2 py-1 rounded-lg border border-amber-400/40">
              🤖 {getAiDiffLabel(aiDiff)}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-amber-300 bg-[#0a3325] px-2 py-1 rounded-lg border border-amber-400/40">
              👥 {t('twoPlayersShort', `${formatNumber(2)}P`)}
            </span>
          )}

          {isOnlineMode ? (
            <>
              <button
                type="button"
                onClick={onToggleSound}
                className={`p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  soundEnabled
                    ? 'text-emerald-300 bg-[#0e4835] hover:bg-[#135d44] border-emerald-500/40'
                    : 'text-rose-300 bg-[#1d1113] hover:bg-[#2a171a] border-rose-500/40'
                }`}
                title={t('tooltipMuteSfx', 'Couper / Activer les sons')}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={onToggleMusic}
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
                onClick={onToggleHistory}
                className={`relative p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  isHistoryOpen
                    ? 'text-slate-950 bg-amber-400 hover:bg-amber-300 border-amber-200 shadow-md'
                    : 'text-amber-200 hover:text-white bg-[#0e4835] hover:bg-[#135d44] border-amber-500/35'
                }`}
                title={t('tooltipCombinedHistory', 'Historique des coups et captures')}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                {historyCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black flex items-center justify-center">
                    {historyCount > 99 ? '99+' : formatNumber(historyCount)}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onPauseClick}
                className="p-1.5 text-amber-200 hover:text-white bg-[#0e4835] hover:bg-[#135d44] rounded-xl border border-amber-500/35 transition-all active:scale-95 cursor-pointer"
                title={t.pause}
              >
                <Pause className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onSettingsClick}
                className="p-1.5 text-amber-200 hover:text-white bg-[#0e4835] hover:bg-[#135d44] rounded-xl border border-amber-500/35 transition-all active:scale-95 cursor-pointer"
                title={t.settings}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── SCORE CARDS & CENTRAL 30s ARCADE TIMER RING ─── */}
      <div className="flex items-center justify-between px-1 py-0.5 gap-2">
        {/* Green Player Column (Name above Count Box) */}
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-1 px-1">
            <span className="text-[11px] font-black tracking-wide text-emerald-400 uppercase">
              {greenDisplayName}
            </span>
          </div>

          {/* Case de décompte des pions Verts */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-all duration-200 border-2 ${
              isGreenTurn
                ? `bg-gradient-to-r from-emerald-950 via-[#0a3827] to-emerald-950 border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.55)] scale-102 ring-2 ${
                    isOnlineMode && playerColor === 'green'
                      ? 'ring-emerald-300/80 animate-pulse'
                      : 'ring-emerald-500/30'
                  }`
                : 'bg-[#041a12]/90 border-amber-500/20 opacity-60'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#2E8B46] to-[#1E6B33] border-[1.5px] border-[#134923] shadow-md flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-white/20"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-emerald-300 leading-none">
                {formatNumber(greenCount)}
              </span>
              <span className="text-[8.5px] font-bold text-emerald-400/85 uppercase tracking-wider mt-0.5">
                {t.green}
              </span>
            </div>
          </div>
        </div>

        {/* Circular Timer in Center - Ludo King Arcade Ring */}
        <div className="flex flex-col items-center justify-center">
          <div
            className={`w-11 h-11 rounded-full flex flex-col items-center justify-center font-black border-2 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${
              !timerOn
                ? 'border-amber-500/20 text-gray-500 bg-[#041a12]'
                : timerWarning === 'dang'
                ? 'border-rose-500 text-rose-300 bg-rose-950/70 ring-2 ring-rose-500 animate-pulse'
                : timerWarning === 'warn'
                ? 'border-amber-400 text-amber-300 bg-amber-950/60'
                : 'border-amber-400/80 text-amber-300 bg-gradient-to-b from-[#0a3827] to-[#041a12]'
            }`}
          >
            <span className="leading-none text-base font-mono">
              {timerOn ? formatNumber(timerSec) : '--'}
            </span>
            <span className="text-[6.5px] text-amber-300/70 uppercase tracking-tighter">
              {t('secondsShort', 'SEC')}
            </span>
          </div>
          <span className="text-[8.5px] font-black text-amber-300/90 mt-0.5 uppercase tracking-wider">
            {isGreenTurn ? t.tG : t.tR}
          </span>
        </div>

        {/* Red Player Column (Name above Count Box) */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 px-1">
            <span className="text-[11px] font-black tracking-wide text-rose-400 uppercase">
              {redDisplayName}
            </span>
          </div>

          {/* Case de décompte des pions Rouges */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-all duration-200 border-2 ${
              !isGreenTurn
                ? `bg-gradient-to-r from-rose-950 via-[#2f0c13] to-rose-950 border-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.55)] scale-102 ring-2 ${
                    isOnlineMode && playerColor === 'red'
                      ? 'ring-rose-300/80 animate-pulse'
                      : 'ring-rose-500/30'
                  }`
                : 'bg-[#041a12]/90 border-amber-500/20 opacity-60'
            }`}
          >
            <div className="flex flex-col text-right">
              <span className="text-lg font-black text-rose-300 leading-none">
                {formatNumber(redCount)}
              </span>
              <span className="text-[8.5px] font-bold text-rose-400/85 uppercase tracking-wider mt-0.5">
                {t.red}
              </span>
            </div>
            <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#CF2F35] to-[#B31D22] border-[1.5px] border-[#781216] shadow-md flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-white/20"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
