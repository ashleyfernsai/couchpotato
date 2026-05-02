import { Server, Socket } from 'socket.io';
import { roomStore } from '../services/roomStore.js';

export function registerSignalingHandlers(io: Server, socket: Socket): void {
  // ── WebRTC Offer ──
  socket.on('webrtc-offer', (data: RTCSessionDescriptionInit) => {
    const partnerId = roomStore.getPartnerSocketId(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('webrtc-offer', data);
    }
  });

  // ── WebRTC Answer ──
  socket.on('webrtc-answer', (data: RTCSessionDescriptionInit) => {
    const partnerId = roomStore.getPartnerSocketId(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('webrtc-answer', data);
    }
  });

  // ── ICE Candidate ──
  socket.on('ice-candidate', (data: RTCIceCandidateInit) => {
    const partnerId = roomStore.getPartnerSocketId(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('ice-candidate', data);
    }
  });
}
