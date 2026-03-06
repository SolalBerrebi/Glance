# Moody

**A smart teleprompter that sits right below your MacBook's camera — so you look directly into the lens while reading.**

Moody is a desktop app built with Electron that displays your script in a small, floating window anchored just below the notch. When you read the text, your eyes naturally align with the camera, creating perfect eye contact on Zoom, Google Meet, OBS, or any recording app.

<br>

## How It Works

```
         MacBook Screen Top Edge
    ============[ NOTCH/CAMERA ]============
    |                                      |
    |  +--------------------------------+  |
    |  |  (faded) ...already read...    |  |  <- Moody prompter window
    |  |                                |  |     sits right here
    |  |  > CURRENT LINE OF SCRIPT      |  |
    |  |                                |  |
    |  |  next line coming up...        |  |
    |  +--------------------------------+  |
    |                                      |
    |        Your Zoom / OBS / etc.        |
```

Your eyes read the text and look directly at the camera. To anyone watching, it's natural eye contact.

<br>

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **macOS** (primary target — works on other platforms via Electron)

### Install & Run

```bash
git clone https://github.com/solmusic/moody.git
cd moody
npm install
npm start
```

<br>

## Features

### Script Editor
- Create, edit, rename, duplicate, and delete scripts from the sidebar
- Auto-saves every change — never lose your work
- All data stored locally on your machine (no cloud, no accounts)

### Teleprompter Display
- Small, frameless window anchored below the camera notch
- Always-on-top — floats over Zoom, Meet, OBS, or any app
- Smooth `requestAnimationFrame`-based scrolling
- Current line highlighted, read text fades out, upcoming text is dimmed
- Gradient edges for a polished fade-in/fade-out effect

### Playback Controls
- **Play / Pause** — click, keyboard shortcut, or hover controls
- **Speed** — adjustable from 0.1x to 5x in real-time
- **Manual scroll** — trackpad / mouse wheel works even during auto-scroll
- **Reset** — jump back to the start instantly
- **Countdown** — configurable 3s, 5s, or 10s countdown before scrolling begins

### Customization
| Setting | Range |
|---|---|
| Font size | 16px – 72px |
| Text color | White, Yellow, Green, Cyan, or custom |
| Background opacity | 10% – 100% |
| Font weight | Normal / Bold |
| Line spacing | 1.0 – 2.5 |
| Padding | 5px – 50px |
| Mirror mode | For physical teleprompter hardware |

All settings persist across app restarts.

### Window Management
- Default position: centered below the notch/camera
- Drag to reposition anywhere, resize freely
- Position and size saved between sessions
- **Reset to Notch** button to snap back to default
- Works across multiple displays

<br>

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Play / Pause | `Space` or `Cmd+P` |
| Speed Up | `Up Arrow` or `Cmd+]` |
| Speed Down | `Down Arrow` or `Cmd+[` |
| Reset to Start | `Cmd+R` |
| Toggle Prompter Window | `Cmd+Shift+P` |
| Increase Font | `Cmd+=` |
| Decrease Font | `Cmd+-` |
| Toggle Mirror | `Cmd+M` |
| Start with Countdown | `Cmd+Enter` |
| Reset Position to Notch | `Cmd+Shift+N` |

<br>

## Tech Stack

- **Electron** — cross-platform desktop framework
- **electron-store** — local persistence for scripts and settings
- **Vanilla JS** — no frontend framework, fast and lightweight
- **Two-window architecture** — editor (main) + prompter (overlay)

<br>

## Project Structure

```
moody/
  src/
    main/
      main.js          # Electron main process, window management, IPC
    renderer/
      editor/
        index.html     # Main editor window
        editor.css     # Dark theme styles
        editor.js      # Script management, controls, settings
      prompter/
        index.html     # Prompter overlay window
        prompter.css   # Transparent overlay styles
        prompter.js    # Scrolling engine, countdown, playback
    shared/
      preload.js       # Secure IPC bridge (contextIsolation)
  package.json
```

<br>

## Building for Distribution

```bash
npm run build
```

Produces a `.dmg` installer in the `dist/` folder via `electron-builder`.

<br>

## Privacy

Moody is fully offline. No accounts, no cloud sync, no telemetry, no analytics. Your scripts stay on your machine.

<br>

## License

MIT
