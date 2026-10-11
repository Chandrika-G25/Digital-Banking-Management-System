import { getAuthToken } from './api';

class SecureBankWebSocket {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.statusListeners = new Set();
    this.status = 'disconnected'; // 'connecting', 'connected', 'disconnected'
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.isExplicitlyClosed = false;
  }

  connect() {
    const token = getAuthToken();
    if (!token) {
      this.setStatus('disconnected');
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.setStatus('connecting');

    let wsHost = window.location.host;
    let wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl = `${wsProtocol}//${window.location.host}/ws/notifications/?token=${encodeURIComponent(token)}`;

    if (import.meta.env.VITE_WS_URL) {
      const configured = import.meta.env.VITE_WS_URL.replace(/\/+$/, '');
      if (configured.startsWith('ws://') || configured.startsWith('wss://')) {
        wsUrl = `${configured}/ws/notifications/?token=${encodeURIComponent(token)}`;
      } else {
        wsHost = configured.replace(/^https?:\/\//, '');
        wsProtocol = configured.startsWith('https') ? 'wss:' : 'ws:';
        wsUrl = `${wsProtocol}//${wsHost}/ws/notifications/?token=${encodeURIComponent(token)}`;
      }
    } else if (import.meta.env.VITE_API_URL) {
      const apiUrl = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
      wsHost = apiUrl.replace(/^https?:\/\//, '');
      wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
      wsUrl = `${wsProtocol}//${wsHost}/ws/notifications/?token=${encodeURIComponent(token)}`;
    }

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.emit(payload.type, payload.data || payload);
          // Also emit to wildcards
          this.emit('*', payload);
        } catch {
          // Ignore unparseable frames
        }
      };

      this.socket.onerror = () => {
        // Handled in onclose
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        this.setStatus('disconnected');

        if (!this.isExplicitlyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
          this.reconnectAttempts++;
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        }
      };
    } catch {
      this.setStatus('disconnected');
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  setStatus(status) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
      }
    };
  }

  emit(eventType, data) {
    const set = this.listeners.get(eventType);
    if (set) {
      set.forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in WebSocket listener for ${eventType}:`, err);
        }
      });
    }
  }
}

export const wsService = new SecureBankWebSocket();
