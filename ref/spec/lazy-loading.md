# Spec: renderer lazy loading

**Status:** implemented (2026-08-07) · **Scope:** `src/renderer/`

Gitty's renderer used to build as one 1.6 MB JavaScript file. Electron cannot
paint the window until the whole bundle has been parsed and executed, so
startup waited on libraries that most sessions never touch — xterm, highlight.js
and markdown-it were parsed before the first frame even though the terminal and
the file viewers are not the basic interface. This spec records the split that
fixed that and the rules that keep it working.

## Chunk layout

The renderer is four chunks. The first three names are what vite emits today;
they change with the import graph, so treat the *dependency edges* as the
contract, not the filenames.

```
┌─────────────────────────────────────────────────────────────┐
│ main  (index-*.js)                                          │
│   React, App shell, title bar, tab bar, SettingsPane,       │
│   ContextMenu, panes.ts (gitty.* view prefs)                │
└───────────────────────────────┬─────────────────────────────┘
                                │ lazy
┌───────────────────────────────▼─────────────────────────────┐
│ RepoTab (RepoTab-*.js)                                      │
│   RepoTab, FilesPane, LogPane, DiffPane, contextMenus,      │
│   paths.ts, terminals.ts, react-resizable-panels,           │
│   PaneChrome, Tooltip                                       │
└──────────────┬──────────────────────────────┬───────────────┘
               │ lazy                         │ lazy
┌──────────────▼──────────────┐  ┌────────────▼───────────────┐
│ TerminalsPane (Terminals…js)│  │ FileDoc (FileDoc-*.js)     │
│   TerminalsPane, TerminalPane│  │   FileDoc, CodePane,       │
│   xterm + fit + web-links   │  │   MarkdownPane, ImagePane,  │
└─────────────────────────────┘  │   highlight.js, markdown-it │
                                 └─────────────────────────────┘
```

Dependencies point one way only: main ← RepoTab ← {TerminalsPane, FileDoc}.
The two heavy chunks import only from chunks that are already loaded, so their
fetch can never deadlock or pull anything heavy into a warm chunk.

## The invariant

**No chunk that loads before a lazy chunk's first render may statically import
anything heavy (xterm, highlight.js, markdown-it, or any future equivalent).**

Concretely, the two heavy chunks are the only places those libraries may be
imported from:

- `@xterm/*` → `components/TerminalPane.tsx` only.
- `highlight.js` and `markdown-it` → `highlight.ts` and
  `components/MarkdownPane.tsx` only, and only those are reachable from
  `components/FileDoc.tsx`.

That is why `RepoTab.tsx` must never `import { CodePane }` or
`import { MarkdownPane }` again — a dead import from the tab into a viewer is
how the libraries first got into the single bundle. The import graph is the
gate: if a heavy module is reachable from a warm chunk, the build puts it there.

## The three lazy boundaries

Every boundary is `React.lazy(() => import(…).then((m) => ({ default: m.X })))`
wrapped in `<Suspense>` at its single render site:

| boundary | where | gates |
| --- | --- | --- |
| App → RepoTab | `App.tsx` | the whole tab content |
| RepoTab → TerminalsPane | `RepoTab.tsx` | xterm |
| RepoTab → FileDoc | `RepoTab.tsx` | highlight.js + markdown-it |

The Suspense fallbacks reuse existing classes so the split layout stays intact
while a chunk loads: an `.empty` box for RepoTab and FileDoc, a minimal
`.pane-header` + `.empty` shell for the terminal. The placeholder matters for
TerminalsPane: a zero-height fallback would let the panel group collapse.

## Shared modules and the terminals registry

Two tiny modules are imported by both warm and lazy chunks. They must stay free
of heavy dependencies so the shared-chunk placement is safe either way:

- **`paths.ts`** — `isMarkdownPath` / `isImagePath`, pure regexes. Consumed by
  `RepoTab`, `contextMenus` and `FileDoc`. (Used to live in `FileDoc.tsx`, where
  importing it from `contextMenus` dragged the whole viewer into the main
  bundle — the original sin this spec fixes.)
- **`terminals.ts`** — the sessions map, split layouts and `destroySession` /
  `destroyTerminals` / `focusSession`. It imports xterm **only as `import type`**,
  which erases at build time. `RepoTab` calls `destroyTerminals(root)`
  synchronously on unmount, so it cannot live in the lazy TerminalsPane chunk;
  it lives wherever the build places it among the warm chunks (today,
  RepoTab's), and TerminalsPane chunk imports the same registry from there.
  Splitting this file is non-optional — without it the terminal pane could not
  be lazy at all.

Anything shared between `RepoTab` and the terminal pane (`PaneChrome`,
`Tooltip`, `react-resizable-panels`) rides in the RepoTab chunk for the same
reason and is re-exported to the heavy chunks. Keep those shared modules heavy-
free too.

## Adding a new heavy dependency

1. Import it **only** from inside a lazy chunk (or a module only that chunk
   reaches). Never from `App.tsx`, `RepoTab.tsx`, `contextMenus.ts`, or a
   module they import.
2. If the tab needs to *synchronously* reach state from the new library's
   chunk, extract that state into a registry module like `terminals.ts` that
   type-imports the library, and have both sides import the registry.
3. Route any shared helpers through a leaf module like `paths.ts` — importing a
   single function must never pull in the module's whole component tree.

## Verification

- `npm run typecheck` — the whole automated safety net.
- `npm run build`, then read `out/renderer/assets/`:
  - exactly one smallish main chunk (React + shell),
  - a `RepoTab-*.js` chunk with **no** xterm / highlight.js / markdown-it,
  - `TerminalsPane-*.js` and `FileDoc-*.js` carrying the heavy libraries.
- Launch and confirm the panes render; open a file and a terminal to exercise
  both lazy paths (see CLAUDE.md, "Verifying changes visually").
- Sanity: `grep -c` for the library names in each chunk must come up empty in
  everything except the chunk that owns them.

## What this does not change

The main process is untouched — `web.start()`, git calls and IPC were never the
bottleneck. Startup still waits on `git status`/`git log` for the first tab's
data, but the window paints before those finish. The 583 KB main chunk is mostly
react-dom itself; the app shell around it is tens of kilobytes.
