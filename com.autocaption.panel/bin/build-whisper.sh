#!/bin/bash
# bin/build-whisper.sh
# Clones and compiles whisper.cpp for macOS (Apple Silicon + Intel).
# Output: bin/whisper-mac
#
# Requirements:
#   - Xcode command line tools: xcode-select --install
#   - cmake: brew install cmake

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$SCRIPT_DIR/whisper-mac"
BUILD_DIR="/tmp/whisper_build_$$"

if [ -f "$DEST" ]; then
  echo "whisper-mac already exists at: $DEST"
  echo "Delete it and re-run to rebuild."
  exit 0
fi

echo "=== AutoCaption: Building whisper.cpp ==="
echo ""

# Check for cmake
if ! command -v cmake &>/dev/null; then
  echo "cmake not found. Install it with:"
  echo "  brew install cmake"
  exit 1
fi

echo "Cloning whisper.cpp..."
git clone --depth=1 https://github.com/ggerganov/whisper.cpp "$BUILD_DIR"

echo ""
echo "Building (Release)..."
cmake -S "$BUILD_DIR" -B "$BUILD_DIR/build" -DCMAKE_BUILD_TYPE=Release -DWHISPER_NO_AVX512=ON 2>&1 | tail -5
cmake --build "$BUILD_DIR/build" --config Release -j"$(sysctl -n hw.ncpu)" 2>&1 | tail -10

# The binary is called 'whisper-cli' in recent versions, 'main' in older ones
BUILT_BIN=""
for candidate in "$BUILD_DIR/build/bin/whisper-cli" "$BUILD_DIR/build/bin/main" "$BUILD_DIR/build/whisper-cli" "$BUILD_DIR/build/main"; do
  if [ -f "$candidate" ]; then
    BUILT_BIN="$candidate"
    break
  fi
done

if [ -z "$BUILT_BIN" ]; then
  echo "ERROR: Could not find compiled binary. Check build output."
  exit 1
fi

cp "$BUILT_BIN" "$DEST"
chmod +x "$DEST"
rm -rf "$BUILD_DIR"

echo ""
echo "=== Done ==="
echo "Binary: $DEST"
echo ""
echo "Next: download a model with:"
echo "  bash bin/download-model.sh base.en"
