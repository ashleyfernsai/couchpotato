interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥'],
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '👋', '💪', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💕', '💖', '💗', '💘', '💝'],
  },
  {
    name: 'Fun',
    emojis: ['🔥', '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🎈', '🎬', '🍿', '🎵', '🎶', '💯', '🏆', '🥇', '👑', '💎', '🍕', '🍔', '🌮', '🍩', '🍪', '☕', '🥂', '🍷', '🧃'],
  },
  {
    name: 'Faces',
    emojis: ['😢', '😭', '😤', '🤬', '😈', '👿', '💠', '☠️', '👻', '👽', '🤖', '💩', '😺', '😸', '😻', '🙀', '😿', '😾'],
  },
];

export default function EmojiPicker({ onSelect, onClose }: Props) {
  return (
    <div
      className="glass-strong rounded-2xl shadow-lg max-h-64 overflow-y-auto"
      style={{ boxShadow: 'var(--shadow-elevated)' }}
    >
      {/* Close button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-subtle)]">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Pick an emoji</span>
        <button
          onClick={onClose}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-sm"
        >
          \u2715
        </button>
      </div>

      <div className="p-3 space-y-3">
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <p className="text-xs text-[var(--color-text-muted)] mb-1.5 font-medium">{cat.name}</p>
            <div className="flex flex-wrap gap-1">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[var(--color-bg-elevated)] rounded-lg transition-all hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
