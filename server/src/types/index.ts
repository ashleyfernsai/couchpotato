// ── Shared types for the CouchPotato server ──

export interface RoomMember {
  socketId: string;
  nickname: string;
  joinedAt: number;
  isBuffering: boolean;
}

export interface VideoState {
  url: string;
  type: 'youtube' | 'mp4' | 'hls' | 'none';
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
}

export interface Room {
  code: string;
  createdAt: number;
  lastActivity: number;
  members: Map<string, RoomMember>;
  video: VideoState;
  chatHistory: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'emoji-reaction';
}

// ── Socket Event Payloads ──

export interface CreateRoomPayload {
  nickname: string;
}

export interface JoinRoomPayload {
  code: string;
  nickname: string;
}

export interface VideoLoadPayload {
  url: string;
  type: 'youtube' | 'mp4' | 'hls';
}

export interface SyncEventPayload {
  action: 'play' | 'pause' | 'seek';
  timestamp: number;     // position in the video (seconds)
  clientTime: number;    // Date.now() on the sender
}

export interface HeartbeatPayload {
  currentTime: number;   // current playback position
  isPlaying: boolean;
  clientTime: number;
}

export interface ChatMessagePayload {
  content: string;
  type: 'text' | 'emoji-reaction';
}

export interface WebRTCSignalPayload {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}
