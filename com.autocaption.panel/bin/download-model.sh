#!/bin/bash
# bin/download-model.sh
# Downloads a whisper.cpp GGML model into the bin/ folder.
# Usage: bash bin/download-model.sh [model_name]
# Default model: base.en

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODEL="${1:-base.en}"
DEST="$SCRIPT_DIR/ggml-${MODEL}.bin"

if [ -f "$DEST" ]; then
  echo "Model already exists: $DEST"
  exit 0
fi

BASE_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main"
FILE="ggml-${MODEL}.bin"
URL="$BASE_URL/$FILE"

echo "Downloading $FILE from HuggingFace..."
echo "URL: $URL"
echo ""

curl -L --progress-bar -o "$DEST" "$URL"

echo ""
echo "Saved to: $DEST"
echo "Done."
