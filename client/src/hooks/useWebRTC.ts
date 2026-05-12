import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import 'webrtc-adapter';

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCameraOn: boolean;
  isMicOn: boolean;
  connectionState: RTCPeerConnectionState | 'new';
}

// Free public TURN server via Open Relay — replace with your own for production
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function useWebRTC(socket: Socket | null, isInitiator: boolean) {
  const [state, setState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    isCameraOn: true,
    isMicOn: true,
    connectionState: 'new',
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callStartedRef = useRef(false);

  // ── Initialize local media ──
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;
      setState((prev) => ({ ...prev, localStream: stream }));
      return stream;
    } catch (err) {
      console.error('[WebRTC] Failed to get media:', err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = audioStream;
        setState((prev) => ({ ...prev, localStream: audioStream, isCameraOn: false }));
        return audioStream;
      } catch {
        console.error('[WebRTC] No media available');
        return null;
      }
    }
  }, []);

  // ── Create peer connection ──
  const createPeerConnection = useCallback(
    (currentSocket: Socket) => {
      if (pcRef.current) {
        pcRef.current.close();
      }
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        setState((prev) => ({ ...prev, remoteStream }));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          currentSocket.emit('ice-candidate', event.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        setState((prev) => ({ ...prev, connectionState: pc.connectionState }));
        console.log('[WebRTC] Connection state:', pc.connectionState);
      };

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      return pc;
    },
    []
  );

  // ── Signaling logic ──
  useEffect(() => {
    if (!socket) return;

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      console.log('[WebRTC] Received offer');
      const pc = pcRef.current ?? createPeerConnection(socket);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', answer);
    };

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      console.log('[WebRTC] Received answer');
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Error adding ICE candidate:', err);
        }
      }
    };

    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, [socket, createPeerConnection]);

  // ── Start call ──
  const startCall = useCallback(async () => {
    if (callStartedRef.current) return;
    callStartedRef.current = true;

    const stream = await startMedia();
    if (!stream || !socket) {
      callStartedRef.current = false;
      return;
    }

    const pc = createPeerConnection(socket);

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', offer);
      console.log('[WebRTC] Sent offer');
    }
  }, [startMedia, createPeerConnection, isInitiator, socket]);

  // ── Toggle camera ──
  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setState((prev) => ({ ...prev, isCameraOn: track.enabled }));
    }
  }, []);

  // ── Toggle mic ──
  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setState((prev) => ({ ...prev, isMicOn: track.enabled }));
    }
  }, []);

  // ── Cleanup ──
  const endCall = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    callStartedRef.current = false;
    setState({ localStream: null, remoteStream: null, isCameraOn: true, isMicOn: true, connectionState: 'new' });
  }, []);

  useEffect(() => {
    return () => endCall();
  }, [endCall]);

  return { ...state, startCall, endCall, toggleCamera, toggleMic };
}
