import type { Dispatch, SetStateAction } from 'react'
import type { Commit, DiffResult } from '../../shared/types'
import type { MenuItem, MenuState } from './components/ContextMenu'
import type { DiffView } from './components/DiffPane'
import { isMarkdownPath } from './components/FileDoc'
import type { FileEntry } from './components/FilesPane'

/**
 * What a repository session can show: the work tree, one commit, a range, or
 * the whole tree at a commit. The menus below only read it, but most of the
 * tab does too, so it lives with its owner and is imported back by RepoTab.
 */
export type View =
  | { mode: 'worktree' }
  | { mode: 'commit'; hash: string; short: string; subject: string }
  | { mode: 'range'; from: string; to: string }
  | { mode: 'snapshot'; hash: string; short: string; subject: string }

/**
 * Everything the four context-menu builders read from the repository session
 * that owns them. Passed as one object so the builders stay plain functions of
 * their inputs rather than closures over the whole tab.
 */
export interface ContextMenuDeps {
  root: string
  view: View
  /** Whether a file document is open beside the diff. */
  viewingFile: boolean
  /** That document is a markdown preview, not source. */
  previewing: boolean
  docSource: string | null
  wrap: boolean
  setWrap: Dispatch<SetStateAction<boolean>>
  mdOutline: boolean
  setMdOutline: Dispatch<SetStateAction<boolean>>
  wordDiff: boolean
  setWordDiff: Dispatch<SetStateAction<boolean>>
  diffView: DiffView
  setDiffView: Dispatch<SetStateAction<DiffView>>
  diff: DiffResult | null
  selectedFile: string | null
  selectedCommit: string | null
  openFileDoc: (path: string) => void
  showCommit: (c: Commit) => void
  showSnapshot: (c: Commit) => void
  onSelectCommit: (hash: string, additive: boolean) => void
  revForView: () => string | null
  setSelectedFile: Dispatch<SetStateAction<string | null>>
  setActiveDoc: Dispatch<SetStateAction<string | null>>
  setMenu: (state: MenuState) => void
}

