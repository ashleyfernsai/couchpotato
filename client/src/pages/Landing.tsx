import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="gradient-bg min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-[var(--color-accent-primary)] opacity-[0.04] blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-[var(--color-accent-pink)] opacity-[0.04] blur-3xl animate-float"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-accent-warm)] opacity-[0.02] blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg mx-auto animate-fade-in">
        {/* Logo / Icon */}
        <div className="text-7xl mb-6 animate-float">🥔</div>

        {/* App Name */}
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-3 tracking-tight">
          <span className="gradient-text">CouchPotato</span>
        </h1>

        {/* Tagline */}
        <p className="text-[var(--color-text-secondary)] text-lg sm:text-xl mb-2 font-light">
          Watch together, from anywhere.
        </p>
        <p className="text-[var(--color-text-muted)] text-sm mb-12 max-w-sm mx-auto">
          Sync any video, video call your partner, and chat — all in one cozy place.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            id="btn-create-room"
            className="btn-primary text-lg px-10 py-4 w-full sm:w-auto"
            onClick={() => navigate('/create')}
          >
            <span className="text-xl">🎬</span>
            Create Room
          </button>
          <button
            id="btn-join-room"
            className="btn-secondary text-lg px-10 py-4 w-full sm:w-auto"
            onClick={() => navigate('/join')}
          >
            <span className="text-xl">🔗</span>
            Join Room
          </button>
        </div>

        {/* Features hint */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 text-[var(--color-text-muted)] text-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            Synced playback
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📹</span>
            Video call
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            Live chat
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            No sign-up needed
          </div>
        </div>
      </div>
    </div>
  );
}
