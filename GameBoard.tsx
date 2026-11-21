import React from 'react';
import { Board, Coord, ValidMove, PieceColor, LastMove } from '../types';
import { BOARD_SIZE } from '../utils/gameLogic';
import { useTranslation } from '../i18n/useTranslation';

interface GameBoardProps {
  board: Board;
  selectedCoord: Coord | null;
  validMoves: ValidMove[];
  onCellClick: (r: number, c: number) => void;
  flipped: boolean;
  showCoords: boolean;
  activeColor: PieceColor;
  disabled: boolean;
  lastMove?: LastMove | null;
  promotingCoord?: Coord | null;
  punishedCoords?: Coord[] | null;
  onReturnToMenu?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  selectedCoord,
  validMoves,
  onCellClick,
  flipped,
  showCoords,
  activeColor,
  disabled,
  lastMove,
  promotingCoord,
  punishedCoords,
  onReturnToMenu,
}) => {
  const { t } = useTranslation();

  // Guard: Si la variable board est null, indéfinie ou vide, affiche un écran d'attente sécurisé avec un bouton "Retour au Menu"
  if (!board || board.length === 0 || !Array.isArray(board[0])) {
    return (
      <div className="w-full h-80 sm:h-96 bg-[#042f2e] border-2 border-emerald-600/50 rounded-2xl flex flex-col items-center justify-center text-white p-6 shadow-2xl">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-base sm:text-lg font-bold mb-4 text-center text-emerald-200">
          {t('loadingBoard', 'Chargement du plateau en cours...')}
        </p>
        <button
          onClick={() => {
            if (onReturnToMenu) {
              onReturnToMenu();
            } else if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 transition-all rounded-xl text-white font-bold shadow-lg cursor-pointer"
        >
          {t('returnToMenu', 'Retour au Menu')}
        </button>
      </div>
    );
  }

  // Convert visual row & col (0..4) to logical row & col
  const toLogical = (vr: number, vc: number): { r: number; c: number } => {
    if (flipped) {
      return { r: BOARD_SIZE - 1 - vr, c: BOARD_SIZE - 1 - vc };
    }
    return { r: vr, c: vc };
  };

  const colLabels = flipped ? ['E', 'D', 'C', 'B', 'A'] : ['A', 'B', 'C', 'D', 'E'];
  const rowLabels = flipped ? ['1', '2', '3', '4', '5'] : ['5', '4', '3', '2', '1'];

  return (
    <div className="relative flex flex-col items-center select-none w-full">
      {/* Outer Golden Wrapper matching the reference model */}
      <div className="p-2 sm:p-2.5 rounded-[16px] sm:rounded-[18px] bg-gradient-to-b from-[#dfa818] via-[#c8960a] to-[#ab7a02] shadow-[0_10px_35px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.4)] border border-[#e5b323]/60 w-full max-w-[370px] sm:max-w-[420px]">
        {/* Inner Golden Rim */}
        <div className="p-1 sm:p-1.5 rounded-[12px] bg-gradient-to-b from-[#fcd338] via-[#F5C518] to-[#dda609] shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)]">
          {/* Coordinates Header if enabled */}
          {showCoords && (
            <div className="grid grid-cols-5 text-center text-[10px] font-extrabold text-[#7a5500] pb-1">
              {colLabels.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
          )}

          {/* 5x5 Grid Container with opacity & backdrop blur to show background filigree */}
          <div className="grid grid-cols-5 gap-[3px] sm:gap-[4px] p-[2px] bg-[#C9A800]/80 backdrop-blur-[2px] rounded-[7px] shadow-inner">
              {Array.from({ length: BOARD_SIZE }).map((_, vr) =>
                Array.from({ length: BOARD_SIZE }).map((__, vc) => {
                  const { r, c } = toLogical(vr, vc);
                  const piece = board[r][c];
                  const isSelected = selectedCoord?.r === r && selectedCoord?.c === c;
                  const validMove = validMoves.find(vm => vm.r === r && vm.c === c);
                  const isInitialCenter = r === 2 && c === 2;
                  const isPromoting = promotingCoord?.r === r && promotingCoord?.c === c;
                  const isPunished = Boolean(punishedCoords && punishedCoords.some(pc => pc.r === r && pc.c === c));

                  const isLastMoveSource = Boolean(lastMove && lastMove.fr === r && lastMove.fc === c);
                  const isLastMoveDest = Boolean(lastMove && lastMove.tr === r && lastMove.tc === c);

                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => onCellClick(r, c)}
                      className={`relative aspect-square rounded-[4px] sm:rounded-[6px] flex items-center justify-center transition-colors duration-150 outline-none select-none touch-manipulation active:scale-[0.97] ${
                        isPunished
                          ? 'bg-rose-950/80 ring-2 sm:ring-4 ring-rose-500 shadow-[inset_0_0_15px_rgba(244,63,94,0.7)] z-30'
                          : isSelected
                          ? 'bg-[#FFF176]/95 ring-2 sm:ring-3 ring-[#F57F17] shadow-[inset_0_0_10px_rgba(245,127,23,0.4)] z-10'
                          : validMove
                          ? 'bg-[#ecfdf5]/90 hover:bg-[#d1fae5] ring-1 ring-[#10b981]/60 cursor-pointer'
                          : isLastMoveDest
                          ? 'bg-[#FEF08A]/95 ring-2 sm:ring-[2.5px] ring-amber-500 shadow-[inset_0_0_8px_rgba(245,158,11,0.45)] z-10'
                          : isLastMoveSource
                          ? 'bg-[#FFFBEB]/90 ring-2 ring-dashed ring-amber-400/80 shadow-[inset_0_0_6px_rgba(245,158,11,0.25)] z-10'
                          : 'bg-[#FFFDE7]/85 backdrop-blur-[1px] hover:bg-[#fffae0]/90'
                      } border border-[#C9A800]/70`}
                    >
                      {/* Center square black star, always present on the central empty square at game start */}
                      {isInitialCenter && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-5 h-5 sm:w-6 sm:h-6 fill-black text-black drop-shadow-sm opacity-95"
                          >
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                          </svg>
                        </div>
                      )}

                      {/* Indicateur visuel subtil de la case de départ du dernier déplacement */}
                      {isLastMoveSource && !piece && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-amber-500/80 bg-amber-200/40 shadow-sm" />
                        </div>
                      )}

                      {/* Halo lumineux sur la case d'arrivée du dernier déplacement */}
                      {isLastMoveDest && (
                        <div className="absolute inset-0 rounded-[4px] sm:rounded-[6px] pointer-events-none ring-2 ring-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] z-10" />
                      )}

                      {/* Valid Move Indicator on empty cells (uniform subtle dot without giving away traps or warnings) */}
                      {validMove && !piece && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#16a34a]/70 border border-white/60 shadow-sm"></div>
                        </div>
                      )}

                      {/* Circular Pieces matching the reference screenshot */}
                      {piece && (
                        <div
                          className={`relative z-20 w-[84%] h-[84%] rounded-full flex items-center justify-center cursor-pointer transition-transform duration-200 ease-out will-change-transform select-none ${
                            isPunished
                              ? 'scale-110 animate-bounce ring-4 ring-rose-400 shadow-[0_0_22px_rgba(239,68,68,0.95)] z-40'
                              : isSelected
                              ? 'scale-110 -translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.6)] ring-2 sm:ring-[3px] ring-amber-400'
                              : 'hover:scale-[1.04] active:scale-[0.96]'
                          } ${
                            piece.c === 'green'
                              ? 'bg-gradient-to-b from-[#2E8B46] to-[#1E6B33] border-[1.5px] sm:border-2 border-[#134923] shadow-[0_4px_6px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.35)]'
                              : 'bg-gradient-to-b from-[#CF2F35] to-[#B31D22] border-[1.5px] sm:border-2 border-[#781216] shadow-[0_4px_6px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.35)]'
                          }`}
                        >
                          {/* Queen / Dame Star and Crown indicator */}
                          {piece.d && (
                            <div className="flex items-center justify-center pointer-events-none animate-pulse">
                              <span className="text-xs sm:text-sm font-black text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                                👑
                              </span>
                            </div>
                          )}

                          {/* Promotion Aura Animation */}
                          {isPromoting && (
                            <div className="absolute -inset-1.5 rounded-full bg-amber-400/50 animate-ping pointer-events-none" />
                          )}

                          {/* Punishment Visual Badge and Aura */}
                          {isPunished && (
                            <>
                              <div className="absolute -inset-2 rounded-full bg-rose-500/50 animate-ping pointer-events-none z-10" />
                              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-rose-600 to-red-700 text-white text-[9.5px] font-black px-2 py-0.5 rounded-full border border-white shadow-lg animate-bounce whitespace-nowrap pointer-events-none uppercase tracking-wider">
                                {t('punishedBadge', 'Puni')}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
          </div>

          {/* Optional Coordinate Labels (Bottom) */}
          {showCoords && (
            <div className="flex justify-between px-1.5 pt-1 text-[9px] font-bold text-[#7a5500]">
              <span>12 PIONS</span>
              <span>{activeColor === 'green' ? `🟢 ${t('green').toUpperCase()}` : `🔴 ${t('red').toUpperCase()}`}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
