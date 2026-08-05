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

# Install a desktop entry so Gitty appears in the application menu (and on the
# desktop, when one exists) with its icon. It launches with --any so it can
# start from outside a work tree and fall back to the last repositories opened.
# Everything goes under ~/.local/share — even with --system, since a desktop
# shortcut is a per-user thing and needs no sudo.
install_desktop_entry() {
  local data="${XDG_DATA_HOME:-$HOME/.local/share}"
  local apps_dir="$data/applications"
  local icon_dir="$data/icons/hicolor/512x512/apps"
  local icon="$HERE/build/icon.png"

  if [ ! -f "$icon" ]; then
    echo "setup: no icon at $icon; skipping desktop entry" >&2
    return 0
  fi

  mkdir -p "$apps_dir" "$icon_dir"
  cp "$icon" "$icon_dir/gitty.png"

  # The launcher path may hold spaces; the desktop spec quotes Exec arguments.
  local launcher
  launcher="$(readlink -f "$LAUNCHER")"
  cat > "$apps_dir/gitty.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Gitty
Comment=Git history browser
Exec="$launcher" --any
Icon=gitty
Terminal=false
Categories=Development;
EOF
  chmod +x "$apps_dir/gitty.desktop"

  # A copy on the desktop itself, when the session has one; harmless to skip.
  local desktop
  desktop="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
  if [ -n "$desktop" ] && [ -d "$desktop" ]; then
    cp "$apps_dir/gitty.desktop" "$desktop/gitty.desktop"
    chmod +x "$desktop/gitty.desktop"
  fi

  # Without a refreshed cache the entry shows up with a blank icon until the
  # session is restarted: GTK trusts the theme's cache over the directory.
  if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$data/icons/hicolor" >/dev/null 2>&1 || true
  fi

  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$apps_dir" >/dev/null 2>&1 || true
  fi

  echo "desktop entry → $apps_dir/gitty.desktop"
}

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

install_desktop_entry

# Warn if the target isn't on PATH.
case ":$PATH:" in
  *":$TARGET_DIR:"*) : ;;
  *) echo
     echo "warning: $TARGET_DIR is not on your PATH."
     echo "add it with:  export PATH=\"$TARGET_DIR:\$PATH\"" ;;
esac
