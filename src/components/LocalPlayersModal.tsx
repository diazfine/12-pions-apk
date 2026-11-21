import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Play, Edit3 } from 'lucide-react';
import { useTranslation } from '../i18n';

interface LocalPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (p1Name: string, p2Name: string, firstTurnChoice: 'random' | 'green' | 'red') => void;
  defaultP1Name?: string;
  defaultP2Name?: string;
}

export const LocalPlayersModal: React.FC<LocalPlayersModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  defaultP1Name,
  defaultP2Name,
}) => {
  const { t } = useTranslation();

  const fallbackP1 = t('player1Default', 'Player 1');
  const fallbackP2 = t('player2Default', 'Player 2');

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
      fallbackP1.toLowerCase(), fallbackP2.toLowerCase(),
    ];
    return defaults.includes(n) || n === `joueur ${num}` || n === `player ${num}`;
  };

  const isDefault1 = (name?: string) => isDefaultName(name, 1);
  const isDefault2 = (name?: string) => isDefaultName(name, 2);

  const [p1Name, setP1Name] = useState<string>(isDefault1(defaultP1Name) ? fallbackP1 : (defaultP1Name || fallbackP1));
  const [p2Name, setP2Name] = useState<string>(isDefault2(defaultP2Name) ? fallbackP2 : (defaultP2Name || fallbackP2));
  const [startingTurnPref, setStartingTurnPref] = useState<'random' | 'green' | 'red'>('random');
  const p1InputRef = useRef<HTMLInputElement>(null);
  const p2InputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setP1Name(isDefault1(defaultP1Name) ? fallbackP1 : (defaultP1Name || fallbackP1));
      setP2Name(isDefault2(defaultP2Name) ? fallbackP2 : (defaultP2Name || fallbackP2));
    }
  }, [isOpen, defaultP1Name, defaultP2Name, fallbackP1, fallbackP2]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalP1 = p1Name.trim() || fallbackP1;
    const finalP2 = p2Name.trim() || fallbackP2;
    onStartGame(finalP1, finalP2, startingTurnPref);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="local-players-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in select-none"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-[#06241a] via-[#041a12] to-[#02100b] border-2 border-amber-400/60 rounded-3xl p-5 shadow-[0_10px_35px_rgba(0,0,0,0.85)] text-center relative overflow-hidden">
        {/* Glow corner accents */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-bl-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-tr-full pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close || 'Close'}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge & Title */}
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 border-2 border-white shadow-lg flex items-center justify-center text-slate-950 mb-3">
          <Users className="w-6 h-6" />
        </div>

        <h3 id="local-players-modal-title" className="text-lg font-black text-amber-300 uppercase tracking-wide">
          {t('localSetupTitle', 'LOCAL GAME • 2 PLAYERS')}
        </h3>
        <p className="text-xs text-gray-300 mt-1 mb-4 leading-relaxed">
          {t('localSetupDesc', 'Default names are Player 1 and Player 2. Click the edit icon to customize them.')}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
          {/* Joueur 1 (Verts) */}
          <div className="bg-[#052b1e]/80 border border-emerald-500/40 rounded-2xl p-3 flex flex-col gap-1.5 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-[#2E8B46] to-[#1E6B33] border border-white/50 inline-block shadow-sm" />
                {t('player1Label', 'PLAYER 1 (GREEN)')}
              </span>
              <button
                type="button"
                onClick={() => p1InputRef.current?.focus()}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                title={t('editBtn', 'Edit')}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t('editBtn', 'Edit')}</span>
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                ref={p1InputRef}
                type="text"
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                maxLength={20}
                placeholder={fallbackP1}
                className="w-full bg-black/40 border border-emerald-500/30 rounded-xl px-3 py-2 pr-9 text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => p1InputRef.current?.focus()}
                className="absolute right-2.5 p-1 text-gray-400 hover:text-amber-300 transition-colors cursor-pointer"
                title={t('editBtn', 'Edit')}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Joueur 2 (Rouges) */}
          <div className="bg-[#240a10]/80 border border-rose-500/40 rounded-2xl p-3 flex flex-col gap-1.5 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-rose-400 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-[#CF2F35] to-[#B31D22] border border-white/50 inline-block shadow-sm" />
                {t('player2Label', 'PLAYER 2 (RED)')}
              </span>
              <button
                type="button"
                onClick={() => p2InputRef.current?.focus()}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                title={t('editBtn', 'Edit')}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t('editBtn', 'Edit')}</span>
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                ref={p2InputRef}
                type="text"
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                maxLength={20}
                placeholder={fallbackP2}
                className="w-full bg-black/40 border border-rose-500/30 rounded-xl px-3 py-2 pr-9 text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => p2InputRef.current?.focus()}
                className="absolute right-2.5 p-1 text-gray-400 hover:text-amber-300 transition-colors cursor-pointer"
                title={t('editBtn', 'Edit')}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Qui commence ? */}
          <div className="bg-black/30 border border-amber-400/25 rounded-2xl p-2.5 flex flex-col gap-1.5">
            <span className="text-[10.5px] font-black text-amber-300 uppercase tracking-wider text-center">
              {t('whoStartsLabel', 'WHO STARTS THE GAME?')}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setStartingTurnPref('random')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-black border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  startingTurnPref === 'random'
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>🎲</span>
                <span>{t('randomLabel', 'Random')}</span>
              </button>

              <button
                type="button"
                onClick={() => setStartingTurnPref('green')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-black border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  startingTurnPref === 'green'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>🟢</span>
                <span className="truncate max-w-[80px]">{p1Name.trim() || fallbackP1}</span>
              </button>

              <button
                type="button"
                onClick={() => setStartingTurnPref('red')}
                className={`py-1.5 px-1 rounded-xl text-[10px] font-black border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  startingTurnPref === 'red'
                    ? 'bg-rose-500/25 border-rose-400 text-rose-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>🔴</span>
                <span className="truncate max-w-[80px]">{p2Name.trim() || fallbackP2}</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-colors cursor-pointer"
            >
              {t.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-105 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t.play || 'Play'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
