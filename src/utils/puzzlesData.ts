import { Board, Puzzle } from '../types';
import { BOARD_SIZE } from './gameLogic';

function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

// Puzzle 1: Simple Capture (Facile)
const b1 = emptyBoard();
b1[2][1] = { c: 'green', d: false };
b1[1][3] = { c: 'green', d: false };
b1[2][2] = { c: 'red', d: false };
b1[0][2] = { c: 'red', d: false };

// Puzzle 2: Double Jump Combo (Facile)
const b2 = emptyBoard();
b2[1][1] = { c: 'green', d: false };
b2[2][1] = { c: 'red', d: false };
b2[3][2] = { c: 'red', d: false };
b2[4][4] = { c: 'red', d: false };

// Puzzle 3: Promotion Express (Moyen)
const b3 = emptyBoard();
b3[2][2] = { c: 'green', d: false };
b3[3][2] = { c: 'red', d: false };
b3[1][0] = { c: 'red', d: false };
b3[0][4] = { c: 'red', d: false };

// Puzzle 4: Queen Flying Strike (Moyen)
const b4 = emptyBoard();
b4[0][0] = { c: 'green', d: true };
b4[3][0] = { c: 'red', d: false };
b4[4][3] = { c: 'red', d: false };
b4[2][4] = { c: 'green', d: false };

// Puzzle 5: The Triple Chain Combo (Difficile)
const b5 = emptyBoard();
b5[0][2] = { c: 'green', d: false };
b5[1][2] = { c: 'red', d: false };
b5[2][3] = { c: 'red', d: false };
b5[3][4] = { c: 'red', d: false };
b5[4][0] = { c: 'red', d: false };

// Puzzle 6: Endgame Clear (Difficile)
const b6 = emptyBoard();
b6[0][1] = { c: 'green', d: true };
b6[1][1] = { c: 'red', d: false };
b6[3][1] = { c: 'red', d: false };
b6[0][4] = { c: 'red', d: false };

// Puzzle 7: L'Attaque Latérale (Facile)
const b7 = emptyBoard();
b7[2][4] = { c: 'green', d: false };
b7[0][0] = { c: 'green', d: false };
b7[2][3] = { c: 'red', d: false };
b7[4][4] = { c: 'red', d: false };

// Puzzle 8: Le Piège en L (Moyen)
const b8 = emptyBoard();
b8[1][2] = { c: 'green', d: false };
b8[0][0] = { c: 'green', d: false };
b8[2][2] = { c: 'red', d: false };
b8[3][3] = { c: 'red', d: false };
b8[4][0] = { c: 'red', d: false };

// Puzzle 9: La Dame en Recul (Moyen)
const b9 = emptyBoard();
b9[3][2] = { c: 'green', d: true };
b9[2][2] = { c: 'red', d: false };
b9[0][4] = { c: 'red', d: false };
b9[4][4] = { c: 'green', d: false };

// Puzzle 10: Le Coup du Chameau (Moyen)
const b10 = emptyBoard();
b10[0][1] = { c: 'green', d: false };
b10[4][0] = { c: 'green', d: false };
b10[1][1] = { c: 'red', d: false };
b10[2][2] = { c: 'red', d: false };
b10[4][4] = { c: 'red', d: false };

// Puzzle 11: L'Ascension Triomphale (Difficile)
const b11 = emptyBoard();
b11[0][3] = { c: 'green', d: false };
b11[0][0] = { c: 'green', d: false };
b11[1][3] = { c: 'red', d: false };
b11[3][3] = { c: 'red', d: false };
b11[2][0] = { c: 'red', d: false };

// Puzzle 12: L'Attaque en Spirale (Difficile)
const b12 = emptyBoard();
b12[1][1] = { c: 'green', d: true }; // Dame Royale verte pour permettre la triple prise orthogonale en spirale
b12[2][1] = { c: 'red', d: false };  // 1re prise vers le bas
b12[4][1] = { c: 'red', d: false };  // Bloqueur bord bas pour atterrissage précis en (3,1)
b12[3][2] = { c: 'red', d: false };  // 2e prise vers la droite
b12[3][4] = { c: 'red', d: false };  // Bloqueur bord droit pour atterrissage précis en (3,3)
b12[2][3] = { c: 'red', d: false };  // 3e prise vers le haut
b12[0][3] = { c: 'red', d: false };  // Bloqueur bord haut pour atterrissage précis en (1,3)

// Puzzle 13: Le Balayage de la Dame (Difficile)
const b13 = emptyBoard();
b13[4][0] = { c: 'green', d: true };
b13[4][2] = { c: 'red', d: false };
b13[2][3] = { c: 'red', d: false };
b13[0][0] = { c: 'red', d: false };

// Puzzle 14: Le Piège du Tiéké (Expert)
const b14 = emptyBoard();
b14[0][0] = { c: 'green', d: false };
b14[0][4] = { c: 'green', d: false };
b14[1][0] = { c: 'red', d: false };
b14[2][1] = { c: 'red', d: false };
b14[3][2] = { c: 'red', d: false };
b14[4][3] = { c: 'red', d: false };
b14[1][4] = { c: 'red', d: false };

