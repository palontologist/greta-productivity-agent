# 🤖 Greta — AI Productivity Companion

> **Your AI buddy that lives in the system tray, watches your screen, hears you talk, and knows what you've been working on.**

Greta is an Electron-based desktop companion inspired by [Clicky](https://github.com/palontologist/clicky). It combines passive activity tracking with an interactive AI companion: press a hotkey, speak, and Greta sees your screen, knows your recent work context, and responds with voice and a cursor that can point at things on your screen.

---

## ✨ Features

- **System tray companion** — lives quietly in the menu bar/tray; no dock icon
- **Push-to-talk AI chat** — press `Ctrl+Shift+Space` (or `⌘⇧Space` on macOS) to talk, press again to send
- **Screen awareness** — captures your screen on every query and sends it to Claude as a vision image
- **Productivity context** — automatically injects your last 30 minutes of app activity into Claude's system prompt
- **Streaming responses** — Claude's reply streams word-by-word into the on-screen bubble
- **Voice playback** — ElevenLabs TTS reads the response aloud
- **Cursor pointer** — Claude can embed `[POINT:x,y:label]` tags to fly the companion dot to specific UI elements
- **Conversation history** — multi-turn memory within a session
- **Background tracking** — continues to log active window every 5 seconds (SQLite, fully local)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Electron Main Process               │
│  • Tray + panel window + overlay window              │
│  • GlobalShortcut (PTT toggle)                       │
│  • desktopCapturer (screenshots)                     │
│  • ActivityTracker + SQLite (background tracking)    │
│  • fetch → Cloudflare Worker proxy                   │
└──────────────────┬──────────────────────────────────┘
                   │ IPC
       ┌───────────┴───────────┐
       ▼                       ▼
┌─────────────┐        ┌──────────────────┐
│ Panel Window│        │  Overlay Window  │
│ (tray panel)│        │  (full-screen,   │
│ renderer/   │        │   transparent)   │
│ index.html  │        │  renderer/       │
│ renderer.js │        │  overlay.html    │
└─────────────┘        │  overlay.js      │
                       │  • MediaRecorder │
                       │  • Web Audio API │
                       │  • Cursor dot +  │
                       │    response bubble│
                       └──────────────────┘
                                │ fetch (direct)
                                ▼
                    ┌───────────────────────┐
                    │  Cloudflare Worker    │
                    │  worker/src/index.ts  │
                    │  POST /chat    →Claude│
                    │  POST /tts    →ElevenL│
                    │  POST /transcribe     │
                    │          →AssemblyAI  │
                    └───────────────────────┘
```

### Key Design Decisions

- **No API keys in the app binary** — all keys live as Cloudflare Worker secrets
- **Overlay window** — full-screen transparent `BrowserWindow` with `setIgnoreMouseEvents(true)`, always on top at `screen-saver` level
- **PTT is a toggle** — `globalShortcut` only fires on keydown; first press = start recording, second press = stop and process
- **Cursor tracking** — main process polls `screen.getCursorScreenPoint()` at ~20 fps and forwards to overlay while active
- **Transcription** — audio blob from `MediaRecorder` sent to Worker → AssemblyAI batch API
- **Productivity context** — last 30 min of SQLite activity injected into Claude's system prompt before each request

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Cloudflare](https://cloudflare.com) account (free tier works)
- API keys for:
  - [Anthropic Claude](https://console.anthropic.com) — required
  - [ElevenLabs](https://elevenlabs.io) — required for voice output
  - [AssemblyAI](https://www.assemblyai.com) — required for voice input

### 1. Set up the Cloudflare Worker proxy

```bash
cd worker
npm install

# Add your API keys as secrets (Wrangler will prompt you)
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ELEVENLABS_API_KEY
npx wrangler secret put ASSEMBLYAI_API_KEY
```

Set your ElevenLabs voice ID in `worker/wrangler.toml`:

```toml
[vars]
ELEVENLABS_VOICE_ID = "your-voice-id-here"
```

Deploy the Worker:

```bash
npx wrangler deploy
# → https://greta-proxy-worker.your-subdomain.workers.dev
```

### 2. Local Worker development (optional)

```bash
# Create worker/.dev.vars from the example:
cp worker/.dev.vars.example worker/.dev.vars
# Fill in your real keys in .dev.vars

cd worker
npx wrangler dev
# → http://localhost:8787
```

### 3. Run the Electron app

```bash
# From the repo root
npm install
npm run dev
```

The app will appear in your **system tray** (not the dock on macOS). Click the tray icon to open the panel.

In the panel, paste your Worker URL (e.g. `https://greta-proxy-worker.your-subdomain.workers.dev` or `http://localhost:8787` for local dev) into the **Worker URL** field.

### 4. Talk to Greta

Press `Ctrl+Shift+Space` (Windows/Linux) or `⌘⇧Space` (macOS) to toggle recording.

- **First press** → overlay appears, companion dot follows your cursor, recording starts
- **Speak** → Greta records your voice
- **Second press** → recording stops, transcription runs, Claude responds
- Claude's response streams into the on-screen bubble and is read aloud
- The companion dot flies to any UI elements Claude references

---

## 🔧 Project Structure

```
greta-productivity-agent/
├── src/
│   ├── main.ts              # Main process: Tray, windows, IPC, Claude/TTS calls
│   ├── preload.ts           # Panel window preload (gretaAPI)
│   ├── overlay-preload.ts   # Overlay window preload (overlayAPI)
│   ├── database.ts          # SQLite activity log (unchanged)
│   ├── tracker.ts           # Background window tracker (unchanged)
│   └── types.d.ts           # Shared type definitions
├── renderer/
│   ├── index.html           # Tray panel UI
│   ├── renderer.js          # Panel JS
│   ├── overlay.html         # Full-screen transparent overlay
│   └── overlay.js           # Overlay JS: recording, TTS, cursor animation
└── worker/
    ├── src/index.ts         # Cloudflare Worker: /chat, /tts, /transcribe
    ├── wrangler.toml        # Wrangler config
    └── .dev.vars.example    # Local dev secrets template
```

---

## 🔐 Privacy

- All activity data is stored **locally** in SQLite (`~/.config/greta-productivity-agent/greta-activities.db` on Linux, equivalent on other platforms)
- Screenshots are sent to Claude **only** when you trigger the hotkey — never in the background
- The Cloudflare Worker holds your API keys; they never leave the server

---

## 📄 License

MIT


> **Mission-aligned productivity tracking that helps you work on what truly matters.**

**✨ MVP is now live!** A fully functional desktop app is ready to use. [Jump to Getting Started →](#-getting-started)

---

Greta Productivity Agent is an Electron-based desktop companion that bridges the gap between passive activity monitoring and intentional, mission-driven work. Unlike traditional time trackers that just count minutes, Greta helps you understand *how well* your daily activities align with your personal mission and long-term goals.

