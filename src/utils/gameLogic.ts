import { Board, Piece, PieceColor, ValidMove, MoveStep, Difficulty } from '../types';

export const BOARD_SIZE = 5;
export const D4: [number, number][] = [
  [-1, 0], // up
  [1, 0],  // down
  [0, -1], // left
  [0, 1],  // right
];

export function createInitialBoard(): Board {
  const b: Board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    b[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      b[r][c] = null;
    }
  }

  // Row 0 & 1: all Green
  for (let c = 0; c < BOARD_SIZE; c++) {
    b[0][c] = { c: 'green', d: false };
    b[1][c] = { c: 'green', d: false };
  }
  // Row 2: Green on left 2, Red on right 2, Center is empty (star)
  b[2][0] = { c: 'green', d: false };
  b[2][1] = { c: 'green', d: false };
  b[2][2] = null; // center star
  b[2][3] = { c: 'red', d: false };
  b[2][4] = { c: 'red', d: false };

  // Row 3 & 4: all Red
  for (let c = 0; c < BOARD_SIZE; c++) {
    b[3][c] = { c: 'red', d: false };
    b[4][c] = { c: 'red', d: false };
  }

  return b;
}

export function cloneBoard(b: Board): Board {
  const nb: Board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    nb[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = b[r][c];
      nb[r][c] = p ? { c: p.c, d: p.d } : null;
    }
  }
  return nb;
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function countPieces(b: Board) {
  let green = 0;
  let red = 0;
  let greenQueens = 0;
  let redQueens = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = b[r][c];
      if (!p) continue;
      if (p.c === 'green') {
        green++;
        if (p.d) greenQueens++;
      } else {
        red++;
        if (p.d) redQueens++;
      }
    }
  }
  return { green, red, greenQueens, redQueens };
}

/**
 * Checks for baseline promotion and auto-queen promotion for lone piece.
 */
export function applyPromotions(b: Board, lastMovedPos?: { r: number; c: number }): boolean {
  let changed = false;

  if (lastMovedPos) {
    const p = b[lastMovedPos.r][lastMovedPos.c];
    if (p && !p.d) {
      if (p.c === 'green' && lastMovedPos.r === BOARD_SIZE - 1) {
        p.d = true;
        changed = true;
      } else if (p.c === 'red' && lastMovedPos.r === 0) {
        p.d = true;
        changed = true;
      }
    }
  }

  // Auto-queen rule: when a side has only 1 piece left, it promotes to Queen
  const counts = countPieces(b);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = b[r][c];
      if (!p || p.d) continue;
      if (p.c === 'green' && counts.green === 1) {
        p.d = true;
        changed = true;
      } else if (p.c === 'red' && counts.red === 1) {
        p.d = true;
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * Returns available captures from (r, c) on board b.
 * capPending represents pieces jumped during an ongoing multi-capture chain (transparent to queen slide).
 */
export function getCapturesOnBoard(
  b: Board,
  r: number,
  c: number,
  p: Piece,
  capPending: Record<string, boolean> = {},
  lastCaptureDir?: [number, number] | null
): { r: number; c: number; cr: number; cc: number }[] {
  const caps: { r: number; c: number; cr: number; cc: number }[] = [];
  if (!p) return caps;

  if (p.d) {
    // QUEEN CAPTURE (STRICTLY ORTHOGONAL - ZERO DIAGONALS):
    // Can fly in all 4 orthogonal directions (up, down, left, right), over empty or transparent jumped cells,
    // jump 1 enemy piece not yet jumped in this chain, and land on any empty cell behind it.
    for (const [dr, dc] of D4) {
      // RULE: In a multi-capture sequence, 180° reversal on the same line/axis is strictly forbidden!
      // Once captured in direction [lastDr, lastDc], the queen CANNOT immediately capture in opposite direction [-lastDr, -lastDc].
      // E.g.: after capturing to the right [0, 1], cannot on the same turn capture to the left [0, -1] on the same line.
      if (
        lastCaptureDir &&
        (lastCaptureDir[0] !== 0 || lastCaptureDir[1] !== 0) &&
        dr === -(lastCaptureDir[0] || 0) &&
        dc === -(lastCaptureDir[1] || 0)
      ) {
        continue;
      }

      let nr = r + dr;
      let nc = c + dc;

      // Phase 1: Slide through empty or already jumped cells
      while (inBounds(nr, nc) && (!b[nr][nc] || capPending[`${nr},${nc}`])) {
        nr += dr;
        nc += dc;
      }

      // Phase 2: Found an opponent piece not yet jumped in this chain
      if (inBounds(nr, nc) && b[nr][nc] && b[nr][nc]!.c !== p.c && !capPending[`${nr},${nc}`]) {
        const capR = nr;
        const capC = nc;
        let lr = nr + dr;
        let lc = nc + dc;

        // Phase 3: Land on any subsequent empty square along the orthogonal line
        while (inBounds(lr, lc)) {
          if (!b[lr][lc] || capPending[`${lr},${lc}`]) {
            caps.push({ r: lr, c: lc, cr: capR, cc: capC });
          } else {
            // Blocked by an un-captured piece
            break;
          }
          lr += dr;
          lc += dc;
        }
      }
    }
  } else {
    // REGULAR PIECE (STRICTLY ORTHOGONAL - ZERO DIAGONALS):
    // ABSOLUTE RULE: A regular piece NEVER captures backwards, even in multi-captures!
    // Green moves down/forward (+1), Red moves up/forward (-1).
    // Allowed capture directions: Forward, Left, Right ONLY (NO Backward).
    const fw = p.c === 'green' ? 1 : -1;
    const allowedDirs: [number, number][] = [
      [fw, 0], // Forward only
      [0, -1], // Left
      [0, 1],  // Right
    ];

    for (const [dr, dc] of allowedDirs) {
      // RULE: In a multi-capture sequence, 180° reversal is strictly forbidden.
      if (
        lastCaptureDir &&
        (lastCaptureDir[0] !== 0 || lastCaptureDir[1] !== 0) &&
        dr === -(lastCaptureDir[0] || 0) &&
        dc === -(lastCaptureDir[1] || 0)
      ) {
        continue;
      }

      const mr = r + dr;
      const mc = c + dc;
      const lr = r + 2 * dr;
      const lc = c + 2 * dc;

      if (
        inBounds(mr, mc) &&
        inBounds(lr, lc) &&
        b[mr][mc] &&
        b[mr][mc]!.c !== p.c &&
        !capPending[`${mr},${mc}`] &&
        (!b[lr][lc] || capPending[`${lr},${lc}`])
      ) {
        caps.push({ r: lr, c: lc, cr: mr, cc: mc });
      }
    }
  }

  return caps;
}

/**
 * Returns regular non-capturing moves from (r, c).
 */
export function getMovesOnBoard(b: Board, r: number, c: number, p: Piece): { r: number; c: number }[] {
  const moves: { r: number; c: number }[] = [];
  if (!p) return moves;

  if (p.d) {
    // Queen can move any number of empty squares in 4 directions
    for (const [dr, dc] of D4) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc) && !b[nr][nc]) {
        moves.push({ r: nr, c: nc });
        nr += dr;
        nc += dc;
      }
    }
  } else {
    // Regular piece: forward or slide sideways
    const fw = p.c === 'green' ? 1 : -1;
    const fr = r + fw;
    if (inBounds(fr, c) && !b[fr][c]) {
      moves.push({ r: fr, c });
    }
    if (inBounds(r, c - 1) && !b[r][c - 1]) {
      moves.push({ r, c: c - 1 });
    }
    if (inBounds(r, c + 1) && !b[r][c + 1]) {
      moves.push({ r, c: c + 1 });
    }
  }

  return moves;
}

