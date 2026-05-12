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

// How long to suppress local events after receiving a remote action
const REMOTE_ACTION_GUARD_MS = 500;
// Drift threshold before auto-correcting (seconds)
const DRIFT_THRESHOLD = 2.5;

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
  const isPlayingRef = useRef(false);

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

      if (data.action === 'seek') {
        // Seek only — don't change play/pause state
        seekPlayer?.(adjustedTime);
      } else if (data.action === 'play') {
        // Seek to synced position then play
        seekPlayer?.(adjustedTime);
        playPlayer?.();
        isPlayingRef.current = true;
      } else if (data.action === 'pause') {
        pausePlayer?.();
        seekPlayer?.(data.timestamp);
        isPlayingRef.current = false;
      }

      setTimeout(() => {
        isRemoteAction.current = false;
      }, REMOTE_ACTION_GUARD_MS);
    };

    const handleHeartbeat = (data: {
      currentTime: number;
      isPlaying: boolean;
      serverTime: number;
    }) => {
      const myTime = getPlayerTime?.() ?? 0;
      const drift = Math.abs(myTime - data.currentTime);
      setSyncDrift(drift);

      // Only auto-correct if drift is significant AND video is actively playing
      // Use a higher threshold to avoid interrupting playback constantly
      if (drift > DRIFT_THRESHOLD && data.isPlaying && isPlayingRef.current) {
        const latency = (Date.now() - data.serverTime) / 2;
        isRemoteAction.current = true;
        seekPlayer?.(data.currentTime + latency / 1000);
        setTimeout(() => {
          isRemoteAction.current = false;
        }, REMOTE_ACTION_GUARD_MS);
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

  // ── Heartbeat (every 8s — less aggressive) ──
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    isPlayingRef.current = true;
    heartbeatRef.current = setInterval(() => {
      if (!socket) return;
      const currentTime = getPlayerTime?.() ?? 0;
      socket.emit('sync-heartbeat', {
        currentTime,
        isPlaying: true,
        clientTime: Date.now(),
      });
    }, 8000);
  }, [socket, getPlayerTime]);

  const stopHeartbeat = useCallback(() => {
    isPlayingRef.current = false;
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
      socket.emit('sync-event', { action: 'play', timestamp: time, clientTime: Date.now() });
      startHeartbeat();
    },
    [socket, startHeartbeat]
  );

  const emitPause = useCallback(
    (time: number) => {
      if (isRemoteAction.current || !socket) return;
      socket.emit('sync-event', { action: 'pause', timestamp: time, clientTime: Date.now() });
      stopHeartbeat();
    },
    [socket, stopHeartbeat]
  );

  const emitSeek = useCallback(
    (time: number) => {
      if (isRemoteAction.current || !socket) return;
      socket.emit('sync-event', { action: 'seek', timestamp: time, clientTime: Date.now() });
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
