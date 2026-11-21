import React from 'react';
import { useTranslation } from '../i18n/useTranslation';

interface StartupSplashLogoProps {
  step: 'sg_publisher' | 'game_loading';
  progress: number;
  onSkip?: () => void;
}

export const StartupSplashLogo: React.FC<StartupSplashLogoProps> = ({
  step,
  progress,
  onSkip,
}) => {
  const { t } = useTranslation();

  // ─── ÉTAPE 1 : SPLASH SCREEN ÉDITEUR SG EXACT (2 SECONDES, FOND VERT ÉMERAUDE, SANS TEXTE) ───
  if (step === 'sg_publisher') {
    return (
      <div
        onClick={onSkip}
        className="fixed inset-0 z-50 bg-[#042f2e] flex items-center justify-center p-6 select-none overflow-hidden animate-fade-in cursor-pointer"
      >
        <img
          src="/logo-éditeur.png"
          alt={t('publisherStudio', 'Éditeur')}
          className="w-4/5 max-w-xs h-auto object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.95)]"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('publisher-logo')) {
              target.src = '/publisher-logo.png';
            }
          }}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // ─── ÉTAPE 2 : SPLASH SCREEN 12 PIONS (2 SECONDES, AVEC BARRE DE CHARGEMENT, AUCUN TEXTE AJOUTÉ) ───
  return (
    <div
      onClick={onSkip}
      className="fixed inset-0 z-50 bg-gradient-to-b from-[#02130d] via-[#042419] to-[#010c08] flex flex-col items-center justify-between py-12 px-6 cursor-pointer select-none overflow-hidden animate-fade-in"
    >
      <div className="flex-1 w-full max-w-sm sm:max-w-md flex flex-col items-center justify-center my-auto">
        <div className="w-64 h-64 sm:w-80 sm:h-80 relative flex items-center justify-center">
          <img
            src="/logo du jeu.png"
            alt="12 PIONS"
            className="w-full h-full object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.9)]"
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

      {/* ─── BOTTOM LOADING BAR (AUCUN TEXTE AJOUTÉ) ─── */}
      <div className="w-full max-w-xs flex flex-col items-center gap-2 relative z-20 pb-6">
        {/* 3D Golden Beveled Progress Bar */}
        <div className="w-full h-3 bg-[#02130d] border-2 border-amber-400/90 rounded-full p-0.5 shadow-[0_4px_14px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(0,0,0,0.9)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400 shadow-[0_0_12px_rgba(245,197,24,0.9)] transition-all duration-150 relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
};
