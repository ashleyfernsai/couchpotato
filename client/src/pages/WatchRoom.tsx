import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useVideoSync } from '../hooks/useVideoSync';
import { useWebRTC } from '../hooks/useWebRTC';
import { useChat } from '../hooks/useChat';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import VideoCall from '../components/VideoCall/VideoCall';
import ChatPanel from '../components/Chat/ChatPanel';
import type { VideoSourceType } from '../types';

type MobileTab = 'call' | 'chat';

export default function WatchRoom() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, status } = useSocket();

  const state = location.state as {
    nickname?: string;
    partnerNickname?: string;
    isHost?: boolean;
    videoState?: any;
    chatHistory?: any;
  } | null;

  const isHost = state?.isHost ?? true;

  const [partnerNickname, setPartnerNickname] = useState(state?.partnerNickname || '');
  const [partnerConnected, setPartnerConnected] = useState(!!state?.partnerNickname);
  const [mobileTab, setMobileTab] = useState<MobileTab>('call');

  // Player control refs
  const playerTimeRef = useRef<() => number>(() => 0);
  const playerSeekRef = useRef<(t: number) => void>(() => {});
  const playerPlayRef = useRef<() => void>(() => {});
  const playerPauseRef = useRef<() => void>(() => {});

  // Video source state
  const [videoUrl, setVideoUrl] = useState(state?.videoState?.url || '');
  const [videoType, setVideoType] = useState<VideoSourceType>(state?.videoState?.type || 'none');

  // ── Hooks ──
  const sync = useVideoSync({
    socket,
    onVideoLoad: useCallback((url: string, type: string) => {
      setVideoUrl(url);
      setVideoType(type as VideoSourceType);
    }, []),
    getPlayerTime: useCallback(() => playerTimeRef.current(), []),
    seekPlayer: useCallback((t: number) => playerSeekRef.current(t), []),
    playPlayer: useCallback(() => playerPlayRef.current(), []),
    pausePlayer: useCallback(() => playerPauseRef.current(), []),
  });

  const webrtc = useWebRTC(socket, isHost);
  const chat = useChat(socket);

  // ── Load chat history from join ──
  useEffect(() => {
    if (state?.chatHistory) {
      chat.loadHistory(state.chatHistory);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Partner events ──
  useEffect(() => {
    if (!socket) return;

    const handlePartnerJoined = (data: { nickname: string }) => {
      setPartnerNickname(data.nickname);
      setPartnerConnected(true);
      // Host starts call when partner joins
      if (isHost) {
        webrtc.startCall();
      }
    };

    const handlePartnerLeft = () => {
      setPartnerConnected(false);
    };

    socket.on('partner-joined', handlePartnerJoined);
    socket.on('partner-left', handlePartnerLeft);

    return () => {
      socket.off('partner-joined', handlePartnerJoined);
      socket.off('partner-left', handlePartnerLeft);
    };
  }, [socket, isHost, webrtc.startCall]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guest: start call immediately (host is already in room) ──
  useEffect(() => {
    if (!isHost && partnerConnected && socket) {
      webrtc.startCall();
    }
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Leave room ──
  const handleLeave = () => {
    socket?.emit('leave-room');
    webrtc.endCall();
    navigate('/');
  };

  // ── Redirect if no state (direct URL access) ──
  useEffect(() => {
    if (!state?.nickname) {
      navigate(`/join/${code}`);
    }
  }, [state, code, navigate]);

  if (!state?.nickname) return null;

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-primary)]">
      {/* ── Top Bar ── */}
      <header className="glass-strong flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-subtle)] shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-lg">🥔</span>
          <span className="font-semibold text-sm text-[var(--color-text-primary)]">
            CouchPotato
          </span>
          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-lg">
            {code}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`status-dot ${partnerConnected ? 'online' : status === 'connected' ? 'connecting' : 'offline'}`} />
            <span className="text-[var(--color-text-muted)] hidden sm:inline">
              {partnerConnected
                ? `${partnerNickname} connected`
                : 'Waiting for partner...'}
            </span>
          </div>

          {/* Sync Indicator */}
          {videoUrl && (
            <div className="flex items-center gap-1 text-xs">
              <span className={sync.syncDrift < 0.5 ? 'text-[var(--color-success)]' : sync.syncDrift < 2.5 ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'}>
                ●
              </span>
              <span className="text-[var(--color-text-muted)] hidden sm:inline">
                {sync.syncDrift < 0.5 ? 'In sync' : `Drift: ${sync.syncDrift.toFixed(1)}s`}
              </span>
            </div>
          )}

          <button
            id="btn-leave"
            onClick={handleLeave}
            className="btn-icon danger text-sm"
            title="Leave room"
          >
            ✕
          </button>
        </div>
      </header>

      {/* ── Main Content — Desktop: 3 columns, Mobile: stacked ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Video Player Panel */}
        <div className="flex-1 min-h-0 flex flex-col lg:min-w-0">
          <VideoPlayer
            videoUrl={videoUrl}
            videoType={videoType}
            onLoadVideo={(url, type) => {
              setVideoUrl(url);
              setVideoType(type);
              sync.emitLoadVideo(url, type);
            }}
            onPlay={(time) => sync.emitPlay(time)}
            onPause={(time) => sync.emitPause(time)}
            onSeek={(time) => sync.emitSeek(time)}
            onBuffering={(b) => sync.emitBuffering(b)}
            partnerBuffering={sync.partnerBuffering}
            playerTimeRef={playerTimeRef}
            playerSeekRef={playerSeekRef}
            playerPlayRef={playerPlayRef}
            playerPauseRef={playerPauseRef}
            isRemoteAction={sync.isRemoteAction}
          />
        </div>

        {/* ── Right Panel — Desktop: 2 stacked, Mobile: tabbed ── */}
        <div className="lg:w-[380px] flex flex-col border-t lg:border-t-0 lg:border-l border-[var(--color-border-subtle)] min-h-0">
          {/* Mobile Tab Bar */}
          <div className="flex lg:hidden border-b border-[var(--color-border-subtle)] shrink-0">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mobileTab === 'call'
                  ? 'text-[var(--color-accent-primary)] border-b-2 border-[var(--color-accent-primary)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
              onClick={() => setMobileTab('call')}
            >
              📹 Video Call
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mobileTab === 'chat'
                  ? 'text-[var(--color-accent-primary)] border-b-2 border-[var(--color-accent-primary)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
              onClick={() => setMobileTab('chat')}
            >
              💬 Chat
            </button>
          </div>

          {/* Video Call Section */}
          <div className={`lg:h-[45%] shrink-0 border-b border-[var(--color-border-subtle)] ${
            mobileTab === 'call' ? 'flex' : 'hidden lg:flex'
          } flex-col min-h-0`}>
            <VideoCall
              localStream={webrtc.localStream}
              remoteStream={webrtc.remoteStream}
              isCameraOn={webrtc.isCameraOn}
              isMicOn={webrtc.isMicOn}
              onToggleCamera={webrtc.toggleCamera}
              onToggleMic={webrtc.toggleMic}
              connectionState={webrtc.connectionState}
              partnerNickname={partnerNickname}
              partnerConnected={partnerConnected}
            />
          </div>

          {/* Chat Section */}
          <div className={`flex-1 ${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          } flex-col min-h-0`}>
            <ChatPanel
              messages={chat.messages}
              onSendMessage={chat.sendMessage}
              onTyping={chat.emitTyping}
              onStopTyping={chat.emitStopTyping}
              partnerTyping={chat.partnerTyping}
              mySocketId={socket?.id || ''}
              partnerNickname={partnerNickname}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
