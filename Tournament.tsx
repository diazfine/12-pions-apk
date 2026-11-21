import React, { useState, useEffect, useMemo } from 'react';
import {
  TournamentFormat,
  TournamentMatch,
  TournamentMode,
  TournamentParticipant,
  TournamentState,
} from '../types';
import { Translations } from '../i18n/types';
import {
  BOT_ROSTER,
  COUNTRY_OPTIONS,
  applyMatchResult,
  createTournament,
  fisherYatesShuffle,
  loadActiveTournament,
  saveActiveTournament,
  simulateMatch,
  advanceRoundAiMatches,
  simulateRemainingTournament,
} from '../utils/tournamentLogic';
import confetti from 'canvas-confetti';
import {
  Trophy,
  ArrowLeft,
  Play,
  Zap,
  Users,
  User,
  Crown,
  Sparkles,
  Swords,
  CheckCircle2,
  RotateCcw,
  Bot,
  Globe,
  Shield,
  Star,
  Flame,
} from 'lucide-react';
import { sound } from '../utils/audio';

export interface TournamentProps {
  onBack: () => void;
  onLaunchTournamentMatch: (
    match: TournamentMatch,
    p1: TournamentParticipant,
    p2: TournamentParticipant
  ) => void;
  tournamentState: TournamentState | null;
  setTournamentState: React.Dispatch<React.SetStateAction<TournamentState | null>>;
  onAbandonTournament?: (returnToMenu?: boolean) => void;
  onShowToast: (msg: string) => void;
  t?: Translations;
}

