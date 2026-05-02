# 🥔 CouchPotato

**Watch together, from anywhere.**

CouchPotato is a watch party app for long-distance couples (and friends!) that combines synchronized video playback, live video calling, and real-time chat in one seamless interface. No accounts needed — just create a room, share the code, and start watching.

---

## ✨ Features

- **Synced Video Playback** — YouTube, MP4, and HLS (.m3u8) URLs play in perfect sync between partners
- **Live Video Call** — WebRTC peer-to-peer video and audio with camera/mic toggles
- **Real-Time Chat** — Text messages, emoji reactions, and typing indicators
- **No Sign-Up Required** — Room code-based access, zero friction
- **Responsive Design** — Desktop 3-column layout, mobile tabbed layout
- **PWA Support** — Installable on mobile devices, works offline for the app shell
- **Cross-Browser** — Chrome, Firefox, Safari, Edge (with adapter.js WebRTC shim)
- **DRM Detection** — Friendly error messages when users paste Netflix/Disney+ URLs

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client (React + Vite)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Video Player │  │  Video Call  │  │     Chat Panel         │ │
│  │ (YouTube /   │  │  (WebRTC)    │  │  (Messages + Emoji +   │ │
│  │  MP4 / HLS)  │  │             │  │   Typing Indicator)    │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         │                 │                      │              │
│  ┌──────┴─────────────────┴──────────────────────┴────────────┐ │
│  │               Socket.IO Client (WebSocket)                 │ │
│  │   useVideoSync · useWebRTC · useChat · useSocket hooks     │ │
│  └────────────────────────────┬───────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────────┘
                                │ WSS
┌───────────────────────────────┼─────────────────────────────────┐
│                    Server (Node.js + Express)                    │
│  ┌────────────────────────────┴───────────────────────────┐ │
│  │              Socket.IO Server (WebSocket)                  │ │
│  │   roomHandlers · syncHandlers · chatHandlers · signaling   │ │
│  └────────────────────────────┬───────────────────────────┘ │
│                               │                                 │
│  ┌────────────────────────────┴───────────────────────────┐ │
│  │              Room Store (In-Memory Map)                    │ │
│  │   Room state · Video state · Chat history · TTL expiry     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · TypeScript · Vite 8 · Tailwind CSS v4 |
| Backend | Node.js · Express · Socket.IO |
| Video Playback | YouTube IFrame API · HTML5 Video (MP4/HLS) |
| Video Call | WebRTC (P2P) · STUN (Google) · webrtc-adapter |
| State | In-memory Map (swappable to Redis for production) |
| PWA | Manual service worker · Web App Manifest |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/ashleyfernsai/couchpotato.git
cd couchpotato

# Install all dependencies (client + server)
npm install
```

### Development

```bash
# Start both client and server concurrently
npm run dev

# Or start them separately:
npm run dev:server   # Backend → http://localhost:3001
npm run dev:client   # Frontend → http://localhost:5173
```

### Production Build

```bash
# Build both client and server
npm run build

