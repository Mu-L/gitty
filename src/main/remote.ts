/**
 * Turning a git remote into a web address for one commit.
 *
 * A remote URL is a transport address, not a page: `git@github.com:u/r.git`
 * names an SSH endpoint, and the browsable page for a commit is something the
 * hosting software decides. There is no protocol that asks a remote where its
 * commit pages are, so this is inference and nothing more — hence the `null`
 * return whenever the host is one whose layout we cannot name.
 *
 * Pure string work, kept out of `git.ts` so it can be tested without a
 * repository. `test/remote.test.ts` is the list of forms that have to keep
 * working.
 */

/** A remote's host and path, from any of the five shapes git accepts. */
interface Parsed {
  host: string
  /** Repository path without a leading slash or a trailing `.git`. */
  path: string
}

function parseRemote(remote: string): Parsed | null {
  const url = remote.trim()
  if (!url) return null

  // scp-like: `git@host:user/repo.git`, which is not a URL and has no `//`.
  // A colon-then-digits is a `ssh://host:port` written without its scheme by
  // nobody, but `host:22/x` would parse as a path starting with `22` — git
  // reads it that way too, so it is left alone.
  // A one-letter host is a Windows drive (`C:\repos\x`), not a server.
  const scp = /^(?:([^/@]+)@)?([^/:]{2,}):(?!\/)(.+)$/.exec(url)
  if (scp && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    return clean(scp[2], scp[3])
  }

  const m = /^([a-z][a-z0-9+.-]*):\/\/([^/]*)\/(.*)$/i.exec(url)
  if (!m) return null
  const scheme = m[1].toLowerCase()
  // `file://` and a bare local path are repositories, not web pages.
  if (scheme === 'file') return null
  // Credentials belong to the transport, never to the page.
  const authority = m[2].replace(/^[^@]*@/, '')
  return clean(authority.replace(/:\d+$/, ''), m[3])
}

function clean(host: string, repoPath: string): Parsed | null {
  const p = repoPath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.git$/i, '')
  const h = host.toLowerCase().replace(/^\/+/, '')
  if (!h || !p) return null
  return { host: h, path: p }
}

/**
 * The bare host a remote URL may write instead of a domain. An ssh config
 * alias (`Host github` → `HostName github.com`) or a hand-typed shortcut
 * leaves git storing `git@github:user/repo.git`, and `git remote get-url`
 * returns it verbatim. The site's real name usually comes from the user's ssh
 * config (see `expandHost`); these are the well-known bare names to fall back
 * on when no config entry names them. An exact match only: `github.example.org`
 * is an internal host, not a typo.
 */
const KNOWN_HOSTS: Record<string, string> = {
  github: 'github.com',
  gitlab: 'gitlab.com',
  bitbucket: 'bitbucket.org',
  gitee: 'gitee.com',
}

/**
 * The `Host`/`HostName` pairs of an ssh config, as an alias → host map.
 *
 * Only the fields this tool needs are read, and the OpenSSH rules that matter
 * are kept: keywords are case-insensitive, the first value for each parameter
 * wins, and a `Match` or `Include` line ends the previous block so its
 * `HostName` is not attributed to the wrong `Host`. Patterns — `Host *`, the
 * ubiquitous defaults block — are skipped, because the alias to expand is a
 * literal name; `!` negation is skipped too. `Include` is not followed and a
 * backslash continuation is not joined (spec note).
 */
export function parseSshConfig(text: string): Map<string, string> {
  const hosts = new Map<string, string>()
  let block: string[] = []
  let hostName = ''
  const flush = (): void => {
    if (hostName) for (const h of block) if (!hosts.has(h)) hosts.set(h, hostName)
    block = []
    hostName = ''
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const sp = trimmed.indexOf(' ')
    const keyword = (sp < 0 ? trimmed : trimmed.slice(0, sp)).toLowerCase()
    const rest = (sp < 0 ? '' : trimmed.slice(sp + 1)).split('#')[0].trim()
    if (keyword === 'host') {
      flush()
      block = rest
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((h) => h.toLowerCase())
        .filter((h) => !h.includes('*') && !h.includes('?') && !h.startsWith('!'))
    } else if (keyword === 'hostname') {
      if (!hostName) hostName = rest.toLowerCase()
    } else if (keyword === 'match' || keyword === 'include') {
      flush()
    }
  }
  flush()
  return hosts
}

/**
 * The web domain a remote's host resolves to.
 *
 * A dotted host is already a domain and stays put — GitHub's own SSH-over-443
 * setup pairs `Host github.com` with `HostName ssh.github.com`, and the remote
 * keeps the real hostname, so expanding there would lose it. A bare host (an
 * ssh alias, or a hand-typed shortcut) expands through the user's config
 * first and the well-known names as a fallback. A `HostName` of `ssh.<domain>`
 * is a transport endpoint, not the site, so the `ssh.` prefix is stripped —
 * but only when a domain actually follows it: `ssh.internal` stays whole.
 */
export function expandHost(host: string, sshHosts: ReadonlyMap<string, string>): string {
  if (host.includes('.')) return host
  const fromSsh = sshHosts.get(host)
  if (fromSsh) {
    const web = fromSsh.startsWith('ssh.') ? fromSsh.slice(4) : fromSsh
    return web.includes('.') ? web : fromSsh
  }
  return KNOWN_HOSTS[host] ?? host
}

/**
 * The prefix a commit hash is appended to, or null when the host is not one
 * whose commit pages we can name.
 *
 * GitLab moved its non-file routes under `/-/` to keep them out of the way of
 * branch names; Bitbucket says `commits` where everyone else says `commit`.
 * Everything else here — GitHub, Gitea, Forgejo, Codeberg, Gogs, sourcehut —
 * agrees on `/commit/<hash>`, which is why an unrecognised host is given that
 * layout rather than nothing: self-hosted Gitea and Forgejo are common and
 * carry no recognisable name, and a wrong guess costs a browser tab.
 *
 * Azure DevOps is the exception that must return null: its commit page is a
 * query string (`/_git/repo/commit/<hash>` under a project path that the
 * remote does not spell out the same way), so a guess there is wrong rather
 * than merely unproven.
 *
 * `sshHosts` is the parsed ssh config (or empty), used to expand a bare host;
 * it is optional so the module stays pure and its tests stay repository-free.
 */
export function commitUrlBase(remote: string, sshHosts: ReadonlyMap<string, string> = new Map()): string | null {
  const parsed = parseRemote(remote)
  if (!parsed) return null
  const { host, path } = parsed
  if (host === 'dev.azure.com' || host.endsWith('.visualstudio.com')) return null
  const baseHost = expandHost(host, sshHosts)
  const base = `https://${baseHost}/${path}`
  if (baseHost === 'bitbucket.org') return `${base}/commits/`
  if (baseHost === 'gitlab.com' || baseHost.includes('gitlab')) return `${base}/-/commit/`
  return `${base}/commit/`
}
