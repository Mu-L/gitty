import { useEffect, useRef, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import type { CommitMeta } from '../../../shared/types'
import type { View } from '../contextMenus'
import { paneControls } from '../panes'
import type { MenuItem, MenuState } from './ContextMenu'
import { CommitInfo } from './CommitInfo'
import { FilesPane, matchesFilter, type FileEntry } from './FilesPane'
import { Tooltip } from './Tooltip'

export interface FilesViewProps {
  view: View
  title: string
  viewFiles: FileEntry[]
  naturalSort: boolean
  selectedFile: string | null
  /** The tree being listed; both the collapsed set and the filter belong to it. */
  treeKey: string
  commitMeta: CommitMeta | null
  /** `pane` + full-screen suffix, computed by the tab. */
  paneClass: string
  /** The pane-chrome buttons, rendered by the tab so their state stays there. */
  header: { full: JSX.Element; hide: JSX.Element | null }
  onDoubleClick: (e: { target: EventTarget | null }) => void
  onSelect: (path: string) => void
  onOpen: (path: string) => void
  onMenu: (entry: FileEntry, state: MenuState) => void
  onToggleStage: (entry: FileEntry) => void
  onSearch: (pattern: string) => void
  onBackToWorkTree: () => void
  sendToAgent: (pick?: string) => void
  agentItems: (list: string[]) => MenuItem[]
  agentCommands: string[]
  agentCommand: string
  setMenu: (m: MenuState | null) => void
  revForView: () => string | null
}

/**
 * The top-left pane: the file list for whatever the tab is looking at, with the
 * search and tree-filter strips above it. Those strips are the pane's own — a
 * pattern typed here belongs to this pane and this tree — so their state lives
 * here rather than in RepoTab, which only coordinates across panes.
 */
export function FilesView({
  view,
  title,
  viewFiles,
  naturalSort,
  selectedFile,
  treeKey,
  commitMeta,
  paneClass,
  header,
  onDoubleClick,
  onSelect,
  onOpen,
  onMenu,
  onToggleStage,
  onSearch,
  onBackToWorkTree,
  sendToAgent,
  agentItems,
  agentCommands,
  agentCommand,
  setMenu,
  revForView
}: FilesViewProps): JSX.Element {
  const { msg } = useMsg()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [treeFilterOpen, setTreeFilterOpen] = useState(false)
  const [treeFilter, setTreeFilter] = useState('')
  const treeFilterRef = useRef<HTMLInputElement>(null)
  const filesBodyRef = useRef<HTMLDivElement>(null)

  // Both the collapsed set and the filter belong to one tree: another commit's
  // files are not the ones that was typed against.
  useEffect(() => {
    setTreeFilterOpen(false)
    setTreeFilter('')
  }, [treeKey])

  const emptyText =
    view.mode === 'worktree' ||
    (view.mode === 'snapshot' && view.hash === null)
      ? msg.files.emptyWorktree
      : view.mode === 'snapshot'
        ? msg.files.emptySnapshot
        : msg.files.emptyDiff

  return (
    <div className={paneClass}>
      <div className="pane-header" onDoubleClick={onDoubleClick}>
        {header.full}
        <Tooltip
          className="title"
          lines={[
            { key: 'dbl-click', desc: msg.log.tooltipViews },
            { key: 'right-click', desc: msg.log.tooltipMore },
            ...paneControls('files', msg)
          ]}
        >
          {title}
        </Tooltip>
        <span className="spacer" />
        {/* The index is curated here, so this is where it is handed over. Only
            ever text into the shell below. */}
        {view.mode === 'worktree' && (
          <span className="split-button">
            <button
              className="toggle"
              title={msg.files.sendToAgentTitle(agentCommand)}
              onClick={() => sendToAgent()}
            >
              {msg.files.sendToAgent}
            </button>
            {/* Which agent to hand it to is a per-commit decision, so the
                whole choice lives here: the remembered commands and the box
                for one that is not remembered yet. */}
            <button
              className="toggle split-more"
              title={msg.files.agentCommandsTitle}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                setMenu({ x: r.left, y: r.bottom, items: agentItems(agentCommands) })
              }}
            >
              ▾
            </button>
          </span>
        )}
        {/* Searching is about the whole repository, so it belongs to the pane
            that lists it — and it follows the revision on screen rather than
            always asking about the disk. */}
        <button
          className={`toggle${searchOpen ? ' on' : ''}`}
          title={msg.files.searchTitle}
          onClick={() => setSearchOpen((o) => !o)}
        >
          {msg.files.search}
        </button>
        {view.mode !== 'worktree' && (
          <button onClick={onBackToWorkTree}>{msg.files.backToWorkTree}</button>
        )}
        {header.hide}
      </div>
      {searchOpen && (
        <div className="log-filter">
          <input
            type="text"
            autoFocus
            value={searchText}
            placeholder={msg.files.searchPlaceholder}
            spellCheck={false}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              // Enter runs it; Escape puts the box away without disturbing
              // the view behind it.
              if (e.key === 'Enter' && searchText.trim()) {
                e.stopPropagation()
                onSearch(searchText.trim())
              } else if (e.key === 'Escape') {
                e.stopPropagation()
                setSearchOpen(false)
              }
            }}
          />
          <span className="log-filter-busy">
            {revForView()
              ? msg.files.searchInRevision((revForView() as string).slice(0, 8))
              : msg.files.searchInWorktree}
          </span>
        </div>
      )}
      {treeFilterOpen && (
        <div className="log-filter">
          <input
            ref={treeFilterRef}
            type="text"
            value={treeFilter}
            placeholder={msg.files.filterPlaceholder}
            spellCheck={false}
            onChange={(e) => setTreeFilter(e.target.value)}
            onKeyDown={(e) => {
              // Escape puts the strip away and the whole tree back; the focus
              // goes where the arrow keys are read.
              if (e.key === 'Escape') {
                e.stopPropagation()
                setTreeFilterOpen(false)
                setTreeFilter('')
                filesBodyRef.current?.focus()
              }
            }}
          />
          <span className="log-filter-busy">
            {treeFilter === ''
              ? ''
              : msg.files.filterCount(
                  viewFiles.filter((f) => matchesFilter(f.path, treeFilter)).length,
                  viewFiles.length
                )}
          </span>
          <button
            className="log-filter-clear"
            title={msg.files.filterClear}
            onClick={() => {
              setTreeFilterOpen(false)
              setTreeFilter('')
            }}
          >
            ✕
          </button>
        </div>
      )}
      <div
        ref={filesBodyRef}
        className="pane-body"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            // Ctrl+F belongs to whichever view has the focus, and the document
            // search listens on the window — so this one stops the event
            // before it gets there.
            e.preventDefault()
            e.stopPropagation()
            setTreeFilterOpen(true)
            // A second Ctrl+F selects what is in the box, so the next thing
            // typed replaces it — as it does in a browser.
            requestAnimationFrame(() => {
              treeFilterRef.current?.focus()
              treeFilterRef.current?.select()
            })
          }
        }}
      >
        {commitMeta && <CommitInfo meta={commitMeta} />}
        <FilesPane
          entries={viewFiles}
          naturalSort={naturalSort}
          // A whole repository — browsing the work tree or a commit's
          // snapshot — opens shut: it is a tree to descend into, not a list
          // of changes to read.
          startCollapsed={view.mode === 'snapshot'}
          filter={treeFilterOpen ? treeFilter : ''}
          treeKey={treeKey}
          selected={selectedFile}
          onSelect={(f) => onSelect(f.path)}
          onOpen={(f) => onOpen(f.path)}
          onMenu={onMenu}
          onToggleStage={view.mode === 'worktree' ? onToggleStage : undefined}
          emptyText={emptyText}
        />
      </div>
    </div>
  )
}
