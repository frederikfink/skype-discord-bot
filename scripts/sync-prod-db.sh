#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/data"
OUT="$OUT_DIR/bot-prod.db"
VOLUME="${RAILWAY_VOLUME:-}"
SERVICE="${RAILWAY_SERVICE:-skype-discord-bot}"

if ! command -v railway >/dev/null; then
  echo "Railway CLI is required: https://docs.railway.com/guides/cli"
  exit 1
fi

cd "$ROOT"
mkdir -p "$OUT_DIR"

resolve_volume_name() {
  if [[ -n "$VOLUME" ]]; then
    echo "$VOLUME"
    return
  fi

  if ! command -v jq >/dev/null; then
    return
  fi

  local json
  json="$(railway volume list --json 2>/dev/null)" || return

  if echo "$json" | jq -e '.volumes[]? | select(.name == "bot-data")' >/dev/null; then
    echo "bot-data"
    return
  fi

  echo "$json" | jq -r '.volumes[0].name // .volumes[0].id // empty'
}

verify_sqlite() {
  if [[ ! -s "$OUT" ]]; then
    return 1
  fi
  if ! command -v sqlite3 >/dev/null; then
    return 0
  fi
  sqlite3 "$OUT" "SELECT 1 FROM sqlite_master WHERE type='table' AND name='user_stats';" | grep -q 1
}

download_volume_file() {
  local vol="$1"
  local remote="$2"
  local local_path="$3"
  railway volume files -v "$vol" download "$remote" "$local_path" --overwrite
}

sync_via_volume() {
  local vol="$1"
  echo "Using Railway volume: ${vol}"
  echo "Volume contents at /:"
  railway volume files -v "$vol" list / || true

  rm -f "$OUT" "$OUT-wal" "$OUT-shm"

  if ! download_volume_file "$vol" "/bot.db" "$OUT"; then
    return 1
  fi

  download_volume_file "$vol" "/bot.db-wal" "$OUT-wal" || true
  download_volume_file "$vol" "/bot.db-shm" "$OUT-shm" || true
  verify_sqlite
}

sync_via_ssh() {
  echo "Using railway ssh on service: ${SERVICE}"

  if [[ -f "$HOME/.ssh/id_ed25519" ]] && ! ssh-add -l >/dev/null 2>&1; then
    echo "Tip: your SSH key may use a passphrase. Run: eval \"\$(ssh-agent -s)\" && ssh-add ~/.ssh/id_ed25519"
  fi

  local remote_tar_cmd='DATA_DIR=$(dirname "${DATABASE_PATH:-/app/data/bot.db}")
if ! cd "$DATA_DIR"; then
  echo "Database directory not found: $DATA_DIR" >&2
  exit 1
fi
if test -f bot.db-wal; then
  tar cf - bot.db bot.db-wal bot.db-shm
else
  tar cf - bot.db
fi'

  local tmp_tar tmp_err
  tmp_tar="$(mktemp)"
  tmp_err="$(mktemp)"

  if ! railway ssh -s "$SERVICE" -- sh -c "$remote_tar_cmd" >"$tmp_tar" 2>"$tmp_err"; then
    cat "$tmp_err" >&2
    rm -f "$tmp_tar" "$tmp_err"
    return 1
  fi

  if [[ -s "$tmp_err" ]]; then
    cat "$tmp_err" >&2
  fi

  if ! tar tf "$tmp_tar" bot.db >/dev/null 2>&1; then
    echo "SSH did not return a valid database archive:" >&2
    head -c 500 "$tmp_tar" >&2 || true
    echo >&2
    rm -f "$tmp_tar" "$tmp_err"
    return 1
  fi

  rm -f "$OUT" "$OUT-wal" "$OUT-shm"
  tar xf "$tmp_tar" -C "$OUT_DIR"
  rm -f "$tmp_tar" "$tmp_err"

  [[ -f "$OUT_DIR/bot.db" ]] && mv "$OUT_DIR/bot.db" "$OUT"
  [[ -f "$OUT_DIR/bot.db-wal" ]] && mv "$OUT_DIR/bot.db-wal" "$OUT-wal"
  [[ -f "$OUT_DIR/bot.db-shm" ]] && mv "$OUT_DIR/bot.db-shm" "$OUT-shm"
  verify_sqlite
}

print_help() {
  cat <<EOF

Could not download a valid bot.db.

This is usually NOT a wrong service name — linked service "${SERVICE}" is fine.

What we see on Railway:
  • railway volume list → empty (no volume exists yet; railway.toml "bot-data" was never applied)
  • Data lives on the running container at /app/data/bot.db until you add a volume

Do this once in Railway (dashboard):
  1. skype-discord-bot → Volumes → New volume → mount path /app/data
  2. Redeploy the bot
  3. pnpm db:sync-prod   (volume download should work; name can be anything — script auto-picks)

If you rely on SSH instead:
  eval "\$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519   # if key has a passphrase
  railway ssh -s ${SERVICE} -- ls -la /app/data          # must work before sync
  pnpm db:sync-prod

Or skip local SQLite entirely: deploy apps/web on Railway with the same /app/data volume.

EOF
}

echo "Checking Railway volumes ..."
rm -f "$OUT" "$OUT-wal" "$OUT-shm"

resolved_volume="$(resolve_volume_name || true)"

if [[ -n "$resolved_volume" ]] && sync_via_volume "$resolved_volume"; then
  echo "Synced via volume."
elif sync_via_ssh; then
  echo "Synced via SSH."
else
  print_help
  exit 1
fi

echo "Saved to $OUT"
if [[ -f "$OUT-wal" ]]; then
  echo "Included WAL sidecar: $OUT-wal"
fi
echo "Ensure .env has: DATABASE_PATH=./data/bot-prod.db"
echo "Restart the web app after sync."
