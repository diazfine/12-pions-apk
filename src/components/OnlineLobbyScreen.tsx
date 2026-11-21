import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check, Users, Sparkles, Wifi, Play, AlertCircle } from 'lucide-react';
import { PieceColor } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { copyTextSafely, getPublicAppUrl, isNativeCapacitorApp } from '../utils/serverConfig';

interface OnlineLobbyScreenProps {
  onBack: () => void;
  onStartOnlineGame: (roomId: string, isHost: boolean, color: PieceColor) => void;
}

export const OnlineLobbyScreen: React.FC<OnlineLobbyScreenProps> = ({
  onBack,
  onStartOnlineGame,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);

  // Generate random 6-character code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  useEffect(() => {
    // Check URL parameters for ?join=CODE or ?room=CODE
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('join') || params.get('room') || params.get('salon');
    if (roomFromUrl) {
      setInputCode(roomFromUrl.toUpperCase());
      setActiveTab('join');
    } else {
      setGeneratedCode(generateRoomCode());
    }
  }, []);

  const handleCopyLink = async () => {
    const baseUrl = getPublicAppUrl();
    const pathPart =
      typeof window !== 'undefined' && !isNativeCapacitorApp()
        ? window.location.pathname
        : '/';
    const url = `${baseUrl}${pathPart}?room=${generatedCode}`;
    const ok = await copyTextSafely(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleHostStart = () => {
    setIsWaiting(true);
    onStartOnlineGame(generatedCode, true, 'green');
  };

  const handleJoinStart = () => {
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;
    onStartOnlineGame(clean, false, 'red');
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-4 py-2 animate-fade-in select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('home', 'Menu')}</span>
        </button>

        <h2 className="text-base font-black text-amber-400 tracking-wider flex items-center gap-1.5">
          <Wifi className="w-4 h-4 text-amber-400" />
          <span>{t('onlineMultiplayerTitle', 'MULTIJOUEUR EN LIGNE')}</span>
        </h2>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-[#041a12] p-1.5 rounded-2xl border border-amber-500/25">
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'create'
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('createRoomTab', 'Créer un Salon')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('join')}
          className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'join'
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('joinRoomTab', 'Rejoindre')}</span>
        </button>
      </div>

      {/* CREATE TAB */}
      {activeTab === 'create' && (
        <div className="bg-[#041a12] border border-amber-500/25 rounded-2xl p-5 flex flex-col items-center text-center gap-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
            👑
          </div>

          <div>
            <h3 className="text-base font-black text-amber-300">{t('yourPrivateRoomCode', 'Votre Code de Salon Privé')}</h3>
            <p className="text-xs text-gray-400 mt-1">
              {t('shareCodeSub', 'Partagez ce code ou ce lien direct avec votre adversaire pour démarrer le duel.')}
            </p>
          </div>

          {/* Generated Room Code Display */}
          <div className="w-full bg-[#062a1e] border-2 border-dashed border-amber-500/40 rounded-2xl py-3 px-4 flex items-center justify-between">
            <span className="text-2xl font-mono font-black tracking-widest text-amber-400">
              {generatedCode}
            </span>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-amber-500/30"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('copiedLink', 'Lien copié !') : t('copyLink', 'Copier lien')}</span>
            </button>
          </div>

          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>
              {t('youPlayAsGreen', 'Vous jouerez avec les')}{' '}
              <strong>{t('greenPawnsLabel', 'Pions Verts 🟢')}</strong> {t('firstPlayerLabel', '(1er joueur)')}
            </span>
          </div>

          <button
            type="button"
            onClick={handleHostStart}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t('openRoomAndWait', "Ouvrir le salon & Attendre l'adversaire")}</span>
          </button>
        </div>
      )}

      {/* JOIN TAB */}
      {activeTab === 'join' && (
        <div className="bg-[#041a12] border border-amber-500/25 rounded-2xl p-5 flex flex-col items-center text-center gap-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
            ⚔️
          </div>

          <div>
            <h3 className="text-base font-black text-amber-300">{t('joinAGame', 'Rejoindre une Partie')}</h3>
            <p className="text-xs text-gray-400 mt-1">
              {t('enterCodeSub', 'Entrez le code à 6 caractères transmis par votre ami pour vous connecter.')}
            </p>
          </div>

          {/* Input field */}
          <div className="w-full">
            <input
              type="text"
              maxLength={8}
              placeholder={t('code6Placeholder', 'Ex : 123456')}
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              className="w-full bg-[#062a1e] border-2 border-amber-500/40 focus:border-amber-400 rounded-2xl py-3 px-4 text-center text-xl font-mono font-black tracking-widest text-amber-300 placeholder:text-gray-600 outline-none uppercase"
            />
          </div>

          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>
              {t('youJoinAsRed', 'Vous rejoindrez en tant que')}{' '}
              <strong>{t('redPawnsLabel', 'Pions Rouges 🔴')}</strong>
            </span>
          </div>

          <button
            type="button"
            disabled={!inputCode.trim()}
            onClick={handleJoinStart}
            className={`w-full py-3 rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all ${
              inputCode.trim()
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 active:scale-98 cursor-pointer'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>{t('joinRoomBtn', 'Rejoindre la salle')}</span>
          </button>
        </div>
      )}

      {/* Info notice */}
      <div className="bg-[#041a12]/70 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-gray-400">
        <AlertCircle className="w-4 h-4 text-amber-400/80 shrink-0 mt-0.5" />
        <p>
          {t('p2pNotice', 'Connexion multijoueur directe en temps réel (Broadcast / P2P). Vous pouvez également tester en ouvrant ce lien dans un deuxième onglet de votre navigateur !')}
        </p>
      </div>
    </div>
  );
};
