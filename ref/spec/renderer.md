# Renderer: panes, views and state

`file-viewers.md` and `lazy-loading.md` cover the two subsystems left out here.

## Messages and i18n

Every user-visible string comes from a message table. `src/shared/messages.ts`
declares the shape — `MainMessages` and `RendererMessages` — and each side ships
its own table against it: `src/main/messages.ts` (menus, dialogs, and the strings
git output is wrapped in) and `src/renderer/src/messages/` (everything on
screen), whose `index.ts` re-exports the active table as `msg`. The split is
there because main's table covers what exists before any window does, and the
renderer's is part of the renderer bundle.

**There is no runtime interpolation and no lookup by key.** A leaf is either a
string or an arrow function taking typed parameters and returning one, so
`msg.app.changesCount(3)` is an ordinary call the compiler checks: a missing key,
a typo, or a wrong argument type is a typecheck error rather than a `??? key`
at runtime. That is the whole reason the tables are typed objects and not JSON,
and it also makes a plural or an unusual word order expressible — the function
body is code, not a template.

The tables are also where the wording of the whole UI can be read at once, which
is half of why a literal is never worth it.

Nine languages exist — `en`, `zh`, `ja`, `ko`, `fr`, `de`, `es`, `ru`, `pt` —
and the **Language** setting picks one at runtime. The renderer reads it through
`locale.ts`, whose `LocaleProvider` / `useMsg()` hand the active table to every
component; `messages/index.ts` maps a `Locale` onto its table and falls back to
`en`. The main process cannot use a hook, so `src/main/messages.ts` keeps its
tables behind a `Proxy` that `setMainLocale()` re-points, and the IPC handler
rebuilds the application menu so its labels change with the rest. That is also
what makes `msg` a value that changes over a component's life rather than a
module constant.

## Time

`src/renderer/src/time.ts` is the one place a date becomes text. It holds the
`TimeSettings` (zone plus absolute-or-relative), the formatters every pane
calls, and a `TimeProvider` / `useTime()` pair beside `locale.ts`'s — how a time
is written is a formatting choice like the locale, not part of the message
tables. Relative stamps do take wordings from the message table, so `stamp` is
handed `msg.time`; hover tips stay absolute whatever the rows show, because a
short stamp never says which zone it is in.

Three things it exists to keep right. `Intl.supportedValuesOf('timeZone')`
**omits `UTC`** (an alias, not a canonical zone), so the list prepends it. An
unknown zone name makes `toLocaleString` throw, and a `RangeError` raised while
rendering the commit log takes the whole window white — `zoneOf` therefore falls
back to the system zone for anything the runtime does not know (what a setting
that outlived its zone name looks like). And "today" is a calendar day *in the
displayed zone*, so `stamp` reads both the commit and now through it, or a
midnight-adjacent commit shows a time on the wrong day.

## Settings, and where a preference lives

`prefs.ts` owns every app-wide preference: the state, the `gitty.*`
`localStorage` write, what it puts on `<html>` (theme, font size, row height,
mono font — as a layout effect, so a child's passive effect reading the CSS
variables always sees the new value), and what **Restore Defaults** puts it
back to. `usePreferences()` returns them all as one `Preferences` object, which
is what `SettingsPane` takes — a dialog whose every row is one of them, so
adding a setting is a row and a field rather than a prop threaded through
`App.tsx` as well. `App.tsx` destructures what its own chrome and `RepoTab`
need and passes the object itself to the dialog.

One preference does not live there. `singleInstance` has to be known before a
window exists, so the main process keeps it (`src/main/prefs.ts`) and the hook
reads it back over IPC — the single asymmetric entry in an otherwise uniform
set. The open-repository list
(`gitty.roots`, for **Reopen last session**) is the one with a lifecycle of its
own: the app holds `[]` until the restore pass has opened anything, so it is
written only when non-empty and cleared only by closing the last tab.

Preferences that git needs (`DiffOptions`) or the pty needs (`TerminalOptions`)
travel *with each call* rather than being pushed into the main process: it
holds no view state, and a diff request that carries its own options cannot be
computed against a stale setting. They are memoised in the hook because
`RepoTab`'s diff effect depends on the object identity. Terminal options are
read only when a session is created — changing them affects the next split, not
a running shell — which is deliberate: restarting a shell under the user to
apply a setting would take whatever is running in it down.

## The shortcut sheet

`components/HelpPane.tsx` is the one place inside the app where every chord is
written down, opened with <kbd>F1</kbd> or from **Help ▸ Keyboard Shortcuts**.
It is a modal drawn in the renderer for the same reason the About dialog is —
a native message box cannot lay a table out — and it shares the settings
dialog's backdrop, header and footer, with one table for the whole sheet so
the actions line up under one key column rather than one per section.

Two things keep it from going stale. The chords it can name from a constant
(`BROWSE_ACCEL`, `CHANGES_ACCEL`, `PASTE_ACCEL`, `ALL_PANES_ACCEL`,
`PANE_CYCLE_ACCEL`) are taken from `panes.ts`, where the key is defined beside
its handler. And F1 itself is handled in the renderer, like every other chord;
the menu item deliberately carries **no accelerator**, which would swallow the
key before it reached the window — the same reason View ▸ Refresh carries none.
The keys themselves are never translated: only the section headings and the
actions go through the message table.

