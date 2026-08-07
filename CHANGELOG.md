# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Push** and **Pull** in the commits pane header, acting on the checked-out
  branch. **Push** carries the count of unpushed commits (**Push 3**) and greys
  out when there is nothing to send; on a branch that tracks nothing it
  publishes to `origin` and sets the upstream. **Pull** fast-forwards from the
  upstream and greys out when there is none. Git's own output appears above the
  log, clicked away when read — failures stay until dismissed. Neither can
  answer a credential prompt (there is no terminal behind them), so one that
  needs a password fails with git's message instead of hanging, and the
  terminal pane is where it gets finished.

- Every pane hides and comes back. Each pane header ends in a **×** that hides
  it, **Panes** in the title bar lists all four with a dot on the visible ones,
  and <kbd>Ctrl+1</kbd>…<kbd>Ctrl+4</kbd> toggle them in layout order. The
  remaining panes share out the space; the last visible pane keeps its **×**
  hidden, so the window is never empty. What is hidden is remembered across
  restarts, and hiding the terminal pane leaves its shells running — they come
  back with their scrollback intact.
- The file heading stays in view while scrolling a whole-file diff. Once the
  heading you are reading under scrolls past the top of the pane, it pins itself
  to the top until the next file's heading scrolls up and pushes it away, so the
  name of the file the lines belong to is never more than one glance up. A
  single-file diff is unaffected — nothing would ever push its heading off.
- Every pane goes full screen, not just the diff. **⤢** at the left of each pane
  header fills the window with that pane; **⤡**, <kbd>Esc</kbd>, a double-click
  on the header or <kbd>Ctrl+Shift+1</kbd>…<kbd>Ctrl+Shift+4</kbd> restores the
  layout. The diff's **Full Screen** / **Restore** button is gone, its corner
  button replacing it.

### Fixed

- Reading a long file no longer jumps back to the top when the file changes on
  disk. A markdown preview or a source view is re-read on every repository
  change, and the scroll reset that belongs to opening another document was
  firing on the new text as well — editing a file elsewhere while reading it
  here threw the reader back to line one. The position is kept across a reload
  now (and with it the lines already loaded in the source view), and only
  opening a different document rewinds.
- The running window shows Gitty's icon in the window list and the dock instead
  of a generic placeholder. The desktop entry now carries
  `StartupWMClass=electron`: an unpackaged Electron app reports `electron` as
  its window class (its Wayland `app_id`) whatever `app.setName`, `--class`,
  `CHROME_DESKTOP` or a renamed binary say, so that is the name the entry has to
  match. Re-run `./setup.sh` and restart Gitty to pick it up.
- The work tree pane no longer gets stuck listing changes that are already
  committed. A burst of file-system events could start several refreshes at
  once, and a slow earlier `git status` landing after a newer one put its stale
  file list back on screen — while the diff pane, which re-runs git for every
  render, showed the real state. Replies that a newer refresh has overtaken are
  now discarded, for the diff pane as well.

## [0.1.2] - 2026-08-06

### Added

- The diff pane holds several documents at once. A single click still browses
  diffs in place, but double-clicking a file (or **View File** / **Preview**)
  opens it in a strip beside the diff rather than over it, so a diff can stay on
  screen while a file is read. Each document remembers the revision it was
  opened at, closes with its own **×**, and reloads on its own when the work
  tree changes.
- A file heading inside a diff opens that file: **Ctrl+click** it, or use its
  context menu, which also copies the path and — for the work tree, where the
  file on disk is still the version shown — hands it to the system application.
  A rename opens the new path.
- Files in a multi-file diff fold: a triangle on each file heading collapses it
  to its name, and **Collapse All** / **Expand All** in the header does the lot.
  Everything starts expanded, and a new diff arrives expanded.
- Every commit has a local URL: a web server inside the app (127.0.0.1 only)
  renders commits for the system browser. Right-click a commit for **Open in
  Browser** or **Copy Commit URL**; the commits pane's **Open in Browser**
  button lands on the repository's commit list, where each row links into its
  commit page — metadata, message, file list and diff, with per-file diffs one
  click away. URLs work while the repository is open.
- The diff pane shows everything at once when no file is selected: in the work
  tree that is every uncommitted change — staged and unstaged together, with
  untracked files inlined (up to 50, then a notice) since `git diff` omits them
  — and in a commit it is the full commit diff, as before. The work tree used
  to show nothing there but a prompt to pick a file.
- Browse any branch's history: the branch in the title bar is now a menu of
  every local and remote-tracking branch, newest first, and picking one points
  the commit log at it. Nothing is checked out — the work tree, its diffs and
  the shells stay on the branch git is actually on — so the title bar reads
  `⎇ main › other-branch` and the commit pane carries the branch it is
  listing. **Back to <branch>** returns to the checked-out one, and each tab
  browses independently.
