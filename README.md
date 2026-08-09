# Gitty

**English** · [简体中文](ref/readme/README.zh-CN.md) · [日本語](ref/readme/README.ja.md) · [Español](ref/readme/README.es.md) · [Français](ref/readme/README.fr.md) · [Deutsch](ref/readme/README.de.md)

*This English README is the official version and the only one kept up to date.
The translations are snapshots, each stamped with the date it was made; where
one disagrees with this file, this file is right.*

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

All panes are resizable by dragging the separators, and each one hides and comes
back — see [Full screen and hiding](#full-screen-and-hiding).

Uncommon in other git browsers:

- **A real shell docked to the history.** Not a git-calling widget — a genuine
  login shell (`$SHELL`) rooted at the repository, in the same window as the
  diff. Most git browsers leave the terminal outside, so checking a hunch means
  alt-tabbing. Here it is right there, and every other pane refreshes as the
  repository changes.
- **Two commits at once.** Click one, then <kbd>Ctrl+click</kbd> / <kbd>Shift+click</kbd> a
  second, and diff the pair in place — most browsers only diff a commit against
  its parent or a tree you pick in a dialog.
- **Browse any branch without checking it out.** Pick a branch and its whole
  history is there to read; the work tree, the diffs and the terminals stay
  exactly where git left them. Nothing in the working directory moves.
- **Markdown preview built in.** Selecting a `.md` change renders the document —
  syntax-highlighted code, an outline that tracks your scroll — at the revision
  you are on, not just the working copy.
- **A whole diff with every file's heading pinned.** With nothing selected you
  see every change at once, and the file heading you are reading stays glued to
  the top of the pane until the next file's heading pushes it away.
- **Text selection and copy that just works** — no mouse mode, no register, no
  keyboard gymnastics; select and copy anything anywhere in the window.
- **Every pane resizable, hidable, or full screen** — a four-pane layout that
  shrinks to just the diff, or just the log, and comes back.

![Gitty 0.1.4](ref/gitty-0.1.4.png)

## Why another one?

Because every tool I reached for got one thing wrong:

- **IDEs** — too heavy and too slow. (Believe me, I have tried every one I could
  find.)
- **lazygit, grv** — excellent tools, but unfriendly to the mouse and to
  selecting text.
- **gitui** — I want the commit list and the diff on screen at the same time.
- **SmartGit, GitKraken** — Java, heavy, dated, and they want your money.
- **gitg** and friends — again, no commit list and diff side by side.
- **tig** — diffs only, no file tree to browse.
- **gitk** — ugly!

Two more things I wanted and almost nothing offered: a **markdown preview**, and
**copy and paste that just works** anywhere in the window.

## Requirements

- Node.js 20 or newer
- `git` on `PATH`
- Linux, macOS or Windows with a desktop session
- Optionally [gource](https://gource.io/) on `PATH`, for
  [the animation](#gource); nothing changes if it is absent

## Running

Install the `gitty` command once:

```bash
npm install -g gitty-desktop      # installs the gitty command globally
```

or, from a checkout, link it into your PATH with:

```bash
./setup.sh               # symlink into ~/.local/bin (no sudo)
./setup.sh --system      # symlink into /usr/local/bin (needs sudo)
```

The `setup.sh` route also installs a clickable launcher, picked by platform.

On **Linux** the icon is added to the hicolor theme and a `gitty.desktop` entry
appears in the application menu (and on the desktop, when the session has one).
The icon cache and desktop database are refreshed afterwards, so the entry shows
up with its icon straight away. It carries one workaround, and the app runs with
one sandbox flag off — see
[Linux desktop integration](#linux-desktop-integration).

On **macOS** a minimal `Gitty.app` is written to `~/Applications` (with a
symlink on the Desktop) wrapping the same `run.sh`. Nothing is packaged: the
bundle exists to give Finder and the Dock a name and an icon. The Dock is not
touched — drag it there yourself if you want it pinned. See
[macOS app bundle](#macos-app-bundle).

Then open a repository from anywhere:

```bash
gitty                    # open the repository in the current directory
gitty /path/to/repo      # open another repository
gitty --fg               # keep it attached to the terminal (Ctrl+C quits)
gitty --dev              # hot-reloading development mode
gitty --any              # start even outside a work tree (what the desktop
                         # entry uses), falling back to the last repositories
```

Gitty detaches from the terminal and prints its pid, so the shell stays usable
and closing it does not take the window down. Output goes to
`${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log`, which is trimmed to its
last megabyte once it passes 4 MB.

`./run.sh` is the same script and works identically without the symlink. The
launcher installs dependencies and rebuilds the bundle when sources changed, so
the first run may take a moment. `npm run dev`, `npm run build` and `npm start`
are available directly as well.

Starting Gitty from a directory that is not inside a work tree falls back to the
last repository opened, instead of just complaining.

## The window

Four panes in the middle, a title bar above them and a tab bar below.

### Title bar

Left to right, it describes the active repository and then acts on it:

- **‹ › ▾** — where you have been in this repository. See
  [Going back](#going-back).
- **The repository path** is a button: it opens the
  [recent repositories](#recent-repositories) menu.
- **⎇ branch** is a button too — the branch git has checked out, and a menu of
  every other branch to read. See
  [browsing another branch](#browsing-another-branch).
- **`origin/main ↑2 ↓0`** — the upstream of the checked-out branch and how far
  ahead and behind it is. Absent on a branch that tracks nothing.
- **`3 changed`** — how many files the work tree has uncommitted, the same count
  the **Working Tree** row in the commits pane carries.
- **Panes ▾** — show or hide each of the four; see
  [Full screen and hiding](#full-screen-and-hiding).
- **Settings** — the preferences dialog ([Settings](#settings)),
  also <kbd>Ctrl+,</kbd>.
- **Open Repository** — a directory picker, opening into a new tab
  (<kbd>Ctrl+O</kbd>).
- **Refresh** — re-read status and log by hand (<kbd>F5</kbd> /
  <kbd>Ctrl+R</kbd>). Gitty watches the repository and refreshes on its own;
  this is for the times watching cannot see a change.

While you are reading another branch the branch button reads `⎇ main ›
other-branch`, and errors from the last git command appear in red beside the
counts.

### Going back

Reading history means wandering: a commit, a file inside it, another commit two
pages down the log, then back to the first one. The three buttons at the left of
the title bar remember that wandering, the way a browser does.

- **‹** (<kbd>Alt+←</kbd>) returns to the place you were looking at before this
  one, and **›** (<kbd>Alt+→</kbd>) goes back to the one you stepped away from.
  Both are greyed out when there is nowhere to go, and hovering either one names
  the place it would take you to.
- **▾** lists the places themselves, most recent first, with a dot on the one
  you are at. Pick any of them to jump straight there.

A *place* is everything the two top panes were showing: the view — the work
tree, one commit, a range of two, a snapshot — the file selected inside it, and
the document opened beside the diff. So a stop reads as `Working tree`,
`7bb7787 — Refresh screenshot batches`, `src/main/git.ts @ 7bb7787` or
`blame: src/main/git.ts @ 7bb7787`, and returning to it puts the same file back
on screen at the same revision rather than merely reselecting the commit.

The history belongs to the repository, not to the window: each tab remembers its
own fifty most recent places, and switching tabs switches which ones the buttons
walk. It is not kept across restarts.

### Tabs

A tab bar along the bottom holds every open repository — its basename, a yellow
dot when the working tree has uncommitted changes, and a **×** to close it. The
dot counts anything `git status` reports, untracked files included, and it earns
its place on the tabs you are *not* looking at: the active repository already
says `3 changed` in the title bar, while a background tab is hidden entirely, so
the dot is the only sign that there is work left there. Hovering a tab names the
repository and says so in words.

**+** (and <kbd>Ctrl+O</kbd>) opens another repository into a new tab; the title
bar always shows the active one. Each tab keeps its own panes and terminal, so a
commit you are reading and a shell you left running stay exactly where they were
when you switch away and back. Closing the last tab leaves an empty window with
a button to open the next repository. (Open tabs are not remembered across
restarts.)

### Recent repositories

The repository path in the title bar is a menu of the repositories opened
before — basename plus its parent directory — most recent first.

- **Click** — open it in a new tab.
- **Ctrl/Cmd+click** or **middle-click** — open it in the current tab, replacing
  the repository there and keeping the tab's place in the bar.
- **Right-click** — remove the entry from the list. The menu stays open, so
  several can be cleared in a row.

**Open Repository…** and **Clear Recent** sit below. The list lives in
`~/.config/Gitty/recent-repos.json`, holds twelve entries, and skips any that
have since been moved or deleted.

### Full screen and hiding

Every pane header carries the same two controls: **⤢** at its left fills the
window with that pane, and **×** at its right hides it.

Full screen covers everything else, including the title and tab bars, and the
panes underneath keep working — the terminal goes on running while it is
covered. **⤡** in the same corner, <kbd>Esc</kbd>, a double-click on the
header, or <kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd> restores the
layout. Only one pane is full screen at a time.

Hiding is the other direction — any pane can be put away and brought back:

- **Panes** in the title bar lists all four, with a dot beside the visible ones;
  clicking one toggles it, and **Show All Panes** restores the four-pane layout.
- <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> toggle Files, Diff, Commits and
  Terminal, in that order.
- <kbd>Ctrl+Shift+0</kbd> brings all four back — zero for "all of them", one
  key past the four that each toggle one. It takes the Shift because
  <kbd>Ctrl+0</kbd> is the browser engine's reset-zoom, which the View menu
  keeps.

Whatever is left shares out the window, so hiding the commits pane gives the
diff the full height. The last visible pane has no **×** — an empty window
would leave nothing to click. Hidden panes are remembered across restarts, and
the terminal pane is only put away, never closed: its shells keep running and
come back with their scrollback when it does.

## The panes

### Working Tree (top left)

Changed files as a collapsible tree, each with its line count beside the name.
Two status columns are shown: the staged state (green) and the work-tree state
(yellow / red); untracked files are `??`. The count is read from disk in the
work tree and from the revision everywhere else; binary files, deleted files and
anything above 8 MB simply show none. After it comes the churn — how many lines
this change added and removed in that file, `+12 −3`, against HEAD in the work
tree and against the parent for a commit or a range. A snapshot is a tree rather
than a change, so it has no churn; nor do binary files or a merge commit, whose
combined diff attributes nothing.

- **Click** — show the file's diff on the right.
- **Double-click** — open the whole file as a document beside the diff, with
  line numbers and syntax highlighting (a rendered document for markdown, the
  picture itself for an image).
- **Right-click** — View File, Open in System App, Reveal in File Manager, Copy
  Relative Path, Copy Absolute Path, Copy File Name, Blame File, File History.
- **Click a folder** — collapse or expand it.

When a commit or a commit range is selected, this pane lists that commit's files
instead; **Back to Work Tree** (or <kbd>Esc</kbd>) returns to the working tree.
In a [snapshot](#snapshots) it lists the entire tree at that commit, not just
what changed.

### Diff (top right)

Unified diff with old/new line numbers, hunk headers and add/delete colouring,
laid out as a list of files: each path is a full-width heading, the hunk header
is dimmed — a line range, not the thing to look at first — and a rename reads
`old → new`. With no file selected it shows everything at once: every
uncommitted change in the work tree, or every file in the selected commit.

- **Show Whole Diff** — back to that combined diff after picking a file. It
  stays in the header and lights up while the whole diff is what you are
  looking at. The work-tree version covers staged and unstaged changes together
  and inlines untracked files (up to 50, then a notice), which `git diff` alone
  leaves out.
- **Wrap** — wrap long lines instead of scrolling sideways. On by default.
- **Inline / Side-by-Side** — one column with `+`/`-` markers, or old and new
  next to each other, where a run of deletions is zipped with the additions that
  follow it. Wrapped halves stay aligned.
- **File headings** — each heading folds its file: the triangle collapses it
  to the name, and **Collapse All** / **Expand All** in the header does the
  lot. **Ctrl+click** a heading opens that file in a new document tab;
  right-click it for **Open in a New Tab**, **Select in the File List**, the
  path copies and — in the work tree, where the file on disk is the version
  shown — **Open in System App** and **Reveal in File Manager**. A rename
  opens its new path.
- **Right-click** — Copy Selection, Copy Whole Diff, and the same toggles.

Changed words inside a changed line are highlighted where that reads better than
the whole line at once; it is **Word highlight** in [Settings](#settings).

Settings are remembered between runs. Rows render in chunks of 1500 and extend
as you scroll, so large commits stay responsive; diffs above 2 MB are truncated
with a notice.

### Viewing files

A diff is what the pane shows by default, but any file can be opened whole:
**double-click** it in the tree, use **View File** / **Preview** in the header,
**Ctrl+click** a file heading in the diff, or take it from either context menu.

The file opens as its own document in a strip of tabs beside the diff, rather
than over it, so a file can be read without losing the diff you were on. The
**Diff** tab is always first and a single click in the tree still browses diffs
in place. Each document remembers the revision it was opened at, closes with its
own **×**, and re-reads a work-tree file when the repository changes. Source
files get line numbers and syntax highlighting; markdown opens
[rendered](#markdown-preview), with a toggle back to the source; an image opens
as [the picture](#images).

Which revision you get follows the pane: the file on disk in the work tree, the
file as it was at the selected commit everywhere else. Opening a document is an
action rather than a mode — selecting another file or another commit puts the
diff back — so the pane is never stuck showing files when you wanted changes.

#### Snapshots

Right-click a commit and choose **Browse Snapshot** to read the repository as it
was at that commit: the top-left pane lists the *entire* tree rather than the
files that commit touched, and picking any file opens it at that revision. A
snapshot has no diff to show, so every file there is a document.

The files in a snapshot never existed on disk at that revision, which is why
**Open in System App** hands over a temporary copy of it and **Reveal in File
Manager** is not offered. **Back to Work Tree** (or <kbd>Esc</kbd>) leaves.

#### Markdown preview

Selecting a `.md` file adds a **Preview** button — off by default, so a diff
stays a diff until you ask for the rendered document. It renders the file as a
whole: the version on disk in the work tree, the version at the selected commit
everywhere else.

Fenced code blocks are syntax-highlighted when they name a language, YAML front
matter is lifted out and shown as its own highlighted block, and heading levels,
list markers, links and inline code are colour-coded so structure reads at a
glance.

- **Wrap** — the same toggle as the diff, on by default. Prose always wraps; in
  a preview this decides whether fenced code blocks, wide tables and long inline
  strings wrap too, rather than scrolling sideways.
- **Outline** — the heading structure beside the document, indented by level,
  tracking the heading you have scrolled to. Click an entry to jump.
- **Right-click** — Copy Selection, Copy Markdown Source, the wrap and outline
  toggles, and Show Diff Instead.

Raw HTML inside the markdown is not rendered, and links open in the system
browser rather than inside the app. Images written relative to the document are
read out of the repository — at the same revision as the document, so an old
commit shows the screenshots it shipped with. One the repository does not have
there leaves a dashed placeholder with its alt text. Images from the web are not
fetched at all: reading a stranger's README should not announce you to whatever
host it points at.

#### Images

A `.png`, `.jpg`, `.gif`, `.webp`, `.bmp`, `.ico`, `.avif` or `.svg` opens as
the picture rather than as a report that it is binary — from disk in the work
tree, from the commit everywhere else. It is fitted to the pane over a
checkerboard, so transparency reads as transparency; **click** it for actual
size and scroll around, click again to fit. Its pixel dimensions and size on
disk sit underneath. Images above 12 MB are not inlined.

#### Blame and file history

Right-click any file in the tree and choose **Blame File** or **File History**;
both open as documents beside the diff. Blame shows one row per source line —
the commit, its author and the line itself, with an em dash where a line is not
committed yet — at the revision you are viewing. File History lists every commit
that touched the file, follows renames, and clicking a commit opens it.

### Commits (bottom left)

The log of the current branch, loaded 300 at a time and extended as you scroll.
The first row is the **Working Tree** — the uncommitted changes, with a count of
changed files; selecting it brings the top panes back to the work tree. A filter
box above the log narrows the list to commits whose message or author contain the
text you type — debounced, with a ✕ to clear — and the list pages the same way.

- **Click** or <kbd>Enter</kbd> — show that commit: its files fill the top-left
  pane and its full diff the top-right one. The commit's subject, author, date
  and full body appear in a strip above the file list; when the body is long, a
  ▸ toggle folds it away so the file list keeps the room.
- **Ctrl+Click** (<kbd>Cmd</kbd> on macOS), <kbd>Shift+Click</kbd> or
  <kbd>Space</kbd> — pick a second commit and diff the two, oldest first.
- **↑ ↓ / j k / PgUp / PgDn / Home / End** — move the cursor.
- **Right-click** — show the diff, copy the hash, the short hash or the subject,
  [browse the snapshot](#snapshots), or diff against the currently selected
  commit.
- **Right-click → Open in Browser** — render this commit in the system browser;
  **Copy Commit URL** copies the link. A web server inside the app (listening on
  `127.0.0.1` only, for your own browser) serves every open repository as a
  browsable commit list — the commits pane's **Open in Browser** button lands
  there — with each commit's metadata, files and diff, and per-file diffs one
  click away. The URLs work while the repository is open.
- Selecting a file in the top-left pane narrows the diff to that file;
  **Show Whole Diff** widens it back out.

#### Gource

If [gource](https://gource.io/) is on `PATH`, the commits pane grows a
**Gource** button beside **Open in Browser**: it plays the repository's history
as an animation — the directory tree growing, files lighting up as each commit
lands, one author flying between them per name in the log. Gource opens a window
of its own and keeps running after you close Gitty; the button only waits long
enough to see that it started, and shows what gource said if it did not.

It is started with a day of history per half second, idle files kept on screen
and long gaps skipped, which is what makes a real repository readable rather
than a slow trickle. Nothing is installed for you: where gource is not on
`PATH`, the button is simply not there.

#### Browsing another branch

The branch in the title bar opens a menu of every local and remote-tracking
branch, newest commit first, and picking one shows that branch's history
instead. It is a read-only look: gitty runs no `checkout`, so the work tree,
its diffs and the terminals stay exactly where git left them. While you are
looking at another branch the title bar reads `⎇ main › other-branch` and the
commit pane says which branch it is listing; **Back to <branch>** returns.
Each tab browses on its own.

#### Push and Pull

**Push** and **Pull** sit in the header, and both act on the checked-out branch
whichever branch the log is pointed at. **Push** counts what is unpushed —
**Push 3** — and greys out when there is nothing to send; on a branch that
tracks nothing it publishes the branch to `origin` and sets the upstream.
**Pull** fast-forwards from the upstream, and is greyed out when there is no
upstream to pull from. Whatever git says appears above the log — click to
dismiss it; failures stay until you do.

Neither can answer a prompt: there is no terminal behind them, so a push that
wants a password or a passphrase fails with git's own message rather than
hanging, and a pull that cannot fast-forward says so. Both are then finished by
hand in the terminal pane, which is right there.

### Terminal (bottom right)

A real interactive login shell (`$SHELL`) rooted at the repository, so any git
command can be run directly. The other panes refresh automatically when the
repository changes on disk.

The pane splits into as many shells as you want: **Split →** puts a new one
beside the focused terminal, **Split ↓** below it, and the separators between
them drag like every other pane. Clicking a terminal focuses it — the outlined
one is where the next split or **Close** lands. Splitting the same way twice
extends the row or column rather than nesting, so three side-by-side terminals
resize against each other.

**Close** ends the focused shell; leaving a shell with `exit` closes its split
by itself. The last terminal always stays: exiting it leaves the notice on
screen instead of an empty pane.

## Settings

**Settings** in the title bar, or <kbd>Ctrl+,</kbd>. Everything here applies to
every tab and is remembered across restarts; **Restore Defaults** puts it all
back.

| | |
| --- | --- |
| **Theme** | Dark or Light. |
| **Language** | English, 简体中文, 日本語, 한국어, Français, Deutsch, Español, Русский or Português — the interface, the menus and the dialogs all change together without restarting. |
| **Font size** | 11 – 16, in half points. Applies to every pane, the terminal included. |
| **Row height** | 18 – 26 pixels — the line height every list is built on, the file tree, the log and the diff. Tighter fits more on screen, looser reads easier. |
| **Diff layout** | Inline or Side-by-Side, the same toggle the diff header carries. |
| **Word wrap** | Wrap long lines instead of scrolling sideways. |
| **Word highlight** | Mark the words that changed inside a changed line, not just the line. |
| **Markdown outline** | Show the outline beside a rendered document. |

**Word wrap**, **Diff layout** and **Markdown outline** are the same toggles the
diff header carries, so changing one in either place changes both. **Word
highlight** lives here only.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| <kbd>Enter</kbd> | Show the selected commit |
| <kbd>Space</kbd> / <kbd>Ctrl+Click</kbd> | Mark a second commit and diff the pair |
| <kbd>Ctrl+Click</kbd> on a file heading | Open that file in a new document tab |
| <kbd>Esc</kbd> | Back to the working tree |
| <kbd>Alt+←</kbd> / <kbd>Alt+→</kbd> | Back and forward through the places viewed |
| <kbd>F5</kbd> / <kbd>Ctrl+R</kbd> | Refresh status and log |
| <kbd>Ctrl+O</kbd> | Open another repository in a new tab |
| <kbd>Ctrl+,</kbd> | Settings |
| <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> | Hide or show Files, Diff, Commits, Terminal |
| <kbd>Ctrl+Shift+0</kbd> | Show all four panes again |
| <kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd> | Fill the window with that pane |

## Architecture

```
src/main       Electron main process — git commands, ptys, fs watchers,
               the recent-repository store, IPC
src/preload    contextBridge API exposed to the renderer as window.gitty
src/renderer   React UI — App.tsx manages tabs, RepoTab.tsx owns one
               repository's four panes
src/shared     Types shared by both sides
build          Application icon (SVG source and rendered PNG)
```

Git is driven through `execFile('git', …)` with `--porcelain=v2 -z` /
`--name-status -z` parsing, so paths with spaces and renames survive. No git
library is bundled; whatever `git` is on `PATH` is what you see. The renderer
runs with `contextIsolation` and no node integration.

The renderer is split into lazy-loaded chunks so the window paints before
xterm, highlight.js and markdown-it are parsed. The split — the four chunks,
the rules for keeping heavy libraries out of warm ones, and how to add a new
one — is specified in [ref/spec/lazy-loading.md](ref/spec/lazy-loading.md).

### Linux desktop integration

The desktop entry carries `StartupWMClass=electron`, which is what gives the
running window its icon in the window list and the dock. An Electron app that
is run rather than packaged reports `electron` as its window class whatever the
application calls itself, so that is the name the entry has to match — with the
side effect that another unpackaged Electron app on the same session would
borrow Gitty's icon.

The app also runs with Chromium's SUID sandbox disabled
(`ELECTRON_DISABLE_SANDBOX=1`). The usual fix — making `chrome-sandbox` owned by
root with mode 4755 — cannot survive inside `node_modules`, so disabling it is
the pragmatic choice for a local tool that only reads your own repositories.

### macOS app bundle

`Gitty.app` is a wrapper, not a package: `Contents/MacOS/Gitty` is a two-line
script that execs `run.sh --fg --any`. `--fg` matters — exec all the way down
means the Dock tile stays on the bundle instead of being orphaned by a process
that outlives it — and `--any` lets a launch from Finder, which has no working
directory to speak of, fall back to the repositories opened most recently.

The name is right in all three places it appears, and only one of them comes
from the bundle. Finder and the Dock read `CFBundleName` and `CFBundleIconFile`
out of `Info.plist`; the menu bar is `app.name`, which `app.setName('Gitty')`
sets before any window exists and `{ role: 'appMenu' }` uses as its label. So
unlike the Linux window-class problem above, nothing here is a compromise —
which is why packaging (electron-builder) would buy nothing but signing.

A bundle launched from Finder inherits launchd's minimal `PATH`, with no nvm and
no Homebrew on it, and `run.sh` needs `node` and `npm` to rebuild when the
bundle is stale. `setup.sh` resolves them at install time and prepends them —
a prefix, so a terminal launch is unaffected. Switching Node versions later
leaves that path stale; re-run `setup.sh` to repoint it.

## Licence

MIT
