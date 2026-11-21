// Socket client abstraction for direct socket.on / socket.off / socket.emit communication
// With Heartbeat (Ping-Pong), auto-reconnect on micro-cuts (4G/Wi-Fi), and session restoration.
export type SocketEventHandler = (data: any) => void;

export interface SessionInfo {
  roomId: string;
  role: 'host' | 'guest';
  playerId: string;
  color?: 'green' | 'red';
}

class GameSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<SocketEventHandler>> = new Map();
  private pendingQueue: any[] = [];
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private missedPings: number = 0;
  private sessionInfo: SessionInfo | null = null;

  constructor() {
    this.connect();
    this.setupNetworkListeners();
  }

  public get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public setSessionInfo(info: SessionInfo | null) {
    this.sessionInfo = info;
    if (typeof window !== 'undefined') {
      try {
        if (info) {
          sessionStorage.setItem('d12_pions_active_session', JSON.stringify(info));
        } else {
          sessionStorage.removeItem('d12_pions_active_session');
        }
      } catch {}
    }
  }

  public getSessionInfo(): SessionInfo | null {
    if (this.sessionInfo) return this.sessionInfo;
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('d12_pions_active_session');
        if (stored) {
          this.sessionInfo = JSON.parse(stored);
          return this.sessionInfo;
        }
      } catch {}
    }
    return null;
  }

  public clearSessionInfo() {
    this.setSessionInfo(null);
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[GameSocket] Network back online, reconnecting immediately...');
      this.reconnectImmediate();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (!this.connected && !this.isConnecting) {
          console.log('[GameSocket] App visible, checking connection...');
          this.reconnectImmediate();
        }
      }
    });
  }

  private lastMessageTime: number = Date.now();

  public reconnectImmediate() {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.connect();
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.isConnecting = true;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.missedPings = 0;
        this.lastMessageTime = Date.now();
        clearTimeout(this.reconnectTimer);

        // Heartbeat ping-pong tolérant (toutes les 4s)
        this.startHeartbeat();

        // Si une session active existe, reconnexion transparente immédiate en tâche de fond
        const activeSession = this.getSessionInfo();
        if (activeSession && activeSession.roomId) {
          console.log('[GameSocket] Re-attaching to session:', activeSession);
          try {
            this.ws?.send(
              JSON.stringify({
                type: 'RECONNECT_SESSION',
                ...activeSession,
              })
            );
          } catch {}
        }

        // Vider la file d'attente des messages
        while (this.pendingQueue.length > 0) {
          const item = this.pendingQueue.shift();
          try {
            this.ws?.send(JSON.stringify(item));
          } catch {}
        }

        this.dispatch('connect', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          // Tout paquet reçu (coup, timer tick, réaction, pong) prouve que la connexion est 100% active
          this.missedPings = 0;
          this.lastMessageTime = Date.now();

          const data = JSON.parse(event.data);
          const eventType = data.type || data.event;

          if (eventType === 'pong') {
            return;
          }

          if (eventType) {
            this.dispatch(eventType, data);
            if (eventType.toUpperCase() !== eventType) {
              this.dispatch(eventType.toUpperCase(), data);
            }
          }
        } catch (e) {
          console.error('[GameSocket] Parse error', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
        this.dispatch('disconnect', {});
        clearTimeout(this.reconnectTimer);
        // Reconnexion silencieuse immédiate en arrière-plan (400ms)
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 400);
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
      };
    } catch (e) {
      console.error('[GameSocket] init error', e);
      this.isConnecting = false;
      this.stopHeartbeat();
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, 1000);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.missedPings = 0;
    this.lastMessageTime = Date.now();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const timeSinceLastMessage = Date.now() - this.lastMessageTime;
        // On n'incrémente les pings manqués que si aucun message n'a été reçu depuis plus de 3.8s
        if (timeSinceLastMessage >= 3800) {
          this.missedPings++;
        } else {
          this.missedPings = 0;
        }

        // Tolérance étendue : 6 tentatives manquées consécutives (~24s de silence total)
        // avant de forcer une reconnexion
        if (this.missedPings >= 6) {
          console.warn('[GameSocket] Connexion muette depuis >20s, reconnexion silencieuse...');
          this.reconnectImmediate();
          return;
        }

        try {
          this.ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
        } catch {
          this.reconnectImmediate();
        }
      }
    }, 4000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public on(event: string, handler: SocketEventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  public off(event: string, handler?: SocketEventHandler) {
    if (!handler) {
      this.listeners.delete(event);
      return;
    }
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit(event: string, data: any = {}) {
    const payload = {
      type: event,
      event,
      ...data,
    };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      this.pendingQueue.push(payload);
      this.connect();
    }
  }

  private dispatch(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (err) {
          console.error(`[GameSocket] Handler error for event ${event}`, err);
        }
      });
    }
  }
}

export const socket = new GameSocket();
