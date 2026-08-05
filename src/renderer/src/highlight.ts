import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import lua from 'highlight.js/lib/languages/lua'
import makefile from 'highlight.js/lib/languages/makefile'
import markdown from 'highlight.js/lib/languages/markdown'
import perl from 'highlight.js/lib/languages/perl'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

// Registered one by one rather than importing all of highlight.js: the full
// bundle is several times the size of the rest of the renderer.
for (const [name, lang] of [
  ['bash', bash],
  ['c', c],
  ['cpp', cpp],
  ['csharp', csharp],
  ['css', css],
  ['diff', diff],
  ['go', go],
  ['ini', ini],
  ['java', java],
  ['javascript', javascript],
  ['json', json],
  ['lua', lua],
  ['makefile', makefile],
  ['markdown', markdown],
  ['perl', perl],
  ['php', php],
  ['python', python],
  ['ruby', ruby],
  ['rust', rust],
  ['scss', scss],
  ['shell', shell],
  ['sql', sql],
  ['swift', swift],
  ['typescript', typescript],
  ['xml', xml],
  ['yaml', yaml]
] as const) {
  hljs.registerLanguage(name, lang)
}

export { hljs }

/** File extension → highlight.js language, for viewing whole files. */
const BY_EXTENSION: Record<string, string> = {
  bash: 'bash',
  c: 'c',
  cc: 'cpp',
  cjs: 'javascript',
  conf: 'ini',
  cpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  cxx: 'cpp',
  diff: 'diff',
  go: 'go',
  h: 'c',
  hpp: 'cpp',
  htm: 'xml',
  html: 'xml',
  ini: 'ini',
  java: 'java',
  js: 'javascript',
  json: 'json',
  jsx: 'javascript',
  lua: 'lua',
  markdown: 'markdown',
  md: 'markdown',
  mjs: 'javascript',
  patch: 'diff',
  php: 'php',
  pl: 'perl',
  pm: 'perl',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  sass: 'scss',
  scss: 'scss',
  sh: 'bash',
  sql: 'sql',
  svg: 'xml',
  swift: 'swift',
  toml: 'ini',
  ts: 'typescript',
  tsx: 'typescript',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'bash'
}

/** Files without a useful extension, recognised by name. */
const BY_NAME: Record<string, string> = {
  '.bashrc': 'bash',
  '.gitconfig': 'ini',
  '.zshrc': 'bash',
  dockerfile: 'bash',
  gemfile: 'ruby',
  makefile: 'makefile',
  rakefile: 'ruby'
}

/** Language for a path, or null when we would only be guessing. */
export function languageFor(filePath: string): string | null {
  const name = (filePath.split('/').pop() ?? '').toLowerCase()
  if (BY_NAME[name]) return BY_NAME[name]
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  const lang = BY_EXTENSION[ext]
  return lang && hljs.getLanguage(lang) ? lang : null
}

const TOKEN = /<span class="([^"]*)">|<\/span>|\n|[^<\n]+|</g

/**
 * Highlight a whole file and cut it into per-line HTML fragments.
 *
 * highlight.js emits one blob whose spans run across newlines (a block comment,
 * a template literal), so a naive split by `\n` would produce broken markup.
 * This walks the output keeping the stack of open spans, closing them at each
 * line end and reopening them on the next line.
 */
export function highlightLines(source: string, language: string | null): string[] {
  if (!language) return source.split('\n').map(escapeHtml)

  let html: string
  try {
    html = hljs.highlight(source, { language, ignoreIllegals: true }).value
  } catch {
    return source.split('\n').map(escapeHtml)
  }

  const lines: string[] = []
  const open: string[] = []
  let current = ''

  for (const m of html.matchAll(TOKEN)) {
    const tok = m[0]
    if (tok === '\n') {
      lines.push(current + '</span>'.repeat(open.length))
      current = open.map((cls) => `<span class="${cls}">`).join('')
    } else if (tok.startsWith('</span')) {
      open.pop()
      current += tok
    } else if (tok.startsWith('<span')) {
      open.push(m[1])
      current += tok
    } else {
      current += tok
    }
  }
  lines.push(current + '</span>'.repeat(open.length))
  return lines
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
