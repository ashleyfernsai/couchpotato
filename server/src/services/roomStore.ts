import { Room, VideoState } from '../types/index.js';
import { generateRoomCode } from './codeGenerator.js';

const ROOM_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // check every minute

class RoomStore {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map(); // socketId → roomCode

  constructor() {
    // Periodically clean up expired rooms
    setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  createRoom(): Room {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code)); // ensure uniqueness

    const defaultVideo: VideoState = {
      url: '',
      type: 'none',
      isPlaying: false,
      currentTime: 0,
      lastUpdated: Date.now(),
    };

    const room: Room = {
      code,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      members: new Map(),
      video: defaultVideo,
      chatHistory: [],
    };

    this.rooms.set(code, room);
    console.log(`[RoomStore] Room created: ${code}`);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  joinRoom(code: string, socketId: string, nickname: string): Room | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return undefined;

    // Max 2 members for MVP
    if (room.members.size >= 2 && !room.members.has(socketId)) {
      return undefined;
    }

    room.members.set(socketId, {
      socketId,
      nickname,
      joinedAt: Date.now(),
      isBuffering: false,
    });
    room.lastActivity = Date.now();
    this.socketToRoom.set(socketId, room.code);

    console.log(`[RoomStore] ${nickname} (${socketId}) joined room ${code}. Members: ${room.members.size}`);
    return room;
  }

  leaveRoom(socketId: string): { room: Room; nickname: string } | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;

    const room = this.rooms.get(code);
    if (!room) return undefined;

    const member = room.members.get(socketId);
    const nickname = member?.nickname ?? 'Unknown';

    room.members.delete(socketId);
    room.lastActivity = Date.now();
    this.socketToRoom.delete(socketId);

    console.log(`[RoomStore] ${nickname} (${socketId}) left room ${code}. Members: ${room.members.size}`);

    // If room is empty, let it expire naturally via cleanup
    return { room, nickname };
  }

  getRoomBySocket(socketId: string): Room | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  updateActivity(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      room.lastActivity = Date.now();
    }
  }

  updateVideoState(code: string, updates: Partial<VideoState>): void {
    const room = this.rooms.get(code);
    if (room) {
      Object.assign(room.video, updates, { lastUpdated: Date.now() });
      room.lastActivity = Date.now();
    }
  }

  setBuffering(socketId: string, isBuffering: boolean): void {
    const room = this.getRoomBySocket(socketId);
    if (!room) return;
    const member = room.members.get(socketId);
    if (member) {
      member.isBuffering = isBuffering;
    }
  }

  getPartnerSocketId(socketId: string): string | undefined {
    const room = this.getRoomBySocket(socketId);
    if (!room) return undefined;
    for (const [id] of room.members) {
      if (id !== socketId) return id;
    }
    return undefined;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [code, room] of this.rooms) {
      if (room.members.size === 0 && now - room.lastActivity > ROOM_EXPIRY_MS) {
        this.rooms.delete(code);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[RoomStore] Cleaned up ${cleaned} expired rooms. Active: ${this.rooms.size}`);
    }
  }

  getStats() {
    return {
      totalRooms: this.rooms.size,
      activeConnections: this.socketToRoom.size,
    };
  }
}

// Singleton export
export const roomStore = new RoomStore();
