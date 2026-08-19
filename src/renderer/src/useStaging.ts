import { useCallback, useMemo, useState } from 'react'
import type { View } from './contextMenus'
import type {
  ApplyDirection,
  DiffOptions,
  DiffSide,
  HunkPick,
  RepoStatus,
  WorkingFile
} from '../../shared/types'

/** What git said about a command that either worked or did not. */
type GitSaid = { ok: boolean; output: string } | null

/**
 * Moving changes across the index: whole files from the file tree, picked
 * hunks and lines from the diff.
 *
 * Its own hook because staging is the one part of the tab that *writes* to the
 * repository, and every write is the same three steps — ask the main process,
 * report only a failure, refresh. What it needs from the tab is the view it is
 * looking at and how to do those last two; `RepoTab` keeps both, because the
 * strip that reports is shared with push, pull and gource.
 */
export function useStaging(opts: {
  root: string
  view: View
  selectedFile: string | null
  status: RepoStatus | null
  /** A file is open in the diff pane, so what is on screen is not a diff. */
  viewingFile: boolean
  diffOptions: DiffOptions
  sideOverride: DiffSide | null
  refresh: () => void
  /** Where a failure goes; the tab shows it in the strip below the header. */
  report: (said: GitSaid) => void
}): {
  workingFile: WorkingFile | null
  stageDirection: ApplyDirection | null
  staging: boolean
  applyPicks: (picks: HunkPick[]) => Promise<void>
  toggleStage: (path: string, staged: boolean) => Promise<void>
  discardChanges: (path: string) => Promise<void>
  copyStagedDiff: () => void
} {
  const { root, view, selectedFile, status, viewingFile, diffOptions, sideOverride } = opts
  const { refresh, report } = opts

  // An apply is in flight; the hunk buttons go quiet rather than queueing.
  const [staging, setStaging] = useState(false)

  /** The work-tree file the diff is showing, if that is what it is showing. */
  const workingFile = useMemo(
    () =>
      view.mode === 'worktree' && selectedFile
        ? (status?.files.find((f) => f.path === selectedFile) ?? null)
        : null,
    [view, selectedFile, status]
  )

  /**
   * Which way staging goes for the diff on screen — and whether it can be
   * offered at all. It cannot when the diff is not exactly one tracked file's
   * work (a whole work tree merges staged and unstaged changes, and the hunks
   * of a many-file diff are not numbered the way git numbers one file's), and
   * it must not when whitespace is being ignored: that diff does not hold
   * every change it would apply, so applying it would drop the rest silently.
   */
  const stageDirection: ApplyDirection | null = useMemo(() => {
    if (!workingFile || workingFile.untracked || viewingFile) return null
    if (diffOptions.ignoreWhitespace !== 'none') return null
    const side =
      sideOverride ?? (workingFile.worktree === ' ' && workingFile.index !== ' ' ? 'index' : 'worktree')
    return side === 'index' ? 'unstage' : 'stage'
  }, [workingFile, viewingFile, diffOptions, sideOverride])

  const applyPicks = useCallback(
    async (picks: HunkPick[]) => {
      if (!workingFile || !stageDirection) return
      setStaging(true)
      try {
        report(
          await window.gitty.git.applyHunks(
            root,
            workingFile.path,
            picks,
            stageDirection,
            diffOptions
          )
        )
      } finally {
        setStaging(false)
        void refresh()
      }
    },
    [root, workingFile, stageDirection, diffOptions, refresh, report]
  )

  const toggleStage = useCallback(
    async (path: string, staged: boolean) => {
      report(
        staged
          ? await window.gitty.git.unstageFile(root, path)
          : await window.gitty.git.stageFile(root, path)
      )
      void refresh()
    },
    [root, refresh, report]
  )

  const discardChanges = useCallback(
    async (path: string) => {
      report(await window.gitty.git.discardFile(root, path))
      void refresh()
    },
    [root, refresh, report]
  )

  const copyStagedDiff = useCallback(() => {
    void window.gitty.git.stagedDiff(root).then((text) => window.gitty.clipboard.write(text))
  }, [root])

  return {
    workingFile,
    stageDirection,
    staging,
    applyPicks,
    toggleStage,
    discardChanges,
    copyStagedDiff
  }
}
