import { describe, expect, it } from 'vitest'
import { hasOutline, outlineOf, type CodeSymbol } from '../src/renderer/src/symbols'

/** `kind name@line` per symbol, indented by depth — the tree as one string. */
function flat(syms: CodeSymbol[], depth = 0): string[] {
  return syms.flatMap((s) => [
    `${'  '.repeat(depth)}${s.kind} ${s.name}@${s.line}`,
    ...flat(s.children, depth + 1)
  ])
}

describe('typescript', () => {
  it('reads declarations and nests members under their class', () => {
    const src = [
      'export interface Point {',
      '  x: number',
      '}',
      '',
      'export type Id = string',
      '',
      'export class Repo {',
      '  private root: string',
      '',
      '  constructor(root: string) {',
      '    this.root = root',
      '  }',
      '',
      '  async status(): Promise<string> {',
      '    if (this.root) {',
      '      return "clean"',
      '    }',
      '    return ""',
      '  }',
      '}',
      '',
      'export function open(path: string): Repo {',
      '  return new Repo(path)',
      '}',
      '',
      'export const parse = (text: string) => text.trim()'
    ].join('\n')
    expect(flat(outlineOf(src, 'typescript'))).toEqual([
      'interface Point@1',
      'type Id@5',
      'class Repo@7',
      '  method constructor@10',
      '  method status@14',
      'function open@22',
      'function parse@26'
    ])
  })

  it('takes a function nested in another as its child', () => {
    const src = ['function outer() {', '  function inner() {}', '}'].join('\n')
    expect(flat(outlineOf(src, 'typescript'))).toEqual(['function outer@1', '  function inner@2'])
  })

  it('ignores keywords that open a block like a call', () => {
    const src = ['function f() {', '  if (x) {', '  }', '  while (y) {}', '}'].join('\n')
    expect(flat(outlineOf(src, 'typescript'))).toEqual(['function f@1'])
  })

  it('reads nothing out of comments or strings', () => {
    const src = [
      '// function commented() {}',
      '/* class Blocked {',
      '   function alsoBlocked() {}',
      '*/',
      'const s = "function quoted() {}"',
      'const t = `class Templated {`',
      'function real() {}'
    ].join('\n')
    expect(flat(outlineOf(src, 'typescript'))).toEqual(['function real@7'])
  })

  it('keeps a brace inside a string out of the nesting', () => {
    // Without stripping, the `{` in the string would leave `second` a child.
    const src = ['function first() {', '  const s = "{"', '}', 'function second() {}'].join('\n')
    expect(flat(outlineOf(src, 'typescript'))).toEqual(['function first@1', 'function second@4'])
  })

  it('tells a JSX constant from a function whose parameters wrap', () => {
    const src = [
      'const view = (',
      '  <div onClick={() => run()}>',
      '    <span />',
      '  </div>',
      ')',
      'const add = (',
      '  a: number,',
      '  b: number',
      ') => a + b'
    ].join('\n')
    expect(flat(outlineOf(src, 'typescript'))).toEqual(['function add@6'])
  })

  it('reads the named function inside a wrapper call', () => {
    const src = [
      'export const Tab = forwardRef<Handle, Props>(function Tab(props, ref) {',
      '  return null',
      '})'
    ].join('\n')
    expect(flat(outlineOf(src, 'typescript'))).toEqual(['function Tab@1'])
  })

  it('reads a function assigned onto an object', () => {
    const src = ['md.renderer.rules.image = (tokens, idx) => {', '  return ""', '}'].join('\n')
    expect(flat(outlineOf(src, 'typescript'))).toEqual(['function md.renderer.rules.image@1'])
  })

  it('leaves ordinary constants alone', () => {
    const src = [
      'const CHUNK = 1500',
      'const TOKEN = /<span>/g',
      'const md = new MarkdownIt({',
      '  html: false',
      '})',
      'const lines = useMemo(() => split(source), [source])'
    ].join('\n')
    expect(outlineOf(src, 'typescript')).toEqual([])
  })
})