/** The four context-menu builders, in one factory so RepoTab calls it once. */
export function createContextMenus(deps: ContextMenuDeps): {
  diffMenu: (at: MenuState) => void
  diffFileMenu: (path: string, at: MenuState) => void
  fileMenu: (entry: FileEntry, at: MenuState) => void
  commitMenu: (c: Commit, at: MenuState) => void
} {
  const {
    root,
    view,
    viewingFile,
    previewing,
    docSource,
    wrap,
    setWrap,
    mdOutline,
    setMdOutline,
    wordDiff,
    setWordDiff,
    diffView,
    setDiffView,
    diff,
    selectedFile,
    selectedCommit,
    openFileDoc,
    showCommit,
    showSnapshot,
    onSelectCommit,
    revForView,
    setSelectedFile,
    setActiveDoc,
    setMenu
  } = deps

  const diffMenu = (at: MenuState): void => {
    const selection = window.getSelection()?.toString() ?? ''
    const items: MenuItem[] = []
    if (selection) {
      items.push({
        label: 'Copy Selection',
        accel: 'Ctrl+C',
        action: () => void window.gitty.clipboard.write(selection)
      })
    }
    if (viewingFile) {
      items.push({
        label: previewing ? 'Copy Markdown Source' : 'Copy File Contents',
        separatorBefore: items.length > 0,
        action: () => void window.gitty.clipboard.write(docSource ?? '')
      })
      items.push({
        label: wrap ? 'Disable Word Wrap' : 'Enable Word Wrap',
        separatorBefore: true,
        action: () => setWrap((w) => !w)
      })
      if (previewing) {
        items.push({
          label: mdOutline ? 'Hide Outline' : 'Show Outline',
          action: () => setMdOutline((o) => !o)
        })
      }
      // A snapshot has no diff to go back to.
      if (view.mode !== 'snapshot') {
        items.push({
          label: 'Show Diff Instead',
          action: () => setActiveDoc(null)
        })
      }
    } else {
      items.push({
        label: 'Copy Whole Diff',
        separatorBefore: items.length > 0,
        action: () => void window.gitty.clipboard.write(diff?.patch ?? '')
      })
      if (selectedFile) {
        items.push({
          label: isMarkdownPath(selectedFile) ? 'Preview Markdown' : 'View File',
          separatorBefore: true,
          action: () => openFileDoc(selectedFile)
        })
      }
      items.push({
        label: wrap ? 'Disable Word Wrap' : 'Enable Word Wrap',
        separatorBefore: !selectedFile,
        action: () => setWrap((w) => !w)
      })
      items.push({
        label: wordDiff ? 'Disable Word Highlight' : 'Enable Word Highlight',
        action: () => setWordDiff((w) => !w)
      })
      items.push({
        label: diffView === 'inline' ? 'Side-by-Side View' : 'Inline View',
        action: () => setDiffView((v) => (v === 'inline' ? 'split' : 'inline'))
      })
    }
    setMenu({ ...at, items })
  }

  /** Right-click on a file heading inside a diff. */
  const diffFileMenu = (path: string, at: MenuState): void => {
    const name = path.split('/').pop() ?? path
    const rev = revForView()
    const absPath = `${root}/${path}`
    setMenu({
      ...at,
      items: [
        {
          label: `Open ${name} in a New Tab`,
          accel: 'Ctrl+click',
          action: () => openFileDoc(path)
        },
        {
          label: 'Select in the File List',
          action: () => setSelectedFile(path)
        },
        {
          label: 'Copy Relative Path',
          separatorBefore: true,
          action: () => void window.gitty.clipboard.write(path)
        },
        { label: 'Copy Absolute Path', action: () => void window.gitty.clipboard.write(absPath) },
        { label: 'Copy File Name', action: () => void window.gitty.clipboard.write(name) },
        // Only meaningful for the file as it is on disk right now.
        ...(rev
          ? []
          : [
              {
                label: 'Open in System App',
                separatorBefore: true,
                action: () => void window.gitty.file.open(absPath)
              },
              {
                label: 'Reveal in File Manager',
                action: () => void window.gitty.file.reveal(absPath)
              }
            ])
      ]
    })
  }

  const fileMenu = (entry: FileEntry, at: MenuState): void => {
    const rel = entry.path
    // Snapshot entries carry a virtual absPath; opening must go through the
    // snapshot temp file, and "Reveal" has nothing to reveal on disk.
    const snapshot = entry.absPath.startsWith('gitty:snapshot:')
    const items: MenuItem[] = [
      {
        label: 'View File',
        accel: 'Double click',
        action: () => {
          setSelectedFile(entry.path)
          openFileDoc(entry.path)
        }
      }
    ]
    if (snapshot && view.mode === 'snapshot') {
      items.push({
        label: 'Open in System App',
        action: () => void window.gitty.git.snapshotOpen(root, view.hash, rel)
      })
    } else {
      items.push(
        { label: 'Open in System App', action: () => void window.gitty.file.open(entry.absPath) },
        { label: 'Reveal in File Manager', action: () => void window.gitty.file.reveal(entry.absPath) }
      )
    }
    items.push({
      label: 'Copy Relative Path',
      separatorBefore: items.length > 0,
      action: () => void window.gitty.clipboard.write(rel)
    })
    items.push({ label: 'Copy Absolute Path', action: () => void window.gitty.clipboard.write(entry.absPath) })
    items.push({
      label: 'Copy File Name',
      action: () => void window.gitty.clipboard.write(rel.split('/').pop() ?? rel)
    })
    setMenu({ ...at, items })
  }

  const commitMenu = (c: Commit, at: MenuState): void => {
    // The local web server renders this commit for the system browser; the
    // URL is only meaningful while the repo stays open, so it is fetched at
    // click time rather than stashed.
    const openInBrowser = (): void => {
      void window.gitty.web.commitUrl(root, c.hash).then((url) => {
        if (url) void window.gitty.file.openExternal(url)
      })
    }
    const copyUrl = (): void => {
      void window.gitty.web.commitUrl(root, c.hash).then((url) => {
        if (url) void window.gitty.clipboard.write(url)
      })
    }
    const items: MenuItem[] = [
      { label: 'Show Commit Diff', accel: 'Enter', action: () => showCommit(c) },
      {
        label: 'Copy Commit Hash',
        separatorBefore: true,
        action: () => void window.gitty.clipboard.write(c.hash)
      },
      { label: 'Copy Short Hash', action: () => void window.gitty.clipboard.write(c.short) },
      { label: 'Copy Subject', action: () => void window.gitty.clipboard.write(c.subject) },
      {
        label: 'Open in Browser',
        separatorBefore: true,
        action: openInBrowser
      },
      { label: 'Copy Commit URL', action: copyUrl },
      {
        label: 'Browse Snapshot',
        separatorBefore: true,
        action: () => showSnapshot(c)
      }
    ]
    if (selectedCommit && selectedCommit !== c.hash) {
      items.push({
        label: 'Diff Against Selected',
        accel: 'Ctrl+Click',
        separatorBefore: true,
        action: () => onSelectCommit(c.hash, true)
      })
    }
    setMenu({ ...at, items })
  }

  return { diffMenu, diffFileMenu, fileMenu, commitMenu }
}
