import { useCallback, useEffect, useState } from 'react'
import type { RendererMessages } from '../../shared/messages'
import type { RepoStatus } from '../../shared/types'

/** What is on the strip: git's own words, and whether they are good news. */
export type RemoteMessage = { ok: boolean; text: string } | null

/** Which long-running command is in flight, if one is. */
export type RemoteOp = 'push' | 'pull' | 'submodule' | null

/**
 * The commands that reach outside the repository — push, pull, pulling a
 * submodule, and gource — together with the strip below the header where all
 * of them report.
 *
 * They are one hook because the strip is one: it is the only place git's own
 * words appear, so whoever writes to it decides what the others may say. Two
 * things outside this file speak through it as well — staging reports its
 * failures, and the terminal hand-over reports having nowhere to type — so
 * `report` and `setMessage` are handed back rather than kept private.
 */
export function useRemoteOps(opts: {
  root: string
  status: RepoStatus | null
  refresh: () => void
  msg: RendererMessages
}): {
  message: RemoteMessage
  setMessage: (m: RemoteMessage) => void
  /** Report what git said; a success is only worth a line when it failed to be one. */
  report: (said: { ok: boolean; output: string } | null) => void
  op: RemoteOp
  runRemote: (op: 'push' | 'pull') => Promise<void>
  pullSubmodule: (rel: string) => Promise<void>
  hasGource: boolean
  gourceStarting: boolean
  playGource: () => Promise<void>
} {
  const { root, status, refresh, msg } = opts

  // The push or pull in flight, and what the last external command said —
  // push, pull or gource; the strip below the header is the one place any of
  // them gets to speak in its own words.
  const [op, setOp] = useState<RemoteOp>(null)
  const [message, setMessage] = useState<RemoteMessage>(null)
  const [hasGource, setHasGource] = useState(false)
  const [gourceStarting, setGourceStarting] = useState(false)

  const report = useCallback((said: { ok: boolean; output: string } | null) => {
    if (said && !said.ok) setMessage({ ok: false, text: said.output })
  }, [])

  const runRemote = useCallback(
    async (which: 'push' | 'pull') => {
      setOp(which)
      setMessage(null)
      try {
        const res =
          which === 'push'
            ? // A branch with no upstream has to name one; otherwise git knows.
              await window.gitty.git.push(root, status?.upstream ? null : status?.branch ?? null)
            : await window.gitty.git.pull(root)
        setMessage({ ok: res.ok, text: res.output })
      } finally {
        setOp(null)
        void refresh()
      }
    },
    [root, status, refresh]
  )

  /**
   * Pull one submodule from the file tree's menu. It talks to a remote like
   * the buttons above do, so it reports where they report and locks them
   * while it runs; the superproject is left pointing at the old commit, which
   * is why the refresh afterwards is what shows the submodule in Changes.
   */
  const pullSubmodule = useCallback(
    async (rel: string) => {
      setOp('submodule')
      setMessage({ ok: true, text: msg.contextMenu.pullingSubmodule(rel) })
      try {
        const res = await window.gitty.git.submodulePull(root, rel)
        setMessage({ ok: res.ok, text: res.output })
      } finally {
        setOp(null)
        void refresh()
      }
    },
    [root, refresh, msg]
  )

  useEffect(() => {
    void window.gitty.gource.available().then(setHasGource)
  }, [])

  /**
   * Start the animation. gource opens a window of its own and outlives the
   * click, so the button only waits long enough to learn whether it survived
   * its first seconds — and says nothing at all when it did.
   */
  const playGource = useCallback(async () => {
    setGourceStarting(true)
    setMessage(null)
    try {
      const res = await window.gitty.gource.play(root)
      if (res.output) setMessage({ ok: res.ok, text: res.output })
    } finally {
      setGourceStarting(false)
    }
  }, [root])

  // Success has been read by the time it matters; a failure stays until it is
  // dismissed, since it is the only place git's own words appear.
  useEffect(() => {
    // "Pulling …" is a success message that is not a result: it stays for as
    // long as the pull it describes runs.
    if (!message?.ok || op !== null) return
    const t = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(t)
  }, [message, op])

  return {
    message,
    setMessage,
    report,
    op,
    runRemote,
    pullSubmodule,
    hasGource,
    gourceStarting,
    playGource
  }
}