describe('python', () => {
  it('nests by indentation', () => {
    const src = [
      'import os',
      '',
      'class Repo:',
      '    """A docstring with',
      '    def hidden(self): pass',
      '    """',
      '',
      '    def __init__(self, root):',
      '        self.root = root',
      '',
      '    async def status(self):',
      '        def helper():',
      '            pass',
      '        return helper()',
      '',
      'def open_repo(path):',
      '    return Repo(path)'
    ].join('\n')
    expect(flat(outlineOf(src, 'python'))).toEqual([
      'class Repo@3',
      '  method __init__@8',
      '  method status@11',
      '    function helper@12',
      'function open_repo@16'
    ])
  })
})

describe('go', () => {
  it('names a method by its receiver', () => {
    const src = [
      'package main',
      '',
      'type Repo struct {',
      '\tRoot string',
      '}',
      '',
      'type Opener interface {',
      '\tOpen() error',
      '}',
      '',
      'func (r *Repo) Status() string {',
      '\treturn ""',
      '}',
      '',
      'func main() {}'
    ].join('\n')
    expect(flat(outlineOf(src, 'go'))).toEqual([
      'struct Repo@3',
      'interface Opener@7',
      'method (Repo) Status@11',
      'function main@15'
    ])
  })
})

describe('rust', () => {
  it('puts an impl block over its functions', () => {
    const src = [
      'pub struct Repo {',
      '    root: String,',
      '}',
      '',
      'impl Repo {',
      '    pub fn new(root: String) -> Self {',
      '        Repo { root }',
      '    }',
      '}',
      '',
      'fn main() {}'
    ].join('\n')
    expect(flat(outlineOf(src, 'rust'))).toEqual([
      'struct Repo@1',
      'class impl Repo@5',
      '  method new@6',
      'function main@11'
    ])
  })
})

describe('java', () => {
  it('reads members with and without modifiers', () => {
    const src = [
      'package app;',
      '',
      'public class Repo {',
      '    private String root;',
      '',
      '    public Repo(String root) {',
      '        this.root = root;',
      '    }',
      '',
      '    String status() {',
      '        return "";',
      '    }',
      '}'
    ].join('\n')
    expect(flat(outlineOf(src, 'java'))).toEqual([
      'module app@1',
      'class Repo@3',
      '  method Repo@6',
      '  method status@10'
    ])
  })
})

describe('c', () => {
  it('takes definitions and not prototypes', () => {
    const src = [
      'struct point;',
      '',
      'int add(int a, int b);',
      '',
      'struct point {',
      '    int x;',
      '};',
      '',
      'int add(int a, int b)',
      '{',
      '    return a + b;',
      '}',
      '',
      'static void run(void) {',
      '    add(1, 2);',
      '}'
    ].join('\n')
    expect(flat(outlineOf(src, 'c'))).toEqual([
      'struct point@5',
      'function add@9',
      'function run@14'
    ])
  })
})

describe('ruby, shell', () => {
  it('reads ruby by indentation', () => {
    const src = ['module App', '  class Repo', '    def status', '    end', '  end', 'end'].join(
      '\n'
    )
    expect(flat(outlineOf(src, 'ruby'))).toEqual([
      'module App@1',
      '  class Repo@2',
      '    method status@3'
    ])
  })

  it('reads both shell function spellings', () => {
    const src = ['build() {', '  echo hi', '}', '', 'function run {', '  build', '}'].join('\n')
    expect(flat(outlineOf(src, 'bash'))).toEqual(['function build@1', 'function run@5'])
  })
})

describe('hasOutline', () => {
  it('claims the languages it can read and no others', () => {
    expect(hasOutline('typescript')).toBe(true)
    expect(hasOutline('python')).toBe(true)
    // Markdown has an outline of its own, from its headings.
    expect(hasOutline('markdown')).toBe(false)
    expect(hasOutline('json')).toBe(false)
    expect(hasOutline(null)).toBe(false)
  })

  it('returns nothing for a language it does not read', () => {
    expect(outlineOf('{"a": 1}', 'json')).toEqual([])
    expect(outlineOf('function f() {}', null)).toEqual([])
  })
})
