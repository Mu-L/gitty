import http from 'node:http'
import { createHash, randomBytes } from 'node:crypto'
import * as git from './git'

/**
 * A local web server that renders commits as plain HTML, reading git through
 * the same `git.ts` helpers the renderer uses.
 *
 * Binding 127.0.0.1 is not on its own a boundary worth claiming. It keeps
 * other machines out; it keeps nothing out of *this* machine's browser, where
 * any page you have open can `fetch('http://127.0.0.1:<port>/')` and the port
 * range is small enough to sweep in seconds. Behind that port is the full
 * contents and diffs of every repository open in the app.
 *
 * So every URL carries a token minted at startup and never written down. Three
 * things follow from that, and each of them matters:
 *
 * - It is a path prefix rather than a query parameter, because a query string
 *   is what logs and error reports truncate least carefully.
 * - A wrong token is a 404, not a 403: a 403 confirms that the thing exists.
 * - The `Host` header has to be loopback too. Without that check an attacker
 *   points his own domain at 127.0.0.1, the browser sends *his* Host, and the
 *   page he serves is same-origin with this one — DNS rebinding, which a token
 *   alone does not stop until it has already been sent.
 *
 * And `Referrer-Policy: no-referrer` is not optional decoration: these pages
 * link outward — URLs inside commit messages, links in a rendered README — and
 * one click would otherwise hand the token to a stranger in the `Referer`.
 */

let server: http.Server | null = null
let baseUrl = ''
/** repoId (short hash of the root) → absolute path of the repo root. */
const repos = new Map<string, string>()

/**
 * This run's token. New every launch, so yesterday's URLs are dead — which is
 * the honest version of "the URL works while the repository is open".
 */
const token = randomBytes(16).toString('hex')

const PAGE = 100

/** A stable, short id for a repository, used in URLs. */
function repoId(root: string): string {
  return createHash('sha1').update(root).digest('hex').slice(0, 8)
}

export function start(): Promise<void> {
  return new Promise((resolve) => {
    const srv = http.createServer(handler)
    server = srv
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (addr && typeof addr === 'object') baseUrl = `http://127.0.0.1:${addr.port}`
      console.log(`[web] serving at ${baseUrl}`)
      resolve()
    })
  })
}

export function stop(): void {
  server?.close()
  server = null
}

export function registerRepo(root: string): void {
  repos.set(repoId(root), root)
}

export function unregisterRepo(root: string): void {
  repos.delete(repoId(root))
}

/** The prefix every link and every URL handed out shares. */
const prefix = `/t/${token}`

/** The repo index page URL, or null when the server/repo is not available. */
export function repoUrl(root: string): string | null {
  return server && repos.has(repoId(root)) ? `${baseUrl}${prefix}/${repoId(root)}/` : null
}

/** The commit page URL, or null when the server/repo is not available. */
export function commitUrl(root: string, hash: string): string | null {
  return server && repos.has(repoId(root))
    ? `${baseUrl}${prefix}/${repoId(root)}/commit/${hash}`
    : null
}

/* ---------- routing ---------- */

/**
 * The address the browser thinks it is talking to. Anything but loopback is a
 * page that resolved someone else's name to 127.0.0.1, so it is refused before
 * the token is even looked at.
 */
function hostAllowed(req: http.IncomingMessage): boolean {
  const host = req.headers.host ?? ''
  const port = (server?.address() as { port?: number } | null)?.port
  return host === `127.0.0.1:${port}` || host === `localhost:${port}`
}

async function handler(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const parts = url.pathname.split('/').filter(Boolean)

    // Everything below the token is served; everything else is not here.
    if (!hostAllowed(req)) return notFound(res)
    if (parts.length < 2 || parts[0] !== 't' || !sameToken(parts[1])) return notFound(res)
    const rest = parts.slice(2)

    if (rest.length === 0) return send(res, indexPage())
    if (rest.length === 1) {
      const html = await repoPage(rest[0], url)
      if (html === null) return notFound(res)
      return send(res, html)
    }

    if (rest[1] === 'commit' && rest.length >= 3) {
      const root = repos.get(rest[0])
      if (!root) return notFound(res)
      const hash = rest[2]
      // A commit page: commit + its files + the whole diff. With an extra path
      // segment it is the diff of one file inside that commit.
      if (rest.length === 3) return send(res, await commitPage(root, rest[0], hash))
      const filePath = decodeURIComponent(rest.slice(3).join('/'))
      if (filePath.split('/').some((s) => s === '..')) return notFound(res)
      return send(res, await filePage(root, rest[0], hash, filePath))
    }

    return notFound(res)
  } catch {
    return notFound(res)
  }
}

/** Constant-time-ish compare; the length check alone leaks nothing useful. */
function sameToken(given: string): boolean {
  if (given.length !== token.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= given.charCodeAt(i) ^ token.charCodeAt(i)
  return diff === 0
}

/**
 * `no-referrer` keeps the token out of the `Referer` of every outward link
 * these pages carry, `no-store` keeps the pages out of the disk cache, and
 * `nosniff` keeps a file's contents from being run as something else.
 */
const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
}

function send(res: http.ServerResponse, html: string): void {
  res.writeHead(200, HEADERS)
  res.end(html)
}

function notFound(res: http.ServerResponse): void {
  res.writeHead(404, HEADERS)
  res.end(layout('Not found', '<p class="muted">Nothing here.</p>'))
}

/* ---------- pages ---------- */

function indexPage(): string {
  const items = [...repos.entries()]
    .map(
      ([id, root]) =>
        `<li><a href="${prefix}/${id}/">${esc(root)}</a></li>`
    )
    .join('\n')
  return layout(
    'Repositories',
    `<h1>Repositories</h1>${
      items ? `<ul class="repos">${items}</ul>` : '<p class="muted">No repositories open.</p>'
    }`
  )
}

