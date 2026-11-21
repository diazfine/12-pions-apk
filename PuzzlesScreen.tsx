import React, { useState } from 'react';
import { Board, Coord, ValidMove } from '../types';
import { PUZZLES, getCompletedPuzzleIds, markPuzzleCompleted } from '../utils/puzzlesData';
import { GameBoard } from './GameBoard';
import { calculateValidMoves, applyPromotions } from '../utils/gameLogic';
import { sound } from '../utils/audio';
import { ArrowLeft, Lightbulb, CheckCircle2, RotateCcw, ChevronRight, Award, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTranslation } from '../i18n/useTranslation';

interface PuzzlesScreenProps {
  onBack: () => void;
}

export const PuzzlesScreen: React.FC<PuzzlesScreenProps> = ({ onBack }) => {
  const { t, formatNumber } = useTranslation();
  const [completedIds, setCompletedIds] = useState<number[]>(getCompletedPuzzleIds);
  const [activePuzzleIndex, setActivePuzzleIndex] = useState<number | null>(null);

  // Puzzle playing states
  const [board, setBoard] = useState<Board | null>(null);
  const [selectedCoord, setSelectedCoord] = useState<Coord | null>(null);
  const [validMoves, setValidMoves] = useState<ValidMove[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const activePuzzle = activePuzzleIndex !== null ? PUZZLES[activePuzzleIndex] : null;

  // Arrêt d'urgence de tout son de puzzle lors du démontage ou retour au menu
  React.useEffect(() => {
    return () => {
      sound.stopPuzzleAudio();
      sound.killAllCelebrationAudio();
    };
  }, []);

  const getDifficultyLabel = (diff: string) => {
    if (diff === 'Facile' || diff === 'Easy') return t.easy || 'Facile';
    if (diff === 'Difficile' || diff === 'Hard') return t.hard || 'Difficile';
    return t.medium || 'Moyen';
  };

  const startPuzzle = (index: number) => {
    sound.stopPuzzleAudio();
    sound.killAllCelebrationAudio();
    const p = PUZZLES[index];
    setActivePuzzleIndex(index);
    setBoard(p.initialBoard.map(row => row.map(cell => (cell ? { ...cell } : null))));
    setSelectedCoord(null);
    setValidMoves([]);
    setCurrentStepIndex(0);
    setIsSuccess(false);
    setShowHint(false);
    setErrorFeedback(null);
  };

  const handleCellClick = (r: number, c: number) => {
    if (!board || isSuccess || !activePuzzle) return;

    if (selectedCoord) {
      const destMove = validMoves.find(vm => vm.r === r && vm.c === c);
      if (destMove) {
        handleExecutePuzzleMove(selectedCoord.r, selectedCoord.c, r, c, destMove);
        return;
      }

      // Re-select if friendly
      const clicked = board[r][c];
      if (clicked && clicked.c === activePuzzle.playerColor) {
        sound.playSelect();
        setSelectedCoord({ r, c });
        setValidMoves(calculateValidMoves(board, r, c, null, {}));
        return;
      }

      setSelectedCoord(null);
      setValidMoves([]);
      return;
    }

    const clicked = board[r][c];
    if (clicked && clicked.c === activePuzzle.playerColor) {
      sound.playSelect();
      setSelectedCoord({ r, c });
      setValidMoves(calculateValidMoves(board, r, c, null, {}));
    }
  };

  const handleExecutePuzzleMove = (
    fr: number,
    fc: number,
    tr: number,
    tc: number,
    destMove: ValidMove
  ) => {
    if (!board || !activePuzzle) return;

    const expectedStep = activePuzzle.solutionSteps[currentStepIndex];
    const isCorrect =
      expectedStep &&
      expectedStep.fr === fr &&
      expectedStep.fc === fc &&
      expectedStep.tr === tr &&
      expectedStep.tc === tc;

    if (!isCorrect) {
      // Wrong move
      sound.playPenalty();
      setErrorFeedback(t('puzzleWrongMove', 'Ce n’est pas le coup optimal. Essayez une autre approche !'));
      setSelectedCoord(null);
      setValidMoves([]);
      setTimeout(() => setErrorFeedback(null), 2500);
      return;
    }

    // Execute move on board
    const nextBoard = board.map(row => row.map(cell => (cell ? { ...cell } : null)));
    const movingPiece = nextBoard[fr][fc];
    if (!movingPiece) return;

    nextBoard[tr][tc] = movingPiece;
    nextBoard[fr][fc] = null;

    if (destMove.cr !== undefined && destMove.cc !== undefined) {
      nextBoard[destMove.cr][destMove.cc] = null;
      sound.playCapture();
    } else {
      sound.playMove();
    }

    applyPromotions(nextBoard, { r: tr, c: tc });
    setBoard(nextBoard);
    setSelectedCoord(null);
    setValidMoves([]);

    const nextStep = currentStepIndex + 1;
    if (nextStep >= activePuzzle.solutionSteps.length) {
      // Solved!
      setIsSuccess(true);
      sound.playPuzzleSuccess();
      markPuzzleCompleted(activePuzzle.id);
      setCompletedIds(getCompletedPuzzleIds());

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10B981', '#3B82F6'],
        });
      } catch {
        // Confetti fallback
      }
    } else {
      // Next step in chain
      setCurrentStepIndex(nextStep);
      const nextExpected = activePuzzle.solutionSteps[nextStep];
      setSelectedCoord({ r: nextExpected.fr, c: nextExpected.fc });
      setValidMoves(calculateValidMoves(nextBoard, nextExpected.fr, nextExpected.fc, null, {}));
    }
  };

  // If viewing list of puzzles
  if (activePuzzleIndex === null || !activePuzzle || !board) {
    return (
      <div className="w-full max-w-lg flex flex-col gap-4 py-2 animate-fade-in select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <button
            type="button"
            onClick={() => {
              sound.stopPuzzleAudio();
              sound.killAllCelebrationAudio();
              onBack();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.home || 'Menu principal'}</span>
          </button>

          <h2 className="text-base font-black text-amber-400 tracking-wider flex items-center gap-1.5 uppercase">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{t('tacticalPuzzles', 'DÉFIS TACTIQUES')}</span>
          </h2>
        </div>

        {/* Overview Banner */}
        <div className="bg-[#041a12] border border-amber-500/25 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <h3 className="text-sm font-black text-amber-300">
              {t('puzzlesSubtitle', 'Entraînement & Cas pratiques')}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {t('puzzlesDesc', 'Résolvez les situations pour maîtriser les prises forcées et les combos !')}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center bg-[#062a1e] px-3 py-2 rounded-xl border border-amber-500/20">
            <span className="text-base font-black text-amber-400 font-mono">
              {formatNumber(completedIds.length)} / {formatNumber(PUZZLES.length)}
            </span>
            <span className="text-[9px] text-gray-400 font-bold uppercase">
              {t('solved', 'Résolus')}
            </span>
          </div>
        </div>

        {/* Puzzle Cards List */}
        <div className="flex flex-col gap-2.5">
          {PUZZLES.map((puzzle, idx) => {
            const isDone = completedIds.includes(puzzle.id);
            return (
              <button
                key={puzzle.id}
                type="button"
                onClick={() => startPuzzle(idx)}
                className="w-full bg-[#041a12] hover:bg-[#062a1e] border border-amber-500/25 hover:border-amber-400/60 rounded-2xl p-3.5 flex items-center justify-between transition-all text-left group shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border font-mono ${
                      isDone
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : `#${formatNumber(puzzle.id)}`}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#f0e6c8] group-hover:text-amber-300 transition-colors">
                        {t(`puzzle_${puzzle.id}_title`, puzzle.title)}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          puzzle.difficulty === 'Facile'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : puzzle.difficulty === 'Moyen'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {getDifficultyLabel(puzzle.difficulty)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t(`puzzle_${puzzle.id}_objective`, puzzle.objective)}</p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Active Puzzle Play Screen
  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-3 py-1 animate-fade-in select-none">
      {/* Top Navigation */}
      <div className="w-full flex items-center justify-between border-b border-amber-500/20 pb-2">
        <button
          type="button"
          onClick={() => {
            sound.stopPuzzleAudio();
            sound.killAllCelebrationAudio();
            setActivePuzzleIndex(null);
          }}
          className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-amber-300 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('puzzleList', 'Liste des défis')}</span>
        </button>

        <span className="text-xs font-black text-amber-400">
          {t('challengePrefix', 'DÉFI')} #{formatNumber(activePuzzle.id)} · {getDifficultyLabel(activePuzzle.difficulty)}
        </span>

        <button
          type="button"
          onClick={() => startPuzzle(activePuzzleIndex)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-white/5 transition-colors cursor-pointer"
          title={t('restart', 'Recommencer')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Goal Banner */}
      <div className="w-full bg-[#041a12] border border-amber-500/25 rounded-xl p-3 flex flex-col gap-1 shadow-md text-center">
        <h3 className="text-xs font-black text-amber-300">{t(`puzzle_${activePuzzle.id}_title`, activePuzzle.title)}</h3>
        <p className="text-[11px] text-gray-300">{t(`puzzle_${activePuzzle.id}_objective`, activePuzzle.objective)}</p>
        <span className="text-[10px] font-bold text-emerald-400 mt-0.5">
          {t('puzzleTurnGreen', '🟢 Trait aux Verts — Trouvez le coup gagnant !')}
        </span>
      </div>

      {/* Error message if made wrong move */}
      {errorFeedback && (
        <div className="text-[11px] font-bold text-rose-300 bg-rose-950/80 border border-rose-500/50 px-3 py-1 rounded-lg animate-bounce">
          {errorFeedback}
        </div>
      )}

      {/* Interactive Board */}
      <GameBoard
        board={board}
        selectedCoord={selectedCoord}
        validMoves={validMoves}
        onCellClick={handleCellClick}
        flipped={true}
        showCoords={false}
        activeColor={activePuzzle.playerColor}
        disabled={isSuccess}
      />

      {/* Bottom Controls (Hint & Status) */}
      <div className="w-full max-w-[370px] sm:max-w-[420px] flex flex-col gap-2">
        {isSuccess ? (
          <div className="w-full bg-emerald-950/70 border-2 border-emerald-500/60 rounded-2xl p-4 flex flex-col items-center text-center gap-2 shadow-xl animate-fade-in">
            <div className="flex items-center gap-1 text-emerald-400 text-sm font-black uppercase">
              <Award className="w-4 h-4" />
              <span>{t('puzzleBravo', 'BRAVO ! DÉFI RÉUSSI !')}</span>
            </div>
            <p className="text-xs text-gray-300">
              {t('puzzleSolvedDesc', 'Vous avez trouvé la tactique parfaite pour cette situation.')}
            </p>
            <div className="flex gap-2 w-full mt-1">
              <button
                type="button"
                onClick={() => startPuzzle(activePuzzleIndex)}
                className="flex-1 py-2 rounded-xl bg-[#14142a] border border-amber-500/20 text-xs font-bold text-gray-300 hover:text-white cursor-pointer"
              >
                {t('playAgain', 'Rejouer')}
              </button>
              {activePuzzleIndex < PUZZLES.length - 1 ? (
                <button
                  type="button"
                  onClick={() => startPuzzle(activePuzzleIndex + 1)}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black shadow-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>{t('nextPuzzle', 'Défi suivant')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sound.stopPuzzleAudio();
                    sound.killAllCelebrationAudio();
                    setActivePuzzleIndex(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black shadow-md cursor-pointer"
                >
                  {t('allPuzzlesDone', 'Tous les défis terminés !')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-[#0f0f1e] border border-amber-500/15 rounded-xl px-3 py-2 text-xs">
            <button
              type="button"
              onClick={() => setShowHint(h => !h)}
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
            >
              <Lightbulb className="w-4 h-4" />
              <span>{showHint ? t('hideHint', 'Masquer l’indice') : t('needHint', 'Besoin d’un indice ?')}</span>
            </button>

            <button
              type="button"
              onClick={() => startPuzzle(activePuzzleIndex)}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-200 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('reset', 'Réinitialiser')}</span>
            </button>
          </div>
        )}

        {showHint && !isSuccess && (
          <div className="w-full bg-[#14142a] border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200/90 shadow-md animate-fade-in">
            <span className="font-black text-amber-400">{t('hintPrefix', '💡 Indice : ')}</span>
            {t(`puzzle_${activePuzzle.id}_hint`, activePuzzle.hint)}
          </div>
        )}
      </div>
    </div>
  );
};
