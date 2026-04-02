#!/bin/bash
# install.sh
# Installs the AutoCaption CEP extension for macOS.
# Run from the autocaption/ folder:
#   bash install.sh

set -e

EXTENSION_ID="com.autocaption.panel"
PLUGIN_SRC="$(cd "$(dirname "$0")/$EXTENSION_ID" && pwd)"
INSTALL_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/$EXTENSION_ID"

echo "=== AutoCaption Installer ==="
echo ""

# ── 1. Copy extension ────────────────────────────────────────────────────────
echo "[1/3] Installing extension to:"
echo "      $INSTALL_DIR"
echo ""

rm -rf "$INSTALL_DIR"
cp -R "$PLUGIN_SRC" "$INSTALL_DIR"
echo "      Done."
echo ""

# ── 2. Enable unsigned extensions (PlayerDebugMode) ─────────────────────────
echo "[2/3] Enabling unsigned CEP extensions (PlayerDebugMode)..."
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.10 PlayerDebugMode 1
defaults write com.adobe.CSXS.9  PlayerDebugMode 1
echo "      Done."
echo ""

# ── 3. Make scripts executable ───────────────────────────────────────────────
echo "[3/3] Setting permissions on bin/ scripts..."
chmod +x "$INSTALL_DIR/bin/build-whisper.sh" 2>/dev/null || true
chmod +x "$INSTALL_DIR/bin/download-model.sh" 2>/dev/null || true
if [ -f "$INSTALL_DIR/bin/whisper-mac" ]; then
  chmod +x "$INSTALL_DIR/bin/whisper-mac"
fi
echo "      Done."
echo ""

echo "=== Installation complete! ==="
echo ""
echo "NEXT STEPS:"
echo ""
echo "  1. Build whisper.cpp binary (one-time setup):"
echo "     bash \"$INSTALL_DIR/bin/build-whisper.sh\""
echo ""
echo "  2. Download the base.en model (~148 MB, one-time):"
echo "     bash \"$INSTALL_DIR/bin/download-model.sh\" base.en"
echo ""
echo "  3. Install ffmpeg if not already installed:"
echo "     brew install ffmpeg"
echo ""
echo "  4. Restart After Effects."
echo ""
echo "  5. Open the panel: Window > Extensions > AutoCaption"
echo ""