async function repoPage(id: string, url: URL): Promise<string | null> {
  const root = repos.get(id)
  if (!root) return null
  const skip = Math.max(0, Number(url.searchParams.get('skip')) || 0)
  const commits = await git.log(root, PAGE, skip)

  const rows = commits
    .map(
      (c) => `<tr>
        <td class="hash"><a href="${prefix}/${id}/commit/${c.hash}">${esc(c.short)}</a></td>
        <td class="muted">${esc(stamp(c.date))}</td>
        <td>${esc(c.author)}</td>
        <td class="subject">${esc(c.subject)}</td>
      </tr>`
    )
    .join('\n')

  const prev =
    skip > 0 ? `<a href="${prefix}/${id}/?skip=${Math.max(0, skip - PAGE)}">‹ Newer</a>` : ''
  const next =
    commits.length === PAGE ? `<a href="${prefix}/${id}/?skip=${skip + PAGE}">Older ›</a>` : ''

  return layout(
    root.split('/').pop() || root,
    `<h1>${esc(root)}</h1>
     <table class="log">
       <thead><tr><th>commit</th><th>date</th><th>author</th><th>subject</th></tr></thead>
       <tbody>${rows}</tbody>
     </table>
     <p class="pager">${prev} ${next}</p>`
  )
}

async function commitPage(root: string, id: string, hash: string): Promise<string> {
  const detail = await git.commitDetail(root, hash)
  const { commit } = detail
  const diff = await git.diff(root, { kind: 'commit', hash })

  const files = detail.files
    .map(
      (f) => `<li>
        <span class="st">${esc(f.status)}</span>
        <a href="${prefix}/${id}/commit/${hash}/${encodeURIComponent(f.path)}">${esc(f.path)}</a>
        ${f.origPath ? `<span class="muted">from ${esc(f.origPath)}</span>` : ''}
      </li>`
    )
    .join('\n')

  return layout(
    `${commit.short} ${commit.subject}`,
    `<p><a href="${prefix}/${id}/">← back to log</a></p>
     <h1>${esc(commit.subject)}</h1>
     <p class="muted">
       ${esc(commit.author)} &lt;${esc(commit.email)}&gt; · ${esc(stamp(commit.date))} ·
       <span class="hash">${esc(commit.short)}</span>
     </p>
     ${commit.parents.length ? `<p class="muted">parents: ${commit.parents.map((p) => esc(p.slice(0, 8))).join(', ')}</p>` : ''}
     ${detail.body ? `<pre class="body">${esc(detail.body)}</pre>` : ''}
     <h2>Files</h2>
     <ul class="files">${files}</ul>
     ${diff.notice ? `<p class="notice">${esc(diff.notice)}</p>` : ''}
     <h2>Diff</h2>
     <pre class="diff">${renderDiff(diff.patch)}</pre>`
  )
}

async function filePage(
  root: string,
  id: string,
  hash: string,
  filePath: string
): Promise<string> {
  const diff = await git.diff(root, { kind: 'commit', hash, path: filePath })
  return layout(
    filePath.split('/').pop() ?? filePath,
    `<p><a href="${prefix}/${id}/commit/${hash}">← back to commit</a></p>
     <h1>${esc(filePath)}</h1>
     <p class="muted">${esc(hash.slice(0, 8))}</p>
     ${diff.notice ? `<p class="notice">${esc(diff.notice)}</p>` : ''}
     <pre class="diff">${renderDiff(diff.patch)}</pre>`
  )
}

/** Line-based diff coloring; only ever fed escaped text. */
function renderDiff(patch: string): string {
  if (!patch) return '(no textual changes)'
  return patch
    .split('\n')
    .map((line) => {
      let cls = 'ctx'
      if (line.startsWith('@@')) cls = 'hunk'
      else if (line.startsWith('+++') || line.startsWith('---')) cls = 'file'
      else if (line.startsWith('+')) cls = 'add'
      else if (line.startsWith('-')) cls = 'del'
      return `<span class="ln ${cls}">${esc(line)}</span>\n`
    })
    .join('')
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Compact date, same shape as the app's commit log. */
function stamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)} · Gitty</title>
<style>
  :root { color-scheme: dark; }
  body {
    background: #12141a; color: #d8dee9;
    font: 14px/1.5 system-ui, sans-serif;
    margin: 0 auto; max-width: 1000px; padding: 24px 20px 60px;
  }
  h1 { font-size: 20px; margin: 8px 0; }
  h2 { font-size: 16px; margin: 24px 0 8px; }
  a { color: #5b9cff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .muted { color: #8a94a6; }
  .hash, .diff { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  table.log { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.log th, table.log td {
    text-align: left; padding: 4px 10px 4px 0;
    border-bottom: 1px solid #232a36; white-space: nowrap;
  }
  table.log td.subject { white-space: normal; }
  table.log .hash a { color: #5b9cff; }
  .pager a { margin-right: 14px; }
  .files { list-style: none; padding: 0; margin: 0; }
  .files li { padding: 2px 0; }
  .st { color: #8a94a6; display: inline-block; width: 18px; }
  .body { white-space: pre-wrap; color: #d8dee9; background: #181c24; padding: 12px; border-radius: 6px; }
  .diff { background: #0f1116; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
  .ln { display: block; white-space: pre-wrap; }
  .ln.add  { color: #61c26b; background: #1a2f22; }
  .ln.del  { color: #e26a6a; background: #35201f; }
  .ln.hunk { color: #8a94a6; background: #2a3244; }
  .ln.file { color: #5b9cff; }
  .notice { color: #e2c08d; }
</style>
</head>
<body>
${body}
</body>
</html>`
}
