#!/usr/bin/env bash
# Batch MP4 audio-strip + resize with fallback.
# Usage: ./tools/batch_resize_mp4.sh ./source_videos ./assets/signals_opt
# Notes:
# - Only .mp4 are processed. Add other extensions if needed.
# - Skips files whose output already exists unless FORCE=1.
# - Maintains aspect ratio; width ≤ 420; height auto, even.

set -u -o pipefail

SRC_DIR="${1:-./source_videos}"
DEST_DIR="${2:-./assets/signals_opt}"
FORCE="${FORCE:-0}"

mkdir -p "$DEST_DIR"

shopt -s nullglob
files=( "$SRC_DIR"/*.mp4 )
if [ ${#files[@]} -eq 0 ]; then
  echo "No .mp4 files found in $SRC_DIR"
  exit 0
fi

for f in "${files[@]}"; do
  base="$(basename "$f")"
  name="${base%.*}"
  out="$DEST_DIR/$name.mp4"

  if [ -f "$out" ] && [ "$FORCE" != "1" ]; then
    echo ">> SKIP (exists): $out"
    continue
  fi

  echo ">> Processing: $f -> $out"
  tmp="$(mktemp "/tmp/${name}.XXXXXX.mp4")"
  rc=0

  # Attempt 1: strip audio + resize to width 420, re-encode with libx264 (veryfast), yuv420p
  # Note: scaling requires re-encode; stream copy is not possible when using -vf scale.
  ffmpeg -y -hide_banner -loglevel error \
    -i "$f" -an \
    -vf "scale='min(420,iw)':'-2':flags=lanczos" \
    -c:v libx264 -crf 26 -preset veryfast -pix_fmt yuv420p \
    -movflags +faststart \
    "$tmp" || rc=$?

  if [ $rc -ne 0 ]; then
    echo "!! Attempt 1 failed, trying Attempt 2 (baseline@3.0)"
    rc=0
    ffmpeg -y -hide_banner -loglevel error \
      -i "$f" -an \
      -vf "scale='min(420,iw)':'-2':flags=lanczos" \
      -c:v libx264 -crf 26 -preset veryfast -pix_fmt yuv420p \
      -profile:v baseline -level 3.0 \
      -movflags +faststart \
      "$tmp" || rc=$?
  fi

  if [ $rc -ne 0 ]; then
    echo "!! FAILED: $f"
    rm -f "$tmp"
    continue
  fi

  mv -f "$tmp" "$out"
  echo ">> OK: $out"
done

echo "All done."
