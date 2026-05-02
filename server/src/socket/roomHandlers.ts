import { Server, Socket } from 'socket.io';
import { roomStore } from '../services/roomStore.js';
import { CreateRoomPayload, JoinRoomPayload } from '../types/index.js';

export function registerRoomHandlers(io: Server, socket: Socket): void {
  // ── Create Room ──
  socket.on('create-room', (payload: CreateRoomPayload, callback: (res: any) => void) => {
    const room = roomStore.createRoom();
    const joined = roomStore.joinRoom(room.code, socket.id, payload.nickname);
    if (!joined) {
      callback({ error: 'Failed to create room' });
      return;
    }

    socket.join(room.code);
    callback({
      success: true,
      code: room.code,
      nickname: payload.nickname,
    });

    console.log(`[Room] ${payload.nickname} created room ${room.code}`);
  });

  // ── Join Room ──
  socket.on('join-room', (payload: JoinRoomPayload, callback: (res: any) => void) => {
    const code = payload.code.toUpperCase();
    const existing = roomStore.getRoom(code);

    if (!existing) {
      callback({ error: 'Room not found. Check the code and try again.' });
      return;
    }

    if (existing.members.size >= 2) {
      callback({ error: 'Room is full. Only two people can join a room.' });
      return;
    }

    const room = roomStore.joinRoom(code, socket.id, payload.nickname);
    if (!room) {
      callback({ error: 'Failed to join room' });
      return;
    }

    socket.join(code);

    // Send current video state to the joiner
    callback({
      success: true,
      code,
      nickname: payload.nickname,
      videoState: room.video,
      chatHistory: room.chatHistory,
    });

    // Notify partner that someone joined
    socket.to(code).emit('partner-joined', {
      nickname: payload.nickname,
      memberCount: room.members.size,
    });

    console.log(`[Room] ${payload.nickname} joined room ${code}`);
  });

  // ── Leave Room ──
  socket.on('leave-room', () => {
    handleLeave(io, socket);
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    handleLeave(io, socket);
  });
}

function handleLeave(io: Server, socket: Socket): void {
  const result = roomStore.leaveRoom(socket.id);
  if (!result) return;

  const { room, nickname } = result;
  socket.leave(room.code);

  // Notify remaining partner
  io.to(room.code).emit('partner-left', {
    nickname,
    memberCount: room.members.size,
  });

  console.log(`[Room] ${nickname} left room ${room.code}`);
}
