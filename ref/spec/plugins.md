# Plugins

Where the non-core features live. A history browser's core is the four panes,
git, and the things every reader uses; everything else — a language analyser
over rendered prose, whatever comes after it — is a **plugin**: a directory that
owns its own storage, its own strings, its own settings rows and both halves of
its own process boundary, and that the rest of the app knows only through this
contract.

The point is subtraction. Before this, "adding a capability means touching all
three" — an `ipcMain.handle` in `src/main/index.ts`, a method in
`src/preload/index.ts`, a type in `src/shared/types.ts`, a preference in
`prefs.ts`, a row in `SettingsPane`, a string in nine message tables. A plugin
touches **its own directory and one line of a registry**. The core files stop
growing a paragraph per feature, and a feature that turns out to be a bad idea
is a directory to delete rather than an archaeology.

## What a plugin is not

**Not third-party, and not loaded at runtime.** A plugin is code in this
repository, compiled into the bundle, registered at build time. Loading
arbitrary code from disk would mean a renderer that can `import()` a path, a
main process that can `require` one, and a bridge that is no longer frozen —
three of the rules the app is built on, given away to a feature nobody has asked
for. The contract below is nevertheless drawn so that a future loader would have
somewhere to hand its plugins in: everything crosses one validated channel, and
nothing reaches for the core by name.

**Not a way around the process boundary.** A plugin has a main half and a
renderer half exactly as the app does, and they are as separate. The main half
may open files and spawn things; the renderer half may not, and does not get a
bridge of its own.

## Layout

```
src/plugins/
  types.ts                       the contract, imported by both sides
  <id>/
    shared.ts                    types and constants both halves need
    <pure>.ts                    the string work, where the tests can reach it
    main/index.ts                the main half: its methods, its files
    ui/index.tsx                 the manifest: prefs, rows, extensions
    ui/messages.ts               its strings, every locale
```

`main/` and `ui/` are directories rather than a naming convention because the
two TypeScript projects glob them: `tsconfig.node.json` takes
`src/plugins/**/*.ts` and excludes `*/ui/**`; `tsconfig.web.json` takes both
extensions and excludes `*/main/**`. A file outside those two directories
belongs to **both** projects, which is exactly what `shared.ts` and the pure
modules want to be — the tests are in the node project, so anything worth
testing lives there rather than under `ui/`.

The registries live with the process they serve, the way `messages/index.ts`
does: `src/main/plugins.ts` and `src/renderer/src/plugins.ts`. Registering a
plugin is one import and one array entry in each.

## The one channel

`plugin:invoke` is the only IPC a plugin gets, and the only entry `window.gitty`
grows for all of them:

```ts
window.gitty.plugins.invoke(id, method, args)   →  ipcRenderer.invoke('plugin:invoke', …)
```

The main registry answers it by looking `id` up among the registered plugins and
`method` up among the ones that plugin declared. An unknown pair is an error,
not a pass-through: without that check a renderer bug — or, later, a plugin that
should not have been trusted — would have a name-shaped hole into the main
process.

A method is `(host, args: unknown[]) => unknown`. The looseness stops at the
plugin's own edge: the caller and the callee are the same plugin, and its
`shared.ts` is where the two agree what a method takes and returns. Type safety
across this channel is each plugin's own business, exactly as it is for any
other serialisation boundary.

`host` is what the main half is given rather than what it reaches for:

| | |
| --- | --- |
| `host.configDir()` | `userData/plugins/<id>/`, created on demand — the plugin's own corner of the app's state, so two plugins cannot collide and none of them writes into the app's own files |

## Preferences

A plugin declares its preferences; it does not implement them. Each is a key and
a default, `string` or `boolean`, stored under `gitty.plugin.<id>.<key>` and
held in one `plugins` object beside every other preference in `prefs.ts` — one
state, one line in the store effect, one line in `resetSettings`, however many
plugins there are.

Every plugin also has **`enabled`**, which it does not declare and cannot omit:
`gitty.plugin.<id>.enabled`, defaulted by the manifest. A disabled plugin's
extensions are never consulted and its rows collapse to the switch that turns it
back on. There is deliberately no second "is this feature on" preference for a
plugin to invent — a feature that is a plugin is on exactly when its plugin is.

