import { Difficulty, PieceColor, UserStats } from '../types';

const STATS_KEY = '12pions_user_stats_v1';

export const defaultStats: UserStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestCombo: 0,
  totalCaptures: 0,
  totalQueens: 0,
  vsAiEasy: { wins: 0, losses: 0 },
  vsAiMedium: { wins: 0, losses: 0 },
  vsAiHard: { wins: 0, losses: 0 },
  vsLocal: { wins: 0, losses: 0 },
  vsOnline: { wins: 0, losses: 0 },
};

export function loadUserStats(): UserStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...defaultStats };
    const parsed = JSON.parse(raw);
    return { ...defaultStats, ...parsed };
  } catch {
    return { ...defaultStats };
  }
}

export function saveUserStats(stats: UserStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save stats', err);
  }
}

export function recordGameResult(
  winner: PieceColor | 'draw',
  playerColor: PieceColor,
  mode: 'ai' | 'local' | 'online',
  aiDiff: Difficulty = 'medium',
  maxCombo: number = 0,
  captures: number = 0,
  queens: number = 0
): UserStats {
  const current = loadUserStats();

  current.gamesPlayed += 1;
  current.totalCaptures += captures;
  current.totalQueens += queens;
  if (maxCombo > current.bestCombo) {
    current.bestCombo = maxCombo;
  }

  if (winner === 'draw') {
    current.draws += 1;
    current.currentStreak = 0;
  } else if (mode === 'ai') {
    const won = winner === playerColor;
    if (won) {
      current.gamesWon += 1;
      current.currentStreak += 1;
      if (current.currentStreak > current.bestStreak) {
        current.bestStreak = current.currentStreak;
      }
      if (aiDiff === 'easy') current.vsAiEasy.wins += 1;
      else if (aiDiff === 'medium') current.vsAiMedium.wins += 1;
      else current.vsAiHard.wins += 1;
    } else {
      current.gamesLost += 1;
      current.currentStreak = 0;
      if (aiDiff === 'easy') current.vsAiEasy.losses += 1;
      else if (aiDiff === 'medium') current.vsAiMedium.losses += 1;
      else current.vsAiHard.losses += 1;
    }
  } else if (mode === 'online') {
    const won = winner === playerColor;
    if (won) {
      current.gamesWon += 1;
      current.currentStreak += 1;
      if (current.currentStreak > current.bestStreak) {
        current.bestStreak = current.currentStreak;
      }
      current.vsOnline.wins += 1;
    } else {
      current.gamesLost += 1;
      current.currentStreak = 0;
      current.vsOnline.losses += 1;
    }
  } else {
    // Local 2-player match
    if (winner === 'green') {
      current.vsLocal.wins += 1;
    } else {
      current.vsLocal.losses += 1;
    }
  }

  saveUserStats(current);
  return current;
}