/**
 * Returns all pieces for a color that currently have at least one capture available.
 */
export function getAllCapturingPieces(b: Board, color: PieceColor): { r: number; c: number }[] {
  const list: { r: number; c: number }[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = b[r][c];
      if (p && p.c === color) {
        const caps = getCapturesOnBoard(b, r, c, p);
        if (caps.length > 0) {
          list.push({ r, c });
        }
      }
    }
  }
  return list;
}

/**
 * Règle de punition : Lorsqu'un joueur a des captures disponibles et joue un autre coup,
 * un seul pion est puni : le pion ayant la possibilité de capturer qui est LE PLUS PROCHE du camp adverse.
 * - Pour les Verts (camp adverse = rangée 4) : distance = (BOARD_SIZE - 1 - r).
 * - Pour les Rouges (camp adverse = rangée 0) : distance = r.
 * Si égalité de distance, départage par la colonne la plus centrale (c = 2).
 * Si le joueur a déplacé le pion qui avait la capture (sans capturer), ce pion est puni à sa destination.
 */
export function selectPunishedPiece(
  capturingPieces: { r: number; c: number }[],
  color: PieceColor,
  movedFrom: { r: number; c: number },
  movedTo: { r: number; c: number }
): { r: number; c: number } {
  if (!capturingPieces || capturingPieces.length === 0) return movedTo;

  // Calcul exact de la distance au camp adverse :
  // Les Verts partent de r=0..1 et avancent vers le camp adverse r=4 (distance = 4 - r).
  // Les Rouges partent de r=3..4 et avancent vers le camp adverse r=0 (distance = r).
  const getDist = (pRow: number) => (color === 'green' ? BOARD_SIZE - 1 - pRow : pRow);

  let bestPiece = capturingPieces[0];
  let bestDist = getDist(bestPiece.r);

  for (let i = 1; i < capturingPieces.length; i++) {
    const p = capturingPieces[i];
    const dist = getDist(p.r);
    if (dist < bestDist) {
      bestDist = dist;
      bestPiece = p;
    } else if (dist === bestDist) {
      if (Math.abs(p.c - 2) < Math.abs(bestPiece.c - 2)) {
        bestPiece = p;
      }
    }
  }

  // Si le pion sélectionné pour la punition est celui qui a été déplacé
  if (bestPiece.r === movedFrom.r && bestPiece.c === movedFrom.c) {
    return { r: movedTo.r, c: movedTo.c };
  }

  return { r: bestPiece.r, c: bestPiece.c };
}

/**
 * Computes all selectable valid moves for a clicked piece at (r,c),
 * taking into account active chain multi-captures and the mandatory capture penalty rule.
 */
export function calculateValidMoves(
  b: Board,
  r: number,
  c: number,
  chainPiecePos: { r: number; c: number } | null,
  capturedInChain: Record<string, boolean> = {},
  lastCaptureDir?: [number, number] | null
): ValidMove[] {
  const p = b[r][c];
  if (!p) return [];

  // If in multi-capture chain, ONLY the piece currently chaining can move, and ONLY to capture!
  if (chainPiecePos) {
    if (chainPiecePos.r !== r || chainPiecePos.c !== c) return [];
    const caps = getCapturesOnBoard(b, r, c, p, capturedInChain, lastCaptureDir);
    return caps.map(k => ({ r: k.r, c: k.c, cr: k.cr, cc: k.cc, t: 'c' }));
  }

  const caps = getCapturesOnBoard(b, r, c, p, capturedInChain);
  const moves = getMovesOnBoard(b, r, c, p);

  const res: ValidMove[] = [];
  // Any capture available from this piece
  for (const cp of caps) {
    res.push({ r: cp.r, c: cp.c, cr: cp.cr, cc: cp.cc, t: 'c' });
  }
  // Any standard move available from this piece
  for (const mv of moves) {
    res.push({ r: mv.r, c: mv.c, t: 'm' });
  }
  return res;
}

/**
 * Returns all possible moves (captures prioritized) for AI or terminal checks.
 */
