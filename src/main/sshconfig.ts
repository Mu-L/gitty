import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseSshConfig } from './remote'

/**
 * The parsed `Host`/`HostName` pairs of the user's ssh config, plus a
 * fingerprint of the file they came from. Callers keep the fingerprint with
 * anything they derive from the hosts, so a later edit of the config invalidates
 * the derivation without comparing values.
 */
export interface SshSnapshot {
  hosts: ReadonlyMap<string, string>
  fp: string
}

interface Cached {
  mtimeMs: number
  size: number
  hosts: ReadonlyMap<string, string>
  fp: string
}

let cached: Cached | null = null

/**
 * The user's ssh config as an alias → host map, parsed at most once per file
 * change. `statSync` is cheap enough to run every time; only when both the
 * mtime and the size move is the file re-read, so an edit made while the app
 * runs is picked up. A missing or unreadable config is an empty map — bare
 * hosts then fall back to the well-known names in `remote.ts` — and its
 * fingerprint is `-1:-1`, distinct from any real file.
 */
export function sshConfig(): SshSnapshot {
  const file = path.join(os.homedir(), '.ssh', 'config')
  let stat: fs.Stats
  try {
    stat = fs.statSync(file)
  } catch {
    return { hosts: new Map(), fp: '-1:-1' }
  }
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return { hosts: cached.hosts, fp: cached.fp }
  }
  let hosts: ReadonlyMap<string, string> = new Map()
  try {
    hosts = parseSshConfig(fs.readFileSync(file, 'utf8'))
  } catch {
    // unreadable — treated as absent; the caller's KNOWN_HOSTS fallback applies
  }
  cached = { mtimeMs: stat.mtimeMs, size: stat.size, hosts, fp: `${stat.mtimeMs}:${stat.size}` }
  return { hosts: cached.hosts, fp: cached.fp }
}
