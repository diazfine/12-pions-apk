export interface OnlineMessage {
  type:
    | 'CONNECT'
    | 'join_room'
    | 'room_joined'
    | 'player_joined'
    | 'player_left'
    | 'PLAYER_LEFT'
    | 'OPPONENT_LEFT'
    | 'ASSIGN_ROLE'
    | 'start_game'
    | 'START_MATCH'
    | 'INIT_GAME'
    | 'make_move'
    | 'MOVE_PIECE'
    | 'opponent_moved'
    | 'chain_step'
    | 'penalty'
    | 'rematch'
    | 'surrender'
    | 'chat_message'
    | 'emote'
    | 'TIMER_TICK'
    | 'TIMER_RESET'
    | 'TURN_TIMEOUT'
    | 'TURN_PASSED'
    | 'TIMEOUT_FIRST_WARNING'
    | 'FORFEIT_TIMEOUT'
    | 'PLAYER_STUCK'
    | 'NO_VALID_MOVES'
    | 'search_match'
    | 'cancel_match'
    | 'MATCHMAKING_WAITING'
    | 'MATCHMAKING_CANCELLED'
    | 'MATCH_FOUND'
    | 'JOIN_ERROR'
    | 'JOIN_SUCCESS'
    | 'ping'
    | 'pong';
  roomId?: string;
  role?: 'host' | 'guest';
  playerId?: string;
  color?: string;
  myColor?: 'green' | 'red' | 'blue';
  opponentColor?: 'green' | 'red' | 'blue';
  startingTurn?: 'green' | 'red' | 'blue';
  opponentName?: string;
  errorCode?: string;
  timerSec?: number;
  currentTurn?: 'green' | 'red' | 'blue';
  nextTurn?: 'green' | 'red' | 'blue';
  message?: string;
  messageId?: string;
  reason?: string;
  forfeit?: boolean;
  timedOutColor?: string;
  winner?: string;
  loser?: string;
  winnerMessage?: string;
  loserMessage?: string;
  payload?: any;
}

export class OnlineChannel {
  public roomId: string;
  public isHost: boolean;
  public myPlayerId: string;
  public myColor: string;
  public isMatchmaking: boolean = false;
  public playerName: string = 'Joueur';

  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  public isConnected: boolean = false;
  public isReconnecting: boolean = false;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 6;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isDestroyed = false;
  private processedMessageIds = new Set<string>();
  private pendingWsMessages: any[] = [];

  // Event callbacks
  public onConnected?: () => void;
  public onOpponentJoined?: (meta: { role?: string; color?: string }) => void;
  public onRoleAssigned?: (data: { role: 'host' | 'guest'; myColor: 'green' | 'red' | 'blue'; opponentColor: 'green' | 'red' | 'blue'; startingTurn: 'green' | 'red' | 'blue'; message?: string }) => void;
  public onStartGame?: (payload: { hostColor: 'green' | 'red' | 'blue'; guestColor: 'green' | 'red' | 'blue'; startingTurn: 'green' | 'red' | 'blue'; currentTurn?: 'green' | 'red' | 'blue'; board?: any; roomId?: string }) => void;
  public onMove?: (payload: any) => void;
  public onTimerTick?: (timerSec: number, currentTurn: 'green' | 'red' | 'blue') => void;
  public onTimerReset?: (timerSec: number, currentTurn: 'green' | 'red' | 'blue') => void;
  public onTurnTimeout?: (nextTurn: 'green' | 'red' | 'blue') => void;
  public onTimeoutWarning?: (data: { timedOutColor: string; message?: string }) => void;
  public onForfeitTimeout?: (data: { winner: string; loser: string; message?: string; winnerMessage?: string; loserMessage?: string }) => void;
  public onPlayerStuck?: (data: { stuckColor: 'green' | 'red'; winner: 'green' | 'red'; message?: string }) => void;
  public onChainStep?: (payload: any) => void;
  public onPenalty?: (payload: any) => void;
  public onRematch?: () => void;
  public onSurrender?: () => void;
  public onOpponentLeft?: (message?: string) => void;
  public onChatMessage?: (chat: any) => void;
  public onEmote?: (emoji: string) => void;
  public onReconnecting?: (attempt?: number) => void;
  public onReconnected?: () => void;
  public onConnectionLost?: () => void;
  public onMatchWaiting?: (message: string) => void;
  public onMatchFound?: (data: {
    roomId: string;
    role: 'host' | 'guest';
    myColor: 'green' | 'red';
    opponentColor: 'green' | 'red';
    startingTurn: 'green';
    opponentName?: string;
    opponentAvatar?: string;
    opponentPhoto?: string;
    opponentFlag?: string;
    opponentCountry?: string;
    opponentRating?: number;
    opponentLevel?: number;
    message?: string;
  }) => void;
  public onJoinError?: (errorMessage: string) => void;
  public onJoinSuccess?: (roomId: string) => void;

