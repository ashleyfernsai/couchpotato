import { Server, Socket } from 'socket.io';
import { roomStore } from '../services/roomStore.js';
import { ChatMessagePayload } from '../types/index.js';
import { generateMessageId } from '../services/codeGenerator.js';

export function registerChatHandlers(io: Server, socket: Socket): void {
  // ── Send Chat Message ──
  socket.on('chat-message', (payload: ChatMessagePayload) => {
    const room = roomStore.getRoomBySocket(socket.id);
    if (!room) return;

    const member = room.members.get(socket.id);
    if (!member) return;

    const message = {
      id: generateMessageId(),
      senderId: socket.id,
      senderName: member.nickname,
      content: payload.content,
      timestamp: Date.now(),
      type: payload.type,
    };

    // Store in session history
    room.chatHistory.push(message);

    // Cap history at 500 messages
    if (room.chatHistory.length > 500) {
      room.chatHistory = room.chatHistory.slice(-500);
    }

    // Broadcast to entire room (including sender for confirmation)
    io.to(room.code).emit('chat-message', message);
    roomStore.updateActivity(room.code);
  });

  // ── Typing Indicator ──
  socket.on('typing-start', () => {
    const room = roomStore.getRoomBySocket(socket.id);
    if (!room) return;

    const member = room.members.get(socket.id);
    socket.to(room.code).emit('partner-typing', {
      isTyping: true,
      nickname: member?.nickname,
    });
  });

  socket.on('typing-stop', () => {
    const room = roomStore.getRoomBySocket(socket.id);
    if (!room) return;

    socket.to(room.code).emit('partner-typing', {
      isTyping: false,
    });
  });
}