`App.tsx` owns the open state, as it does for settings and About, and passes
`dialogOpen` down to every `RepoTab` so Escape closes the dialog rather than
unwinding the tab's view underneath it. The About dialog links to the sheet
beside its GitHub link — the two things a reader opens that dialog looking for
— and `App.tsx` swaps one dialog for the other rather than stacking them.

## Multiple repositories, tabs

`App.tsx` is a thin tab manager: the list of open roots, which is active, the
app-wide preferences (theme, font size, wrap, …), and the settings dialog. Each
open root renders one `RepoTab` (`src/renderer/src/RepoTab.tsx`) owning that
repository's whole session — status, log, the `View`, selected file, context
menu, and its own `TerminalsPane`. The self-contained parts of that session are
hooks beside it rather than more of the same component: `useDocs` (the strip of
opened files) and `useStaging` (every write across the index — whole files,
picked hunks, discards — each of them the same ask, report a failure, refresh). Inactive tabs stay mounted (`display: none`),
so switching never disturbs another repo's view state or shells. The main
process keeps one watcher per root and tags `repo:changed` with the root, so
each tab refreshes only its own repository. The tab bar (basename, dirty dot,
close button, `+` to open) sits below the panes, with an empty state when every
tab is closed. Tabs can be dragged into a new order — the order is the `roots`
array, so it is remembered exactly as the open set is — and right-clicking one
offers **Rename tab…** (names keyed by root in `localStorage['gitty.tabNames']`,
shown in the tab bar and the title bar's repository button) and **Close
repository**. `react-resizable-panels` keeps layout state per Group id, so
`RepoTab` suffixes its ids with the root. Keeping several tabs mounted at once
is what the `min-width: 0` and `disabled={!active}` rules in CLAUDE.md are
paying for.

## Full screen

Full screen is one `PaneId | null` per `RepoTab` and a `position: fixed` class
on that pane rather than a different tree, deliberately: unmounting the layout
would dispose the terminal's pty and kill whatever is running in it.
`components/PaneChrome.tsx` holds the two header buttons both `RepoTab` and
`TerminalsPane` render, so the icons and wording cannot drift between the
terminal's own header and the other three. `Ctrl+Shift+1..4` is read off
`e.code`: with Shift down the key itself is punctuation. `Ctrl+Tab` moves full
screen on to the next visible pane (`nextPane` in `panes.ts`) and fires **only
while a pane fills the window** — with the layout drawn every pane is a click
away, and Tab is the focus key it has always been. xterm must be told to ignore
the chord, exactly as it is for `Ctrl+Shift+C`, or the shell eats the one key
out of a full-screen terminal.

## Hiding panes

`src/renderer/src/panes.ts` holds the `PaneVisibility` record; `App.tsx` owns it
(app-wide, like the other view preferences, persisted under `gitty.panes`) and
`RepoTab` simply does not render a hidden pane's `Panel` — nor the `Separator`
beside it, nor a whole row when both its panes are gone. Two consequences worth
keeping. Panel sizes are stored **per Group id**, so the ids carry the visible
set (`top-fd`, `bottom-lt`); reusing one id for two different child counts
restores sizes that no longer add up. And the last visible pane renders no hide
button — an empty window would leave only the title bar's **Panes** menu as the
way back.

Two actions set the whole record rather than toggling a pane, and each comes
with a view. Browsing the work tree (<kbd>Ctrl+B</kbd>, and the **Changes**
row's context menu) puts the window into `BROWSE_PANES` — files and diff only,
since a snapshot is a tree being read and neither the log nor a shell has
anything to say about it. <kbd>Ctrl+D</kbd> is its pair: back to the `worktree`
view and to `ALL_PANES`. The view belongs to the tab and the visibility to
`App`, so `RepoTab` asks through an `onLayout(panes)` prop rather than reaching
for `setPanes`.

The two chords live in `panes.ts` beside the cycle chord and differ in what they
do about the terminal, which is the whole question for a key of this kind.
<kbd>Ctrl+B</kbd> is taken from xterm — it is tmux's prefix, and a key that
hides the terminal must not also reach what is running in it. <kbd>Ctrl+D</kbd>
is not: end-of-input is how a shell is left, and a history browser does not get
to keep that key, so `RepoTab` ignores the chord when `fromTerminal(e.target)`
says the keystroke came from inside one. Escape still returns to the changes
without touching the layout — unwinding a view is not a request to rearrange
the window.

Hiding the terminal pane unmounts `TerminalsPane`, which must not end its
shells. Its split tree therefore lives beside the xterm registry in
`terminals.ts`, keyed by root, and sessions are destroyed only by
`destroyTerminals(root)`, which `RepoTab` calls when it unmounts — that is, when
the repository tab closes.

## The `View` union drives the UI

Each `RepoTab` holds a `View` of four modes — `worktree`, `commit`, `range`,
`snapshot` — and both top panes are derived from it:

| mode | top-left file list | top-right |
| --- | --- | --- |
| `worktree` | uncommitted changes | that file's diff |
| `commit` | files the commit touched | commit diff (whole, or one file) |
| `range` | files changed between two commits | range diff |
| `snapshot` | the entire tree at that commit | that file's contents, read-only |

`selectedFile` narrows the diff within a mode. The commit log's first row is a
pseudo-commit (`WORKTREE_ROW`) standing for the uncommitted changes, drawn as
the **Changes** row; it joins keyboard navigation and selecting it returns to
`worktree` mode.

`src/renderer/src/icons.ts` decides the type icon each file row carries, and is
a leaf module with no imports for the reason `paths.ts` is one. The mapping is
two-dimensional deliberately: **the shape is the family** and **the colour is
the language**, so thirty-odd extensions cost eighteen glyphs rather than
thirty icons. The glyphs are hand-written paths in `components/FileIcon.tsx` —
an icon package whose whole value is breadth would be a megabyte for a screenful
of answers — and every tone is a palette variable, never a brand hex: the tree
is drawn over both themes, and a colour picked against one background is
unreadable on the other. `--orange` exists for this and nothing else, yellow
being taken by the modified status code. The one exception is a **brand mark**
— a language's own logo, carrying its colours in the drawing. Python is the only
one, and the bar for a second is that a reader recognises the mark faster than
any tone of the shared glyph: a logo per language is what shape-plus-tone exists
to avoid.

## Browsing history

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

The buttons sit in `App.tsx`'s title bar while the history is per repository, so
`RepoTab` reports it up through
`onNav` (exactly like `onStatus`) and `App` drives it back through the
`RepoTabHandle` — reactive state for the enabled/disabled buttons, an imperative
call for the move.

## Browsing another branch

The title bar's branch is a menu (`git for-each-ref` over `refs/heads` and
`refs/remotes`) and picking one sets `browsingByRoot[root]` in `App.tsx`, which
each `RepoTab` takes as its `browsing` prop and passes to `git.log` as a ref.
That is the whole feature: **nothing is checked out**. Status, the Changes
pane, its diffs and the shells all still describe the branch git is on, which is
why the Changes row stays in the log and the title bar shows both names. A
change of branch drops the loaded commits rather than merging two histories,
and clears the selection with them.

`refs/remotes/origin/HEAD` is filtered out by full ref name: its short name is
plain `origin`, which would read as a branch of its own.

Snapshot entries carry a synthetic `gitty:snapshot:<hash>:<path>` absPath, which
has no on-disk existence — that is what the file context menu keys off to route
"Open File" through a temp copy of that revision and to drop "Reveal in File
Manager", which would have nothing to reveal.

## DiffPane

Takes raw unified-diff text and parses it itself. Its parse also numbers each
line with the hunk it belongs to and its position inside that hunk, counted
exactly as `main/patch.ts` counts — nothing may be skipped between the two, the
`\ No newline` marker included, or a pick made here names different lines
there. Line selection is read from the **document's own text selection**
(the two range endpoints, not a scan of the rows), so dragging over a diff
still copies and there is no second click semantics to learn. Rows render in
chunks of 1500 that grow as the end nears, rather than a fixed-height virtual
window: word wrap and the side-by-side grid both make row heights variable.
Inline rows carry `content-visibility: auto` so off-screen ones cost nothing.
Side-by-side zips each run of deletions with the additions that follow it, one
grid row per pair, so wrapped halves stay aligned. Wrap and view mode persist in
`localStorage` under `gitty.wrap` / `gitty.diffView`.

## Finding text

`find.ts` is the search itself — walking a subtree's text as one string,
painting matches, scrolling to one — and `components/useFind.tsx` is the whole
feature for one view: the strip, the state, and Ctrl+F while that view is the
one on screen. Every viewer wires the same three things (the scroller, a
`contentKey` that changes when the rendered nodes change, a `resetKey` for
"another document took this pane"), so `DiffPane`, `CodePane`, `MarkdownPane`,
`BlamePane`, `FileHistoryPane` and `HtmlPane` all find text identically.

Four things it has to respect. Matches are painted with the **CSS Custom
Highlight API**, not `<mark>`: a `Highlight` holds Ranges and touches no nodes,
so React rewriting a subtree cannot discard it — wrapping elements would be
gone by the next render. The registry is **one per document while the app has a
search per view**, and hidden tabs stay mounted, so `paintFind` records an
owner and `clearFind` only takes off paint the same view put there. Views that
render in chunks (`shown`) must render **the rest** as the strip opens, or a
search silently covers only what has been scrolled to. And the HTML preview is
an **iframe**: its nodes belong to another document, so the Ranges are made by
that document, the highlights go in that window's registry, and the scrolling
is left to `scrollIntoView`, which knows about boxes on both sides of the
frame boundary. The CSP is `img-src 'self' data:`, so a `https://` image
in a document is not fetched — deliberately, since rendering someone else's
README should not report to their host.
