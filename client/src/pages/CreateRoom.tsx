import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function CreateRoom() {
  const navigate = useNavigate();
  const { socket, status } = useSocket();
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState<'name' | 'waiting'>('name');
  const [copied, setCopied] = useState(false);
  const [displayedCode, setDisplayedCode] = useState('');
  const [error, setError] = useState('');

  // Animate code reveal letter by letter
  useEffect(() => {
    if (!roomCode) return;
    let i = 0;
    setDisplayedCode('');
    const interval = setInterval(() => {
      i++;
      setDisplayedCode(roomCode.slice(0, i));
      if (i >= roomCode.length) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [roomCode]);

  // Listen for partner joining
  useEffect(() => {
    if (!socket) return;
    const handlePartnerJoined = (data: { nickname: string }) => {
      navigate(`/room/${roomCode}`, {
        state: { nickname, partnerNickname: data.nickname, isHost: true },
      });
    };
    socket.on('partner-joined', handlePartnerJoined);
    return () => {
      socket.off('partner-joined', handlePartnerJoined);
    };
  }, [socket, roomCode, nickname, navigate]);

  const handleCreate = () => {
    if (!nickname.trim()) return;
    if (!socket || status !== 'connected') {
      setError('Connecting to server... please wait.');
      return;
    }

    socket.emit(
      'create-room',
      { nickname: nickname.trim() },
      (res: { success?: boolean; code?: string; error?: string }) => {
        if (res.error) {
          setError(res.error);
          return;
        }
        setRoomCode(res.code!);
        setStep('waiting');
      }
    );
  };

  const shareLink = `${window.location.origin}/join/${roomCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="gradient-bg min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-8 flex items-center gap-2 text-sm"
        >
          ← Back
        </button>

        {step === 'name' && (
          <div className="glass rounded-3xl p-8 sm:p-10" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎬</div>
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                Create a Room
              </h2>
              <p className="text-[var(--color-text-muted)] text-sm">
                Pick a nickname so your partner knows it's you
              </p>
            </div>

            <div className="space-y-4">
              <input
                id="input-nickname"
                type="text"
                className="input-field text-center text-lg"
                placeholder="Your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                maxLength={20}
                autoFocus
              />

              {error && (
                <p className="text-[var(--color-error)] text-sm text-center">{error}</p>
              )}

              <button
                id="btn-create"
                className="btn-primary w-full text-lg py-4"
                onClick={handleCreate}
                disabled={!nickname.trim()}
                style={{ opacity: nickname.trim() ? 1 : 0.5 }}
              >
                Create Room
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="glass rounded-3xl p-8 sm:p-10" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="text-center mb-8">
              <div className="text-5xl mb-4 animate-float">🥔</div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                Your room is ready!
              </h2>
              <p className="text-[var(--color-text-muted)] text-sm">
                Share this code with your partner
              </p>
            </div>

            {/* Room Code Display */}
            <div className="flex justify-center gap-2 mb-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-14 sm:w-14 sm:h-16 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-bold transition-all duration-300"
                  style={{
                    background: displayedCode[i]
                      ? 'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))'
                      : 'var(--color-bg-elevated)',
                    color: displayedCode[i] ? 'var(--color-bg-primary)' : 'transparent',
                    border: `2px solid ${displayedCode[i] ? 'var(--color-accent-primary)' : 'var(--color-border-subtle)'}`,
                    transform: displayedCode[i] ? 'scale(1)' : 'scale(0.9)',
                  }}
                >
                  {displayedCode[i] || '\u00b7'}
                </div>
              ))}
            </div>

            {/* Share Link */}
            <button
              id="btn-copy-link"
              className="btn-primary w-full mb-4"
              onClick={handleCopy}
            >
              {copied ? '\u2713 Copied!' : '\ud83d\udccb Copy Invite Link'}
            </button>

            <div className="text-center text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] rounded-xl p-3 mb-6 break-all">
              {shareLink}
            </div>

            {/* Waiting indicator */}
            <div className="flex items-center justify-center gap-3 text-[var(--color-text-secondary)]">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full" style={{ animation: 'typing-bounce 1.4s ease-in-out infinite' }} />
                <span className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full" style={{ animation: 'typing-bounce 1.4s ease-in-out 0.2s infinite' }} />
                <span className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full" style={{ animation: 'typing-bounce 1.4s ease-in-out 0.4s infinite' }} />
              </div>
              <span className="text-sm">Waiting for your partner to join...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