# Build individually
npm run build:client   # Output: client/dist/
npm run build:server   # Output: server/dist/
```

---

## 📁 Project Structure

```
couchpotato/
├── client/                          # React frontend (Vite + Tailwind)
│   ├── public/
│   │   ├── potato.svg               # App favicon
│   │   ├── manifest.json            # PWA manifest
│   │   └── sw.js                    # Service worker
│   ├── src/
│   │   ├── main.tsx                 # Entry point + SW registration
│   │   ├── App.tsx                  # React Router
│   │   ├── index.css                # Tailwind + design system
│   │   ├── pages/
│   │   │   ├── Landing.tsx          # Home — Create / Join
│   │   │   ├── CreateRoom.tsx       # Room code reveal + waiting
│   │   │   ├── JoinRoom.tsx         # 6-digit code input
│   │   │   └── WatchRoom.tsx        # Main 3-panel experience
│   │   ├── components/
│   │   │   ├── VideoPlayer/
│   │   │   │   └── VideoPlayer.tsx  # YouTube + MP4/HLS player
│   │   │   ├── VideoCall/
│   │   │   │   └── VideoCall.tsx    # WebRTC dual video feeds
│   │   │   └── Chat/
│   │   │       ├── ChatPanel.tsx    # Messages + input + typing
│   │   │       └── EmojiPicker.tsx  # Emoji grid
│   │   ├── hooks/
│   │   │   ├── useSocket.ts         # Socket.IO connection
│   │   │   ├── useVideoSync.ts      # Sync engine
│   │   │   ├── useWebRTC.ts         # WebRTC peer connection
│   │   │   └── useChat.ts           # Chat state
│   │   ├── services/
│   │   │   └── socket.ts            # Socket.IO singleton
│   │   └── types/
│   │       └── index.ts             # Types + URL utilities
│   ├── index.html                   # HTML with SEO meta tags
│   ├── vite.config.ts               # Vite + React + Tailwind config
│   └── vercel.json                  # Vercel deployment config
│
├── server/                          # Node.js backend
│   ├── src/
│   │   ├── index.ts                 # Express + Socket.IO server
│   │   ├── socket/
│   │   │   ├── roomHandlers.ts      # Room lifecycle events
│   │   │   ├── syncHandlers.ts      # Video sync relay
│   │   │   ├── chatHandlers.ts      # Chat + typing relay
│   │   │   └── signalingHandlers.ts # WebRTC SDP/ICE relay
│   │   ├── services/
│   │   │   ├── roomStore.ts         # In-memory room state
│   │   │   └── codeGenerator.ts     # Crypto-random codes
│   │   └── types/
│   │       └── index.ts             # Server interfaces
│   ├── railway.toml                 # Railway deployment config
│   ├── tsconfig.json
│   └── package.json
│
└── package.json                     # Root monorepo config
```

---

## 🔄 Sync Engine

The sync engine ensures both partners see the same frame within 500ms:

1. **Event Broadcast** — Any play/pause/seek emits `{ action, timestamp, clientTime }` via WebSocket
2. **Server Relay** — Server appends `serverTime` and relays to the partner
3. **Latency Compensation** — Receiving client calculates `(now - serverTime) / 2` and adjusts seek position
4. **Heartbeat** — Every 5 seconds, position is compared; auto re-sync triggers if drift exceeds 1 second
5. **Buffering** — When either partner buffers, a visual indicator appears on the other's screen

### Supported Video Sources

| Source | Status | Notes |
|---|---|---|
| YouTube | ✅ Full | IFrame API — play/pause/seek controllable |
| Direct MP4 | ✅ Full | HTML5 `<video>` element |
| HLS (.m3u8) | ✅ Full | Native HLS support in Safari; hls.js for others |
| Netflix / Disney+ / etc. | ❌ Blocked | DRM — friendly error with guidance |

---

## 📞 WebRTC Video Call

- **Peer-to-peer** connection using STUN servers (Google public)
- **adapter.js** shim for cross-browser compatibility (Safari, Firefox, Edge)
- **Camera/mic toggle** without renegotiation (`track.enabled`)
- **Graceful fallback** — if video call fails, sync + chat continue
- **TURN server** — placeholder config ready for production (Coturn / Twilio)

---

## 🚢 Deployment

### Client → Vercel

```bash
cd client
npx vercel --prod
```

Set environment variable:
```
VITE_SERVER_URL=https://your-server.railway.app
```

### Server → Railway

```bash
cd server
railway up
```

Set environment variables:
```
PORT=3001
CLIENT_URL=https://your-app.vercel.app
```

### TURN Server (Production)

For production WebRTC behind corporate NATs, deploy a [Coturn](https://github.com/coturn/coturn) server or use a managed service (Twilio, Metered):

```typescript
// In useWebRTC.ts, add to ICE_SERVERS:
{
  urls: 'turn:your-turn-server.com:3478',
  username: 'your-username',
  credential: 'your-credential',
}
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create a room → 6-char code appears with animated reveal
- [ ] Copy invite link → share with second browser tab
- [ ] Join room → watch room loads with 3-panel layout
- [ ] Paste YouTube URL → video loads for both partners
- [ ] Play/pause → syncs within 500ms
- [ ] Seek → partner jumps to same position
- [ ] Send chat message → appears on both sides
- [ ] Emoji reaction → displays in chat
- [ ] Typing indicator → shows when partner types
- [ ] Toggle camera/mic → only affects local feed
- [ ] Resize to mobile → layout switches to tabbed view
- [ ] Paste Netflix URL → DRM error shown

### Browser Compatibility

| Browser | Status |
|---|---|
| Chrome (Desktop + Android) | ✅ Primary target |
| Firefox 100+ | ✅ Full support |
| Safari 15+ (Desktop + iOS) | ✅ With adapter.js shim |
| Edge 100+ | ✅ Full support |

---

## 🗺️ Roadmap (Post-MVP)

- [ ] User accounts with saved watch history
- [ ] Native iOS and Android apps
- [ ] Group rooms (3+ participants)
- [ ] Playlist / watch queue
- [ ] Screen sharing as a video source
- [ ] Persistent chat history across sessions
- [ ] TURN server integration for production

---

## 📄 License

Private — Confidential. Not for public distribution.
