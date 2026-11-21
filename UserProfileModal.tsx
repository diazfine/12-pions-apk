import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Camera,
  Check,
  Flag,
  Mail,
  User,
  ShieldCheck,
  Sparkles,
  Upload,
  Globe,
  Search,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { UserProfile, Language } from '../types';
import { AVATAR_OPTIONS, saveUserProfile } from '../utils/userProfile';
import { ALL_WORLD_COUNTRIES, CountryInfo } from '../utils/worldCountries';
import { ALL_WORLD_LANGUAGES } from '../utils/translations';
import { useTranslation } from '../i18n/useTranslation';
import {
  signInWithNativeGoogle,
  signInWithNativeFacebook,
  signInWithEmail,
  signOutAllAuth,
  saveSessionToken,
} from '../utils/nativeAuth';
import { syncGoogleUserToFirestore } from '../services/firebaseProfile';
import {
  syncWithGameCenter,
  syncWithGooglePlayGames,
  disconnectGameCenter,
  disconnectGooglePlay,
} from '../utils/cloudSync';
import { sound } from '../utils/audio';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onShowToast: (msg: string) => void;
  currentLanguage?: Language;
  onChangeLanguage?: (lang: Language) => void;
}

const REGIONS = ['Tous', 'Afrique', 'Europe', 'Amériques', 'Asie', 'Moyen-Orient', 'Océanie'] as const;

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateProfile,
  onShowToast,
  currentLanguage = 'FR',
  onChangeLanguage,
}) => {
  const { t, formatNumber } = useTranslation();
  const [name, setName] = useState<string>(userProfile.name);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(userProfile.avatar || '👑');
  const [customPhoto, setCustomPhoto] = useState<string | undefined>(userProfile.customPhoto);
  const [selectedFlag, setSelectedFlag] = useState<string>(userProfile.flag || '🇸🇳');
  const [countryName, setCountryName] = useState<string>(userProfile.countryName || 'Sénégal');

  // Country filter & search states
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [activeRegion, setActiveRegion] = useState<string>('Tous');
  const [targetFlagMode, setTargetFlagMode] = useState<'avatar' | 'nationality'>('nationality');

  // Active modal tab: 'profile' (avatar, nom, drapeau) | 'languages' (17 langues) | 'account' (email/fb)
  const [activeTab, setActiveTab] = useState<'profile' | 'languages' | 'account'>('profile');

  // Account creation / connection state
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>(userProfile.email || '');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authProvider, setAuthProvider] = useState<'guest' | 'email' | 'facebook' | 'google'>(
    (userProfile.authProvider as any) || 'guest'
  );
  const [isSyncingAuth, setIsSyncingAuth] = useState<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setName(userProfile.name);
    setSelectedAvatar(userProfile.avatar || '👑');
    setCustomPhoto(userProfile.customPhoto);
    setSelectedFlag(userProfile.flag || '🇸🇳');
    setCountryName(userProfile.countryName || 'Sénégal');
    setEmailInput(userProfile.email || '');
    setAuthProvider((userProfile.authProvider as any) || 'guest');
  }, [isOpen, userProfile]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const countrySectionRef = useRef<HTMLDivElement | null>(null);

  const getRegionLabel = (region: string) => {
    switch (region) {
      case 'Tous': return t.regionAll || t('regionAll', 'Tous');
      case 'Afrique': return t.regionAfrica || t('regionAfrica', 'Afrique');
      case 'Europe': return t.regionEurope || t('regionEurope', 'Europe');
      case 'Amériques': return t.regionAmericas || t('regionAmericas', 'Amériques');
      case 'Asie': return t.regionAsia || t('regionAsia', 'Asie');
      case 'Moyen-Orient': return t.regionMiddleEast || t('regionMiddleEast', 'Moyen-Orient');
      case 'Océanie': return t.regionOceania || t('regionOceania', 'Océanie');
      default: return region;
    }
  };

  // Filtered countries list memoized
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    return ALL_WORLD_COUNTRIES.filter(country => {
      const matchRegion = activeRegion === 'Tous' || country.region === activeRegion;
      if (!matchRegion) return false;
      if (!query) return true;
      const localizedName = t('country_' + country.code, country.name).toLowerCase();
      return (
        country.name.toLowerCase().includes(query) ||
        localizedName.includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.flag.includes(query)
      );
    });
  }, [countrySearch, activeRegion, t]);

  if (!isOpen) return null;

  // Handle local photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast(t('toastInvalidImage', 'Veuillez sélectionner un fichier image valide.'));
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      onShowToast(t('toastImageTooLarge', 'L’image est trop volumineuse (max 2.5 Mo).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCustomPhoto(result);
      onShowToast(t('toastPhotoUploaded', 'Photo de profil chargée avec succès !'));
    };
    reader.readAsDataURL(file);
  };

  // Select a flag to be the profile photo / avatar
  const handleSelectFlagAsAvatar = (country: CountryInfo) => {
    const localizedCountry = t('country_' + country.code, country.name);
    setSelectedAvatar(country.flag);
    setCustomPhoto(undefined);
    setSelectedFlag(country.flag);
    setCountryName(country.name);
    onShowToast(
      t('toastFlagSetAsPhoto', 'Drapeau {flag} ({country}) défini comme photo de profil !')
        .replace('{flag}', country.flag)
        .replace('{country}', localizedCountry)
    );
  };

  // Select nationality only
  const handleSelectNationality = (country: CountryInfo) => {
    const localizedCountry = t('country_' + country.code, country.name);
    setSelectedFlag(country.flag);
    setCountryName(country.name);
    onShowToast(
      t('toastNationalitySet', 'Nationalité : {flag} {country}')
        .replace('{flag}', country.flag)
        .replace('{country}', localizedCountry)
    );
  };

  // Scroll to country section for picking avatar flag
  const handleTriggerFlagAsAvatarPicker = () => {
    setTargetFlagMode('avatar');
    setActiveTab('profile');
    setTimeout(() => {
      countrySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    onShowToast(t('toastSelectFlagFirst', 'Sélectionnez un drapeau dans la liste pour votre photo de profil'));
  };

  // Save profile changes
  const handleSaveProfile = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      onShowToast(t('toastInvalidPseudo', 'Veuillez renseigner un pseudo valide.'));
      return;
    }

    const updated: UserProfile = {
      ...userProfile,
      name: trimmedName,
      avatar: selectedAvatar,
      customPhoto,
      flag: selectedFlag,
      countryName,
      email: emailInput.trim() || userProfile.email,
      authProvider,
    };

    saveUserProfile(updated);
    onUpdateProfile(updated);
    onShowToast(t('toastProfileSaved', 'Profil sauvegardé avec succès !'));
    onClose();
  };

  // Real Firebase Google Authentication & Firestore Cloud Sync
  const handleSyncGoogle = async () => {
    if (isSyncingAuth) return;
    setIsSyncingAuth(true);
    try {
      const gUser = await signInWithNativeGoogle();
      if (!gUser.firebaseUser) {
        throw new Error('Authentification Firebase Google incomplète.');
      }

      const synced = await syncGoogleUserToFirestore(
        gUser.firebaseUser,
        {
          ...userProfile,
          name: name.trim() && name.trim() !== 'Champion_Royal' ? name.trim() : gUser.name,
          avatar: selectedAvatar,
          customPhoto,
          flag: selectedFlag,
          countryName,
          email: gUser.email || userProfile.email,
        },
        { grantFirstTimeBonus: true }
      );

      saveSessionToken('firebase_google_session', {
        id: gUser.id,
        name: synced.profile.name,
        email: synced.profile.email,
        imageUrl: synced.profile.customPhoto || synced.profile.avatar,
        provider: 'google',
      });
      localStorage.setItem('auth_onboarding_completed', 'true');

      setAuthProvider('google');
      setName(synced.profile.name);
      if (synced.profile.email) setEmailInput(synced.profile.email);
      if (synced.profile.customPhoto) setCustomPhoto(synced.profile.customPhoto);

      onUpdateProfile(synced.profile);
      sound.playPromotion();

      if (synced.bonusCoinsGranted > 0) {
        onShowToast(
          t.googleSyncSuccess ||
            `Compte Google synchronisé avec succès ! +${synced.bonusCoinsGranted} 🪙 offertes`
        );
      } else {
        onShowToast('Compte Google synchronisé et progression restaurée depuis le Cloud !');
      }
    } catch (err) {
      // Strictly NO fake success, NO fake coins, NO authProvider switch on cancel/failure
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Connexion Google annulée ou échouée. Aucun compte synchronisé.';
      onShowToast(errMsg);
    } finally {
      setIsSyncingAuth(false);
    }
  };

  const handleSignOutGoogle = async () => {
    sound.playSelect();
    await signOutAllAuth();
    setAuthProvider('guest');
    const updated: UserProfile = {
      ...userProfile,
      uid: undefined,
      authProvider: 'guest',
      email: undefined,
    };
    saveUserProfile(updated);
    onUpdateProfile(updated);
    onShowToast('Compte Google déconnecté. Vos données locales restent sur cet appareil.');
  };

  // Facebook connect handler (strictly no fake fallback)
  const handleConnectFacebook = async () => {
    if (isSyncingAuth) return;
    setIsSyncingAuth(true);
    try {
      const fbUser = await signInWithNativeFacebook();
      setAuthProvider('facebook');
      if (fbUser.name) setName(fbUser.name);
      if (fbUser.email) setEmailInput(fbUser.email);
      const updated: UserProfile = {
        ...userProfile,
        name: fbUser.name || userProfile.name,
        email: fbUser.email || userProfile.email,
        authProvider: 'facebook',
      };
      saveUserProfile(updated);
      onUpdateProfile(updated);
      onShowToast('Compte Facebook connecté avec succès !');
    } catch (err) {
      onShowToast(
        err instanceof Error
          ? err.message
          : 'Connexion Facebook indisponible pour le moment.'
      );
    } finally {
      setIsSyncingAuth(false);
    }
  };

  // Email account registration handler (strictly no fake fallback)
  const handleRegisterEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.includes('@') || passwordInput.length < 6) {
      onShowToast(t('toastInvalidEmailPassword', 'Entrez un e-mail valide et un mot de passe d’au moins 6 caractères.'));
      return;
    }
    try {
      await signInWithEmail(emailInput, name);
    } catch (err) {
      onShowToast(
        err instanceof Error
          ? err.message
          : 'La connexion par E-mail n’est pas encore activée.'
      );
    }
  };

  // Apple Game Center sync handler (strictly honest availability)
  const handleSyncGameCenter = async () => {
    sound.playSelect();
    const res = await syncWithGameCenter(userProfile);
    if (res.success) {
      sound.playPromotion();
      onUpdateProfile(res.profile);
    }
    onShowToast(res.message);
  };

  const handleDisconnectGameCenter = () => {
    sound.playSelect();
    const updated = disconnectGameCenter(userProfile);
    onUpdateProfile(updated);
    onShowToast(t('toastAppleDisconnected', 'Compte Apple Game Center déconnecté.'));
  };

  // Google Play Jeux sync handler (strictly honest availability)
  const handleSyncGooglePlay = async () => {
    sound.playSelect();
    const res = await syncWithGooglePlayGames(userProfile);
    if (res.success) {
      sound.playPromotion();
      onUpdateProfile(res.profile);
    }
    onShowToast(res.message);
  };

  const handleDisconnectGooglePlay = () => {
    sound.playSelect();
    const updated = disconnectGooglePlay(userProfile);
    onUpdateProfile(updated);
    onShowToast(t('toastGooglePlayDisconnected', 'Compte Google Play Jeux déconnecté.'));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#093526] via-[#052319] to-[#02130e] border-2 border-amber-400/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(245,197,24,0.3)] flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden text-[#f0e6c8]">
        
        {/* Modal Top Ribbon Header */}
        <div className="relative px-3.5 py-2.5 bg-gradient-to-r from-[#041d14] via-[#083b2a] to-[#041d14] border-b border-amber-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 id="user-profile-modal-title" className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider">
                {t('profileTitle', 'Profil du Joueur & Nationalité')}
              </h2>
              <p className="text-[10px] text-amber-200/70">
                {t('friendCodeLabel', 'Code ami :')} <span className="font-mono text-amber-400 font-bold">{userProfile.friendCode}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeProfileAria', 'Fermer la fenêtre du profil')}
            className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs (Profil & Drapeau / Toutes les Langues / Lier Compte) */}
        <div className="flex items-center border-b border-white/10 bg-[#02140d] px-2 pt-1.5 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-1.5 px-2 rounded-t-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#062c1f] text-amber-300 border-t-2 border-x border-amber-400/70 shadow'
                : 'text-gray-400 hover:text-amber-200'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{t('profileAndFlags', 'Profil & Drapeaux')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('languages')}
            className={`flex-1 py-1.5 px-2 rounded-t-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'languages'
                ? 'bg-[#062c1f] text-amber-300 border-t-2 border-x border-amber-400/70 shadow'
                : 'text-gray-400 hover:text-amber-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('languagesTab', 'Langues (17)')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex-1 py-1.5 px-2 rounded-t-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'account'
                ? 'bg-[#062c1f] text-amber-300 border-t-2 border-x border-amber-400/70 shadow'
                : 'text-gray-400 hover:text-amber-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('security', 'Sécurité')}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: PROFIL & DRAPEAUX */}
          {activeTab === 'profile' && (
            <>
              {/* SECTION: Avatar & Photo Display */}
              <div className="bg-[#031d14]/70 border border-amber-500/25 rounded-xl p-3 flex flex-col items-center gap-2.5">
                <div className="flex items-center gap-4 w-full justify-center">
                  
                  {/* Avatar Preview Box */}
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-600 p-1 shadow-[0_8px_20px_rgba(0,0,0,0.8)]">
                      <div className="w-full h-full rounded-xl bg-[#041a12] flex items-center justify-center overflow-hidden border border-white/30 relative">
                        {customPhoto ? (
                          <img
                            src={customPhoto}
                            alt="Photo du joueur"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-4xl leading-none select-none">{selectedAvatar}</span>
                        )}
                        {/* Overlay nationality flag badge */}
                        <div className="absolute bottom-0 right-0 bg-black/75 px-1.5 py-0.5 rounded-tl-lg text-xs flex items-center gap-0.5 border-t border-l border-amber-400/40">
                          {selectedFlag}
                        </div>
                      </div>
                    </div>

                    {/* Camera quick-upload button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border-2 border-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      title={t('chooseLocalPhotoTitle', 'Choisir une photo locale')}
                    >
                      <Camera className="w-3.5 h-3.5 font-bold" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Actions beside avatar */}
                  <div className="flex flex-col gap-1.5 flex-1 max-w-[240px]">
                    <div className="text-xs font-bold text-amber-200">
                      {t('photoAndAvatar', 'Photo de profil & Avatar')}
                    </div>
                    
                    {/* BUTTON TO CHOOSE FLAG AS PROFILE PHOTO */}
                    <button
                      type="button"
                      onClick={handleTriggerFlagAsAvatarPicker}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-amber-500/30 to-yellow-500/20 hover:from-amber-500/40 hover:to-yellow-500/30 border border-amber-400/60 text-amber-200 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-98 cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{t('selectFlagPhoto', 'Choisir un drapeau pour la photo')}</span>
                    </button>

                    {/* Button for uploading device photo */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-[#05261b] hover:bg-[#083b2a] border border-white/20 text-gray-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-amber-300 shrink-0" />
                      <span className="truncate">{t('importDevicePhoto', "Importer photo de l'appareil")}</span>
                    </button>

                    {customPhoto && (
                      <button
                        type="button"
                        onClick={() => setCustomPhoto(undefined)}
                        className="text-left text-[10px] text-rose-400 hover:text-rose-300 underline font-semibold"
                      >
                        {t('removeCustomPhoto', 'Retirer la photo personnalisée')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Royal Avatars Carousel / Quick list */}
                <div className="w-full pt-2 border-t border-white/10">
                  <p className="text-[10px] font-bold text-amber-300/80 mb-1 text-center">
                    {t('selectAvatarOfficial', 'Ou choisissez un avatar royal traditionnel :')}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {AVATAR_OPTIONS.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(av);
                          setCustomPhoto(undefined);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all cursor-pointer ${
                          selectedAvatar === av && !customPhoto
                            ? 'bg-amber-400/30 border-2 border-amber-300 scale-110 shadow-md'
                            : 'bg-black/30 border border-white/10 hover:border-amber-400/50'
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION: Player Name Input */}
              <div>
                <label htmlFor="player-name-input" className="block text-[11px] font-black text-amber-300 uppercase tracking-wider mb-1">
                  {t('yourRoyalPseudo', 'Nom du Joueur / Pseudo')}
                </label>
                <div className="relative">
                  <input
                    id="player-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={20}
                    placeholder={t('enterYourName', 'Entrez votre nom...')}
                    className="w-full bg-[#031c13] border-2 border-amber-500/60 focus:border-amber-300 rounded-xl px-3.5 py-2 text-sm text-amber-200 placeholder-amber-400/30 outline-hidden font-bold"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-gray-400 font-mono">
                    {name.length}/20
                  </span>
                </div>
              </div>

              {/* SECTION: Tous les Pays du Monde et leurs drapeaux */}
              <div ref={countrySectionRef} className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('nationalityAndFlag', 'Tous les pays & drapeaux')} ({ALL_WORLD_COUNTRIES.length})</span>
                  </label>
                  <div className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span>
                      {selectedFlag} {t('country_' + (ALL_WORLD_COUNTRIES.find(c => c.flag === selectedFlag)?.code || ''), countryName)}
                    </span>
                  </div>
                </div>

                {/* Hint banner for flag as avatar */}
                <div className="bg-[#042419] border border-amber-400/30 rounded-lg p-2 text-[11px] text-amber-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      {t('flagUsageHint', "Vous pouvez choisir n'importe quel drapeau comme Nationalité ou comme Photo de profil !")}
                    </span>
                  </div>
                </div>

                {/* Country Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-amber-400/70 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder={t('searchCountryPlaceholder', 'Rechercher un pays (ex: Sénégal, France, Maroc, Brésil, Japon...)')}
                    className="w-full bg-[#02160e] border border-amber-500/40 focus:border-amber-300 rounded-xl pl-9 pr-8 py-2 text-xs text-amber-100 placeholder-amber-300/40 outline-hidden font-medium"
                  />
                  {countrySearch && (
                    <button
                      type="button"
                      onClick={() => setCountrySearch('')}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-white text-xs p-0.5"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Continent Region Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                  {REGIONS.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => setActiveRegion(region)}
                      className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                        activeRegion === region
                          ? 'bg-amber-500 text-slate-950 shadow-sm border border-amber-300'
                          : 'bg-[#031d14] text-gray-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {getRegionLabel(region)}
                    </button>
                  ))}
                </div>

                {/* Country Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto p-1.5 bg-[#02130c] rounded-xl border border-white/10">
                  {filteredCountries.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-xs text-gray-400">
                      {t('noCountryFound', 'Aucun pays trouvé pour')} "{countrySearch}".
                    </div>
                  ) : (
                    filteredCountries.map((c) => {
                      const isSelectedNationality = selectedFlag === c.flag;
                      const isSelectedAvatar = selectedAvatar === c.flag && !customPhoto;

                      return (
                        <div
                          key={c.code}
                          className={`p-2 rounded-xl flex items-center justify-between gap-2 border transition-all ${
                            isSelectedNationality || isSelectedAvatar
                              ? 'bg-[#083b2a] border-amber-400/80 shadow-md'
                              : 'bg-[#031d14]/80 border-white/5 hover:border-amber-400/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-2xl leading-none shrink-0 select-none">
                              {c.flag}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-gray-200 truncate flex items-center gap-1">
                                <span>{t('country_' + c.code, c.name)}</span>
                                <span className="text-[9px] font-mono text-amber-400/70">[{c.code}]</span>
                              </div>
                              <div className="text-[9px] text-gray-400 truncate">
                                {getRegionLabel(c.region)}
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Button: Set as Nationality */}
                            <button
                              type="button"
                              onClick={() => handleSelectNationality(c)}
                              title={t('setAsNationality', 'Définir comme nationalité')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                isSelectedNationality
                                  ? 'bg-amber-500 text-slate-950 font-black'
                                  : 'bg-black/40 text-gray-300 hover:text-white border border-white/10'
                              }`}
                            >
                              {isSelectedNationality ? `✓ ${t.countryBtn || t('countryBtn', 'Pays')}` : (t.countryBtn || t('countryBtn', 'Pays'))}
                            </button>

                            {/* Button: Set as Profile Photo */}
                            <button
                              type="button"
                              onClick={() => handleSelectFlagAsAvatar(c)}
                              title={t('setFlagAsPhoto', 'Définir le drapeau comme photo de profil')}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                isSelectedAvatar
                                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black shadow'
                                  : 'bg-[#04281c] text-amber-300 hover:bg-[#073827] border border-amber-400/40'
                              }`}
                            >
                              {isSelectedAvatar ? `★ ${t.photoBtn || t('photoBtn', 'Photo')}` : (t.photoBtn || t('photoBtn', 'Photo'))}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: TOUTES LES LANGUES DU MONDE (17 LANGUES) */}
          {activeTab === 'languages' && (
            <div className="space-y-3 animate-fade-in">
              <div className="bg-[#031d14] border border-amber-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    {t('allWorldLanguagesTitle', 'Toutes les langues mondiales (17)')}
                  </h3>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  {t('allWorldLanguagesDesc', "L'application 12 PIONS est conçue pour être jouée partout sur la planète. Choisissez votre langue préférée pour adapter l'intégralité du jeu.")}
                </p>
              </div>

              {/* Language Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_WORLD_LANGUAGES.map((lang) => {
                  const isCurrent = currentLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        onChangeLanguage?.(lang.code);
                        onShowToast(
                          t('toastLanguageChanged', 'Langue changée : {lang} ({flag})')
                            .replace('{lang}', lang.nativeName)
                            .replace('{flag}', lang.flag)
                        );
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#083e2c] border-amber-400 shadow-[0_0_15px_rgba(245,197,24,0.2)]'
                          : 'bg-[#031c13] border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl leading-none select-none">{lang.flag}</span>
                        <div className="text-left">
                          <div className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
                            <span>{lang.nativeName}</span>
                            <span className="text-[10px] text-gray-400 font-normal">({lang.name})</span>
                          </div>
                          <div className="text-[9px] font-mono text-amber-400/70">
                            Code: {lang.code}
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{t('activeBadge', 'Actif')}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-semibold group-hover:text-amber-300">
                          {t('selectBtn', 'Sélectionner')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT CONNECTION (GOOGLE / DEVICE / FACEBOOK / EMAIL) */}
          {activeTab === 'account' && (
            <div className="space-y-3 animate-fade-in">
              <div className="bg-[#031d14] border border-amber-500/30 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{t('accountSyncTitle', 'Sauvegarde & Synchronisation de Compte')}</span>
                </p>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  {t('accountSyncDesc', "Sauvegardez votre progression sur Apple Game Center (iOS) et sur Google Play Jeux (Android) pour sécuriser vos pièces, votre niveau, vos défis et vos succès.")}
                </p>
              </div>

              {/* 🍏 SECTION APPLE GAME CENTER */}
              <div className="bg-gradient-to-r from-[#1c1c1e] to-[#0c1a14] border border-white/20 rounded-xl p-3 space-y-2 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-black/60 border border-white/20 flex items-center justify-center text-base shadow-inner">
                      🍏
                    </div>
                    <div>
                      <p className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>Apple Game Center</span>
                        {userProfile.gameCenterSynced && (
                          <span className="text-[9px] bg-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-400/30">
                            {t('syncedStatus', '✓ Synchronisé')}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {userProfile.gameCenterSynced
                          ? `${t('idPrefix', 'Identifiant :')} ${userProfile.gameCenterId} • ${t('syncedAtPrefix', 'Synchronisé :')} ${userProfile.lastGameCenterSync || t('justNow', "À l'instant")}`
                          : t('appleGameCenterDesc', 'Sauvegarde cloud automatique sur iPhone, iPad & Mac')}
                      </p>
                    </div>
                  </div>
                </div>

                {userProfile.gameCenterSynced ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSyncGameCenter}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>🔄</span>
                      <span>{t('syncNowBtn', 'Synchroniser maintenant')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectGameCenter}
                      className="py-1.5 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[10px] font-bold text-rose-300 transition-colors cursor-pointer"
                    >
                      {t('disconnectBtn', 'Déconnecter')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSyncGameCenter}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-gray-100 active:scale-[0.99] text-gray-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <span className="text-sm">🍏</span>
                    <span>{t('syncAppleBtn', 'Synchroniser avec Apple Game Center (+1 000 🪙)')}</span>
                  </button>
                )}
              </div>

              {/* 🎮 SECTION GOOGLE PLAY JEUX */}
              <div className="bg-gradient-to-r from-[#0d2a1d] to-[#041a12] border border-emerald-500/30 rounded-xl p-3 space-y-2 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#021f15] border border-emerald-400/30 flex items-center justify-center text-base shadow-inner">
                      🎮
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-200 flex items-center gap-1.5">
                        <span>{t('googlePlayGamesLabel', 'Google Play Jeux')}</span>
                        {userProfile.googlePlaySynced && (
                          <span className="text-[9px] bg-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-400/30">
                            {t('syncedStatus', '✓ Synchronisé')}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-emerald-300/80">
                        {userProfile.googlePlaySynced
                          ? `${t('idPrefix', 'Identifiant :')} ${userProfile.googlePlayId} • ${t('syncedAtPrefix', 'Synchronisé :')} ${userProfile.lastGooglePlaySync || t('justNow', "À l'instant")}`
                          : t('googlePlayDesc', 'Sauvegarde cloud automatique Play Games sur tous vos appareils Android')}
                      </p>
                    </div>
                  </div>
                </div>

                {userProfile.googlePlaySynced ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSyncGooglePlay}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-xs font-bold text-emerald-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>🔄</span>
                      <span>{t('syncNowBtn', 'Synchroniser maintenant')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectGooglePlay}
                      className="py-1.5 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[10px] font-bold text-rose-300 transition-colors cursor-pointer"
                    >
                      {t('disconnectBtn', 'Déconnecter')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSyncGooglePlay}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <span className="text-sm">🎮</span>
                    <span>{t('syncGooglePlayBtn', 'Synchroniser avec Google Play Jeux (+1 000 🪙)')}</span>
                  </button>
                )}
              </div>

              {/* AUTRES MODES DE CONNEXION */}
              <div className="border-t border-amber-500/20 pt-2 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {t('otherSyncOptions', 'Autres options de synchronisation')}
                </p>

              {authProvider !== 'guest' ? (
                <div className="bg-emerald-950/60 border border-emerald-400/50 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-200 truncate">
                        {authProvider === 'google'
                          ? (t('connectedWithGoogle', 'Connecté avec Google'))
                          : authProvider === 'facebook'
                          ? (t('connectedWithFacebook', 'Connecté avec Facebook'))
                          : (t('connectedWithEmail', 'Connecté avec E-mail'))}
                      </p>
                      <p className="text-[10px] text-emerald-300/80 truncate">
                        {emailInput || userProfile.email || `${name} · ${t('cloudSyncedLabel', 'Cloud Synchronisé')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-1 rounded-full font-bold">
                      {t('securedStatus', '✓ Sécurisé')}
                    </span>
                    {authProvider === 'google' && (
                      <button
                        type="button"
                        onClick={handleSignOutGoogle}
                        className="text-[10px] bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-400/40 px-2 py-1 rounded-full font-bold cursor-pointer transition-colors"
                      >
                        {t('disconnectBtn', 'Déconnecter')}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Real Google Sign-In & Firestore Sync Button */}
                  <button
                    type="button"
                    disabled={isSyncingAuth}
                    onClick={handleSyncGoogle}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-gray-100 active:scale-[0.99] text-gray-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer disabled:opacity-60"
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
                    <span>
                      {isSyncingAuth
                        ? 'Connexion Google en cours...'
                        : t('syncWithGoogle', 'Synchroniser avec Google (+1 000 🪙)')}
                    </span>
                  </button>

                  {/* Facebook Login Button */}
                  <button
                    type="button"
                    onClick={handleConnectFacebook}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>{t('connectFacebookFb', 'Continuer avec Facebook (+1 000 🪙)')}</span>
                  </button>

                  {/* Email Registration / Login Button & Form */}
                  {!showEmailForm ? (
                    <button
                      type="button"
                      onClick={() => setShowEmailForm(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#062c1f] hover:bg-[#083b2a] border border-amber-500/40 text-amber-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-amber-300" />
                      <span>{t('registerEmail', 'Créer un profil avec adresse E-mail')}</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleRegisterEmail}
                      className="bg-[#031a11] border border-amber-500/30 rounded-xl p-3 space-y-2 text-xs"
                    >
                      <div>
                        <label className="block text-[10px] text-amber-300 font-bold mb-0.5">{t('email', 'Adresse E-mail')}</label>
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder={t('emailPlaceholder', 'nom@exemple.com')}
                          className="w-full bg-[#02130c] border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white outline-hidden"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-amber-300 font-bold mb-0.5">{t('password', 'Mot de passe')}</label>
                        <input
                          type="password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#02130c] border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white outline-hidden"
                          required
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          className="flex-1 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black rounded-lg text-xs"
                        >
                          {t('validateAccount', 'Valider mon compte')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEmailForm(false)}
                          className="px-3 py-1.5 bg-black/40 text-gray-400 hover:text-white rounded-lg text-xs"
                        >
                          {t('cancel', 'Annuler')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 bg-gradient-to-r from-[#041d14] via-[#083b2a] to-[#041d14] border-t border-amber-500/40 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[10px] text-amber-300/80">
            {t('levelTag', 'Niveau')} {formatNumber(userProfile.level)} · {formatNumber(userProfile.coins)} 🪙
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {t('cancel', 'Annuler')}
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('save', 'Enregistrer')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