export function getAIMoves(b: Board, color: PieceColor): MoveStep[] {
  const caps: MoveStep[] = [];
  const movs: MoveStep[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = b[r][c];
      if (!p || p.c !== color) continue;

      const cs = getCapturesOnBoard(b, r, c, p);
      for (const item of cs) {
        caps.push({ fr: r, fc: c, tr: item.r, tc: item.c, cr: item.cr, cc: item.cc, isCap: true });
      }

      const ms = getMovesOnBoard(b, r, c, p);
      for (const item of ms) {
        movs.push({ fr: r, fc: c, tr: item.r, tc: item.c, isCap: false });
      }
    }
  }

  return caps.length > 0 ? caps : movs;
}

/**
 * Board key for anti-repetition detection.
 */
export function getBoardKey(b: Board): string {
  let str = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = b[r][c];
      str += p ? `${p.c[0]}${p.d ? 'Q' : 'P'}` : '..';
    }
  }
  return str;
}

/**
 * Evaluates board position for AI.
 */
export function evaluateBoard(b: Board, aiCol: PieceColor): number {
  const counts = countPieces(b);
  if (counts.green === 0) return aiCol === 'red' ? 100000 : -100000;
  if (counts.red === 0) return aiCol === 'green' ? 100000 : -100000;

  const aiCount = aiCol === 'red' ? counts.red : counts.green;
  const oppCount = aiCol === 'red' ? counts.green : counts.red;
  const aiQueens = aiCol === 'red' ? counts.redQueens : counts.greenQueens;
  const oppQueens = aiCol === 'red' ? counts.greenQueens : counts.redQueens;

  // Material: normal piece = 1200, Queen = 3600 (net +2400 over normal piece on 5x5 board)
  // Material supremacy is the decisive strategic advantage
  let score = (aiCount * 1200 + aiQueens * 2400) - (oppCount * 1200 + oppQueens * 2400);

  let positionalBonus = 0;
  const oppColor: PieceColor = aiCol === 'red' ? 'green' : 'red';

  // Threat detection: accurately index the piece AT RISK (item.cr, item.cc)
  const oppThreats: Record<string, boolean> = {};
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = b[r][c];
      if (!p || p.c !== oppColor) continue;
      const cs = getCapturesOnBoard(b, r, c, p);
      for (const item of cs) {
        oppThreats[`${item.cr},${item.cc}`] = true;
      }
    }
  }

  const aiThreats: Record<string, boolean> = {};
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = b[r][c];
      if (!p || p.c !== aiCol) continue;
      const cs = getCapturesOnBoard(b, r, c, p);
      for (const item of cs) {
        aiThreats[`${item.cr},${item.cc}`] = true;
      }
    }
  }

  const aiPositions: { r: number; c: number }[] = [];
  const oppPositions: { r: number; c: number }[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = b[r][c];
      if (!p) continue;
      const isAI = p.c === aiCol;
      const sign = isAI ? 1 : -1;

      if (isAI) {
        aiPositions.push({ r, c });
      } else {
        oppPositions.push({ r, c });
      }

      // Advancing towards opposite row (promotion rank)
      if (!p.d) {
        const adv = p.c === 'green' ? r : BOARD_SIZE - 1 - r;
        if (adv === 3) {
          // One step away from promotion to Queen: massive promotion pressure
          positionalBonus += sign * 180;
        } else {
          positionalBonus += sign * (adv * 25);
        }
      }

      // Center control (3x3) and center star (2,2)
      if (r >= 1 && r <= 3 && c >= 1 && c <= 3) {
        positionalBonus += sign * 30;
      }
      if (r === 2 && c === 2) {
        positionalBonus += sign * 75;
      }

      // Edge penalty for normal pieces (corners and borders restrict mobility)
      if (!p.d) {
        if ((r === 0 || r === BOARD_SIZE - 1) && (c === 0 || c === BOARD_SIZE - 1)) {
          positionalBonus += sign * -45; // Coin bloquant
        } else if (c === 0 || c === BOARD_SIZE - 1) {
          positionalBonus += sign * -15;
        }
      }

      // Formation support & mutual coverage ("se couvrir et se protéger"):
      // Check all 4 orthogonal landing squares.
      // An enemy piece at (r - dr, c - dc) can only jump over (r, c) if landing square (r + dr, c + dc) is empty!
      // If the landing square is blocked by another piece (especially a friendly piece) or is off-board,
      // that axis is completely immune from being jumped!
      let blockedLandingAxes = 0;
      let friendlyShields = 0;
      let friendlyNeighbors = 0;

      for (const [dr, dc] of D4) {
        const landR = r + dr;
        const landC = c + dc;
        if (!inBounds(landR, landC)) {
          // Off-board boundary: immune to jump from opposite direction
          blockedLandingAxes++;
        } else {
          const landPiece = b[landR][landC];
          if (landPiece !== null) {
            blockedLandingAxes++;
            if (landPiece.c === p.c) {
              friendlyShields++;
            }
          }
        }

        // Direct adjacent friendly piece (axis covered)
        const adjR = r + dr;
        const adjC = c + dc;
        if (inBounds(adjR, adjC) && b[adjR][adjC]?.c === p.c) {
          friendlyNeighbors++;
        }
      }

      // Reward solid phalanxes and mutual coverage
      positionalBonus += sign * (blockedLandingAxes * 15 + friendlyShields * 30 + friendlyNeighbors * 25);

      // Severe penalty for isolated pieces with zero friendly neighbors
      if (friendlyNeighbors === 0 && !p.d) {
        positionalBonus += sign * -60;
      }

      // Severe penalty for hanging pieces that are directly exposed to opponent captures
      if (isAI && oppThreats[`${r},${c}`]) {
        // AI piece is directly exposed to capture
        const piecePenalty = p.d ? 6500 : 2600;
        positionalBonus -= piecePenalty;
      } else if (!isAI && aiThreats[`${r},${c}`]) {
        // Opponent piece is exposed to capture by AI
        const gainReward = p.d ? 5000 : 1900;
        positionalBonus += gainReward;
      }
    }
  }

  // Mobility bonus
  const aiMoves = getAIMoves(b, aiCol);
  const oppMoves = getAIMoves(b, oppColor);
  let aiCaps = 0;
  let oppCaps = 0;

  for (const m of aiMoves) if (m.isCap) aiCaps++;
  for (const m of oppMoves) if (m.isCap) oppCaps++;

  positionalBonus += aiCaps * 35;
  positionalBonus -= oppCaps * 40;
  positionalBonus += (aiMoves.length - oppMoves.length) * 3;

  // ─── ENDGAME AGGRESSIVE HUNTING & LIQUIDATION (IA EN SUPÉRIORITÉ NUMÉRIQUE) ───
  // Si l'IA a l'avantage numérique en fin de partie (ex: 4v1, 3v1, 2v1, 4v2, 3v2) :
  // Traquer agressivement, resserrer l'étau, couper les issues et capturer activement au lieu de temporiser
  if (aiPositions.length > oppPositions.length && oppPositions.length <= 3) {
    let sumDistToOpponents = 0;
    let minGlobalDist = Infinity;

    for (const opp of oppPositions) {
      let minDistToThisOpp = Infinity;
      for (const pos of aiPositions) {
        const dist = Math.abs(pos.r - opp.r) + Math.abs(pos.c - opp.c);
        sumDistToOpponents += dist;
        if (dist < minDistToThisOpp) minDistToThisOpp = dist;
        if (dist < minGlobalDist) minGlobalDist = dist;
      }
      // Rapprochement très fort de chaque pion IA vers le pion adverse
      positionalBonus += (10 - minDistToThisOpp) * 120;

      // Bonus si l'adversaire est poussé vers les bords ou coins (mobilité réduite)
      const oppDistFromCenter = Math.abs(opp.r - 2) + Math.abs(opp.c - 2);
      positionalBonus += oppDistFromCenter * 80;

      // Menace directe de capture sur ce pion adverse
      if (aiThreats[`${opp.r},${opp.c}`]) {
        positionalBonus += 3500;
      }
    }

    // Réduction de la distance totale de la meute de pions
    positionalBonus -= sumDistToOpponents * 40;
    positionalBonus += (8 - minGlobalDist) * 160;

    // Étau et encerclement strict si l'adversaire n'a qu'un seul pion
    if (oppPositions.length === 1) {
      const loneOpp = oppPositions[0];
      // Si l'adversaire a très peu de coups (acculé / quasi-pat)
      if (oppMoves.length <= 2) {
        positionalBonus += (4 - oppMoves.length) * 1800;
      }
      // Encadrement horizontal ou vertical
      const bracketingR = aiPositions.some(p => p.r < loneOpp.r) && aiPositions.some(p => p.r > loneOpp.r);
      const bracketingC = aiPositions.some(p => p.c < loneOpp.c) && aiPositions.some(p => p.c > loneOpp.c);
      if (bracketingR || bracketingC) {
        positionalBonus += 800;
      }
    }
  }
  // Scénario où l'IA est en infériorité numérique (ex: 1 vs >= 2) :
  // Le pion isolé doit fuir et survivre (bonus mesuré)
  else if (aiPositions.length === 1 && oppPositions.length >= 2) {
    const loneAI = aiPositions[0];
    let minDistanceToOpp = Infinity;
    let totalDistanceToOpps = 0;
    for (const opp of oppPositions) {
      const dist = Math.abs(loneAI.r - opp.r) + Math.abs(loneAI.c - opp.c);
      totalDistanceToOpps += dist;
      if (dist < minDistanceToOpp) minDistanceToOpp = dist;
    }
    positionalBonus += totalDistanceToOpps * 2 + minDistanceToOpp * 3;
    positionalBonus += aiMoves.length * 4;

    if (oppThreats[`${loneAI.r},${loneAI.c}`]) {
      positionalBonus -= 500;
    }
  }

  return score + positionalBonus;
}

