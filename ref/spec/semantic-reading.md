# Semantic reading

A plugin. Extra colour on the *prose* of a rendered markdown document, over and
above the markup highlighting `MarkdownPane` already does. Markup highlighting
knows what the author typed — a heading is a heading because it starts with `#`.
Semantic reading knows what the author *wrote*: a proper noun is a proper noun
because a language analyser said so. The point is reading speed, not
correctness, and nothing here is ever load-bearing — an analyser that answers
slowly, badly or not at all leaves an ordinary rendered document behind.

It is **off by default**, which for a plugin means its plugin is: there is no
second switch. Off because it costs a dictionary or a network round trip per
document, and because a wrong mark reads worse than no mark.

Read `ref/spec/plugins.md` first — this file describes what the plugin does, not
how a plugin works.

## The three moving parts

Deliberately separated, because they change at different rates and belong to
different people.

**The analyser** says *where* the interesting spans are. It is a preference —
`jieba` runs locally over CJK text, `llm` asks a configured model — and it runs
in the main half, never in the renderer.

**The rules** say *how* a span looks. A JSON file the reader owns and edits; two
readers can want different colours over the same analysis, and neither wants to
rebuild the app to get them.

**The model access** says *how to reach* an `llm` analyser: base URL, model
name, key. Its own file, never in the repository, never in `localStorage` and
never sent to the renderer — the renderer asks for marks and gets marks.

## Preferences

| key | stored as | default |
| --- | --- | --- |
| `enabled` | `gitty.plugin.semantic-reading.enabled` | off |
| `analyzer` | `gitty.plugin.semantic-reading.analyzer` | `jieba` |

`analyzer` matters only while the plugin is on; it is remembered separately so
turning it off and on again does not forget which analyser was chosen.

## Files

```
src/plugins/semantic-reading/
  shared.ts        kinds, spans, rules, defaults, the method names
  analyze.ts       pure: taggedSpans, locateTerms, latinSpans, withLatin
  render.ts        pure: marksCss — the reader's rules as a stylesheet
  main/index.ts    the method table: analyse, rules, configPaths
  main/config.ts   the reader's two files
  ui/index.tsx     the manifest: prefs, rows, the marks extension
  ui/messages.ts   its strings, every locale
```

`analyze.ts` and `render.ts` are outside `main/` and `ui/` because both projects
compile them and `test/semantic-reading.test.ts` covers them. They are the quiet
kind of wrong: a mis-accumulated offset underlines the wrong words and a
decoration that escapes its rule leaks into the rest of the stylesheet, and
neither throws.

## Spans and kinds

`Span` is `{ start, end, kind }` — a half-open range of **JavaScript string
indices** into one segment of text. Spans never overlap and arrive in ascending
order; the pane relies on both.

Four kinds are proper nouns an analyser distinguished: `person`, `place`, `org`
and `proper` — the last meaning "a proper noun that is none of the first three".
They are separate kinds even though the default rules paint all four the same
way, because separating them costs nothing here and is the whole reason the
rules file exists.

The fifth, `latin`, is not a proper noun and comes from no analyser: a run of
latin letters and digits inside CJK prose — `GPT-4`, `Claude`, `v0.1.9` in a
Chinese sentence. `latinSpans` finds them by pattern and `withLatin` merges them
into whatever the analyser said, the analyser winning every overlap: it named
what a piece of text *is*, where the run only says what script it is written in.
The merge happens in `analyse`, not inside either analyser, so the runs are the
same whichever one answered — and are still there when neither could.

Only in a CJK segment, and deliberately: in an English paragraph every word is a
latin run, so marking them all marks nothing. A run has to contain a letter, so
a bare number is left alone; it already reads as a number.

A kind becomes the `className` the plugin hands the pane, which the pane turns
into `pl-semantic-reading-<kind>` — the same helper `render.ts` writes the
selectors with, so the two cannot drift.

## The analysers

Both live in `main/index.ts` behind one `analyse(analyzer, segments, model)`,
which answers with one `Span[]` per segment. The model access is a parameter
rather than something the file fetches for itself, which keeps the analysis free
of Electron and so testable without an app. Whatever fails — a missing module,
an unconfigured model, a request that times out — fails to an empty array for
that segment and never to an exception; the document has already rendered by
then and marks are an addition to it.

**`jieba`** is `@node-rs/jieba`, imported lazily on first use so that a reader
who never turns the plugin on never pays for loading a five-megabyte dictionary,
and so that importing the pure modules touches no native code. It is a prebuilt
N-API binary, which is why it needs no `electron-rebuild` step the way
`node-pty` does: N-API is ABI-stable across Electron versions. Its dictionary is
imported as `@node-rs/jieba/dict.js`, extension and all, because the package
publishes no `exports` map and the bare subpath is resolved as ESM and not
found.

Packaging has to name it: `electron-builder.yml` excludes `node_modules`
wholesale, so `@node-rs/**` is listed back in beside `node-pty` and unpacked
from the asar for the same reason — a `.node` inside one cannot be loaded. Only
the platform package npm installed for *this* machine is there, so a
cross-architecture build ships without it and the marks stay off for that arch,
which is a degradation and not a failure to start.

It tags words rather than locating them, so `taggedSpans` walks the tagged list
accumulating offsets; it verifies each word against the segment as it goes and
gives up on the rest of a segment the moment they stop lining up, because a
mismatched offset would underline the wrong text, silently.

The tag mapping is jieba's own: `nr` → person, `ns` → place, `nt` → org, `nz` →
proper. Single-character words are dropped whatever their tag — jieba tags a
lone character a name often enough that the marks become noise.

