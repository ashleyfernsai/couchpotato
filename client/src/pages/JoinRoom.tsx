import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function JoinRoom() {
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code?: string }>();
  const { socket, status } = useSocket();

  const [nickname, setNickname] = useState('');
  const [codeDigits, setCodeDigits] = useState<string[]>(
    urlCode ? urlCode.toUpperCase().split('').slice(0, 6) : Array(6).fill('')
  );
  const [step, setStep] = useState<'code' | 'name'>(urlCode ? 'name' : 'code');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first empty input
  useEffect(() => {
    if (step === 'code') {
      const firstEmpty = codeDigits.findIndex((d) => !d);
      inputRefs.current[firstEmpty >= 0 ? firstEmpty : 0]?.focus();
    }
  }, [step]);

  const handleCodeInput = (index: number, value: string) => {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!char && value !== '') return;

    const newDigits = [...codeDigits];
    newDigits[index] = char;
    setCodeDigits(newDigits);
    setError('');

    // Auto-advance to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-proceed when all filled
    if (char && index === 5 && newDigits.every((d) => d)) {
      setStep('name');
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && codeDigits.every((d) => d)) {
      setStep('name');
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    const newDigits = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setCodeDigits(newDigits);
    if (pasted.length === 6) {
      setStep('name');
    }
  };

  const handleJoin = () => {
    if (!nickname.trim()) return;
    const code = codeDigits.join('');
    if (code.length !== 6) {
      setError('Please enter a valid 6-character code');
      setStep('code');
      return;
    }

    if (!socket || status !== 'connected') {
      setError('Connecting to server... please wait.');
      return;
    }

    setJoining(true);
    socket.emit(
      'join-room',
      { code, nickname: nickname.trim() },
      (res: { success?: boolean; code?: string; error?: string; videoState?: any; chatHistory?: any }) => {
        setJoining(false);
        if (res.error) {
          setError(res.error);
          return;
        }
        navigate(`/room/${code}`, {
          state: {
            nickname: nickname.trim(),
            isHost: false,
            videoState: res.videoState,
            chatHistory: res.chatHistory,
          },
        });
      }
    );
  };

  const code = codeDigits.join('');

  return (
    <div className="gradient-bg min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Back */}
        <button
          onClick={() => (step === 'name' && !urlCode ? setStep('code') : navigate('/'))}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-8 flex items-center gap-2 text-sm"
        >
          ← Back
        </button>

        <div className="glass rounded-3xl p-8 sm:p-10" style={{ boxShadow: 'var(--shadow-card)' }}>
          {step === 'code' && (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔗</div>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                  Join a Room
                </h2>
                <p className="text-[var(--color-text-muted)] text-sm">
                  Enter the 6-character code from your partner
                </p>
              </div>

              {/* Code Input Boxes */}
              <div className="flex justify-center gap-2 sm:gap-3 mb-6" onPaste={handlePaste}>
                {codeDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    id={`code-input-${i}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeInput(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold rounded-xl outline-none transition-all duration-300 uppercase"
                    style={{
                      background: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-primary)',
                      border: digit
                        ? '2px solid var(--color-accent-primary)'
                        : '2px solid var(--color-border-subtle)',
                      boxShadow: digit ? '0 0 12px var(--color-accent-glow)' : 'none',
                    }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && (
                <p className="text-[var(--color-error)] text-sm text-center mb-4">{error}</p>
              )}

              <button
                id="btn-next-code"
                className="btn-primary w-full"
                onClick={() => {
                  if (code.length === 6) setStep('name');
                  else setError('Please enter all 6 characters');
                }}
                disabled={code.length !== 6}
                style={{ opacity: code.length === 6 ? 1 : 0.5 }}
              >
                Next \u2192
              </button>
            </>
          )}

          {step === 'name' && (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">👋</div>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                  Almost there!
                </h2>
                <p className="text-[var(--color-text-muted)] text-sm">
                  Joining room <span className="font-semibold text-[var(--color-accent-primary)]">{code}</span> \u2014 pick a nickname
                </p>
              </div>

              <div className="space-y-4">
                <input
                  id="input-join-nickname"
                  type="text"
                  className="input-field text-center text-lg"
                  placeholder="Your nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  maxLength={20}
                  autoFocus
                />

                {error && (
                  <p className="text-[var(--color-error)] text-sm text-center">{error}</p>
                )}

                <button
                  id="btn-join"
                  className="btn-primary w-full text-lg py-4"
                  onClick={handleJoin}
                  disabled={!nickname.trim() || joining}
                  style={{ opacity: nickname.trim() && !joining ? 1 : 0.5 }}
                >
                  {joining ? 'Joining...' : '\ud83c\udfac Join Room'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
