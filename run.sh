#!/usr/bin/env bash
#
# Launch Gitty.
#
#   gitty                    open the current directory's repository
#   gitty /path/to/repo      open another repository
#   gitty --dev [repo]       run with hot reload (electron-vite dev)
#   ./run.sh ...             same, but resolved from this checkout
#
set -euo pipefail

# Resolve symlinks so `gitty` (installed via setup.sh) finds this checkout.
SCRIPT="$(readlink -f "${BASH_SOURCE[0]}")"
HERE="$(cd "$(dirname "$SCRIPT")" && pwd)"
CALLER_PWD="$PWD"

DEV=0
REPO=""
for arg in "$@"; do
  case "$arg" in
    --dev|-d) DEV=1 ;;
    -h|--help) sed -n '2,9p' "$SCRIPT" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) REPO="$arg" ;;
  esac
done

REPO="${REPO:-$CALLER_PWD}"
if [ ! -d "$REPO" ]; then
  echo "gitty: no such directory: $REPO" >&2
  exit 1
fi
REPO="$(cd "$REPO" && pwd)"

if ! git -C "$REPO" rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "gitty: $REPO is not inside a git work tree" >&2
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

export GITTY_REPO="$REPO"

if [ "$DEV" -eq 1 ]; then
  exec npx electron-vite dev
fi

# Rebuild when the bundle is missing or any source file is newer than it.
if [ ! -f out/main/index.js ] || [ -n "$(find src electron.vite.config.ts -newer out/main/index.js 2>/dev/null)" ]; then
  echo "gitty: building..."
  npm run build
fi

exec npx electron out/main/index.js "$REPO"