**`llm`** posts the segments to an OpenAI-compatible `/chat/completions`
endpoint and asks for the proper nouns **as strings** — with a kind each, but
never with an offset: a model counting UTF-16 indices is a model getting it
wrong, and the main half can locate a string in a segment perfectly.
`locateTerms` does that, longest term first so a longer name wins over a
substring of it, and skips a match that overlaps one already taken. A term the
model invented simply does not occur, and disappears.

## Caching

`analyse` keeps an in-process map from analyser and text to the spans for it, so
a document that re-renders — and `MarkdownPane` re-renders on every image that
lands, every scroll that moves the outline — never asks twice, and a phrase
repeated through a document is analysed once. The cache is bounded and dropped
whole when full; it holds an analysis, not a document, so nothing depends on an
entry surviving.

## The config files

Both are JSON in `host.configDir()` — `userData/plugins/semantic-reading/` —
and both are **written with their defaults the first time they are read**. An
empty file the reader has to invent from documentation is a feature nobody
finds.

`rules.json` maps each kind to a decoration:

```json
{
  "person": { "underline": "solid", "underlineColor": "#7aa2f7" },
  "place":  { "underline": "solid", "underlineColor": "#7aa2f7" },
  "org":    { "underline": "solid", "underlineColor": "#7aa2f7" },
  "proper": { "underline": "solid", "underlineColor": "#7aa2f7" },
  "latin":  { "underline": "none",  "color": "#4fc3d0" }
}
```

The defaults use two different channels on purpose. A proper noun gets a line
under it and keeps the text colour; a latin run gets a colour and no line — so
`Claude` in a Chinese sentence, which is both, reads as both. The colours are
literal and the file knows nothing about themes, so they are the dark palette's;
a reader on the light theme edits them.

A decoration may set `underline` (`none`, `solid`, `dotted`, `dashed`, `double`,
`wavy`), `underlineColor`, `color`, `background`, `bold` and `italic`. Every
field is validated against an enum or a colour pattern and a bad one falls back
to the default rather than to nothing — these values end up inside a stylesheet,
so a value that is not recognised must not be passed through. There is no
"anything CSS" escape hatch for exactly that reason. The check is the plugin's
own: what the *reader* wrote is untrusted, the plugin's code is not.

Richer operations — an inserted break after a sentence, an indent that follows
the clause structure — are what this file is shaped to grow into, and are
deliberately not here yet. They are block-level: they move text rather than
colour it, so they cannot ride on the inline span the way a colour can, and they
want a design of their own rather than a field bolted onto this one. They would
also want an extension point the pane does not have; see `ref/spec/plugins.md`.

`models.json` says how to reach the `llm` analyser:

```json
{
  "llm": {
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-4o-mini",
    "apiKeyEnv": "OPENAI_API_KEY",
    "apiKey": ""
  }
}
```

`apiKeyEnv` is offered first and named first on purpose: a key in the
environment is a key not sitting in a file. `apiKey` is the fallback for a
reader who would rather have it on disk. **The model itself is never in the
repository** and never bundled — this file names one that already exists
somewhere, which is the whole of Gitty's relationship with it.

Both are re-read when their mtime or size moves, the way `sshconfig.ts` does it,
so editing the rules and reopening the document is enough to see the change — no
restart. A file that cannot be parsed is left exactly as it was written: it is
the reader's file, and overwriting it would throw away the edit they got wrong.
A rules file missing a kind — one written before that kind existed — is written
back with the kind filled in; additive only, and every value the reader wrote has
already been carried into what is written.

## Limits

A document is capped at `MAX_SEGMENTS` segments and `MAX_CHARS` characters of
text; past either, the rest of the document goes unmarked rather than the
request growing without bound. `wanted` refuses a segment shorter than two
characters and one with no letters in it: neither can hold a proper noun, and
they would dominate the request.

## What the move from the core changed

The feature shipped first as core code called "reading marks", spread across
`src/main/prose.ts`, `src/main/proseConfig.ts`, `src/renderer/src/prose.ts`,
`src/shared/types.ts`, three IPC channels, a preload namespace, two fields in
`prefs.ts`, four rows in `SettingsPane` and seven strings in each of nine
message tables. It is the same feature; it now lives in one directory.

| was | is |
| --- | --- |
| `gitty.proseReading` | `gitty.plugin.semantic-reading.enabled` |
| `gitty.proseAnalyzer` | `gitty.plugin.semantic-reading.analyzer` |
| `userData/prose-rules.json` | `userData/plugins/semantic-reading/rules.json` |
| `userData/prose-models.json` | `userData/plugins/semantic-reading/models.json` |
| `prose:analyze` / `prose:rules` / `prose:configPaths` | methods on `plugin:invoke` |
| `ProseSpan`, `ProseRules`, … in `src/shared/types.ts` | `shared.ts`, in the plugin |
| `.prose-mark`, `.prose-person`, … | `.pl-mark`, `.pl-semantic-reading-person`, … |
| Settings ▸ View ▸ Reading marks | Settings ▸ Plugins ▸ Semantic reading |

**Nothing migrates.** The feature has never been in a release — it is under
`## [Unreleased]` — so there is no reader with the old keys or the old files,
and no code to read them. Anyone who ran a development build gets the defaults
back and a stale pair of files in `userData` that nothing opens.

`MarkdownPane` came out best: it now knows about *marks*, not about proper
nouns. What it lost is every mention of an analyser, a kind or a rule; what it
gained is one hook that any later plugin can implement.
