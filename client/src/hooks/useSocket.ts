import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, disconnectSocket } from '../services/socket';
import type { ConnectionStatus } from '../types';
import type { Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  // Expose socket as state so consumers re-render when it becomes available
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      console.log('[Socket] Connected:', s.id);
      setStatus('connected');
    });

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setStatus('disconnected');
    });

    s.on('reconnect_attempt', (attempt: number) => {
      console.log(`[Socket] Reconnecting... attempt ${attempt}`);
      setStatus('reconnecting');
    });

    s.on('reconnect', () => {
      console.log('[Socket] Reconnected');
      setStatus('connected');
    });

    s.on('connect_error', (err: Error) => {
      console.error('[Socket] Connection error:', err.message);
      setStatus('reconnecting');
    });

    if (!s.connected) {
      setStatus('connecting');
      s.connect();
    } else {
      setStatus('connected');
    }

    return () => {
      s.off('connect');
      s.off('disconnect');
      s.off('reconnect_attempt');
      s.off('reconnect');
      s.off('connect_error');
    };
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
    socketRef.current = null;
    setSocket(null);
    setStatus('disconnected');
  }, []);

  return {
    socket,
    status,
    disconnect,
  };
}
