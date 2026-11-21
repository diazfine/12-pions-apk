import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Wifi, Loader2, X, Sparkles, Check } from 'lucide-react';
import { PieceColor } from '../types';
import { OnlineChannel } from '../utils/onlineChannel';
import { sound } from '../utils/audio';
import { useTranslation } from '../i18n/useTranslation';

interface OnlineMatchmakingScreenProps {
  onBack: () => void;
  onStartGame: (roomId: string, isHost: boolean, color: PieceColor, existingChannel?: OnlineChannel, startingTurn?: PieceColor) => void;
  playerName?: string;
  t?: any;
}

export const OnlineMatchmakingScreen: React.FC<OnlineMatchmakingScreenProps> = ({
  onBack,
  onStartGame,
  playerName = 'Joueur',
  t: propT,
}) => {
  const { t: contextT, formatTime } = useTranslation();
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
  const [preferredColor, setPreferredColor] = useState<'green' | 'red' | 'random'>('random');
  const [searchTimer, setSearchTimer] = useState(0);
  const channelRef = useRef<OnlineChannel | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const hasGameStartedRef = useRef<boolean>(false);

  // Initialisation de la recherche avec la couleur sélectionnée
  useEffect(() => {
    hasGameStartedRef.current = false;
    setSearchTimer(0);

    // Démarrage du compteur de secondes
    timerIntervalRef.current = window.setInterval(() => {
      setSearchTimer(prev => prev + 1);
    }, 1000);

    const channel = new OnlineChannel('', false, 'green');
    channelRef.current = channel;

    // Association immédiate : Dès qu'un 2nd joueur arrive, le serveur émet MATCH_FOUND & START_MATCH
    channel.onMatchFound = (data) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      const isHost = data.role === 'host';
      const assignedColor: PieceColor = data.myColor || (isHost ? 'green' : 'red');
      const startTurn: PieceColor = (data.startingTurn || (data as any).currentTurn || 'green') as PieceColor;

      sound.stopVictoryCelebrationLoop(true);
      sound.playStartSound();
      hasGameStartedRef.current = true;
      onStartGame(data.roomId, isHost, assignedColor, channel, startTurn);
    };

    channel.startMatchmaking('closest', playerName, preferredColor);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (channelRef.current && !hasGameStartedRef.current) {
        channelRef.current.cancelMatchmaking();
        channelRef.current.destroy();
        channelRef.current = null;
      }
    };
  }, [onStartGame, playerName, preferredColor]);

  const handleColorChange = (color: 'green' | 'red' | 'random') => {
    if (color === preferredColor) return;
    sound.playSelect();
    setPreferredColor(color);
    if (channelRef.current) {
      channelRef.current.startMatchmaking('closest', playerName, color);
    }
  };

  const handleCancel = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.cancelMatchmaking();
      channelRef.current.destroy();
      channelRef.current = null;
    }
    onBack();
  };

  return (
    <div className="w-full max-w-sm flex flex-col items-center justify-center min-h-[65vh] py-4 animate-fade-in select-none mx-auto px-3">
      {/* CARD DE RECHERCHE D'ADVERSAIRE EN LIGNE */}
      <div className="w-full bg-gradient-to-b from-[#0a3828] via-[#06241b] to-[#03150f] border-2 border-amber-400/80 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(245,197,24,0.25)] flex flex-col items-center text-center gap-5 relative overflow-hidden">
        
        {/* Top Gold Ribbon */}
        <div className="w-full -mt-2 py-1 px-4 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-lg shadow-md flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-current" />
          <span className="text-[11px] font-black text-slate-950 uppercase tracking-widest">
            {t.online || 'Partie En Ligne 1v1'}
          </span>
        </div>

        {/* 🎯 SÉLECTION PRÉALABLE DES COULEURS DE JEU */}
        <div className="w-full flex flex-col items-center gap-2 bg-[#041a12]/80 p-3 rounded-2xl border border-amber-400/30">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
            {t('yourColorPreference', 'Couleur de vos pions')}
          </span>
          <div className="grid grid-cols-3 gap-2 w-full">
            {/* Verts */}
            <button
              type="button"
              onClick={() => handleColorChange('green')}
              className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                preferredColor === 'green'
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-emerald-500/40 hover:text-emerald-300'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow flex items-center justify-center">
                {preferredColor === 'green' && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-[10px] font-black">{t.green || 'Verts'}</span>
            </button>

            {/* Rouges */}
            <button
              type="button"
              onClick={() => handleColorChange('red')}
              className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                preferredColor === 'red'
                  ? 'bg-rose-500/25 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-rose-500/40 hover:text-rose-300'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 shadow flex items-center justify-center">
                {preferredColor === 'red' && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-[10px] font-black">{t.red || 'Rouges'}</span>
            </button>

            {/* Aléatoire */}
            <button
              type="button"
              onClick={() => handleColorChange('random')}
              className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                preferredColor === 'random'
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,197,24,0.4)]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-amber-500/40 hover:text-amber-300'
              }`}
            >
              <span className="text-sm leading-none">🎲</span>
              <span className="text-[10px] font-black">{t('randomColor', 'Aléatoire')}</span>
            </button>
          </div>
        </div>

        {/* Animated Radar Pulse */}
        <div className="relative w-32 h-32 flex items-center justify-center my-1">
          {/* Ondes concentriques */}
          <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-ping" />
          <div className="absolute inset-3 rounded-full border border-amber-400/30" />
          <div className="absolute inset-6 rounded-full border border-amber-400/40" />
          <div className="absolute inset-9 rounded-full border border-amber-400/50" />
          
          {/* Balayage radar */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-amber-400/20 to-transparent animate-spin duration-1000 pointer-events-none" />

          {/* Icône centrale */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border-2 border-amber-200 flex items-center justify-center text-slate-950 font-black shadow-[0_0_25px_rgba(245,197,24,0.6)] z-10">
            <Wifi className="w-7 h-7 animate-pulse text-slate-950" />
          </div>
        </div>

        {/* Message de recherche */}
        <div className="flex flex-col items-center gap-1">
          <h3 className="text-sm sm:text-base font-black text-amber-300">
            {t('searchingOpponent', 'Recherche d’un adversaire mondial...')}
          </h3>
          <p className="text-[11px] text-gray-300/80 max-w-[240px]">
            {t('connectingServer', 'Connexion en direct • Serveur 1v1')}
          </p>
          <div className="mt-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3.5 py-1 rounded-full border border-emerald-500/40 inline-flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>{formatTime(searchTimer)}</span>
          </div>
        </div>

        {/* Bouton Annuler (Retour au Menu Principal) */}
        <button
          type="button"
          onClick={handleCancel}
          className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-200 hover:text-white border border-white/15 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <X className="w-4 h-4 text-gray-400" />
          <span>{t.cancel || 'Annuler la recherche'}</span>
        </button>
      </div>
    </div>
  );
};
