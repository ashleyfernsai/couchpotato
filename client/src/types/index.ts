// ── Shared types for the CouchPotato client ──

export interface VideoState {
  url: string;
  type: 'youtube' | 'mp4' | 'hls' | 'none';
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'emoji-reaction';
}

export interface RoomState {
  code: string;
  nickname: string;
  partnerNickname: string | null;
  isConnected: boolean;
  partnerConnected: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type VideoSourceType = 'youtube' | 'mp4' | 'hls' | 'none';

export function detectVideoType(url: string): VideoSourceType {
  if (!url) return 'none';

  // YouTube
  if (
    url.includes('youtube.com/watch') ||
    url.includes('youtu.be/') ||
    url.includes('youtube.com/embed/')
  ) {
    return 'youtube';
  }

  // HLS
  if (url.endsWith('.m3u8') || url.includes('.m3u8?')) {
    return 'hls';
  }

  // MP4
  if (url.endsWith('.mp4') || url.includes('.mp4?')) {
    return 'mp4';
  }

  // Default attempt as mp4
  return 'mp4';
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isDRMProtected(url: string): boolean {
  const drmDomains = [
    'netflix.com',
    'disneyplus.com',
    'disney+',
    'primevideo.com',
    'amazon.com/gp/video',
    'hulu.com',
    'hbomax.com',
    'max.com',
    'peacocktv.com',
    'paramountplus.com',
  ];
  return drmDomains.some((domain) => url.toLowerCase().includes(domain));
}
