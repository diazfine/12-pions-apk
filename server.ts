import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { getRandomVirtualProfile, VirtualProfile } from './src/utils/virtualProfiles';
import {
  chooseBestAIMove,
  getAIMoves,
  calculateValidMoves,
  applyPromotions,
  countPieces,
  cloneBoard,
  getBoardKey,
} from './src/utils/gameLogic';

// Helper function to create initial 5x5 grid (Row 0-1: Green, Row 2: 2 Green, center empty, 2 Red, Row 3-4: Red)
function getInitialBoardState() {
  const b: any[][] = [];
  for (let r = 0; r < 5; r++) {
    b[r] = [];
    for (let c = 0; c < 5; c++) {
      b[r][c] = null;
    }
  }
  for (let c = 0; c < 5; c++) {
    b[0][c] = { c: 'green', d: false };
    b[1][c] = { c: 'green', d: false };
  }
  b[2][0] = { c: 'green', d: false };
  b[2][1] = { c: 'green', d: false };
  b[2][2] = null;
  b[2][3] = { c: 'red', d: false };
  b[2][4] = { c: 'red', d: false };
  for (let c = 0; c < 5; c++) {
    b[3][c] = { c: 'red', d: false };
    b[4][c] = { c: 'red', d: false };
  }
  return b;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // Allow Capacitor Android/iOS WebView and hosted web origins safely
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      const isAllowedOrigin =
        origin === 'https://localhost' ||
        origin === 'http://localhost' ||
        origin === 'capacitor://localhost' ||
        origin === 'ionic://localhost' ||
        origin === 'http://localhost:3000' ||
        origin === 'https://localhost:3000' ||
        /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.run\.app$/i.test(origin) ||
        (process.env.APP_URL && origin === process.env.APP_URL.replace(/\/+$/, ''));
      if (isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // WebSocket Server for 12 PIONS on /ws
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    socket.on('error', () => {});
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      if (url.pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          ws.on('error', () => {});
          wss.emit('connection', ws, req);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  interface ClientMeta {
    roomId?: string;
    role?: 'host' | 'guest';
    playerId?: string;
    friendCode?: string;
    sessionToken?: string;
    playerName?: string;
    avatar?: string;
    customPhoto?: string;
    flag?: string;
    color?: 'green' | 'red';
  }

  interface RoomState {
    id: string;
    sessionToken?: string;
    rematchCount?: number;
    hostWs: WebSocket | null;
    guestWs: WebSocket | null;
    hostMeta: ClientMeta | null;
    guestMeta: ClientMeta | null;
    board: any[][];
    currentTurn: 'green' | 'red';
    gameStarted: boolean;
    gameOver: boolean;
    winner?: 'green' | 'red' | 'draw';
    gameOverReason?: string;
    movesWithoutCapture: number;
    timerSec: number;
    timerInterval: NodeJS.Timeout | null;
    watchdogTimeout: NodeJS.Timeout | null;
    disconnectTimeout: NodeJS.Timeout | null;
    disconnectInterval?: NodeJS.Timeout | null;
    disconnectBufferSec?: number;
    isPausedForReconnect?: boolean;
    rematchRequestedBy?: 'host' | 'guest';
    turnId: number;
    consecutiveTimeouts: { green: number; red: number };
    isBotMatch?: boolean;
    botProfile?: VirtualProfile;
    botColor?: 'green' | 'red';
    botTimeout?: NodeJS.Timeout | null;
    posHistory?: string[];
  }

  const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function countPiecesOnBoard(b: any[][]) {
    let green = 0;
    let red = 0;
    if (!b || !Array.isArray(b)) return { green: 0, red: 0 };
    for (let r = 0; r < b.length; r++) {
      for (let c = 0; c < (b[r]?.length || 0); c++) {
        const p = b[r][c];
        if (!p) continue;
        if (p.c === 'green') green++;
        else if (p.c === 'red') red++;
      }
    }
    return { green, red };
  }

  // ⚖️ RÈGLE DES 50 COUPS SANS PRISE : Comparaison des pions restants
  // Si un joueur a plus de pions, il est déclaré Vainqueur. Match Nul seulement si stricte égalité.
  function resolve50MovesWinner(b: any[][]): { winner: 'green' | 'red' | 'draw'; greenCount: number; redCount: number; message: string } {
    const { green, red } = countPiecesOnBoard(b);
    if (green > red) {
      return {
        winner: 'green',
        greenCount: green,
        redCount: red,
        message: `⚖️ 50 coups sans prise atteints : Victoire des Verts (${green} vs ${red} pions) !`,
      };
    } else if (red > green) {
      return {
        winner: 'red',
        greenCount: green,
        redCount: red,
        message: `⚖️ 50 coups sans prise atteints : Victoire des Rouges (${red} vs ${green} pions) !`,
      };
    } else {
      return {
        winner: 'draw',
        greenCount: green,
        redCount: red,
        message: `⚖️ 50 coups sans prise atteints : Match Nul (${green} vs ${red} pions) !`,
      };
    }
  }

  // 🛡️ DÉTECTION OFFICIELLE DES COUPS LÉGAUX (Validation synchrone anti-blocage)
  function hasLegalMoves(b: any[][], color: 'green' | 'red'): boolean {
    if (!b || !Array.isArray(b) || b.length !== 5) return false;
    const D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const p = b[r]?.[c];
        if (!p || p.c !== color) continue;

        // 1. Vérification des captures (prioritaires)
        if (p.d) {
          // Dame : glisse dans chaque direction orthogonale
          for (const [dr, dc] of D4) {
            let step = 1;
            while (true) {
              const nr = r + dr * step;
              const nc = c + dc * step;
              if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) break;
              const mid = b[nr][nc];
              if (!mid) {
                step++;
                continue;
              }
              if (mid.c === color) break; // Bloqué par allié
              // Pièce adverse trouvée : vérifie case vide juste derrière
              const landR = nr + dr;
              const landC = nc + dc;
              if (landR >= 0 && landR < 5 && landC >= 0 && landC < 5 && !b[landR][landC]) {
                return true; // Capture de Dame légale disponible
              }
              break;
            }
          }
        } else {
          // Pion simple : saut orthogonal de 2 cases par-dessus une pièce adverse
          for (const [dr, dc] of D4) {
            const midR = r + dr;
            const midC = c + dc;
            const landR = r + dr * 2;
            const landC = c + dc * 2;
            if (landR >= 0 && landR < 5 && landC >= 0 && landC < 5) {
              const mid = b[midR]?.[midC];
              if (mid && mid.c !== color && !b[landR]?.[landC]) {
                return true; // Capture de pion simple légale disponible
              }
            }
          }
        }

        // 2. Vérification des déplacements simples (sans capture)
        if (p.d) {
          // Dame : peut se déplacer sur toute case vide orthogonale
          for (const [dr, dc] of D4) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && !b[nr]?.[nc]) {
              return true;
            }
          }
        } else {
          // Pion simple : avance (Vert: +1, Rouge: -1) ou latéral (gauche/droite)
          const fwd = color === 'green' ? 1 : -1;
          const dirs = [
            [fwd, 0],
            [0, -1],
            [0, 1],
          ];
          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && !b[nr]?.[nc]) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  function hasCaptureMoves(b: any[][], color: 'green' | 'red'): boolean {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const p = b[r]?.[c];
        if (!p || p.c !== color) continue;

        if (p.d) {
          for (const [dr, dc] of D4) {
            let step = 1;
            while (true) {
              const nr = r + dr * step;
              const nc = c + dc * step;
              if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) break;
              const mid = b[nr][nc];
              if (!mid) {
                step++;
                continue;
              }
              if (mid.c === color) break;
              const landR = nr + dr;
              const landC = nc + dc;
              if (landR >= 0 && landR < 5 && landC >= 0 && landC < 5 && !b[landR][landC]) {
                return true;
              }
              break;
            }
          }
        } else {
          for (const [dr, dc] of D4) {
            const midR = r + dr;
            const midC = c + dc;
            const landR = r + dr * 2;
            const landC = c + dc * 2;
            if (landR >= 0 && landR < 5 && landC >= 0 && landC < 5) {
              const mid = b[midR]?.[midC];
              if (mid && mid.c !== color && !b[landR]?.[landC]) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  interface RegisteredPlayer {
    ws: WebSocket;
    playerId: string;
    friendCode: string;
    playerName: string;
    avatar?: string;
    flag?: string;
    level?: number;
    currentChatWithFriendId?: string;
    currentChatFriendCode?: string;
  }

  interface FriendChallenge {
    id: string;
    fromPlayerId: string;
    fromFriendCode: string;
    fromName: string;
    fromAvatar: string;
    fromFlag: string;
    toFriendId: string;
    toFriendCode?: string;
    roomId: string;
    createdAt: number;
    status: 'pending' | 'accepted' | 'cancelled';
  }

  const clients = new Map<WebSocket, ClientMeta>();
  const rooms = new Map<string, RoomState>();
  const registeredPlayers = new Map<WebSocket, RegisteredPlayer>();
  const activeFriendChallenges = new Map<string, FriendChallenge>();

  interface StoredFriendRequest {
    id: string;
    name: string;
    avatar: string;
    flag: string;
    level: number;
    time: string;
    friendCode: string;
    senderPlayerId?: string;
  }
  const pendingFriendRequests = new Map<string, StoredFriendRequest[]>();
  const pendingAcceptedFriends = new Map<string, any[]>();
  const pendingFriendMessages = new Map<string, any[]>();

  function findOnlineTargetSockets(
    targetCode: string,
    targetId: string,
    targetName: string,
    excludeWs?: WebSocket
  ): RegisteredPlayer[] {
    const cleanCode = (targetCode || '').trim().toUpperCase();
    const cleanId = (targetId || '').trim().toUpperCase();
    const cleanName = (targetName || '').trim().toLowerCase();

    const matchedByCodeOrId: RegisteredPlayer[] = [];
    const matchedByName: RegisteredPlayer[] = [];

    for (const other of registeredPlayers.values()) {
      if (excludeWs && other.ws === excludeWs) continue;
      if (other.ws.readyState !== WebSocket.OPEN) continue;

      const otherCode = (other.friendCode || '').trim().toUpperCase();
      const otherId = (other.playerId || '').trim().toUpperCase();
      const otherName = (other.playerName || '').trim().toLowerCase();

      if ((cleanCode && otherCode === cleanCode) || (cleanId && otherId === cleanId) || (cleanCode && otherId === cleanCode)) {
        matchedByCodeOrId.push(other);
      } else if (cleanName && otherName === cleanName) {
        matchedByName.push(other);
      }
    }

    return matchedByCodeOrId.length > 0 ? matchedByCodeOrId : matchedByName;
  }

  // Matchmaking queue: single waiting player slot for instant 2-device pairing
  let waitingPlayer: {
    ws: WebSocket;
    playerId: string;
    friendCode?: string;
    playerName: string;
    avatar?: string;
    customPhoto?: string;
    flag?: string;
    region?: string;
    preferredColor?: 'green' | 'red' | 'random';
    botTimer?: NodeJS.Timeout | null;
  } | null = null;

  function stopRoomTimer(room: RoomState) {
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
    if (room.watchdogTimeout) {
      clearTimeout(room.watchdogTimeout);
      room.watchdogTimeout = null;
    }
    if (room.disconnectTimeout) {
      clearTimeout(room.disconnectTimeout);
      room.disconnectTimeout = null;
    }
    if (room.disconnectInterval) {
      clearInterval(room.disconnectInterval);
      room.disconnectInterval = null;
    }
    // Only cancel botTimeout if game is over
    if (room.gameOver && room.botTimeout) {
      clearTimeout(room.botTimeout);
      room.botTimeout = null;
    }
  }

  function executeBotMoveNow(room: RoomState, chainPiece?: { r: number; c: number; dir: [number, number] }) {
    if (!rooms.has(room.id) || room.gameOver || !room.isBotMatch || !room.botProfile || !room.botColor) return;
    if (room.currentTurn !== room.botColor) return;

    if (room.botTimeout) {
      clearTimeout(room.botTimeout);
      room.botTimeout = null;
    }

    const botCol = room.botColor;
    const humanCol: 'green' | 'red' = botCol === 'green' ? 'red' : 'green';
    const curBoard = room.board;
    // Calibrage compétitif officiel : 65% de profils virtuels de niveau expert/dur ('hard') et 35% de niveau intermédiaire ('medium')
    const difficulty: 'easy' | 'medium' | 'hard' = room.botProfile?.difficulty || (Math.random() < 0.65 ? 'hard' : 'medium');

    let bestMove: { fr: number; fc: number; tr: number; tc: number; cr?: number; cc?: number; isCap?: boolean } | null = null;

    try {
      if (chainPiece) {
        // Enchaînement obligatoire de la multi-capture avec le même pion
        const chainMoves = calculateValidMoves(
          curBoard,
          chainPiece.r,
          chainPiece.c,
          { r: chainPiece.r, c: chainPiece.c },
          {},
          chainPiece.dir
        ).filter(m => m.t === 'c');

        if (chainMoves.length > 0) {
          const cap = chainMoves[0];
          bestMove = {
            fr: chainPiece.r,
            fc: chainPiece.c,
            tr: cap.r,
            tc: cap.c,
            cr: cap.cr,
            cc: cap.cc,
            isCap: true,
          };
        }
      }

      if (!bestMove) {
        if (!room.posHistory) room.posHistory = [];
        room.posHistory.push(getBoardKey(curBoard as any));
        bestMove = chooseBestAIMove(curBoard as any, botCol, humanCol, difficulty, room.posHistory);
      }
    } catch (err) {
      console.error('[Bot AI Warning] Recovery fallback to safe legal move:', err);
    }

    // Sécurité absolue : si l'évaluation n'a pas retourné de coup ou a levé une exception, prendre un coup légal disponible
    if (!bestMove) {
      const safeMoves = getAIMoves(curBoard as any, botCol);
      bestMove = safeMoves.length > 0 ? safeMoves[0] : null;
    }

    if (!bestMove) {
      room.gameOver = true;
      room.winner = humanCol;
      room.gameOverReason = 'blocked';
      stopRoomTimer(room);

      const stuckPayload = JSON.stringify({
        type: 'PLAYER_STUCK',
        event: 'PLAYER_STUCK',
        roomId: room.id,
        stuckColor: botCol,
        loser: botCol,
        winner: humanCol,
        gameOver: true,
        gameOverReason: 'blocked',
        message: `Fin de partie : ${room.botProfile?.name} n'a plus aucun coup valide. Victoire !`,
      });
      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
        room.hostWs.send(stuckPayload);
      }
      return;
    }

    try {
      let nextBoard = cloneBoard(curBoard as any);
      let piece = nextBoard[bestMove.fr]?.[bestMove.fc];
      if (!piece || piece.c !== botCol) {
        const safeMoves = getAIMoves(curBoard as any, botCol);
        if (safeMoves.length > 0) {
          bestMove = safeMoves[0];
          nextBoard = cloneBoard(curBoard as any);
          piece = nextBoard[bestMove.fr]?.[bestMove.fc];
        }
      }
      if (!piece) {
        // Si la pièce sélectionnée est invalide, passer au tour de l'humain pour débloquer
        room.currentTurn = humanCol;
        startRoomTimer(room);
        return;
      }

      nextBoard[bestMove.tr][bestMove.tc] = piece;
      nextBoard[bestMove.fr][bestMove.fc] = null;

      let isCap = Boolean(bestMove.isCap);
      if (isCap && bestMove.cr !== undefined && bestMove.cc !== undefined) {
        nextBoard[bestMove.cr][bestMove.cc] = null;
      }

      applyPromotions(nextBoard, { r: bestMove.tr, c: bestMove.tc });

      // Vérification des multi-captures en chaîne pour le bot
      if (isCap) {
        const stepDir: [number, number] = [
          Math.sign((bestMove.cr ?? bestMove.tr) - bestMove.fr) || 0,
          Math.sign((bestMove.cc ?? bestMove.tc) - bestMove.fc) || 0,
        ];
        const nextCaps = calculateValidMoves(
          nextBoard,
          bestMove.tr,
          bestMove.tc,
          { r: bestMove.tr, c: bestMove.tc },
          {},
          stepDir
        ).filter(m => m.t === 'c');

        if (nextCaps.length > 0) {
          room.board = nextBoard;
          room.movesWithoutCapture = 0;

          const intermediateMoveData = {
            fr: bestMove.fr,
            fc: bestMove.fc,
            tr: bestMove.tr,
            tc: bestMove.tc,
            isCap: true,
          };

          const intermediatePayload = JSON.stringify({
            type: 'MOVE_PIECE',
            event: 'MOVE_PIECE',
            board: nextBoard,
            lastMove: intermediateMoveData,
            fr: bestMove.fr,
            fc: bestMove.fc,
            tr: bestMove.tr,
            tc: bestMove.tc,
            isCap: true,
            nextTurn: botCol,
            currentTurn: botCol,
            turn: botCol,
            isChainStep: true,
            movingColor: botCol,
            timerSec: 30,
            movesWithoutCapture: 0,
            gameOver: false,
          });

          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(intermediatePayload);
          }

          scheduleBotTurn(room, { r: bestMove.tr, c: bestMove.tc, dir: stepDir });
          return;
        }
      }

      room.board = nextBoard;
      room.turnId = (room.turnId || 0) + 1;

      if (isCap) {
        room.movesWithoutCapture = 0;
      } else {
        room.movesWithoutCapture = (room.movesWithoutCapture || 0) + 1;
      }

      const counts = countPieces(nextBoard);
      let gameOverReason: string | undefined = undefined;

      if (counts.green === 0 && counts.red > 0) {
        room.gameOver = true;
        room.winner = 'red';
        gameOverReason = 'elimination';
        stopRoomTimer(room);
      } else if (counts.red === 0 && counts.green > 0) {
        room.gameOver = true;
        room.winner = 'green';
        gameOverReason = 'elimination';
        stopRoomTimer(room);
      } else if (
        counts.green === 1 &&
        counts.red === 1 &&
        !hasCaptureMoves(room.board, 'green') &&
        !hasCaptureMoves(room.board, 'red')
      ) {
        room.gameOver = true;
        room.winner = 'draw';
        gameOverReason = 'draw_1v1';
        stopRoomTimer(room);
      } else if (!hasLegalMoves(room.board, humanCol)) {
        room.gameOver = true;
        room.winner = botCol;
        gameOverReason = 'blocked';
        stopRoomTimer(room);
      } else if (room.movesWithoutCapture >= 50) {
        room.gameOver = true;
        const res50 = resolve50MovesWinner(room.board);
        room.winner = res50.winner;
        room.gameOverReason = 'draw_50_moves';
        gameOverReason = 'draw_50_moves';
        stopRoomTimer(room);
      } else {
        room.currentTurn = humanCol;
        startRoomTimer(room);
      }

      const lastMoveData = {
        fr: bestMove.fr,
        fc: bestMove.fc,
        tr: bestMove.tr,
        tc: bestMove.tc,
        isCap,
      };

      const broadcastPayload = JSON.stringify({
        type: 'MOVE_PIECE',
        event: 'MOVE_PIECE',
        board: room.board,
        lastMove: lastMoveData,
        fr: bestMove.fr,
        fc: bestMove.fc,
        tr: bestMove.tr,
        tc: bestMove.tc,
        isCap,
        nextTurn: room.currentTurn,
        turn: room.currentTurn,
        currentTurn: room.currentTurn,
        isChainStep: false,
        movingColor: botCol,
        timerSec: 30,
        movesWithoutCapture: room.movesWithoutCapture,
        gameOver: room.gameOver,
        winner: room.winner,
        gameOverReason,
      });

      const statePayload = JSON.stringify({
        type: 'GAME_STATE_UPDATE',
        event: 'GAME_STATE_UPDATE',
        board: room.board,
        currentTurn: room.currentTurn,
        turn: room.currentTurn,
        nextTurn: room.currentTurn,
        turnId: room.turnId,
        lastMove: lastMoveData,
        fr: bestMove.fr,
        fc: bestMove.fc,
        tr: bestMove.tr,
        tc: bestMove.tc,
        isCap,
        movingColor: botCol,
        timerSec: 30,
        movesWithoutCapture: room.movesWithoutCapture,
        gameOver: room.gameOver,
        winner: room.winner,
        gameOverReason,
      });

      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
        room.hostWs.send(statePayload);
        room.hostWs.send(broadcastPayload);
        if (room.gameOver) {
          room.hostWs.send(JSON.stringify({
            type: 'GAME_OVER',
            event: 'GAME_OVER',
            roomId: room.id,
            gameOver: true,
            winner: room.winner,
            gameOverReason: room.gameOverReason || gameOverReason,
            movesWithoutCapture: room.movesWithoutCapture,
            message: room.winner === 'draw'
              ? '⚖️ Règle des 50 coups sans prise atteinte : Match Nul !'
              : `Victoire des ${room.winner === 'green' ? 'Verts' : 'Rouges'} !`,
          }));
        }
      }

      if ((isCap || nextBoard[bestMove.tr]?.[bestMove.tc]?.d) && Math.random() < 0.25) {
        const emotes = ['👏', '🔥', '👑', '💪', '🎯'];
        const chosen = emotes[Math.floor(Math.random() * emotes.length)];
        setTimeout(() => {
          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN && !room.gameOver) {
            room.hostWs.send(JSON.stringify({
              type: 'emote',
              payload: chosen,
              emoji: chosen,
              senderName: room.botProfile?.name,
            }));
          }
        }, 700);
      }
    } catch (err) {
      console.error('[Bot Execution Error]:', err);
      // Failsafe de déblocage ultime : avance le tour
      room.currentTurn = humanCol;
      startRoomTimer(room);
    }
  }

  function scheduleBotTurn(room: RoomState, chainPiece?: { r: number; c: number; dir: [number, number] }) {
    if (!room || room.gameOver || !room.isBotMatch || !room.botProfile || !room.botColor) return;
    if (room.currentTurn !== room.botColor) return;

    if (room.botTimeout) {
      clearTimeout(room.botTimeout);
      room.botTimeout = null;
    }

    // Décomposition visuelle des multi-captures : temps d'arrêt mesuré d'environ 520ms par saut
    const thinkingDelay = chainPiece ? 520 : (500 + Math.floor(Math.random() * 250));

    room.botTimeout = setTimeout(() => {
      room.botTimeout = null;
      executeBotMoveNow(room, chainPiece);
    }, thinkingDelay);
  }

  function startBotMatch(p1: {
    ws: WebSocket;
    playerId: string;
    playerName: string;
    avatar?: string;
    customPhoto?: string;
    flag?: string;
    region?: string;
    preferredColor?: 'green' | 'red' | 'random';
  }) {
    if (!p1.ws || p1.ws.readyState !== WebSocket.OPEN) return;

    const botProfile = getRandomVirtualProfile();
    const roomId = `online_bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    let p1Color: 'green' | 'red';
    if (p1.preferredColor === 'green') p1Color = 'green';
    else if (p1.preferredColor === 'red') p1Color = 'red';
    else p1Color = Math.random() < 0.5 ? 'green' : 'red';

    const botColor: 'green' | 'red' = p1Color === 'green' ? 'red' : 'green';
    const startingTurn: 'green' | 'red' = Math.random() < 0.5 ? 'green' : 'red';
    const initialBoard = getInitialBoardState();

    const hostMeta: ClientMeta = {
      roomId,
      role: 'host',
      playerId: p1.playerId,
      playerName: p1.playerName,
      avatar: p1.avatar,
      customPhoto: p1.customPhoto,
      flag: p1.flag,
      color: p1Color,
    };

    const room: RoomState = {
      id: roomId,
      hostWs: p1.ws,
      guestWs: null,
      hostMeta,
      guestMeta: null,
      board: initialBoard,
      currentTurn: startingTurn,
      gameStarted: true,
      gameOver: false,
      movesWithoutCapture: 0,
      rematchRequestedBy: undefined,
      timerSec: 30,
      timerInterval: null,
      watchdogTimeout: null,
      disconnectTimeout: null,
      turnId: 0,
      consecutiveTimeouts: { green: 0, red: 0 },
      isBotMatch: true,
      botProfile,
      botColor,
      botTimeout: null,
      posHistory: [],
    };

    rooms.set(roomId, room);
    clients.set(p1.ws, hostMeta);

    p1.ws.send(JSON.stringify({
      type: 'MATCH_FOUND',
      roomId,
      role: 'host',
      myColor: p1Color,
      opponentColor: botColor,
      startingTurn,
      currentTurn: startingTurn,
      opponentName: botProfile.name,
      opponentAvatar: botProfile.avatar,
      opponentPhoto: undefined,
      opponentFlag: botProfile.flag,
      opponentCountry: botProfile.country,
      opponentLevel: botProfile.level,
      opponentRating: botProfile.rating,
      isBotMatch: true,
      message: `Adversaire trouvé ! Vous jouez contre ${botProfile.name} ${botProfile.flag}.`,
    }));

    p1.ws.send(JSON.stringify({
      type: 'START_MATCH',
      event: 'START_MATCH',
      board: initialBoard,
      startingTurn,
      currentTurn: startingTurn,
      turn: startingTurn,
      role: 'host',
      myColor: p1Color,
      opponentColor: botColor,
      hostColor: p1Color,
      guestColor: botColor,
      playerName: p1.playerName,
      opponentName: botProfile.name,
      opponentAvatar: botProfile.avatar,
      opponentPhoto: undefined,
      opponentFlag: botProfile.flag,
      opponentCountry: botProfile.country,
      opponentLevel: botProfile.level,
      opponentRating: botProfile.rating,
      roomId,
      movesWithoutCapture: 0,
      isBotMatch: true,
      payload: {
        role: 'host',
        myColor: p1Color,
        opponentColor: botColor,
        hostColor: p1Color,
        guestColor: botColor,
        playerName: p1.playerName,
        opponentName: botProfile.name,
        opponentAvatar: botProfile.avatar,
        opponentPhoto: undefined,
        opponentFlag: botProfile.flag,
        opponentCountry: botProfile.country,
        opponentLevel: botProfile.level,
        opponentRating: botProfile.rating,
        startingTurn,
        currentTurn: startingTurn,
        board: initialBoard,
        turn: startingTurn,
        roomId,
        movesWithoutCapture: 0,
        isBotMatch: true,
      },
    }));

    startRoomTimer(room);

    if (startingTurn === botColor) {
      scheduleBotTurn(room);
    }
  }

  function handleAuthoritativeTimeout(room: RoomState) {
    if (!rooms.has(room.id) || room.gameOver) return;

    // Si c'est au tour du bot virtuel, il ne doit JAMAIS perdre par forfait : exécuter son coup immédiatement
    if (room.isBotMatch && room.currentTurn === room.botColor) {
      if (room.consecutiveTimeouts) {
        room.consecutiveTimeouts[room.botColor] = 0;
      }
      executeBotMoveNow(room);
      return;
    }

    const timedOutColor = room.currentTurn;
    if (!room.consecutiveTimeouts) {
      room.consecutiveTimeouts = { green: 0, red: 0 };
    }
    const currentCount = room.consecutiveTimeouts[timedOutColor] || 0;

    if (currentCount >= 1) {
      // 🛑 RÈGLE 3 : Deuxième inactivité consécutive -> arrêt instantané, adversaire vainqueur par forfait immédiat !
      stopRoomTimer(room);
      room.gameOver = true;
      const winnerColor: 'green' | 'red' = timedOutColor === 'green' ? 'red' : 'green';
      room.winner = winnerColor;
      room.gameOverReason = 'consecutive_timeout';

      const forfeitPayload = JSON.stringify({
        type: 'FORFEIT_TIMEOUT',
        event: 'FORFEIT_TIMEOUT',
        roomId: room.id,
        winner: winnerColor,
        loser: timedOutColor,
        reason: 'consecutive_timeout',
        forfeit: true,
        message: "Victoire par forfait ! L'adversaire a laissé expirer son minuteur deux fois consécutives.",
        winnerMessage: "Victoire par forfait ! L'adversaire a laissé expirer son minuteur deux fois consécutives.",
        loserMessage: "Défaite par forfait : Deuxième expiration consécutive du minuteur (inactivité prolongée).",
      });

      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
        room.hostWs.send(forfeitPayload);
      }
      if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
        room.guestWs.send(forfeitPayload);
      }
      rooms.delete(room.id);
      return;
    }

    // ⚠️ PREMIÈRE INACTIVITÉ (30s sans action) :
    // Coup automatique d'IA joué à la place du joueur + 1er avertissement
    room.consecutiveTimeouts[timedOutColor] = 1;
    const opponentColor: 'green' | 'red' = timedOutColor === 'green' ? 'red' : 'green';

    const warningPayload = JSON.stringify({
      type: 'TIMEOUT_FIRST_WARNING',
      event: 'TIMEOUT_FIRST_WARNING',
      roomId: room.id,
      timedOutColor,
      currentTurn: room.currentTurn,
      consecutiveCount: 1,
      timerSec: 30,
      message: "⚠️ 1er avertissement : Temps écoulé (30s) ! Coup d'IA joué à votre place. Attention, à la deuxième inactivité consécutive, défaite immédiate par forfait !",
    });

    if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
      room.hostWs.send(warningPayload);
    }
    if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
      room.guestWs.send(warningPayload);
    }

    let bestMove: { fr: number; fc: number; tr: number; tc: number; cr?: number; cc?: number; isCap?: boolean } | null = null;
    try {
      bestMove = chooseBestAIMove(room.board as any, timedOutColor, opponentColor, 'easy', []);
    } catch (err) {
      console.error('[Timeout AI Move Error]:', err);
    }
    if (!bestMove) {
      const safeMoves = getAIMoves(room.board as any, timedOutColor);
      bestMove = safeMoves.length > 0 ? safeMoves[0] : null;
    }

    if (!bestMove) {
      // Aucun coup valide disponible : Défaite par blocage
      stopRoomTimer(room);
      room.gameOver = true;
      room.winner = opponentColor;
      room.gameOverReason = 'blocked';

      const stuckPayload = JSON.stringify({
        type: 'PLAYER_STUCK',
        event: 'PLAYER_STUCK',
        roomId: room.id,
        stuckColor: timedOutColor,
        loser: timedOutColor,
        winner: opponentColor,
        gameOver: true,
        gameOverReason: 'blocked',
        message: `Fin de partie : Aucun coup valide pour les ${timedOutColor === 'green' ? 'Verts' : 'Rouges'}. Victoire !`,
      });
      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) room.hostWs.send(stuckPayload);
      if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) room.guestWs.send(stuckPayload);
      return;
    }

    try {
      // Exécution autoritaire immédiate du coup automatique sur l'échiquier officiel
      const nextBoard = cloneBoard(room.board as any);
      let movingPiece = nextBoard[bestMove.fr]?.[bestMove.fc];
      if (!movingPiece || movingPiece.c !== timedOutColor) {
        const safe = getAIMoves(room.board as any, timedOutColor);
        if (safe.length > 0) {
          bestMove = safe[0];
          movingPiece = nextBoard[bestMove.fr]?.[bestMove.fc];
        }
      }
      if (!movingPiece) {
        room.currentTurn = opponentColor;
        startRoomTimer(room);
        return;
      }

      nextBoard[bestMove.tr][bestMove.tc] = movingPiece;
      nextBoard[bestMove.fr][bestMove.fc] = null;
      const isCap = Boolean(bestMove.isCap);
      if (isCap && bestMove.cr !== undefined && bestMove.cc !== undefined) {
        nextBoard[bestMove.cr][bestMove.cc] = null;
      }
      applyPromotions(nextBoard, { r: bestMove.tr, c: bestMove.tc });
      room.board = nextBoard;

      if (isCap) {
        room.movesWithoutCapture = 0;
      } else {
        room.movesWithoutCapture = (room.movesWithoutCapture || 0) + 1;
      }

      room.turnId = (room.turnId || 0) + 1;
      const counts = countPieces(nextBoard);
      let gameOverReason: string | undefined = undefined;

      if (counts.green === 0 && counts.red > 0) {
        room.gameOver = true;
        room.winner = 'red';
        gameOverReason = 'elimination';
        stopRoomTimer(room);
      } else if (counts.red === 0 && counts.green > 0) {
        room.gameOver = true;
        room.winner = 'green';
        gameOverReason = 'elimination';
        stopRoomTimer(room);
      } else if (
        counts.green === 1 &&
        counts.red === 1 &&
        !hasCaptureMoves(room.board, 'green') &&
        !hasCaptureMoves(room.board, 'red')
      ) {
        room.gameOver = true;
        room.winner = 'draw';
        gameOverReason = 'draw_1v1';
        stopRoomTimer(room);
      } else if (!hasLegalMoves(room.board, opponentColor)) {
        room.gameOver = true;
        room.winner = timedOutColor;
        gameOverReason = 'blocked';
        stopRoomTimer(room);
      } else if (room.movesWithoutCapture >= 50) {
        room.gameOver = true;
        const res50 = resolve50MovesWinner(room.board);
        room.winner = res50.winner;
        room.gameOverReason = 'draw_50_moves';
        gameOverReason = 'draw_50_moves';
        stopRoomTimer(room);
      } else {
        room.currentTurn = opponentColor;
        startRoomTimer(room);
      }

      const lastMoveData = {
        fr: bestMove.fr,
        fc: bestMove.fc,
        tr: bestMove.tr,
        tc: bestMove.tc,
        isCap,
      };

      const autoMovePayload = JSON.stringify({
        type: 'MOVE_PIECE',
        event: 'MOVE_PIECE',
        board: room.board,
        lastMove: lastMoveData,
        fr: bestMove.fr,
        fc: bestMove.fc,
        tr: bestMove.tr,
        tc: bestMove.tc,
        isCap,
        nextTurn: room.currentTurn,
        turn: room.currentTurn,
        currentTurn: room.currentTurn,
        isChainStep: false,
        isAutoMove: true,
        wasTimeout: true,
        movingColor: timedOutColor,
        timerSec: 30,
        movesWithoutCapture: room.movesWithoutCapture,
        gameOver: room.gameOver,
        winner: room.winner,
        gameOverReason,
        message: "⚠️ Temps écoulé : Coup automatique joué par le système.",
      });

      const autoStatePayload = JSON.stringify({
        type: 'GAME_STATE_UPDATE',
        event: 'GAME_STATE_UPDATE',
        board: room.board,
        currentTurn: room.currentTurn,
        turn: room.currentTurn,
        nextTurn: room.currentTurn,
        turnId: room.turnId,
        lastMove: lastMoveData,
        fr: bestMove.fr,
        fc: bestMove.fc,
        tr: bestMove.tr,
        tc: bestMove.tc,
        isCap,
        isAutoMove: true,
        wasTimeout: true,
        movingColor: timedOutColor,
        timerSec: 30,
        movesWithoutCapture: room.movesWithoutCapture,
        gameOver: room.gameOver,
        winner: room.winner,
        gameOverReason,
        message: "⚠️ Temps écoulé : Coup automatique joué par le système.",
      });

      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
        room.hostWs.send(autoStatePayload);
        room.hostWs.send(autoMovePayload);
        if (room.gameOver) {
          room.hostWs.send(JSON.stringify({
            type: 'GAME_OVER',
            event: 'GAME_OVER',
            roomId: room.id,
            gameOver: true,
            winner: room.winner,
            gameOverReason: room.gameOverReason || gameOverReason,
            movesWithoutCapture: room.movesWithoutCapture,
            message: room.winner === 'draw'
              ? '⚖️ Règle des 50 coups sans prise atteinte : Match Nul !'
              : `Victoire des ${room.winner === 'green' ? 'Verts' : 'Rouges'} !`,
          }));
        }
      }
      if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
        room.guestWs.send(autoStatePayload);
        room.guestWs.send(autoMovePayload);
        if (room.gameOver) {
          room.guestWs.send(JSON.stringify({
            type: 'GAME_OVER',
            event: 'GAME_OVER',
            roomId: room.id,
            gameOver: true,
            winner: room.winner,
            gameOverReason: room.gameOverReason || gameOverReason,
            movesWithoutCapture: room.movesWithoutCapture,
            message: room.winner === 'draw'
              ? '⚖️ Règle des 50 coups sans prise atteinte : Match Nul !'
              : `Victoire des ${room.winner === 'green' ? 'Verts' : 'Rouges'} !`,
          }));
        }
      }

      if (room.isBotMatch && room.currentTurn === room.botColor && !room.gameOver) {
        scheduleBotTurn(room);
      }
    } catch (err) {
      console.error('[Timeout Execution Error]:', err);
      room.currentTurn = opponentColor;
      startRoomTimer(room);
    }
  }

  function startRoomTimer(room: RoomState) {
    stopRoomTimer(room);
    room.timerSec = 30;
    room.turnId = (room.turnId || 0) + 1;
    const currentTurnId = room.turnId;
    const turnColor = room.currentTurn;

    // Immédiatement notifier les deux clients de la réinitialisation du minuteur à 30 secondes
    const resetPayload = JSON.stringify({
      type: 'TIMER_RESET',
      roomId: room.id,
      timerSec: 30,
      currentTurn: room.currentTurn,
    });
    if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
      room.hostWs.send(resetPayload);
    }
    if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
      room.guestWs.send(resetPayload);
    }

    // Si c'est au tour du bot, s'assurer qu'il démarre immédiatement son coup
    if (room.isBotMatch && room.currentTurn === room.botColor && !room.gameOver) {
      scheduleBotTurn(room);
    }

    room.timerInterval = setInterval(() => {
      // Nettoyage immédiat si la salle n'existe plus ou si le tour a changé entre temps
      if (!rooms.has(room.id) || room.turnId !== currentTurnId || room.currentTurn !== turnColor) {
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
          room.timerInterval = null;
        }
        return;
      }

      room.timerSec--;

      // Broadcast timer tick to both clients in room
      const tickPayload = JSON.stringify({
        type: 'TIMER_TICK',
        roomId: room.id,
        timerSec: Math.max(0, room.timerSec),
        currentTurn: room.currentTurn,
      });

      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
        room.hostWs.send(tickPayload);
      }
      if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
        room.guestWs.send(tickPayload);
      }

      // Sécurité anti-temps mort absolue : Le bot virtuel ne doit JAMAIS laisser couler le chrono
      // Si après 2 secondes (timerSec <= 28), le bot n'a pas encore joué, forcer l'exécution immédiate
      if (room.isBotMatch && room.currentTurn === room.botColor && !room.gameOver) {
        if (room.timerSec <= 28) {
          executeBotMoveNow(room);
        }
      }

      // Condition STRICTE : Lorsque le compteur atteint physiquement 0 seconde, arbitrage autoritaire instantané
      if (room.timerSec <= 0) {
        if (room.turnId !== currentTurnId || room.currentTurn !== turnColor) {
          return;
        }
        handleAuthoritativeTimeout(room);
      }
    }, 1000);
  }

  function startRematch(oldRoom: RoomState) {
    // 1. Purge & destruction propre de l'ancienne instance de partie (Flush Game Session)
    stopRoomTimer(oldRoom);
    if (oldRoom.botTimeout) {
      clearTimeout(oldRoom.botTimeout);
      oldRoom.botTimeout = null;
    }

    const oldRoomId = oldRoom.id;
    const hostWs = oldRoom.hostWs;
    const guestWs = oldRoom.guestWs;
    const oldHostMeta = oldRoom.hostMeta;
    const oldGuestMeta = oldRoom.guestMeta;
    const nextRematchCount = (oldRoom.rematchCount || 0) + 1;

    rooms.delete(oldRoomId);

    // 2. Génération d'un nouvel ID de salon & jeton de session frais pour les deux joueurs
    const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let newRoomId: string;
    if (oldRoomId.startsWith('online_match_')) {
      newRoomId = `online_match_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    } else {
      do {
        newRoomId = Math.floor(100000 + Math.random() * 900000).toString();
      } while (rooms.has(newRoomId));
    }

    const freshBoard = getInitialBoardState();

    // Tirage au sort aléatoire du premier coup (50% Verts / 50% Rouges)
    const startingTurn: 'green' | 'red' = Math.random() < 0.5 ? 'green' : 'red';

    // Inverser les rôles (Verts / Rouges) pour garantir l'équité
    const prevHostColor: 'green' | 'red' = oldHostMeta?.color === 'red' ? 'red' : 'green';
    const hostColor: 'green' | 'red' = prevHostColor === 'green' ? 'red' : 'green';
    const guestColor: 'green' | 'red' = hostColor === 'green' ? 'red' : 'green';

    const newHostMeta: ClientMeta = {
      ...(oldHostMeta || {}),
      roomId: newRoomId,
      role: 'host',
      color: hostColor,
      sessionToken,
    };
    const newGuestMeta: ClientMeta = {
      ...(oldGuestMeta || {}),
      roomId: newRoomId,
      role: 'guest',
      color: guestColor,
      sessionToken,
    };

    if (hostWs) {
      clients.set(hostWs, newHostMeta);
    }
    if (guestWs) {
      clients.set(guestWs, newGuestMeta);
    }

    const newRoom: RoomState = {
      id: newRoomId,
      sessionToken,
      rematchCount: nextRematchCount,
      hostWs,
      guestWs,
      hostMeta: newHostMeta,
      guestMeta: newGuestMeta,
      board: freshBoard,
      currentTurn: startingTurn,
      gameStarted: true,
      gameOver: false,
      winner: undefined,
      gameOverReason: undefined,
      movesWithoutCapture: 0,
      rematchRequestedBy: undefined,
      turnId: 0,
      consecutiveTimeouts: { green: 0, red: 0 },
      timerSec: 30,
      timerInterval: null,
      watchdogTimeout: null,
      disconnectTimeout: null,
      isBotMatch: false,
      posHistory: [],
    };
    rooms.set(newRoomId, newRoom);

    const payloadHost = {
      role: 'host',
      myColor: hostColor,
      opponentColor: guestColor,
      hostColor,
      guestColor,
      playerName: newHostMeta.playerName || 'Hôte',
      opponentName: newGuestMeta.playerName || 'Adversaire',
      opponentAvatar: newGuestMeta.avatar || '👑',
      opponentPhoto: newGuestMeta.customPhoto,
      opponentFlag: newGuestMeta.flag,
      opponentFriendCode: newGuestMeta.friendCode || newGuestMeta.playerId,
      opponentId: newGuestMeta.playerId,
      startingTurn,
      currentTurn: startingTurn,
      board: freshBoard,
      turn: startingTurn,
      roomId: newRoomId,
      sessionToken,
      movesWithoutCapture: 0,
      isRematch: true,
      isBotMatch: false,
    };

    const rematchStartHost = JSON.stringify({
      type: 'START_MATCH',
      event: 'START_MATCH',
      ...payloadHost,
      payload: payloadHost,
    });

    const payloadGuest = {
      role: 'guest',
      myColor: guestColor,
      opponentColor: hostColor,
      hostColor,
      guestColor,
      playerName: newGuestMeta.playerName || 'Invité',
      opponentName: newHostMeta.playerName || 'Adversaire',
      opponentAvatar: newHostMeta.avatar || '👑',
      opponentPhoto: newHostMeta.customPhoto,
      opponentFlag: newHostMeta.flag,
      opponentFriendCode: newHostMeta.friendCode || newHostMeta.playerId,
      opponentId: newHostMeta.playerId,
      startingTurn,
      currentTurn: startingTurn,
      board: freshBoard,
      turn: startingTurn,
      roomId: newRoomId,
      sessionToken,
      movesWithoutCapture: 0,
      isRematch: true,
      isBotMatch: false,
    };

    const rematchStartGuest = JSON.stringify({
      type: 'START_MATCH',
      event: 'START_MATCH',
      ...payloadGuest,
      payload: payloadGuest,
    });

    if (hostWs && hostWs.readyState === WebSocket.OPEN) {
      hostWs.send(rematchStartHost);
    }
    if (guestWs && guestWs.readyState === WebSocket.OPEN) {
      guestWs.send(rematchStartGuest);
    }

    // 3. Handshake explicite d'attribution du tour initial + démarrage synchronisé du minuteur
    startRoomTimer(newRoom);

    const turnHandshakePayload = JSON.stringify({
      type: 'TURN_ASSIGNED',
      event: 'TURN_ASSIGNED',
      roomId: newRoomId,
      sessionToken,
      currentTurn: startingTurn,
      startingTurn,
      turnId: newRoom.turnId,
      timerSec: 30,
    });
    if (hostWs && hostWs.readyState === WebSocket.OPEN) {
      hostWs.send(turnHandshakePayload);
    }
    if (guestWs && guestWs.readyState === WebSocket.OPEN) {
      guestWs.send(turnHandshakePayload);
    }
  }

  wss.on('connection', (ws) => {
    clients.set(ws, {});

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // 🏓 Heartbeat Ping-Pong instantané
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', t: msg.t || Date.now() }));
          return;
        }

        let meta = clients.get(ws) || {};

        // 🔄 Maintien de session & Reconnexion transparente après micro-coupure (4G/Wi-Fi)
        if (msg.type === 'RECONNECT_SESSION') {
          const roomId = msg.roomId || meta.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;
          if (room) {
            const role = msg.role || meta.role;
            const isHost = role === 'host' || (room.hostMeta && room.hostMeta.playerId === msg.playerId);
            const clientRole: 'host' | 'guest' = isHost ? 'host' : 'guest';

            if (clientRole === 'host') {
              room.hostWs = ws;
              if (room.hostMeta) {
                meta = { ...room.hostMeta, roomId };
              }
            } else {
              room.guestWs = ws;
              if (room.guestMeta) {
                meta = { ...room.guestMeta, roomId };
              }
            }
            clients.set(ws, meta);

            // Annuler immédiatement le délai de grâce / buffer de déconnexion
            if (room.disconnectTimeout) {
              clearTimeout(room.disconnectTimeout);
              room.disconnectTimeout = null;
            }
            if (room.disconnectInterval) {
              clearInterval(room.disconnectInterval);
              room.disconnectInterval = null;
            }
            room.isPausedForReconnect = false;

            // Informer l'autre joueur du rétablissement immédiat de son adversaire
            const otherWs = clientRole === 'host' ? room.guestWs : room.hostWs;
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'OPPONENT_RECONNECTED',
                message: "L'adversaire s'est reconnecté ! Reprise de la partie.",
              }));
            }

            // Reprendre le minuteur du tour s'il était suspendu
            if (room.gameStarted && !room.gameOver) {
              startRoomTimer(room);
            }

            // Renvoyer l'état officiel complet et certifié au joueur reconnecté
            ws.send(JSON.stringify({
              type: 'RECONNECT_SUCCESS',
              roomId: room.id,
              role: clientRole,
              myColor: meta.color,
              opponentColor: meta.color === 'green' ? 'red' : 'green',
              opponentName: clientRole === 'host' ? (room.isBotMatch ? room.botProfile?.name : room.guestMeta?.playerName) : room.hostMeta?.playerName,
              opponentAvatar: clientRole === 'host' ? (room.isBotMatch ? room.botProfile?.avatar : room.guestMeta?.avatar) : room.hostMeta?.avatar,
              opponentPhoto: clientRole === 'host' ? (room.isBotMatch ? undefined : room.guestMeta?.customPhoto) : room.hostMeta?.customPhoto,
              opponentFlag: clientRole === 'host' ? (room.isBotMatch ? room.botProfile?.flag : room.guestMeta?.flag) : room.hostMeta?.flag,
              opponentCountry: clientRole === 'host' ? (room.isBotMatch ? room.botProfile?.country : undefined) : undefined,
              opponentRating: clientRole === 'host' ? (room.isBotMatch ? room.botProfile?.rating : undefined) : undefined,
              opponentLevel: clientRole === 'host' ? (room.isBotMatch ? room.botProfile?.level : undefined) : undefined,
              isBotMatch: room.isBotMatch,
              board: room.board,
              currentTurn: room.currentTurn,
              turnId: room.turnId,
              timerSec: room.timerSec,
              gameStarted: room.gameStarted,
              gameOver: room.gameOver,
            }));

            // Si c'est au tour du bot virtuel, s'assurer que son coup s'exécute
            if (room.isBotMatch && room.currentTurn === room.botColor && !room.gameOver) {
              scheduleBotTurn(room);
            }
            return;
          } else {
            ws.send(JSON.stringify({
              type: 'RECONNECT_FAILED',
              message: 'La session demandée est expirée ou terminée.',
            }));
            return;
          }
        }

        // ─── 🤝 GESTION DU CHAT, DES AMIS ET DES DÉFIS DIRECTS EN TEMPS RÉEL ───
        if (msg.type === 'register_player') {
          const pId = String(msg.playerId || msg.friendCode || 'p_' + Date.now());
          const friendCode = String(msg.friendCode || msg.playerId || '').toUpperCase();
          const pName = String(msg.playerName || msg.name || 'Joueur');

          // Nettoyer les sockets fermées ou obsolètes pour ce même friendCode / playerId
          for (const [oldWs, existing] of registeredPlayers.entries()) {
            if (
              oldWs !== ws &&
              (oldWs.readyState !== WebSocket.OPEN ||
                (friendCode && existing.friendCode.toUpperCase() === friendCode))
            ) {
              registeredPlayers.delete(oldWs);
            }
          }

          registeredPlayers.set(ws, {
            ws,
            playerId: pId,
            friendCode,
            playerName: pName,
            avatar: msg.avatar || '👑',
            flag: msg.flag || '🇸🇳',
            level: msg.level || 1,
          });
          meta.playerId = pId;
          meta.friendCode = friendCode;
          meta.playerName = pName;
          meta.avatar = msg.avatar || meta.avatar;
          meta.flag = msg.flag || meta.flag;
          clients.set(ws, meta);
          ws.send(JSON.stringify({ type: 'player_registered', playerId: pId, friendCode }));

          // 🤝 Synchronisation immédiate des demandes d'amitié reçues en attente
          const keyByCode = friendCode ? friendCode.toUpperCase() : '';
          const keyById = pId ? pId.toUpperCase() : '';
          const keyByName = pName.toLowerCase();
          const rawStored = [
            ...(keyByCode && pendingFriendRequests.has(keyByCode) ? (pendingFriendRequests.get(keyByCode) || []) : []),
            ...(keyById && pendingFriendRequests.has(keyById) ? (pendingFriendRequests.get(keyById) || []) : []),
            ...(pendingFriendRequests.has(keyByName) ? (pendingFriendRequests.get(keyByName) || []) : []),
          ];
          const stored = rawStored.filter(r =>
            (!keyByCode || r.friendCode.toUpperCase() !== keyByCode) &&
            r.senderPlayerId !== pId
          );
          if (stored.length > 0) {
            const unique = Array.from(new Map(stored.map(r => [r.friendCode ? r.friendCode.toUpperCase() : r.id, r])).values());
            ws.send(JSON.stringify({
              type: 'PENDING_FRIEND_REQUESTS',
              requests: unique,
            }));
          }

          // 🤝 Synchronisation des demandes d'amitié acceptées pendant une absence
          const acceptedForMe = [
            ...(keyByCode && pendingAcceptedFriends.has(keyByCode) ? (pendingAcceptedFriends.get(keyByCode) || []) : []),
            ...(keyById && pendingAcceptedFriends.has(keyById) ? (pendingAcceptedFriends.get(keyById) || []) : []),
          ];
          if (acceptedForMe.length > 0) {
            if (keyByCode) pendingAcceptedFriends.delete(keyByCode);
            if (keyById) pendingAcceptedFriends.delete(keyById);
            const uniqueAccepted = Array.from(new Map(acceptedForMe.map(f => [f.friendCode || f.id || f.name, f])).values());
            ws.send(JSON.stringify({
              type: 'PENDING_ACCEPTED_FRIENDS',
              friends: uniqueAccepted,
            }));
          }

          // 💬 Synchronisation des messages d'amis reçus pendant une absence / rafraîchissement
          const queuedMessages = [
            ...(keyByCode && pendingFriendMessages.has(keyByCode) ? (pendingFriendMessages.get(keyByCode) || []) : []),
            ...(keyById && pendingFriendMessages.has(keyById) ? (pendingFriendMessages.get(keyById) || []) : []),
            ...(pendingFriendMessages.has(keyByName) ? (pendingFriendMessages.get(keyByName) || []) : []),
          ];
          if (queuedMessages.length > 0) {
            if (keyByCode) pendingFriendMessages.delete(keyByCode);
            if (keyById) pendingFriendMessages.delete(keyById);
            pendingFriendMessages.delete(keyByName);
            const uniqueMessages = Array.from(
              new Map(queuedMessages.map(m => [m.id || `${m.fromFriendCode}-${m.time}-${m.text}`, m])).values()
            );
            ws.send(JSON.stringify({
              type: 'PENDING_FRIEND_MESSAGES',
              messages: uniqueMessages,
            }));
          }
          return;
        }

        if (msg.type === 'enter_friend_chat') {
          const reg = registeredPlayers.get(ws);
          if (reg) {
            reg.currentChatWithFriendId = msg.friendId;
            reg.currentChatFriendCode = msg.friendCode;
          }
          return;
        }

        if (msg.type === 'leave_friend_chat') {
          const reg = registeredPlayers.get(ws);
          if (reg) {
            // Règle de présence stricte : Si l'émetteur du défi quitte le chat, l'invitation s'arrête instantanément.
            for (const [cId, chal] of activeFriendChallenges.entries()) {
              if (chal.fromPlayerId === reg.playerId && chal.status === 'pending') {
                activeFriendChallenges.delete(cId);
                for (const other of registeredPlayers.values()) {
                  if (other.playerId === chal.toFriendId || (chal.toFriendCode && other.friendCode === chal.toFriendCode)) {
                    if (other.ws.readyState === WebSocket.OPEN) {
                      other.ws.send(JSON.stringify({
                        type: 'FRIEND_CHALLENGE_CANCELLED',
                        challengeId: cId,
                        reason: 'sender_left_chat',
                        message: "Votre ami a quitté la discussion. Le défi n'est plus actif.",
                      }));
                    }
                  }
                }
              }
            }
            reg.currentChatWithFriendId = undefined;
            reg.currentChatFriendCode = undefined;
          }
          return;
        }

        if (msg.type === 'send_friend_challenge') {
          const reg = registeredPlayers.get(ws);
          const senderName = reg?.playerName || msg.sender?.name || 'Votre ami';
          const senderId = reg?.playerId || msg.sender?.id || 'sender';
          const senderCode = reg?.friendCode || msg.sender?.friendCode || '';
          const targetFriendId = msg.targetFriendId;
          const targetFriendCode = msg.targetFriendCode;

          const roomId = Math.floor(100000 + Math.random() * 900000).toString();
          const challengeId = 'chal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

          const chal: FriendChallenge = {
            id: challengeId,
            fromPlayerId: senderId,
            fromFriendCode: senderCode,
            fromName: senderName,
            fromAvatar: reg?.avatar || msg.sender?.avatar || '👑',
            fromFlag: reg?.flag || msg.sender?.flag || '🇸🇳',
            toFriendId: targetFriendId,
            toFriendCode: targetFriendCode,
            roomId,
            createdAt: Date.now(),
            status: 'pending',
          };
          activeFriendChallenges.set(challengeId, chal);

          // Confirmation à l'émetteur
          ws.send(JSON.stringify({
            type: 'CHALLENGE_SENT',
            challengeId,
            roomId,
            targetFriendId,
            message: `Défi transmis à ${msg.targetFriendName || 'votre ami'}. Restez dans cette discussion pour maintenir le défi actif.`,
          }));

          // Notification à l'ami ciblé (s'il est connecté)
          for (const other of registeredPlayers.values()) {
            if (other.playerId === targetFriendId || (targetFriendCode && other.friendCode === targetFriendCode)) {
              if (other.ws.readyState === WebSocket.OPEN) {
                other.ws.send(JSON.stringify({
                  type: 'INCOMING_FRIEND_CHALLENGE',
                  challengeId,
                  roomId,
                  sender: {
                    id: senderId,
                    name: senderName,
                    avatar: chal.fromAvatar,
                    flag: chal.fromFlag,
                    friendCode: senderCode,
                  },
                  targetFriendId,
                }));
              }
            }
          }
          return;
        }

        if (msg.type === 'cancel_friend_challenge') {
          const challengeId = msg.challengeId;
          const chal = challengeId ? activeFriendChallenges.get(challengeId) : undefined;
          if (chal) {
            activeFriendChallenges.delete(challengeId);
            for (const other of registeredPlayers.values()) {
              if (other.playerId === chal.toFriendId || (chal.toFriendCode && other.friendCode === chal.toFriendCode)) {
                if (other.ws.readyState === WebSocket.OPEN) {
                  other.ws.send(JSON.stringify({
                    type: 'FRIEND_CHALLENGE_CANCELLED',
                    challengeId,
                    reason: 'cancelled_by_sender',
                    message: "Le défi a été retiré par votre ami.",
                  }));
                }
              }
            }
          }
          return;
        }

        if (msg.type === 'decline_friend_challenge') {
          const challengeId = msg.challengeId;
          const chal = challengeId ? activeFriendChallenges.get(challengeId) : undefined;
          if (chal) {
            activeFriendChallenges.delete(challengeId);
            for (const other of registeredPlayers.values()) {
              if (other.playerId === chal.fromPlayerId) {
                if (other.ws.readyState === WebSocket.OPEN) {
                  other.ws.send(JSON.stringify({
                    type: 'FRIEND_CHALLENGE_DECLINED',
                    challengeId,
                    message: "Votre ami a gentiment décliné le défi pour le moment.",
                  }));
                }
              }
            }
          }
          return;
        }

        if (msg.type === 'accept_friend_challenge') {
          const challengeId = msg.challengeId;
          const chal = challengeId ? activeFriendChallenges.get(challengeId) : undefined;
          if (!chal || chal.status !== 'pending') {
            ws.send(JSON.stringify({
              type: 'CHALLENGE_EXPIRED',
              message: "Ce défi n'est plus actif ou a déjà été clôturé.",
            }));
            return;
          }

          // Règle de présence stricte : L'émetteur est-il toujours connecté ET toujours dans le chat ?
          let senderPlayer: RegisteredPlayer | null = null;
          for (const p of registeredPlayers.values()) {
            if (p.playerId === chal.fromPlayerId && p.ws.readyState === WebSocket.OPEN) {
              senderPlayer = p;
              break;
            }
          }

          if (!senderPlayer || senderPlayer.currentChatWithFriendId !== chal.toFriendId) {
            activeFriendChallenges.delete(challengeId);
            ws.send(JSON.stringify({
              type: 'CHALLENGE_EXPIRED',
              message: "Votre adversaire a quitté la discussion. Le défi est annulé.",
            }));
            return;
          }

          // Les deux joueurs sont bien présents !
          chal.status = 'accepted';
          activeFriendChallenges.delete(challengeId);

          const regMe = registeredPlayers.get(ws);
          const roomId = chal.roomId;
          const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

          const room: RoomState = {
            id: roomId,
            sessionToken,
            hostWs: senderPlayer.ws,
            guestWs: ws,
            hostMeta: {
              roomId,
              role: 'host',
              playerId: senderPlayer.playerId,
              friendCode: senderPlayer.friendCode || senderPlayer.playerId,
              playerName: senderPlayer.playerName,
              avatar: senderPlayer.avatar,
              flag: senderPlayer.flag,
              color: 'green',
              sessionToken,
            },
            guestMeta: {
              roomId,
              role: 'guest',
              playerId: regMe?.playerId || 'guest',
              friendCode: regMe?.friendCode || regMe?.playerId,
              playerName: regMe?.playerName || 'Adversaire',
              avatar: regMe?.avatar,
              flag: regMe?.flag,
              color: 'red',
              sessionToken,
            },
            board: getInitialBoardState(),
            currentTurn: 'green',
            gameStarted: true,
            gameOver: false,
            movesWithoutCapture: 0,
            timerSec: 30,
            timerInterval: null,
            watchdogTimeout: null,
            disconnectTimeout: null,
            turnId: 1,
            consecutiveTimeouts: { green: 0, red: 0 },
            posHistory: [],
          };
          rooms.set(roomId, room);

          clients.set(senderPlayer.ws, { ...room.hostMeta });
          clients.set(ws, { ...room.guestMeta });

          const duelStartPayloadHost = JSON.stringify({
            type: 'FRIEND_DUEL_START',
            roomId,
            role: 'host',
            myColor: 'green',
            opponent: {
              id: regMe?.friendCode || regMe?.playerId || 'guest',
              friendCode: regMe?.friendCode || regMe?.playerId,
              name: regMe?.playerName || 'Adversaire',
              avatar: regMe?.avatar,
              flag: regMe?.flag,
            },
            message: "Les deux joueurs sont prêts ! Lancement du duel de 12 Pions !",
          });

          const duelStartPayloadGuest = JSON.stringify({
            type: 'FRIEND_DUEL_START',
            roomId,
            role: 'guest',
            myColor: 'red',
            opponent: {
              id: senderPlayer.friendCode || senderPlayer.playerId,
              friendCode: senderPlayer.friendCode || senderPlayer.playerId,
              name: senderPlayer.playerName,
              avatar: senderPlayer.avatar,
              flag: senderPlayer.flag,
            },
            message: "Les deux joueurs sont prêts ! Lancement du duel de 12 Pions !",
          });

          senderPlayer.ws.send(duelStartPayloadHost);
          ws.send(duelStartPayloadGuest);

          startRoomTimer(room);
          return;
        }

        if (msg.type === 'send_friend_message') {
          const reg = registeredPlayers.get(ws);
          const targetFriendId = String(msg.toFriendId || '').trim();
          const targetFriendCode = String(msg.toFriendCode || '').trim().toUpperCase();
          const targetFriendName = String(msg.toFriendName || '').trim();

          const outgoingPayload = {
            type: 'INCOMING_FRIEND_MESSAGE',
            fromFriendId: reg?.friendCode || reg?.playerId || msg.fromFriendId,
            fromFriendCode: (reg?.friendCode || msg.fromFriendCode || '').toUpperCase(),
            fromName: reg?.playerName || msg.fromName || 'Ami',
            fromAvatar: reg?.avatar || msg.fromAvatar || '👑',
            text: msg.text,
            time: msg.time,
            id: msg.id || `msg_${Date.now()}`,
            fromLang: msg.fromLang,
          };

          const targets = findOnlineTargetSockets(targetFriendCode, targetFriendId, targetFriendName, ws);
          let delivered = false;
          for (const other of targets) {
            if (other.ws.readyState === WebSocket.OPEN) {
              other.ws.send(JSON.stringify(outgoingPayload));
              delivered = true;
            }
          }

          // Si le destinataire n'est pas connecté à cet instant, mettre le message en file d'attente
          if (!delivered) {
            const queueKey = targetFriendCode || targetFriendId.toUpperCase() || targetFriendName.toLowerCase();
            if (queueKey) {
              const existingQueue = pendingFriendMessages.get(queueKey) || [];
              existingQueue.push(outgoingPayload);
              pendingFriendMessages.set(queueKey, existingQueue.slice(-50));
            }
          }
          return;
        }

        if (msg.type === 'send_friend_request') {
          const reg = registeredPlayers.get(ws);
          const targetName = String(msg.targetName || '').trim();
          const targetCode = String(msg.targetCode || '').trim().toUpperCase();
          const targetId = String(msg.targetId || '').trim();
          const isTargetBot = msg.isBot === true || (targetId && (targetId.startsWith('bot_') || targetId.startsWith('ai_')));

          if (isTargetBot) {
            // Les profils virtuels ne doivent JAMAIS accepter les demandes d'amitié
            ws.send(JSON.stringify({
              type: 'FRIEND_REQUEST_RESULT',
              status: 'sent_to_bot',
              accepted: false,
              targetName,
              message: `Demande d'amitié transmise à ${targetName}. Ce joueur n'a pas répondu pour le moment.`,
            }));
            return;
          }

          const senderCode = (reg?.friendCode || msg.senderCode || meta.friendCode || meta.playerId || '').toUpperCase();
          const senderId = reg?.playerId || msg.senderId || senderCode || `p_${Date.now()}`;
          const senderName = reg?.playerName || msg.senderName || meta.playerName || 'Joueur';

          const newReq: StoredFriendRequest = {
            id: `req_${senderCode || senderId}_${Date.now()}`,
            name: senderName,
            avatar: reg?.avatar || msg.senderAvatar || meta.avatar || '👑',
            flag: reg?.flag || msg.senderFlag || meta.flag || '🇸🇳',
            level: reg?.level || msg.senderLevel || 1,
            time: "À l'instant",
            friendCode: senderCode,
            senderPlayerId: senderId,
          };

          // Trouver les sockets en ligne du destinataire (priorité stricte au friendCode / playerId, en excluant l'émetteur)
          const targets = findOnlineTargetSockets(targetCode, targetId, targetName, ws);
          const resolvedCode = targetCode || (targets[0]?.friendCode || '').toUpperCase();
          const resolvedId = targetId || (targets[0]?.playerId || '').toUpperCase();

          const pushPendingUnique = (mapKey: string) => {
            if (!mapKey) return;
            const list = pendingFriendRequests.get(mapKey) || [];
            const filtered = list.filter(r =>
              (!senderCode || r.friendCode.toUpperCase() !== senderCode) &&
              r.senderPlayerId !== senderId
            );
            filtered.unshift(newReq);
            pendingFriendRequests.set(mapKey, filtered);
          };

          if (resolvedCode) {
            pushPendingUnique(resolvedCode);
          }
          if (resolvedId && resolvedId !== resolvedCode) {
            pushPendingUnique(resolvedId);
          }
          if (!resolvedCode && targetName) {
            pushPendingUnique(targetName.toLowerCase());
          }

          let delivered = false;
          for (const target of targets) {
            if (target.ws.readyState === WebSocket.OPEN) {
              target.ws.send(JSON.stringify({
                type: 'INCOMING_FRIEND_REQUEST',
                request: newReq,
              }));
              delivered = true;
            }
          }

          ws.send(JSON.stringify({
            type: 'FRIEND_REQUEST_RESULT',
            status: 'sent',
            accepted: false,
            delivered,
            targetName,
            targetCode: resolvedCode,
            message: `Demande d'amitié envoyée avec succès à ${targetName} !`,
          }));
          return;
        }

        if (msg.type === 'accept_friend_request') {
          const reg = registeredPlayers.get(ws);
          const reqId = String(msg.requestId || '');
          const senderCode = String(msg.senderCode || '').trim().toUpperCase();
          const senderId = String(msg.senderId || '').trim();
          const senderName = String(msg.senderName || '').trim().toLowerCase();

          const myCode = String(reg?.friendCode || msg.acceptorCode || meta.friendCode || '').trim().toUpperCase();
          const myId = String(reg?.playerId || msg.acceptorId || meta.playerId || myCode).trim();
          const myName = String(reg?.playerName || msg.acceptorName || meta.playerName || 'Ami').trim();
          const myAvatar = reg?.avatar || msg.acceptorAvatar || meta.avatar || '👑';
          const myFlag = reg?.flag || msg.acceptorFlag || meta.flag || '🇸🇳';
          const myLevel = reg?.level || msg.acceptorLevel || 1;

          // Retirer la demande de toutes les listes en attente du destinataire
          const removeFromKey = (k: string) => {
            if (!k || !pendingFriendRequests.has(k)) return;
            pendingFriendRequests.set(
              k,
              pendingFriendRequests.get(k)!.filter(r =>
                r.id !== reqId &&
                (!senderCode || r.friendCode.toUpperCase() !== senderCode) &&
                (!senderId || r.senderPlayerId !== senderId)
              )
            );
          };
          removeFromKey(myCode);
          removeFromKey(myId.toUpperCase());
          removeFromKey(myName.toLowerCase());

          // Payload ami confirmé pour l'émetteur initial
          const acceptedFriendPayload = {
            id: myCode || myId || `friend_${Date.now()}`,
            name: myName,
            avatar: myAvatar,
            flag: myFlag,
            level: myLevel,
            friendCode: myCode || myId,
            status: 'online',
          };

          const senderTargets = findOnlineTargetSockets(senderCode, senderId, senderName, ws);
          let notifiedSender = false;
          for (const sender of senderTargets) {
            if (sender.ws.readyState === WebSocket.OPEN) {
              sender.ws.send(JSON.stringify({
                type: 'FRIEND_REQUEST_ACCEPTED',
                requestId: reqId,
                friend: acceptedFriendPayload,
                message: `${myName} a accepté votre demande d'amitié !`,
              }));
              notifiedSender = true;
            }
          }

          // Si l'émetteur n'est pas joignable à l'instant T, mettre en file d'attente pour sa reconnexion
          if (!notifiedSender) {
            if (senderCode) {
              const q = pendingAcceptedFriends.get(senderCode) || [];
              q.push(acceptedFriendPayload);
              pendingAcceptedFriends.set(senderCode, q);
            }
            if (senderId && senderId.toUpperCase() !== senderCode) {
              const q = pendingAcceptedFriends.get(senderId.toUpperCase()) || [];
              q.push(acceptedFriendPayload);
              pendingAcceptedFriends.set(senderId.toUpperCase(), q);
            }
          }

          // Confirmer également au destinataire qui vient d'accepter
          ws.send(JSON.stringify({
            type: 'FRIEND_REQUEST_ACCEPT_ACK',
            requestId: reqId,
            friend: {
              id: senderCode || senderId || `friend_${Date.now()}`,
              name: msg.senderName || 'Ami',
              avatar: msg.senderAvatar || '👑',
              flag: msg.senderFlag || '🇸🇳',
              level: msg.senderLevel || 1,
              friendCode: senderCode || senderId,
              status: senderTargets.length > 0 ? 'online' : 'offline',
            },
          }));
          return;
        }

        if (msg.type === 'cancel_friend_request') {
          const reg = registeredPlayers.get(ws);
          const myCode = (reg?.friendCode || msg.senderCode || '').toUpperCase();
          const myName = (reg?.playerName || '').toLowerCase();
          const targetName = String(msg.targetName || '').trim().toLowerCase();
          const targetCode = String(msg.targetCode || '').trim().toUpperCase();
          const targetId = String(msg.targetId || '').trim();

          const cleanKey = (k: string) => {
            if (!k || !pendingFriendRequests.has(k)) return;
            pendingFriendRequests.set(
              k,
              pendingFriendRequests.get(k)!.filter(r =>
                (!myCode || r.friendCode.toUpperCase() !== myCode) &&
                (!myName || r.name.toLowerCase() !== myName)
              )
            );
          };
          cleanKey(targetCode);
          cleanKey(targetId.toUpperCase());
          cleanKey(targetName);

          const targets = findOnlineTargetSockets(targetCode, targetId, targetName, ws);
          for (const target of targets) {
            if (target.ws.readyState === WebSocket.OPEN) {
              target.ws.send(JSON.stringify({
                type: 'FRIEND_REQUEST_CANCELLED',
                senderName: reg?.playerName,
                senderCode: myCode,
              }));
            }
          }
          return;
        }

        if (msg.type === 'check_turn_timeout') {
          const roomId = meta.roomId || msg.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;
          if (room && !room.gameOver) {
            if (room.isBotMatch && room.currentTurn === room.botColor) {
              executeBotMoveNow(room);
            } else if (!room.isBotMatch && room.timerSec <= 0) {
              handleAuthoritativeTimeout(room);
            }
          }
          return;
        }

        if (msg.type === 'turn_timeout') {
          const roomId = meta.roomId || msg.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;
          if (room && !room.gameOver && room.timerSec <= 0) {
            handleAuthoritativeTimeout(room);
          }
          return;
        }

        const incomingRoomId = meta.roomId || msg.roomId;
        if (incomingRoomId) {
          const room = rooms.get(incomingRoomId);
          if (room) {
            const wasPaused = room.isPausedForReconnect;
            if (room.disconnectTimeout) {
              clearTimeout(room.disconnectTimeout);
              room.disconnectTimeout = null;
            }
            if (room.disconnectInterval) {
              clearInterval(room.disconnectInterval);
              room.disconnectInterval = null;
            }
            room.isPausedForReconnect = false;
            if (meta.role === 'host' || ws === room.hostWs) {
              room.hostWs = ws;
            } else if (meta.role === 'guest' || ws === room.guestWs) {
              room.guestWs = ws;
            }
            if (wasPaused) {
              const otherWs = ws === room.hostWs ? room.guestWs : room.hostWs;
              if (otherWs && otherWs.readyState === WebSocket.OPEN) {
                otherWs.send(JSON.stringify({
                  type: 'OPPONENT_RECONNECTED',
                  event: 'OPPONENT_RECONNECTED',
                  message: "L'adversaire s'est reconnecté ! Reprise de la partie.",
                }));
              }
              if (room.gameStarted && !room.gameOver) {
                startRoomTimer(room);
              }
            }
          }
        }

        if (msg.type === 'search_match' || msg.type === 'find_match') {
          const regPlayer = registeredPlayers.get(ws);
          const friendCode = String(msg.friendCode || regPlayer?.friendCode || msg.playerId || '').toUpperCase();
          const playerId = String(msg.playerId || friendCode || `p_${Date.now()}`);
          const playerName = msg.playerName || regPlayer?.playerName || 'Joueur';
          const region = msg.region || 'closest';
          const preferredColor: 'green' | 'red' | 'random' = msg.preferredColor || 'random';

          // Clean up any stale waiting player
          if (waitingPlayer && (waitingPlayer.ws.readyState !== WebSocket.OPEN || waitingPlayer.ws === ws)) {
            if (waitingPlayer.botTimer) {
              clearTimeout(waitingPlayer.botTimer);
              waitingPlayer.botTimer = null;
            }
            waitingPlayer = null;
          }

          if (!waitingPlayer) {
            // Premier appareil en recherche
            const playerEntry = {
              ws,
              playerId,
              friendCode,
              playerName,
              avatar: msg.avatar || '👑',
              customPhoto: msg.customPhoto,
              flag: msg.flag,
              region,
              preferredColor,
              botTimer: null as NodeJS.Timeout | null,
            };
            waitingPlayer = playerEntry;

            ws.send(JSON.stringify({
              type: 'MATCHMAKING_WAITING',
              message: 'Recherche d’un adversaire en cours...',
            }));

            // Délai réaliste de recherche radar (2.4s à 3.4s) avant association avec l'un des 1 000 profils virtuels
            playerEntry.botTimer = setTimeout(() => {
              if (waitingPlayer && waitingPlayer.ws === ws && ws.readyState === WebSocket.OPEN) {
                const p1 = waitingPlayer;
                waitingPlayer = null;
                startBotMatch(p1);
              }
            }, 2400 + Math.floor(Math.random() * 1000));
          } else {
            // Second appareil connecté : Annule immédiatement le botTimer et associe les 2 joueurs réels
            if (waitingPlayer.botTimer) {
              clearTimeout(waitingPlayer.botTimer);
              waitingPlayer.botTimer = null;
            }
            const p1 = waitingPlayer;
            const p2 = {
              ws,
              playerId,
              friendCode,
              playerName,
              avatar: msg.avatar || '👑',
              customPhoto: msg.customPhoto,
              flag: msg.flag,
              region,
              preferredColor,
            };
            waitingPlayer = null;

            const roomId = `online_match_${Date.now()}`;
            // 🎯 RÈGLE STRICTEMENT ALÉATOIRE : La couleur qui démarre est tirée au sort (50% Verts / 50% Rouges)
            const startingTurn: 'green' | 'red' = Math.random() < 0.5 ? 'green' : 'red';

            // 🎯 ATTRIBUTION STRICTEMENT ALÉATOIRE DES COULEURS EN LIGNE (50% Verts / 50% Rouges)
            const p1Color: 'green' | 'red' = Math.random() < 0.5 ? 'green' : 'red';
            const p2Color: 'green' | 'red' = p1Color === 'green' ? 'red' : 'green';

            const hostMeta: ClientMeta = {
              roomId,
              role: 'host',
              playerId: p1.playerId,
              friendCode: p1.friendCode || p1.playerId,
              playerName: p1.playerName,
              avatar: p1.avatar,
              customPhoto: p1.customPhoto,
              flag: p1.flag,
              color: p1Color,
            };
            const guestMeta: ClientMeta = {
              roomId,
              role: 'guest',
              playerId: p2.playerId,
              friendCode: p2.friendCode || p2.playerId,
              playerName: p2.playerName,
              avatar: p2.avatar,
              customPhoto: p2.customPhoto,
              flag: p2.flag,
              color: p2Color,
            };

            const initialBoard = getInitialBoardState();

            const room: RoomState = {
              id: roomId,
              hostWs: p1.ws,
              guestWs: p2.ws,
              hostMeta,
              guestMeta,
              board: initialBoard,
              currentTurn: startingTurn,
              gameStarted: true,
              gameOver: false,
              movesWithoutCapture: 0,
              rematchRequestedBy: undefined,
              timerSec: 30,
              timerInterval: null,
              watchdogTimeout: null,
              disconnectTimeout: null,
              turnId: 0,
              consecutiveTimeouts: { green: 0, red: 0 },
              isBotMatch: false,
            };

            rooms.set(roomId, room);
            clients.set(p1.ws, hostMeta);
            clients.set(p2.ws, guestMeta);

            // Joueur 1 (Hôte)
            p1.ws.send(JSON.stringify({
              type: 'MATCH_FOUND',
              roomId,
              role: 'host',
              myColor: p1Color,
              opponentColor: p2Color,
              startingTurn,
              currentTurn: startingTurn,
              opponentName: p2.playerName,
              opponentAvatar: p2.avatar,
              opponentPhoto: p2.customPhoto,
              opponentFlag: p2.flag,
              opponentFriendCode: guestMeta.friendCode,
              opponentId: guestMeta.playerId,
              isBotMatch: false,
              message: `Adversaire trouvé ! Vous jouez les Pions ${p1Color === 'green' ? 'Verts' : 'Rouges'}.`,
            }));

            // Joueur 2 (Invité)
            p2.ws.send(JSON.stringify({
              type: 'MATCH_FOUND',
              roomId,
              role: 'guest',
              myColor: p2Color,
              opponentColor: p1Color,
              startingTurn,
              currentTurn: startingTurn,
              opponentName: p1.playerName,
              opponentAvatar: p1.avatar,
              opponentPhoto: p1.customPhoto,
              opponentFlag: p1.flag,
              opponentFriendCode: hostMeta.friendCode,
              opponentId: hostMeta.playerId,
              isBotMatch: false,
              message: `Adversaire trouvé ! Vous jouez les Pions ${p2Color === 'green' ? 'Verts' : 'Rouges'}.`,
            }));

            // Payload complet et ciblé pour le Joueur 1 (Hôte)
            const hostStartPayload = JSON.stringify({
              type: 'START_MATCH',
              event: 'START_MATCH',
              board: initialBoard,
              startingTurn,
              currentTurn: startingTurn,
              turn: startingTurn,
              role: 'host',
              myColor: p1Color,
              opponentColor: p2Color,
              hostColor: p1Color,
              guestColor: p2Color,
              playerName: p1.playerName,
              opponentName: p2.playerName,
              opponentAvatar: p2.avatar,
              opponentPhoto: p2.customPhoto,
              opponentFlag: p2.flag,
              opponentFriendCode: guestMeta.friendCode,
              opponentId: guestMeta.playerId,
              roomId,
              movesWithoutCapture: 0,
              isBotMatch: false,
              payload: {
                role: 'host',
                myColor: p1Color,
                opponentColor: p2Color,
                hostColor: p1Color,
                guestColor: p2Color,
                playerName: p1.playerName,
                opponentName: p2.playerName,
                opponentAvatar: p2.avatar,
                opponentPhoto: p2.customPhoto,
                opponentFlag: p2.flag,
                opponentFriendCode: guestMeta.friendCode,
                opponentId: guestMeta.playerId,
                startingTurn,
                currentTurn: startingTurn,
                board: initialBoard,
                turn: startingTurn,
                roomId,
                movesWithoutCapture: 0,
                isBotMatch: false,
              },
            });

            // Payload complet et ciblé pour le Joueur 2 (Invité)
            const guestStartPayload = JSON.stringify({
              type: 'START_MATCH',
              event: 'START_MATCH',
              board: initialBoard,
              startingTurn,
              currentTurn: startingTurn,
              turn: startingTurn,
              role: 'guest',
              myColor: p2Color,
              opponentColor: p1Color,
              hostColor: p1Color,
              guestColor: p2Color,
              playerName: p2.playerName,
              opponentName: p1.playerName,
              opponentAvatar: p1.avatar,
              opponentPhoto: p1.customPhoto,
              opponentFlag: p1.flag,
              opponentFriendCode: hostMeta.friendCode,
              opponentId: hostMeta.playerId,
              roomId,
              movesWithoutCapture: 0,
              isBotMatch: false,
              payload: {
                role: 'guest',
                myColor: p2Color,
                opponentColor: p1Color,
                hostColor: p1Color,
                guestColor: p2Color,
                playerName: p2.playerName,
                opponentName: p1.playerName,
                opponentAvatar: p1.avatar,
                opponentPhoto: p1.customPhoto,
                opponentFlag: p1.flag,
                opponentFriendCode: hostMeta.friendCode,
                opponentId: hostMeta.playerId,
                startingTurn,
                currentTurn: startingTurn,
                board: initialBoard,
                turn: startingTurn,
                roomId,
                movesWithoutCapture: 0,
                isBotMatch: false,
              },
            });

            if (p1.ws.readyState === WebSocket.OPEN) {
              p1.ws.send(hostStartPayload);
            }
            if (p2.ws.readyState === WebSocket.OPEN) {
              p2.ws.send(guestStartPayload);
            }

            startRoomTimer(room);
          }
        } else if (msg.type === 'cancel_match' || msg.type === 'cancel_search') {
          if (waitingPlayer && waitingPlayer.ws === ws) {
            if (waitingPlayer.botTimer) {
              clearTimeout(waitingPlayer.botTimer);
              waitingPlayer.botTimer = null;
            }
            waitingPlayer = null;
          }
          ws.send(JSON.stringify({
            type: 'MATCHMAKING_CANCELLED',
            message: 'Recherche annulée.',
          }));
        } else if (msg.type === 'create_room') {
          const regPlayer = registeredPlayers.get(ws);
          const roomId = String(msg.roomId || Math.floor(100000 + Math.random() * 900000)).toUpperCase().trim();
          const friendCode = String(msg.friendCode || regPlayer?.friendCode || msg.playerId || '').toUpperCase();
          const playerId = String(msg.playerId || friendCode || `p_${Date.now()}`);
          const playerName = msg.playerName || regPlayer?.playerName || 'Hôte';

          // 🎯 CHOIX DE COULEUR AU PRÉALABLE PAR L'HÔTE
          const pref = msg.preferredColor || msg.hostColor || msg.color || 'green';
          let chosenColor: 'green' | 'red' = 'green';
          if (pref === 'red') {
            chosenColor = 'red';
          } else if (pref === 'random') {
            chosenColor = Math.random() < 0.5 ? 'green' : 'red';
          } else {
            chosenColor = 'green';
          }

          meta.roomId = roomId;
          meta.role = 'host';
          meta.playerId = playerId;
          meta.friendCode = friendCode;
          meta.playerName = playerName;
          meta.avatar = msg.avatar || '👑';
          meta.customPhoto = msg.customPhoto;
          meta.flag = msg.flag;
          meta.color = chosenColor;
          clients.set(ws, meta);

          let room = rooms.get(roomId);
          if (!room) {
            room = {
              id: roomId,
              hostWs: ws,
              guestWs: null,
              hostMeta: meta,
              guestMeta: null,
              board: getInitialBoardState(),
              currentTurn: 'green',
              gameStarted: false,
              gameOver: false,
              movesWithoutCapture: 0,
              rematchRequestedBy: undefined,
              timerSec: 30,
              timerInterval: null,
              watchdogTimeout: null,
              disconnectTimeout: null,
              turnId: 0,
              consecutiveTimeouts: { green: 0, red: 0 },
            };
            rooms.set(roomId, room);
          } else {
            room.hostWs = ws;
            room.hostMeta = meta;
          }

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            event: 'ROOM_CREATED',
            roomId,
            code: roomId,
            role: 'host',
            myColor: chosenColor,
            message: `Salle #${roomId} créée avec succès ! Pions ${chosenColor === 'green' ? 'Verts' : 'Rouges'}.`,
          }));
        } else if (msg.type === 'join_room') {
          const regPlayer = registeredPlayers.get(ws);
          const roomId = String(msg.roomId).toUpperCase().trim();
          const role: 'host' | 'guest' = msg.role === 'host' ? 'host' : 'guest';
          const friendCode = String(msg.friendCode || regPlayer?.friendCode || msg.playerId || '').toUpperCase();
          const playerId = String(msg.playerId || friendCode || `p_${Date.now()}`);
          const playerName = msg.playerName || regPlayer?.playerName || (role === 'host' ? 'Hôte' : 'Invité');

          meta.roomId = roomId;
          meta.role = role;
          meta.playerId = playerId;
          meta.friendCode = friendCode;
          meta.playerName = playerName;
          meta.avatar = msg.avatar || '👑';
          meta.customPhoto = msg.customPhoto;
          meta.flag = msg.flag;
          clients.set(ws, meta);

          if (role === 'guest') {
            // Contrôle strict du code de salon (Mode VS Amis) :
            // Si l'invité saisit un code incorrect, affiche l'alerte et ne lance pas le jeu.
            const room = rooms.get(roomId);
            if (!room || !room.hostWs || room.hostWs.readyState !== WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'JOIN_ERROR',
                errorCode: 'INVALID_ROOM_CODE',
                message: 'Code incorrect. Veuillez recontrôler le code.',
              }));
              return;
            }

            if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN && room.guestWs !== ws) {
              ws.send(JSON.stringify({
                type: 'JOIN_ERROR',
                errorCode: 'ROOM_FULL',
                message: 'Ce salon est déjà complet (2 joueurs maximum).',
              }));
              return;
            }

            room.guestWs = ws;
            const hostColor = room.hostMeta?.color || 'green';
            const guestColor: 'green' | 'red' = hostColor === 'green' ? 'red' : 'green';
            meta.color = guestColor;
            room.guestMeta = meta;

            // 🎯 RÈGLE ALÉATOIRE DANS TOUS LES MODES : Premier tour tiré au sort (50% Verts / 50% Rouges)
            const startingTurn: 'green' | 'red' = Math.random() < 0.5 ? 'green' : 'red';
            const initialBoard = getInitialBoardState();
            room.board = initialBoard;
            room.gameStarted = true;
            room.gameOver = false;
            room.winner = undefined;
            room.movesWithoutCapture = 0;
            room.rematchRequestedBy = undefined;
            room.currentTurn = startingTurn;

            // Confirmation exacte de la validation du code
            ws.send(JSON.stringify({
              type: 'JOIN_SUCCESS',
              roomId,
              message: 'Code validé avec succès ! Salon rejoint.',
            }));

            ws.send(JSON.stringify({
              type: 'ASSIGN_ROLE',
              role: 'guest',
              myColor: guestColor,
              opponentColor: hostColor,
              opponentName: room.hostMeta?.playerName || 'Hôte',
              opponentAvatar: room.hostMeta?.avatar || '👑',
              opponentPhoto: room.hostMeta?.customPhoto,
              opponentFlag: room.hostMeta?.flag,
              opponentFriendCode: room.hostMeta?.friendCode || room.hostMeta?.playerId,
              opponentId: room.hostMeta?.playerId,
              startingTurn,
              roomId,
              message: `Vous êtes l’Invité (${guestColor === 'green' ? 'Verts' : 'Rouges'}).`,
            }));

            ws.send(JSON.stringify({
              type: 'room_joined',
              roomId,
              role: 'guest',
              clientsCount: 2,
            }));

            // Notify host that guest connected
            room.hostWs.send(JSON.stringify({
              type: 'player_joined',
              role: 'guest',
              color: guestColor,
              opponentName: meta.playerName || 'Invité',
              opponentAvatar: meta.avatar || '👑',
              opponentPhoto: meta.customPhoto,
              opponentFlag: meta.flag,
              opponentFriendCode: meta.friendCode || meta.playerId,
              opponentId: meta.playerId,
              message: 'Votre ami a rejoint la salle !',
            }));

            // DÉMARRAGE IMMÉDIAT ET AUTOMATIQUE (Mode VS Amis) :
            // Payload ciblé pour l'Hôte
            const hostStartPayload = JSON.stringify({
              type: 'START_MATCH',
              event: 'START_MATCH',
              board: initialBoard,
              turn: startingTurn.toUpperCase(),
              startingTurn,
              currentTurn: startingTurn,
              role: 'host',
              myColor: hostColor,
              opponentColor: guestColor,
              hostColor,
              guestColor,
              playerName: room.hostMeta?.playerName || 'Hôte',
              opponentName: meta.playerName || 'Ami',
              opponentAvatar: meta.avatar || '👑',
              opponentPhoto: meta.customPhoto,
              opponentFlag: meta.flag,
              opponentFriendCode: meta.friendCode || meta.playerId,
              opponentId: meta.playerId,
              roomId,
              movesWithoutCapture: 0,
              isBotMatch: false,
              payload: {
                role: 'host',
                myColor: hostColor,
                opponentColor: guestColor,
                hostColor,
                guestColor,
                playerName: room.hostMeta?.playerName || 'Hôte',
                opponentName: meta.playerName || 'Ami',
                opponentAvatar: meta.avatar || '👑',
                opponentPhoto: meta.customPhoto,
                opponentFlag: meta.flag,
                opponentFriendCode: meta.friendCode || meta.playerId,
                opponentId: meta.playerId,
                startingTurn,
                currentTurn: startingTurn,
                board: initialBoard,
                turn: startingTurn.toUpperCase(),
                roomId,
                movesWithoutCapture: 0,
                isBotMatch: false,
              },
            });

            // Payload ciblé pour l'Invité
            const guestStartPayload = JSON.stringify({
              type: 'START_MATCH',
              event: 'START_MATCH',
              board: initialBoard,
              turn: startingTurn.toUpperCase(),
              startingTurn,
              currentTurn: startingTurn,
              role: 'guest',
              myColor: guestColor,
              opponentColor: hostColor,
              hostColor,
              guestColor,
              playerName: meta.playerName || 'Invité',
              opponentName: room.hostMeta?.playerName || 'Hôte',
              opponentAvatar: room.hostMeta?.avatar || '👑',
              opponentPhoto: room.hostMeta?.customPhoto,
              opponentFlag: room.hostMeta?.flag,
              opponentFriendCode: room.hostMeta?.friendCode || room.hostMeta?.playerId,
              opponentId: room.hostMeta?.playerId,
              roomId,
              movesWithoutCapture: 0,
              isBotMatch: false,
              payload: {
                role: 'guest',
                myColor: guestColor,
                opponentColor: hostColor,
                hostColor,
                guestColor,
                playerName: meta.playerName || 'Invité',
                opponentName: room.hostMeta?.playerName || 'Hôte',
                opponentAvatar: room.hostMeta?.avatar || '👑',
                opponentPhoto: room.hostMeta?.customPhoto,
                opponentFlag: room.hostMeta?.flag,
                opponentFriendCode: room.hostMeta?.friendCode || room.hostMeta?.playerId,
                opponentId: room.hostMeta?.playerId,
                startingTurn,
                currentTurn: startingTurn,
                board: initialBoard,
                turn: startingTurn.toUpperCase(),
                roomId,
                movesWithoutCapture: 0,
                isBotMatch: false,
              },
            });

            if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
              room.hostWs.send(hostStartPayload);
            }
            if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
              room.guestWs.send(guestStartPayload);
            }

            startRoomTimer(room);
          } else {
            // Role === 'host' : Hôte = GREEN par défaut
            let room = rooms.get(roomId);
            if (!room) {
              room = {
                id: roomId,
                hostWs: ws,
                guestWs: null,
                hostMeta: meta,
                guestMeta: null,
                board: getInitialBoardState(),
                currentTurn: 'green',
                gameStarted: false,
                gameOver: false,
                movesWithoutCapture: 0,
                rematchRequestedBy: undefined,
                timerSec: 30,
                timerInterval: null,
                watchdogTimeout: null,
                disconnectTimeout: null,
                turnId: 0,
                consecutiveTimeouts: { green: 0, red: 0 },
              };
              rooms.set(roomId, room);
            } else {
              room.hostWs = ws;
              meta.color = room.hostMeta?.color || 'green';
              room.hostMeta = { ...room.hostMeta, ...meta, color: meta.color };
              clients.set(ws, meta);
            }

            const chosenColor: 'green' | 'red' = meta.color || 'green';
            meta.color = chosenColor;
            room.hostMeta = meta;
            const oppColor: 'green' | 'red' = chosenColor === 'green' ? 'red' : 'green';

            ws.send(JSON.stringify({
              type: 'ASSIGN_ROLE',
              role: 'host',
              myColor: chosenColor,
              opponentColor: oppColor,
              startingTurn: 'green',
              roomId,
              message: 'Vous êtes l’Hôte (Pions Verts).',
            }));

            ws.send(JSON.stringify({
              type: 'room_joined',
              roomId,
              role: 'host',
              clientsCount: room.guestWs ? 2 : 1,
            }));
          }

          // If both host and guest are in the room, host can start or start can be triggered
          const currentRoom = rooms.get(roomId);
          if (currentRoom?.hostWs && currentRoom?.guestWs && msg.autoStart) {
            currentRoom.gameStarted = true;
            const randomStartingTurn: 'green' | 'red' = Math.random() < 0.5 ? 'green' : 'red';
            currentRoom.currentTurn = randomStartingTurn;

            const hostColor = currentRoom.hostMeta?.color || 'green';
            const guestColor: 'green' | 'red' = hostColor === 'green' ? 'red' : 'green';

            const gameStartPayload = {
              type: 'start_game',
              payload: {
                hostColor,
                guestColor,
                startingTurn: randomStartingTurn,
                currentTurn: randomStartingTurn,
                roomId,
              },
            };

            const startPayloadStr = JSON.stringify(gameStartPayload);
            if (currentRoom.hostWs.readyState === WebSocket.OPEN) {
              currentRoom.hostWs.send(startPayloadStr);
            }
            if (currentRoom.guestWs.readyState === WebSocket.OPEN) {
              currentRoom.guestWs.send(startPayloadStr);
            }

            startRoomTimer(currentRoom);
          }
        } else if (msg.type === 'chain_step') {
          // Étape intermédiaire d'une multi-capture : le tour reste au même joueur !
          const roomId = meta.roomId || msg.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;
          if (room) {
            startRoomTimer(room); // Réinitialise complètement le timer pour la multi-capture
            const otherWs = ws === room.hostWs ? room.guestWs : room.hostWs;
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'chain_step',
                event: 'chain_step',
                payload: msg.payload || msg,
                currentTurn: room.currentTurn,
                turn: room.currentTurn,
                nextTurn: room.currentTurn,
                timerSec: 30,
              }));
            }
          }
        } else if (msg.type === 'PLAYER_STUCK' || msg.type === 'NO_VALID_MOVES') {
          // 🛑 FIN DE PARTIE SYNCHRONE : Un joueur n'a plus aucun coup légal valide (pions bloqués)
          const roomId = meta.roomId || msg.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;
          if (room && !room.gameOver) {
            const stuckColor: 'green' | 'red' = (msg.stuckColor || msg.payload?.stuckColor || (msg.loser === 'green' ? 'green' : 'red')) as 'green' | 'red';
            const winner: 'green' | 'red' = (msg.winner || msg.payload?.winner || (stuckColor === 'green' ? 'red' : 'green')) as 'green' | 'red';
            room.gameOver = true;
            room.winner = winner;
            room.gameOverReason = 'blocked';
            stopRoomTimer(room);

            const stuckBroadcast = JSON.stringify({
              type: 'PLAYER_STUCK',
              event: 'PLAYER_STUCK',
              roomId: room.id,
              stuckColor,
              loser: stuckColor,
              winner,
              gameOver: true,
              gameOverReason: 'blocked',
              message: msg.message || `Fin de partie : Les ${stuckColor === 'green' ? 'Verts' : 'Rouges'} n'ont plus aucun coup valide. Victoire des ${winner === 'green' ? 'Verts' : 'Rouges'} !`,
            });

            if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
              room.hostWs.send(stuckBroadcast);
            }
            if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
              room.guestWs.send(stuckBroadcast);
            }
          }
        } else if (msg.type === 'MOVE_PIECE' || msg.type === 'make_move') {
          // 🛡️ SERVEUR AUTORITAIRE UNIQUE : Validation stricte et arbitrage de chaque coup
          const roomId = meta.roomId || msg.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;

          if (room) {
            if (room.gameOver) return;

            const isHost = ws === room.hostWs;
            const playerColor: 'green' | 'red' = (
              meta.color ||
              (isHost ? room.hostMeta?.color : room.guestMeta?.color) ||
              msg.movingColor ||
              msg.payload?.movingColor ||
              'green'
            ) as 'green' | 'red';

            const isChain = Boolean(msg.isChainStep || msg.payload?.isChainStep);

            // Validation de tour stricte : seul le joueur dont c'est le tour peut jouer
            if (room.currentTurn !== playerColor && !isChain) {
              console.warn(`[MOVE_REJECTED] Coup refusé pour ${playerColor}: c'est le tour des ${room.currentTurn}`);
              // Recaler le client en retard sur l'état officiel sans le bloquer
              ws.send(JSON.stringify({
                type: 'GAME_STATE_UPDATE',
                board: room.board,
                currentTurn: room.currentTurn,
                turn: room.currentTurn,
                timerSec: room.timerSec,
                turnId: room.turnId,
              }));
              return;
            }

            // Mise à jour officielle de l'échiquier sur le serveur
            const incomingBoard = msg.board || msg.payload?.board;
            if (incomingBoard && Array.isArray(incomingBoard) && incomingBoard.length === 5) {
              room.board = incomingBoard;
            }

            const rawNext = msg.nextTurn || msg.payload?.nextTurn;
            const nextTurn: 'green' | 'red' = isChain
              ? room.currentTurn
              : ((rawNext === 'green' || rawNext === 'red')
                ? rawNext
                : (room.currentTurn === 'green' ? 'red' : 'green'));

            room.currentTurn = nextTurn;
            room.turnId = (room.turnId || 0) + 1;

            const isAuto = Boolean(msg.isAutoMove || msg.payload?.isAutoMove);
            if (!isAuto && room.consecutiveTimeouts) {
              room.consecutiveTimeouts[playerColor] = 0;
            }

            const payloadObj = msg.payload || {};
            const lastMoveData = msg.lastMove || payloadObj.lastMove || (
              (payloadObj.fr !== undefined && payloadObj.tr !== undefined)
                ? {
                    fr: payloadObj.fr,
                    fc: payloadObj.fc,
                    tr: payloadObj.tr,
                    tc: payloadObj.tc,
                    isCap: Boolean(payloadObj.isCap),
                  }
                : (msg.fr !== undefined && msg.tr !== undefined)
                ? {
                    fr: msg.fr,
                    fc: msg.fc,
                    tr: msg.tr,
                    tc: msg.tc,
                    isCap: Boolean(msg.isCap),
                  }
                : null
            );
            const wasPenalty = Boolean(msg.wasPenalty || payloadObj.wasPenalty);
            const punishedCoords = msg.punishedCoords || payloadObj.punishedCoords;

            // ⚖️ RÈGLE DES 50 COUPS SANS PRISE (En Ligne & Amis) :
            // Si le coup comporte une capture ou une punition, réinitialiser à 0.
            // Sinon, incrémenter de 1 à chaque coup simple terminé (hors étapes intermédiaires de multi-capture).
            const isCap = Boolean(lastMoveData?.isCap || (isChain && lastMoveData));
            if (isCap || wasPenalty) {
              room.movesWithoutCapture = 0;
            } else if (!isChain) {
              room.movesWithoutCapture = (room.movesWithoutCapture || 0) + 1;
            }

            // Vérification stricte des conditions de fin de match
            const counts = countPiecesOnBoard(room.board);
            let gameOverReason: string | undefined = undefined;

            if (counts.green === 0 && counts.red > 0) {
              room.gameOver = true;
              room.winner = 'red';
              room.gameOverReason = 'elimination';
              gameOverReason = 'elimination';
              room.rematchRequestedBy = undefined;
              stopRoomTimer(room);
            } else if (counts.red === 0 && counts.green > 0) {
              room.gameOver = true;
              room.winner = 'green';
              room.gameOverReason = 'elimination';
              gameOverReason = 'elimination';
              room.rematchRequestedBy = undefined;
              stopRoomTimer(room);
            } else if (
              counts.green === 1 &&
              counts.red === 1 &&
              !hasCaptureMoves(room.board, 'green') &&
              !hasCaptureMoves(room.board, 'red')
            ) {
              // ⚖️ RÈGLE OFFICIELLE DU MATCH NUL : 1 pion restant de chaque côté sans capture immédiate possible
              room.gameOver = true;
              room.winner = 'draw';
              room.gameOverReason = 'draw_1v1';
              gameOverReason = 'draw_1v1';
              room.rematchRequestedBy = undefined;
              stopRoomTimer(room);
            } else if (!hasLegalMoves(room.board, nextTurn)) {
              // 🛑 BLOCAGE COMPLET SYNCHRONE : Le joueur suivant n'a plus aucun coup légal
              // Défaite immédiate pour le joueur bloqué, Victoire pour l'adversaire
              room.gameOver = true;
              room.winner = nextTurn === 'green' ? 'red' : 'green';
              room.gameOverReason = 'blocked';
              gameOverReason = 'blocked';
              room.rematchRequestedBy = undefined;
              stopRoomTimer(room);
            } else if (room.movesWithoutCapture >= 50) {
              // ⚖️ RÈGLE DES 50 COUPS SANS PRISE : Victoire au nombre de pions restants (ou Nul si égalité stricte)
              room.gameOver = true;
              const res50 = resolve50MovesWinner(room.board);
              room.winner = res50.winner;
              room.gameOverReason = 'draw_50_moves';
              gameOverReason = 'draw_50_moves';
              room.rematchRequestedBy = undefined;
              stopRoomTimer(room);
            } else {
              startRoomTimer(room);
            }

            const senderPlayerId = meta.playerId || msg.playerId || payloadObj.playerId;

            // 🎯 DIFFUSION SYNCHRONE DE L'ÉTAT DU JEU AUX DEUX CLIENTS EN MÊME TEMPS
            // Aucun client ne gère l'alternance de son côté : l'état du serveur fait foi absolue.
            const stateUpdatePayload = JSON.stringify({
              type: 'GAME_STATE_UPDATE',
              event: 'GAME_STATE_UPDATE',
              board: room.board,
              currentTurn: room.currentTurn,
              turn: room.currentTurn,
              nextTurn: room.currentTurn,
              turnId: room.turnId,
              lastMove: lastMoveData,
              fr: lastMoveData?.fr,
              fc: lastMoveData?.fc,
              tr: lastMoveData?.tr,
              tc: lastMoveData?.tc,
              isCap: Boolean(lastMoveData?.isCap),
              wasPenalty,
              punishedCoords,
              isChainStep: isChain,
              movingColor: playerColor,
              senderPlayerId,
              playerId: senderPlayerId,
              timerSec: 30,
              movesWithoutCapture: room.movesWithoutCapture || 0,
              gameOver: room.gameOver,
              winner: room.winner,
              gameOverReason,
              isBotMatch: Boolean(room.isBotMatch),
            });

            if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
              room.hostWs.send(stateUpdatePayload);
            }
            if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
              room.guestWs.send(stateUpdatePayload);
            }

            // Compatibilité avec les animations et SFX
            const movePiecePayload = JSON.stringify({
              type: 'MOVE_PIECE',
              event: 'MOVE_PIECE',
              board: room.board,
              lastMove: lastMoveData,
              fr: lastMoveData?.fr,
              fc: lastMoveData?.fc,
              tr: lastMoveData?.tr,
              tc: lastMoveData?.tc,
              isCap: Boolean(lastMoveData?.isCap),
              nextTurn: room.currentTurn,
              turn: room.currentTurn,
              currentTurn: room.currentTurn,
              isChainStep: isChain,
              wasPenalty,
              punishedCoords,
              movingColor: playerColor,
              senderPlayerId,
              playerId: senderPlayerId,
              timerSec: 30,
              movesWithoutCapture: room.movesWithoutCapture || 0,
              gameOver: room.gameOver,
              winner: room.winner,
              gameOverReason,
            });

            if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
              room.hostWs.send(movePiecePayload);
              if (room.gameOver) {
                room.hostWs.send(JSON.stringify({
                  type: 'GAME_OVER',
                  event: 'GAME_OVER',
                  roomId: room.id,
                  gameOver: true,
                  winner: room.winner,
                  gameOverReason: room.gameOverReason || gameOverReason,
                  movesWithoutCapture: room.movesWithoutCapture,
                  message: room.winner === 'draw'
                    ? '⚖️ Règle des 50 coups sans prise atteinte : Match Nul !'
                    : `Victoire des ${room.winner === 'green' ? 'Verts' : 'Rouges'} !`,
                }));
              }
            }
            if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
              room.guestWs.send(movePiecePayload);
              if (room.gameOver) {
                room.guestWs.send(JSON.stringify({
                  type: 'GAME_OVER',
                  event: 'GAME_OVER',
                  roomId: room.id,
                  gameOver: true,
                  winner: room.winner,
                  gameOverReason: room.gameOverReason || gameOverReason,
                  movesWithoutCapture: room.movesWithoutCapture,
                  message: room.winner === 'draw'
                    ? '⚖️ Règle des 50 coups sans prise atteinte : Match Nul !'
                    : `Victoire des ${room.winner === 'green' ? 'Verts' : 'Rouges'} !`,
                }));
              }
            }

            // Si partie avec profil virtuel (bot) et c'est au tour du bot de jouer
            if (room.isBotMatch && room.currentTurn === room.botColor && !room.gameOver && !isChain) {
              scheduleBotTurn(room);
            }
          }
        } else if (msg.type === 'claim_draw_50' || msg.type === 'game_over_draw_50') {
          // ⚖️ RÉCLAMATION SYNCHRONE DU VERDICT DES 50 COUPS SANS PRISE
          const roomId = meta.roomId || msg.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;
          if (room && !room.gameOver) {
            room.gameOver = true;
            const res50 = resolve50MovesWinner(room.board);
            room.winner = res50.winner;
            room.gameOverReason = 'draw_50_moves';
            room.movesWithoutCapture = 50;
            room.rematchRequestedBy = undefined;
            stopRoomTimer(room);

            const drawPayload = JSON.stringify({
              type: 'GAME_OVER',
              event: 'GAME_OVER',
              roomId: room.id,
              gameOver: true,
              winner: res50.winner,
              greenCount: res50.greenCount,
              redCount: res50.redCount,
              gameOverReason: 'draw_50_moves',
              movesWithoutCapture: 50,
              message: res50.message,
            });
            const statePayload = JSON.stringify({
              type: 'GAME_STATE_UPDATE',
              event: 'GAME_STATE_UPDATE',
              board: room.board,
              currentTurn: room.currentTurn,
              turn: room.currentTurn,
              nextTurn: room.currentTurn,
              turnId: room.turnId,
              timerSec: 30,
              movesWithoutCapture: 50,
              gameOver: true,
              winner: res50.winner,
              gameOverReason: 'draw_50_moves',
              message: res50.message,
            });

            if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
              room.hostWs.send(drawPayload);
              room.hostWs.send(statePayload);
            }
            if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
              room.guestWs.send(drawPayload);
              room.guestWs.send(statePayload);
            }
          }
        } else if (msg.type === 'request_rematch') {
          // ⚔️ GESTION OFFICIELLE DU REMATCH (DEMANDE DE REVANCHE)
          const roomId = meta.roomId || msg.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;
          if (room) {
            if (room.isBotMatch) {
              ws.send(JSON.stringify({
                type: 'REMATCH_PENDING',
                message: "Demande de revanche envoyée... En attente de l'adversaire.",
              }));
              setTimeout(() => {
                if (!rooms.has(room.id)) return;
                stopRoomTimer(room);
                const freshBoard = getInitialBoardState();
                room.board = freshBoard;
                room.gameOver = false;
                room.winner = undefined;
                room.gameOverReason = undefined;
                room.movesWithoutCapture = 0;
                room.rematchRequestedBy = undefined;
                room.turnId = 0;
                room.consecutiveTimeouts = { green: 0, red: 0 };
                room.timerSec = 30;

                const startingTurn: 'green' | 'red' = Math.random() < 0.5 ? 'green' : 'red';
                room.currentTurn = startingTurn;
                room.gameStarted = true;

                // Inverser les rôles (Verts / Rouges) pour garantir l'équité
                const prevHostColor: 'green' | 'red' = room.hostMeta?.color === 'red' ? 'red' : 'green';
                const hostColor: 'green' | 'red' = prevHostColor === 'green' ? 'red' : 'green';
                const botColor: 'green' | 'red' = hostColor === 'green' ? 'red' : 'green';
                if (room.hostMeta) room.hostMeta.color = hostColor;
                if (room.hostWs) {
                  const hostClientMeta = clients.get(room.hostWs);
                  if (hostClientMeta) {
                    hostClientMeta.color = hostColor;
                    clients.set(room.hostWs, hostClientMeta);
                  }
                }
                room.botColor = botColor;

                const rematchStartHost = JSON.stringify({
                  type: 'START_MATCH',
                  event: 'START_MATCH',
                  board: freshBoard,
                  startingTurn,
                  currentTurn: startingTurn,
                  turn: startingTurn,
                  role: 'host',
                  myColor: hostColor,
                  opponentColor: botColor,
                  hostColor,
                  guestColor: botColor,
                  playerName: room.hostMeta?.playerName || 'Joueur',
                  opponentName: room.botProfile?.name || 'Adversaire',
                  opponentAvatar: room.botProfile?.avatar || '👑',
                  opponentPhoto: undefined,
                  opponentFlag: room.botProfile?.flag,
                  opponentCountry: room.botProfile?.country,
                  opponentLevel: room.botProfile?.level,
                  opponentRating: room.botProfile?.rating,
                  roomId: room.id,
                  movesWithoutCapture: 0,
                  isRematch: true,
                  payload: {
                    role: 'host',
                    myColor: hostColor,
                    opponentColor: botColor,
                    hostColor,
                    guestColor: botColor,
                    playerName: room.hostMeta?.playerName || 'Joueur',
                    opponentName: room.botProfile?.name || 'Adversaire',
                    opponentAvatar: room.botProfile?.avatar || '👑',
                    opponentPhoto: undefined,
                    opponentFlag: room.botProfile?.flag,
                    opponentCountry: room.botProfile?.country,
                    opponentLevel: room.botProfile?.level,
                    opponentRating: room.botProfile?.rating,
                    startingTurn,
                    currentTurn: startingTurn,
                    board: freshBoard,
                    turn: startingTurn,
                    roomId: room.id,
                    movesWithoutCapture: 0,
                    isRematch: true,
                  },
                });

                if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                  room.hostWs.send(rematchStartHost);
                }
                startRoomTimer(room);
                if (startingTurn === botColor) {
                  scheduleBotTurn(room);
                }
              }, 1200);
              return;
            }

            const role = meta.role || (ws === room.hostWs ? 'host' : 'guest');
            // ⚔️ DÉTECTION DE REVANCHE MUTUELLE : Si l'autre joueur a déjà demandé la revanche,
            // ou si les deux joueurs ont cliqué sur "Rejouer", lancer immédiatement la partie sans bloquer ni boucler !
            if (room.rematchRequestedBy && room.rematchRequestedBy !== role) {
              startRematch(room);
              return;
            }

            room.rematchRequestedBy = role;
            const otherWs = role === 'host' ? room.guestWs : room.hostWs;
            const requesterName = (role === 'host' ? room.hostMeta?.playerName : room.guestMeta?.playerName) || 'L’adversaire';

            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'REMATCH_REQUESTED',
                requesterRole: role,
                requesterName,
                message: `${requesterName} demande une revanche !`,
              }));
            }
            ws.send(JSON.stringify({
              type: 'REMATCH_PENDING',
              message: "Demande de revanche envoyée... En attente de l'adversaire.",
            }));
          }
        } else if (msg.type === 'accept_rematch') {
          // ⚔️ REVANCHE ACCEPTÉE PAR LES DEUX : NOUVELLE GRILLE DE DÉPART VIERGE ET RÉINITIALISÉE
          const roomId = meta.roomId || msg.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;
          if (room) {
            startRematch(room);
          }
        } else if (msg.type === 'decline_rematch') {
          // Revanche refusée : avertir le demandeur
          const roomId = meta.roomId || msg.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;
          if (room) {
            room.rematchRequestedBy = undefined;
            const otherWs = ws === room.hostWs ? room.guestWs : room.hostWs;
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'REMATCH_DECLINED',
                message: "L'adversaire a décliné la proposition de revanche.",
              }));
            }
          }
        } else if (msg.type === 'leave_room' || msg.type === 'surrender') {
          const roomId = meta.roomId || msg.roomId;
          const room = roomId ? rooms.get(roomId) : undefined;
          if (room) {
            stopRoomTimer(room);
            const isHost = ws === room.hostWs;
            const hostCol = room.hostMeta?.color || 'green';
            const guestCol = room.guestMeta?.color || (hostCol === 'green' ? 'red' : 'green');
            const loserColor: 'green' | 'red' = (msg.loser as 'green' | 'red') || (isHost ? hostCol : guestCol);
            const winnerColor: 'green' | 'red' = (msg.winner as 'green' | 'red') || (loserColor === 'green' ? 'red' : 'green');
            const isPostGame = Boolean(room.gameOver);

            // Envoi de la confirmation d'abandon au joueur qui quitte (seulement si la partie était en cours)
            if (!isPostGame && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'SELF_LEFT',
                reason: 'self_forfeit',
                winner: winnerColor,
                loser: loserColor,
                message: 'Défaite par forfait : Vous avez quitté la partie.',
              }));
            }

            const otherWs = isHost ? room.guestWs : room.hostWs;
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              const opponentLeftPayload = JSON.stringify({
                type: 'OPPONENT_LEFT',
                event: 'OPPONENT_LEFT',
                reason: isPostGame ? 'post_game_leave' : 'surrender_or_leave',
                isGameOver: isPostGame,
                winner: winnerColor,
                loser: loserColor,
                message: isPostGame ? "L'adversaire a quitté la partie." : "L'adversaire a abandonné la partie.",
              });
              otherWs.send(opponentLeftPayload);
            }
            rooms.delete(roomId);
          }
        } else if (meta.roomId) {
          // Relayer les messages de divertissement (émojis, chat, réactions)
          const room = rooms.get(meta.roomId);
          if (room) {
            const outbound = JSON.stringify(msg);
            const otherWs = ws === room.hostWs ? room.guestWs : room.hostWs;
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(outbound);
            }
          }
        }
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    });

    ws.on('close', () => {
      // 🤝 Nettoyage de la présence et annulation des défis si l'émetteur se déconnecte
      const reg = registeredPlayers.get(ws);
      if (reg) {
        for (const [cId, chal] of activeFriendChallenges.entries()) {
          if (chal.fromPlayerId === reg.playerId && chal.status === 'pending') {
            activeFriendChallenges.delete(cId);
            for (const other of registeredPlayers.values()) {
              if (other.playerId === chal.toFriendId || (chal.toFriendCode && other.friendCode === chal.toFriendCode)) {
                if (other.ws.readyState === WebSocket.OPEN) {
                  other.ws.send(JSON.stringify({
                    type: 'FRIEND_CHALLENGE_CANCELLED',
                    challengeId: cId,
                    reason: 'sender_left_chat',
                    message: "Votre ami a quitté la discussion. Le défi n'est plus actif.",
                  }));
                }
              }
            }
          }
        }
        registeredPlayers.delete(ws);
      }

      if (waitingPlayer && waitingPlayer.ws === ws) {
        if (waitingPlayer.botTimer) {
          clearTimeout(waitingPlayer.botTimer);
          waitingPlayer.botTimer = null;
        }
        waitingPlayer = null;
      }
      const meta = clients.get(ws);
      if (meta?.roomId) {
        const room = rooms.get(meta.roomId);
        if (room) {
          if (room.isBotMatch) {
            stopRoomTimer(room);
            rooms.delete(meta.roomId);
            clients.delete(ws);
            return;
          }
          const isHost = ws === room.hostWs;
          const otherWs = isHost ? room.guestWs : room.hostWs;
          const hostCol = room.hostMeta?.color || 'green';
          const guestCol = room.guestMeta?.color || (hostCol === 'green' ? 'red' : 'green');
          const loserColor = isHost ? hostCol : guestCol;
          const winnerColor = isHost ? guestCol : hostCol;

          // 1. Si la partie est déjà terminée, avertir l'autre joueur qu'il a quitté la salle
          if (room.gameOver) {
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'OPPONENT_LEFT',
                event: 'OPPONENT_LEFT',
                reason: 'post_game_leave',
                isGameOver: true,
                message: "L'adversaire a quitté la partie.",
              }));
            }
            if ((!room.hostWs || room.hostWs.readyState !== WebSocket.OPEN) &&
                (!room.guestWs || room.guestWs.readyState !== WebSocket.OPEN)) {
              rooms.delete(meta.roomId);
            }
            clients.delete(ws);
            return;
          }

          // 2. Si la partie n'a pas encore commencé (attente dans le salon / lobby)
          if (!room.gameStarted) {
            stopRoomTimer(room);
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'OPPONENT_LEFT',
                event: 'OPPONENT_LEFT',
                reason: 'lobby_exit',
                message: "L'adversaire a quitté le salon d'attente.",
              }));
            }
            rooms.delete(meta.roomId);
            clients.delete(ws);
            return;
          }

          // 3. 🛡️ PARTIE EN COURS : TOLÉRANCE STRICTE AUX MICRO-COUPURES RÉSEAU (4G/Wi-Fi)
          // Ne JAMAIS déclarer de forfait immédiat sur une simple fermeture de socket !
          // On suspend le minuteur et on offre un délai de grâce de 15 secondes pour reconnexion silencieuse.
          stopRoomTimer(room);
          room.isPausedForReconnect = true;

          // Si l'autre joueur est toujours connecté, l'avertir et lancer le compte à rebours
          if (otherWs && otherWs.readyState === WebSocket.OPEN) {
            const BUFFER_SEC = 15;
            room.disconnectBufferSec = BUFFER_SEC;

            if (room.disconnectTimeout) {
              clearTimeout(room.disconnectTimeout);
              room.disconnectTimeout = null;
            }
            if (room.disconnectInterval) {
              clearInterval(room.disconnectInterval);
              room.disconnectInterval = null;
            }

            otherWs.send(JSON.stringify({
              type: 'OPPONENT_DISCONNECTED_BUFFER',
              event: 'OPPONENT_DISCONNECTED_BUFFER',
              bufferSec: BUFFER_SEC,
              message: "⚠️ Micro-coupure adverse (4G/Wi-Fi). Maintien de session (15s)...",
            }));

            room.disconnectInterval = setInterval(() => {
              if (!rooms.has(room.id) || !room.isPausedForReconnect) {
                if (room.disconnectInterval) {
                  clearInterval(room.disconnectInterval);
                  room.disconnectInterval = null;
                }
                return;
              }
              room.disconnectBufferSec = (room.disconnectBufferSec || BUFFER_SEC) - 1;
              if (otherWs.readyState === WebSocket.OPEN) {
                otherWs.send(JSON.stringify({
                  type: 'DISCONNECT_BUFFER_TICK',
                  event: 'DISCONNECT_BUFFER_TICK',
                  remainingSec: room.disconnectBufferSec,
                }));
              }
            }, 1000);

            // Le forfait définitif n'est déclaré QUE si le délai de grâce (15s) s'est entièrement écoulé sans reconnexion
            room.disconnectTimeout = setTimeout(() => {
              if (room.disconnectInterval) {
                clearInterval(room.disconnectInterval);
                room.disconnectInterval = null;
              }
              if (room.isPausedForReconnect && !room.gameOver) {
                room.gameOver = true;
                room.winner = winnerColor;
                room.gameOverReason = 'opponent_left';

                if (otherWs.readyState === WebSocket.OPEN) {
                  otherWs.send(JSON.stringify({
                    type: 'OPPONENT_LEFT',
                    event: 'OPPONENT_LEFT',
                    reason: 'disconnect_timeout',
                    role: meta.role,
                    winner: winnerColor,
                    loser: loserColor,
                    message: "Victoire par forfait ! L'adversaire a perdu la connexion (délai dépassé).",
                  }));
                }
                rooms.delete(meta.roomId);
              }
            }, BUFFER_SEC * 1000);
          } else {
            // Si les deux joueurs ont perdu la connexion en même temps, accorder également 15s de grâce
            const BUFFER_SEC = 15;
            if (room.disconnectTimeout) clearTimeout(room.disconnectTimeout);
            room.disconnectTimeout = setTimeout(() => {
              if ((!room.hostWs || room.hostWs.readyState !== WebSocket.OPEN) &&
                  (!room.guestWs || room.guestWs.readyState !== WebSocket.OPEN)) {
                rooms.delete(meta.roomId);
              }
            }, BUFFER_SEC * 1000);
          }
        }
      }
      clients.delete(ws);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`12 PIONS Game Server running on port ${PORT}`);
  });
}

startServer();
