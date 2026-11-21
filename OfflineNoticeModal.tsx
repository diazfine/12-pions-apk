import React from 'react';
import { WifiOff, Users, Bot, X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface OfflineNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  modeTitle?: string;
  onPlayVsAi: () => void;
  onPlayLocal: () => void;
}

export const OfflineNoticeModal: React.FC<OfflineNoticeModalProps> = ({
  isOpen,
  onClose,
  modeTitle = 'En Ligne',
  onPlayVsAi,
  onPlayLocal,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#1c080d] via-[#120407] to-[#0a0204] border-2 border-rose-500/60 rounded-3xl p-5 shadow-[0_10px_35px_rgba(244,63,94,0.35)] text-center relative overflow-hidden text-[#f0e6c8]">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          aria-label={t('close', 'Fermer')}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 border-2 border-white/60 shadow-lg flex items-center justify-center text-white mb-3">
          <WifiOff className="w-7 h-7" />
        </div>

        <h3 className="text-base font-black text-rose-300 uppercase tracking-wide">
          {t('noInternetTitle', t('noInternetConnection', 'Pas de Connexion Internet'))}
        </h3>

        <div className="bg-rose-950/60 border border-rose-500/30 rounded-2xl p-3 my-3 text-left">
          <p className="text-xs text-gray-200 leading-relaxed font-medium">
            {t('noInternetDesc', t('offlineWarningMessage', 'Une connexion Internet active est nécessaire pour jouer en direct avec d’autres joueurs.'))}
          </p>
          <div className="mt-2 pt-2 border-t border-rose-500/20 text-[11px] text-emerald-300 flex items-center gap-1.5 font-bold">
            <span>✨</span>
            <span>{t('offlineReadyNotice', 'Les modes 100% Hors Ligne sont prêts à jouer !')}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onPlayVsAi();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 hover:brightness-110 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>{t('playVsAiBtn', t.vsComp || "Jouer contre l'Ordinateur")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onPlayLocal();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>{t('playLocalBtn', t.localPlay || 'Jeu Local (2 Joueurs)')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-colors cursor-pointer mt-1"
          >
            {t('understood', 'Compris, retour')}
          </button>
        </div>
      </div>
    </div>
  );
};