- Repository tabs: a bar along the bottom holds every open repository, each with
  its own four panes and terminal. **+** or **Ctrl+O** opens another repository
  into a new tab instead of replacing the current one, a dot marks tabs whose
  working tree has uncommitted changes, and **×** closes one (leaving an empty
  window to open the next when the last closes). Switching tabs never disturbs
  the other repository's view state or shells. Tabs are not persisted across
  restarts.
- A split terminal pane: **Split →** opens a shell beside the focused one,
  **Split ↓** below it, and a small round **×** at each terminal's top right
  closes it — the last one has none, since an empty pane would have no way
  back. Splits nest and their separators drag like every other pane; splitting
  the same way twice extends the row or column rather than nesting again.
  Clicking a terminal focuses it, and the focused one is outlined once there
  is more than one. A shell that exits closes its own split, except the last
  one, which keeps the pane and its notice.
- Recent repositories are remembered: the title bar's repository name opens a
  menu of the last twelve opened, most recent first; picking one opens it in a
  new tab, **Ctrl/Cmd+click** or a middle-click opens it in the current tab
  instead, and a **right-click** drops the entry from the list without closing
  the menu, so several can go in a row. Each entry's tooltip spells the
  gestures out, and **Open Repository…** and **Clear Recent** sit below. The
  list is kept by the main process in
  `~/.config/Gitty/recent-repos.json` and entries that no longer exist are
  skipped. Launching from a directory outside any work tree now falls back to
  the last repository opened rather than only reporting the error.
- An application icon, used as the window icon on Linux and Windows and as a
  small mark next to the **Gitty** name in the title bar: a dark rounded square
  split into the four panes, each tinted with its accent colour (green work
  tree, red diff, cyan commit log, blue terminal) and carrying a small glyph for
  what it shows — a file block, added and removed lines, a commit timeline and
  a shell prompt. The SVG source lives in `build/` next to the rendered PNG.
- A desktop launcher from `./setup.sh`: the icon is installed into the hicolor
  theme and a `gitty.desktop` entry lands in the application menu (and on the
  desktop when the session has one), launching with a new `gitty --any` flag
  that lets it start from outside a work tree and open the last repositories
  instead of failing. The icon theme cache is refreshed afterwards, so the
  entry appears with its icon rather than a blank one until the next login.
- Gitty installs from npm as `gitty-desktop`: the package ships the built
  bundle (`out/`), the icon and a `gitty` binary that launches the app in the
  bundled Electron, so `npm install -g gitty-desktop` needs no checkout. To
  make that possible, Electron and the `node-pty` ABI rebuild moved from
  development to runtime dependencies.

### Changed

- The diff pane reads as a list of files: the `diff --git a/x b/x` line is
  replaced by the path itself (`old → new` for a rename) as a full-width
  heading, files are separated by a blank line, and the hunk header — a line
  range, not the thing to look at first — is dimmed rather than highlighted.
- Blob hashes and the `---` / `+++` path lines are folded away, since the
  heading already names the file. Headers that carry meaning — `new file`,
  `deleted file`, `rename from` / `to`, `Binary files` — stay.
- **Show Whole Diff** no longer comes and goes: it stays in the diff header for
  the work tree, a commit and a range alike, lit while the whole diff is on
  screen, and it now also appears while viewing a file — returning to the whole
  diff took two clicks before.
- README screenshot updated for this release (`ref/gitty-0.1.2.png`).

### Fixed

- A deleted line beginning with `-- ` (rendered as `--- ` in a diff) was
  mistaken for a file header and vanished from the pane. Header prefixes now
  only count between `diff --git` and the first hunk.

## [0.1.1] - 2026-08-05

### Added

- Whole-file view beyond markdown: **View File** — a double-click in the file
  tree, the context menu, or the header toggle — shows any file's full contents
  with line numbers and syntax highlighting instead of its diff, from disk in
  the work tree and at the selected revision elsewhere. It is a one-off action
  rather than a remembered mode: selecting another file or another commit goes
  straight back to the diff. Snapshots are the exception and always view files,
  having no diff to show.
- A settings dialog (**Settings** in the title bar, File ▸ Settings, or
  <kbd>Cmd/Ctrl+,</kbd>) collects every preference in one place: a **theme**
  toggle (dark, the default, and light), the font size and row height as
  sliders, and the existing diff layout, word wrap, word highlight and markdown
  outline switches, each with a **Restore Defaults** button. The terminal
  palette follows the theme, reading the same CSS variables as the rest of the
  UI.
- Markdown preview for `.md` files, off by default: the **Preview** button
  renders the whole file — from disk in the work tree, from the selected commit
  elsewhere — with an **Outline** of its headings that indents by level, follows
  the reading position and jumps on click. Raw HTML is left inert and links open
  in the system browser.
- Colour in the markdown preview: fenced code blocks are syntax-highlighted
  through highlight.js when they name a language (22 common ones are
  registered), YAML front matter is lifted out of the document and shown as its
  own highlighted block, and heading levels, list markers, blockquotes, table
  headers, links and inline code are colour-coded. Token colours are mapped onto
  the app's own palette rather than imported from a highlight.js theme, so code
  matches the diff and the terminal.
