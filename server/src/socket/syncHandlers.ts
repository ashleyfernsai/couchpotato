import { Server, Socket } from 'socket.io';
import { roomStore } from '../services/roomStore.js';
import { SyncEventPayload, VideoLoadPayload, HeartbeatPayload } from '../types/index.js';

export function registerSyncHandlers(io: Server, socket: Socket): void {
  // ── Load Video ──
  socket.on('video-load', (payload: VideoLoadPayload) => {
    const room = roomStore.getRoomBySocket(socket.id);
    if (!room) return;

    roomStore.updateVideoState(room.code, {
      url: payload.url,
      type: payload.type,
      isPlaying: false,
      currentTime: 0,
    });

    // Broadcast to partner
    socket.to(room.code).emit('video-load', {
      url: payload.url,
      type: payload.type,
      serverTime: Date.now(),
    });

    roomStore.updateActivity(room.code);
    console.log(`[Sync] Video loaded in ${room.code}: ${payload.type} — ${payload.url.substring(0, 60)}`);
  });

  // ── Play / Pause / Seek ──
  socket.on('sync-event', (payload: SyncEventPayload) => {
    const room = roomStore.getRoomBySocket(socket.id);
    if (!room) return;

    // Update room video state
    roomStore.updateVideoState(room.code, {
      isPlaying: payload.action === 'play',
      currentTime: payload.timestamp,
    });

    // Relay to partner with server timestamp for latency calculation
    socket.to(room.code).emit('sync-event', {
      ...payload,
      serverTime: Date.now(),
    });

    roomStore.updateActivity(room.code);
  });

  // ── Heartbeat (position check) ──
  socket.on('sync-heartbeat', (payload: HeartbeatPayload) => {
    const room = roomStore.getRoomBySocket(socket.id);
    if (!room) return;

    // Update stored position
    roomStore.updateVideoState(room.code, {
      currentTime: payload.currentTime,
      isPlaying: payload.isPlaying,
    });

    // Relay to partner for drift checking
    socket.to(room.code).emit('sync-heartbeat', {
      ...payload,
      serverTime: Date.now(),
    });

    roomStore.updateActivity(room.code);
  });

  // ── Buffering State ──
  socket.on('buffering', (payload: { isBuffering: boolean }) => {
    const room = roomStore.getRoomBySocket(socket.id);
    if (!room) return;

    roomStore.setBuffering(socket.id, payload.isBuffering);
    socket.to(room.code).emit('partner-buffering', {
      isBuffering: payload.isBuffering,
    });
  });
}
