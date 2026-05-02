import { useState, useRef, useEffect } from 'react';
import EmojiPicker from './EmojiPicker';
import type { ChatMessage } from '../../types';

interface Props {
  messages: ChatMessage[];
  onSendMessage: (content: string, type?: 'text' | 'emoji-reaction') => void;
  onTyping: () => void;
  onStopTyping: () => void;
  partnerTyping: boolean;
  mySocketId: string;
  partnerNickname: string;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  onTyping,
  onStopTyping,
  partnerTyping,
  mySocketId,
  partnerNickname,
}: Props) {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
    onStopTyping();
    setShowEmoji(false);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    onTyping();

    // Auto stop typing after 3s
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 3000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const handleReaction = (emoji: string) => {
    onSendMessage(emoji, 'emoji-reaction');
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)] relative">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--color-border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">💬 Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-[var(--color-text-muted)] text-sm py-8">
            <div className="text-3xl mb-2">💬</div>
            <p>No messages yet.</p>
            <p className="text-xs mt-1">Say hi to your partner!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === mySocketId;
          const isReaction = msg.type === 'emoji-reaction';

          if (isReaction) {
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="text-3xl animate-fade-in" title={`${msg.senderName} reacted`}>
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? 'bg-[var(--color-accent-primary)] text-[var(--color-bg-primary)] rounded-br-md'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] rounded-bl-md'
                }`}
              >
                {!isMe && (
                  <p className="text-xs font-semibold mb-1 opacity-70">{msg.senderName}</p>
                )}
                <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'opacity-60' : 'text-[var(--color-text-muted)]'}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {partnerTyping && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="bg-[var(--color-bg-elevated)] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--color-text-muted)]">
                  {partnerNickname || 'Partner'}
                </span>
                <div className="flex gap-0.5 ml-1">
                  <span className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full" style={{ animation: 'typing-bounce 1.4s ease-in-out infinite' }} />
                  <span className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full" style={{ animation: 'typing-bounce 1.4s ease-in-out 0.2s infinite' }} />
                  <span className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full" style={{ animation: 'typing-bounce 1.4s ease-in-out 0.4s infinite' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reactions */}
      <div className="shrink-0 px-4 py-2 flex gap-2 border-t border-[var(--color-border-subtle)]">
        {['❤️', '😂', '😮', '🔥', '👏', '😢'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="text-lg hover:scale-125 transition-transform active:scale-100"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Emoji Picker (above input) */}
      {showEmoji && (
        <div className="absolute bottom-[110px] left-4 right-4 z-20">
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-[var(--color-border-subtle)]">
        <div className="flex gap-2 items-end">
          <button
            id="btn-emoji-toggle"
            onClick={() => setShowEmoji(!showEmoji)}
            className="btn-icon shrink-0 text-lg"
            title="Emoji picker"
          >
            😊
          </button>
          <input
            id="input-chat-message"
            type="text"
            className="input-field text-sm py-2.5"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            id="btn-send-message"
            onClick={handleSend}
            className="btn-primary px-4 py-2.5 text-sm shrink-0"
            disabled={!input.trim()}
            style={{ opacity: input.trim() ? 1 : 0.5 }}
          >
            \u27a4
          </button>
        </div>
      </div>
    </div>
  );
}