  constructor(
    roomId: string,
    isHost: boolean,
    color: string = 'green',
    playerId?: string,
    isMatchmaking: boolean = false,
    playerName: string = 'Joueur'
  ) {
    this.roomId = roomId.toUpperCase().trim();
    this.isHost = isHost;
    this.myColor = color;
    this.isMatchmaking = isMatchmaking;
    this.playerName = playerName;
    this.myPlayerId = playerId || `${isHost ? 'host' : 'guest'}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (this.roomId) {
      this.initBroadcastChannel();
    }
    this.initWebSocket();
    this.startPing();
  }

  private initBroadcastChannel() {
    try {
      if (!this.roomId) return;
      this.bc = new BroadcastChannel(`12pions_bc_${this.roomId}`);
      this.bc.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch {
      // BroadcastChannel optional fallback
    }
  }

  private initWebSocket() {
    if (this.isDestroyed) return;

    try {
      const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
      const wsUrl = `${protocol}//${host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        const wasReconnecting = this.isReconnecting;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;

        if (this.isMatchmaking) {
          // Send search match request
          this.sendRawWs({
            type: 'search_match',
            playerId: this.myPlayerId,
            playerName: this.playerName,
          });
        } else if (this.roomId) {
          // Join room on server
          this.sendRawWs({
            type: 'join_room',
            roomId: this.roomId,
            role: this.isHost ? 'host' : 'guest',
            playerId: this.myPlayerId,
            playerName: this.playerName,
            color: this.myColor,
          });

          // Also broadcast presence on BroadcastChannel
          this.sendRawBc({
            type: 'CONNECT',
            roomId: this.roomId,
            role: this.isHost ? 'host' : 'guest',
            playerId: this.myPlayerId,
            color: this.myColor,
          });
        }

        if (wasReconnecting && this.onReconnected) {
          this.onReconnected();
        }

        // Flush any pending WS messages queued before socket opened
        while (this.pendingWsMessages.length > 0) {
          const m = this.pendingWsMessages.shift();
          try {
            this.ws.send(JSON.stringify(m));
          } catch {}
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.warn('Invalid WS message', e);
        }
      };

      this.ws.onclose = () => {
        if (!this.isDestroyed) {
          this.handleDisconnect();
        }
      };

