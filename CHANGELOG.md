# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `setup.sh` — installs `gitty` as a global command into `~/.local/bin` (or
  `/usr/local/bin` with `--system`), so any repository can be opened with
  `gitty .`.
- Working Tree row pinned above the commit log: it shows how many files are
  uncommitted and selecting it brings the top panes back to the work tree. It
  takes part in keyboard navigation and is selected on startup.

### Changed

- `run.sh` resolves symlinks, so the installed `gitty` command works from any
  directory.
- Linux launches with the SUID sandbox disabled
  (`ELECTRON_DISABLE_SANDBOX=1`) to avoid the chrome-sandbox permission abort
  that setuid binaries inside `node_modules` trigger.

### Fixed

- The repository argument is now the first command-line entry that names a
  directory, so `electron out/main/index.js <repo>` no longer mistakes the entry
  script for the repository.
- Commit rows keep their columns aligned: hash, time and author no longer
  stretch to fit their content, and pane titles survive long hint text.

## [0.1.0] - 2026-08-05

Initial release.

### Added

- Four-pane layout — working tree, diff, commit log and terminal — with
  draggable separators between every pane.
- Working tree pane: collapsible file tree with staged and unstaged status
  columns, untracked files included.
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
- `run.sh` launcher that installs dependencies and rebuilds stale bundles.

[Unreleased]: https://github.com/baojie/gitty/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/baojie/gitty/releases/tag/v0.1.0
