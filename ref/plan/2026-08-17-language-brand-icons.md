# Brand marks for the common languages

**Status:** planned · **Scope:** `src/renderer/src/icons.ts`,
`src/renderer/src/components/FileIcon.tsx`, `test/icons.test.ts`

The file tree draws a type icon on every name. Today the scheme is
two-dimensional — **the shape is the family** (source, data, markup, prose,
image, archive, script, lockfile, compiled output) and **the tone is the
language** — so `.ts` and `.py` were the same `<>` glyph in different palette
colours. `.py` has since become the exception: Python is drawn as its own
two-tone mark, because a reader picks that out faster than any tone of a shared
glyph.

This plan extends that exception to the languages a reader knows by their logo,
the way every editor icon theme does. It is written to be executed later, in
batches, and it deliberately spends most of its length on the two things that
decide whether the result is good: what a mark must look like at 13 px, and
which languages earn one.

## Why not simply do it

Three costs, all real, none fatal:

1. **Visual noise.** Gitty is a grey application; the only colour on screen is
   status codes, lanes and diffs, and each of those *means* something. Thirty
   brand colours in the left pane compete with the yellow `M` beside them. The
   mitigation is in the drawing rules below (small, flat, one or two colours per
   mark) plus an off switch — see the open question.
2. **Legibility at 13 px.** A wordmark is where this fails: `TS` in a 13 px box
   leaves each letter about 6 px tall. Marks that are *shapes* (a gopher, a
   gem, a shield) survive the size; marks that are *letters* only survive as a
   filled badge with a reversed glyph, which is exactly why the community's
   `.ts` and `.js` icons are solid squares rather than bare letters.
3. **Trademarks.** Every mark here is drawn from scratch as a simplified
   geometry, in the style already used for `python` — no official SVG is copied
   into the repository, no logo file is vendored, and nothing in the UI implies
   endorsement. A mark that cannot be approximated in a handful of path
   commands is one to skip, not to trace.

## What a mark must satisfy

The bar for a brand mark, in order of how often it will be the thing that
disqualifies a candidate:

- **Recognised faster than the family glyph.** This is the whole justification.
  If a reader has to squint to tell it from the next mark, the shared `<>` in a
  distinct tone was better.
- **Readable at 13 px, not just at 3×.** Verify by screenshot at the real row
  height, never by looking at the SVG in an editor.
- **Holds up on both themes.** Palette variables are theme-aware; brand colours
  are not. A mark whose colour has less than 3:1 contrast against `--bg-pane` in
  *either* theme must be drawn as a **badge**: a filled rounded square in the
  brand colour with the glyph reversed out of it. That is what saves JavaScript
  yellow, whose `#f7df1e` is invisible on white.
- **Two colours at most.** Gradients are out — Kotlin and Svelte get flat
  approximations or nothing.
- **Under ~400 bytes of path data.** The whole set has to stay a screenful of
  code rather than a dependency; see `FileIcon.tsx`'s note on why an icon
  package is not the answer.

## The architecture change

`IconShape` currently mixes the two kinds. Split the union before adding
twenty more members, or the distinction that matters — *does this glyph take
its colour from the tone or from itself?* — stays implicit:

```ts
export type FamilyShape = 'code' | 'hash' | 'cup' | 'braces' | /* … */ 'file'
export type BrandMark = 'python' | 'typescript' | 'javascript' | /* … */
export type IconShape = FamilyShape | BrandMark

/** Marks carry their own colours and ignore the tone. */
export const BRAND_MARKS: readonly BrandMark[] = [/* … */]
export function isBrand(shape: IconShape): shape is BrandMark
```

`FileIcon.tsx` then holds two tables instead of one: `FAMILY`, stroked in
`currentColor` as today, and `MARKS`, filled with their own colours and
`stroke="none"`. The `<svg>` keeps the tone class either way — a mark ignores
it, but `FileIcon` does not need to know that, and the tone stays the recorded
fallback if a mark is ever dropped.

The `ic()` entries keep their tone for every language that gains a mark. This
is not decoration: the tone is what the row falls back to, and it is what the
tests assert, so a mark can be added or removed without touching the mapping.

## Batches

Ordered by how often the extension turns up in a real checkout, so the first
batch is most of the value. Each batch is one change: mapping, drawings, tests,
a screenshot pass, a CHANGELOG line.

**Batch 1 — the ones in every repository (10).**

| ext | mark | drawing |
| --- | --- | --- |
| `ts`, `mts`, `cts` | TypeScript | badge, `#3178c6`, reversed `TS` |
| `tsx` | React + TS | atom orbits, `#3178c6` |
| `js`, `mjs`, `cjs` | JavaScript | badge, `#f7df1e`, dark `JS` |
| `jsx` | React | atom orbits, `#61dafb` |
| `json` | — keep `braces` | no logo worth the noise |
| `html`, `htm` | HTML5 | shield, `#e34f26`, notch at the base |
| `css` | CSS3 | shield, `#1572b6` |
| `md`, `markdown` | Markdown | rounded frame, `M` + down arrow, `--fg-dim` |
| `rs` | Rust | gear ring with `R`, `--fg` (its black/white is theme-hostile) |
| `go` | Go | wordmark badge, `#00add8`, reversed `GO` |