export interface ChainTrajectoryResult {
  totalCaptures: number;
  finalBoard: Board;
  bestNextStep: { r: number; c: number; cr: number; cc: number } | null;
}

/**
 * Evaluates all candidate landing squares behind captured pieces and subsequent 90° pivots.
 * Selects the complete trajectory that MAXIMIZES the total number of opponent pieces captured.
 */
export function evaluateMaxChainTrajectory(
  nb: Board,
  r: number,
  c: number,
  piece: Piece,
  cap: Record<string, boolean>,
  aiCol: PieceColor,
  lastDir?: [number, number] | null,
  isMaximizing: boolean = true
): ChainTrajectoryResult {
  const further = getCapturesOnBoard(nb, r, c, piece, cap, lastDir);
  if (!further.length) {
    const finalBoard = cloneBoard(nb);
    for (const key of Object.keys(cap)) {
      const [kr, kc] = key.split(',').map(Number);
      finalBoard[kr][kc] = null;
    }
    applyPromotions(finalBoard, { r, c });
    return {
      totalCaptures: Object.keys(cap).length,
      finalBoard,
      bestNextStep: null,
    };
  }

  let maxCaptures = 0;
  let bestNextStep: { r: number; c: number; cr: number; cc: number } | null = null;
  let bestFinalBoard: Board = nb;
  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (const f of further) {
    const branch = cloneBoard(nb);
    branch[f.r][f.c] = piece;
    branch[r][c] = null;
    // Jumped piece is cleared on this branch so lines and 90° pivot cells are open
    branch[f.cr][f.cc] = null;

    const nextCap = { ...cap, [`${f.cr},${f.cc}`]: true };
    const nextDir: [number, number] = [Math.sign(f.cr - r) || 0, Math.sign(f.cc - c) || 0];

    const sub = evaluateMaxChainTrajectory(branch, f.r, f.c, piece, nextCap, aiCol, nextDir, isMaximizing);
    const score = evaluateBoard(sub.finalBoard, aiCol);

    const isScoreBetter = isMaximizing ? score > bestScore : score < bestScore;

    // Prioritize maximum pieces captured first, then positional board score
    if (
      sub.totalCaptures > maxCaptures ||
      (sub.totalCaptures === maxCaptures && isScoreBetter) ||
      bestNextStep === null
    ) {
      maxCaptures = sub.totalCaptures;
      bestNextStep = f;
      bestFinalBoard = sub.finalBoard;
      bestScore = score;
    }
  }

  return {
    totalCaptures: maxCaptures,
    finalBoard: bestFinalBoard,
    bestNextStep,
  };
}

