# ScreenCap Pro

Professional screen recording and instant replay web application built with Next.js 16, TypeScript, and Tailwind CSS.

## Features

- **Screen Recording** — Capture your entire screen, a specific window, or browser tab with audio
- **Region Selection** — Drag to select a custom area of the screen to record
- **Instant Replay** — Continuously buffer your screen and save the last 30–100 seconds anytime (like NVIDIA ShadowPlay)
- **Auto-Save** — Automatically download recordings when stopped, with optional custom folder selection
- **Video Settings** — Resolution (480p–4K), frame rate (30/60/120 FPS), bitrate, format (WebM/MP4)
- **Audio** — System audio + microphone recording
- **Floating Controls** — Draggable overlay with recording controls
- **Keyboard Shortcuts** — Configurable hotkeys for start/stop, save replay, and pause
- **Dark Premium UI** — Sleek dark theme with smooth animations

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State Management**: Zustand (with localStorage persistence)
- **Animations**: Framer Motion
- **Notifications**: Sonner

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Deploy to Vercel

1. Unzip this project
2. Push to a GitHub repository
3. Go to [vercel.com](https://vercel.com) and import the repo
4. Vercel auto-detects Next.js — click **Deploy**

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel
```

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Screen Recording | ✅ | ✅ | ✅ | ✅ |
| System Audio | ✅ | ✅ | ❌ | ❌ |
| Custom Folder Save | ✅ | ✅ | ❌ | ❌ |
| Region Selection | ✅ | ✅ | ✅ | ✅ |

> **Note**: The File System Access API (custom folder selection) requires a Chromium-based browser (Chrome/Edge/Opera) and cannot be used inside embedded iframes. Open the app directly in a new tab for full functionality.

## License

MIT