`Dockerfile` (the whale, `#2496ed`) rides along with this batch: it is a whole
name rather than an extension, and it is in as many repositories as `go.mod`.

**Batch 2 — the next tier (10).** `java` (cup with steam, `#e76f00` over
`#5382a1`), `rb` (gem, `#cc342d`), `php` (rounded oval wordmark, `#777bb4`),
`cs` (badge, `#68217a`, reversed `C#`), `swift` (swift silhouette, `#f05138`),
`kt` (two-tone chevron, `#7f52ff` + `#e44857`), `vue` (chevron, `#42b883` over
`#35495e`), `svelte` (`S` curve, `#ff3e00`), `c`/`h` (round badge `C`,
`#5c6bc0`), `cpp`/`cc`/`hpp` (round badge `C++`, `#00599c`).

**Batch 3 — the long tail (8, optional).** `lua` (moon and orbit, `#2c2d72`),
`ex`/`exs` (drop, `#4b275f`), `hs` (lambda, `#5e5086`), `jl` (three dots, Julia
red/green/purple), `r` (grey ring with `R`, `#276dc3`), `dart` (bird wedge,
`#0175c2`), `zig` (`Z` bolt, `#f7a41d`), `scala` (stacked slats, `#dc322f`).

Everything not listed keeps its family shape. That is the point of having
families: `.toml`, `.csv`, `.zip`, `.mp4`, `.woff2` have no mark a reader
carries around, and inventing one is worse than the geometry they have now.

## Drawing rules

- **Badges** (wordmarks): a `rect` with `rx="3"` from (2,2) to (14,14) in the
  brand colour, glyph reversed in `#fff` or `#000` by contrast, letters drawn as
  paths rather than `<text>` — a `<text>` element depends on the user's font
  setting, which is a slider in this app.
- **Silhouettes** (shields, gems, birds, whales): a single filled path, no
  stroke, no interior detail below 1.5 units — it disappears at 13 px and
  survives only as mud.
- **Two-tone marks**: draw the back half first, the front half over it, exactly
  as `python` does. If the halves are rotations of one another, write one path
  and rotate it — `PY_HALF` is the model.
- Nothing may reference a palette variable *inside* a mark. Mixing brand and
  theme colours in one glyph looks broken in whichever theme was not being
  looked at when it was drawn.

## Tests

`test/icons.test.ts` grows one case per batch asserting the new mappings, plus
two invariants worth having once the set is large:

- every entry in `BY_EXT` and `BY_NAME` whose shape is in `BRAND_MARKS` still
  carries a tone (the fallback contract above);
- `BRAND_MARKS` and the `BrandMark` union agree — a runtime array and a type
  can drift, and the array is what `isBrand` uses.

The drawings themselves stay untested, as `lanes.ts`'s SVG output is: a wrong
path is visible, and a screenshot is the only assertion that means anything.

## Verification

Per batch, using the throwaway-repo trick this work already used once: build a
scratch repository holding one empty file per extension in the batch, point
`GITTY_REPO` at it, and screenshot from inside Electron (the `capturePage`
patch into `out/main/index.js` described in CLAUDE.md). Three shots:

1. **13 px, dark** — the acceptance shot. If a mark is not identifiable here it
   does not ship, however good it looks zoomed.
2. **13 px, light** — catches the contrast failures the badge rule exists for.
3. **3×** — for checking the geometry, not for judging legibility.

## Open question, to answer before Batch 1

**Does this need a setting?** Thirty coloured marks is a different application
from the grey one Gitty is today, and the file tree is the pane a user stares
at. The cheapest honest answer is a three-way in Settings → View: **Off**
(names only), **Family** (today's shapes and tones), **Brand** (marks where they
exist, family shapes elsewhere), stored under `gitty.fileIcons`, defaulting to
**Brand**. That is one `App.tsx` preference, one `SettingsPane` row, one prop
through `FilesPane`, and a string in nine message tables.

The counter-argument is the one this project usually takes: a setting is what
gets added when a decision was not made. If the marks are good at 13 px, nobody
turns them off. Recommendation is to draw Batch 1 first, look at the acceptance
shot, and decide the setting from a screenshot rather than in advance.

## Not in scope

- No icon package, no icon font, no runtime SVG loading. Same reason as before:
  the value of such a dependency is breadth, and breadth is a megabyte.
- No icons for directories — the twisty is the directory's icon.
- No per-user icon themes, no user-supplied mappings.
- No change to the family shapes, tones, or `--orange`. This plan only adds
  marks over the top of a scheme that already works.
