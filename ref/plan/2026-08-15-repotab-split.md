# Design: splitting RepoTab

**Status:** in progress (2026-08-15) · **Scope:** `src/renderer/src/RepoTab.tsx`
Cuts 1 (`useDocs`) and 2 (`FilesView`) implemented · cut 3 (`DiffHeader`) pending

`RepoTab.tsx` is 1839 lines. That is long, but the length is not the problem —
a component that owns one repository's whole session is allowed to be large.
The problem is that the file holds two kinds of state with different lives, and
only one of them belongs there.

## The argument, in one paragraph

`RepoTab` is the coordinator of a repository session. Its state is only there
because it is shared between panes: `view` drives the file list and the diff,
`selectedFile` narrows both, `selectedCommit` is reflected in the log and the
diff header. That state must stay. But a second kind of state lives in the
file too — state that only ever one pane reads. `searchOpen`, `searchText`,
`treeFilterOpen`, `treeFilter`, `filesBodyRef` are used only inside the files
pane; `collapseState` only inside the diff pane; `hasGource` and
`gourceStarting` only in the log pane header. Those are not coordination, they
are a pane's private UI hiding in the wrong place. Moving *them* out does two
things at once: the file gets shorter, and the state that is left is the state
that actually has to be there.

So the plan is not "extract hooks until the file is small". It is three cuts,
each along a boundary that already exists:

1. **`useDocs`** — the document-strip logic (`docs`, `activeDoc` and the ten
   functions that touch them) is a self-contained unit. Lift it as-is.
2. **`FilesView`** — the files pane plus its private search/filter state.
3. **`DiffHeader`** — the diff pane's header, the densest JSX in the file.

The two things this design explicitly does **not** do are in a section at the
end, with reasons.

## Current shape (line numbers from `RepoTab.tsx` today)

| Section | Lines | Character |
| --- | --- | --- |
| State declarations | 205–281 | session + private, mixed |
| File-list loading effect | 353–476 | per-`view` loading |
| Documents | 478–628 | cohesive |
| Browsing history | 630–686 | coordination |
| Diff loading | 688–746 | coordination |
| Commit interactions + keys | 747–862 | coordination |
| Staging + agent | 864–1000 | deep deps on view/status |
| push/pull | 1002–1021 | log pane header |
| gource | 1023–1051 | log pane header |
| Context menus | 1053–1087 | coordination |
| Derived + headers | 1089–1166 | coordination |
| JSX | 1167–1833 | ~667, four panes |

Since this design was written, RepoTab has grown to 1846 lines with the
symbol-outline button: the `outlineable` derived value (line 626) and a
button at 1518–1526 that serves source files shown as themselves as well as
rendered documents. Both belong to the `DiffHeader` cut below.

## 1. `useDocs`

**Cut:** lines 478–628 move into a hook. This is the whole document-strip
story — the diff is the first document, opened files join it, `FileDoc` renders
the active one — and it depends on nothing but `revForView` and `paths.ts`,
both already in the `RepoTab` chunk. No lazy-loading edge: the hook imports
nothing heavy.

**Signature:**

```ts
function useDocs(revForView: () => string | null): {
  docs: FileDocState[]
  activeDoc: string | null
  setDocs: Dispatch<SetStateAction<FileDocState[]>>
  setActiveDoc: Dispatch<SetStateAction<string | null>>
  doc: FileDocState | null
  viewingFile: boolean
  previewing: boolean
  addDoc: (kind: FileDocState['kind'], path: string) => void
  showDoc: (doc: FileDocState) => void
  closeDoc: (id: string) => void
  openFileDoc: (path: string) => void
  openLineHistory: (path: string, start: number, end: number) => void
  openSearch: (pattern: string) => void
  openHit: (path: string, line: number) => void
  openLinkedPath: (path: string, rev: string | null, anchor?: string) => void
  openBlame: (path: string) => void
  openHistory: (path: string) => void
}
```

**Why the bare setters are part of the return:** the coordination code does
not go through the semantic operations. `goTo` replaces the whole document
list (`setDocs(p.doc ? [p.doc] : [])`), `showCommit` / `showSnapshot` /
`browseWorktree` / `backToWorkTree` / `onSelectCommit` empty it. Those call
sites stay in `RepoTab` and keep calling `setDocs` / `setActiveDoc`; the hook
owns the state, the coordinator keeps the reset-on-navigation right it has
today. Trying to hide the setters behind `closeAll()` would turn a plain state
write into an invented abstraction.