// Puzzle 15: Le Piège du Carrefour Central (Expert)
const b15 = emptyBoard();
b15[2][0] = { c: 'green', d: false };
b15[0][3] = { c: 'green', d: false };
b15[2][1] = { c: 'red', d: false };
b15[3][2] = { c: 'red', d: false };
b15[4][1] = { c: 'red', d: false };
b15[0][0] = { c: 'red', d: false };

// Puzzle 16: La Ronde Finale des Champions (Grand Maître)
const b16 = emptyBoard();
b16[1][1] = { c: 'green', d: true };
b16[1][3] = { c: 'red', d: false };
b16[3][4] = { c: 'red', d: false };
b16[4][2] = { c: 'red', d: false };
b16[2][1] = { c: 'red', d: false };
b16[3][0] = { c: 'red', d: false };

export const PUZZLES: Puzzle[] = [
  {
    id: 1,
    title: 'La Prise Obligatoire',
    difficulty: 'Facile',
    objective: 'Trouvez et réalisez la prise directe avec le pion Vert.',
    hint: 'Regardez le pion vert en (C2) : il peut sauter par-dessus le pion rouge.',
    playerColor: 'green',
    initialBoard: b1,
    solutionSteps: [{ fr: 2, fc: 1, tr: 2, tc: 3 }],
  },
  {
    id: 2,
    title: 'Le Double Saut',
    difficulty: 'Facile',
    objective: 'Réalisez un enchaînement de 2 prises consécutives avec le même pion.',
    hint: 'Avancez en sautant vers le bas, puis tournez à droite pour capturer le deuxième pion !',
    playerColor: 'green',
    initialBoard: b2,
    solutionSteps: [
      { fr: 1, fc: 1, tr: 3, tc: 1 },
      { fr: 3, fc: 1, tr: 3, tc: 3 },
    ],
  },
  {
    id: 3,
    title: 'Promotion Express',
    difficulty: 'Moyen',
    objective: 'Capturez le pion rouge pour atteindre la 5e ligne et sacrer votre Dame !',
    hint: 'Sauter par-dessus la pièce rouge vous propulse directement sur la dernière rangée.',
    playerColor: 'green',
    initialBoard: b3,
    solutionSteps: [{ fr: 2, fc: 2, tr: 4, tc: 2 }],
  },
  {
    id: 4,
    title: 'Le Vol de la Dame',
    difficulty: 'Moyen',
    objective: 'Utilisez la portée illimitée de votre Dame pour sauter et capturer à distance.',
    hint: 'La Dame peut franchir plusieurs cases vides avant d’effectuer son saut.',
    playerColor: 'green',
    initialBoard: b4,
    solutionSteps: [{ fr: 0, fc: 0, tr: 4, tc: 0 }],
  },
  {
    id: 5,
    title: 'Le Triple Combo',
    difficulty: 'Difficile',
    objective: 'Exécutez une spectaculaire triple capture en un seul tour.',
    hint: 'Trois pions rouges sont alignés en zigzag : sautez verticalement puis horizontalement puis verticalement !',
    playerColor: 'green',
    initialBoard: b5,
    solutionSteps: [
      { fr: 0, fc: 2, tr: 2, tc: 2 },
      { fr: 2, fc: 2, tr: 2, tc: 4 },
      { fr: 2, fc: 4, tr: 4, tc: 4 },
    ],
  },
  {
    id: 6,
    title: 'Nettoyage Final',
    difficulty: 'Difficile',
    objective: 'Utilisez la Dame pour éliminer successivement deux pièces adverses sur la colonne.',
    hint: 'La Dame peut sauter le premier pion, s’arrêter, puis sauter immédiatement le second.',
    playerColor: 'green',
    initialBoard: b6,
    solutionSteps: [
      { fr: 0, fc: 1, tr: 2, tc: 1 },
      { fr: 2, fc: 1, tr: 4, tc: 1 },
    ],
  },
  {
    id: 7,
    title: 'L’Attaque Latérale',
    difficulty: 'Facile',
    objective: 'Surprenez l’adversaire avec une capture orthogonale horizontale.',
    hint: 'Le pion vert en (C5) peut sauter vers la gauche par-dessus le pion rouge.',
    playerColor: 'green',
    initialBoard: b7,
    solutionSteps: [{ fr: 2, fc: 4, tr: 2, tc: 2 }],
  },
  {
    id: 8,
    title: 'Le Piège en L',
    difficulty: 'Moyen',
    objective: 'Pivotez à 90 degrés pour réaliser un double saut dévastateur.',
    hint: 'Avancez tout droit vers le bas puis tournez immédiatement à droite pour rafler la seconde pièce.',
    playerColor: 'green',
    initialBoard: b8,
    solutionSteps: [
      { fr: 1, fc: 2, tr: 3, tc: 2 },
      { fr: 3, fc: 2, tr: 3, tc: 4 },
    ],
  },
  {
    id: 9,
    title: 'La Dame en Recul',
    difficulty: 'Moyen',
    objective: 'Exploitez la liberté arrière de la Dame pour capturer un pion qui pensait être à l’abri.',
    hint: 'Seule la Dame a le privilège de sauter vers l’arrière pour éliminer les pièces ennemies.',
    playerColor: 'green',
    initialBoard: b9,
    solutionSteps: [{ fr: 3, fc: 2, tr: 1, tc: 2 }],
  },
  {
    id: 10,
    title: 'Le Coup du Chameau',
    difficulty: 'Moyen',
    objective: 'Traversez les lignes adverses avec un saut avant suivi d’un saut latéral.',
    hint: 'Descendez d’un saut vertical puis bifurquez horizontalement pour nettoyer la ligne.',
    playerColor: 'green',
    initialBoard: b10,
    solutionSteps: [
      { fr: 0, fc: 1, tr: 2, tc: 1 },
      { fr: 2, fc: 1, tr: 2, tc: 3 },
    ],
  },
  {
    id: 11,
    title: 'L’Ascension Triomphale',
    difficulty: 'Difficile',
    objective: 'Réalisez deux sauts consécutifs sur la même colonne jusqu’au sacre en Dame !',
    hint: 'Votre pion traverse tout l’échiquier en deux bonds verticaux pour atteindre la ligne de couronnement.',
    playerColor: 'green',
    initialBoard: b11,
    solutionSteps: [
      { fr: 0, fc: 3, tr: 2, tc: 3 },
      { fr: 2, fc: 3, tr: 4, tc: 3 },
    ],
  },
  {
    id: 12,
    title: 'La Spirale de la Dame',
    difficulty: 'Difficile',
    objective: 'Enchaînez 3 captures successives avec la Dame en contournant la défense en spirale.',
    hint: 'Trois pivots perpendiculaires avec la Dame : vers le bas, vers la droite, puis vers le haut !',
    playerColor: 'green',
    initialBoard: b12,
    solutionSteps: [
      { fr: 1, fc: 1, tr: 3, tc: 1 },
      { fr: 3, fc: 1, tr: 3, tc: 3 },
      { fr: 3, fc: 3, tr: 1, tc: 3 },
    ],
  },
  {
    id: 13,
    title: 'Le Balayage de la Dame',
    difficulty: 'Difficile',
    objective: 'Faites planer votre Dame sur deux bords du plateau pour deux prises longue portée.',
    hint: 'Envolez-vous le long de la ligne du bas avant de remonter toute la colonne de droite.',
    playerColor: 'green',
    initialBoard: b13,
    solutionSteps: [
      { fr: 4, fc: 0, tr: 4, tc: 3 },
      { fr: 4, fc: 3, tr: 0, tc: 3 },
    ],
  },
  {
    id: 14,
    title: 'Le Piège du Tiéké',
    difficulty: 'Difficile',
    objective: 'Exécutez la mythique quadruple capture du jeu traditionnel en 4 étapes parfaites.',
    hint: 'Tracez une trajectoire en escalier en alternant sauts verticaux et sauts horizontaux !',
    playerColor: 'green',
    initialBoard: b14,
    solutionSteps: [
      { fr: 0, fc: 0, tr: 2, tc: 0 },
      { fr: 2, fc: 0, tr: 2, tc: 2 },
      { fr: 2, fc: 2, tr: 4, tc: 2 },
      { fr: 4, fc: 2, tr: 4, tc: 4 },
    ],
  },
  {
    id: 15,
    title: 'Le Carrefour Central',
    difficulty: 'Difficile',
    objective: 'Pénétrez au cœur du camp rouge et déclenchez une triple onde de choc.',
    hint: 'Occupez d’abord le centre avant d’enfoncer la défense vers la ligne opposée.',
    playerColor: 'green',
    initialBoard: b15,
    solutionSteps: [
      { fr: 2, fc: 0, tr: 2, tc: 2 },
      { fr: 2, fc: 2, tr: 4, tc: 2 },
      { fr: 4, fc: 2, tr: 4, tc: 0 },
    ],
  },
  {
    id: 16,
    title: 'La Ronde des Champions',
    difficulty: 'Difficile',
    objective: 'Faites le tour complet du damier avec votre Dame en éliminant 4 pions aux quatre coins.',
    hint: 'La Dame fait le tour de l’arène : droite, bas, gauche et haut en une seule chevauchée victorieuse !',
    playerColor: 'green',
    initialBoard: b16,
    solutionSteps: [
      { fr: 1, fc: 1, tr: 1, tc: 4 },
      { fr: 1, fc: 4, tr: 4, tc: 4 },
      { fr: 4, fc: 4, tr: 4, tc: 1 },
      { fr: 4, fc: 1, tr: 0, tc: 1 },
    ],
  },
];

const PUZZLE_STORAGE_KEY = '12pions_completed_puzzles';

export function getCompletedPuzzleIds(): number[] {
  try {
    const raw = localStorage.getItem(PUZZLE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCompletedPuzzleId(id: number): void {
  try {
    const current = getCompletedPuzzleIds();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(PUZZLE_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // Ignore storage errors
  }
}

export function markPuzzleCompleted(id: number): void {
  saveCompletedPuzzleId(id);
}
