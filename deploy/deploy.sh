#!/usr/bin/env bash
# Runs on the deploy host after the release has been synced. Ensures a secret
# key and database path exist, restarts the systemd unit, and waits for the app
# to answer.
set -euo pipefail

ENV_FILE="$HOME/grange.env"
DATA_DIR="$HOME/grange-data"
PORT="${APP_PORT:-3200}"

if [ ! -s "$ENV_FILE" ]; then
  umask 077
  printf 'SECRET_KEY_BASE=%s\n' "$(openssl rand -base64 48)" > "$ENV_FILE"
fi

# Keep the SQLite database outside the release directory, which rsync replaces
# with --delete on every deploy. Only set it when absent or empty so an explicit
# DATABASE_PATH in ~/grange.env is never overwritten.
if ! grep -q '^DATABASE_PATH=.' "$ENV_FILE"; then
  printf 'DATABASE_PATH=%s\n' "$DATA_DIR/grange.sqlite3" >> "$ENV_FILE"
fi

export XDG_RUNTIME_DIR="/run/user/$(id -u)"

systemctl --user restart grange
curl --retry 15 --retry-delay 2 --retry-connrefused -fsS "http://127.0.0.1:${PORT}/api/state"
echo