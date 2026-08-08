# Finding things: commit filtering, message bodies, blame and file history

Gitty reads history well but finds it poorly. The commit log is one long
scroll with no way to search it; a selected commit shows only its files and
diff, while the message body is already fetched by `commitDetail` and then
thrown away; and the two deepest questions a history browser should answer —
*who wrote this line?*, *what happened to this file?* — have no place in the
UI. The fourth gap is engineering rather than feature: `npm run typecheck` is
the whole automated safety net, and every porcelain parser lives untested
inside `git.ts`.

This plan is four pieces of work, ordered so each lands on top of a safety
net:

1. A test harness around the porcelain parsers (infrastructure first).
2. Commit message bodies when a commit is selected.
3. Commit filtering in the log pane.
4. Per-file blame and file history.

## 1. Test harness + pure parsers

The parsers in `src/main/git.ts` — `parseStatus`, the inline log splitter,
`parseNameStatus`, `parseBranches` — are the highest-risk, most-parseable code
in the project, and none of it is testable because it is buried next to the
`execFile` calls. The move: lift each parser into `src/main/parse.ts` as a
pure function over raw strings, and make `git.ts` a thin shell that joins on
the repository root and builds `absPath`. Behavior is unchanged; the code
moves.

New file `src/main/parse.ts` exports:

- `parseStatus(raw): ParsedStatus` — branch/upstream/ahead/behind plus file
  records `{ path, index, worktree, untracked, origPath? }`. The root-relative
  `absPath` is added by `git.status`, which is the only caller that knows it.
- `parseLog(raw): Commit[]` — the `%H…%P` record splitter.
- `parseNameStatus(raw): Array<{ path, status, origPath? }>` — the
  `--name-status -z` reader with its rename double-field advance.
- `parseBranches(raw): Branch[]` — the `for-each-ref` splitter and `/HEAD`
  filter.
- `parseBlame(raw): BlameLine[]` — new, for feature 4. One record per source
  line, from `--line-porcelain`.

Test harness: `vitest` as a dev dependency, a `test` script, a
`vitest.config.ts` scoped to `src/**/*.test.ts`, and `src/main/parse.test.ts`
exercising each parser with hand-built raw strings (paths with spaces, renames,
untracked, `origin/HEAD`, uncommitted blame rows). The tests are real strings,
not mocked git — the point is that the parser is right, and `git.ts` can be
trusted to hand it the right raw text.

This lands before any feature so the later changes are measured against a
green test run.

## 2. Commit message bodies

A commit's full message is fetched today and dropped: `commitDetail` returns
`body`, and only `.files` is used. Show the message where the commit is being
read — above the file list in the top-left pane, in `commit` and `snapshot`
mode.

- `src/main/git.ts`: add `commitMeta(root, hash)` returning
  `{ author, email, date, subject, body }` via `git show -s
  --format=%an%x1f%ae%x1f%aI%x1f%s%x1f%b`. `commit` mode already gets this
  from `commitDetail`, so only `snapshot` mode needs the new IPC — but keeping
  one shape used by both modes means one `CommitInfo` component.
- `src/shared/types.ts`: a `CommitMeta` interface; `src/preload` and
  `src/main/index.ts` expose `git:commitMeta`.
- `RepoTab`: hold `commitMeta` state, populated in the existing view-files
  effect (set from `commitDetail` in commit mode, from the new call in
  snapshot mode, cleared in worktree/range mode).
- New `components/CommitInfo.tsx`: subject, `author · date`, body in a
  pre-wrapped block. Rendered above `FilesPane` when present. Body is shown in
  full; the pane body scrolls as one, so a long body pushes the file list down
  rather than fighting it for space.

## 3. Commit filtering

A filter box at the top of the log pane that narrows the history through git
rather than by trimming what is already loaded — 300 loaded rows are the wrong
universe to search.

- `git.log(root, limit, skip, ref, filter)`: when `filter` is non-empty, add
  `--fixed-strings -i --grep=<filter>` so any typed text is a safe, literal,
  case-insensitive match over subject and body.
- `RepoTab`: `logFilter` state; a 200 ms debounce lifts it to `debouncedFilter`,
  resets the loaded list and the paging cursor, and the existing `refresh`
  (which now depends on `debouncedFilter`) reloads the first page. `loadMore`
  passes the filter too.
- `LogPane`: renders the filter input above the work-tree row. While a filter
  is active the work-tree row is hidden (it is not a commit and would not
  match), the keyboard list is just the filtered commits, and an empty result
  shows a "no matching commits" notice instead of the bare empty state.
- Messages: `log.filterPlaceholder`, `log.noMatches`, `log.clearFilter` added
  to the interface and `en`, mirrored (in English, like the untranslated
  tables) into the other eight.

## 4. Blame and file history

Both are per-file questions, so both live in the file context menu and open as
documents in the diff pane — the same `FileDoc` strip that already holds whole
files, so they inherit the lazy chunk (highlight.js stays out of the first
paint) and the "a diff can stay on screen beside it" property.

- `git.ts`: `blame(root, rev, path)` runs `git blame --line-porcelain` (no rev
  = the working-tree contents, a rev = that revision) and
  `fileHistory(root, rev, path)` runs `git log --follow` with the log format,
  reusing `parseLog` for a `Commit[]`.
- `parseBlame` in `parse.ts`: `--line-porcelain` repeats the full header for
  every source line, so one record is a 40-char sha line, the `author`,
  `author-time` and `summary` keys, and the tab-indented source line. A row
  whose sha is all zeros is uncommitted work-tree content and renders as
  `—` in the left column.
- New `components/BlamePane.tsx` and `components/FileHistoryPane.tsx`, both
  opened through an extended `FileDocState.kind`. `FileHistoryPane` renders the
  commit list and hands a picked commit back via a new `FileDoc` prop
  `onOpenCommit`, wired to `showCommit` in `RepoTab`.
- `contextMenus.ts`: "Blame File" and "File History" in the file-tree context
  menu, for every mode (a commit-mode file blames that revision; snapshot files
  blame the snapshot's tree).
- Messages: `contextMenu.blameFile`, `contextMenu.fileHistory`, plus empty
  states.

## Order and verification

Implement 1 → 2 → 3 → 4, running `npm test` and `npm run typecheck` after
each. Visual verification per the CLAUDE.md recipe: build, patch
`capturePage` into `out/main/index.js`, drive the UI by script — type in the
filter box, right-click a file and pick Blame, click a history row — and read
the PNGs.

## Out of scope

- Graph/topology rendering of the log (the DAG is a separate, large feature).
- Staging and committing — Gitty stays a read-only browser; the terminal pane
  is where write work happens.
- Blame column annotations inside `DiffPane` (whole-file blame is the ask
  here; line-by-line blame inside a diff is a different pane).
- `git log` path/author/date-prefix syntax in the filter box — one literal
  text filter now; `--grep` is enough to prove the shape.
