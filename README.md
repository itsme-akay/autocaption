# AutoCaption — After Effects CEP Plugin (macOS)

Auto-generates caption text layers on your AE timeline using a local
whisper.cpp binary. No internet, no API key.

---

## Requirements

| Tool | Install |
|------|---------|
| After Effects 2021+ (v18+) | Adobe CC |
| Xcode Command Line Tools | `xcode-select --install` |
| cmake | `brew install cmake` |
| ffmpeg | `brew install ffmpeg` |

---

## Setup (one-time)

### Step 1 — Install the extension

```bash
bash install.sh
```

This copies the plugin to `~/Library/Application Support/Adobe/CEP/extensions/`
and sets `PlayerDebugMode=1` so AE loads unsigned extensions.

### Step 2 — Build whisper.cpp

```bash
bash ~/Library/Application\ Support/Adobe/CEP/extensions/com.autocaption.panel/bin/build-whisper.sh
```

This clones whisper.cpp from GitHub, compiles it, and saves the binary as
`bin/whisper-mac` inside the plugin folder. Takes 1–3 minutes.

### Step 3 — Download a model

```bash
bash ~/Library/Application\ Support/Adobe/CEP/extensions/com.autocaption.panel/bin/download-model.sh base.en
```

Available models (larger = slower but more accurate):

| Model | Size | Speed |
|-------|------|-------|
| tiny.en  | ~39 MB  | Very fast |
| base.en  | ~74 MB  | Fast ✓ recommended |
| small.en | ~244 MB | Accurate |
| medium.en | ~769 MB | Best quality |

For non-English audio, download without `.en`:
```bash
bash bin/download-model.sh base
```

### Step 4 — Restart After Effects

Then open: **Window > Extensions > AutoCaption**

---

## Usage

1. Open a composition that has an audio or video layer with audio.
2. Open the AutoCaption panel.
3. Click **Refresh** to confirm your comp and audio layer are detected.
4. Choose font size, color, vertical position, and Whisper model.
5. Click **Generate Captions**.
6. Wait for transcription (progress shown in the log panel).
7. Caption text layers appear on the timeline, named `CAP_1`, `CAP_2`, etc.

To remove all captions: click **Clear Captions**.

---

## File Structure

```
com.autocaption.panel/
├── CSXS/
│   └── manifest.xml          ← Required: tells AE about this extension
├── client/
│   ├── index.html            ← Panel UI
│   ├── main.js               ← Panel logic
│   ├── style.css             ← Panel styles
│   └── CSInterface.js        ← Adobe bridge library
├── host/
│   └── index.jsx             ← ExtendScript: reads/writes AE timeline
├── node/
│   └── transcribe.js         ← Node.js: ffmpeg + whisper.cpp runner
├── bin/
│   ├── build-whisper.sh      ← Compiles whisper.cpp (run once)
│   ├── download-model.sh     ← Downloads GGML model (run once)
│   ├── whisper-mac           ← Binary (created by build script)
│   └── ggml-base.en.bin      ← Model weights (downloaded by script)
└── assets/
    └── icon_32.png           ← Panel icon
```

---

## Troubleshooting

**Panel not visible in Window > Extensions:**
- Make sure `PlayerDebugMode` was set: `defaults read com.adobe.CSXS.11 PlayerDebugMode` should return `1`.
- Restart AE after installation.

**"whisper-mac binary not found":**
- Run `build-whisper.sh` first.

**"Whisper model not found":**
- Run `download-model.sh base.en`.
- Make sure the selected model in the panel matches the downloaded file.

**"ffmpeg not found":**
- Run `brew install ffmpeg`.

**Captions appear at wrong time:**
- Check that your audio layer starts at frame 0. If it has an offset, the timestamps will drift. Pre-comp the audio layer to align it to 0 first.

**Garbled or missing text:**
- Try a larger model (`small.en` or `medium.en`).
- For non-English audio, download the multilingual model and set the language in the panel.

---

## How It Works

1. **CSInterface.evalScript** calls `getAudioFilePath()` in `host/index.jsx`,
   which walks the active comp's layers and returns the linked file's OS path.

2. **node/transcribe.js** (running in CEP's built-in Node.js):
   - Converts the audio to 16kHz mono WAV via `ffmpeg`
   - Runs `whisper-mac -m model.bin -f audio.wav -oj -of output`
   - Parses the output JSON: `{ transcription: [{timestamps:{from,to}, text}] }`

3. **CSInterface.evalScript** calls `createCaptionLayers(segments, options)`
   in `host/index.jsx`, which iterates the segments and for each one:
   - `comp.layers.addText(text)` — creates a text layer
   - Sets `inPoint` / `outPoint` from whisper timestamps
   - Applies font, size, color, and position via the AE scripting DOM

---

## License

MIT
