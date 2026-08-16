/**
 * Which icon a path gets in the file tree, as pure data — the drawing is
 * `components/FileIcon.tsx`, and nothing here imports anything, for the reason
 * `paths.ts` imports nothing: the file list must not drag a viewer's libraries
 * into the warm chunk just to decide a glyph.
 *
 * The mapping is two-dimensional on purpose. **The shape is the family** — a
 * source file, a stylesheet, an archive, an image — and **the colour is the
 * language**, so `.ts` and `.py` are the same glyph in different colours while
 * `.ts` and `.zip` are different glyphs. Thirty-odd extensions therefore need
 * eighteen shapes rather than thirty icons, and two languages that share an
 * appearance (`.c` with `.h`, the shell dialects) are ones a reader treats
 * alike anyway.
 *
 * Every tone is a palette variable, never a brand hex: the tree is drawn over
 * both themes, and a colour picked for one background is unreadable on the
 * other. That is also why there are eight tones and not a hue per language.
 *
 * The exception is a **brand mark** — a shape that is one language's own logo
 * and carries that logo's colours in the drawing. Python is the only one, and
 * the bar for a second is the same: a mark a reader recognises faster than any
 * tone of the shared glyph, in colours that hold up on both backgrounds. A
 * logo per language is what the shape-plus-tone scheme exists to avoid.
 */

export type IconShape =
  | 'code' // a source file: < >
  | 'hash' // the C family, named for its preprocessor
  | 'cup' // the JVM languages
  | 'braces' // structured data: JSON, YAML, TOML
  | 'markup' // HTML, XML and their kin
  | 'style' // stylesheets
  | 'doc' // prose: Markdown, text, PDF
  | 'table' // rows and columns: CSV, spreadsheets
  | 'image'
  | 'archive'
  | 'shell' // a script meant for a shell, and the shells' own dotfiles
  | 'db'
  | 'lock' // lockfiles, keys and certificates
  | 'binary' // compiled output, nothing to read
  | 'media' // audio and video
  | 'font'
  | 'git' // git's own dotfiles
  | 'file' // anything unrecognised
  // Brand marks: a language whose own logo is more legible than any glyph a
  // family could give it. They carry their colours in the drawing and ignore
  // the tone, which is why there are so few of them — see the note above.
  | 'python'

/** Palette variables, not brand colours — see the note above. */
export type IconTone =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'cyan'
  | 'magenta'
  | 'orange'
  | 'dim'

export interface FileIcon {
  shape: IconShape
  tone: IconTone
}

const ic = (shape: IconShape, tone: IconTone = 'dim'): FileIcon => ({ shape, tone })

/**
 * Whole names, matched before extensions: the files that carry their type in
 * their name rather than after a dot, plus the few whose extension would
 * otherwise say the wrong thing (`package-lock.json` is a lockfile, not data).
 */
const BY_NAME: Record<string, FileIcon> = {
  dockerfile: ic('shell', 'blue'),
  containerfile: ic('shell', 'blue'),
  makefile: ic('shell', 'orange'),
  'gnumakefile': ic('shell', 'orange'),
  'cmakelists.txt': ic('shell', 'orange'),
  justfile: ic('shell', 'orange'),
  rakefile: ic('shell', 'red'),
  procfile: ic('shell', 'magenta'),
  '.gitignore': ic('git', 'orange'),
  '.gitattributes': ic('git', 'orange'),
  '.gitmodules': ic('git', 'orange'),
  '.gitkeep': ic('git', 'orange'),
  '.mailmap': ic('git', 'orange'),
  '.editorconfig': ic('braces', 'dim'),
  '.npmrc': ic('braces', 'red'),
  '.nvmrc': ic('braces', 'green'),
  '.env': ic('lock', 'yellow'),
  'package-lock.json': ic('lock', 'red'),
  'yarn.lock': ic('lock', 'cyan'),
  'pnpm-lock.yaml': ic('lock', 'yellow'),
  'cargo.lock': ic('lock', 'orange'),
  'poetry.lock': ic('lock', 'green'),
  'composer.lock': ic('lock', 'magenta'),
  'go.sum': ic('lock', 'cyan'),
  license: ic('doc', 'yellow'),
  'license.md': ic('doc', 'yellow'),
  'license.txt': ic('doc', 'yellow'),
  copying: ic('doc', 'yellow')
}