/**
 * Simulates best chain capture on board copy for minimax lookahead.
 */
function simulateChain(
  nb: Board,
  r: number,
  c: number,
  piece: Piece,
  cap: Record<string, boolean>,
  maximizing: boolean,
  aiCol: PieceColor,
  lastDir?: [number, number] | null
): Board {
  const result = evaluateMaxChainTrajectory(nb, r, c, piece, cap, aiCol, lastDir, maximizing);
  return result.finalBoard;
}

export function applyMoveWithChain(b: Board, step: MoveStep, isMaximizing: boolean, aiCol: PieceColor): Board {
  const nb = cloneBoard(b);
  const piece = nb[step.fr]?.[step.fc];
  if (!piece) return nb;

  const copiedPiece: Piece = { c: piece.c, d: piece.d };
  nb[step.tr][step.tc] = copiedPiece;
  nb[step.fr][step.fc] = null;

  if (step.isCap && step.cr !== undefined && step.cc !== undefined) {
    // Supprime immédiatement le premier pion sauté pour ouvrir les lignes orthogonales
    nb[step.cr][step.cc] = null;
    const initialCap: Record<string, boolean> = { [`${step.cr},${step.cc}`]: true };
    const initialDir: [number, number] = [Math.sign(step.cr - step.fr), Math.sign(step.cc - step.fc)];
    return simulateChain(nb, step.tr, step.tc, copiedPiece, initialCap, isMaximizing, aiCol, initialDir);
  } else {
    applyPromotions(nb, { r: step.tr, c: step.tc });
    return nb;
  }
}

// ─── TRANSPOSITION TABLE & CONTRÔLE DU TEMPS DE RECHERCHE ───
interface TTEntry {
  depth: number;
  score: number;
  flag: number; // 0: EXACT, 1: LOWERBOUND, 2: UPPERBOUND
}
const transpositionTable = new Map<string, TTEntry>();

export function clearTranspositionTable() {
  transpositionTable.clear();
}

let searchDeadline = 0;
let searchAborted = false;

export function setSearchDeadline(deadlineMs: number) {
  searchDeadline = deadlineMs;
  searchAborted = false;
}

export function isSearchAborted(): boolean {
  return searchAborted;
}

/**
 * Quiescence search to eliminate the horizon effect and suicidal sacrifices.
 * Continues searching forced captures at leaf nodes.
 */
