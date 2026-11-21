import React, { useEffect, useState } from 'react';
import { Difficulty, GameSettings, Language, PieceColor } from '../types';
import { Translations, ALL_WORLD_LANGUAGES, formatNumber } from '../utils/translations';
import { useTranslation } from '../i18n/useTranslation';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Home, X, Check, Volume2, Music, Vibrate, Globe, Hash, LogOut, ShieldCheck, Share2, History, HelpCircle, ChevronRight } from 'lucide-react';
import { sound } from '../utils/audio';
import { TermsModal } from './TermsModal';

/* ─── AI SETUP MODAL ─── */
interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (diff: Difficulty, color: PieceColor) => void;
  t: Translations;
}

export const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, onStart, t }) => {
  const [diff, setDiff] = React.useState<Difficulty>('medium');
  const [color, setColor] = React.useState<PieceColor>('green');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm bg-[#041a12] border border-amber-500/35 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4">
        <div className="text-3xl">🤖</div>
        <div className="text-center">
          <h3 className="text-lg font-black text-amber-400 tracking-wider">{t.vsCompTitle}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{t.chooseOptions}</p>
        </div>

        {/* Difficulty Buttons */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDiff(d)}
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                diff === d
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                  : 'bg-[#062a1e] border-amber-500/20 text-gray-400 hover:text-gray-200'
              }`}
            >
              {t[d]}
            </button>
          ))}
        </div>

        {/* Color Choice */}
        <div className="w-full flex flex-col items-center gap-2 mt-1">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">{t.yourColor}</span>
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setColor('green')}
              className={`relative w-14 h-14 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-800 border-2 transition-all flex items-center justify-center shadow-lg ${
                color === 'green'
                  ? 'border-amber-400 ring-4 ring-amber-400/30 scale-105'
                  : 'border-emerald-300/40 opacity-70 hover:opacity-100'
              }`}
            >
              <span className="text-white text-xs font-black">★</span>
            </button>

            <button
              type="button"
              onClick={() => setColor('red')}
              className={`relative w-14 h-14 rounded-full bg-gradient-to-b from-rose-500 to-rose-800 border-2 transition-all flex items-center justify-center shadow-lg ${
                color === 'red'
                  ? 'border-amber-400 ring-4 ring-amber-400/30 scale-105'
                  : 'border-rose-300/40 opacity-70 hover:opacity-100'
              }`}
            >
              <span className="text-white text-xs font-black">★</span>
            </button>
          </div>
          <span className="text-[11px] text-amber-300/80 mt-1">
            {color === 'green'
              ? `${t.you} : ${t.green}  ·  ${t.computer} : ${t.red}`
              : `${t.you} : ${t.red}  ·  ${t.computer} : ${t.green}`}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-amber-500/20 text-xs font-bold text-gray-400 hover:text-white bg-[#062a1e]"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={() => onStart(diff, color)}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black shadow-lg"
          >
            {t.play}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── PAUSE MODAL ─── */
interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onLeave: () => void;
  t: Translations;
}

export const PauseModal: React.FC<PauseModalProps> = ({ isOpen, onResume, onRestart, onLeave, t }) => {
  const [confirmingLeave, setConfirmingLeave] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setConfirmingLeave(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-xs bg-gradient-to-b from-[#0a3828] via-[#062a1e] to-[#041a12] border-2 border-amber-400/50 rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(245,197,24,0.2)] flex flex-col items-center gap-3 text-center relative overflow-hidden">
        {/* Top Golden Arcade Ribbon */}
        <div className="w-full -mt-2 mb-1 py-1 px-4 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-lg shadow-md flex items-center justify-center">
          <span className="text-[11px] font-black text-slate-950 uppercase tracking-widest">
            {confirmingLeave ? t.leaveTitle : t.pauseTitle}
          </span>
        </div>

        {!confirmingLeave ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-400/25 to-amber-600/10 border border-amber-400/40 flex items-center justify-center text-3xl shadow-inner mt-1">
              ⏸️
            </div>
            <p className="text-xs text-amber-200/70 font-medium -mt-1">
              {t.gamePaused || 'Partie suspendue'}
            </p>

            <div className="flex flex-col gap-2.5 w-full mt-2">
              {/* Reprendre - 3D Green/Gold Play Button */}
              <button
                type="button"
                onClick={onResume}
                className="w-full py-3 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-500 border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_4px_12px_rgba(245,197,24,0.35)] transition-all flex items-center justify-center gap-1.5"
              >
                <span>▶</span>
                <span>{t.resume}</span>
              </button>

              {/* Nouvelle Partie - 3D Emerald Button */}
              <button
                type="button"
                onClick={onRestart}
                className="w-full py-2.5 rounded-xl bg-gradient-to-b from-[#0a3828] to-[#041a12] hover:from-[#0d4532] hover:to-[#06261b] border border-amber-500/30 border-b-4 border-amber-900 active:border-b-0 active:translate-y-1 text-amber-300 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.newGame}</span>
              </button>

              {/* Quitter -> Active la confirmation Oui / Non */}
              <button
                type="button"
                onClick={() => setConfirmingLeave(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-b from-[#251419] to-[#190d11] hover:from-[#361a22] hover:to-[#220f16] border border-rose-500/30 border-b-4 border-rose-900 active:border-b-0 active:translate-y-1 text-rose-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.menuLeave}</span>
              </button>
            </div>
          </>
        ) : (
          /* Confirmation Oui ou Non */
          <div className="w-full flex flex-col items-center gap-3 animate-fade-in mt-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-rose-500/25 to-rose-700/10 border border-rose-500/40 flex items-center justify-center text-3xl shadow-inner animate-bounce">
              🚪
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-300">
                {t.leaveTitle}
              </h4>
              <p className="text-[11px] text-gray-300/80 mt-1 leading-snug">
                {t.leaveConfirmQuestion || t.leaveSub}
              </p>
            </div>

            {/* Gros boutons 3D OUI / NON Arcade Ludo King */}
            <div className="grid grid-cols-2 gap-2.5 w-full mt-2">
              {/* NON - Continuer la partie (Vert émeraude 3D) */}
              <button
                type="button"
                onClick={() => setConfirmingLeave(false)}
                className="py-3 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 border-b-4 border-emerald-900 active:border-b-0 active:translate-y-1 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_12px_rgba(16,185,129,0.35)] transition-all flex flex-col items-center justify-center"
              >
                <span className="text-sm leading-none mb-0.5">🛡️ {t.no}</span>
                <span className="text-[9px] font-semibold text-emerald-100/80 normal-case">
                  {t.stayBtn.replace(/^[^(]*\((.*)\)$/, '$1')}
                </span>
              </button>

              {/* OUI - Quitter vers l'accueil (Rouge rubis 3D) */}
              <button
                type="button"
                onClick={onLeave}
                className="py-3 rounded-xl bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 border-b-4 border-rose-950 active:border-b-0 active:translate-y-1 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_12px_rgba(239,68,68,0.35)] transition-all flex flex-col items-center justify-center"
              >
                <span className="text-sm leading-none mb-0.5">🚪 {t.yes}</span>
                <span className="text-[9px] font-semibold text-rose-100/80 normal-case">
                  {t.leaveBtn.replace(/^[^(]*\((.*)\)$/, '$1')}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── CONFIRM LEAVE MODAL (Bouton retour en jeu) ─── */
interface ConfirmLeaveModalProps {
  isOpen: boolean;
  onStay: () => void;
  onConfirm: () => void;
  t: Translations;
  isOnline?: boolean;
}

export const ConfirmLeaveModal: React.FC<ConfirmLeaveModalProps> = ({ isOpen, onStay, onConfirm, t, isOnline }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-xs bg-gradient-to-b from-[#0a3828] via-[#062a1e] to-[#041a12] border-2 border-amber-400/50 rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(245,197,24,0.2)] flex flex-col items-center text-center gap-3 relative overflow-hidden">
        {/* Top Golden Arcade Ribbon */}
        <div className="w-full -mt-2 mb-1 py-1 px-4 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-lg shadow-md flex items-center justify-center">
          <span className="text-[11px] font-black text-slate-950 uppercase tracking-widest">
            {isOnline ? (t.abandonOnlineMatch || 'Abandonner la partie en ligne ?') : t.leaveTitle}
          </span>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-rose-500/25 to-rose-700/10 border border-rose-500/40 flex items-center justify-center text-3xl shadow-inner mt-1">
          🚪
        </div>

        <div>
          <h3 className="text-sm font-black text-amber-300">
            {isOnline ? (t.abandonOnlineMatch || 'Abandonner le match') : t.leaveTitle}
          </h3>
          <p className="text-xs text-gray-300/80 mt-1 leading-snug">
            {isOnline
              ? (t.abandonMatchDesc || '⚠️ Attention : Quitter la partie maintenant vous fera perdre par forfait et offrira la victoire à votre adversaire.')
              : (t.leaveConfirmQuestion || t.leaveSub)}
          </p>
        </div>

        {/* Boutons OUI / NON Arcade 3D */}
        <div className="grid grid-cols-2 gap-2.5 w-full mt-2">
          {/* NON - Continuer */}
          <button
            type="button"
            onClick={onStay}
            className="py-3 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 border-b-4 border-emerald-900 active:border-b-0 active:translate-y-1 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_12px_rgba(16,185,129,0.35)] transition-all flex flex-col items-center justify-center"
          >
            <span className="text-sm leading-none mb-0.5">🛡️ {t.no}</span>
            <span className="text-[9px] font-semibold text-emerald-100/80 normal-case">
              {t.stayBtn.replace(/^[^(]*\((.*)\)$/, '$1')}
            </span>
          </button>

          {/* OUI - Quitter */}
          <button
            type="button"
            onClick={onConfirm}
            className="py-3 rounded-xl bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 border-b-4 border-rose-950 active:border-b-0 active:translate-y-1 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_12px_rgba(239,68,68,0.35)] transition-all flex flex-col items-center justify-center"
          >
            <span className="text-sm leading-none mb-0.5">🚪 {t.yes}</span>
            <span className="text-[9px] font-semibold text-rose-100/80 normal-case">
              {t.leaveBtn.replace(/^[^(]*\((.*)\)$/, '$1')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── SETTINGS MODAL ─── */
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdate: (key: keyof GameSettings, val: unknown) => void;
  t: Translations;
  inGame?: boolean;
  onExitApp?: () => void;
  onOpenCloudSync?: () => void;
  onOpenPuzzles?: () => void;
  onOpenRules?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  t,
  inGame = false,
  onExitApp,
  onOpenCloudSync,
  onOpenPuzzles,
  onOpenRules,
}) => {
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);
  if (!isOpen) return null;

  const languages = ALL_WORLD_LANGUAGES.map(l => ({
    code: l.code,
    label: `${l.flag} ${l.nativeName}`,
  }));

  const handleToggleMusic = () => {
    const next = !settings.music;
    onUpdate('music', next);
    sound.toggleMusic(next);
    if (!next) {
      sound.stopMusic();
    }
  };

  const handleToggleSfx = () => {
    const next = !settings.sfx;
    onUpdate('sfx', next);
    sound.sfxEnabled = next;
    if (!next) {
      sound.stopAllSfx();
    }
  };

  const handleToggleVibration = () => {
    const next = !settings.vibration;
    onUpdate('vibration', next);
    sound.vibrationEnabled = next;
    if (next) {
      sound.vibrate(35);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-fade-in">
        <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#041a12] border border-amber-500/35 rounded-2xl p-6 shadow-2xl flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
              <span>⚙️</span>
              <span>{t.settingsTitle}</span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col divide-y divide-amber-500/10">
            {/* Music */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-gray-200">{t.music}</div>
                  <div className="text-[10px] text-gray-400">{t.musicSub}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleMusic}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  settings.music ? 'bg-emerald-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.music ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* SFX */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-gray-200">{t.sound}</div>
                  <div className="text-[10px] text-gray-400">{t.soundSub}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSfx}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  settings.sfx ? 'bg-emerald-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.sfx ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Vibration */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <Vibrate className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-gray-200">{t.vibration}</div>
                  <div className="text-[10px] text-gray-400">{t.vibrationSub}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleVibration}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  settings.vibration ? 'bg-emerald-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.vibration ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Coordinates and Move History : Exclusivement visibles dans les paramètres en haut du plateau en cours de partie */}
            {inGame && (
              <>
                {/* Coordinates */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold text-gray-200">{t.coords}</div>
                      <div className="text-[10px] text-gray-400">{t.coordsSub}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdate('showCoords', !settings.showCoords)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      settings.showCoords ? 'bg-emerald-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.showCoords ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Move History (Optionnel pour alléger le bas du plateau) */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold text-gray-200">{t.showMoveHistory || 'Historique des Coups'}</div>
                      <div className="text-[10px] text-gray-400">{t.showMoveHistorySub || 'Afficher les coups en bas du plateau'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdate('showMoveHistory', !settings.showMoveHistory)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      settings.showMoveHistory ? 'bg-emerald-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.showMoveHistory ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </>
            )}

            {/* Language Selector */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-gray-200">{t.language}</div>
                  <div className="text-[10px] text-gray-400">{t.langSub}</div>
                </div>
              </div>
              <select
                value={settings.language}
                onChange={e => onUpdate('language', e.target.value as Language)}
                className="bg-[#062a1e] text-xs text-amber-300 font-semibold border border-amber-500/30 rounded-lg px-2.5 py-1 outline-none"
              >
                {languages.map(l => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ─── PUZZLES & RÈGLES DU JEU ─── */}
          {(onOpenPuzzles || onOpenRules) && (
            <div className="grid grid-cols-2 gap-2">
              {onOpenPuzzles && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPuzzles();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0a3828] to-[#041a12] hover:brightness-110 border border-amber-400/45 text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
                  title={t.puzzles || 'Puzzles'}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">🧩</span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-amber-300 truncate">{t.puzzles}</div>
                      <div className="text-[9.5px] text-gray-300/80 truncate">{t.puzzlesSub}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                </button>
              )}

              {onOpenRules && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRules();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0a3828] to-[#041a12] hover:brightness-110 border border-emerald-400/45 text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
                  title={t.rules || 'Règles'}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-emerald-200 truncate">{t.rules}</div>
                      <div className="text-[9.5px] text-gray-300/80 truncate">{t.rulesTitle}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
                </button>
              )}
            </div>
          )}

          {/* ─── CLOUD SYNC (GAME CENTER & GOOGLE PLAY JEUX) ─── */}
          {onOpenCloudSync && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCloudSync();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0a3828] to-[#041a12] hover:brightness-110 border border-emerald-500/40 text-xs font-bold text-emerald-200 flex items-center justify-between transition-all cursor-pointer shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm">🍏 🎮</span>
                <span>{t.cloudBackupLabel || 'Sauvegarde Cloud (Game Center / Google Play)'}</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                {t.manageArrowBtn || 'Gérer ›'}
              </span>
            </button>
          )}

          {/* ─── POLITIQUES & CGU BUTTON ─── */}
          <button
            type="button"
            onClick={() => setIsTermsOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-black/40 hover:bg-black/60 border border-amber-500/20 text-xs font-bold text-amber-300 flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{t.termsAndPolicy || 'Politique & CGU'}</span>
            </span>
            <span className="text-[10px] text-gray-400">{t.consult || 'Consulter'} ›</span>
          </button>

          {/* ─── PUBLISHER & ABOUT STUDIO SECTION (Strictly SG, no GAMES) ─── */}
          <div className="p-3 rounded-2xl bg-black/50 border border-amber-500/30 flex items-center gap-3">
            <img
              src="/publisher-logo.jpg"
              alt="SG"
              className="w-12 h-12 object-contain rounded-xl border border-amber-400/40 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-amber-300">SG</span>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                {t.officialPublisherStudio || 'Studio Éditeur Officiel'}
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5">
                12 PIONS • {t.creatorAndPublisher || 'Créateur & Éditeur'}
              </span>
            </div>
          </div>

          {onExitApp && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onExitApp();
              }}
              className="w-full py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 active:scale-98"
            >
              <span>🚪</span>
              <span>{t?.exitAppConfirmTitle || "Quitter l'application"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs shadow-md mt-1"
          >
            {t.done}
          </button>
        </div>
      </div>

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        language={settings.language}
      />
    </>
  );
};

/* ─── NEW GAME CONFIRMATION MODAL ─── */
export const NewGameConfirmModal: React.FC<{
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t?: Translations;
}> = ({ isOpen, onCancel, onConfirm, t }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-fade-in">
      <div className="w-full max-w-xs bg-[#041a12] border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-2xl shadow-inner">
          🔄
        </div>
        <h3 className="text-base font-black text-amber-300">
          {t?.newGameConfirmTitle || t?.newGame || 'Nouvelle Partie ?'}
        </h3>
        <p className="text-xs text-gray-300/80 leading-relaxed">
          {t?.newGameConfirmSub || t?.leaveSub || 'Êtes-vous sûr de vouloir réinitialiser la partie en cours ? La progression actuelle sera perdue.'}
        </p>
        <div className="grid grid-cols-2 gap-2.5 w-full mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
          >
            {t?.cancel || 'Annuler'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95"
          >
            {t?.confirm || t?.yes || 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── GAME OVER MODAL ─── */
interface GameOverModalProps {
  isOpen: boolean;
  winner: PieceColor | 'draw' | null;
  onRematch: () => void;
  onMenu: () => void;
  t: Translations;
  movesCount: number;
  playerColor?: PieceColor;
  gameMode?: 'local' | 'ai' | 'friend' | 'online';
  endGameReason?: 'normal' | 'self_abandon' | 'opponent_left' | 'connection_lost' | null;
  tournamentInfo?: {
    roundName: string;
    winnerName: string;
    isUserWinner: boolean;
    isDraw?: boolean;
    loserName?: string;
  } | null;
  onBackToTournament?: () => void;
  onNextTournamentMatch?: () => void;
  nextTournamentMatchLabel?: string | null;
  forfeitMessage?: string | null;
  player1Name?: string;
  player2Name?: string;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  onRematch,
  onMenu,
  t: propT,
  movesCount,
  playerColor = 'green',
  gameMode = 'local',
  endGameReason = 'normal',
  tournamentInfo,
  onBackToTournament,
  onNextTournamentMatch,
  nextTournamentMatchLabel,
  forfeitMessage,
  player1Name,
  player2Name,
}) => {
  const { t, formatNumber } = useTranslation();
  const isDraw = winner === 'draw';
  const isGreen = winner === 'green';
  const isUserWinner = winner !== null && winner !== 'draw' && winner === playerColor;
  const isSelfAbandon = endGameReason === 'self_abandon' || (endGameReason === ('consecutive_timeout' as any) && !isUserWinner);
  const isOpponentLeft = (endGameReason === 'opponent_left' || !!forfeitMessage) && isUserWinner;

  const isP1Custom = Boolean(
    player1Name &&
    player1Name.trim() &&
    player1Name.trim().toLowerCase() !== 'joueur 1' &&
    player1Name.trim().toLowerCase() !== 'player 1'
  );
  const isP2Custom = Boolean(
    player2Name &&
    player2Name.trim() &&
    player2Name.trim().toLowerCase() !== 'joueur 2' &&
    player2Name.trim().toLowerCase() !== 'player 2'
  );

  const shouldCelebrate =
    isOpen &&
    !isSelfAbandon &&
    (isOpponentLeft ||
      (gameMode === 'local' && winner && !isDraw) ||
      ((gameMode === 'ai' || gameMode === 'friend' || gameMode === 'online') && isUserWinner) ||
      (tournamentInfo && tournamentInfo.isUserWinner));

  useEffect(() => {
    if (!shouldCelebrate) return;

    const fireVolley = () => {
      try {
        confetti({
          particleCount: 70,
          spread: 85,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#FFD700', '#F59E0B', '#EF4444'],
        });
      } catch {
        // Confetti catch
      }
    };

    // Premier éclat immédiat
    fireVolley();

    // Rafales régulières tant que la modale reste ouverte
    const interval = window.setInterval(fireVolley, 2400);
    return () => {
      window.clearInterval(interval);
    };
  }, [shouldCelebrate]);

  useEffect(() => {
    if (!isOpen) return;

    if (isDraw) {
      sound.stopVictoryCelebrationLoop(true);
      sound.playDraw();
      return;
    }

    if (
      !isUserWinner &&
      !isOpponentLeft &&
      (gameMode === 'ai' || gameMode === 'online' || gameMode === 'friend')
    ) {
      sound.stopVictoryCelebrationLoop();
      sound.playDefeat();
    }
  }, [isOpen, isDraw, isUserWinner, isOpponentLeft, gameMode]);

  if (!isOpen || (!winner && !forfeitMessage && !endGameReason)) return null;

  let modalTitle = '';
  let modalSubtitle = '';
  let modalBadge: string | null = null;
  let modalIcon = '🏆';

  if (isSelfAbandon) {
    modalIcon = '🚪';
    modalBadge = t.forfeitDefeatBadge || t.lostByAbandon || 'Défaite par Abandon';
    modalTitle = t.lostByAbandon || 'Vous avez perdu par abandon.';
    modalSubtitle = t.forfeitLossSubtitle || 'Vous avez quitté la partie en cours.';
  } else if (isOpponentLeft) {
    modalIcon = '🏆';
    modalBadge = t.forfeitWinBadge || 'Victoire par forfait !';
    modalTitle = t.forfeitWinBadge || 'Victoire par forfait !';
    modalSubtitle = t.forfeitWinSubtitle || 'Victoire par forfait ! Votre adversaire a quitté la partie.';
  } else if (tournamentInfo) {
    if (tournamentInfo.isDraw) {
      modalIcon = '🤝';
      modalBadge = `${tournamentInfo.roundName} • ${t.draw || 'Match Nul'}`;
      modalTitle = t.draw || '🤝 Match nul !';
      modalSubtitle = t.drawMatchSubtitle || 'Égalité parfaite ! Personne n’est éliminé. Le match doit être rejoué pour désigner le vainqueur.';
    } else if (tournamentInfo.isUserWinner) {
      modalIcon = '🏆';
      modalBadge = `${tournamentInfo.roundName} • ${t.qualified || 'Qualifié !'}`;
      modalTitle = t.qualificationEarned || '🎉 Qualification Reçue !';
      modalSubtitle = `${t.congratulations || 'Félicitations !'} ${t.tournamentQualificationSubtitle ? t.tournamentQualificationSubtitle.replace('{loser}', tournamentInfo.loserName || '') : `Vous avez éliminé ${tournamentInfo.loserName || ''} et accédez au tour suivant !`}`;
    } else {
      modalIcon = '💀';
      modalBadge = `${tournamentInfo.roundName} • ${t.eliminated || 'Éliminé'}`;
      modalTitle = t.tournamentEliminatedTitle || '❌ Vous êtes éliminé du tournoi';
      modalSubtitle = `${tournamentInfo.winnerName} ${t.tournamentEliminatedSubtitle || 'se qualifie pour le tour suivant. Vous quittez la compétition.'}`;
    }
  } else if (isDraw) {
    modalIcon = '🤝';
    modalBadge = t.equality || t.draw || 'Égalité';
    modalTitle = t.draw || t.dr || 'Match nul';
    modalSubtitle = t.wellPlayed || 'Bien joué !';
  } else if (gameMode === 'local') {
    // Mode VS Local (2 Joueurs sur le même écran) : Utilise le nom saisi s'il existe, sinon "Les pions verts / rouges ont gagné"
    // Using isP1Custom and isP2Custom from outer scope

    modalIcon = isGreen ? '🟢' : '🔴';
    modalBadge = t.localPlay || 'Jeu Local';

    if (isGreen) {
      modalTitle = isP1Custom
        ? `${player1Name} ${t.localWinnerCustom || 'a gagné !'}`
        : (t.greenPawnsWon || 'Les pions verts ont gagné !');
      modalSubtitle = isP1Custom
        ? `${t.congratulations || 'Félicitations'} ${player1Name} !`
        : (t.wellPlayed || 'Bien joué aux deux joueurs !');
    } else {
      modalTitle = isP2Custom
        ? `${player2Name} ${t.localWinnerCustom || 'a gagné !'}`
        : (t.redPawnsWon || 'Les pions rouges ont gagné !');
      modalSubtitle = isP2Custom
        ? `${t.congratulations || 'Félicitations'} ${player2Name} !`
        : (t.localBothWellPlayed || 'Félicitations aux pions rouges pour cette superbe victoire !');
    }
  } else {
    // Modes VS IA, VS Amis et En Ligne (Vue Personnelle)
    if (isUserWinner) {
      modalIcon = '🏆';
      modalBadge = t.victory || 'Victoire';
      modalTitle = t.youWon || 'Félicitations, vous avez gagné !';
      modalSubtitle = t.youDominating || t.congratulations || 'Excellente partie, vous avez dominé le plateau !';
    } else {
      modalIcon = '😢';
      modalBadge = t.defeat || 'Défaite';
      modalTitle = t.youLost || 'Vous avez perdu.';
      modalSubtitle = t.betterLuckNextTime || 'La victoire sera pour la prochaine fois !';
    }
  }

  const isUserDefeat =
    isSelfAbandon ||
    (!isUserWinner && !isDraw && (gameMode === 'ai' || gameMode === 'friend' || gameMode === 'online')) ||
    (!!tournamentInfo && !tournamentInfo.isUserWinner && !tournamentInfo.isDraw);
  const isAbandonScenario =
    isSelfAbandon ||
    isOpponentLeft ||
    Boolean(forfeitMessage) ||
    endGameReason === 'self_abandon' ||
    endGameReason === 'opponent_left' ||
    endGameReason === 'connection_lost' ||
    endGameReason === ('consecutive_timeout' as any) ||
    (endGameReason !== null && endGameReason !== 'normal');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none animate-fade-in pointer-events-auto">
      <div
        className={`w-full max-w-sm border-2 rounded-3xl p-5 sm:p-6 flex flex-col items-center text-center gap-3 transition-all ${
          isUserDefeat
            ? 'bg-gradient-to-b from-[#2a0e14] via-[#1c080d] to-[#120407] border-rose-500/70 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(239,68,68,0.25)]'
            : isOpponentLeft || shouldCelebrate
            ? 'bg-gradient-to-b from-[#0a3828] via-[#06241b] to-[#03150f] border-amber-400/90 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(245,197,24,0.35)]'
            : 'bg-gradient-to-b from-[#0a3828] via-[#06241b] to-[#03150f] border-amber-400/60 shadow-[0_16px_50px_rgba(0,0,0,0.85)]'
        }`}
      >
        {/* Animated Badge & Icon */}
        <div className="w-full flex flex-col items-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg mb-1.5 ${
              isUserDefeat
                ? 'bg-rose-500/20 border-2 border-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : shouldCelebrate
                ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_25px_rgba(245,197,24,0.6)] animate-bounce'
                : 'bg-slate-700/30 border-2 border-gray-400'
            }`}
          >
            {modalIcon}
          </div>

          {modalBadge && (
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full border ${
                isUserDefeat
                  ? 'text-rose-300 bg-rose-500/20 border-rose-400/40'
                  : shouldCelebrate
                  ? 'text-amber-300 bg-amber-500/20 border-amber-400/40'
                  : 'text-gray-300 bg-gray-700/40 border-gray-500/30'
              }`}
            >
              {modalBadge}
            </span>
          )}

          <h3
            className={`text-lg sm:text-xl font-black mt-2 leading-snug ${
              isUserDefeat
                ? 'text-rose-300'
                : shouldCelebrate
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#FFE082] via-[#F59E0B] to-[#FFE082]'
                : 'text-gray-200'
            }`}
          >
            {modalTitle}
          </h3>

          {modalSubtitle && (
            <p
              className={`text-xs mt-1 font-semibold leading-relaxed ${
                isOpponentLeft
                  ? 'text-emerald-400 font-bold'
                  : isUserDefeat
                  ? 'text-rose-200/80'
                  : 'text-amber-200/80'
              }`}
            >
              {modalSubtitle}
            </p>
          )}

          {forfeitMessage && (
            <div
              className={`w-full p-2.5 rounded-xl border text-xs font-bold mt-2 shadow-sm ${
                isUserDefeat
                  ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                  : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
              }`}
            >
              <span>
                {forfeitMessage.includes('quitté la partie') || forfeitMessage.includes('forfait')
                  ? (isUserDefeat
                      ? (t.selfForfeitMsg || t.forfeitLossSubtitle || forfeitMessage)
                      : (t.opponentForfeitMsg || t.forfeitWinSubtitle || forfeitMessage))
                  : forfeitMessage}
              </span>
            </div>
          )}
        </div>

        {/* Match Statistics - Style D 12 PIONS Vert & Or */}
        <div
          className={`w-full p-2.5 rounded-xl border flex justify-around text-xs mt-1 ${
            isUserDefeat
              ? 'bg-[#18060a] border-rose-500/30 text-rose-200'
              : 'bg-[#041a12] border-amber-500/25 text-[#f0e6c8]'
          }`}
        >
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-[10px]">{t.movesMade}</span>
            <span className="text-sm font-black text-amber-300">
              {formatNumber(movesCount)}
            </span>
          </div>
          <div className="w-[1px] bg-amber-500/20" />
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-[10px]">{t.winner || 'Vainqueur'}</span>
            <span className="text-sm font-black text-amber-300">
              {isSelfAbandon
                ? (playerColor === 'green' ? t.red : t.green)
                : isOpponentLeft
                ? (playerColor === 'green' ? t.green : t.red)
                : tournamentInfo
                ? (tournamentInfo.isDraw ? (t.equality || t.draw || 'Égalité') : tournamentInfo.winnerName)
                : isDraw
                ? (t.equality || t.draw || 'Égalité')
                : gameMode === 'local'
                ? (isGreen
                    ? (isP1Custom ? player1Name : (t.player1Default || t.green || 'Pions Verts'))
                    : (isP2Custom ? player2Name : (t.player2Default || t.red || 'Pions Rouges')))
                : isGreen
                ? t.green
                : t.red}
            </span>
          </div>
        </div>

        {/* Action Buttons D 12 PIONS */}
        <div className="flex flex-col gap-2 w-full mt-2">
          {tournamentInfo?.isDraw && (
            <button
              type="button"
              onClick={onRematch}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 active:scale-98 animate-pulse"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.rematchTieBreak || 'Rejouer le Match (Bris d’égalité)'}</span>
            </button>
          )}

          {onNextTournamentMatch && !tournamentInfo?.isDraw && (
            <button
              type="button"
              onClick={onNextTournamentMatch}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(16,185,129,0.4)] flex items-center justify-center gap-1.5 active:scale-98 animate-pulse"
            >
              <span>⚔️</span>
              <span>{nextTournamentMatchLabel || t.startNextMatch || 'Lancer le Prochain Match'}</span>
            </button>
          )}

          {onBackToTournament ? (
            <button
              type="button"
              onClick={onBackToTournament}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Trophy className="w-4 h-4" />
              <span>{t.tournamentTree || 'Voir l’Arbre du Tournoi'}</span>
            </button>
          ) : !isAbandonScenario ? (
            <button
              type="button"
              onClick={() => {
                sound.killAllCelebrationAudio();
                onRematch();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 flex items-center justify-center gap-1.5 active:scale-98"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.playAgain || 'Rejouer'}</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              sound.killAllCelebrationAudio();
              onMenu();
            }}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md ${
              isAbandonScenario
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-[0_4px_14px_rgba(245,197,24,0.35)]'
                : 'bg-[#062a1e] hover:bg-[#0a3828] border border-amber-500/40 text-amber-200 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{t.returnToMenu || t.home || 'Retour au Menu Principal'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── FRIEND MODAL ─── */
interface FriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartLocal: () => void;
  onOpenOnline: () => void;
  onShowToast: (msg: string) => void;
  t: Translations;
}

export const FriendModal: React.FC<FriendModalProps> = ({
  isOpen,
  onClose,
  onStartLocal,
  onOpenOnline,
  onShowToast,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-fade-in">
      <div className="w-full max-w-xs bg-[#041a12] border border-amber-500/35 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-3">
        <div className="text-4xl">🤝</div>
        <h3 className="text-base font-black text-amber-400">{t.vsFriend}</h3>
        <p className="text-xs text-gray-400">{t.friendSub2}</p>

        <div className="flex flex-col gap-2.5 w-full mt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartLocal();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md active:scale-98 transition-transform"
          >
            📱 {t.sameDevice} (1v1)
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOnline();
            }}
            className="w-full py-2.5 rounded-xl bg-[#062a1e] hover:bg-[#093d2b] border border-amber-500/40 text-amber-300 font-bold text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            <span>🌐 {t.createOrJoinPrivateRoom || 'Créer / Rejoindre un Salon Privé'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-gray-400 hover:text-gray-200 text-xs font-semibold mt-1"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── EXIT APP CONFIRMATION MODAL (BACK BUTTON ON HOME SCREEN) ─── */
export const ExitAppModal: React.FC<{
  isOpen: boolean;
  onStay: () => void;
  onExit: () => void;
  t?: Translations;
}> = ({ isOpen, onStay, onExit, t }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-fade-in">
      <div className="w-full max-w-xs bg-[#041a12] border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-3.5">
        <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-3xl shadow-inner">
          🚪
        </div>
        <h3 className="text-lg font-black text-amber-300">
          {t?.exitAppConfirmTitle || 'Quitter 12 PIONS ?'}
        </h3>
        <p className="text-sm font-semibold text-gray-200 leading-relaxed">
          {t?.exitAppConfirmDesc || 'Voulez-vous vraiment quitter 12 PIONS ?'}
        </p>
        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          <button
            type="button"
            onClick={onStay}
            className="py-3 px-4 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 border-b-4 border-emerald-950 active:border-b-0 active:translate-y-1 text-white font-black text-sm uppercase tracking-wider shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-95"
          >
            {t?.no || 'Non'}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="py-3 px-4 rounded-xl bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 border-b-4 border-rose-950 active:border-b-0 active:translate-y-1 text-white font-black text-sm uppercase tracking-wider shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-95"
          >
            {t?.yes || 'Oui'}
          </button>
        </div>
      </div>
    </div>
  );
};