**One behavioural note:** the hook takes only `revForView`, not `view` — the
revision lookup already encapsulates it, so a `view` argument would have been
dead. `addDoc` reads `revForView()` internally, so the two must not drift;
`revForView` stays in `RepoTab` (the diff header and the search box also read
it).

**Risk:** low. It is a move with a signature, not a change of behaviour. The
one thing to watch is that every existing caller of the moved functions keeps
working, which `npm run typecheck` covers.

**`outlineable` is not part of this hook.** It sits right after the hook call
(line 521 after the cut) and reads the hook's own returns — `doc`,
`viewingFile`, `previewing` — but it is a display decision for the diff
header, not a document operation, so it stays in `RepoTab`. That also keeps
`hasOutline` / `outlineLanguage` imported there, where CLAUDE.md's
lazy-loading note places them. `RepoTab` computes it from the hook's returns
and passes the boolean to `DiffHeader`.

## 2. `FilesView`

**Cut:** lines 1167–1365's files-pane subtree — header, search box, tree
filter, `FilesPane` — plus the four states and two refs that only it uses
(`searchOpen`, `searchText`, `treeFilterOpen`, `treeFilter`, `treeFilterRef`,
`filesBodyRef`) and the `treeKey`-reset effect (498–501).

**This is the one cut that is a real cleanup, not a move.** Those states and
refs leave `RepoTab` entirely. What stays behind is the coordination: `view`,
`viewFiles`, `selectedFile`, and the callbacks that have to reach other panes
(`onSelect` still clears `activeDoc` for non-snapshots, `onOpen` still calls
`openFileDoc`).

**The landed props** (`components/FilesView.tsx`):

```ts
interface FilesViewProps {
  view: View                // mode + hash; drives title branch, emptyText,
                            // startCollapsed, whether Back-to-worktree shows
  title: string             // filesTitle, computed in RepoTab
  viewFiles: FileEntry[]
  naturalSort: boolean
  selectedFile: string | null
  treeKey: string
  commitMeta: CommitMeta | null
  paneClass: string         // pane + full-screen suffix, computed by the tab
  header: { full: JSX.Element; hide: JSX.Element | null }   // buttons from RepoTab
  onDoubleClick: (e: { target: EventTarget | null }) => void
  onSelect: (path: string) => void
  onOpen: (path: string) => void
  onMenu: (entry: FileEntry, state: MenuState) => void
  onToggleStage: (f: FileEntry) => void
  onSearch: (pattern: string) => void      // openSearch
  onBackToWorkTree: () => void
  sendToAgent: (pick?: string) => void
  agentItems: (list: string[]) => MenuItem[]
  agentCommands: string[]
  agentCommand: string
  setMenu: (m: MenuState | null) => void
  revForView: () => string | null          // for the "in revision" hint
}
```

