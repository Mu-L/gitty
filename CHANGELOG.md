# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Whole-file view beyond markdown: **View File** — a double-click in the file
  tree, the context menu, or the header toggle — shows any file's full contents
  with line numbers and syntax highlighting instead of its diff, from disk in
  the work tree and at the selected revision elsewhere. It is a one-off action
  rather than a remembered mode: selecting another file or another commit goes
  straight back to the diff. Snapshots are the exception and always view files,
  having no diff to show.
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

[Unreleased]: https://github.com/baojie/gitty/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/baojie/gitty/releases/tag/v0.1.0