export function quiescence(
  b: Board,
  alpha: number,
  beta: number,
  isMax: boolean,
  aiCol: PieceColor,
  pCol: PieceColor,
  qDepth: number
): number {
  const standPat = evaluateBoard(b, aiCol);
  if (qDepth <= 0) return standPat;

  if (searchDeadline > 0 && Date.now() > searchDeadline) {
    searchAborted = true;
    return standPat;
  }

  const col = isMax ? aiCol : pCol;
  const moves = getAIMoves(b, col);
  const caps = moves.filter(m => m.isCap);

  // If no captures are available, position is quiet
  if (!caps.length) {
    return standPat;
  }

  // Tri des captures par valeur de la pièce capturée (MVV)
  caps.sort((a, bStep) => {
    if (a.cr !== undefined && a.cc !== undefined && bStep.cr !== undefined && bStep.cc !== undefined) {
      const aVictim = b[a.cr]?.[a.cc];
      const bVictim = b[bStep.cr]?.[bStep.cc];
      const aVal = aVictim?.d ? 3600 : 1200;
      const bVal = bVictim?.d ? 3600 : 1200;
      return bVal - aVal;
    }
    return 0;
  });

  if (isMax) {
    let best = standPat;
    if (best > alpha) alpha = best;
    if (beta <= alpha) return best;

    for (const mv of caps) {
      if (searchAborted) break;
      const nb = applyMoveWithChain(b, mv, true, aiCol);
      const sc = quiescence(nb, alpha, beta, false, aiCol, pCol, qDepth - 1);
      if (searchAborted) break;
      if (sc > best) best = sc;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = standPat;
    if (best < beta) beta = best;
    if (beta <= alpha) return best;

    for (const mv of caps) {
      if (searchAborted) break;
      const nb = applyMoveWithChain(b, mv, false, aiCol);
      const sc = quiescence(nb, alpha, beta, true, aiCol, pCol, qDepth - 1);
      if (searchAborted) break;
      if (sc < best) best = sc;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

/**
 * Minimax with Alpha-Beta Pruning, Transposition Table, Time Control, and Quiescence Search.
 */
export function minimax(
  b: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMax: boolean,
  aiCol: PieceColor,
  pCol: PieceColor,
  maxQDepth: number = 4
): number {
  const counts = countPieces(b);
  if (counts.green === 0 || counts.red === 0) {
    return evaluateBoard(b, aiCol);
  }

  if (searchDeadline > 0 && Date.now() > searchDeadline) {
    searchAborted = true;
    return evaluateBoard(b, aiCol);
  }

  if (depth <= 0) {
    // Recherche de quiescence approfondie sur les captures
    return quiescence(b, alpha, beta, isMax, aiCol, pCol, maxQDepth);
  }

  const alphaOrig = alpha;
  const boardKey = getBoardKey(b) + (isMax ? '_1' : '_0');
  const cached = transpositionTable.get(boardKey);
  if (cached && cached.depth >= depth) {
    if (cached.flag === 0) return cached.score;
    if (cached.flag === 1) alpha = Math.max(alpha, cached.score);
    else if (cached.flag === 2) beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }

  const col = isMax ? aiCol : pCol;
  const moves = getAIMoves(b, col);
  if (!moves.length) {
    return evaluateBoard(b, aiCol);
  }

  // Tri hautement stratégique des coups pour accélérer les coupures alpha-beta
  moves.sort((a, bStep) => {
    if (a.isCap !== bStep.isCap) return a.isCap ? -1 : 1;
    if (a.isCap && bStep.isCap && a.cr !== undefined && a.cc !== undefined && bStep.cr !== undefined && bStep.cc !== undefined) {
      const aVictim = b[a.cr]?.[a.cc];
      const bVictim = b[bStep.cr]?.[bStep.cc];
      const aVal = aVictim?.d ? 3600 : 1200;
      const bVal = bVictim?.d ? 3600 : 1200;
      return bVal - aVal;
    }
    const aAdv = col === 'green' ? a.tr : (BOARD_SIZE - 1 - a.tr);
    const bAdv = col === 'green' ? bStep.tr : (BOARD_SIZE - 1 - bStep.tr);
    return bAdv - aAdv;
  });

  let best = isMax ? -Infinity : Infinity;

  if (isMax) {
    for (const mv of moves) {
      if (searchAborted) break;
      const nb = applyMoveWithChain(b, mv, true, aiCol);
      const sc = minimax(nb, depth - 1, alpha, beta, false, aiCol, pCol, maxQDepth);
      if (searchAborted) break;
      if (sc > best) best = sc;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
  } else {
    for (const mv of moves) {
      if (searchAborted) break;
      const nb = applyMoveWithChain(b, mv, false, aiCol);
      const sc = minimax(nb, depth - 1, alpha, beta, true, aiCol, pCol, maxQDepth);
      if (searchAborted) break;
      if (sc < best) best = sc;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
  }

  let flag = 0; // EXACT
  if (best <= alphaOrig) flag = 2; // UPPERBOUND
  else if (best >= beta) flag = 1; // LOWERBOUND

  if (!searchAborted && transpositionTable.size < 80000) {
    transpositionTable.set(boardKey, { depth, score: best, flag });
  }

  return best;
}

// ─── AI STRATEGIC MEMORY & ADAPTIVE LEARNING ENGINE ───
// Enables the AI to continuously learn from previous matches, avoiding repeating identical
// failed schemas and dynamically diversifying its tactical opening repertoires.
const AI_MEMORY_KEY = '12pions_ai_learning_memory_v2';

interface AILearningEntry {
  wins: number;
  losses: number;
  timesPlayed: number;
}

export function recordAIMatchOutcome(
  movesHistory: { key: string; moveStr: string }[],
  aiWon: boolean
) {
  try {
    const raw = localStorage.getItem(AI_MEMORY_KEY);
    const memory: Record<string, AILearningEntry> = raw ? JSON.parse(raw) : {};

    for (const item of movesHistory) {
      const memoryKey = `${item.key}_${item.moveStr}`;
      if (!memory[memoryKey]) {
        memory[memoryKey] = { wins: 0, losses: 0, timesPlayed: 0 };
      }
      memory[memoryKey].timesPlayed += 1;
      if (aiWon) {
        memory[memoryKey].wins += 1;
      } else {
        memory[memoryKey].losses += 1;
      }
    }

    // Keep memory capped to recent positions to keep lookup instantaneous
    const keys = Object.keys(memory);
    if (keys.length > 800) {
      for (let i = 0; i < keys.length - 600; i++) {
        delete memory[keys[i]];
      }
    }
    localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // LocalStorage catch
  }
}

export function getAIMoveLearningScore(boardKey: string, moveStr: string): number {
  try {
    const raw = localStorage.getItem(AI_MEMORY_KEY);
    if (!raw) return 0;
    const memory: Record<string, AILearningEntry> = JSON.parse(raw);
    const entry = memory[`${boardKey}_${moveStr}`];
    if (!entry || entry.timesPlayed === 0) return 0;

    const winRate = entry.wins / entry.timesPlayed;
    const lossRate = entry.losses / entry.timesPlayed;
    // Heavy learning penalty if this move frequently leads to defeat, reward if it wins
    return (winRate - lossRate) * 55;
  } catch {
    return 0;
  }
}

/**
 * AI move selection taking difficulty into consideration.
 * Intègre une défense rigoureuse, la couverture mutuelle des pions et l'interdiction
 * absolue de se donner bêtement à la capture adverse.
 */
export function chooseBestAIMove(
  b: Board,
  aiCol: PieceColor,
  pCol: PieceColor,
  diff: Difficulty,
  posHistory: string[]
): MoveStep | null {
  const allMoves = getAIMoves(b, aiCol);
  if (!allMoves.length) return null;

  // Shuffle moves for organic variations among equally scored options
  for (let i = allMoves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allMoves[i], allMoves[j]] = [allMoves[j], allMoves[i]];
  }

  const captures = allMoves.filter(m => m.isCap);
  const counts = countPieces(b);
  const totalPieces = counts.green + counts.red;

  // 🎯 OUVERTURE STRATÉGIQUE (12 PIONS) : 50% et 50% soit vers l'avant ou sur le côté
  if (counts.green === 12 && counts.red === 12 && b[2][2] === null) {
    const forwardMove = aiCol === 'green'
      ? allMoves.find(m => m.fr === 1 && m.fc === 2 && m.tr === 2 && m.tc === 2)
      : allMoves.find(m => m.fr === 3 && m.fc === 2 && m.tr === 2 && m.tc === 2);
    const sideMove = aiCol === 'green'
      ? allMoves.find(m => m.fr === 2 && m.fc === 1 && m.tr === 2 && m.tc === 2)
      : allMoves.find(m => m.fr === 2 && m.fc === 3 && m.tr === 2 && m.tc === 2);

    if (forwardMove && sideMove) {
      // Exactement 50% vers l'avant et 50% sur le côté
      return Math.random() < 0.5 ? forwardMove : sideMove;
    } else if (forwardMove) {
      return forwardMove;
    } else if (sideMove) {
      return sideMove;
    }
  }

  // Nettoie la table de transposition pour la nouvelle recherche
  clearTranspositionTable();

  // Contrôle strict du temps de réflexion :
  // L'IA doit impérativement jouer son coup avant la fin du temps réglementaire (budget max : ~450ms)
  const maxSearchTimeMs = diff === 'hard' ? 450 : diff === 'medium' ? 320 : 200;
  const deadline = Date.now() + maxSearchTimeMs;
  setSearchDeadline(deadline);

  // Initialisation de secours absolue avec le premier coup légal (captures prioritaires)
  let bestMoveEver: MoveStep = captures.length > 0 ? captures[0] : allMoves[0];

  // Profondeur maximale calibrée pour concilier grand maître et exécution sub-seconde
  let targetDepth = 4;
  let maxQDepth = 3;

  if (diff === 'easy') {
    targetDepth = 3;
    maxQDepth = 2;
  } else if (diff === 'medium') {
    targetDepth = totalPieces <= 8 ? 4 : 3;
    maxQDepth = 3;
  } else if (diff === 'hard') {
    targetDepth = totalPieces <= 6 ? 6 : totalPieces <= 12 ? 5 : 4;
    maxQDepth = 3;
  }

  // Évaluation des menaces initiales pesant sur l'IA avant son coup
  const initialOppCaps = getAIMoves(b, pCol).filter(m => m.isCap);

  // Recherche par approfondissement itératif (Iterative Deepening)
  // Permet d'avoir un coup excellent garanti à tout instant même en cas de position complexe
  for (let currentDepth = 2; currentDepth <= targetDepth; currentDepth++) {
    if (Date.now() >= deadline || isSearchAborted()) break;

    let bestScore = -Infinity;
    const bestList: { mv: MoveStep; key: string; score: number }[] = [];

    for (const mv of allMoves) {
      if (Date.now() >= deadline || isSearchAborted()) break;

      const nb = applyMoveWithChain(b, mv, true, aiCol);
      let s = minimax(nb, currentDepth - 1, -Infinity, Infinity, false, aiCol, pCol, maxQDepth);

      if (isSearchAborted()) break;

      // Multi-capture trajectory optimization for AI
      if (mv.isCap && mv.cr !== undefined && mv.cc !== undefined) {
        const piece = b[mv.fr]?.[mv.fc];
        if (piece) {
          const initialCap: Record<string, boolean> = { [`${mv.cr},${mv.cc}`]: true };
          const initialDir: [number, number] = [Math.sign(mv.cr - mv.fr), Math.sign(mv.cc - mv.fc)];
          const branch = cloneBoard(b);
          branch[mv.tr][mv.tc] = piece;
          branch[mv.fr][mv.fc] = null;
          branch[mv.cr][mv.cc] = null;
          const trajectory = evaluateMaxChainTrajectory(branch, mv.tr, mv.tc, piece, initialCap, aiCol, initialDir);
          s += trajectory.totalCaptures * (diff === 'hard' ? 2400 : 1200);
        }
      }

      // Anti-repetition penalty
      const nk = getBoardKey(nb);
      if (posHistory.includes(nk)) {
        s -= (diff === 'hard' ? 800 : 350);
      }

      // Adaptive Learning heuristic from stored match history:
      const currentKey = getBoardKey(b);
      const moveNotation = `${mv.fr}${mv.fc}->${mv.tr}${mv.tc}`;
      const learningDelta = getAIMoveLearningScore(currentKey, moveNotation);
      s += learningDelta * (diff === 'hard' ? 5.0 : 3.0);

      // ─── RENFORCEMENT GRAND MAÎTRE SPÉCIFIQUE AU MODE DIFFICILE ───
      if (diff === 'hard') {
        const distFromCenter = Math.abs(mv.tr - 2) + Math.abs(mv.tc - 2);
        s += (4 - distFromCenter) * 120;

        const nextAIMoves = getAIMoves(nb, aiCol).filter(m => m.isCap);
        if (nextAIMoves.length >= 2) {
          s += 1800; // Fourche tactique imparable
        } else if (nextAIMoves.length === 1) {
          s += 600;
        }

        const rank = aiCol === 'green' ? mv.tr : (BOARD_SIZE - 1 - mv.tr);
        if (rank === 4) {
          s += 2500; // Promotion immédiate en Dame
        } else if (rank === 3) {
          s += 900; // Pion avancé prêt à couronner
        }

        const movingPiece = b[mv.fr]?.[mv.fc];
        if (movingPiece?.d) {
          s += 450;
        }
      }

      // ─── ⚔️ OFFENSIVE & AVANCÉE TACTIQUE ───
      if (!mv.isCap) {
        const fw = aiCol === 'green' ? 1 : -1;
        const forwardDist = (mv.tr - mv.fr) * fw;
        if (forwardDist > 0) {
          const rank = aiCol === 'green' ? mv.tr : (BOARD_SIZE - 1 - mv.tr);
          s += rank === 4 ? 650 : rank === 3 ? 240 : 90;
        }
      }

      // ─── 🛡️ BOUCLIER & SAUVEGARDE MUTUELLE ───
      const oppResponses = getAIMoves(nb, pCol);
      const oppCaps = oppResponses.filter(m => m.isCap);

      if (initialOppCaps.length > 0 && oppCaps.length === 0) {
        s += diff === 'hard' ? 3000 : 1500;
      }

      const fw = aiCol === 'green' ? 1 : -1;
      const behindFriendly = inBounds(mv.tr - fw, mv.tc) && nb[mv.tr - fw][mv.tc]?.c === aiCol;
      if (behindFriendly) {
        s += diff === 'hard' ? 140 : 75;
      }

      // ─── 🪤 TENDRE UN PIÈGE VS SUICIDE ───
      if (oppCaps.length > 0) {
        const curAICount = counts[aiCol];
        const curOppCount = counts[pCol];
        const hasMaterialLead = curAICount > curOppCount;
        let isTrap = false;
        let maxTrapAdvantage = 0;

        for (const oc of oppCaps) {
          const afterOpp = applyMoveWithChain(nb, oc, false, aiCol);
          const oppTaken = countPieces(nb)[aiCol] - countPieces(afterOpp)[aiCol];
          const oppLeftAfterOppMove = countPieces(afterOpp)[pCol];

          const aiCounterCaps = getAIMoves(afterOpp, aiCol).filter(m => m.isCap);
          for (const ac of aiCounterCaps) {
            const piece = afterOpp[ac.fr]?.[ac.fc];
            if (piece && ac.cr !== undefined && ac.cc !== undefined) {
              const initialCap = { [`${ac.cr},${ac.cc}`]: true };
              const initialDir: [number, number] = [Math.sign(ac.cr - ac.fr), Math.sign(ac.cc - ac.fc)];
              const branch = cloneBoard(afterOpp);
              branch[ac.tr][ac.tc] = piece;
              branch[ac.fr][ac.fc] = null;
              branch[ac.cr][ac.cc] = null;
              const traj = evaluateMaxChainTrajectory(branch, ac.tr, ac.tc, piece, initialCap, aiCol, initialDir);
              const netGain = traj.totalCaptures - oppTaken;

              const isElimination = (oppLeftAfterOppMove - traj.totalCaptures <= 0);
              const isWinningSimplification = hasMaterialLead && curOppCount <= 2 && (traj.totalCaptures >= 1);

              if (isElimination) {
                isTrap = true;
                maxTrapAdvantage = Math.max(maxTrapAdvantage, 12);
              } else if (traj.totalCaptures >= 2 && netGain >= 0) {
                isTrap = true;
                if (netGain > maxTrapAdvantage) maxTrapAdvantage = netGain;
              } else if (netGain > 0 || isWinningSimplification) {
                isTrap = true;
                if (netGain > maxTrapAdvantage) maxTrapAdvantage = Math.max(maxTrapAdvantage, 2);
              }
            }
          }
        }

        if (isTrap) {
          s += diff === 'hard' ? 12000 + maxTrapAdvantage * 3000 : 6000 + maxTrapAdvantage * 1500;
        } else {
          let maxOppDamage = 0;
          for (const oc of oppCaps) {
            const afterOpp = applyMoveWithChain(nb, oc, false, aiCol);
            const damage = countPieces(nb)[aiCol] - countPieces(afterOpp)[aiCol];
            if (damage > maxOppDamage) maxOppDamage = damage;
          }

          const piecesGainedByAI = mv.isCap ? Math.max(1, (countPieces(b)[pCol] - countPieces(nb)[pCol])) : 0;
          if (maxOppDamage > piecesGainedByAI) {
            const netDeficit = maxOppDamage - piecesGainedByAI;
            const isLoneOppEndgame = (curAICount >= 3 && curOppCount === 1);
            if (isLoneOppEndgame) {
              s -= netDeficit * 300;
            } else {
              s -= diff === 'hard' ? netDeficit * 25000 : netDeficit * 10000;
            }
          }
        }
      }

      // ─── 🎯 CHASSE ACTIVE EN FIN DE PARTIE ───
      if (counts[aiCol] > counts[pCol] && counts[pCol] <= 3 && !mv.isCap) {
        let bestDistBefore = Infinity;
        let bestDistAfter = Infinity;

        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (b[r]?.[c]?.c === pCol) {
              const distBefore = Math.abs(mv.fr - r) + Math.abs(mv.fc - c);
              const distAfter = Math.abs(mv.tr - r) + Math.abs(mv.tc - c);
              if (distBefore < bestDistBefore) bestDistBefore = distBefore;
              if (distAfter < bestDistAfter) bestDistAfter = distAfter;
            }
          }
        }

        if (bestDistAfter < bestDistBefore) {
          s += (bestDistBefore - bestDistAfter) * 1800;
        } else if (bestDistAfter > bestDistBefore) {
          s -= (bestDistAfter - bestDistBefore) * 2500;
        }

        const nextThreats = getAIMoves(nb, aiCol).filter(m => m.isCap);
        if (nextThreats.length > 0) {
          s += 5000;
        }
      }

      if (s > bestScore) {
        bestScore = s;
        bestList.length = 0;
        bestList.push({ mv, key: nk, score: s });
      } else if (diff === 'hard' ? s === bestScore : s >= bestScore - 8) {
        bestList.push({ mv, key: nk, score: s });
      }
    }

    // Validation du résultat de cette profondeur si elle a été menée sans interruption
    if (!isSearchAborted() && bestList.length > 0) {
      const pickLimit = diff === 'hard' ? 1 : (bestList.length > 1 && Math.random() < 0.1 ? 2 : 1);
      const selected = bestList[Math.floor(Math.random() * Math.min(pickLimit, bestList.length))];
      if (selected?.mv) {
        bestMoveEver = selected.mv;
      }
    }
  }

  // Règle absolue de prise obligatoire : si des captures existent, ne jamais jouer un coup normal
  if (captures.length > 0 && !bestMoveEver.isCap) {
    return captures[0];
  }

  return bestMoveEver;
}
