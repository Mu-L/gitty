/**
 * The outline of a source file: its classes, functions and members, as a tree.
 *
 * Pure string work over the file's text, deliberately — the same reason
 * `main/patch.ts` is: it can be wrong quietly, so `test/symbols.test.ts` holds
 * it without a repository. A real parser per language (tree-sitter and friends)
 * is a native dependency per grammar, which is several times the renderer for a
 * list of names nobody navigates by when it is a line or two off.
 *
 * The trade that buys is honesty about scope: this recognises *declarations*,
 * not expressions. A name only appears when a keyword put it there, and nesting
 * comes from brace depth (or indentation, for the languages written that way)
 * rather than from understanding the code. Anything it cannot read confidently
 * produces no outline at all, which is what the empty case is for — a wrong
 * outline is worse than none, because a reader clicks it.
 */

export type SymbolKind =
  | 'class'
  | 'interface'
  | 'struct'
  | 'enum'
  | 'type'
  | 'function'
  | 'method'
  | 'module'

export interface CodeSymbol {
  name: string
  kind: SymbolKind
  /** 1-based line the declaration starts on. */
  line: number
  children: CodeSymbol[]
}

/** A declaration this language writes, and what it declares. */
interface Rule {
  re: RegExp
  kind: SymbolKind
  /**
   * Only a member of the enclosing declaration — the shapes loose enough to
   * match ordinary statements (`if (x) {`, a bare call) are accepted inside a
   * class and nowhere else, where a statement cannot appear.
   */
  member?: boolean
  /**
   * Check the name against `NOT_A_NAME`. Set on the rules whose pattern has no
   * declaring keyword in front of the name — those, and only those, can match
   * `if (x) {`. A rule anchored on `fn`/`def`/`func` must not have it: `new`
   * and `match` are ordinary function names once a keyword introduced them.
   */
  guard?: boolean
  /** Builds the name when the capture groups are not simply group 1. */
  name?: (m: RegExpMatchArray) => string
  /**
   * A second opinion from the lines that follow, for shapes that only differ
   * further down — a parameter list opening at the end of a line looks exactly
   * like a parenthesised expression until the arrow arrives.
   */
  follow?: (next: string[]) => boolean
}

/** How far a `follow` may read; a parameter list longer than this is nobody's. */
const FOLLOW = 4

interface Syntax {
  /** Comment openers that run to the end of the line. */
  line: string[]
  block?: [string, string]
  /** Python's `"""`/`'''`, which a docstring full of `def` depends on. */
  triple?: boolean
  quotes: string[]
  /** Nesting is read from the indent column rather than from brace depth. */
  indent?: boolean
  rules: Rule[]
}

/** Words that open a block and are never a declaration, whatever they look like. */
const NOT_A_NAME = new Set([
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'catch',
  'try',
  'finally',
  'return',
  'new',
  'delete',
  'typeof',
  'instanceof',
  'throw',
  'await',
  'yield',
  'with',
  'super',
  'this',
  'function',
  'class',
  'import',
  'export',
  'sizeof',
  'defined',
  'foreach',
  'match',
  'when',
  'unless',
  'until',
  'in',
  'is',
  'and',
  'or',
  'not'
])

/** A `const` bound to something callable, with the `=>` or `function` in sight. */
const JS_CALLABLE =
  /^\s*(?:export\s+)?(?:default\s+)?(?:const|let|var)\s+([\w$]+)\s*(?::[^=]+?)?=\s*(?:async\s+)?(?:function\b|\([^()]*\)\s*(?::[^=]+?)?=>|[\w$]+\s*=>)/

/**
 * The same, with the parameter list running onto the next lines — which reads
 * exactly like a parenthesised expression until the arrow turns up, and in a
 * `.tsx` file usually is one: `const nav = (` opens a chunk of JSX far more
 * often than a function.
 */
