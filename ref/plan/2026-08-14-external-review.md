# Answering an external review: packaging, staging, a token, search, a graph

An outside reader went through Gitty at 0.1.6 and came back with six pieces of
work. They are not a requirements document — each one is an argument, and a few
of the arguments are better than the feature they propose. This plan says what
gets built, in what order, and where the review is followed to the letter
because its reasoning holds.

The order below is the review's own: two P0s, two P1s, two P2s. Each lands as
its own commit with a `CHANGELOG.md` entry under `[Unreleased]`, and each is
verified before the next one starts — `npm run typecheck` and `npm test` always,
the visual recipe in CLAUDE.md where the change is on screen, a scratch
repository with real history where the change is about git.

## 1. Linux packaging (P0-1)

Two of the compromises the README already admits to have the same cause, and
the cause is that nothing is packaged. `StartupWMClass=electron` exists because
an unpackaged Electron app reports `electron` as its window class;
`ELECTRON_DISABLE_SANDBOX=1` exists because `chrome-sandbox` cannot hold a
root-owned setuid bit inside `node_modules`. A `.deb` has neither problem: it
ships its own executable, and its `postinst` can chown the sandbox binary.

- `electron-builder` as a dev dependency, configured in
  `electron-builder.yml` beside `package.json`. Targets `deb` and `AppImage`,
  `x64` and `arm64`.
- `node-pty` stays in `dependencies` and is listed in `asarUnpack`; a `.node`
  inside an asar cannot be loaded. The ABI rebuild is electron-builder's
  `npmRebuild`, not a hand-placed prebuilt binary.
- The `.deb` is the recommended download and does **not** disable the sandbox.
- AppImage is kept but demoted, and labelled honestly: its `chrome-sandbox`
  gets no setuid bit, so it depends on unprivileged user namespaces, which
  Ubuntu 24.04's AppArmor profile restricts by default. It still needs
  `--no-sandbox`. The README must not claim the sandbox is back for AppImage.
- The desktop entry comes from electron-builder; the hand-written
  `StartupWMClass=electron` goes away **for the packaged product only**.
  `run.sh` and `setup.sh` are the developer path and keep both workarounds —
  they are still running an unpackaged Electron.
- `.github/workflows/ci.yml` runs `npm run typecheck` and `npm test` on push
  and pull request. `.github/workflows/release.yml` builds the Linux artifacts
  on a `v*` tag and attaches them to the release.
- README's **Running** section is reordered: download the `.deb`, then
  `npm install -g gitty-desktop`, then a source checkout. Node 20 is a
  requirement of the last two only.

What cannot be verified here: a clean Ubuntu 24.04 machine without Node. The
build is run locally and the artifacts inspected (`dpkg-deb -c`, the desktop
entry, the unpacked `node-pty`), and the acceptance test that needs a fresh
machine is written down rather than claimed.

## 2. Staging, and handing the index to an agent (P0-2)

The review corrects its own premise here, and the correction is the whole
feature. Gitty has no commit box because commit messages are written by a
model, not typed — so a subject/body dialog would solve a problem nobody has.
What the model cannot do is decide *which changes are one commit*. That
decision is reading and selecting, which is exactly what a four-pane window
with the work tree and the diff on screen together is for, and it is the one
thing `git add -p` is worst at.

So: staging, yes; a commit box, no.

**File level.** The status column in the work-tree file list becomes a click
target that stages or unstages the file, and the context menu grows **Stage** /
**Unstage**. `git add -- <path>` and `git restore --staged -- <path>`. The
green file name and the two status columns already say what the index holds;
they do not change.

**Hunk and line level.** This is where a mistake writes a wrong index
silently, so the implementation follows a fixed order:

- The patch that gets staged comes from `git diff -- <path>` — work tree
  against index. The diff the pane normally shows is against `HEAD`, which is
  staged and unstaged work merged, and applying that text would stage changes
  that are already staged. Staging fetches its own patch.
