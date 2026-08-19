import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

/**
 * One repository's resolved remote page, remembered so reopening the repository
 * does not re-derive the address. Two fields make the entry self-invalidate:
 * `url` catches the remote moving or being rewritten, and `sshFp` catches the
 * ssh config that produced the host changing. `base` may be null — a host with
 * no derivable page (Azure DevOps, no remote) is remembered too, so it is not
 * re-probed every time.
 */
export interface RemoteCacheEntry {
  /** The remote name the base was derived from. */
  name: string
  /** `git remote get-url <name>` at compute time. */
  url: string
  /** The web prefix a hash is appended to, or null for a host with no page. */
  base: string | null
  /** `sshConfig().fp` at compute time. */
  sshFp: string
}

let memory: Map<string, RemoteCacheEntry> | null = null

function storePath(): string {
  return path.join(app.getPath('userData'), 'remote-cache.json')
}

function isValid(e: unknown): e is RemoteCacheEntry {
  if (!e || typeof e !== 'object') return false
  const o = e as Record<string, unknown>
  return (
    typeof o.name === 'string' &&
    typeof o.url === 'string' &&
    typeof o.sshFp === 'string' &&
    (o.base === null || typeof o.base === 'string')
  )
}

function load(): Map<string, RemoteCacheEntry> {
  if (memory) return memory
  memory = new Map()
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(storePath(), 'utf8'))
    if (parsed && typeof parsed === 'object') {
      for (const [root, entry] of Object.entries(parsed as Record<string, unknown>)) {
        if (isValid(entry)) memory.set(root, entry)
      }
    }
  } catch {
    // no store yet, or it was corrupted — start over
  }
  return memory
}

/** The remembered resolution for a repository, or null when there is none. */
export function readRemoteCache(root: string): RemoteCacheEntry | null {
  return load().get(root) ?? null
}

/**
 * Remember how a repository's remote resolves. Best-effort, like `recent.ts`:
 * a failed write must never block opening a repository.
 */
export function writeRemoteCache(root: string, entry: RemoteCacheEntry): void {
  load().set(root, entry)
  try {
    fs.mkdirSync(path.dirname(storePath()), { recursive: true })
    fs.writeFileSync(storePath(), JSON.stringify(Object.fromEntries(load()), null, 2))
  } catch {
    /* remembering is best-effort; never block opening a repository */
  }
}
