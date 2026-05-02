import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket, disconnectSocket } from '../services/socket';
import type { ConnectionStatus } from '../types';
import type { Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setStatus('disconnected');
    });

    socket.on('reconnect_attempt', (attempt: number) => {
      console.log(`[Socket] Reconnecting... attempt ${attempt}`);
      setStatus('reconnecting');
    });

    socket.on('reconnect', () => {
      console.log('[Socket] Reconnected');
      setStatus('connected');
    });

    socket.on('connect_error', (err: Error) => {
      console.error('[Socket] Connection error:', err.message);
      setStatus('reconnecting');
    });

    if (!socket.connected) {
      setStatus('connecting');
      socket.connect();
    } else {
      setStatus('connected');
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect_attempt');
      socket.off('reconnect');
      socket.off('connect_error');
    };
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
    socketRef.current = null;
    setStatus('disconnected');
  }, []);

  return {
    socket: socketRef.current,
    status,
    disconnect,
  };
}