Deviations from the sketch above: `onToggleStage` is unconditional — the
component reads `view.mode` and passes it to `FilesPane` only for the work tree,
same as before. `onAgentPrompt` was wrong (nothing reads it; the dropdown's
state is the pane's own), and `agentCommand` is passed so the title can name the
command that would run. `onMenu` is the menu's `(entry, state)` shape, not an
items factory — `fileMenu` from `createContextMenus` is exactly that, so the
component gets the handler as-is. `paneClass` arrives as the resolved string
rather than the id.

The header chrome passes through as rendered JSX rather than as state — the
full/hide buttons are coordination (they involve `paneControls`, `PaneChrome`,
`msg`), so `RepoTab` keeps rendering them and `FilesView` gets slots. The
pane's own buttons (`sendToAgent`, search, back-to-worktree, filter) render
inside.

**Behaviour preserved exactly:** `autoFocus` on the search box, Escape
closing each strip without leaking to the window, the tree-filter reset when
`treeKey` changes (the effect moves into the component with the state it
clears), Ctrl+F on the body selecting the box's contents.

**Risk:** medium — higher than the others, because it is the only cut that
actually relocates state. The layout is safe (a `Panel` still wraps one
element; `FilesView` introduces no `Group`), but the pane's look under full
screen and with panes hidden needs the visual pass (below).

## 3. `DiffHeader`

**Cut:** the diff pane's header, lines 1372–1536 — the densest block in the
file: the widen/whole-diff toggle, the index-side segment, the preview/source
toggle, collapse-all, wrap, the outline button (which now also serves symbol
trees), inline/side-by-side, and the doc-tab strip's sibling logic that
depends on `doc`.

**Suggested props:** `view`, `diffTitle`, `selectedFile`, `workingFile`,
`viewingFile`, `previewing`, `outlineable`, `doc`, `wrap`, `diffView`,
`mdOutline`, `collapseState`, `diffRef`, plus the setters (`setWrap`,
`setDiffView`, `setMdOutline`, `setSelectedFile`, `setActiveDoc`,
`setSideOverride`), the `togglePreview` callback, `openFileDoc`, and the
`header` slots as in `FilesView`. Around 26 props; large but flat.

The outline button moves with its new condition: it renders on
`previewing || outlineable`, and its title picks `showOutline` for a rendered
document and `showSymbols` for a source file. `outlineable` arrives as a
boolean computed in `RepoTab` (§1), so the button's whole decision lives
inside this component.

**The one convergence:** the two `setDocs` calls that flip `preview` on and
off (1459–1463 and 1479–1483) collapse into a single `onTogglePreview` that
`RepoTab` implements against the current `doc`. The component reads
`previewing` to decide which of the two buttons to draw — it already renders
exactly one of them.

**Risk:** low; a move. The danger is only in *reading* it — the button set is
long, and a port is exactly where a condition flips. The visual pass is
mandatory here, not optional.

## What stays put, on purpose

These are not missed opportunities. Each is coordination — shared state that
several panes read — and moving it would trade one long file for a hook whose
shape is the same coupling wearing a costume.

- **Staging (864–1000).** `workingFile` derives from `status` × `view` ×
  `selectedFile`; `applyPicks` ends in `refresh()`. A `useStaging` hook would
  take a dozen arguments or smuggle `refresh` in as a hidden dependency.
- **Browsing history (630–686).** `goTo` writes six states at once (`view`,
  `selectedFile`, `docs`, `activeDoc`, `selectedCommit`, `compareCommit`).
  That is the definition of the coordinator's job; `nav.ts` already holds the
  pure part.
- **Commit interactions (747–862).** `onSelectCommit` / `showCommit` /
  `showSnapshot` change several states in a fixed sequence. They are the
  transitions the session is made of, not a pane's business.
- **push/pull + remote-msg auto-dismiss (1002–1051).** The state is shared
  with the log header and the auto-dismiss effect; the boundary is thin and
  the payoff would be small. Listed as a possible fourth cut only if the first
  three land clean and the file still reads heavy.
- **The state model itself.** No reducer, no context, no splitting state into
  per-pane stores. The cross-effects (`onSelectCommit` clears selection and
  docs together) are exactly the places a silent regression lives, and they
  are more readable inline than distributed.

## Order and acceptance

Each cut lands as its own commit under `[Unreleased]` in `CHANGELOG.md`,
verified before the next starts:

1. `useDocs` — `npm run typecheck` + `npm test`; pure move.
2. `FilesView` — typecheck + tests + visual pass.
3. `DiffHeader` — typecheck + tests + visual pass.

**Visual verification** follows the CLAUDE.md recipe — build, patch a
`capturePage` into `out/main/index.js` at `ready-to-show`, drive with
`executeJavaScript`, screenshot. The scenarios that changed behaviourally are
in step 2: files pane under full screen, with the diff hidden, and with the
terminal hidden; the search box and tree filter still open, autofocus, and
close on Escape; Ctrl+F still focuses the filter. Step 3 checks the diff
header's button set — widen, side segment, preview/source, collapse, wrap,
outline, view switch — in inline and split modes, with and without a file
selected, and with a document open. The outline button now has two faces: a
rendered document (`previewing`) offers the heading outline, and a source
file shown as itself (`outlineable`, e.g. a `.ts` opened without preview)
offers the symbol tree, each with its own title. Check both, and that
`mdOutline` toggling persists across them.

**Done means:** `RepoTab.tsx` contains session state, cross-pane effects
(`refresh`, `loadDiff`, the watcher, Escape/refresh keys), the navigation
transitions, the context-menu wiring, and the four-pane JSX — and nothing
else. The private-state list below has left the file; anything still reading
it would be a pane's UI state that failed to move.

- `searchOpen`, `searchText`, `treeFilterOpen`, `treeFilter`, `treeFilterRef`,
  `filesBodyRef` → into `FilesView`.
- `collapseState` → stays a `RepoTab` state (the `DiffPane` ref is the other
  half of it; `DiffHeader` reads it as a prop).
- `hasGource`, `gourceStarting` → unmoved for now (see the fourth-cut note).

Target size: roughly 1100–1200 lines, with the deleted ~700 being exactly the
parts that never had to be coordination.
