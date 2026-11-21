import React from 'react';

interface SplashScreenSGProps {
  onSkip?: () => void;
}

export const SplashScreenSG: React.FC<SplashScreenSGProps> = ({ onSkip }) => {
  return (
    <div
      onClick={onSkip}
      className="fixed inset-0 z-50 bg-[#042f2e] flex items-center justify-center p-6 select-none overflow-hidden animate-fade-in cursor-pointer"
    >
      <img
        src="/logo-éditeur.png"
        alt="Éditeur"
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
};

export default SplashScreenSG;
