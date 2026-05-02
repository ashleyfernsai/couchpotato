import { useState, useRef, useEffect, useCallback, MutableRefObject } from 'react';
import { detectVideoType, extractYouTubeId, isDRMProtected } from '../../types';
import type { VideoSourceType } from '../../types';

interface Props {
  videoUrl: string;
  videoType: VideoSourceType;
  onLoadVideo: (url: string, type: VideoSourceType) => void;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onBuffering: (isBuffering: boolean) => void;
  partnerBuffering: boolean;
  playerTimeRef: MutableRefObject<() => number>;
  playerSeekRef: MutableRefObject<(t: number) => void>;
  playerPlayRef: MutableRefObject<() => void>;
  playerPauseRef: MutableRefObject<() => void>;
  isRemoteAction: MutableRefObject<boolean>;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export default function VideoPlayer({
  videoUrl,
  videoType,
  onLoadVideo,
  onPlay,
  onPause,
  onSeek,
  onBuffering,
  partnerBuffering,
  playerTimeRef,
  playerSeekRef,
  playerPlayRef,
  playerPauseRef,
  isRemoteAction,
}: Props) {
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState('');

  // YouTube player ref
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytReadyRef = useRef(false);

  // HTML5 video ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Load YouTube IFrame API ──
  useEffect(() => {
    if (window.YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }, []);

  // ── Initialize YouTube player when type changes to youtube ──
  useEffect(() => {
    if (videoType !== 'youtube' || !videoUrl) return;
    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) return;

    const initPlayer = () => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
      }
      ytPlayerRef.current = new window.YT.Player('yt-player', {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
        },
        events: {
          onReady: () => {
            ytReadyRef.current = true;
          },
          onStateChange: (event: any) => {
            if (isRemoteAction.current) return;
            const time = event.target.getCurrentTime();
            switch (event.data) {
              case window.YT.PlayerState.PLAYING:
                onPlay(time);
                onBuffering(false);
                break;
              case window.YT.PlayerState.PAUSED:
                onPause(time);
                break;
              case window.YT.PlayerState.BUFFERING:
                onBuffering(true);
                break;
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, [videoUrl, videoType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── HTML5 video event handlers ──
  useEffect(() => {
    if (videoType === 'youtube' || videoType === 'none' || !videoRef.current) return;
    const vid = videoRef.current;

    const handlePlay = () => { if (!isRemoteAction.current) onPlay(vid.currentTime); };
    const handlePause = () => { if (!isRemoteAction.current) onPause(vid.currentTime); };
    const handleSeeked = () => { if (!isRemoteAction.current) onSeek(vid.currentTime); };
    const handleWaiting = () => onBuffering(true);
    const handlePlaying = () => onBuffering(false);

    vid.addEventListener('play', handlePlay);
    vid.addEventListener('pause', handlePause);
    vid.addEventListener('seeked', handleSeeked);
    vid.addEventListener('waiting', handleWaiting);
    vid.addEventListener('playing', handlePlaying);

    return () => {
      vid.removeEventListener('play', handlePlay);
      vid.removeEventListener('pause', handlePause);
      vid.removeEventListener('seeked', handleSeeked);
      vid.removeEventListener('waiting', handleWaiting);
      vid.removeEventListener('playing', handlePlaying);
    };
  }, [videoType, videoUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Expose player controls to parent via refs ──
  const getTime = useCallback((): number => {
    if (videoType === 'youtube' && ytPlayerRef.current && ytReadyRef.current) {
      return ytPlayerRef.current.getCurrentTime?.() || 0;
    }
    return videoRef.current?.currentTime || 0;
  }, [videoType]);

  const seekTo = useCallback((t: number) => {
    if (videoType === 'youtube' && ytPlayerRef.current && ytReadyRef.current) {
      ytPlayerRef.current.seekTo(t, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = t;
    }
  }, [videoType]);

  const play = useCallback(() => {
    if (videoType === 'youtube' && ytPlayerRef.current && ytReadyRef.current) {
      ytPlayerRef.current.playVideo();
    } else {
      videoRef.current?.play();
    }
  }, [videoType]);

  const pause = useCallback(() => {
    if (videoType === 'youtube' && ytPlayerRef.current && ytReadyRef.current) {
      ytPlayerRef.current.pauseVideo();
    } else {
      videoRef.current?.pause();
    }
  }, [videoType]);

  // Update refs
  useEffect(() => {
    playerTimeRef.current = getTime;
    playerSeekRef.current = seekTo;
    playerPlayRef.current = play;
    playerPauseRef.current = pause;
  }, [getTime, seekTo, play, pause, playerTimeRef, playerSeekRef, playerPlayRef, playerPauseRef]);

  // ── Handle URL submit ──
  const handleSubmitUrl = () => {
    const url = inputUrl.trim();
    if (!url) return;

    if (isDRMProtected(url)) {
      setError('\u26a0\ufe0f This streaming service uses DRM protection and cannot be embedded. Try a YouTube link or a direct .mp4/.m3u8 URL instead.');
      return;
    }

    const type = detectVideoType(url);
    if (type === 'none') {
      setError('Unsupported URL format. Please use YouTube, .mp4, or .m3u8 links.');
      return;
    }

    setError('');
    setInputUrl('');
    onLoadVideo(url, type);
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* ── Video Area ── */}
      <div className="flex-1 relative min-h-0 flex items-center justify-center">
        {videoType === 'none' && !videoUrl && (
          <div className="text-center p-8 animate-fade-in">
            <div className="text-6xl mb-4 animate-float">🎬</div>
            <p className="text-[var(--color-text-secondary)] text-lg mb-2">
              No video loaded yet
            </p>
            <p className="text-[var(--color-text-muted)] text-sm">
              Paste a YouTube link or video URL below to start watching
            </p>
          </div>
        )}

        {videoType === 'youtube' && (
          <div ref={ytContainerRef} className="w-full h-full">
            <div id="yt-player" className="w-full h-full" />
          </div>
        )}

        {(videoType === 'mp4' || videoType === 'hls') && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            controls
            playsInline
          />
        )}

        {/* Partner buffering overlay */}
        {partnerBuffering && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-2 text-sm text-[var(--color-text-secondary)] flex items-center gap-2 animate-fade-in z-10">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-[var(--color-warning)] rounded-full" style={{ animation: 'typing-bounce 1.4s ease-in-out infinite' }} />
              <span className="w-1.5 h-1.5 bg-[var(--color-warning)] rounded-full" style={{ animation: 'typing-bounce 1.4s ease-in-out 0.2s infinite' }} />
              <span className="w-1.5 h-1.5 bg-[var(--color-warning)] rounded-full" style={{ animation: 'typing-bounce 1.4s ease-in-out 0.4s infinite' }} />
            </div>
            Partner is buffering...
          </div>
        )}
      </div>

      {/* ── URL Input Bar ── */}
      <div className="shrink-0 p-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]">
        <div className="flex gap-2">
          <input
            id="input-video-url"
            type="text"
            className="input-field text-sm py-2.5"
            placeholder="Paste a YouTube link or video URL..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitUrl()}
          />
          <button
            id="btn-load-video"
            className="btn-primary px-5 py-2.5 text-sm shrink-0"
            onClick={handleSubmitUrl}
          >
            Load
          </button>
        </div>
        {error && (
          <p className="text-[var(--color-error)] text-xs mt-2 px-1">{error}</p>
        )}
      </div>
    </div>
  );
}
