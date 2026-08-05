# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gitty is an Electron desktop git history browser with four panes: working tree
(top left), diff (top right), commit log (bottom left) and an interactive shell
(bottom right). See README.md for the user-facing behaviour of each pane.

**Everything user-visible is English** — the interface, README, CHANGELOG and
commit messages. Conversation with the user may be in another language, but
nothing that lands in the repository is.

## Commands

```bash
./run.sh [repo]          # build if stale, launch detached, print the pid
./run.sh --fg [repo]     # same but attached to the terminal
./run.sh --dev [repo]    # electron-vite dev with hot reload
npm run typecheck        # tsc over both tsconfigs — the only automated check
npm run build            # electron-vite build into out/
./setup.sh               # symlink run.sh as `gitty` into ~/.local/bin
```

A detached run writes everything to
`${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log`; use `--fg` when you want
the output inline.

There is **no test suite and no linter configured**. `npm run typecheck` is the
whole automated safety net; run it after every change. Verification beyond that
is visual — see below.

`npm install` runs `electron-rebuild -f -w node-pty` via `postinstall`; node-pty
is native and must match Electron's ABI, not Node's. If the terminal pane fails
to start after changing Electron versions, re-run that rebuild.

## Verifying changes visually

The UI cannot be checked by reading code, and this is a Wayland session where
X11 screenshot tools capture nothing. Screenshot it from inside Electron
instead: build, patch a `capturePage` call into `out/main/index.js` (the built
bundle, never the source) at the `ready-to-show` handler, run with
`GITTY_REPO=<repo>` and an env var carrying a delay plus an output path, then
read the PNG. Drive the UI first by passing a snippet to
`win.webContents.executeJavaScript` — clicking `.commit-row`, `.row` or header
buttons, or dispatching a `contextmenu` MouseEvent. `out/` is gitignored and
rebuilt, so the patch is throwaway.

Use a repository with real history for this; this repo's own log is short.

## Architecture

Three processes with a hard boundary between them:

- **`src/main/`** — owns everything privileged: git subprocesses, the pty, the
  fs watcher, dialogs, clipboard, `shell.openPath`.
- **`src/preload/`** — the only bridge. Exposes a frozen `window.gitty` API over
  `contextBridge`; the renderer has no node integration and no direct IPC.
- **`src/renderer/`** — React UI, pure presentation over that API.
- **`src/shared/types.ts`** — the contract both sides import.

Adding a capability means touching all three: an `ipcMain.handle` in
`src/main/index.ts`, a method in `src/preload/index.ts`, and a type in
`src/shared/types.ts`.

### Git access

`src/main/git.ts` shells out to `git` via `execFile` — no git library. Parsing
relies on NUL-separated machine formats (`status --porcelain=v2 -z`,
`--name-status -z`, `ls-tree -z`) so paths with spaces and renames survive;
rename records carry an extra NUL field, which is why those loops advance the
index by hand. Diffs above 2 MB are truncated with a notice rather than sent
whole. Whatever `git` is on `PATH` is what the app shows.

### The `View` union drives the UI

`App.tsx` holds a `View` of four modes — `worktree`, `commit`, `range`,
`snapshot` — and both top panes are derived from it:

| mode | top-left file list | top-right |
| --- | --- | --- |
| `worktree` | uncommitted changes | that file's diff |
| `commit` | files the commit touched | commit diff (whole, or one file) |
| `range` | files changed between two commits | range diff |
| `snapshot` | the entire tree at that commit | that file's contents, read-only |

`selectedFile` narrows the diff within a mode. The commit log's first row is a
pseudo-commit (`WORKTREE_ROW`) standing for the work tree; it joins keyboard
navigation and selecting it returns to `worktree` mode.

Snapshot mode reuses the diff renderer by prefixing every content line with a
space so it parses as context lines. Its entries carry a synthetic
`gitty:snapshot:<hash>:<path>` absPath, which has no on-disk existence — that is
what the file context menu keys off to route "Open File" through a temp copy of
that revision and to drop "Reveal in File Manager", which would have nothing to
reveal.

### DiffPane

Takes raw unified-diff text and parses it itself. Rows render in chunks of 1500
that grow as the end nears, rather than a fixed-height virtual window: word wrap
and the side-by-side grid both make row heights variable. Inline rows carry
`content-visibility: auto` so off-screen ones cost nothing. Side-by-side zips
each run of deletions with the additions that follow it, one grid row per pair,
so wrapped halves stay aligned. Wrap and view mode persist in `localStorage`
under `gitty.wrap` / `gitty.diffView`.

`MarkdownPane` takes over the same pane for `.md` files when preview is on
(`gitty.mdPreview`, off by default). It renders whole-file source, not a diff:
from disk via `git.readWorking` in the work tree, from the revision via
`git.snapshotFile` elsewhere. markdown-it runs with `html: false` so raw HTML
stays inert without a sanitiser; heading ids are assigned on the token stream
before rendering, so the outline and the document cannot disagree. Front matter
is sliced off before parsing (markdown-it would read `---` as a rule) and
rendered as its own highlighted block. highlight.js is imported through
`lib/core` with languages registered one by one — the full bundle dwarfs the
rest of the renderer — and its token colours are mapped onto the app palette in
CSS instead of importing one of its themes. Link clicks
are intercepted — a plain `<a>` navigation would replace the whole app window.

Full screen is a `position: fixed` class on the pane rather than a different
tree, deliberately: unmounting the layout would dispose the terminal's pty and
kill whatever is running in it.

### Terminal

One pty at a time, held in a module-level variable in `src/main/index.ts`.
Starting a new session disposes the old one, and a disposed session goes silent
so its exit notice cannot land in the terminal that replaced it.

### Refresh

`src/main/watcher.ts` watches the work tree recursively, filters `.git` down to
the few paths that matter (`HEAD`, `index`, `refs/`, …) plus build-output noise,
and debounces into a single `repo:changed` event. The renderer reloads status
and log on it. Watching is best-effort; the manual refresh path must keep
working if it fails.

## Gotchas

- **`react-resizable-panels` v4** exports `Group` / `Panel` / `Separator` with
  an `orientation` prop — not the v3 `PanelGroup` / `PanelResizeHandle` names
  that most examples and model priors show. Sizes are strings like `"55%"`.
- **TypeScript 7** removed `baseUrl`; path aliases must be relative.
- **vite must stay on 7.x** — electron-vite 5 peers on `^5 || ^6 || ^7`.
- **An application menu must exist.** Without one Chromium binds no edit
  accelerators at all and Ctrl+C on selected diff text silently does nothing.
  The menu bar itself is hidden (`autoHideMenuBar`).
- **Linux runs with `ELECTRON_DISABLE_SANDBOX=1`** (set by `run.sh`);
  `chrome-sandbox` cannot keep a root-owned setuid bit inside `node_modules`.
- The repository to open is resolved as `$GITTY_REPO`, else the first argv entry
  that is a directory (argv also holds the electron binary and the entry
  script), else cwd.

## Conventions

- Keep `CHANGELOG.md` current (Keep a Changelog format). Released versions are
  tagged `vX.Y.Z` with a matching GitHub release; put new work under
  `## [Unreleased]`, not into a published section.
- Comments explain why, not what — the existing ones mark git format quirks and
  layout constraints that are not obvious from the code.