- Unstaging takes `git diff --cached -- <path>` and applies it with `-R`.
- Application is `git apply --cached --whitespace=nowarn -`, patch on stdin,
  no temp file.
- `--unidiff-zero` is added **only** when the context setting is 0. Adding it
  unconditionally makes `git apply` place ambiguous hunks wrongly.
- Line-level selection rebuilds the hunk: unselected `+` lines are dropped,
  unselected `-` lines become context lines (their prefix becomes a space) and
  must not be dropped, selected lines are kept as they are, and the header is
  recomputed — the old count is the number of ` ` and `-` lines, the new count
  the number of ` ` and `+` lines. A `\ No newline at end of file` marker
  travels with the line it belongs to.
- Binary files, mode changes and renames get file-level staging only; no hunk
  buttons are rendered for them.
- A failed `git apply` shows git's own stderr in the same strip push and pull
  use. It is not rewritten into "staging failed".

The patch surgery is pure string work, so it lives in `src/main/patch.ts` as
functions over raw text and gets a `test/patch.test.ts` of its own — the same
shape as `parse.ts`. That is the only part of this feature a test can hold.

**Handing it over.** Once the index is curated something has to pass it on.
Not a model call inside Gitty: the README's claim is that nothing leaves the
machine, down to not fetching remote images in a README, and an API key plus a
network request would end that. The terminal pane is already in the window and
already has a tty.

- A **Commit with agent** button in the work-tree pane header, enabled only
  when the index is non-empty.
- It writes a configurable command into the focused terminal and presses
  Enter. The template is a Session setting, defaulting to a placeholder such
  as `claude "commit the staged changes"`. No vendor's command is assumed to
  work; an unset template points at the setting rather than failing silently.
- Because it is only text into a pty, the agent's prompts, confirmations and
  streaming output appear in the terminal as usual, and gpg signing and hooks
  that want a tty work — there is one right there.
- **Copy Staged Diff** in the work-tree header's context menu, for talking to
  a model in another window.

**Discard.** Right-click a work-tree file → **Discard Changes…**, a native
confirmation, then `git restore -- <path>`. Untracked files keep going through
the existing trash path. The wording says plainly that it cannot be undone.

**A stated boundary.** A new README section names what Gitty will not do:
rebase, merge, cherry-pick, conflict resolution, creating or switching
branches. Those are stateful multi-step operations with a terminal sitting in
the same window; half of one is worse than none.

## 3. A token for the local web server (P1-1)

The README says the server binds `127.0.0.1` and is therefore "your own
browser and nobody else's". The second half does not follow. Loopback keeps
other machines out; it does not keep out any page in the browser, and every
page can `fetch('http://127.0.0.1:<port>/')`. What is behind that port is the
full contents and diffs of every open repository, and the port range is small
enough to scan.

- A per-process token, `crypto.randomBytes(16).toString('hex')`, never
  written to disk.
- It is a path prefix, `/t/<token>/…`, not a query parameter. **Copy Commit
  URL** and **Open in Browser** carry it, so nothing changes for the user.
- A wrong or missing token is **404**, not 403 — a 403 confirms the resource.
- The `Host` header must be `127.0.0.1:<port>` or `localhost:<port>`, or 404.
  This is what stops DNS rebinding, where an attacker's domain resolves to
  127.0.0.1 and the browser sends his `Host`.
- `Referrer-Policy: no-referrer` is required, not optional: served pages link
  outward (URLs in commit messages, links in a rendered README), and without
  it one click sends the token to a stranger in the `Referer`.
  `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` go with it.
- A new token each launch, so old URLs die with the session — the README's
  "while the repository is open" becomes "while this session is running", and
  the "nobody else's" sentence is replaced with what is actually true.

## 4. Repository-wide search (P1-2)

Ctrl+F searches the pane in front of you. Blame says who touched a line last
and file history says what happened to a file, but the question between them —
*which commit introduced this line* — has no answer in the UI. All three
additions are reads, and all three reuse machinery that exists.