const JS_CALLABLE_MULTILINE =
  /^\s*(?:export\s+)?(?:default\s+)?(?:const|let|var)\s+([\w$]+)\s*(?::[^=]+?)?=\s*(?:async\s+)?(?:<[\w$][^=]*>\s*)?\(\s*\{?\s*$/

/**
 * A member written as a call signature: modifiers, a name, then `(`. Loose on
 * purpose — a method has no keyword of its own in these languages — which is
 * why it is a `member` rule and why the name is checked against `NOT_A_NAME`.
 */
const JS_MEMBER =
  /^\s*(?:(?:public|private|protected|static|readonly|abstract|override|declare|async)\s+)*(?:(?:get|set)\s+)?\*?\s*([\w$]+)\s*(?:<[^<>]*>)?\s*\(/

const JS_RULES: Rule[] = [
  {
    re: /^\s*(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?class\s+([\w$]+)/,
    kind: 'class'
  },
  { re: /^\s*(?:export\s+)?(?:declare\s+)?interface\s+([\w$]+)/, kind: 'interface' },
  { re: /^\s*(?:export\s+)?(?:declare\s+)?(?:const\s+)?enum\s+([\w$]+)/, kind: 'enum' },
  { re: /^\s*(?:export\s+)?(?:declare\s+)?type\s+([\w$]+)\s*[=<]/, kind: 'type' },
  {
    re: /^\s*(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)/,
    kind: 'function'
  },
  { re: JS_CALLABLE, kind: 'function' },
  {
    re: JS_CALLABLE_MULTILINE,
    kind: 'function',
    // An element on the next line settles it: that is JSX, not a parameter.
    follow: (next) => !/^\s*</.test(next[0] ?? '') && next.some((l) => l.includes('=>'))
  },
  // `forwardRef<H, P>(function RepoTab(` — a named function handed to a wrapper,
  // which is how a component with a ref is written. The name is the one worth
  // listing; the wrapper around it is not a declaration of anything.
  { re: /\(\s*function\s*\*?\s*([\w$]+)\s*[(<]/, kind: 'function' },
  // `md.renderer.rules.image = (…) => {` — a function hung on an object. The
  // dotted path is what keeps this off ordinary assignment: `x = () => …` is a
  // variable being set, `a.b = () => …` is how a hook gets installed.
  {
    re: /^\s*([\w$]+(?:\.[\w$]+)+)\s*=\s*(?:async\s+)?(?:function\b|\([^()]*\)\s*(?::[^=]+?)?=>|[\w$]+\s*=>)/,
    kind: 'function'
  },
  { re: JS_MEMBER, kind: 'method', member: true, guard: true }
]

const JS: Syntax = {
  line: ['//'],
  block: ['/*', '*/'],
  quotes: ['"', "'", '`'],
  rules: JS_RULES
}

const JAVA_LIKE: Syntax = {
  line: ['//'],
  block: ['/*', '*/'],
  quotes: ['"', "'"],
  rules: [
    {
      re: /^\s*(?:(?:public|private|protected|static|final|abstract|sealed|internal|partial)\s+)*(?:class|record)\s+([\w$]+)/,
      kind: 'class'
    },
    {
      re: /^\s*(?:(?:public|private|protected|static|internal|partial)\s+)*interface\s+([\w$]+)/,
      kind: 'interface'
    },
    {
      re: /^\s*(?:(?:public|private|protected|static|internal)\s+)*(?:enum|struct)\s+([\w$]+)/,
      kind: 'struct'
    },
    { re: /^\s*(?:namespace|package)\s+([\w$.]+)/, kind: 'module' },
    // A method: modifiers, a return type, the name, `(`. The modifiers are
    // required — without them the pattern also matches every call statement.
    {
      re: /^\s*(?:@[\w.]+(?:\([^)]*\))?\s*)*(?:(?:public|private|protected|static|final|abstract|synchronized|native|virtual|override|sealed|async|extern|unsafe|new|readonly)\s+)+(?:[\w$.<>[\],?]+\s+)?([\w$]+)\s*(?:<[^<>]*>)?\s*\(/,
      kind: 'method',
      guard: true
    },
    // Inside a class the modifiers can be left off, and a bare statement
    // cannot appear there — so the loose shape is safe as a member rule.
    {
      re: /^\s*(?:[\w$.<>[\],?*&]+\s+)([\w$~]+)\s*(?:<[^<>]*>)?\s*\(/,
      kind: 'method',
      member: true,
      guard: true
    }
  ]
}

const C_LIKE: Syntax = {
  line: ['//'],
  block: ['/*', '*/'],
  quotes: ['"', "'"],
  rules: [
    // `[:{]` and not a bare name: `struct Foo;` is a forward declaration, and
    // `struct Foo x;` is a variable — neither is a thing to navigate to.
    {
      re: /^\s*(?:typedef\s+)?(?:class|struct|union)\s+([\w$]+)\s*(?:final\s*)?[:{]/,
      kind: 'struct'
    },
    { re: /^\s*namespace\s+([\w:]+)/, kind: 'module' },
    { re: /^\s*(?:typedef\s+)?enum(?:\s+class)?\s+([\w$]+)/, kind: 'enum' },
    // A definition, not a prototype: the body's `{` opens on this line. That
    // one requirement is what keeps every declaration in a header out.
    {
      re: /^\s*(?:(?:static|inline|extern|virtual|explicit|constexpr|friend|const|unsigned|signed|template<[^>]*>)\s+)*[\w:<>,\s*&]*?[\s*&:~]?([\w$~]+)\s*\([^;]*\)\s*(?:const\s*)?(?:noexcept\s*)?(?:override\s*)?\{\s*$/,
      kind: 'function',
      guard: true
    },
    // `void C::f(long,\n  arg list)` — the body's brace is on a later line, so
    // the name is taken from the `::`, which a call statement never has.
    {
      re: /^\s*[\w:<>,\s*&]+?[\s*&]([\w$~]+)::([\w$~]+)\s*\(/,
      kind: 'method',
      guard: true,
      name: (m) => `${m[1]}::${m[2]}`
    }
  ]
}

const GO: Syntax = {
  line: ['//'],
  block: ['/*', '*/'],
  quotes: ['"', "'", '`'],
  rules: [
    {
      re: /^func\s+\(\s*\w+\s+\*?([\w.]+)\s*\)\s*([\w$]+)/,
      kind: 'method',
      name: (m) => `(${m[1]}) ${m[2]}`
    },
    { re: /^func\s+([\w$]+)/, kind: 'function' },
    { re: /^type\s+([\w$]+)\s+struct\b/, kind: 'struct' },
    { re: /^type\s+([\w$]+)\s+interface\b/, kind: 'interface' },
    { re: /^type\s+([\w$]+)\s+/, kind: 'type' }
  ]
}

const RUST: Syntax = {
  line: ['//'],
  block: ['/*', '*/'],
  quotes: ['"', "'"],
  rules: [
    {
      re: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:default\s+)?(?:unsafe\s+)?impl(?:<[^>]*>)?\s+(.+?)\s*(?:\{|$)/,
      kind: 'class',
      name: (m) => `impl ${m[1]}`
    },
    {
      re: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:const\s+)?(?:async\s+)?(?:unsafe\s+)?(?:extern\s+"[^"]*"\s+)?fn\s+([\w$]+)/,
      kind: 'function'
    },
    { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?struct\s+([\w$]+)/, kind: 'struct' },
    { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?enum\s+([\w$]+)/, kind: 'enum' },
    { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:unsafe\s+)?trait\s+([\w$]+)/, kind: 'interface' },
    { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?mod\s+([\w$]+)/, kind: 'module' },
    { re: /^\s*(?:pub(?:\([^)]*\))?\s+)?type\s+([\w$]+)/, kind: 'type' }
  ]
}

const PHP: Syntax = {
  line: ['//', '#'],
  block: ['/*', '*/'],
  quotes: ['"', "'"],
  rules: [
    { re: /^\s*(?:(?:final|abstract|readonly)\s+)*class\s+([\w$]+)/, kind: 'class' },
    { re: /^\s*interface\s+([\w$]+)/, kind: 'interface' },
    { re: /^\s*trait\s+([\w$]+)/, kind: 'class' },
    { re: /^\s*enum\s+([\w$]+)/, kind: 'enum' },
    { re: /^\s*namespace\s+([\w$\\]+)/, kind: 'module' },
    {
      re: /^\s*(?:(?:public|private|protected|static|final|abstract)\s+)*function\s*&?\s*([\w$]+)/,
      kind: 'function'
    }
  ]
}

const SWIFT: Syntax = {
  line: ['//'],
  block: ['/*', '*/'],
  quotes: ['"'],
  rules: [
    {
      re: /^\s*(?:(?:public|private|internal|fileprivate|open|final|static|class)\s+)*(?:class|actor)\s+([\w$]+)/,
      kind: 'class'
    },
    { re: /^\s*(?:(?:public|private|internal|fileprivate|open)\s+)*struct\s+([\w$]+)/, kind: 'struct' },
    { re: /^\s*(?:(?:public|private|internal|fileprivate|open)\s+)*enum\s+([\w$]+)/, kind: 'enum' },
    { re: /^\s*(?:(?:public|private|internal|fileprivate|open)\s+)*protocol\s+([\w$]+)/, kind: 'interface' },
    { re: /^\s*extension\s+([\w$.]+)/, kind: 'class', name: (m) => `extension ${m[1]}` },
    {
      re: /^\s*(?:(?:public|private|internal|fileprivate|open|final|static|class|override|mutating|convenience|required)\s+)*func\s+([\w$]+)/,
      kind: 'function'
    },
    { re: /^\s*(?:(?:public|private|internal|fileprivate|open|required|convenience)\s+)*(init)\s*[(?]/, kind: 'function' }
  ]
}

const PYTHON: Syntax = {
  line: ['#'],
  triple: true,
  quotes: ['"', "'"],
  indent: true,
  rules: [
    { re: /^\s*class\s+([\w$]+)/, kind: 'class' },
    { re: /^\s*(?:async\s+)?def\s+([\w$]+)/, kind: 'function' }
  ]
}

const RUBY: Syntax = {
  line: ['#'],
  quotes: ['"', "'"],
  indent: true,
  rules: [
    { re: /^\s*class\s+([\w:]+)/, kind: 'class' },
    { re: /^\s*module\s+([\w:]+)/, kind: 'module' },
    { re: /^\s*def\s+([\w.:?!=[\]<>+-]+)/, kind: 'function' }
  ]
}

const SHELL: Syntax = {
  line: ['#'],
  quotes: ['"', "'"],
  rules: [
    { re: /^\s*(?:function\s+)?([\w.:-]+)\s*\(\s*\)/, kind: 'function', guard: true },
    { re: /^\s*function\s+([\w.:-]+)/, kind: 'function' }
  ]
}

const LUA: Syntax = {
  line: ['--'],
  block: ['--[[', ']]'],
  quotes: ['"', "'"],
  indent: true,
  rules: [
    { re: /^\s*(?:local\s+)?function\s+([\w.:]+)/, kind: 'function' },
    { re: /^\s*(?:local\s+)?([\w.:]+)\s*=\s*function\b/, kind: 'function' }
  ]
}

const PERL: Syntax = {
  line: ['#'],
  quotes: ['"', "'"],
  rules: [
    { re: /^\s*package\s+([\w:]+)/, kind: 'module' },
    { re: /^\s*sub\s+([\w:]+)/, kind: 'function' }
  ]
}

/**
 * The languages an outline is offered for, keyed by the `languageFor` name.
 * Anything absent — data formats, markup, stylesheets — has no outline rather
 * than a guessed one; markdown has its own, from its headings.
 */
const SYNTAX: Record<string, Syntax> = {
  bash: SHELL,
  c: C_LIKE,
  cpp: C_LIKE,
  csharp: JAVA_LIKE,
  go: GO,
  java: JAVA_LIKE,
  javascript: JS,
  lua: LUA,
  perl: PERL,
  php: PHP,
  python: PYTHON,
  ruby: RUBY,
  rust: RUST,
  shell: SHELL,
  swift: SWIFT,
  typescript: JS
}

/**
 * Extension → the syntax to read a file with. A second table beside
 * `highlight.ts`'s and deliberately not shared with it: that one lives with
 * highlight.js, and importing it from the title bar to decide whether to draw a
 * button would pull the whole highlighter into the main bundle. This module
 * imports nothing, which is what lets `RepoTab` ask the question cheaply.
 */
const BY_EXTENSION: Record<string, string> = {
  bash: 'bash',
  c: 'c',
  cc: 'cpp',
  cjs: 'javascript',
  cpp: 'cpp',
  cs: 'csharp',
  cxx: 'cpp',
  go: 'go',
  h: 'c',
  hh: 'cpp',
  hpp: 'cpp',
  java: 'java',
  js: 'javascript',
  jsx: 'javascript',
  lua: 'lua',
  mjs: 'javascript',
  php: 'php',
  pl: 'perl',
  pm: 'perl',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  sh: 'bash',
  swift: 'swift',
  ts: 'typescript',
  tsx: 'typescript',
  zsh: 'bash'
}

/** The syntax to outline a path with, or null when there is none to offer. */
export function outlineLanguage(filePath: string): string | null {
  const name = (filePath.split('/').pop() ?? '').toLowerCase()
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  return BY_EXTENSION[ext] ?? null
}

export function hasOutline(language: string | null): boolean {
  return language !== null && language in SYNTAX
}

/**
 * Blank out comments and string bodies, keeping every character's column so
 * indentation and brace counting still read true. Without it a `{` in a string
 * or a `def` in a docstring moves the whole tree.
 */
function strip(source: string, s: Syntax): string[] {
  const out: string[] = []
  let inBlock = false
  let inTriple: string | null = null

  for (const raw of source.split('\n')) {
    let line = ''
    let i = 0
    let quote: string | null = null

    while (i < raw.length) {
      const rest = raw.slice(i)
      if (inBlock) {
        const end = s.block ? rest.indexOf(s.block[1]) : -1
        if (end < 0) {
          line += ' '.repeat(rest.length)
          i = raw.length
        } else {
          line += ' '.repeat(end + s.block![1].length)
          i += end + s.block![1].length
          inBlock = false
        }
        continue
      }
      if (inTriple) {
        const end = rest.indexOf(inTriple)
        if (end < 0) {
          line += ' '.repeat(rest.length)
          i = raw.length
        } else {
          line += ' '.repeat(end + 3)
          i += end + 3
          inTriple = null
        }
        continue
      }
      if (quote) {
        // A backslash escapes whatever follows it, the closing quote included.
        if (raw[i] === '\\') {
          line += '  '
          i += 2
          continue
        }
        line += ' '
        if (raw[i] === quote) quote = null
        i++
        continue
      }
      if (s.triple && (rest.startsWith('"""') || rest.startsWith("'''"))) {
        inTriple = rest.slice(0, 3)
        line += '   '
        i += 3
        continue
      }
      const lineComment = s.line.find((c) => rest.startsWith(c))
      if (lineComment) {
        line += ' '.repeat(rest.length)
        i = raw.length
        continue
      }
      if (s.block && rest.startsWith(s.block[0])) {
        inBlock = true
        line += ' '.repeat(s.block[0].length)
        i += s.block[0].length
        continue
      }
      if (s.quotes.includes(raw[i])) {
        quote = raw[i]
        line += ' '
        i++
        continue
      }
      line += raw[i]
      i++
    }
    out.push(line)
  }
  return out
}

/** Brace depth entering each line, and the depth it leaves at. */
function braceDepths(lines: string[]): number[] {
  const depths: number[] = []
  let depth = 0
  for (const line of lines) {
    depths.push(depth)
    for (const ch of line) {
      if (ch === '{') depth++
      else if (ch === '}') depth = Math.max(0, depth - 1)
    }
  }
  return depths
}

/** The column the first non-blank character sits in, or -1 for a blank line. */
function indentOf(line: string): number {
  const m = /^[ \t]*/.exec(line)![0]
  if (m.length === line.length) return -1
  // A tab is one level wherever it lands; mixing the two within one file is
  // the author's problem, not something a column count can rescue.
  return m.replace(/\t/g, '    ').length
}

const CONTAINERS = new Set<SymbolKind>(['class', 'interface', 'struct', 'enum', 'module'])

/**
 * The declarations in a file, as a tree. Empty when the language is not one we
 * read, and — the case worth knowing — when the file simply has none.
 */
export function outlineOf(source: string, language: string | null): CodeSymbol[] {
  const syntax = language ? SYNTAX[language] : undefined
  if (!syntax) return []

  const lines = strip(source, syntax)
  const depths = syntax.indent ? lines.map(indentOf) : braceDepths(lines)
  // Rules that insist on the body's `{` — the only thing telling a C
  // definition from a prototype — would miss every brace written on its own
  // line. Match against the line with that brace folded in; the depth is still
  // the real line's, so nesting is unaffected.
  const text = lines.map((line, i) =>
    !syntax.indent && /\S/.test(line) && !line.includes('{') && lines[i + 1]?.trim() === '{'
      ? `${line.replace(/\s+$/, '')} {`
      : line
  )

  const roots: CodeSymbol[] = []
  // Open declarations, outermost first, with the depth each was found at.
  const stack: { sym: CodeSymbol; depth: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = text[i]
    const depth = depths[i]
    if (depth < 0) continue // a blank line says nothing about nesting
    if (!line.trim()) continue

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop()
    const parent = stack[stack.length - 1]
    const inContainer = parent !== undefined && CONTAINERS.has(parent.sym.kind)

    for (const rule of syntax.rules) {
      if (rule.member && !inContainer) continue
      const m = rule.re.exec(line)
      if (!m) continue
      const name = rule.name ? rule.name(m) : m[1]
      if (!name || (rule.guard && NOT_A_NAME.has(name))) continue
      if (rule.follow && !rule.follow(text.slice(i + 1, i + 1 + FOLLOW))) continue

      const sym: CodeSymbol = {
        name,
        // A function declared inside a class is that class's method, whichever
        // rule matched it — languages spell members half a dozen ways.
        kind: rule.kind === 'function' && inContainer ? 'method' : rule.kind,
        line: i + 1,
        children: []
      }
      if (parent) parent.sym.children.push(sym)
      else roots.push(sym)
      stack.push({ sym, depth })
      break
    }
  }

  return roots
}
