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
 */
export function commitUrlBase(remote: string): string | null {
  const parsed = parseRemote(remote)
  if (!parsed) return null
  const { host, path } = parsed
  if (host === 'dev.azure.com' || host.endsWith('.visualstudio.com')) return null
  const base = `https://${host}/${path}`
  if (host === 'bitbucket.org') return `${base}/commits/`
  if (host === 'gitlab.com' || host.includes('gitlab')) return `${base}/-/commit/`
  return `${base}/commit/`
}