**Pickaxe.** The log filter box gets a mode dropdown: Message / Author (what it
does today), Content (`-S`), Content regex (`-G`). The tooltip distinguishes
them: `-S` finds where a string's number of occurrences changed, `-G` finds
commits whose diff text matches. Arguments go to `execFile` as array elements,
never concatenated — a regex is made of shell metacharacters. Results flow
through the existing paging path. These queries are slow on a large repository,
so the box shows a loading state and switching modes or text kills the child
process still running.

**Line-range history.** A blame row's context menu offers **History of these
lines**, running `git log -L <start>,<end>:<file>` and opening the result as a
document tab with each commit's header and the range's diff at that commit.
A selection sets the range; without one it is the clicked line. `-L` cannot be
combined with `--follow`, but it follows renames by itself.

**grep.** A search box reachable from the file tree's root context menu opens
`git grep -n --color=never -e <pattern>` over the work tree, or
`git grep -n <pattern> <rev>` when a commit or snapshot is on screen — the
search follows the revision being browsed. Results are a document tab grouped
by file; clicking a line opens that file there. Above a match ceiling (2000)
the list is truncated with a notice, the way a 2 MB diff already is.

## 5. Commit topology (P2-1)

Going back remembers fifty places and reconstructs `file @ revision` exactly,
which is a lot of care spent on wandering — and the wanderer has no map. The
commit pane is a single linear column: where a merge came from and where a
branch diverged are not in it. The branch menu reads one branch at a time and
cannot show two at once.

- **Do not parse `git log --graph`.** Its ASCII is typeset for a terminal;
  parsing it is fragile and it cannot be made interactive.
- `git log --date-order --format=…` with parents, and lanes computed here:
  keep an array of open lanes, each holding the hash it expects next; a commit
  takes the first lane expecting it, or opens one; its first parent replaces it
  in that lane and the other parents take lanes of their own, reusing gaps.
  Each row records its lane and the edges down to its parents' lanes.
- An SVG column left of the hash, `lanes × 8px` wide, capped near ten lanes
  with the overflow folded into one marker so the width cannot run away.
- **It has to survive 300-commit paging**: the open-lane array is saved at the
  page boundary and the next page continues from it, or lane numbers jump.
- An **All branches** switch (`git log --all`) shows how branches relate — a
  complement to the one-at-a-time branch menu, not a replacement.
- Colours come from the accent palette, kept distinct from blame's author hues.

## 6. Splitting the documentation (P2-2)

The README is 660 lines. It is a good 660 lines — a sentence like "the hunk
header is dimmed — a line range, not the thing to look at first" is somebody
thinking, and it is part of why the project reads as serious. But a manual and
a business card should not be the same file.

- README keeps: title, language links, the four-pane diagram, "Things the
  other git browsers mostly do not do", the screenshot, Why another one,
  Requirements, Running, the new boundary section, an Architecture overview,
  Licence. Target: 200 lines or fewer.
- `docs/manual.md` takes The window, The panes, Finding text, the full
  Settings table, Keyboard shortcuts, Linux desktop integration and the macOS
  app bundle, and the README links to it. (`docs/` is what GitHub Pages would
  claim, so if that ever matters the file moves to `ref/`; it does not today.)
- The translations stay snapshots with their dates. After the split they only
  have to track the README, not the manual — worth a sentence in the
  translation note, since it lowers the cost of keeping nine of them.
- The review also asks for a ten-second GIF. That needs a screen recording of
  a real session, which is not something this change can produce; it is left
  out and said so, rather than quietly dropped.

## Order and verification

1 → 2 → 3 → 4 → 5 → 6, a commit each, `npm run typecheck` and `npm test` after
every one. The two that can silently be wrong get bespoke checks: staging is
verified against `git add -p` by hand on a scratch repository (three hunks with
the middle one staged; a mixed hunk with two lines selected; context 0 and
context 3 giving the same result; a CRLF file; a file with no trailing
newline), and the lane algorithm is checked across a page boundary and on a
repository with real merges.
