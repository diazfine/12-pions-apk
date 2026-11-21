import React, { useState } from 'react';
import {
  X as CloseIcon,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Share2,
} from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface ShareSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  userFriendCode?: string;
  onShowToast: (msg: string) => void;
  onOpenPromoVideo?: () => void;
}

// ─── OFFICIAL VECTOR BRAND LOGOS ───

// Official WhatsApp Logo (authentic phone in speech bubble)
const WhatsAppOfficialLogo = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="23" fill="#25D366" />
    <path
      d="M34.5 13.5C31.7 10.7 28 9.2 24 9.2C15.8 9.2 9.2 15.8 9.2 24C9.2 26.6 9.9 29.2 11.2 31.5L9 39.5L17.3 37.3C19.4 38.5 21.7 39.1 24 39.1C32.2 39.1 38.8 32.5 38.8 24.3C38.8 20.3 37.2 16.3 34.5 13.5ZM24 36.6C22 36.6 20 36.1 18.2 35L17.8 34.8L12.9 36.1L14.2 31.3L13.9 30.9C12.7 28.8 12.1 26.4 12.1 24C12.1 17.4 17.4 12.1 24 12.1C27.2 12.1 30.2 13.3 32.4 15.6C34.7 17.8 35.9 20.8 35.9 24C35.9 30.9 30.6 36.6 24 36.6ZM30.5 27.2C30.1 27 28.3 26.1 28 26C27.6 25.8 27.4 25.7 27.1 26.1C26.9 26.5 26.1 27.5 25.9 27.8C25.6 28.1 25.4 28.1 25 27.9C24.6 27.7 23.3 27.3 21.8 25.9C20.6 24.8 19.8 23.5 19.6 23.1C19.4 22.7 19.6 22.5 19.8 22.3C20 22.1 20.2 21.8 20.4 21.6C20.6 21.4 20.7 21.2 20.8 20.9C20.9 20.6 20.9 20.4 20.8 20.2C20.7 20 20.1 18.5 19.8 17.9C19.5 17.3 19.3 17.4 19.1 17.4C18.9 17.4 18.6 17.4 18.4 17.4C18.1 17.4 17.8 17.5 17.5 17.8C17.2 18.1 16.4 18.9 16.4 20.5C16.4 22.1 17.6 23.6 17.7 23.8C17.9 24 20 27.2 23.2 28.6C24 28.9 24.6 29.1 25.1 29.3C25.9 29.5 26.6 29.5 27.2 29.4C27.8 29.3 29.1 28.6 29.4 27.8C29.7 26.9 29.7 26.2 29.6 26.1C29.5 25.9 29.3 25.8 29 25.6L30.5 27.2Z"
      fill="white"
    />
  </svg>
);

// Official SMS / Messages App Logo (authentic iOS/Android messaging bubble)
const SMSOfficialLogo = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#007AFF" />
    <path
      d="M36 22C36 16.477 30.627 12 24 12C17.373 12 12 16.477 12 22C12 25.26 13.882 28.163 16.855 30.013C16.634 31.42 15.932 32.96 14.536 34.542C14.288 34.823 14.475 35.268 14.848 35.268C17.595 35.268 20.303 33.916 21.737 32.748C22.474 32.88 23.228 32.952 24 32.952C30.627 32.952 36 28.475 36 22Z"
      fill="white"
    />
    <circle cx="18.5" cy="22" r="1.8" fill="#007AFF" />
    <circle cx="24" cy="22" r="1.8" fill="#007AFF" />
    <circle cx="29.5" cy="22" r="1.8" fill="#007AFF" />
  </svg>
);

// Official Facebook Logo (authentic meta blue roundel with white bold 'f')
const FacebookOfficialLogo = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="23" fill="#1877F2" />
    <path
      d="M26.8 38V24.5H31.3L32 19.2H26.8V15.8C26.8 14.3 27.2 13.2 29.5 13.2H32.2V8.5C31.7 8.4 30.1 8.2 28.1 8.2C24.1 8.2 21.3 10.6 21.3 15.1V19.2H16.8V24.5H21.3V38H26.8Z"
      fill="white"
    />
  </svg>
);

// Official Telegram Logo (authentic blue circle with white paper plane)
const TelegramOfficialLogo = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="23" fill="#2AABEE" />
    <path
      d="M11 23.3L34.6 14.2C35.7 13.8 36.7 14.5 36.3 15.8L32.3 34.6C32 35.9 31.2 36.2 30.1 35.6L24 31.1L21.1 33.9C20.8 34.2 20.5 34.5 19.9 34.5L20.3 28.5L31.2 18.6C31.7 18.1 31.1 17.8 30.4 18.2L16.9 26.7L11.1 24.9C9.8 24.5 9.8 23.6 11 23.3Z"
      fill="white"
    />
  </svg>
);