## Settings

Settings grows a **Plugins** tab. Each plugin is a group headed by its name and
one line of summary, with its enable switch first and its own rows under it. The
rows are declared, not drawn:

| kind | what it is |
| --- | --- |
| `check` | a boolean preference |
| `segmented` | a string preference over two or three named options |
| `file` | a button that opens a path the plugin's main half resolves — for the config files a plugin lets the reader edit |

The list is short on purpose. A row kind exists once a plugin needs it, and a
plugin that wants a control nothing else wants is a reason to look at the
feature again before it is a reason to add a kind.

## Strings

A plugin's strings live in the plugin, as `Record<Locale, T>` — every language,
checked by the compiler, in one file rather than scattered across nine. This is
the one place a plugin deviates from the app's own arrangement, and it is worth
it: a plugin is a directory you can delete, which stops being true the moment
its strings are spread through the core tables.

The manifest is therefore given the `locale` and hands back strings already in
it: `name(locale)`, `summary(locale)`, `rows(locale, …)`. Nothing in the core
knows what a plugin's messages contain.

Adding a language is still the four core edits — and now also a column in every
plugin's table, which `Record<Locale, T>` names for you the moment it is
missing.

## Extension points

One so far. A point is added when a second plugin would use it, not in
anticipation of one.

### `marks` — inline marks on a rendered document

What `MarkdownPane` offers: spans over the *text* of a document, placed in the
render pass. The plugin says which segments interest it, is asked about them
once per document, and gets a stylesheet of its own into the pane.

```ts
interface MarksExtension {
  wanted(text: string): boolean          // cheap, pure, called while rendering
  analyse(texts, prefs): Promise<Mark[][]>  // one round trip per document
  css(prefs): Promise<string>            // this plugin's classes
}

interface Mark { start: number; end: number; className: string }
```

`start`/`end` are half-open JavaScript string indices into the segment.
`className` is the plugin's own name for what it found; the pane emits
`markClass(id, name)` — `pl-<id>-<name>` — and the plugin's stylesheet is
generated through the same helper, so the two cannot drift. Both halves of the
name are `[a-z0-9-]+` and nothing else, because they end up in a selector.

The pane merges every enabled plugin's marks for a segment, in registry order,
and drops any that overlap one already placed: two plugins marking the same
words is a collision the document cannot render, and registry order at least
makes it a decided one. Marks that run backwards or past the end are dropped,
not clamped.

The marks go on **in the render pass**, through markdown-it's `text` rule —
React owns the document through `dangerouslySetInnerHTML` and rewrites it
wholesale, so anything painted onto the rendered DOM is discarded by the next
change to anything at all. Overriding `text` also gets the scope right for free:
a fence, an inline code span and an HTML block are other token types, so code is
never marked as if it were prose.

`analyse` is expected to be slow and allowed to fail: the document renders
unmarked first and re-renders when the marks arrive. A plugin that throws, times
out or has nothing to say leaves an ordinary rendered document behind. It is
never load-bearing.

## Loading and bundle size

The registries are imported by the settings dialog and by `prefs.ts`, which are
main-bundle modules, so **a manifest must be cheap**: types, strings, small pure
functions. A plugin that needs a heavy dependency loads it dynamically at the
point of use — the same rule `ref/spec/lazy-loading.md` states for the core, for
the same reason, and a plugin is not an exemption from it. On the main side that
is `await import()` on first use; on the renderer side it is an import that only
a lazily-loaded chunk makes.

## Adding a plugin

1. `src/plugins/<id>/` with the layout above.
2. Its `main/index.ts` exports a `PluginMain` — `id` and a method table.
3. Its `ui/index.tsx` exports a `Plugin` — `id`, `name`, `summary`,
   `enabledByDefault`, `prefs`, `rows`, and whatever extensions it implements.
4. One import and one array entry in `src/main/plugins.ts` and in
   `src/renderer/src/plugins.ts`.
5. A spec in `ref/spec/<id>.md`, and its row in the table in CLAUDE.md.

Nothing else. In particular: no new IPC channel, no new preload method, no new
field in `src/shared/types.ts`, no string in the core message tables, and no
edit to `SettingsPane` beyond it already knowing how to draw a declared row.
