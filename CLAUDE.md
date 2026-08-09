# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gitty is an Electron desktop git history browser with four panes: working tree
(top left), diff (top right), commit log (bottom left) and an interactive shell
(bottom right). See README.md for the user-facing behaviour of each pane.

### Language

Two rules, and the line between them is *shipped UI* versus *the repository*.

**The interface is translatable.** Every user-visible string goes through the
message tables (see [Messages and i18n](#messages-and-i18n)) — never a literal in
JSX or a dialog call. English (`en`) is the source table: it is what gets written
first, and what every other language is translated from.

**Everything else is English, always.** Documentation, code comments, the
CHANGELOG, commit messages, `ref/spec/*`, this file. Conversation with the user
may be in another language, but nothing that lands in the repository is — except
the two things below, which are translations of English originals rather than
work authored in another language.

`ref/readme/README.<lang>.md` holds README translations (zh-CN, ja, es, fr, de).
They are **snapshots, not a second source of truth** — each carries the date it
was translated and a line saying the English README is the official version and
the only one kept current. Do not update a translation as part of changing
behaviour; the English README is what has to stay right. They live under `ref/`
rather than `docs/`, which GitHub Pages would claim. Because translated headings
would produce unpredictable anchors, each section carries an explicit
`<a id="…">` with the English slug, so the cross-links match the English file's.

Message tables other than `en` are the same kind of thing — translations that
follow, never lead. A new string is added to `en` and to the interface in the
same change; the other tables catch up afterwards.

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

There is **no linter configured**. The automated safety net is `npm run
typecheck` plus `npm test`; run both after every change. The test suite lives
in `test/` — one vitest file per parser, feeding `parse.ts` fixtures without a
repository — so the folder is a readable index of what is tested. Verification
beyond that is visual — see below.

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

### Messages and i18n

Every user-visible string comes from a message table. `src/shared/messages.ts`
declares the shape — `MainMessages` and `RendererMessages` — and each side ships
its own table against it: `src/main/messages.ts` (menus, dialogs, and the strings
git output is wrapped in) and `src/renderer/src/messages/` (everything on
screen), whose `index.ts` re-exports the active table as `msg`.

The two sides are split because they need different things and load at different
times, not because the boundary is doctrinal — main's table covers what exists
before any window does, and the renderer's is part of the renderer bundle.

**There is no runtime interpolation and no lookup by key.** A leaf is either a
string or an arrow function taking typed parameters and returning one, so
`msg.app.changesCount(3)` is an ordinary call the compiler checks: a missing key,
a typo, or a wrong argument type is a typecheck error rather than a `??? key`
rendered to the user at runtime. That is the whole reason the tables are typed
objects and not JSON. It also means a plural or a word order that a language
needs differently is expressible — the function body is code, not a template.

Adding a string means adding it to the interface in `src/shared/messages.ts` and
to `en`; `npm run typecheck` then names every table that is missing it. Do not
reach for a literal because a string is "obviously not going to be translated" —
the tables are also where the wording of the whole UI can be read at once.

Nine languages exist — `en`, `zh`, `ja`, `ko`, `fr`, `de`, `es`, `ru`, `pt` —
and the **Language** setting picks one at runtime. The renderer reads it through
`locale.ts`, whose `LocaleProvider` / `useMsg()` hand the active table to every
component; `messages/index.ts` maps a `Locale` onto its table and falls back to
`en`. The main process cannot use a hook, so `src/main/messages.ts` keeps its
tables behind a `Proxy` that `setMainLocale()` re-points, and the IPC handler
rebuilds the application menu so its labels change with the rest.

Because `msg` now changes over the life of a component, it is a **dependency
like any other**: a `useCallback`, `useMemo` or `useEffect` that reads it must
list it, or its strings stay on the language they were first rendered in.

Adding a language is a new table beside `en.ts`, a `Locale` in `locale.ts`, an
entry in `messages/index.ts`, and a `MainMessages` table in `src/main/messages.ts`
— miss the last one and the menus quietly stay English.

### Git access

`src/main/git.ts` shells out to `git` via `execFile` — no git library. Parsing
relies on NUL-separated machine formats (`status --porcelain=v2 -z`,
`--name-status -z`, `ls-tree -z`) so paths with spaces and renames survive;
rename records carry an extra NUL field, which is why those loops advance the
index by hand. Diffs above 2 MB are truncated with a notice rather than sent
whole. Whatever `git` is on `PATH` is what the app shows.

`push` / `pull` go through `remoteOp`, which is deliberately non-interactive:
`GIT_TERMINAL_PROMPT=0`, empty `GIT_ASKPASS` / `SSH_ASKPASS`, `ssh -o
BatchMode=yes` and a two-minute timeout. There is no terminal behind an
`execFile`, so a credential or passphrase prompt would block forever with
nowhere to appear. For the same reason it returns `{ ok, output }` rather than
throwing — the pane shows git's own words, and anything needing an answer is
finished in the terminal pane. `pull` is `--ff-only`: a merge that needs a
decision or an editor is not something a button should start.

### Gource

`src/main/gource.ts` is an *optional* companion, and the shape follows from
that: `available()` walks `PATH` once (the result is cached — PATH does not
change under a running app) and the commits pane simply does not render the
button when it comes back false, rather than showing one that fails on click.

`play()` spawns it detached and resolves after a 2.5 s grace period: long
enough to catch the immediate failures (no display, no OpenGL, an unreadable
path) and report gource's own stderr through the same strip push and pull use,
short enough that the button does not feel stuck. If it is still alive when the
timer fires, its pipes are destroyed and it is `unref`'d — gource draws its own
window and is meant to outlive Gitty, so nothing is piped through the app.

### Multiple repositories, tabs

`App.tsx` is a thin tab manager: the list of open roots, which is active, the
app-wide preferences (theme, font size, wrap, …), and the settings dialog. Each
open root renders one `RepoTab` (`src/renderer/src/RepoTab.tsx`) owning that
repository's whole session — status, log, the `View`, selected file, context
menu, and its own `TerminalsPane`. Inactive tabs stay mounted (`display: none`),
so switching never disturbs another repo's view state or shells. The main
process keeps one watcher per root and tags `repo:changed` with the root, so
each tab refreshes only its own repository. The tab bar (basename, dirty dot,
close button, `+` to open) sits below the panes, with an empty state when every
tab is closed. `react-resizable-panels` keeps layout state per Group id, so
`RepoTab` suffixes its ids with the root.

Two things the tab shells must not lose. **`min-width: 0`** on `.tab-content`,
`.repo-tab-shell` and `.repo-tab`: a flex item defaults to `min-width: auto`, so
without it a tab is stretched by its own nowrap content — long paths, long
commit subjects — and its panel group ends up wider than the window. The panel
percentages stay correct while the total is wrong, which shows up as one pane
squeezed to a sliver (its header buttons clipped away) and another pushed off
screen entirely. And **`disabled={!active}`** on every Group of a hidden tab:
the library hit-tests the pointer against every registered group, and a
`display: none` group reports a zero-sized rect.

### Full screen and hiding panes

Full screen is one `PaneId | null` per `RepoTab` and a `position: fixed` class
on that pane, deliberately: unmounting the layout would dispose the terminal's
pty and kill whatever is running in it. `components/PaneChrome.tsx` holds the
two header buttons both `RepoTab` and `TerminalsPane` render, so the icons and
wording cannot drift between the terminal's own header and the other three.
`Ctrl+Shift+1..4` is read off `e.code`: with Shift down the key itself is
punctuation.

### Hiding panes

`src/renderer/src/panes.ts` holds the `PaneVisibility` record; `App.tsx` owns it
(app-wide, like the other view preferences, persisted under `gitty.panes`) and
`RepoTab` simply does not render a hidden pane's `Panel` — nor the `Separator`
beside it, nor a whole row when both its panes are gone. Two consequences worth
keeping. Panel sizes are stored **per Group id**, so the ids carry the visible
set (`top-fd`, `bottom-lt`); reusing one id for two different child counts
restores sizes that no longer add up. And the last visible pane renders no hide
button — an empty window would leave only the title bar's **Panes** menu as the
way back.

Hiding the terminal pane unmounts `TerminalsPane`, which must not end its
shells. Its split tree therefore lives beside the xterm registry in
`terminals.ts`, keyed by root, and sessions are destroyed only by
`destroyTerminals(root)`, which `RepoTab` calls when it unmounts — that is, when
the repository tab closes.

### Recent repositories

`src/main/recent.ts` keeps the list in `app.getPath('userData')` — which is why
`app.setName('Gitty')` runs before anything else, or an unpackaged run would
scatter state into `~/.config/Electron`. Reads filter out paths that no longer
exist, so a deleted repository disappears from the menu on its own. Remembering
is best-effort and never blocks opening a repository.

### The `View` union drives the UI

Each `RepoTab` holds a `View` of four modes — `worktree`, `commit`, `range`,
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

### Browsing history

`src/renderer/src/nav.ts` is the leaf module holding a `NavPlace` — a `View`, the
`selectedFile` within it and the open `FileDocState` — plus the pure
`pushPlace` / `samePlace` / `navLabel`. `FileDocState` lives there rather than in
`RepoTab` because the history is what has to reconstruct one.

`RepoTab` records rather than intercepts: one `useMemo` builds the current place
and one effect pushes it. Every route into a view — the log, the file list, the
context menus, Escape — already goes through `setView` / `setSelectedFile` /
`setDocs`, so nothing has to remember to log itself, and a new one cannot forget.
`goTo` needs no re-entrancy guard for the same reason the recording is cheap:
it moves the index **first**, so the place the effect would then push is the one
already sitting at `nav.index` and `pushPlace` returns the history unchanged.

The buttons are in `App.tsx`'s title bar because that is where they belong
visually, but the history is per repository, so `RepoTab` reports it up through
`onNav` (exactly like `onStatus`) and `App` drives it back through the
`RepoTabHandle` — reactive state for the enabled/disabled buttons, an imperative
call for the move.

### Browsing another branch

The title bar's branch is a menu (`git for-each-ref` over `refs/heads` and
`refs/remotes`) and picking one sets `browsingByRoot[root]` in `App.tsx`, which
each `RepoTab` takes as its `browsing` prop and passes to `git.log` as a ref.
That is the whole feature: **nothing is checked out**. Status, the work tree
pane, its diffs and the shells all still describe the branch git is on, which is
why the work-tree row stays in the log and the title bar shows both names. A
change of branch drops the loaded commits rather than merging two histories,
and clears the selection with them.

`refs/remotes/origin/HEAD` is filtered out by full ref name: its short name is
plain `origin`, which would read as a branch of its own.

Snapshot entries carry a synthetic `gitty:snapshot:<hash>:<path>` absPath, which
has no on-disk existence — that is what the file context menu keys off to route
"Open File" through a temp copy of that revision and to drop "Reveal in File
Manager", which would have nothing to reveal.

### DiffPane

Takes raw unified-diff text and parses it itself. Rows render in chunks of 1500
that grow as the end nears, rather than a fixed-height virtual window: word wrap
and the side-by-side grid both make row heights variable. Inline rows carry
`content-visibility: auto` so off-screen ones cost nothing. Side-by-side zips
each run of deletions with the additions that follow it, one grid row per pair,
so wrapped halves stay aligned. Wrap and view mode persist in `localStorage`
under `gitty.wrap` / `gitty.diffView`.

### Viewing whole files

`fileView` swaps the diff for the file itself. It is deliberately **not**
persisted and is cleared whenever another file or commit is selected: a history
browser defaults to diffs, and viewing a file is an action (double-click, menu,
header toggle) rather than a mode to get stuck in. Snapshot mode forces it on —
a snapshot has no diff. Either way the source comes
from `git.readWorking` in the work tree and `git.snapshotFile` at a revision;
`CodePane` renders it with line numbers, and `MarkdownPane` takes over for `.md`.

`highlight.ts` is shared by both. highlight.js is imported through `lib/core`
with languages registered one by one — the full bundle dwarfs the rest of the
renderer — and its token colours are mapped onto the app palette in CSS rather
than importing one of its themes. `highlightLines` exists because highlight.js
emits one blob whose spans run across newlines (block comments, template
literals): it walks the output keeping the stack of open spans, so each line can
be its own element without broken markup.

In `MarkdownPane`, markdown-it runs with `html: false` so raw HTML stays inert
without a sanitiser; heading ids are assigned on the token stream before
rendering, so the outline and the document cannot disagree; front matter is
sliced off first, since markdown-it would read `---` as a horizontal rule; and
link clicks are intercepted, because a plain `<a>` navigation would replace the
whole app window.

Images are the one thing the renderer cannot resolve for itself: a relative
`src` would be fetched against the bundle, and a revision's bytes were never on
disk at all. `git.readImageFile` returns them as a data: URL (`ImagePane` for a
file opened on its own, `MarkdownPane` for the ones inside a document), keyed by
the same `rev` as the document, so a commit renders with its own screenshots.
The substitution happens **in the render pass** — the image rule reads a map off
markdown-it's `env` and re-renders once the fetches land. Patching `src` onto
the rendered DOM instead is the obvious thing and does not work: React owns that
subtree through `dangerouslySetInnerHTML` and rewrites it wholesale, silently
discarding the patch. The CSP is `img-src 'self' data:`, so a `https://` image
in a document is not fetched — deliberately, since rendering someone else's
README should not report to their host.

Full screen is a `position: fixed` class on the pane rather than a different
tree, deliberately: unmounting the layout would dispose the terminal's pty and
kill whatever is running in it.

### Lazy loading

The renderer is four chunks so the window paints before the heavy libraries are
parsed: `App` → `RepoTab` → `{ FileDoc, TerminalsPane }`, each boundary a
`React.lazy` inside a `Suspense`. highlight.js and markdown-it may be imported
only from the `FileDoc` subtree, xterm only from `TerminalsPane` — a static
import from a warm chunk drags the library back into the main bundle, which is
how the original 1.6 MB bundle was born (dead `CodePane` / `MarkdownPane`
imports in `RepoTab`, and `contextMenus` reaching into `FileDoc` for
`isMarkdownPath`). Two leaf modules keep that graph honest: `paths.ts` holds the
path predicates with no imports, and `terminals.ts` holds the session and
split-layout registries importing xterm **only as `import type`**, so `RepoTab`
can call `destroyTerminals` synchronously when a tab closes without loading the
xterm chunk. The full rulebook — chunk layout, the invariant, how to add a heavy
dependency — is `ref/spec/lazy-loading.md`.

### Terminal

The pane splits, so ptys are kept in a `Map` keyed by a session id the renderer
mints (`src/main/index.ts`), and every `terminal:*` message names its session.
A disposed session goes silent so its exit notice cannot land in the terminal
that replaced it, and a reload disposes them all — the ids that could reach
them are gone with the old renderer.

`TerminalsPane` holds the split as a tree: a leaf is one shell, a branch shares
its area between children, and splitting the same way twice extends the branch
instead of nesting. Changing the set of children remounts its `Group` so the
panels share out evenly again, which is only affordable because **the xterm
instances live outside React** — the `sessions` registry in `terminals.ts` owns
the DOM node and the terminal (created by `ensureSession` in `TerminalPane.tsx`),
and the component merely re-parents that node. Unmounting a real xterm would
take the running shell with it, and every split moves terminals between panels.
Sessions therefore end only in
`destroySession`: **Close**, a shell that exited, or the tab's `TerminalsPane`
unmounting (closing the repository tab).

### Refresh

`src/main/watcher.ts` watches the work tree recursively, filters `.git` down to
the few paths that matter (`HEAD`, `index`, `refs/`, …) plus build-output noise,
and debounces into a `repo:changed` event tagged with the root. The main process
keeps one watcher per open repository in a `Map`; closing a tab (`repo:close`)
stops that root's watcher. Each `RepoTab` reloads status and log only for its own
root. Watching is best-effort; the manual refresh path must keep working if it
fails.

The debounce narrows the burst but does not serialise anything: a refresh and
the next event can both be waiting on `git`, and the replies come back in
whatever order git finishes. Both `refresh` and `loadDiff` therefore stamp each
call with a sequence number and drop a reply that a newer call has overtaken.
Without it the panes disagree — the diff pane re-runs git for every render and
so always shows the truth, while a stale `git status` landing last leaves the
work tree pane (and the title bar's count) listing changes already committed.

## Gotchas

- **`react-resizable-panels` v4** exports `Group` / `Panel` / `Separator` with
  an `orientation` prop — not the v3 `PanelGroup` / `PanelResizeHandle` names
  that most examples and model priors show. Sizes are strings like `"55%"`.
- **`ready-to-show` cannot be the only thing that shows the window.** Under
  Wayland an unmapped window's renderer can withhold its first frame, which is
  precisely the frame that event waits for, so the app starts and never appears
  — the DOM is there, the compositor simply submits nothing. `createWindow`
  therefore arms a fallback off `did-finish-load`; run it under
  `--ozone-platform=x11` to see the event fire normally again.
- **TypeScript 7** removed `baseUrl`; path aliases must be relative.
- **vite must stay on 7.x** — electron-vite 5 peers on `^5 || ^6 || ^7`.
- **An unpackaged Electron app's window class is always `electron`.** Which is
  why `setup.sh` writes `StartupWMClass=electron` into the desktop entry: that
  string is what the window list and the dock match a window against to find
  its icon. `app.setName`, `--class`, `--name`, `--wm-class-class`,
  `CHROME_DESKTOP` and renaming the binary (symlink or hard link) were all
  measured and all leave `WM_CLASS` — the Wayland `app_id` — alone. Only
  packaging Gitty into its own executable would change it. **This is a Linux
  fact and does not generalise**: on macOS the name is already right, because
  the application menu is `{ role: 'appMenu' }` and Electron labels it with
  `app.name`, which `app.setName('Gitty')` has set before any window exists.
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
- Files under `ref/` — specs and any other standalone documents — are named
  with a date prefix: `YYYY-MM-DD-<name>.md`, so they sort by the day they were
  written and each carries its date in its name. The README translations are the
  exception: their filenames are globbed by README.md as `README.<lang>.md` and
  they already record their translation date inside.
- Comments explain why, not what — the existing ones mark git format quirks and
  layout constraints that are not obvious from the code.
