import { useEffect, useRef } from 'react';

interface Props {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCameraOn: boolean;
  isMicOn: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  connectionState: RTCPeerConnectionState | 'new';
  partnerNickname: string;
  partnerConnected: boolean;
}

export default function VideoCall({
  localStream,
  remoteStream,
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
  connectionState,
  partnerNickname,
  partnerConnected,
}: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting' || connectionState === 'new';

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)]">
      {/* Video Feeds */}
      <div className="flex-1 flex flex-col gap-1 p-1 min-h-0">
        {/* Remote Feed (Partner) */}
        <div className="flex-1 relative rounded-xl overflow-hidden bg-[var(--color-bg-elevated)] min-h-0">
          {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[var(--color-bg-surface)] flex items-center justify-center text-2xl mx-auto mb-2">
                  {partnerConnected ? '😊' : '👤'}
                </div>
                <p className="text-[var(--color-text-muted)] text-xs">
                  {partnerConnected
                    ? partnerNickname || 'Partner'
                    : 'Waiting for partner...'}
                </p>
                {partnerConnected && isConnecting && (
                  <p className="text-[var(--color-warning)] text-xs mt-1">Connecting video...</p>
                )}
              </div>
            </div>
          )}
          {/* Partner name badge */}
          {partnerConnected && (
            <div className="absolute bottom-2 left-2 glass rounded-lg px-2 py-1 text-xs text-[var(--color-text-secondary)]">
              {partnerNickname || 'Partner'}
            </div>
          )}
        </div>

        {/* Local Feed (Self) */}
        <div className="h-[35%] relative rounded-xl overflow-hidden bg-[var(--color-bg-elevated)] shrink-0">
          {localStream && isCameraOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-[var(--color-bg-surface)] flex items-center justify-center text-lg mx-auto mb-1">
                  {isCameraOn ? '📷' : '🚫'}
                </div>
                <p className="text-[var(--color-text-muted)] text-xs">
                  {isCameraOn ? 'Starting camera...' : 'Camera off'}
                </p>
              </div>
            </div>
          )}
          {/* Self name badge */}
          <div className="absolute bottom-2 left-2 glass rounded-lg px-2 py-1 text-xs text-[var(--color-text-secondary)]">
            You
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-center gap-3 p-3 border-t border-[var(--color-border-subtle)]">
        <button
          id="btn-toggle-camera"
          onClick={onToggleCamera}
          className={`btn-icon ${isCameraOn ? '' : 'active'}`}
          title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraOn ? '📷' : '🚫'}
        </button>
        <button
          id="btn-toggle-mic"
          onClick={onToggleMic}
          className={`btn-icon ${isMicOn ? '' : 'active'}`}
          title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicOn ? '🎙️' : '🔇'}
        </button>

        {/* Connection quality indicator */}
        <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 ml-2">
          <div className={`status-dot ${isConnected ? 'online' : isConnecting ? 'connecting' : 'offline'}`} />
          <span className="hidden sm:inline">
            {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
