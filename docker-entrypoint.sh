#!/bin/sh
set -eu

VIDEO_TEMP_DIR="${VIDEO_TEMP_DIR:-/data/video-temp}"

mkdir -p "$VIDEO_TEMP_DIR"

if [ "$(id -u)" = "0" ]; then
  chown -R bun:bun "$VIDEO_TEMP_DIR"

  if command -v runuser >/dev/null 2>&1; then
    exec runuser -u bun -- "$@"
  fi

  exec su bun -s /bin/sh -c 'exec "$0" "$@"' -- "$@"
fi

exec "$@"
