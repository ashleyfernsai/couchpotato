import { useEffect, useRef, useCallback, useState } from 'react';
import type { Socket } from 'socket.io-client';

interface UseSyncOptions {
  socket: Socket | null;
  onVideoLoad?: (url: string, type: string) => void;
  getPlayerTime?: () => number;
  seekPlayer?: (time: number) => void;
  playPlayer?: () => void;
  pausePlayer?: () => void;
}

export function useVideoSync({
  socket,
  onVideoLoad,
  getPlayerTime,
  seekPlayer,
  playPlayer,
  pausePlayer,
}: UseSyncOptions) {
  const [partnerBuffering, setPartnerBuffering] = useState(false);
  const [syncDrift, setSyncDrift] = useState(0);
  const isRemoteAction = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Listen for partner events ──
  useEffect(() => {
    if (!socket) return;

    const handleVideoLoad = (data: { url: string; type: string }) => {
      onVideoLoad?.(data.url, data.type);
    };

    const handleSyncEvent = (data: {
      action: string;
      timestamp: number;
      clientTime: number;
      serverTime: number;
    }) => {
      isRemoteAction.current = true;

      const latency = (Date.now() - data.serverTime) / 2;
      const adjustedTime = data.timestamp + latency / 1000;

      if (data.action === 'seek' || data.action === 'play') {
        seekPlayer?.(adjustedTime);
      }

      if (data.action === 'play') {
        playPlayer?.();
      } else if (data.action === 'pause') {
        pausePlayer?.();
        seekPlayer?.(data.timestamp);
      }

      setTimeout(() => {
        isRemoteAction.current = false;
      }, 100);
    };

    const handleHeartbeat = (data: {
      currentTime: number;
      isPlaying: boolean;
      serverTime: number;
    }) => {
      const myTime = getPlayerTime?.() ?? 0;
      const drift = Math.abs(myTime - data.currentTime);
      setSyncDrift(drift);

      // Auto re-sync if drift > 1 second
      if (drift > 1 && data.isPlaying) {
        const latency = (Date.now() - data.serverTime) / 2;
        seekPlayer?.(data.currentTime + latency / 1000);
      }
    };

    const handlePartnerBuffering = (data: { isBuffering: boolean }) => {
      setPartnerBuffering(data.isBuffering);
    };

    socket.on('video-load', handleVideoLoad);
    socket.on('sync-event', handleSyncEvent);
    socket.on('sync-heartbeat', handleHeartbeat);
    socket.on('partner-buffering', handlePartnerBuffering);

    return () => {
      socket.off('video-load', handleVideoLoad);
      socket.off('sync-event', handleSyncEvent);
      socket.off('sync-heartbeat', handleHeartbeat);
      socket.off('partner-buffering', handlePartnerBuffering);
    };
  }, [socket, onVideoLoad, getPlayerTime, seekPlayer, playPlayer, pausePlayer]);

  // ── Heartbeat (every 5s) ──
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (!socket) return;
      const currentTime = getPlayerTime?.() ?? 0;
      socket.emit('sync-heartbeat', {
        currentTime,
        isPlaying: true,
        clientTime: Date.now(),
      });
    }, 5000);
  }, [socket, getPlayerTime]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopHeartbeat();
  }, [stopHeartbeat]);

  // ── Emit control events ──
  const emitPlay = useCallback(
    (time: number) => {
      if (isRemoteAction.current || !socket) return;
      socket.emit('sync-event', {
        action: 'play',
        timestamp: time,
        clientTime: Date.now(),
      });
      startHeartbeat();
    },
    [socket, startHeartbeat]
  );

  const emitPause = useCallback(
    (time: number) => {
      if (isRemoteAction.current || !socket) return;
      socket.emit('sync-event', {
        action: 'pause',
        timestamp: time,
        clientTime: Date.now(),
      });
      stopHeartbeat();
    },
    [socket, stopHeartbeat]
  );

  const emitSeek = useCallback(
    (time: number) => {
      if (isRemoteAction.current || !socket) return;
      socket.emit('sync-event', {
        action: 'seek',
        timestamp: time,
        clientTime: Date.now(),
      });
    },
    [socket]
  );

  const emitLoadVideo = useCallback(
    (url: string, type: string) => {
      if (!socket) return;
      socket.emit('video-load', { url, type });
    },
    [socket]
  );

  const emitBuffering = useCallback(
    (isBuffering: boolean) => {
      if (!socket) return;
      socket.emit('buffering', { isBuffering });
    },
    [socket]
  );

  return {
    partnerBuffering,
    syncDrift,
    emitPlay,
    emitPause,
    emitSeek,
    emitLoadVideo,
    emitBuffering,
    isRemoteAction,
  };
}
