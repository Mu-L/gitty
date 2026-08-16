import type { Dispatch, JSX, RefObject, SetStateAction } from 'react'
import { useMsg } from '../locale'
import type { DiffSide, WorkingFile } from '../../../shared/types'
import type { View } from '../contextMenus'
import type { FileDocState } from '../nav'
import { paneControls } from '../panes'
import { isHtmlPath, isImagePath, isMarkdownPath } from '../paths'
import { type CollapseState, type DiffPaneHandle, type DiffView } from './DiffPane'
import { Tooltip } from './Tooltip'

export interface DiffHeaderProps {
  view: View
  diffTitle: string
  selectedFile: string | null
  workingFile: WorkingFile | null
  viewingFile: boolean
  previewing: boolean
  outlineable: boolean
  doc: FileDocState | null
  docs: FileDocState[]
  activeDoc: string | null
  wrap: boolean
  diffView: DiffView
  mdOutline: boolean
  collapseState: CollapseState
  diffRef: RefObject<DiffPaneHandle | null>
  sideOverride: DiffSide | null
  setWrap: Dispatch<SetStateAction<boolean>>
  setDiffView: Dispatch<SetStateAction<DiffView>>
  setMdOutline: Dispatch<SetStateAction<boolean>>
  setSelectedFile: Dispatch<SetStateAction<string | null>>
  setActiveDoc: Dispatch<SetStateAction<string | null>>
  setSideOverride: Dispatch<SetStateAction<DiffSide | null>>
  onTogglePreview: () => void
  openFileDoc: (path: string) => void
  closeDoc: (id: string) => void
  /** The pane-chrome buttons, rendered by the tab so their state stays there. */
  header: { full: JSX.Element; hide: JSX.Element | null }
  onDoubleClick: (e: { target: EventTarget | null }) => void
}

/**
 * The diff pane's header: the button set above the diff, and the document-tab
 * strip beside the diff itself. Dense, but a plain display layer — every
 * decision here is read off props from RepoTab, which keeps the coordination
 * (which document is active, what previewing means for the two faces of the
 * preview button) to itself.
 */