- Word wrap now applies to the markdown preview as well, on by default and
  sharing the diff's toggle: fenced code blocks, wide tables and long inline
  strings wrap instead of scrolling sideways.
- Full-screen mode for the diff / preview pane, from its button, a double-click
  on its header, or <kbd>Esc</kbd> to leave. The pane is drawn over the layout,
  so the terminal underneath keeps its shell and scrollback.
- Word wrap in the diff pane, on by default, toggled from the header or the
  context menu and remembered between runs.
- Side-by-side diff view alongside the inline one: deletions are zipped with the
  additions that follow them, and each pair is a grid row so wrapped halves stay
  aligned. Also remembered between runs.
- Context menu in the diff pane: Copy Selection, Copy Whole Diff, and the wrap
  and view toggles.
- Minimal application menu (hidden bar) so Chromium's edit accelerators —
  <kbd>Ctrl+C</kbd> on selected diff text, <kbd>Ctrl+A</kbd> — are bound at all,
  plus File ▸ Open Repository and a View menu with reload and zoom.
- Browse Snapshot from a commit's context menu: the whole repository as it was
  at that commit, read-only — files come from the tree (`ls-tree`), contents
  from `git show`, and double-click opens a temp export with the system
  application. Nothing in the work tree or at HEAD is touched.

### Changed

- `gitty` now detaches from the terminal instead of holding it: it prints the
  pid and returns, the window survives the shell closing, and output goes to
  `${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log` (trimmed to its last
  megabyte past 4 MB). `--fg` keeps the old attached behaviour, and `--dev` is
  unaffected.
- The diff pane renders in chunks of 1500 rows that grow as you scroll, instead
  of a fixed-height virtual window. Variable row heights are what wrapping and
  the side-by-side grid need.
- Selected commit rows are more prominent: the cursor row gets a brighter
  background with a blue accent bar and a bold white hash, and the compared
  (second) row a wider magenta accent bar.
- Word-level highlighting in the diff, on by default: changed words within a
  line are diffed against their paired counterpart and get a brighter block
  than the row around them, in both inline and side-by-side views. Toggle it
  from the diff's context menu, and very long or single-token lines fall back
  to the row-level highlight.
- Double-clicking a file views it in the pane beside the tree instead of handing
  it to the system application, which moved to the context menu as "Open in
  System App".
- README screenshot updated for this release (`ref/gitty-0.1.1.png`).

### Fixed

- A replaced terminal session (window reload, repository switch) no longer
  writes its exit notice into the terminal that succeeded it.
- Hovering a diff-pane button showed the header's own tooltip ("Double-click to
  toggle full screen") whenever the button had none of its own. Tooltips now sit
  on the individual parts, and every button carries its own.
- "Show Whole Diff" no longer appears while browsing a snapshot, where there is
  no whole diff to widen back to — clicking it just emptied the pane.

## [0.1.0] - 2026-08-05

Initial release.

### Added

- Four-pane layout — working tree, diff, commit log and terminal — with
  draggable separators between every pane.
- Working tree pane: collapsible file tree with staged and unstaged status
  columns, untracked files included.
- Working Tree row pinned above the commit log: it shows how many files are
  uncommitted and selecting it brings the top panes back to the work tree. It
  takes part in keyboard navigation and is selected on startup.
- File interactions: click to diff, double-click to open with the system
  default application, right-click to open, reveal in the file manager, or copy
  the relative path, absolute path or file name.
- Commit log: paged loading (300 commits at a time, extended on scroll),
  keyboard navigation, <kbd>Enter</kbd> to show a commit's diff, and
  <kbd>Ctrl+Click</kbd> / <kbd>Space</kbd> to diff two selected commits.
- Selecting a commit swaps the top-left pane to that commit's file list;
  selecting a file there narrows the diff to that file.
- Diff pane: unified diff with old/new line numbers, hunk and add/delete
  colouring, virtualised rendering for large diffs and a 2 MB truncation notice.
- Terminal pane: a real interactive login shell rooted at the repository,
  backed by `node-pty` and rendered with xterm.js.
- Automatic refresh when the repository changes on disk, plus <kbd>F5</kbd> /
  <kbd>Ctrl+R</kbd> to refresh manually.
- Repository selection via `./run.sh [repo]`, `$GITTY_REPO`, a command-line
  argument, or <kbd>Ctrl+O</kbd> in the app.
- `run.sh` launcher that installs dependencies and rebuilds stale bundles, and
  `setup.sh` to install it as a global `gitty` command in `~/.local/bin` (or
  `/usr/local/bin` with `--system`).
- Linux runs with the SUID sandbox disabled (`ELECTRON_DISABLE_SANDBOX=1`);
  `chrome-sandbox` cannot keep its root-owned setuid bit inside `node_modules`.
- README shows a screenshot of the interface (`ref/gitty-0.1.0.png`).

[Unreleased]: https://github.com/baojie/gitty/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/baojie/gitty/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/baojie/gitty/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/baojie/gitty/releases/tag/v0.1.0
