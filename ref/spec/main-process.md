# Main process, git and the risky parts

## Staging, and the patch surgery

Gitty stages; it does not commit. The message is written by an agent, so a
subject/body box would solve a problem nobody has — what is missing is a place
to decide *which changes are one commit*, which is what the four panes are for.
**Send** types a command into the terminal pane and stops there: no model is
called from inside the app, which is what keeps "nothing leaves the machine"
true. The command is picked from the dropdown beside the button — remembered
commands, plus a prompt for one not remembered yet — and there is deliberately
no settings row for it: it is answered once per hand-over, not once per install.
`App.tsx` owns the list (`gitty.agentCommands`, most recently used first) and a
command joins it by having been run, never by having been typed. **The head of
that list is the current command** — there is no second stored answer to drift
out of it, which is what an earlier `gitty.agentCommand` was — so the picker
shows `agentCommands[0]`, and an empty list greys both controls out. Forgetting
one goes through the main process (`settings:confirmForget`), so the
confirmation is a native modal the window cannot be clicked past — the same
reason discarding a file asks there rather than in the renderer.

`src/main/patch.ts` is the whole of the risky part, and it is pure string work
over `git diff` output so `test/patch.test.ts` can hold it — a wrong patch does
not throw, it writes a wrong index silently. Four rules, and the first is the
one that is easy to get backwards:

- **The direction decides which unselected lines are dropped and which become
  context.** Staging applies to the index against the *a* side, so an
  unselected `-` line is still there (context) and an unselected `+` line never
  was (dropped). Unstaging applies the cached diff in reverse against the *b*
  side, so it is the other way round.
- Only the pre-image side's `@@` position is exact; the other one moves by the
  net line delta of the hunks emitted before it in the same patch.
- A `\ No newline at end of file` marker travels with the line it describes and
  is dropped when that line is.
- Hunk counts are recomputed from the lines that survived, never carried over.

`git.applyHunks` fetches the patch itself, with the **same context count the
pane drew**, or the hunk the user clicked is not the hunk that gets staged.
`--unidiff-zero` is added only at context 0. Hunk staging is withdrawn entirely
while **Ignore whitespace** is on: that diff does not hold every change it would
apply. The UI offers it only for a single tracked file's diff, where the
displayed patch *is* `git diff -- <path>`; a whole-work-tree diff is against
HEAD and merges both sides.

## Searching, and the graph

Three reads that share the log's machinery. The filter box has a
`LogFilterMode`: message/author as before, or git's pickaxe (`-S` literal,
`-G` regex) over the diffs. Those walk the whole history, so `searchLog` keeps
one child process per root **per kind** — a grep must not cancel the log — and
kills the previous one instead of letting it finish for a reader who has moved
on. Every pattern is an array element, never text in a command line.

`git grep` and `git log -L` open as documents beside the diff (`FileDocState`
kinds `grep` and `lines`), so they inherit the find strip and the doc tabs. A
grep follows the revision on screen, which is the point of it: in a snapshot it
answers about the snapshot.

What the search box takes is a **query**, not a pattern: `foo in:*.py`, the
shape a mail client taught everyone. `src/shared/query.ts` parses it into terms
(`--and`-ed, `-foo` negated) and pathspecs (`-in:` becoming `:(exclude)`), and
is pure string work with no imports for the reason `patch.ts` is — a query read
wrongly searches the wrong thing silently, so `test/query.test.ts` holds it. It
is *shared* rather than main's because both sides read the box: main builds the
command line, the renderer asks whether there is a term in it at all and refuses
to run `in:*.py` alone. Two rules the parse is built around. **Quoting turns
every operator off**, which is the only way to search for `in:` or a leading
dash literally. And a bare `in` is the operator **only when a path follows**
(`looksLikePath`) — code is full of `for x in list`, and eating that word would
be a worse bug than not supporting the colon-less form at all.

`src/renderer/src/lanes.ts` computes the commit graph — deliberately not by
parsing `git log --graph`, whose ASCII is typeset for a terminal. A lane holds
the hash it expects next; a commit takes the first lane expecting it or opens
one; its first parent stays, the others take lanes of their own. The layout is
recomputed over the whole loaded list rather than continued from a saved state
at the page boundary: it is a left-to-right fold, so the first 300 rows come
out identical when the next 300 arrive, which is the property paging needs and
is cheaper than keeping boundary state right. `test/lanes.test.ts` pins that.

## Git access

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

## The local web server

`src/main/web.ts` serves commits as plain HTML, and binding `127.0.0.1` is not
on its own a boundary: it keeps other machines out, not other pages in this
machine's browser, any of which can fetch the port — and behind it is every
open repository's contents. So every URL carries a token minted at startup,
as a path prefix (`/t/<token>/…`) rather than a query string. A wrong token is
a **404, not a 403** — a 403 confirms the resource exists. The `Host` header
must be loopback, which makes DNS rebinding pointless. And `Referrer-Policy:
no-referrer` is required: the pages link outward, and one click would otherwise
put the token in a stranger's `Referer`.

## Gource

`src/main/gource.ts` is an *optional* companion, and the shape follows from
that: `available()` walks `PATH` once (cached — PATH does not change under a
running app) and the commits pane simply does not render the button when it
comes back false, rather than showing one that fails on click.

`play()` spawns it detached and resolves after a 2.5 s grace period: long
enough to catch the immediate failures (no display, no OpenGL, an unreadable
path) and report gource's own stderr through the same strip push and pull use,
short enough that the button does not feel stuck. If it is still alive when the
timer fires, its pipes are destroyed and it is `unref`'d — gource draws its own
window and is meant to outlive Gitty.

## Recent repositories

`src/main/recent.ts` keeps the list in `app.getPath('userData')` — which is why
`app.setName('Gitty')` runs before anything else, or an unpackaged run would
scatter state into `~/.config/Electron`. Reads filter out paths that no longer
exist, so a deleted repository disappears from the menu on its own. Remembering
is best-effort and never blocks opening a repository.

## Terminal

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
Sessions therefore end only in `destroySession`: **Close**, a shell that exited,
or the tab's `TerminalsPane` unmounting (closing the repository tab).

## Refresh

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
Changes pane (and the title bar's count) listing changes already committed.