export const Tournament: React.FC<TournamentProps> = ({
  onBack,
  onLaunchTournamentMatch,
  tournamentState,
  setTournamentState,
  onAbandonTournament,
  onShowToast,
  t,
}) => {
  // Navigation step within tournament screen
  const [step, setStep] = useState<'mode_select' | 'setup' | 'matching' | 'bracket'>(
    tournamentState ? 'bracket' : 'mode_select'
  );

  // Selected tournament options (VS Ordinateur is the primary default)
  const [selectedMode, setSelectedMode] = useState<TournamentMode>('solo_ai');
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>('knockout8');
  const [userName, setUserName] = useState<string>(t?.youChampionDefault || 'Vous (Champion)');
  const [userCountry, setUserCountry] = useState<string>('Sénégal');
  const [userFlag, setUserFlag] = useState<string>('🇸🇳');

  // Local Pass & Play player names (up to 32 players)
  const [localPlayers, setLocalPlayers] = useState<string[]>(() =>
    Array.from({ length: 32 }, (_, i) => `${t?.player || 'Joueur'} ${i + 1}`)
  );

  // Global Matchmaking simulation state
  const [matchmakingCount, setMatchmakingCount] = useState<number>(1);
  const [matchmakingLogs, setMatchmakingLogs] = useState<string[]>([
    t?.tournamentLogInit || '⚡ Initialisation du matchmaking mondial...',
  ]);

  // Sync state from storage if available
  useEffect(() => {
    if (!tournamentState) {
      const saved = loadActiveTournament();
      if (saved) {
        setTournamentState(saved);
        setStep('bracket');
      }
    }
  }, [tournamentState, setTournamentState]);

  // Global Matchmaking simulation
  const startGlobalMatchmaking = () => {
    setStep('matching');
    setMatchmakingCount(1);
    const seedNum = Math.floor(1 + Math.random() * 8);
    setMatchmakingLogs([
      t?.tournamentLogConnected || '🌐 Connexion au réseau mondial...',
      (t?.tournamentLogSeeded || '✓ Vous êtes inscrit comme tête de série #{seed}').replace('{seed}', String(seedNum)),
    ]);

    const countries = [
      { name: 'Amadou_DKR', flag: '🇸🇳', country: t?.country_SN || 'Sénégal' },
      { name: 'Kouassi_ABJ', flag: '🇨🇮', country: t?.country_CI || 'Côte d’Ivoire' },
      { name: 'Camara_CKY', flag: '🇬🇳', country: t?.country_GN || 'Guinée' },
      { name: 'Diallo_BKO', flag: '🇲🇱', country: t?.country_ML || 'Mali' },
      { name: 'Pierre_PAR', flag: '🇫🇷', country: t?.country_FR || 'France' },
      { name: 'Kenji_TYO', flag: '🇯🇵', country: t?.country_JP || 'Japon' },
      { name: 'Carlos_RIO', flag: '🇧🇷', country: t?.country_BR || 'Brésil' },
    ];

    let current = 1;
    const interval = setInterval(() => {
      current++;
      setMatchmakingCount(current);
      const nextPlayer = countries[current - 2];
      if (nextPlayer) {
        setMatchmakingLogs(prev => [
          ...prev,
          (t?.tournamentLogJoined || '⚡ {flag} {name} ({country}) a rejoint la file !')
            .replace('{flag}', nextPlayer.flag)
            .replace('{name}', nextPlayer.name)
            .replace('{country}', nextPlayer.country),
        ]);
      }

      if (current >= 8) {
        clearInterval(interval);
        setTimeout(() => {
          sound.playVictory();
          onShowToast(t?.toastTournamentPlayersFound || '🎉 8/8 Joueurs trouvés ! Tirage au sort de l’arbre en cours...');
          const newTourn = createTournament(
            'knockout8',
            userName,
            userCountry,
            userFlag,
            'global',
            [],
            undefined
          );
          setTournamentState(newTourn);
          saveActiveTournament(newTourn);
          setStep('bracket');
        }, 800);
      }
    }, 400);
  };

  // Launch configured tournament (Solo VS AI or Local)
  const handleLaunchConfiguredTournament = () => {
    let localNamesToPass: string[] = [];
    if (selectedMode === 'local') {
      const needed = selectedFormat === 'knockout32' ? 32 : selectedFormat === 'knockout16' ? 16 : selectedFormat === 'knockout8' ? 8 : 4;
      localNamesToPass = localPlayers.slice(0, needed);
    }

    const newTourn = createTournament(
      selectedFormat,
      userName,
      userCountry,
      userFlag,
      selectedMode,
      localNamesToPass,
      undefined
    );

    setTournamentState(newTourn);
    saveActiveTournament(newTourn);
    setStep('bracket');
    sound.playVictory();
    onShowToast((t?.toastTournamentGenerated || '🏆 Tournoi {name} généré avec succès !').replace('{name}', newTourn.name));
  };

  // Participant quick lookup map
  const participantsMap = useMemo(() => {
    const map = new Map<string, TournamentParticipant>();
    if (tournamentState) {
      tournamentState.participants.forEach(p => map.set(p.id, p));
    }
    return map;
  }, [tournamentState]);

  // Identify active ready match
  const activeMatch = useMemo(() => {
    if (!tournamentState || tournamentState.status === 'completed') return null;
    return (
      tournamentState.matches.find(
        m => m.status === 'ready' && m.player1Id !== null && m.player2Id !== null && m.winnerId === null
      ) || null
    );
  }, [tournamentState]);

  // Check if human user has a ready match
  const userReadyMatch = useMemo(() => {
    if (!tournamentState || tournamentState.status === 'completed') return null;
    return (
      tournamentState.matches.find(
        m =>
          m.status === 'ready' &&
          m.winnerId === null &&
          (m.player1Id === tournamentState.userParticipantId || m.player2Id === tournamentState.userParticipantId)
      ) || null
    );
  }, [tournamentState]);

  // Count AI matches that can be auto-simulated right now
  const readyAiMatchesCount = useMemo(() => {
    if (!tournamentState || tournamentState.status === 'completed') return 0;
    return tournamentState.matches.filter(m => {
      if (m.status !== 'ready' || m.winnerId !== null || !m.player1Id || !m.player2Id) return false;
      const p1 = participantsMap.get(m.player1Id);
      const p2 = participantsMap.get(m.player2Id);
      return p1 && p2 && !p1.isHuman && !p2.isHuman;
    }).length;
  }, [tournamentState, participantsMap]);

  // Launch active match in GameBoard
  const handlePlayMatch = (match: TournamentMatch) => {
    if (!tournamentState || !match.player1Id || !match.player2Id) return;
    const p1 = participantsMap.get(match.player1Id);
    const p2 = participantsMap.get(match.player2Id);
    if (!p1 || !p2) return;

    onLaunchTournamentMatch(match, p1, p2);
  };

  // Quick simulation for single Bot vs Bot match
  const handleSimulateMatch = (match: TournamentMatch) => {
    if (!tournamentState || !match.player1Id || !match.player2Id) return;
    const p1 = participantsMap.get(match.player1Id);
    const p2 = participantsMap.get(match.player2Id);
    if (!p1 || !p2) return;

    const sim = simulateMatch(p1, p2);
    const winner = sim.winnerId === p1.id ? p1 : p2;
    const updated = applyMatchResult(
      tournamentState,
      match.id,
      sim.winnerId,
      sim.score1,
      sim.score2
    );

    setTournamentState(updated);
    saveActiveTournament(updated);
    onShowToast((t?.toastTournamentSimWin || "⚡ Simulation : {name} l'emporte !").replace('{name}', winner.name));
  };

  // Fast-forward / simulate all currently ready AI vs AI matches
  const handleSimulateAllReadyAiMatches = () => {
    if (!tournamentState) return;
    let current = tournamentState;
    let simulatedCount = 0;

    for (const m of current.matches) {
      if (m.status === 'ready' && m.player1Id && m.player2Id && m.winnerId === null) {
        const p1 = current.participants.find(p => p.id === m.player1Id);
        const p2 = current.participants.find(p => p.id === m.player2Id);
        if (p1 && p2 && !p1.isHuman && !p2.isHuman) {
          const sim = simulateMatch(p1, p2);
          current = applyMatchResult(current, m.id, sim.winnerId, sim.score1, sim.score2);
          simulatedCount++;
        }
      }
    }

    if (simulatedCount > 0) {
      setTournamentState(current);
      saveActiveTournament(current);
      sound.playMove();
      onShowToast((t?.toastTournamentSimCount || '⚡ {count} match(s) IA simulé(s) avec succès !').replace('{count}', String(simulatedCount)));
    } else {
      onShowToast(t?.tournamentSimFinished || 'Tous les matchs IA sont à jour.');
    }
  };

  // Reset tournament to create a new one
  const handleResetTournament = () => {
    if (onAbandonTournament) {
      onAbandonTournament();
    } else {
      setTournamentState(null);
      saveActiveTournament(null);
    }
    setStep('mode_select');
  };

  // User participant and elimination status
  const userParticipant = useMemo(() => {
    if (!tournamentState) return null;
    return tournamentState.participants.find(p => p.id === tournamentState.userParticipantId) || null;
  }, [tournamentState]);

  const isUserEliminated = Boolean(userParticipant?.isEliminated);

  // Simulate all remaining matches to conclusion
  const handleSimulateRestOfTournament = () => {
    if (!tournamentState) return;
    const completed = simulateRemainingTournament(tournamentState);
    setTournamentState(completed);
    saveActiveTournament(completed);
    sound.playVictory();
    onShowToast(t?.toastTournamentCompleted || '🏆 Le tournoi s’est achevé ! Voici les résultats complets.');
  };

  // Confetti on champion display
  useEffect(() => {
    if (tournamentState?.champion) {
      try {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.55 },
        });
      } catch {
        // Ignore
      }
    }
  }, [tournamentState?.champion]);

  // Round matches separation according to chosen format
  const format = tournamentState?.format || 'knockout8';

  const r32Matches = useMemo(() => {
    if (format !== 'knockout32') return [];
    return tournamentState?.matches.filter(m => m.round === 1) || [];
  }, [tournamentState, format]);

  const r16Matches = useMemo(() => {
    if (format === 'knockout32') {
      return tournamentState?.matches.filter(m => m.round === 2) || [];
    }
    if (format === 'knockout16') {
      return tournamentState?.matches.filter(m => m.round === 1) || [];
    }
    return [];
  }, [tournamentState, format]);

  const qfMatches = useMemo(() => {
    if (format === 'knockout32') {
      return tournamentState?.matches.filter(m => m.round === 3) || [];
    }
    if (format === 'knockout16') {
      return tournamentState?.matches.filter(m => m.round === 2) || [];
    }
    if (format === 'knockout8') {
      return tournamentState?.matches.filter(m => m.round === 1) || [];
    }
    return [];
  }, [tournamentState, format]);

  const sfMatches = useMemo(() => {
    if (format === 'knockout32') {
      return tournamentState?.matches.filter(m => m.round === 4) || [];
    }
    if (format === 'knockout16') {
      return tournamentState?.matches.filter(m => m.round === 3) || [];
    }
    if (format === 'knockout8') {
      return tournamentState?.matches.filter(m => m.round === 2) || [];
    }
    if (format === 'knockout4') {
      return tournamentState?.matches.filter(m => m.round === 1) || [];
    }
    return [];
  }, [tournamentState, format]);

  const finalMatch = useMemo(() => {
    return (
      tournamentState?.matches.find(
        m =>
          m.roundName.includes('Finale') &&
          !m.roundName.includes('Demi') &&
          !m.roundName.includes('Quart') &&
          !m.roundName.includes('1/8') &&
          !m.roundName.includes('1/16') &&
          !m.roundName.includes('Bronze') &&
          !m.roundName.includes('3ème') &&
          !m.isThirdPlace
      ) || null
    );
  }, [tournamentState]);

  const bronzeMatch = useMemo(() => {
    return (
      tournamentState?.matches.find(
        m => m.isThirdPlace || m.roundName.includes('Bronze') || m.roundName.includes('3ème')
      ) || null
    );
  }, [tournamentState]);

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-6 flex flex-col h-full max-h-screen overflow-y-auto pb-24 text-amber-100 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/20">
        <button
          type="button"
          onClick={
            step === 'bracket' && tournamentState
              ? onBack
              : step !== 'mode_select'
              ? () => setStep('mode_select')
              : onBack
          }
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 font-bold text-xs sm:text-sm border border-amber-500/30 transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 'bracket' || step === 'mode_select' ? (t?.home || 'Menu') : (t?.back || 'Retour')}</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-black">
            <Trophy className="w-5 h-5 fill-black" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-black tracking-wider text-amber-300">
              {t?.tournamentModeTitle || 'MODE TOURNOI (12 PIONS)'}
            </h1>
            <span className="text-[10px] text-amber-400/80 font-semibold">
              {tournamentState ? tournamentState.name : (t?.tournamentChooseModeDesc || '3 Modes Disponibles')}
            </span>
          </div>
        </div>

        {tournamentState && (
          <button
            type="button"
            onClick={handleResetTournament}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40 transition-all active:scale-95 shadow-sm cursor-pointer"
            title={t?.tournamentNewTournament || 'Nouveau Tournoi'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{t?.tournamentNewTournament || 'Nouveau'}</span>
          </button>
        )}
      </div>

      {/* ─── ÉCRAN 1 : SÉLECTION DES 3 MODES (VS ORDINATEUR, LOCAL, EN LIGNE) ─── */}
      {step === 'mode_select' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full animate-fade-in py-2">
          <div className="text-center mb-5">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2 inline-block">
              🏆 {t?.tournament || 'Championnat Officiel'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wide">
              {t?.tournamentChooseMode || 'Choisissez votre Mode de Tournoi'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-lg mx-auto">
              {t?.tournamentChooseModeDesc || '3 modes simples : VS Ordinateur, Jeu Local à plusieurs, ou En Ligne.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-6">
            {/* Mode 1: VS ORDINATEUR (SOLO VS IA) - PRIMARY! */}
            <div
              onClick={() => {
                setSelectedMode('solo_ai');
                setStep('setup');
              }}
              className="group relative p-5 rounded-2xl bg-gradient-to-b from-[#1b1506] to-[#0c0903] border-3 border-amber-400 hover:border-yellow-300 cursor-pointer shadow-2xl transition-all hover:scale-[1.02] active:scale-98 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-2xl shadow-md text-black">
                    🤖
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/50">
                    {t?.tournamentVsAiBadge || 'Solo vs IA'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-amber-300 group-hover:text-amber-200">
                  {t?.tournamentVsAi || '1. VS Ordinateur (Solo)'}
                </h3>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  {t?.tournamentVsAiDesc || 'Affrontez les meilleurs Maîtres IA du monde dans un arbre à élimination directe jusqu’à la Grande Finale !'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs text-amber-300 font-bold">
                <span>{t?.tournamentChooseStartingStage || 'Au choix : 1/16, 1/8, 1/4, 1/2'}</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-amber-400 font-black">
                  {t?.play || 'Configurer'} ➜
                </span>
              </div>
            </div>

            {/* Mode 2: LOCAL (PASS & PLAY) */}
            <div
              onClick={() => {
                setSelectedMode('local');
                setStep('setup');
              }}
              className="group relative p-5 rounded-2xl bg-gradient-to-b from-[#0a3828] to-[#041a12] border-2 border-emerald-500/40 hover:border-emerald-400 cursor-pointer shadow-xl transition-all hover:scale-[1.02] active:scale-98 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center text-2xl shadow-md text-black">
                    👥
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/30">
                    {t?.tournamentLocalBadge || 'Même Appareil'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-amber-300 group-hover:text-amber-200">
                  {t?.tournamentLocal || '2. Jeu Local (Pass & Play)'}
                </h3>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  {t?.tournamentLocalDesc || 'Organisez un grand tournoi en famille ou entre amis sur le même écran avec passage de relais.'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs text-amber-400 font-bold">
                <span>{t?.sameDevice || 'Pass & Play Local'}</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  {t?.play || 'Configurer'} ➜
                </span>
              </div>
            </div>

            {/* Mode 3: EN LIGNE (MATCHMAKING MONDIAL) */}
            <div
              onClick={() => {
                setSelectedMode('global');
                startGlobalMatchmaking();
              }}
              className="group relative p-5 rounded-2xl bg-gradient-to-b from-[#0a3828] to-[#041a12] border-2 border-amber-500/30 hover:border-amber-400 cursor-pointer shadow-xl transition-all hover:scale-[1.02] active:scale-98 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-400 flex items-center justify-center text-2xl shadow-md text-black animate-pulse">
                    🌍
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                    {t?.tournamentOnlineBadge || 'En Ligne Live'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-amber-300 group-hover:text-amber-200">
                  {t?.tournamentOnline || '3. En Ligne (Mondial)'}
                </h3>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  {t?.tournamentOnlineDesc || 'Rejoignez la file d’attente mondiale. Dès que 8 champions sont connectés, l’arbre se lance automatiquement !'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs text-amber-400 font-bold">
                <span>{t?.onlinePlayersCount || '8 Joueurs Requis'}</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  {t?.tournamentLaunch || 'Rejoindre'} ➜
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ÉCRAN 2 : CONFIGURATION DU TOURNOI & CHOIX DE L'ÉTAPE DE DÉPART ─── */}
      {step === 'setup' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full animate-fade-in py-2">
          <div className="w-full p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-[#103b29] to-[#082217] border-2 border-amber-400/50 shadow-2xl">
            <div className="text-center mb-5">
              <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 mb-2 inline-block">
                {selectedMode === 'solo_ai'
                  ? (t?.tournamentVsAi || '🤖 Mode VS Ordinateur (Solo)')
                  : (t?.tournamentLocal || '👥 Mode Tournoi Local (Pass & Play)')}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-amber-300">
                {t?.tournamentChooseStartingStage || 'Choisissez l’Étape de Départ du Tournoi'}
              </h2>
              <p className="text-xs text-gray-300 mt-1">
                {t?.tournamentChooseStageHint || 'Commencez directement au stade de votre choix : seizième, huitième, quart ou demi-finale.'}
              </p>
            </div>

            {/* CHOIX DES 4 FORMATS DE DÉPART */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
              {/* Option 1: 1/16 de Finale (32 Maîtres) */}
              <button
                type="button"
                onClick={() => setSelectedFormat('knockout32')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedFormat === 'knockout32'
                    ? 'bg-amber-500/25 border-amber-300 ring-2 ring-amber-400/40 shadow-lg'
                    : 'bg-black/30 border-amber-500/20 hover:border-amber-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">⚔️</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                    {t?.tournamentPlayers5Rounds || '32 Joueurs · 5 Tours'}
                  </span>
                </div>
                <h4 className="text-sm font-black text-amber-200">
                  {t?.tournamentRoundOf32 || '1/16 de Finale (Seizième)'}
                </h4>
                <p className="text-[11px] text-gray-300 mt-1 leading-snug">
                  {t?.tournamentRoundOf32Desc || 'Le grand marathon royal des 32 Maîtres jusqu’à la gloire suprême.'}
                </p>
              </button>

              {/* Option 2: 1/8 de Finale (16 Maîtres) */}
              <button
                type="button"
                onClick={() => setSelectedFormat('knockout16')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedFormat === 'knockout16'
                    ? 'bg-amber-500/25 border-amber-300 ring-2 ring-amber-400/40 shadow-lg'
                    : 'bg-black/30 border-amber-500/20 hover:border-amber-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">🛡️</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                    {t?.tournamentPlayers4Rounds || '16 Joueurs · 4 Tours'}
                  </span>
                </div>
                <h4 className="text-sm font-black text-amber-200">
                  {t?.tournamentRoundOf16 || '1/8 de Finale (Huitième)'}
                </h4>
                <p className="text-[11px] text-gray-300 mt-1 leading-snug">
                  {t?.tournamentRoundOf16Desc || 'Le format classique officiel des huitièmes de finale à la finale.'}
                </p>
              </button>

              {/* Option 3: 1/4 de Finale (8 Maîtres) */}
              <button
                type="button"
                onClick={() => setSelectedFormat('knockout8')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedFormat === 'knockout8'
                    ? 'bg-amber-500/25 border-amber-300 ring-2 ring-amber-400/40 shadow-lg'
                    : 'bg-black/30 border-amber-500/20 hover:border-amber-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">⚡</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                    {t?.tournamentPlayers3Rounds || '8 Joueurs · 3 Tours'}
                  </span>
                </div>
                <h4 className="text-sm font-black text-amber-200">
                  {t?.tournamentQuarterFinals || 'Quart de Finale'}
                </h4>
                <p className="text-[11px] text-gray-300 mt-1 leading-snug">
                  {t?.tournamentQuarterFinalsDesc || 'Format rapide et intense dès les quarts de finale.'}
                </p>
              </button>

              {/* Option 4: Demi-Finale (4 Maîtres) */}
              <button
                type="button"
                onClick={() => setSelectedFormat('knockout4')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedFormat === 'knockout4'
                    ? 'bg-amber-500/25 border-amber-300 ring-2 ring-amber-400/40 shadow-lg'
                    : 'bg-black/30 border-amber-500/20 hover:border-amber-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">👑</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                    {t?.tournamentPlayers2Rounds || '4 Joueurs · 2 Tours'}
                  </span>
                </div>
                <h4 className="text-sm font-black text-amber-200">
                  {t?.tournamentSemiFinals || 'Demi-Finale'}
                </h4>
                <p className="text-[11px] text-gray-300 mt-1 leading-snug">
                  {t?.tournamentSemiFinalsDesc || 'Sprint express : demi-finales immédiates puis Grande Finale !'}
                </p>
              </button>
            </div>

            {/* In Local Mode: Player names customization */}
            {selectedMode === 'local' && (
              <div className="space-y-2 mb-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 uppercase">
                    {(t?.tournamentPlayerNamesLabel || 'Noms des {count} Joueurs').replace(
                      '{count}',
                      String(selectedFormat === 'knockout32' ? 32 : selectedFormat === 'knockout16' ? 16 : selectedFormat === 'knockout8' ? 8 : 4)
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalPlayers(prev => prev.map((_, i) => `Champion ${i + 1}`));
                      onShowToast(t?.toastTournamentNamesReset || 'Noms réinitialisés !');
                    }}
                    className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                  >
                    {t?.tournamentAutoFillBtn || 'Remplissage auto'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from({
                    length: selectedFormat === 'knockout32' ? 32 : selectedFormat === 'knockout16' ? 16 : selectedFormat === 'knockout8' ? 8 : 4,
                  }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-black/40 border border-amber-500/20">
                      <span className="text-[11px] font-black text-amber-400 w-6 text-center">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={localPlayers[idx] || `Joueur ${idx + 1}`}
                        onChange={e => {
                          const val = e.target.value;
                          setLocalPlayers(prev => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                        }}
                        className="flex-1 bg-transparent text-xs text-amber-200 font-bold focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Launch Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('mode_select')}
                className="py-3 px-4 rounded-xl border border-white/20 text-xs font-bold text-gray-300 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
              >
                {t?.cancel || 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleLaunchConfiguredTournament}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{t?.tournamentLaunch || 'Générer l’Arbre & Lancer le Tournoi'}</span>
                <span>➜</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ÉCRAN 3 : MATCHMAKING MONDIAL EN DIRECT ─── */}
      {step === 'matching' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full animate-fade-in py-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/30 text-black mb-4 animate-bounce">
            🌍
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-amber-300 mb-1">
            {t?.searchingOpponent || 'Recherche de Champions en Ligne'}
          </h2>
          <p className="text-xs text-amber-200/80 mb-6">
            {t?.tournamentGlobalDesc || 'Réseau mondial : qualification en direct pour l’arbre royal 12 PIONS.'}
          </p>

          <div className="w-full bg-black/50 border border-amber-500/30 rounded-2xl p-4 mb-4 text-left">
            <div className="flex items-center justify-between text-xs font-black text-amber-400 mb-2">
              <span>{t?.connectedPlayersUpper || 'JOUEURS CONNECTÉS'}</span>
              <span className="text-emerald-400 animate-pulse">{matchmakingCount} / 8</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${(matchmakingCount / 8) * 100}%` }}
              />
            </div>
            <div className="space-y-1 text-[11px] text-gray-300 font-mono max-h-32 overflow-y-auto">
              {matchmakingLogs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep('mode_select')}
            className="py-2.5 px-6 rounded-xl border border-white/20 text-xs font-bold text-gray-300 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            {t?.cancel || 'Annuler la recherche'}
          </button>
        </div>
      )}

      {/* ─── ÉCRAN 4 : ARBRE DU TOURNOI & ÉVOLUTION DES MATCHS ─── */}
      {step === 'bracket' && tournamentState && (
        <div className="flex-1 flex flex-col w-full animate-fade-in">
          {/* Top Quick Status & Actions Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 rounded-2xl bg-[#082418]/90 border border-amber-400/40 shadow-md">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase">
                {tournamentState.format === 'knockout32'
                  ? (t?.tournamentStage32Tag || '32 Maîtres · 1/16')
                  : tournamentState.format === 'knockout16'
                  ? (t?.tournamentStage16Tag || '16 Maîtres · 1/8')
                  : tournamentState.format === 'knockout8'
                  ? (t?.tournamentStage8Tag || '8 Maîtres · Quarts')
                  : (t?.tournamentStage4Tag || '4 Maîtres · Demis')}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                🟢 {tournamentState.participants.filter(p => !p.isEliminated).length} {t?.tournamentInRunning || 'En lice'}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-bold">
                ❌ {tournamentState.participants.filter(p => p.isEliminated).length} {t?.eliminatedCountLabel || 'Éliminés'}
              </span>
              <span className="text-xs text-amber-100 font-bold hidden md:inline ml-1">
                {tournamentState.status === 'completed'
                  ? (t?.tournamentChampionCrowned || '🏆 Tournoi Terminé !')
                  : userReadyMatch
                  ? (t?.tournamentYourTurnBanner || '⚔️ C’est votre tour de jouer !')
                  : readyAiMatchesCount > 0
                  ? (t?.aiMatchesReadyCount || '⚡ {count} match(s) IA prêts à être simulés').replace('{count}', String(readyAiMatchesCount))
                  : (t?.tournamentWaitingWinners || 'En attente des vainqueurs...')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Highlight button if user's match is ready */}
              {userReadyMatch && (
                <button
                  type="button"
                  onClick={() => handlePlayMatch(userReadyMatch)}
                  className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer animate-pulse"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>{t?.tournamentPlayMatch || 'JOUER MON MATCH'}</span>
                </button>
              )}

              {/* Fast simulate all ready AI matches */}
              {readyAiMatchesCount > 0 && (
                <button
                  type="button"
                  onClick={handleSimulateAllReadyAiMatches}
                  className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-400/40 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t?.tournamentSimulateRound || 'Simuler les Matchs IA'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Elimination Banner if human player was eliminated */}
          {isUserEliminated && tournamentState.status !== 'completed' && (
            <div className="w-full p-3 rounded-2xl bg-gradient-to-r from-rose-950/90 via-red-950/80 to-rose-950/90 border-2 border-rose-500/60 mb-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-400 flex items-center justify-center text-xl shrink-0">
                  ❌
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-rose-300">
                    {(t?.eliminatedInRoundMsg || 'Vous avez été éliminé en {round}').replace('{round}', userParticipant?.eliminatedInRound || '')}
                  </div>
                  <div className="text-[11px] text-gray-300">
                    {t?.tournamentEliminatedBannerSub || 'Le tournoi continue entre les autres champions ! Vous pouvez simuler la suite ou recommencer.'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleSimulateRestOfTournament}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>{t?.simulateNextBtn || 'Simuler la suite'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetTournament}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-rose-200 border border-rose-400/40 font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t?.newTournamentBtn || 'Nouveau Tournoi'}</span>
                </button>
              </div>
            </div>
          )}

          {/* DYNAMIC BRACKET COLUMNS SCROLLER */}
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex items-start gap-4 min-w-[760px] lg:min-w-[960px] justify-between">
              {/* 1. SEIZIÈMES DE FINALE (si 32 participants) */}
              {format === 'knockout32' && r32Matches.length > 0 && (
                <div className="flex flex-col gap-2 w-56 shrink-0">
                  <div className="text-center pb-1.5 border-b border-amber-500/20 font-black text-xs tracking-wider text-amber-400">
                    {(t?.tournamentRoundOf32 || '1/16 DE FINALE').toUpperCase()} ({(t?.tournamentMatchCount || '{count} MATCHS').replace('{count}', String(r32Matches.length))})
                  </div>
                  {r32Matches.map((m, idx) => renderMatchCard(m, idx, '1/16'))}
                </div>
              )}

              {/* 2. HUITIÈMES DE FINALE (si 32 ou 16 participants) */}
              {(format === 'knockout32' || format === 'knockout16') && r16Matches.length > 0 && (
                <div className={`flex flex-col ${format === 'knockout32' ? 'gap-6' : 'gap-2.5'} w-56 shrink-0`}>
                  <div className="text-center pb-1.5 border-b border-amber-500/20 font-black text-xs tracking-wider text-amber-400">
                    {(t?.tournamentRoundOf16 || '1/8 DE FINALE').toUpperCase()} ({(t?.tournamentMatchCount || '{count} MATCHS').replace('{count}', String(r16Matches.length))})
                  </div>
                  {r16Matches.map((m, idx) => renderMatchCard(m, idx, '1/8'))}
                </div>
              )}

              {/* 3. QUARTS DE FINALE (si 32, 16 ou 8 participants) */}
              {qfMatches.length > 0 && (
                <div className={`flex flex-col ${format === 'knockout32' ? 'gap-16' : format === 'knockout16' ? 'gap-8' : 'gap-3'} w-56 shrink-0`}>
                  <div className="text-center pb-1.5 border-b border-amber-500/20 font-black text-xs tracking-wider text-amber-400">
                    {(t?.tournamentQuarterFinals || 'QUARTS DE FINALE').toUpperCase()} ({(t?.tournamentMatchCount || '{count} MATCHS').replace('{count}', String(qfMatches.length))})
                  </div>
                  {qfMatches.map((m, idx) => renderMatchCard(m, idx, 'QF'))}
                </div>
              )}

              {/* 4. DEMI-FINALES (2 MATCHS) */}
              {sfMatches.length > 0 && (
                <div className={`flex flex-col ${format === 'knockout32' ? 'gap-36' : format === 'knockout16' ? 'gap-20' : 'gap-10'} w-56 shrink-0`}>
                  <div className="text-center pb-1.5 border-b border-amber-500/20 font-black text-xs tracking-wider text-amber-400">
                    {(t?.tournamentSemiFinals || 'DEMI-FINALES').toUpperCase()} ({(t?.tournamentMatchCount || '{count} MATCHS').replace('{count}', String(sfMatches.length))})
                  </div>
                  {sfMatches.map((m, idx) => renderMatchCard(m, idx, 'SF'))}
                </div>
              )}

              {/* 5. GRANDE FINALE & 3ÈME PLACE */}
              <div className="flex flex-col gap-4 w-60 shrink-0">
                <div className="text-center pb-1.5 border-b border-amber-500/20 font-black text-xs tracking-wider text-amber-400 flex items-center justify-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{t?.tournamentFinal || 'GRANDE FINALE'}</span>
                </div>

                {/* Final Match Card */}
                {finalMatch && renderFinalCard(finalMatch)}

                {/* Bronze 3rd Place Match Card */}
                {bronzeMatch && renderBronzeCard(bronzeMatch)}
              </div>
            </div>
          </div>

          {/* ─── MODALE OFFICIELLE DE CÉLÉBRATION DU CHAMPION ─── */}
          {tournamentState.champion && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
              <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#123e2b] via-[#082417] to-[#04140c] border-2 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.6)] text-center flex flex-col items-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/50 text-black mb-3 animate-bounce">
                  <Trophy className="w-12 h-12 fill-black" />
                </div>

                <span className="px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 font-black text-xs mb-2">
                  🏆 {t?.tournamentChampionTitle || 'CHAMPION DU TOURNOI 12 PIONS'} 🏆
                </span>

                <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 mb-1">
                  {tournamentState.champion.flag} {tournamentState.champion.name}
                </div>

                <p className="text-xs text-amber-200/90 mb-5 leading-relaxed">
                  {tournamentState.champion.isHuman
                    ? (t?.tournamentUserWinDesc || 'Félicitations ! Vous avez triomphé à travers tous les tours et remporté la couronne suprême de Grand Maître ! +2 500 Pièces & +1 200 XP !')
                    : (t?.tournamentAiWinDesc || 'Le redoutable Maître {name} remporte le tournoi 12 PIONS ! Tentez votre revanche !').replace('{name}', tournamentState.champion.name)}
                </p>

                {/* PODIUM DES 3 PREMIERS */}
                <div className="w-full grid grid-cols-3 gap-1.5 p-2 rounded-2xl bg-black/40 border border-amber-400/30 mb-5 text-center text-xs">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center p-1.5 rounded-xl bg-gray-900/60">
                    <span className="text-sm">🥈</span>
                    <span className="text-[10px] text-gray-400 font-bold">{t?.place2nd || '2ème'}</span>
                    <span className="text-[11px] font-black text-gray-200 truncate max-w-[80px]">
                      {tournamentState.runnerUpId ? participantsMap.get(tournamentState.runnerUpId)?.name : (t?.tournamentFinalist || 'Finaliste')}
                    </span>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center p-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40">
                    <span className="text-base">🥇</span>
                    <span className="text-[10px] text-amber-300 font-black">{t?.championLabel || 'Champion'}</span>
                    <span className="text-[11px] font-black text-amber-300 truncate max-w-[80px]">
                      {tournamentState.champion.name}
                    </span>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center p-1.5 rounded-xl bg-amber-900/30">
                    <span className="text-sm">🥉</span>
                    <span className="text-[10px] text-amber-600 font-bold">{t?.place3rd || '3ème'}</span>
                    <span className="text-[11px] font-black text-amber-200 truncate max-w-[80px]">
                      {tournamentState.thirdPlaceId ? participantsMap.get(tournamentState.thirdPlaceId)?.name : '🥉'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={handleResetTournament}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    {t?.tournamentNewTournament || 'Nouveau Tournoi'}
                  </button>

                  <button
                    type="button"
                    onClick={onBack}
                    className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-amber-200 font-bold text-xs sm:text-sm border border-amber-400/30 transition-all active:scale-95 cursor-pointer"
                  >
                    {t?.tournamentBackToMenu || 'Retour au Menu'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Helper renderer for standard bracket match cards
  function renderMatchCard(m: TournamentMatch, idx: number, stagePrefix: string) {
    const p1 = m.player1Id ? participantsMap.get(m.player1Id) : null;
    const p2 = m.player2Id ? participantsMap.get(m.player2Id) : null;
    const isReady = m.status === 'ready' && m.player1Id !== null && m.player2Id !== null && m.winnerId === null;
    const isUserMatch = (m.player1Id === tournamentState?.userParticipantId || m.player2Id === tournamentState?.userParticipantId);
    const isActive = isReady;
    const isFinished = m.winnerId !== null;
    const isHumanMatch = (p1?.isHuman || p2?.isHuman);
    const isBothAI = p1 && p2 && !p1.isHuman && !p2.isHuman;

    return (
      <div
        key={m.id}
        className={`p-2.5 rounded-2xl border transition-all ${
          isActive
            ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
            : isFinished
            ? 'bg-black/45 border-amber-500/20 opacity-85'
            : 'bg-[#082217]/80 border-amber-500/20'
        }`}
      >
        <div className="flex items-center justify-between text-[9px] font-black text-amber-400/80 mb-1.5">
          <span>{stagePrefix} #{idx + 1}</span>
          {m.isDraw ? (
            <span className="text-amber-400 flex items-center gap-1 font-bold">
              {t?.tournamentDrawReplay || '🤝 Match Nul (À rejouer)'}
            </span>
          ) : isFinished ? (
            <span className="text-emerald-400 flex items-center gap-0.5 font-bold">
              <CheckCircle2 className="w-2.5 h-2.5" /> {t?.tournamentMatchFinished || 'Terminé'}
            </span>
          ) : isActive ? (
            <span className="text-amber-300 font-black animate-pulse">{t?.readyBadgeUpper || 'PRÊT'}</span>
          ) : null}
        </div>

        {/* Player 1 */}
        <div
          className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] font-bold mb-1 transition-all ${
            m.winnerId === p1?.id
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-sm'
              : m.winnerId && m.winnerId !== p1?.id
              ? 'bg-rose-950/30 text-rose-300/70 border border-rose-900/40 line-through'
              : 'text-amber-100 bg-black/20'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span>{p1?.flag || '⏳'}</span>
            <span className="truncate">{p1?.name || (t?.tournamentWaitingQF || 'En attente...')}</span>
          </div>
          {m.winnerId === p1?.id ? (
            <span className="flex items-center gap-1 text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/40">
              <Crown className="w-2.5 h-2.5 text-amber-400" /> {t?.qualifiedBadgeUpper || 'QUALIFIÉ'}
            </span>
          ) : m.winnerId && m.winnerId !== p1?.id ? (
            <span className="text-[8px] font-black text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/40 not-italic">
              {t?.eliminatedBadgeUpper || 'ÉLIMINÉ'}
            </span>
          ) : null}
        </div>

        {/* Player 2 */}
        <div
          className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] font-bold transition-all ${
            m.winnerId === p2?.id
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-sm'
              : m.winnerId && m.winnerId !== p2?.id
              ? 'bg-rose-950/30 text-rose-300/70 border border-rose-900/40 line-through'
              : 'text-amber-100 bg-black/20'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span>{p2?.flag || '⏳'}</span>
            <span className="truncate">{p2?.name || (t?.tournamentWaitingQF || 'En attente...')}</span>
          </div>
          {m.winnerId === p2?.id ? (
            <span className="flex items-center gap-1 text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/40">
              <Crown className="w-2.5 h-2.5 text-amber-400" /> {t?.qualifiedBadgeUpper || 'QUALIFIÉ'}
            </span>
          ) : m.winnerId && m.winnerId !== p2?.id ? (
            <span className="text-[8px] font-black text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/40 not-italic">
              {t?.eliminatedBadgeUpper || 'ÉLIMINÉ'}
            </span>
          ) : null}
        </div>

        {/* Action Buttons */}
        {isActive && (
          <div className="mt-2 pt-1.5 border-t border-amber-500/30 flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePlayMatch(m)}
              className={`flex-1 py-1 px-2 rounded-lg font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer ${
                m.isDraw
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                  : isHumanMatch
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black'
              }`}
            >
              {m.isDraw ? <RotateCcw className="w-3 h-3 text-black" /> : <Play className="w-3 h-3 fill-black" />}
              <span>{m.isDraw ? (t?.tournamentReplayMatchBtn || 'REJOUER LE MATCH') : isHumanMatch ? (t?.tournamentPlayMatch || 'JOUER') : (t?.play || 'JOUER')}</span>
            </button>
            {isBothAI && !m.isDraw && (
              <button
                type="button"
                onClick={() => handleSimulateMatch(m)}
                className="py-1 px-2 rounded-lg bg-white/10 text-amber-300 font-bold text-[11px] border border-amber-400/30 flex items-center gap-1 cursor-pointer hover:bg-white/20"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{t?.tournamentSimulateMatch || 'Simuler'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Helper renderer for Grand Final card
  function renderFinalCard(m: TournamentMatch) {
    const p1 = m.player1Id ? participantsMap.get(m.player1Id) : null;
    const p2 = m.player2Id ? participantsMap.get(m.player2Id) : null;
    const isActive = m.status === 'ready' && m.player1Id !== null && m.player2Id !== null && m.winnerId === null;
    const isFinished = m.winnerId !== null;
    const isBothAI = p1 && p2 && !p1.isHuman && !p2.isHuman;

    return (
      <div
        className={`p-3.5 rounded-2xl border-2 transition-all ${
          isActive
            ? 'bg-amber-950/95 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.5)]'
            : isFinished
            ? 'bg-black/50 border-amber-500/30'
            : 'bg-[#082217]/90 border-amber-500/30'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-black text-amber-400 mb-2">
          <span className="flex items-center gap-1">
            <Swords className="w-3.5 h-3.5 text-amber-400" /> {t?.tournamentFinalClash || 'LE CHOC FINAL'}
          </span>
          {isFinished && (
            <span className="text-emerald-400 flex items-center gap-1 font-bold text-[10px]">
              <CheckCircle2 className="w-3 h-3" /> {t?.tournamentChampionCrowned || 'Terminé'}
            </span>
          )}
        </div>

        {/* Player 1 */}
        <div
          className={`flex items-center justify-between p-1.5 rounded-xl text-xs font-bold mb-1.5 ${
            m.winnerId === p1?.id
              ? 'bg-amber-500/30 text-amber-200 border border-amber-400'
              : m.winnerId && m.winnerId !== p1?.id
              ? 'text-gray-400 bg-black/40 border border-gray-700/40 line-through'
              : 'text-amber-100 bg-black/30'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-sm">{p1?.flag || '⏳'}</span>
            <span className="truncate font-black">{p1?.name || (t?.tournamentFinalist || 'Finaliste 1')}</span>
          </div>
          {m.winnerId === p1?.id ? (
            <span className="flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-500/30 px-2 py-0.5 rounded-full border border-amber-400/50">
              <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" /> {(t?.championLabel || 'CHAMPION').toUpperCase()}
            </span>
          ) : m.winnerId && m.winnerId !== p1?.id ? (
            <span className="text-[9px] font-black text-gray-300 bg-gray-800/80 px-2 py-0.5 rounded-full border border-gray-600/50 not-italic">
              🥈 {t?.place2ndFull || '2ème Place'}
            </span>
          ) : null}
        </div>

        {/* Player 2 */}
        <div
          className={`flex items-center justify-between p-1.5 rounded-xl text-xs font-bold ${
            m.winnerId === p2?.id
              ? 'bg-amber-500/30 text-amber-200 border border-amber-400'
              : m.winnerId && m.winnerId !== p2?.id
              ? 'text-gray-400 bg-black/40 border border-gray-700/40 line-through'
              : 'text-amber-100 bg-black/30'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-sm">{p2?.flag || '⏳'}</span>
            <span className="truncate font-black">{p2?.name || (t?.tournamentFinalist || 'Finaliste 2')}</span>
          </div>
          {m.winnerId === p2?.id ? (
            <span className="flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-500/30 px-2 py-0.5 rounded-full border border-amber-400/50">
              <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" /> {(t?.championLabel || 'CHAMPION').toUpperCase()}
            </span>
          ) : m.winnerId && m.winnerId !== p2?.id ? (
            <span className="text-[9px] font-black text-gray-300 bg-gray-800/80 px-2 py-0.5 rounded-full border border-gray-600/50 not-italic">
              🥈 {t?.place2ndFull || '2ème Place'}
            </span>
          ) : null}
        </div>

        {/* Action Button */}
        {isActive && (
          <div className="mt-2.5 pt-2 border-t border-amber-500/30 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePlayMatch(m)}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{t?.tournamentPlayFinal || 'JOUER LA FINALE'}</span>
            </button>
            {isBothAI && (
              <button
                type="button"
                onClick={() => handleSimulateMatch(m)}
                className="py-2 px-2.5 rounded-xl bg-white/10 text-amber-300 font-bold text-xs border border-amber-400/30 flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{t?.simulateShortBtn || 'Simuler'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Helper renderer for Bronze 3rd place card
  function renderBronzeCard(m: TournamentMatch) {
    const p1 = m.player1Id ? participantsMap.get(m.player1Id) : null;
    const p2 = m.player2Id ? participantsMap.get(m.player2Id) : null;
    const isActive = m.status === 'ready' && m.player1Id !== null && m.player2Id !== null && m.winnerId === null;
    const isFinished = m.winnerId !== null;

    return (
      <div className="p-2.5 rounded-2xl bg-black/40 border border-amber-500/20 text-xs">
        <div className="flex items-center justify-between text-[10px] font-black text-amber-400/80 mb-1.5">
          <span>🥉 {t?.tournamentBronze || 'MATCH 3ÈME PLACE'}</span>
          {isFinished && <span className="text-emerald-400 font-bold">{t?.tournamentMatchFinished || 'Terminé'}</span>}
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-200 mb-1">
          <span className="truncate">{p1?.flag || '⏳'} {p1?.name || (t?.tournamentWaitingSF || 'Demi-finaliste')}</span>
          {m.winnerId === p1?.id && <span className="text-amber-400 font-bold">🥉</span>}
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-200">
          <span className="truncate">{p2?.flag || '⏳'} {p2?.name || (t?.tournamentWaitingSF || 'Demi-finaliste')}</span>
          {m.winnerId === p2?.id && <span className="text-amber-400 font-bold">🥉</span>}
        </div>

        {isActive && (
          <button
            type="button"
            onClick={() => handlePlayMatch(m)}
            className="w-full mt-2 py-1 px-2 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs hover:bg-amber-500/30 border border-amber-400/40 cursor-pointer"
          >
            {t?.tournamentPlayBronze || 'Jouer la 3ème Place'}
          </button>
        )}
      </div>
    );
  }
};
