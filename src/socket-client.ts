import {
  DESTREAM_API_WS,
  DESTREAM_OVERLAY_BASE,
  PING_INTERVAL_MS,
  CONNECTION_TIMEOUT_MS,
  RECONNECT_DELAY_MS,
} from './constants';
import { pushDonation } from './dashboard-feed';

type WsConnection = Awaited<ReturnType<(typeof network.websocket)['connect']>>;

const RECORD_SEPARATOR = String.fromCharCode(30);

type DestreamMessage = {
  error?: string;
  type?: number;
  target?: string;
  arguments?: Record<string, any>[];
};

type DestreamDonateItem = {
  id: string;
  username: string;
  sourceCurrencyId: string;
  sourceCurrencyAmount: number;
  description?: string;
};

export type ConnectionState = 'offline' | 'connecting' | 'online' | 'error';

export class DestreamSocketClient {
  private connection: WsConnection | null = null;
  private destroyed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private lastMessageTime = 0;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private overlayId = '';
  private _state: ConnectionState = 'offline';
  private onStateChange: ((state: ConnectionState) => void) | null = null;

  get state(): ConnectionState {
    return this._state;
  }

  setOnStateChange(handler: (state: ConnectionState) => void) {
    this.onStateChange = handler;
  }

  private setState(state: ConnectionState) {
    this._state = state;
    this.onStateChange?.(state);
  }

  private parseMessage(raw: string): DestreamMessage | null {
    try {
      const data = raw.replace(RECORD_SEPARATOR, '');
      return JSON.parse(data) as DestreamMessage;
    } catch {
      return null;
    }
  }

  private sendObject(data: Record<string, unknown>) {
    const conn = this.connection;
    if (!conn || conn.state !== 1) return;
    conn.Send(`${JSON.stringify(data)}${RECORD_SEPARATOR}`);
  }

  private handleMessage(raw: string) {
    const msg = this.parseMessage(raw);
    if (!msg) return;

    if (msg.error) {
      console.error('[Destream] Server error:', msg.error);
      this.setState('error');
      this.destroyConnection(this.connection);
      this.connection = null;
      this.scheduleReconnect();
      return;
    }

    if (msg.type === 1 && msg.target === 'newDonationsReceived') {
      const donateData = msg.arguments?.[0];
      if (!donateData) return;

      const donateItems: DestreamDonateItem[] = [
        ...(donateData.testData || []),
        ...(donateData.data || []),
      ];

      for (const item of donateItems) {
        if (
          item &&
          item.username &&
          item.sourceCurrencyId &&
          item.sourceCurrencyAmount
        ) {
          void pushDonation({
            id: item.id,
            username: item.username,
            sourceCurrencyId: item.sourceCurrencyId,
            sourceCurrencyAmount: item.sourceCurrencyAmount,
            description: item.description,
          });
        }
      }
    }
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.sendObject({ type: 6 });
    }, PING_INTERVAL_MS);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private startHealthCheck() {
    this.stopHealthCheck();
    this.lastMessageTime = Date.now();
    this.healthCheckTimer = setInterval(() => {
      if (Date.now() - this.lastMessageTime > CONNECTION_TIMEOUT_MS) {
        console.warn('[Destream] Health check failed, reconnecting');
        this.setState('error');
        this.destroyConnection(this.connection);
        this.connection = null;
        this.scheduleReconnect();
      }
    }, 5000);
  }

  private stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  get connected(): boolean {
    return !!(
      this.connection &&
      this.connection.state === 1 &&
      !this.destroyed
    );
  }

  async start(overlayId: string) {
    if (this.overlayId === overlayId && this.connected) return;

    this.stop();
    this.destroyed = false;
    this.overlayId = overlayId;
    this.setState('connecting');
    await this.doConnect();
  }

  stop() {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    this.stopHealthCheck();
    this.destroyConnection(this.connection);
    this.connection = null;
    this.setState('offline');
  }

  private async waitOpen(ws: WsConnection): Promise<void> {
    if (ws.state === 1) return;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket open timeout'));
      }, 15000);

      ws.On('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      if (ws.state === 1) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      ws.On('error', () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket error before open'));
      });
    });
  }

  private async doConnect() {
    if (this.destroyed || !this.overlayId) return;

    try {
      const url = `${DESTREAM_API_WS}?overlayid=${this.overlayId}`;
      const ws = await network.websocket.connect(url, {
        headers: {
          Origin: DESTREAM_OVERLAY_BASE,
        },
      });

      if (this.destroyed) {
        ws.Destroy();
        return;
      }

      this.destroyConnection(this.connection);
      this.connection = ws;

      await this.waitOpen(ws);

      if (this.destroyed) {
        return;
      }

      ws.On('message', (raw: string) => {
        if (this.destroyed || this.connection !== ws) return;
        this.lastMessageTime = Date.now();
        this.handleMessage(raw);
      });

      ws.On('close', () => {
        if (!this.destroyed && this.connection === ws) {
          this.setState('offline');
          this.scheduleReconnect();
        }
      });

      ws.On('error', () => {
        // close will follow
      });

      this.sendObject({ protocol: 'json', version: 1 });
      this.lastMessageTime = Date.now();
      this.startPing();
      this.startHealthCheck();
      this.setState('online');
    } catch {
      this.setState('error');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.destroyed || this.reconnectTimer) return;

    this.stopPing();
    this.stopHealthCheck();
    this.destroyConnection(this.connection);
    this.connection = null;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.setState('connecting');
      void this.doConnect();
    }, RECONNECT_DELAY_MS);
  }

  private destroyConnection(connection: WsConnection | null) {
    if (!connection) return;
    try {
      connection.Destroy();
    } catch {
      // ignore
    }
  }
}
