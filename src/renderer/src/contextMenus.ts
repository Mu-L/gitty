import type { Dispatch, SetStateAction } from 'react'
import type { Commit, DiffResult } from '../../shared/types'
import type { MenuItem, MenuState } from './components/ContextMenu'
import type { DiffView } from './components/DiffPane'
import { isMarkdownPath } from './paths'
import type { FileEntry } from './components/FilesPane'
import { msg } from './messages'

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
        label: msg.contextMenu.copySelection,
        accel: msg.contextMenu.copySelectionAccel,
        action: () => void window.gitty.clipboard.write(selection)
      })
    }
    if (viewingFile) {
      items.push({
        label: previewing ? msg.contextMenu.copyMarkdownSource : msg.contextMenu.copyFileContents,
        separatorBefore: items.length > 0,
        action: () => void window.gitty.clipboard.write(docSource ?? '')
      })
      items.push({
        label: wrap ? msg.contextMenu.disableWordWrap : msg.contextMenu.enableWordWrap,
        separatorBefore: true,
        action: () => setWrap((w) => !w)
      })
      if (previewing) {
        items.push({
          label: mdOutline ? msg.contextMenu.hideOutline : msg.contextMenu.showOutline,
          action: () => setMdOutline((o) => !o)
        })
      }
      // A snapshot has no diff to go back to.
      if (view.mode !== 'snapshot') {
        items.push({
          label: msg.contextMenu.showDiffInstead,
          action: () => setActiveDoc(null)
        })
      }
    } else {
      items.push({
        label: msg.contextMenu.copyWholeDiff,
        separatorBefore: items.length > 0,
        action: () => void window.gitty.clipboard.write(diff?.patch ?? '')
      })
      if (selectedFile) {
        items.push({
          label: isMarkdownPath(selectedFile) ? msg.contextMenu.previewMarkdown : msg.contextMenu.viewFile,
          separatorBefore: true,
          action: () => openFileDoc(selectedFile)
        })
      }
      items.push({
        label: wrap ? msg.contextMenu.disableWordWrap : msg.contextMenu.enableWordWrap,
        separatorBefore: !selectedFile,
        action: () => setWrap((w) => !w)
      })
      items.push({
        label: wordDiff ? msg.contextMenu.disableWordHighlight : msg.contextMenu.enableWordHighlight,
        action: () => setWordDiff((w) => !w)
      })
      items.push({
        label: diffView === 'inline' ? msg.contextMenu.sideBySideView : msg.contextMenu.inlineView,
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
          label: msg.contextMenu.openInNewTab(name),
          accel: msg.contextMenu.openInNewTabAccel,
          action: () => openFileDoc(path)
        },
        {
          label: msg.contextMenu.selectInFileList,
          action: () => setSelectedFile(path)
        },
        {
          label: msg.contextMenu.copyRelativePath,
          separatorBefore: true,
          action: () => void window.gitty.clipboard.write(path)
        },
        { label: msg.contextMenu.copyAbsolutePath, action: () => void window.gitty.clipboard.write(absPath) },
        { label: msg.contextMenu.copyFileName, action: () => void window.gitty.clipboard.write(name) },
        // Only meaningful for the file as it is on disk right now.
        ...(rev
          ? []
          : [
              {
                label: msg.contextMenu.openInSystemApp,
                separatorBefore: true,
                action: () => void window.gitty.file.open(absPath)
              },
              {
                label: msg.contextMenu.revealInFileManager,
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
        label: msg.contextMenu.viewFile,
        accel: msg.contextMenu.viewFileAccel,
        action: () => {
          setSelectedFile(entry.path)
          openFileDoc(entry.path)
        }
      }
    ]
    if (snapshot && view.mode === 'snapshot') {
      items.push({
        label: msg.contextMenu.openInSystemApp,
        action: () => void window.gitty.git.snapshotOpen(root, view.hash, rel)
      })
    } else {
      items.push(
        { label: msg.contextMenu.openInSystemApp, action: () => void window.gitty.file.open(entry.absPath) },
        { label: msg.contextMenu.revealInFileManager, action: () => void window.gitty.file.reveal(entry.absPath) }
      )
    }
    items.push({
      label: msg.contextMenu.copyRelativePath,
      separatorBefore: items.length > 0,
      action: () => void window.gitty.clipboard.write(rel)
    })
    items.push({ label: msg.contextMenu.copyAbsolutePath, action: () => void window.gitty.clipboard.write(entry.absPath) })
    items.push({
      label: msg.contextMenu.copyFileName,
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
      { label: msg.contextMenu.showCommitDiff, accel: msg.contextMenu.showCommitDiffAccel, action: () => showCommit(c) },
      {
        label: msg.contextMenu.copyCommitHash,
        separatorBefore: true,
        action: () => void window.gitty.clipboard.write(c.hash)
      },
      { label: msg.contextMenu.copyShortHash, action: () => void window.gitty.clipboard.write(c.short) },
      { label: msg.contextMenu.copySubject, action: () => void window.gitty.clipboard.write(c.subject) },
      {
        label: msg.contextMenu.openInBrowser,
        separatorBefore: true,
        action: openInBrowser
      },
      { label: msg.contextMenu.copyCommitUrl, action: copyUrl },
      {
        label: msg.contextMenu.browseSnapshot,
        separatorBefore: true,
        action: () => showSnapshot(c)
      }
    ]
    if (selectedCommit && selectedCommit !== c.hash) {
      items.push({
        label: msg.contextMenu.diffAgainstSelected,
        accel: msg.contextMenu.diffAgainstAccel,
        separatorBefore: true,
        action: () => onSelectCommit(c.hash, true)
      })
    }
    setMenu({ ...at, items })
  }

  return { diffMenu, diffFileMenu, fileMenu, commitMenu }
}