export function DiffHeader({
  view,
  diffTitle,
  selectedFile,
  workingFile,
  viewingFile,
  previewing,
  outlineable,
  doc,
  docs,
  activeDoc,
  wrap,
  diffView,
  mdOutline,
  collapseState,
  diffRef,
  sideOverride,
  setWrap,
  setDiffView,
  setMdOutline,
  setSelectedFile,
  setActiveDoc,
  setSideOverride,
  onTogglePreview,
  openFileDoc,
  closeDoc,
  header,
  onDoubleClick
}: DiffHeaderProps): JSX.Element {
  const { msg } = useMsg()
  return (
    <>
      <div className="pane-header" onDoubleClick={onDoubleClick}>
        {header.full}
        {/* Tooltips live on the individual parts: a title on the header itself
            would show up under every button that has none of its own. */}
        <Tooltip
          className="title"
          lines={[{ key: '', desc: diffTitle }, ...paneControls('diff', msg)]}
        >
          {diffTitle}
        </Tooltip>
        <span className="spacer" title={msg.diff.dblClickFullScreen} />
        {/* Only commit and range diffs have a "whole" to widen back to; a
            snapshot is always one file at a time. Always present for a commit
            or a range, lit when the whole diff is what is already on screen: a
            button that comes and goes is harder to find than one that stays. */}
        {view.mode !== 'snapshot' && (
          <button
            className={`toggle${selectedFile ? '' : ' on'}`}
            title={
              selectedFile
                ? view.mode === 'worktree'
                  ? msg.diff.widenWorktree
                  : msg.diff.widenCommit
                : view.mode === 'worktree'
                  ? msg.diff.allShown
                  : msg.diff.allCommitShown
            }
            onClick={() => {
              setActiveDoc(null)
              setSelectedFile(null)
            }}
          >
            {msg.diff.showWholeDiff}
          </button>
        )}
        {/* Which side of the index this file is being read from. Only where
            both sides hold something: with one of them empty the diff already
            says which it is. */}
        {workingFile &&
          !viewingFile &&
          workingFile.index !== ' ' &&
          workingFile.worktree !== ' ' && (
            <div className="seg">
              {(['worktree', 'index'] as const).map((side) => (
                <button
                  key={side}
                  className={`toggle${(sideOverride ?? 'worktree') === side ? ' on' : ''}`}
                  title={
                    side === 'worktree' ? msg.diff.sideUnstagedTitle : msg.diff.sideStagedTitle
                  }
                  onClick={() => setSideOverride(side)}
                >
                  {side === 'worktree' ? msg.diff.sideUnstaged : msg.diff.sideStaged}
                </button>
              ))}
            </div>
          )}
        {selectedFile && view.mode !== 'snapshot' && !viewingFile && (
          <button
            className="toggle"
            title={
              isMarkdownPath(selectedFile)
                ? msg.diff.previewTitle
                : isHtmlPath(selectedFile)
                  ? msg.diff.htmlPreviewTitle
                  : isImagePath(selectedFile)
                    ? msg.diff.viewImageTitle
                    : msg.diff.viewFileTitle
            }
            onClick={() => openFileDoc(selectedFile)}
          >
            {isMarkdownPath(selectedFile) || isHtmlPath(selectedFile)
              ? msg.diff.preview
              : isImagePath(selectedFile)
                ? msg.diff.viewImage
                : msg.diff.viewFile}
          </button>
        )}
        {viewingFile &&
          doc &&
          (isMarkdownPath(doc.path) || isHtmlPath(doc.path)) && (
            <button
              className={`toggle${previewing ? ' on' : ''}`}
              title={
                isHtmlPath(doc.path)
                  ? previewing
                    ? msg.diff.htmlSourceTitle
                    : msg.diff.htmlPreviewTitle
                  : previewing
                    ? msg.diff.markdownSourceTitle
                    : msg.diff.renderMarkdownTitle
              }
              onClick={onTogglePreview}
            >
              {msg.diff.preview}
            </button>
          )}
        {!viewingFile && collapseState.files > 1 && (
          <button
            className="toggle"
            title={
              collapseState.allCollapsed ? msg.diff.expandAllTitle : msg.diff.collapseAllTitle
            }
            onClick={() => diffRef.current?.toggleAll()}
          >
            {collapseState.allCollapsed ? msg.diff.expandAll : msg.diff.collapseAll}
          </button>
        )}
        {/* An image has no lines to wrap. */}
        {!(doc && isImagePath(doc.path)) && (
          <button
            className={`toggle${wrap ? ' on' : ''}`}
            title={previewing ? msg.diff.wrapCode : msg.diff.wrapLong}
            onClick={() => setWrap((w) => !w)}
          >
            {msg.diff.wrap}
          </button>
        )}
        {(previewing || outlineable) && (
          <button
            className={`toggle${mdOutline ? ' on' : ''}`}
            title={previewing ? msg.diff.showOutline : msg.diff.showSymbols}
            onClick={() => setMdOutline((o) => !o)}
          >
            {msg.diff.outline}
          </button>
        )}
        {/* One switch, like Wrap: pressed is inline, raised is side by side. A
            label that renamed itself said the current state in the same place
            the other buttons say what they do. */}
        {!viewingFile && (
          <button
            className={`toggle${diffView === 'inline' ? ' on' : ''}`}
            title={diffView === 'inline' ? msg.diff.showSideBySide : msg.diff.showInline}
            onClick={() => setDiffView((v) => (v === 'inline' ? 'split' : 'inline'))}
          >
            {msg.diff.inline}
          </button>
        )}
        {header.hide}
      </div>
      {/* One strip per open document: the diff, then each opened file. Only
          shown once there is something to switch to. */}
      {docs.length > 0 && (
        <div className="doc-tabs">
          {view.mode !== 'snapshot' && (
            <div
              className={`doc-tab${activeDoc === null ? ' active' : ''}`}
              onClick={() => setActiveDoc(null)}
              title={msg.diff.docTabDiffTitle}
            >
              {msg.diff.docTabDiff}
            </div>
          )}
          {docs.map((d) => (
            <div
              key={d.id}
              className={`doc-tab${activeDoc === d.id ? ' active' : ''}`}
              onClick={() => setActiveDoc(d.id)}
              title={d.rev ? `${d.path} @ ${d.rev.slice(0, 8)}` : d.path}
            >
              {d.kind !== 'file' && (
                <span className="doc-kind">
                  {d.kind === 'blame'
                    ? msg.diff.docTabBlame
                    : d.kind === 'history'
                      ? msg.diff.docTabHistory
                      : d.kind === 'lines'
                        ? msg.diff.docTabLines
                        : msg.diff.docTabSearch}
                </span>
              )}
              <span className="doc-name">
                {d.kind === 'grep' ? d.path : d.path.split('/').pop()}
              </span>
              <span
                className="doc-close"
                title={msg.diff.docTabClose}
                onClick={(e) => {
                  e.stopPropagation()
                  closeDoc(d.id)
                }}
              >
                ×
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
