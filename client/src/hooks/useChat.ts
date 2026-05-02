import { useEffect, useState, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { ChatMessage } from '../types';

export function useChat(socket: Socket | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmit = useRef(0);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleTyping = (data: { isTyping: boolean; nickname?: string }) => {
      setPartnerTyping(data.isTyping);
      if (data.isTyping) {
        // Auto-clear after 4 seconds
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 4000);
      }
    };

    socket.on('chat-message', handleMessage);
    socket.on('partner-typing', handleTyping);

    return () => {
      socket.off('chat-message', handleMessage);
      socket.off('partner-typing', handleTyping);
    };
  }, [socket]);

  const sendMessage = useCallback(
    (content: string, type: 'text' | 'emoji-reaction' = 'text') => {
      if (!socket || !content.trim()) return;
      socket.emit('chat-message', { content: content.trim(), type });
      socket.emit('typing-stop');
    },
    [socket]
  );

  const emitTyping = useCallback(() => {
    if (!socket) return;
    const now = Date.now();
    // Throttle typing events to every 2 seconds
    if (now - lastTypingEmit.current > 2000) {
      socket.emit('typing-start');
      lastTypingEmit.current = now;
    }
  }, [socket]);

  const emitStopTyping = useCallback(() => {
    if (!socket) return;
    socket.emit('typing-stop');
  }, [socket]);

  // Load chat history when joining a room
  const loadHistory = useCallback((history: ChatMessage[]) => {
    setMessages(history || []);
  }, []);

  return {
    messages,
    partnerTyping,
    sendMessage,
    emitTyping,
    emitStopTyping,
    loadHistory,
  };
}