// Official X (formerly Twitter) Logo (authentic mathematical stylized 𝕏)
const XOfficialLogo = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#000000" />
    <path
      d="M28.6 21.6L36.9 12H34.9L27.7 20.4L22 12H15.1L23.8 24.6L15.1 34.7H17.1L24.7 25.8L30.7 34.7H37.6L28.6 21.6ZM25.7 24.7L24.8 23.4L17.8 13.5H20.9L26.5 21.4L27.4 22.7L34.9 33.3H31.8L25.7 24.7Z"
      fill="white"
    />
  </svg>
);

// Official Email Logo (Google / Apple Mail gradient envelope)
const EmailOfficialLogo = () => (
  <svg viewBox="0 0 48 48" className="w-6 h-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#EA4335" />
    <path
      d="M36 15H12C10.9 15 10 15.9 10 17V31C10 32.1 10.9 33 12 33H36C37.1 33 38 32.1 38 31V17C38 15.9 37.1 15 36 15ZM35.2 17L24 24L12.8 17H35.2ZM36 31H12V18.8L24 26.2L36 18.8V31Z"
      fill="white"
    />
  </svg>
);

export const ShareSocialModal: React.FC<ShareSocialModalProps> = ({
  isOpen,
  onClose,
  userFriendCode = 'PION-2026',
  onShowToast,
  onOpenPromoVideo,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://12pions.app';
  const shareText = `👑 ${t.shareMessageText || 'Rejoins-moi sur 12 PIONS - Jeu de Stratégie Royal ! Affronte-moi avec mon code joueur :'} ${userFriendCode} ! ${t.play || 'Joue dès maintenant'} : ${appUrl}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(appUrl);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        onShowToast(t.shareCopied || 'Lien copié dans le presse-papier !');
        setTimeout(() => setCopied(false), 3000);
      } else {
        onShowToast(t.toastClipboardUnavailable || 'Presse-papier non disponible.');
      }
    } catch {
      onShowToast(t.toastLinkCopyFailed || 'Impossible de copier le lien.');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: '12 PIONS',
          text: `👑 ${t.shareMessageText || 'Viens jouer à 12 PIONS ! Mon code :'} ${userFriendCode}`,
          url: appUrl,
        });
        onShowToast(t.shareCopied || 'Partage ouvert !');
      } catch {
        // Dismissed or unsupported
      }
    } else {
      handleCopyLink();
    }
  };

  const shareNetworks = [
    {
      name: 'WhatsApp',
      Logo: WhatsAppOfficialLogo,
      color: 'bg-[#25D366] hover:bg-[#20bd5a]',
      border: 'border-emerald-300',
      action: () => {
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
        onShowToast((t.toastOpeningApp || 'Ouverture de {app}...').replace('{app}', 'WhatsApp'));
      },
    },
    {
      name: 'SMS / Message',
      Logo: SMSOfficialLogo,
      color: 'bg-[#007AFF] hover:bg-[#0069dc]',
      border: 'border-sky-300',
      action: () => {
        window.location.href = `sms:?body=${encodedText}`;
        onShowToast((t.toastOpeningApp || 'Ouverture de {app}...').replace('{app}', 'SMS / Messages'));
      },
    },
    {
      name: 'Facebook',
      Logo: FacebookOfficialLogo,
      color: 'bg-[#1877F2] hover:bg-[#1464cc]',
      border: 'border-blue-300',
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
          '_blank'
        );
        onShowToast((t.toastOpeningApp || 'Ouverture de {app}...').replace('{app}', 'Facebook'));
      },
    },
    {
      name: 'Telegram',
      Logo: TelegramOfficialLogo,
      color: 'bg-[#2AABEE] hover:bg-[#2395d3]',
      border: 'border-cyan-300',
      action: () => {
        window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
        onShowToast((t.toastOpeningApp || 'Ouverture de {app}...').replace('{app}', 'Telegram'));
      },
    },
    {
      name: 'X (Twitter)',
      Logo: XOfficialLogo,
      color: 'bg-black hover:bg-neutral-900',
      border: 'border-slate-500',
      action: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank');
        onShowToast((t.toastOpeningApp || 'Ouverture de {app}...').replace('{app}', 'X (Twitter)'));
      },
    },
    {
      name: 'E-mail',
      Logo: EmailOfficialLogo,
      color: 'bg-[#EA4335] hover:bg-[#d3382b]',
      border: 'border-rose-300',
      action: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(
          t.emailShareSubject || 'Invitation à jouer à 12 PIONS - Jeu de Stratégie Royal'
        )}&body=${encodedText}`;
        onShowToast((t.toastOpeningApp || 'Ouverture de {app}...').replace('{app}', 'E-mail'));
      },
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#093526] via-[#052319] to-[#02130e] border-2 border-amber-400 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(245,197,24,0.35)] flex flex-col overflow-hidden text-[#f0e6c8]">
        {/* Header Ribbon */}
        <div className="relative px-4 py-3 bg-gradient-to-r from-[#041d14] via-[#083b2a] to-[#041d14] border-b border-amber-500/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/80 flex items-center justify-center text-amber-300 shadow">
              <Share2 className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2
                id="share-modal-title"
                className="text-sm font-black text-amber-300 uppercase tracking-wider"
              >
                {t.shareTitle || "Partager l'Application"}
              </h2>
              <p className="text-[10px] text-amber-200/80">
                {t.shareSubtitle || "Invitez vos amis & gagnez +10 000 pièces royales !"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close || "Fermer la fenêtre de partage"}
            className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          {/* 🌟 LOGO OFFICIEL DU JEU AU-DESSUS DU TEXTE (EXIGENCE EXPLICITE) */}
          <div className="bg-gradient-to-b from-[#041d14] via-[#02130d] to-[#041d14] border border-amber-400/50 rounded-2xl p-3 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
            <div className="w-32 sm:w-36 h-auto flex items-center justify-center mb-1">
              <img
                src="/logo du jeu.png"
                alt="Logo 12 PIONS"
                className="w-full h-auto object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('game-logo')) {
                    target.src = '/game-logo.png';
                  }
                }}
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-[11px] font-semibold text-amber-200/90 leading-tight px-1">
              👑 {t.shareMessageText || 'Rejoins-moi sur 12 PIONS - Jeu de Stratégie Royal ! Affronte-moi avec mon code :'} <strong className="text-amber-300 font-mono">{userFriendCode}</strong>
            </p>
          </div>

          {/* Invitation Bonus Card */}
          <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-400/40 rounded-xl p-2.5 flex items-center gap-2.5 shadow-inner">
            <div className="text-2xl animate-bounce">🎁</div>
            <div className="flex-1">
              <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                {t.shareBonusCardTitle || "Bonus d'Invitation Royale"}
              </p>
              <p className="text-[10px] text-amber-100/90 leading-tight">
                {t.shareBonusCardDesc || "Chaque ami qui rejoint avec votre code vous rapporte +10 000 pièces !"}
              </p>
            </div>
          </div>

          {/* Social Network Buttons with OFFICIAL LOGOS */}
          <div className="grid grid-cols-3 gap-2">
            {shareNetworks.map((net) => {
              const LogoComp = net.Logo;
              return (
                <button
                  key={net.name}
                  type="button"
                  onClick={net.action}
                  className={`group relative p-2.5 rounded-xl border ${net.border} ${net.color} shadow-[0_4px_12px_rgba(0,0,0,0.6)] hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer`}
                >
                  <div className="drop-shadow-md">
                    <LogoComp />
                  </div>
                  <span className="text-[10px] font-black text-white tracking-tight drop-shadow leading-tight">
                    {net.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Native System Share / Quick Copy */}
          <div className="space-y-2 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>{t.shareQuickNative || 'Menu de Partage Système'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-2 px-3 rounded-xl bg-black/40 hover:bg-black/60 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">{t.shareCopied || 'Lien copié dans le presse-papier !'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-300" />
                  <span>{t.shareCopyCodeBtn || 'Copier le lien & code'} ({userFriendCode})</span>
                </>
              )}
            </button>

            {onOpenPromoVideo && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPromoVideo();
                }}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>🎬</span>
                <span>{t.downloadPromoVideoBtn || 'Télécharger le Spot Publicitaire Vidéo (.webm)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#02130c] border-t border-white/10 text-center">
          <p className="text-[9px] text-amber-300/70 font-semibold flex items-center justify-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>12 PIONS · {t.tagline || 'Jeu de Stratégie Royal'}</span>
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          </p>
        </div>
      </div>
    </div>
  );
};
