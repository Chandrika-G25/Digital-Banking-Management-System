import React, { useState, useEffect } from 'react';
import { wsService } from '../services/websocket';

export default function ConnectionStatus() {
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    const unsub = wsService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsub();
  }, []);

  const isConnected = status === 'connected';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.25rem 0.65rem',
        borderRadius: 'var(--radius-full)',
        backgroundColor: isConnected ? 'var(--emerald-50)' : 'var(--slate-100)',
        border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.25)' : 'var(--slate-200)'}`,
        fontSize: '0.75rem',
        fontWeight: 600,
        color: isConnected ? 'var(--emerald-600)' : 'var(--slate-500)',
        transition: 'var(--transition)'
      }}
      title={`Real-time WebSocket: ${status.toUpperCase()}`}
    >
      <span className={`pulse-indicator ${isConnected ? 'online' : 'offline'}`} />
      <span>{isConnected ? 'Real-Time Active' : status === 'connecting' ? 'Connecting...' : 'Live Offline'}</span>
    </div>
  );
}
