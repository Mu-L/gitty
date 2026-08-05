#!/usr/bin/env bash
#
# Install Gitty as a global `gitty` command.
#
#   ./setup.sh               install to ~/.local/bin (no sudo needed)
#   ./setup.sh --system      install to /usr/local/bin (requires sudo)
#
# After installing, run `gitty .` (or just `gitty`) from any repository.
#
set -euo pipefail

HERE="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
LAUNCHER="$HERE/run.sh"

if [ "${1:-}" = "--system" ]; then
  TARGET_DIR="/usr/local/bin"
else
  TARGET_DIR="${XDG_BIN_HOME:-$HOME/.local/bin}"
fi

if [ ! -f "$LAUNCHER" ]; then
  echo "setup: launcher not found: $LAUNCHER" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
ln -sfn "$LAUNCHER" "$TARGET_DIR/gitty"

echo "gitty installed → $TARGET_DIR/gitty"
echo "  run:  gitty .          # open the current repository"
echo "  run:  gitty --dev .    # dev mode with hot reload"

# Warn if the target isn't on PATH.
case ":$PATH:" in
  *":$TARGET_DIR:"*) : ;;
  *) echo
     echo "warning: $TARGET_DIR is not on your PATH."
     echo "add it with:  export PATH=\"$TARGET_DIR:\$PATH\"" ;;
esac
