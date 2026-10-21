// WebSocket helper for Kuizila Live Sessions

export class KuizilaSocket {

  constructor(sessionCode, role, participantId = null, displayName = '', onEvent = null) {
    this.sessionCode = sessionCode ? sessionCode.toUpperCase() : '';
    this.role = role;
    this.participantId = participantId;
    this.displayName = displayName;
    this.onEvent = onEvent;
    this.ws = null;
    this.isClosedManually = false;
    this.reconnectAttempts = 0;
  }

  connect() {
    this.isClosedManually = false;
    const query = new URLSearchParams();
    if (this.participantId) query.append('participant_id', this.participantId);
    if (this.displayName) query.append('display_name', this.displayName);

    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    let wsUrl = '';
    if (apiBase) {
      const wsProtocol = apiBase.startsWith('https') ? 'wss:' : 'ws:';
      const cleanHost = apiBase.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      wsUrl = `${wsProtocol}//${cleanHost}/ws/session/${this.sessionCode}/${this.role}?${query.toString()}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws/session/${this.sessionCode}/${this.role}?${query.toString()}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[Kuizila WS] Connected to session ${this.sessionCode} as ${this.role}`);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (this.onEvent) {
            this.onEvent(payload);
          }
        } catch (err) {
          console.error('[Kuizila WS] Failed to parse message', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[Kuizila WS] Connection closed');
        if (!this.isClosedManually && this.reconnectAttempts < 5) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 2000);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[Kuizila WS] Error:', err);
      };
    } catch (e) {
      console.error('[Kuizila WS] Init failed:', e);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  disconnect() {
    this.isClosedManually = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const LoomiSocket = KuizilaSocket;
