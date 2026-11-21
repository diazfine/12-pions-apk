import React, { useState } from 'react';
import { AlertCircle, Mail, UserCheck } from 'lucide-react';
import { UserProfile } from '../types';
import {
  signInWithNativeGoogle,
  signInWithNativeFacebook,
  signInWithNativeApple,
  signInWithEmail,
  saveSessionToken,
} from '../utils/nativeAuth';
import {
  beginInteractiveAuthSync,
  endInteractiveAuthSync,
  syncGoogleUserToFirestore,
} from '../services/firebaseProfile';
import { TermsModal } from './TermsModal';

interface AuthOnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: UserProfile) => void;
  userProfile: UserProfile;
  t: (key: string, defaultVal?: string) => string;
}

export const AuthOnboardingModal: React.FC<AuthOnboardingModalProps> = ({
  isOpen,
  onComplete,
  userProfile,
  t,
}) => {
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [playerNameInput, setPlayerNameInput] = useState<string>('Champion_Royal');
  const [showEmailInput, setShowEmailInput] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const completeGuestProfile = (name: string) => {
    setAuthError(null);
    setIsLoading(true);
    setStatusMessage(t('configuringAccount', 'Configuration de votre compte invité...'));

    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const guestPrefix = t('guest', 'Invité');
    const updated: UserProfile = {
      ...userProfile,
      name: name.trim() || `${guestPrefix}_${codeNum}`,
      avatar: '🦅',
      flag: userProfile.flag || '🇸🇳',
      countryName: userProfile.countryName || t('country_SN', 'Sénégal'),
      authProvider: 'guest',
      coins: (userProfile.coins || 0) + 1000,
      gems: (userProfile.gems || 0) + 10,
      level: Math.max(1, userProfile.level || 1),
      xp: Math.max(100, userProfile.xp || 100),
      friendCode: userProfile.friendCode || `PION-${codeNum}`,
      welcomeBonusClaimed: true,
    };

    try {
      saveSessionToken('guest_local_session', {
        id: `guest_${Date.now()}`,
        name: updated.name,
        imageUrl: updated.avatar,
        provider: 'guest',
      });
      localStorage.setItem('auth_onboarding_completed', 'true');
      localStorage.setItem('is_first_launch', 'true');
      localStorage.setItem('dama_user_profile_v2', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setIsLoading(false);
    onComplete(updated);
  };

  const handleGoogleSignIn = async () => {
    if (!acceptedTerms || isLoading) return;
    setAuthError(null);
    setIsLoading(true);
    setStatusMessage(t('connectingGoogle', 'Connexion sécurisée avec Google...'));
    beginInteractiveAuthSync();

    try {
      const user = await signInWithNativeGoogle();
      if (!user.firebaseUser) {
        throw new Error('Authentification Firebase Google incomplète.');
      }

      setStatusMessage('Synchronisation de votre profil avec Firebase Cloud...');
      const customPseudo = playerNameInput.trim();
      const baseLocalProfile: UserProfile = {
        ...userProfile,
        name:
          customPseudo && customPseudo !== 'Champion_Royal'
            ? customPseudo
            : user.name || userProfile.name,
        email: user.email || userProfile.email,
        customPhoto: user.imageUrl || userProfile.customPhoto,
      };

      const synced = await syncGoogleUserToFirestore(user.firebaseUser, baseLocalProfile, {
        grantFirstTimeBonus: true,
      });

      saveSessionToken('firebase_google_session', {
        id: user.id,
        name: synced.profile.name,
        email: synced.profile.email,
        imageUrl: synced.profile.customPhoto || synced.profile.avatar,
        provider: 'google',
      });
      localStorage.setItem('auth_onboarding_completed', 'true');
      localStorage.setItem('is_first_launch', 'true');

      setIsLoading(false);
      onComplete(synced.profile);
    } catch (err) {
      // Strictly NO fake fallback account and NO free coins on failure or cancel
      setIsLoading(false);
      setStatusMessage('');
      setAuthError(
        err instanceof Error
          ? err.message
          : 'La connexion Google a échoué ou a été annulée. Aucun compte n’a été synchronisé.'
      );
    } finally {
      endInteractiveAuthSync();
    }
  };

  const handleAppleSignIn = async () => {
    if (!acceptedTerms || isLoading) return;
    setAuthError(null);
    setIsLoading(true);
    setStatusMessage(t('connectingApple', 'Connexion avec Apple (iOS / iCloud)...'));
    try {
      await signInWithNativeApple();
    } catch (err) {
      setIsLoading(false);
      setStatusMessage('');
      setAuthError(
        err instanceof Error
          ? err.message
          : 'La connexion Apple est indisponible sur cette version.'
      );
    }
  };

  const handleEmailSignIn = async () => {
    if (!acceptedTerms || isLoading) return;
    if (!emailInput.trim()) {
      setShowEmailInput(true);
      return;
    }
    setAuthError(null);
    setIsLoading(true);
    setStatusMessage(t('connectingEmail', 'Connexion par Email...'));
    try {
      await signInWithEmail(emailInput, playerNameInput);
    } catch (err) {
      setIsLoading(false);
      setStatusMessage('');
      setAuthError(
        err instanceof Error
          ? err.message
          : 'La connexion par E-mail n’est pas encore activée.'
      );
    }
  };

  const handleFacebookSignIn = async () => {
    if (!acceptedTerms || isLoading) return;
    setAuthError(null);
    setIsLoading(true);
    setStatusMessage(t('connectingFacebook', 'Connexion avec Facebook...'));
    try {
      await signInWithNativeFacebook();
    } catch (err) {
      setIsLoading(false);
      setStatusMessage('');
      setAuthError(
        err instanceof Error
          ? err.message
          : 'La connexion Facebook est indisponible sur cette version.'
      );
    }
  };

  const handleGuestSignIn = () => {
    if (!acceptedTerms || isLoading) return;
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const guestPrefix = t('guest', 'Invité');
    completeGuestProfile(playerNameInput.trim() || `${guestPrefix}_${codeNum}`);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md select-none animate-fade-in overflow-y-auto">
        <div className="w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#06241a] via-[#041a12] to-[#02100a] border-2 border-amber-400/70 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(245,197,24,0.3)] flex flex-col gap-3.5 text-center my-auto">
          {/* ─── HEADER: LOGO OFFICIEL 12 PIONS AU-DESSUS DU FORMULAIRE ─── */}
          <div className="w-full flex justify-center mt-0.5 mb-1">
            <img
              src="/logo du jeu.png"
              alt="Logo 12 PIONS"
              className="w-32 sm:w-36 h-auto object-contain mx-auto drop-shadow-md"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('game-logo')) {
                  target.src = '/game-logo.png';
                }
              }}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* 🎁 Welcome Pack Banner */}
          <div className="relative overflow-hidden p-2.5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-900/60 to-amber-950/80 border border-amber-400/60 shadow-inner flex items-center justify-between">
            <div className="flex items-center gap-2 text-left">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-md text-lg">
                🎁
              </div>
              <div>
                <div className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  {t('welcomePack', 'Pack de Bienvenue')}
                </div>
                <div className="text-[10px] text-gray-200 font-medium">
                  {t('welcomePackSub', 'Crédité dès votre inscription')}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs font-black text-yellow-300 flex items-center gap-1">
                🪙 +1 000
              </span>
              <span className="text-xs font-black text-sky-300 flex items-center gap-1">
                💎 +10
              </span>
            </div>
          </div>

          {/* Real Auth Error Banner (never fakes success) */}
          {authError && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-400/60 text-left flex items-start gap-2 text-[11px] text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Pseudo Player Input */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[11px] font-bold text-gray-300">
              {t('yourRoyalPseudo', 'Votre Pseudo :')}
            </label>
            <input
              type="text"
              value={playerNameInput}
              onChange={(e) => setPlayerNameInput(e.target.value)}
              placeholder={t('pseudoPlaceholder', 'Ex: Champion_Dakar')}
              maxLength={20}
              className="w-full bg-[#031810] border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 placeholder-gray-500 outline-none focus:border-amber-400"
            />
          </div>

          {/* Saisie d'email manuelle / universelle si activée */}
          {showEmailInput && (
            <div className="flex flex-col gap-1 text-left animate-fade-in">
              <label className="text-[11px] font-bold text-gray-300">
                {t('yourEmailAddress', 'Votre Adresse Email (Android, Apple, etc.) :')}
              </label>
              <div className="flex gap-1.5">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={t('emailPlaceholder', 'nom@exemple.com')}
                  className="flex-1 bg-[#031810] border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleEmailSignIn}
                  disabled={!emailInput.trim() || isLoading}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* ─── OPTIONS DE CONNEXION NATIVES & UNIVERSELLES ─── */}
          <div className="flex flex-col gap-2">
            {/* 1. Google / Gmail (Real Firebase Authentication) */}
            <button
              type="button"
              disabled={!acceptedTerms || isLoading}
              onClick={handleGoogleSignIn}
              className={`w-full py-2.5 px-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2.5 shadow-md transition-all ${
                acceptedTerms && !isLoading
                  ? 'bg-white hover:bg-gray-100 text-gray-900 active:scale-98 cursor-pointer'
                  : 'bg-white/20 text-gray-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{t('continueWithGoogle', 'Continuer par Mail Google')}</span>
            </button>

            {/* 2. Apple ID / iCloud Mail */}
            <button
              type="button"
              disabled={!acceptedTerms || isLoading}
              onClick={handleAppleSignIn}
              className={`w-full py-2.5 px-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2.5 shadow-md transition-all ${
                acceptedTerms && !isLoading
                  ? 'bg-black hover:bg-neutral-900 text-white border border-white/20 active:scale-98 cursor-pointer'
                  : 'bg-black/30 text-gray-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.93-12.04-14.54-6.02-9.22-10.74-19.8-14.16-31.73-3.41-11.93-5.13-23.01-5.13-33.24 0-14.57 3.63-26.4 10.89-35.48 7.26-9.08 16.32-13.68 27.18-13.8 5.02 0 10.59 1.34 16.71 4.02 6.12 2.68 10.14 4.07 12.06 4.18 1.48 0 5.66-1.45 12.54-4.35 6.88-2.9 12.71-4.14 17.5-3.73 13.06 1.05 23.36 6.04 30.9 14.97-11.51 7.03-17.15 16.79-16.92 29.28.23 10.13 4.14 18.57 11.73 25.32 4.12 3.73 8.84 6.46 14.16 8.19-2.81 8.35-6.24 16.95-10.29 25.8zM119.22 33.09c0-7.37 2.64-14.28 7.92-20.73 5.28-6.45 11.93-10.68 19.95-12.71.69 5.86-.68 12.04-4.11 18.54-3.43 6.5-8.37 11.22-14.82 14.16-1.57.73-3.26 1.25-5.07 1.56-.23-.27-.47-.54-.69-.82h-3.18z" />
              </svg>
              <span>{t('continueWithApple', 'Continuer par Mail Apple (Apple ID)')}</span>
            </button>

            {/* 3. Adresse Email Universelle */}
            {!showEmailInput && (
              <button
                type="button"
                disabled={!acceptedTerms || isLoading}
                onClick={() => setShowEmailInput(true)}
                className={`w-full py-2.5 px-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all ${
                  acceptedTerms && !isLoading
                    ? 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/40 active:scale-98 cursor-pointer'
                    : 'bg-emerald-950/30 text-gray-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>{t('continueWithOtherEmail', 'Connexion par Adresse Email')}</span>
              </button>
            )}

            {/* 4. Facebook */}
            <button
              type="button"
              disabled={!acceptedTerms || isLoading}
              onClick={handleFacebookSignIn}
              className={`w-full py-2.5 px-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2.5 shadow-md transition-all ${
                acceptedTerms && !isLoading
                  ? 'bg-[#1877F2] hover:bg-[#166fe5] text-white active:scale-98 cursor-pointer'
                  : 'bg-[#1877F2]/30 text-gray-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>{t('continueWithFacebook', 'Continuer avec Facebook')}</span>
            </button>

            {/* 5. Mode Invité (Local uniquement) */}
            <button
              type="button"
              disabled={!acceptedTerms || isLoading}
              onClick={handleGuestSignIn}
              className={`w-full py-2.5 px-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                acceptedTerms && !isLoading
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 active:scale-98 cursor-pointer'
                  : 'bg-amber-500/10 text-gray-500 border border-amber-500/10 opacity-50 cursor-not-allowed'
              }`}
            >
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>{t('playAsGuest', 'Jouer en Mode Invité')}</span>
            </button>
          </div>

          {/* ─── ACCEPTATION DES CGU ─── */}
          <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/25 flex items-start gap-2 text-left">
            <input
              id="cgu_checkbox"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 rounded text-emerald-500 bg-gray-900 border-gray-600 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
            />
            <label
              htmlFor="cgu_checkbox"
              className="text-[10px] text-gray-300 cursor-pointer select-none leading-tight"
            >
              {t('iAcceptTermsPre', "J'accepte les ")}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsTermsModalOpen(true);
                }}
                className="text-amber-400 hover:text-amber-300 underline font-bold"
              >
                {t('termsAndPrivacyLink', "Conditions Générales d'Utilisation")}
              </button>
              {t('termsAndPrivacyPost', ' de 12 PIONS.')}
            </label>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-300 pt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{statusMessage || t('loading', 'Chargement...')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Full CGU & Privacy Policy Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        showAcceptButton={true}
        onAccept={() => {
          setAcceptedTerms(true);
        }}
      />
    </>
  );
};
