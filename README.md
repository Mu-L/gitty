# Gitty

A four-pane git history browser for the desktop, in the spirit of `lazygit` but
with real mouse interaction: double-click to open a file, right-click to copy
its path, click two commits to diff them.

```
┌──────────────────────┬──────────────────────┐
│ Working Tree         │ Diff                 │
│ (or a commit's files)│ (unified, coloured)  │
├──────────────────────┼──────────────────────┤
│ Commits              │ Terminal             │
│ (log, ↑↓, Enter)     │ (a real shell)       │
└──────────────────────┴──────────────────────┘
```

All panes are resizable by dragging the separators.

## Requirements

- Node.js 20 or newer
- `git` on `PATH`
- Linux, macOS or Windows with a desktop session

## Running

```bash
./run.sh                 # open the repository in the current directory
./run.sh /path/to/repo   # open another repository
./run.sh --dev           # hot-reloading development mode
```

The script installs dependencies and rebuilds the bundle when sources changed,
so the first run may take a moment. `npm run dev`, `npm run build` and
`npm start` are available directly as well.

## The panes

### Working Tree (top left)

Changed files as a collapsible tree. Two status columns are shown: the staged
state (green) and the work-tree state (yellow / red); untracked files are `??`.

- **Click** — show the file's diff on the right.
- **Double-click** — open the file with the system default application.
- **Right-click** — Open File, Reveal in File Manager, Copy Relative Path, Copy
  Absolute Path, Copy File Name.
- **Click a folder** — collapse or expand it.

When a commit or a commit range is selected, this pane lists that commit's files
instead; **Back to Work Tree** (or <kbd>Esc</kbd>) returns to the working tree.

### Diff (top right)

Unified diff with old/new line numbers, hunk headers and add/delete colouring.
Long diffs are virtualised so large commits stay responsive; diffs above 2 MB are
truncated with a notice. The text is selectable for copying.

### Commits (bottom left)

The log of the current branch, loaded 300 at a time and extended as you scroll.

- **Click** or <kbd>Enter</kbd> — show that commit: its files fill the top-left
  pane and its full diff the top-right one.
- **Ctrl+Click** (<kbd>Cmd</kbd> on macOS), <kbd>Shift+Click</kbd> or
  <kbd>Space</kbd> — pick a second commit and diff the two, oldest first.
- **↑ ↓ / j k / PgUp / PgDn / Home / End** — move the cursor.
- **Right-click** — show the diff, copy the hash, the short hash or the subject,
  or diff against the currently selected commit.
- Selecting a file in the top-left pane narrows the diff to that file;
  **Show Whole Diff** widens it again.

### Terminal (bottom right)

A real interactive login shell (`$SHELL`) rooted at the repository, so any git
command can be run directly. The other panes refresh automatically when the
repository changes on disk.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| <kbd>Enter</kbd> | Show the selected commit |
| <kbd>Space</kbd> / <kbd>Ctrl+Click</kbd> | Mark a second commit and diff the pair |
| <kbd>Esc</kbd> | Back to the working tree |
| <kbd>F5</kbd> / <kbd>Ctrl+R</kbd> | Refresh status and log |
| <kbd>Ctrl+O</kbd> | Open another repository |

## Architecture

```
src/main       Electron main process — git commands, pty, fs watcher, IPC
src/preload    contextBridge API exposed to the renderer as window.gitty
src/renderer   React UI — the four panes
src/shared     Types shared by both sides
```

Git is driven through `execFile('git', …)` with `--porcelain=v2 -z` /
`--name-status -z` parsing, so paths with spaces and renames survive. No git
library is bundled; whatever `git` is on `PATH` is what you see. The renderer
runs with `contextIsolation` and no node integration.

## Licence

MIT