/**
 * By extension. Grouped by shape rather than alphabetically, so the tone
 * choices — which are only meaningful against their neighbours — can be read
 * as one decision per family.
 */
const BY_EXT: Record<string, FileIcon> = {
  // Source. One tone per language, and the languages a reader keeps apart get
  // the tones that are furthest apart.
  ts: ic('code', 'blue'),
  tsx: ic('code', 'blue'),
  mts: ic('code', 'blue'),
  cts: ic('code', 'blue'),
  js: ic('code', 'yellow'),
  jsx: ic('code', 'yellow'),
  mjs: ic('code', 'yellow'),
  cjs: ic('code', 'yellow'),
  // Python's two snakes are read faster than any tone of the shared glyph, so
  // it is the one language drawn as itself. The tone is carried anyway — it is
  // what the mark falls back to if the drawing is ever dropped.
  py: ic('python', 'green'),
  pyi: ic('python', 'green'),
  pyw: ic('python', 'green'),
  go: ic('code', 'cyan'),
  rs: ic('code', 'orange'),
  rb: ic('code', 'red'),
  php: ic('code', 'magenta'),
  lua: ic('code', 'blue'),
  pl: ic('code', 'magenta'),
  pm: ic('code', 'magenta'),
  r: ic('code', 'blue'),
  jl: ic('code', 'magenta'),
  dart: ic('code', 'cyan'),
  swift: ic('code', 'orange'),
  ex: ic('code', 'magenta'),
  exs: ic('code', 'magenta'),
  hs: ic('code', 'magenta'),
  ml: ic('code', 'orange'),
  vim: ic('code', 'green'),
  el: ic('code', 'magenta'),
  zig: ic('code', 'orange'),
  nim: ic('code', 'yellow'),

  // The C family: the same glyph, told apart by tone, because a project full
  // of them wants the pairing visible and the language secondary.
  c: ic('hash', 'blue'),
  h: ic('hash', 'blue'),
  cpp: ic('hash', 'magenta'),
  cc: ic('hash', 'magenta'),
  cxx: ic('hash', 'magenta'),
  hpp: ic('hash', 'magenta'),
  hh: ic('hash', 'magenta'),
  cs: ic('hash', 'green'),
  m: ic('hash', 'cyan'),
  mm: ic('hash', 'cyan'),

  java: ic('cup', 'red'),
  kt: ic('cup', 'magenta'),
  kts: ic('cup', 'magenta'),
  scala: ic('cup', 'orange'),
  groovy: ic('cup', 'cyan'),
  gradle: ic('cup', 'cyan'),

  // Structured data and configuration.
  json: ic('braces', 'yellow'),
  jsonc: ic('braces', 'yellow'),
  json5: ic('braces', 'yellow'),
  yaml: ic('braces', 'magenta'),
  yml: ic('braces', 'magenta'),
  toml: ic('braces', 'orange'),
  ini: ic('braces', 'dim'),
  cfg: ic('braces', 'dim'),
  conf: ic('braces', 'dim'),
  properties: ic('braces', 'dim'),
  proto: ic('braces', 'cyan'),

  html: ic('markup', 'orange'),
  htm: ic('markup', 'orange'),
  xhtml: ic('markup', 'orange'),
  xml: ic('markup', 'green'),
  svg: ic('markup', 'yellow'),
  vue: ic('markup', 'green'),
  svelte: ic('markup', 'red'),

  css: ic('style', 'blue'),
  scss: ic('style', 'magenta'),
  sass: ic('style', 'magenta'),
  less: ic('style', 'cyan'),
  styl: ic('style', 'green'),

  md: ic('doc', 'blue'),
  markdown: ic('doc', 'blue'),
  mdown: ic('doc', 'blue'),
  mkd: ic('doc', 'blue'),
  mdx: ic('doc', 'cyan'),
  rst: ic('doc', 'green'),
  adoc: ic('doc', 'green'),
  txt: ic('doc', 'dim'),
  text: ic('doc', 'dim'),
  log: ic('doc', 'dim'),
  pdf: ic('doc', 'red'),
  tex: ic('doc', 'green'),
  rtf: ic('doc', 'dim'),
  doc: ic('doc', 'blue'),
  docx: ic('doc', 'blue'),

  csv: ic('table', 'green'),
  tsv: ic('table', 'green'),
  xls: ic('table', 'green'),
  xlsx: ic('table', 'green'),
  ods: ic('table', 'green'),

  png: ic('image', 'magenta'),
  jpg: ic('image', 'magenta'),
  jpeg: ic('image', 'magenta'),
  gif: ic('image', 'magenta'),
  webp: ic('image', 'magenta'),
  bmp: ic('image', 'magenta'),
  ico: ic('image', 'yellow'),
  avif: ic('image', 'magenta'),
  psd: ic('image', 'blue'),

  zip: ic('archive', 'yellow'),
  tar: ic('archive', 'yellow'),
  gz: ic('archive', 'yellow'),
  tgz: ic('archive', 'yellow'),
  bz2: ic('archive', 'yellow'),
  xz: ic('archive', 'yellow'),
  zst: ic('archive', 'yellow'),
  '7z': ic('archive', 'yellow'),
  rar: ic('archive', 'yellow'),
  deb: ic('archive', 'red'),
  rpm: ic('archive', 'red'),
  appimage: ic('archive', 'blue'),
  dmg: ic('archive', 'blue'),
  jar: ic('archive', 'red'),
  whl: ic('archive', 'green'),

  sh: ic('shell', 'green'),
  bash: ic('shell', 'green'),
  zsh: ic('shell', 'green'),
  fish: ic('shell', 'green'),
  ps1: ic('shell', 'blue'),
  bat: ic('shell', 'blue'),
  cmd: ic('shell', 'blue'),
  mk: ic('shell', 'orange'),

  sql: ic('db', 'cyan'),
  db: ic('db', 'cyan'),
  sqlite: ic('db', 'cyan'),
  sqlite3: ic('db', 'cyan'),

  lock: ic('lock', 'red'),
  pem: ic('lock', 'yellow'),
  key: ic('lock', 'yellow'),
  crt: ic('lock', 'yellow'),
  cer: ic('lock', 'yellow'),
  gpg: ic('lock', 'yellow'),
  asc: ic('lock', 'yellow'),

  exe: ic('binary', 'dim'),
  dll: ic('binary', 'dim'),
  so: ic('binary', 'dim'),
  dylib: ic('binary', 'dim'),
  o: ic('binary', 'dim'),
  a: ic('binary', 'dim'),
  obj: ic('binary', 'dim'),
  bin: ic('binary', 'dim'),
  class: ic('binary', 'red'),
  pyc: ic('binary', 'green'),
  wasm: ic('binary', 'magenta'),
  node: ic('binary', 'green'),

  mp3: ic('media', 'cyan'),
  wav: ic('media', 'cyan'),
  flac: ic('media', 'cyan'),
  ogg: ic('media', 'cyan'),
  m4a: ic('media', 'cyan'),
  mp4: ic('media', 'red'),
  mkv: ic('media', 'red'),
  webm: ic('media', 'red'),
  mov: ic('media', 'red'),
  avi: ic('media', 'red'),

  ttf: ic('font', 'blue'),
  otf: ic('font', 'blue'),
  woff: ic('font', 'blue'),
  woff2: ic('font', 'blue'),
  eot: ic('font', 'blue')
}

const FALLBACK: FileIcon = ic('file', 'dim')

/**
 * The icon for a repo-relative path. Whole names win over extensions, and a
 * dotfile whose name is not listed is read by what follows its *last* dot, so
 * `.eslintrc.json` is data while a bare `.bashrc` — no second dot, hence no
 * extension — falls through to the plain file rather than claiming to be a
 * language called `bashrc`.
 */
export function fileIcon(path: string): FileIcon {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase()
  const byName = BY_NAME[name]
  if (byName) return byName

  // `.tar.gz` and friends: the compression is the outer extension, but the
  // pairing is one archive to a reader, and both halves map to the same icon
  // anyway — so the last dot is enough and there is no special case here.
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return FALLBACK
  return BY_EXT[name.slice(dot + 1)] ?? FALLBACK
}