      this.ws.onerror = () => {
        if (!this.isDestroyed) {
          this.handleDisconnect();
        }
      };
    } catch (err) {
      console.warn('WebSocket init failure, using BC fallback', err);
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    if (this.isDestroyed || this.isReconnecting) return;
    this.isReconnecting = true;
    if (this.onReconnecting) this.onReconnecting(this.reconnectAttempts + 1);

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.isReconnecting = false;
      if (this.onConnectionLost) this.onConnectionLost();
      return;
    }

    this.reconnectAttempts++;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.initWebSocket();
    }, Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 4000));
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.isDestroyed) return;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendRawWs({ type: 'ping' });
      }
    }, 15000);
  }

  private sendRawWs(msg: any) {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      } else {
        this.pendingWsMessages.push(msg);
      }
    } catch (e) {
      console.warn('WS send failed', e);
    }
  }

  private sendRawBc(msg: any) {
    try {
      if (this.bc) {
        this.bc.postMessage(msg);
      }
    } catch (e) {
      console.warn('BC post failed', e);
    }
  }

  public broadcast(msg: OnlineMessage) {
    if (!msg.messageId) {
      msg.messageId = `${this.myPlayerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }
    msg.roomId = this.roomId;
    msg.playerId = this.myPlayerId;
    msg.role = this.isHost ? 'host' : 'guest';

    // Track own message so local echo isn't processed
    this.processedMessageIds.add(msg.messageId);

    // Send via both WebSocket and BroadcastChannel
    this.sendRawWs(msg);
    this.sendRawBc(msg);
  }

  private handleMessage(msg: OnlineMessage) {
    if (!msg || !msg.type) return;

    // Ignore self-sent messages
    if (msg.playerId && msg.playerId === this.myPlayerId) return;

    // Deduplicate identical messages arriving from WS and BC
    if (msg.messageId) {
      if (this.processedMessageIds.has(msg.messageId)) return;
      this.processedMessageIds.add(msg.messageId);
      if (this.processedMessageIds.size > 200) {
        const arr = Array.from(this.processedMessageIds);
        this.processedMessageIds = new Set(arr.slice(-100));
      }
    }

    switch (msg.type) {
      case 'MATCHMAKING_WAITING':
        if (this.onMatchWaiting) {
          this.onMatchWaiting(msg.message || 'Recherche d’un adversaire en cours...');
        }
        break;

      case 'MATCH_FOUND':
        this.roomId = msg.roomId || this.roomId;
        this.isHost = msg.role === 'host';
        this.myColor = msg.myColor || (this.isHost ? 'green' : 'red');
        this.isConnected = true;
        this.initBroadcastChannel();
        if (this.onRoleAssigned) {
          this.onRoleAssigned({
            role: msg.role || (this.isHost ? 'host' : 'guest'),
            myColor: (msg.myColor as any) || (this.isHost ? 'green' : 'red'),
            opponentColor: (msg.opponentColor as any) || (this.isHost ? 'red' : 'green'),
            startingTurn: 'green',
            message: msg.message,
          });
        }
        if (this.onMatchFound) {
          this.onMatchFound({
            roomId: msg.roomId || this.roomId,
            role: msg.role || (this.isHost ? 'host' : 'guest'),
            myColor: (msg.myColor as any) || (this.isHost ? 'green' : 'red'),
            opponentColor: (msg.opponentColor as any) || (this.isHost ? 'red' : 'green'),
            startingTurn: 'green',
            opponentName: msg.opponentName,
            opponentAvatar: (msg as any).opponentAvatar,
            opponentPhoto: (msg as any).opponentPhoto,
            opponentFlag: (msg as any).opponentFlag,
            opponentCountry: (msg as any).opponentCountry,
            opponentRating: (msg as any).opponentRating,
            opponentLevel: (msg as any).opponentLevel,
            message: msg.message,
          });
        }
        break;

      case 'JOIN_ERROR':
        if (this.onJoinError) {
          this.onJoinError(msg.message || 'Code incorrect. Veuillez recontrôler le code.');
        }
        break;

      case 'JOIN_SUCCESS':
        this.isConnected = true;
        if (this.onJoinSuccess) {
          this.onJoinSuccess(msg.roomId || this.roomId);
        }
        break;

      case 'ASSIGN_ROLE':
        if (msg.myColor) {
          this.myColor = msg.myColor;
        }
        if (msg.role) {
          this.isHost = msg.role === 'host';
        }
        if (this.onRoleAssigned) {
          this.onRoleAssigned({
            role: msg.role || (this.isHost ? 'host' : 'guest'),
            myColor: msg.myColor || 'red',
            opponentColor: msg.opponentColor || 'blue',
            startingTurn: msg.startingTurn || 'red',
            message: msg.message,
          });
        }
        break;

      case 'room_joined':
        if (msg.payload?.clientsCount > 1 || msg.role === 'guest') {
          this.isConnected = true;
          if (this.onConnected) this.onConnected();
        }
        break;

      case 'player_joined':
      case 'CONNECT':
        this.isConnected = true;
        if (this.onConnected) this.onConnected();
        if (this.onOpponentJoined) this.onOpponentJoined({ role: msg.role, color: msg.color });
        // Reply so guest knows host is here
        if (msg.type === 'CONNECT') {
          this.broadcast({ type: 'player_joined', role: this.isHost ? 'host' : 'guest', color: this.myColor });
        }
        break;

      case 'player_left':
      case 'PLAYER_LEFT':
      case 'OPPONENT_LEFT':
        this.isConnected = false;
        if (this.onOpponentLeft) {
          this.onOpponentLeft(msg.message || 'Victoire par forfait ! Votre adversaire a quitté la partie.');
        }
        break;

      case 'start_game':
      case 'START_MATCH':
      case 'INIT_GAME':
        if (this.onStartGame && (msg.payload || msg)) {
          this.onStartGame(msg.payload || msg);
        }
        break;

      case 'MOVE_PIECE':
      case 'make_move':
      case 'opponent_moved':
        if (this.onMove && (msg.payload || msg)) {
          this.onMove(msg.payload || msg);
        }
        break;

      case 'TIMER_TICK':
        if (this.onTimerTick && msg.timerSec !== undefined && msg.currentTurn) {
          this.onTimerTick(msg.timerSec, msg.currentTurn);
        }
        break;

      case 'TIMER_RESET':
        if (this.onTimerReset && msg.timerSec !== undefined && msg.currentTurn) {
          this.onTimerReset(msg.timerSec, msg.currentTurn);
        }
        break;

      case 'TURN_TIMEOUT':
      case 'TURN_PASSED':
        if (this.onTurnTimeout && (msg.nextTurn || msg.currentTurn)) {
          this.onTurnTimeout(msg.nextTurn || msg.currentTurn);
        }
        break;

      case 'TIMEOUT_FIRST_WARNING':
        if (this.onTimeoutWarning) {
          this.onTimeoutWarning({
            timedOutColor: msg.timedOutColor || (msg.payload?.timedOutColor) || 'green',
            message: msg.message || msg.payload?.message,
          });
        }
        break;

      case 'FORFEIT_TIMEOUT':
        if (this.onForfeitTimeout) {
          this.onForfeitTimeout({
            winner: msg.winner || (msg.payload?.winner) || '',
            loser: (msg as any).loser || (msg.payload?.loser) || '',
            message: msg.message || msg.payload?.message,
            winnerMessage: msg.winnerMessage || msg.payload?.winnerMessage,
            loserMessage: msg.loserMessage || msg.payload?.loserMessage,
          });
        }
        break;

      case 'PLAYER_STUCK':
      case 'NO_VALID_MOVES':
        if (this.onPlayerStuck) {
          const stuckColor = ((msg.payload?.stuckColor || (msg as any).stuckColor || msg.timedOutColor || (msg.loser === 'green' ? 'green' : 'red')) || 'green') as 'green' | 'red';
          const winner = ((msg.winner || msg.payload?.winner || (stuckColor === 'green' ? 'red' : 'green')) || 'red') as 'green' | 'red';
          this.onPlayerStuck({
            stuckColor,
            winner,
            message: msg.message || msg.payload?.message,
          });
        }
        break;

      case 'chain_step':
        if (this.onChainStep && msg.payload) {
          this.onChainStep(msg.payload);
        }
        break;

      case 'penalty':
        if (this.onPenalty && msg.payload) {
          this.onPenalty(msg.payload);
        }
        break;

      case 'rematch':
        if (this.onRematch) this.onRematch();
        break;

      case 'surrender':
        if (this.onSurrender) this.onSurrender();
        break;

      case 'chat_message':
        if (this.onChatMessage && msg.payload) {
          this.onChatMessage(msg.payload);
        }
        break;

      case 'emote':
        if (this.onEmote && msg.payload) {
          this.onEmote(msg.payload);
        }
        break;
    }
  }

  // Public methods to trigger events
  public sendStartGame(payload: { hostColor: 'green' | 'red' | 'blue'; guestColor: 'green' | 'red' | 'blue'; startingTurn: 'green' | 'red' | 'blue' }) {
    this.broadcast({
      type: 'start_game',
      payload,
    });
  }

  public sendMove(payload: any) {
    this.broadcast({
      type: 'MOVE_PIECE',
      payload,
    });
  }

  public sendMovePiece(payload: {
    roomId?: string;
    fromIndex: number;
    toIndex: number;
    capturedPieces?: any;
    nextTurn: string;
    [key: string]: any;
  }) {
    this.broadcast({
      type: 'MOVE_PIECE',
      roomId: this.roomId,
      payload,
    });
  }

  public sendChainStep(payload: any) {
    this.broadcast({
      type: 'chain_step',
      payload,
    });
  }

  public sendPenalty(payload: any) {
    this.broadcast({
      type: 'penalty',
      payload,
    });
  }

  public sendRematch() {
    this.broadcast({ type: 'rematch' });
  }

  public sendTimeoutWarning(timedOutColor: string, message: string) {
    this.broadcast({
      type: 'TIMEOUT_FIRST_WARNING',
      timedOutColor: timedOutColor as any,
      message,
    });
  }

  public sendForfeitTimeout(winner: string, loser: string, message: string) {
    this.broadcast({
      type: 'FORFEIT_TIMEOUT',
      winner: winner as any,
      loser: loser as any,
      message,
    });
  }

  public sendPlayerStuck(stuckColor: 'green' | 'red', winner: 'green' | 'red', message?: string) {
    const payload = { stuckColor, winner, message };
    this.broadcast({
      type: 'PLAYER_STUCK',
      winner,
      payload,
      message: message || `Partie terminée : joueur ${stuckColor} bloqué sans coup légal.`,
    });
    this.sendRawWs({
      type: 'PLAYER_STUCK',
      roomId: this.roomId,
      winner,
      stuckColor,
      loser: stuckColor,
      message,
      gameOver: true,
      reason: 'blocked',
    });
  }

  public sendGameOver(winner: string, reason: string = 'draw_1v1', message?: string) {
    const payload = { winner, gameOver: true, gameOverReason: reason, message };
    this.broadcast({
      type: 'MOVE_PIECE',
      winner,
      payload,
      message,
    });
    this.sendRawWs({
      type: 'MOVE_PIECE',
      roomId: this.roomId,
      winner,
      gameOver: true,
      gameOverReason: reason,
      message,
    });
  }

  public sendSurrender() {
    this.broadcast({ type: 'player_left', reason: 'surrender', forfeit: true, message: 'Votre adversaire a quitté la partie.' });
    this.sendRawWs({ type: 'surrender', roomId: this.roomId, forfeit: true });
    this.sendRawWs({ type: 'leave_room', roomId: this.roomId, reason: 'surrender', forfeit: true });
  }

  public sendLeaveRoom() {
    try {
      this.broadcast({ type: 'player_left', reason: 'leave', forfeit: true, message: 'Votre adversaire a quitté la partie.' });
      this.sendRawWs({ type: 'leave_room', roomId: this.roomId, forfeit: true });
    } catch {
      // Ignore
    }
  }

  public sendChatMessage(chat: any) {
    this.broadcast({ type: 'chat_message', payload: chat });
  }

  public sendEmote(emoji: string) {
    this.broadcast({ type: 'emote', payload: emoji });
  }

  public startMatchmaking(region: string = 'closest', playerName?: string, preferredColor: 'green' | 'red' | 'random' = 'random') {
    if (playerName) this.playerName = playerName;
    this.sendRawWs({
      type: 'search_match',
      playerId: this.myPlayerId,
      playerName: this.playerName,
      region,
      preferredColor,
    });
  }

  public cancelMatchmaking() {
    this.sendRawWs({
      type: 'cancel_match',
      playerId: this.myPlayerId,
    });
  }

  public destroy() {
    this.isDestroyed = true;
    clearInterval(this.pingInterval);
    clearTimeout(this.reconnectTimer);
    try {
      this.sendLeaveRoom();
      if (this.bc) this.bc.close();
      if (this.ws) this.ws.close();
    } catch {
      // Ignore
    }
  }
}
