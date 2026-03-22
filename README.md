# Glance

**A smart teleprompter that follows your voice — so you look directly into the camera while reading.**

Glance is a desktop app that displays your script in a small, floating window anchored just below your camera. It listens to your voice and scrolls in real-time to match your pace. Your eyes naturally align with the lens, creating perfect eye contact on Zoom, Google Meet, OBS, or any recording app.

<br>

## How It Works

```
         MacBook Screen Top Edge
    ============[ NOTCH/CAMERA ]============
    |                                      |
    |  +--------------------------------+  |
    |  |  (dimmed) already read...      |  |
    |  |                                |  |  <-- Glance prompter window
    |  |  > CURRENT WORD highlighted    |  |      sits right here
    |  |                                |  |
    |  |  upcoming text slightly faded  |  |
    |  +--------------------------------+  |
    |                                      |
    |        Your Zoom / OBS / etc.        |
```

You read the text, your eyes look at the camera. To anyone watching, it's natural eye contact.

<br>

## Features

### Voice Follow Mode
The core feature. Glance listens to your microphone and tracks which word you're reading in real-time:

- **Word-level highlighting** — each word lights up as you speak it
- **Adaptive speed** — reads your pace and adjusts automatically
- **Bi-directional seeking** — go back by re-reading a previous sentence, or jump ahead by reading further in the script
- **Smart matching** — handles mispronunciations, skipped words, and background noise
- **Adaptive noise detection** — adjusts to your environment automatically
- Powered by [Groq](https://groq.com)'s Whisper API (free tier available)

### Script Editor
- Create, edit, rename, duplicate, and delete scripts
- Auto-saves every keystroke
- All data stored locally — no cloud, no accounts

### Teleprompter Display
- Frameless floating window, always on top
- Smooth spring-physics scrolling (no jitter or lag)
- Cinematic gradient overlays that focus attention on the reading zone
- Works over Zoom, Meet, OBS, or any app

### Playback Controls
- **Play / Pause** — click, keyboard, or hover controls
- **Speed** — 0.1x to 5x in real-time
- **Manual scroll** — mouse wheel works anytime
- **Countdown** — 3s, 5s, or 10s before scrolling starts

### Customization
| Setting | Range |
|---|---|
| Font size | 16 – 72px |
| Text color | White, Yellow, Green, Cyan, or custom |
| Background opacity | 10 – 100% |
| Font weight | Normal / Bold |
| Line spacing | 1.0 – 2.5 |
| Padding | 5 – 50px |
| Mirror mode | For physical teleprompter rigs |

All settings persist across restarts.

<br>

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **macOS** or **Windows**

### Install & Run

```bash
git clone https://github.com/SolalBerrebi/moody.git
cd moody
npm install
npm start
```

### Enable Voice Follow

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Open Settings in the app and paste your key
3. Click **Voice Follow** to activate
4. Start reading — Glance follows your voice

<br>

## Keyboard Shortcuts

| Action | Mac | Windows |
|---|---|---|
| Play / Pause | `Space` or `Cmd+P` | `Space` or `Ctrl+P` |
| Speed Up | `Arrow Up` or `Cmd+]` | `Arrow Up` or `Ctrl+]` |
| Speed Down | `Arrow Down` or `Cmd+[` | `Arrow Down` or `Ctrl+[` |
| Reset to Start | `Cmd+R` | `Ctrl+R` |
| Toggle Prompter | `Cmd+Shift+P` | `Ctrl+Shift+P` |
| Font Bigger | `Cmd+=` | `Ctrl+=` |
| Font Smaller | `Cmd+-` | `Ctrl+-` |
| Mirror Mode | `Cmd+M` | `Ctrl+M` |
| Start with Countdown | `Cmd+Enter` | `Ctrl+Enter` |
| Reset to Notch | `Cmd+Shift+N` | `Ctrl+Shift+N` |

<br>

## Building for Distribution

```bash
# macOS (.dmg)
npm run build

# Windows (.exe installer)
npm run build:win

# Both platforms
npm run build:all
```

Output goes to the `dist/` folder. Send the `.dmg` or `.exe` to anyone — they install it like any normal app, no terminal needed.

<br>

## Project Structure

```
src/
  main/
    main.js              # Electron main process, windows, IPC
  renderer/
    editor/
      index.html         # Main editor window
      editor.css         # Dark theme
      editor.js          # Script management, controls, settings
    prompter/
      index.html         # Prompter overlay
      prompter.css       # Overlay styles, word highlighting
      prompter.js        # Voice follower, scroll engine, VAD
  shared/
    preload.js           # Secure IPC bridge
```

<br>

## Privacy

Glance stores everything locally. No accounts, no cloud sync, no telemetry, no analytics. Your scripts stay on your machine. Voice audio is sent to Groq's API for transcription when Voice Follow is enabled — it is not stored.

<br>

## License

MIT
