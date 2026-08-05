#!/usr/bin/env bash
#
# Launch Gitty.
#
#   gitty                    open the current directory's repository
#   gitty /path/to/repo      open another repository
#   gitty --fg [repo]        stay in the foreground (Ctrl+C quits)
#   gitty --dev [repo]       run with hot reload (electron-vite dev)
#   gitty --any [repo]       start even outside a work tree (desktop launcher)
#   ./run.sh ...             same, but resolved from this checkout
#
# Gitty detaches from the terminal by default; its output goes to
# ${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log
#
set -euo pipefail

# Resolve symlinks so `gitty` (installed via setup.sh) finds this checkout.
SCRIPT="$(readlink -f "${BASH_SOURCE[0]}")"
HERE="$(cd "$(dirname "$SCRIPT")" && pwd)"
CALLER_PWD="$PWD"

DEV=0
FOREGROUND=0
ANY=0
REPO=""
for arg in "$@"; do
  case "$arg" in
    --dev|-d) DEV=1 ;;
    --fg|--foreground|-f) FOREGROUND=1 ;;
    --any|-a) ANY=1 ;;
    -h|--help) sed -n '2,14p' "$SCRIPT" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) REPO="$arg" ;;
  esac
done

REPO="${REPO:-$CALLER_PWD}"
if [ -d "$REPO" ]; then
  REPO="$(cd "$REPO" && pwd)"
  if ! git -C "$REPO" rev-parse --show-toplevel >/dev/null 2>&1; then
    if [ "$ANY" -eq 1 ]; then
      # Not a work tree; let the app fall back to the last repositories opened.
      REPO=""
    else
      echo "gitty: $REPO is not inside a git work tree" >&2
      exit 1
    fi
  fi
elif [ "$ANY" -eq 1 ]; then
  REPO=""
else
  echo "gitty: no such directory: $REPO" >&2
  exit 1
fi

cd "$HERE"

if [ ! -d node_modules ]; then
  echo "gitty: installing dependencies..."
  npm install
fi

# Run without the SUID chrome-sandbox (avoids the "owned by root, mode 4755"
# abort on machines where node_modules can't carry setuid binaries).
export ELECTRON_DISABLE_SANDBOX=1

if [ -n "$REPO" ]; then
  export GITTY_REPO="$REPO"
fi

if [ "$DEV" -eq 1 ]; then
  exec npx electron-vite dev
fi

# Rebuild when the bundle is missing or any source file is newer than it.
if [ ! -f out/main/index.js ] || [ -n "$(find src electron.vite.config.ts -newer out/main/index.js 2>/dev/null)" ]; then
  echo "gitty: building..."
  npm run build
fi

ELECTRON="$HERE/node_modules/electron/dist/electron"
[ -x "$ELECTRON" ] || ELECTRON="$HERE/node_modules/.bin/electron"

# Everything from here uses absolute paths: a --any launch with no repository
# changes directory below so the app opens from outside any work tree and its
# recent-repositories fallback kicks in.
MAIN="$HERE/out/main/index.js"
if [ "$ANY" -eq 1 ] && [ -z "$REPO" ]; then
  cd "$HOME"
fi

if [ "$FOREGROUND" -eq 1 ]; then
  exec "$ELECTRON" "$MAIN" ${REPO:+"$REPO"}
fi

LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/gitty"
LOG="$LOG_DIR/gitty.log"
mkdir -p "$LOG_DIR"

# Keep the log from growing without bound: past 4 MB, keep only the tail.
if [ -f "$LOG" ] && [ "$(wc -c <"$LOG")" -gt 4194304 ]; then
  tail -c 1048576 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

{
  echo
  echo "=== $(date '+%Y-%m-%d %H:%M:%S')  $REPO"
} >>"$LOG"

# Detach: the window outlives the terminal that started it.
nohup "$ELECTRON" "$MAIN" ${REPO:+"$REPO"} >>"$LOG" 2>&1 &
PID=$!
disown "$PID" 2>/dev/null || true

echo "gitty: ${REPO:-no repository} (pid $PID)"
echo "gitty: log $LOG"
