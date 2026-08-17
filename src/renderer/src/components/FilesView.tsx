import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import type { CommitMeta } from '../../../shared/types'
import { parseQuery } from '../../../shared/query'
import type { View } from '../contextMenus'
import { paneControls } from '../panes'
import type { MenuState } from './ContextMenu'
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
  /** Browse the whole directory on disk — the other half of the title picker. */
  onBrowseWorkTree: () => void
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
  onBrowseWorkTree,
  setMenu,
  revForView
}: FilesViewProps): JSX.Element {
  const { msg } = useMsg()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [treeFilterOpen, setTreeFilterOpen] = useState(false)
  const [treeFilter, setTreeFilter] = useState('')
  // Which of the two the header button opens. They ask different questions —
  // git grep over the repository, or the paths in front of you — but they are
  // the same gesture, so one button carries both and the arrow beside it says
  // which. The last one used stays chosen, so the common case is one click.
  const [findMode, setFindMode] = useState<'search' | 'filter'>('search')
  // The box takes a query, not a bare pattern — `foo in:*.py` — and the same
  // parse main will run decides whether there is a term in it at all.
  const searchable = useMemo(() => parseQuery(searchText).include.length > 0, [searchText])
  const treeFilterRef = useRef<HTMLInputElement>(null)
  const filesBodyRef = useRef<HTMLDivElement>(null)

  // Only one strip at a time: they stack above the same list, and the button
  // that opens them can only be on or off about one of them.
  const openFilter = (): void => {
    setFindMode('filter')
    setSearchOpen(false)
    setTreeFilterOpen(true)
    // A second Ctrl+F selects what is in the box, so the next thing typed
    // replaces it — as it does in a browser.
    requestAnimationFrame(() => {
      treeFilterRef.current?.focus()
      treeFilterRef.current?.select()
    })
  }

  const openSearch = (): void => {
    setFindMode('search')
    setTreeFilterOpen(false)
    setTreeFilter('')
    setSearchOpen(true)
  }

  // Both strips belong to one tree: neither a filter over these paths nor a
  // search of this revision is an answer about the next one.
  useEffect(() => {
    setTreeFilterOpen(false)
    setTreeFilter('')
    setSearchOpen(false)
  }, [treeKey])

  const emptyText =
    view.mode === 'worktree'
      ? msg.files.emptyChanges
      : view.mode === 'snapshot' && view.hash === null
        ? msg.files.emptyWorktree
        : view.mode === 'snapshot'
          ? msg.files.emptySnapshot
          : msg.files.emptyDiff

  // Changes and Working Tree are the two standing views of this pane — one is
  // what is uncommitted, the other the whole directory on disk — and the title
  // already names whichever is on screen, so it is also where they are swapped.
  const openViewMenu = (e: { currentTarget: HTMLElement }): void => {
    const r = e.currentTarget.getBoundingClientRect()
    const onChanges = view.mode === 'worktree'
    const onWorkTree = view.mode === 'snapshot' && view.hash === null
    setMenu({
      x: r.left,
      y: r.bottom,
      items: [
        {
          label: msg.files.changesTitle,
          accel: onChanges ? '✓' : undefined,
          title: msg.files.changesHint,
          action: onBackToWorkTree
        },
        {
          label: msg.files.workingTreeTitle,
          accel: onWorkTree ? '✓' : undefined,
          title: msg.files.workingTreeHint,
          action: onBrowseWorkTree
        }
      ]
    })
  }

  return (
    <div className={paneClass}>
      <div className="pane-header" onDoubleClick={onDoubleClick}>
        {header.full}
        <Tooltip
          className="title"
          lines={[
            { key: 'click', desc: msg.files.viewPickTitle },
            { key: 'right-click', desc: msg.log.tooltipMore },
            ...paneControls('files', msg)
          ]}
        >
          {/* A button, so double-clicking the title no longer reaches the
              header's full-screen handler — the rest of the header still
              does, and the tooltip says what the click here is for. */}
          <button className="toggle title-pick" onClick={openViewMenu}>
            <span className="title-pick-label">{title}</span>▾
          </button>
        </Tooltip>
        <span className="spacer" />
        {/* Searching is about the whole repository, so it belongs to the pane
            that lists it — and it follows the revision on screen rather than
            always asking about the disk. Filtering the list is the near
            neighbour of that question, so it shares the button: the label is
            whichever is chosen, the arrow changes it. */}
        <span className="split-button">
          <button
            className={`toggle${(findMode === 'search' ? searchOpen : treeFilterOpen) ? ' on' : ''}`}
            title={findMode === 'search' ? msg.files.searchTitle : msg.files.filterTitle}
            onClick={() => {
              if (findMode === 'search') {
                if (searchOpen) setSearchOpen(false)
                else openSearch()
              } else if (treeFilterOpen) {
                setTreeFilterOpen(false)
                setTreeFilter('')
              } else openFilter()
            }}
          >
            {findMode === 'search' ? msg.files.search : msg.files.filter}
          </button>
          <button
            className="toggle split-arrow"
            title={msg.files.findModeTitle}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              setMenu({
                x: r.left,
                y: r.bottom,
                items: [
                  {
                    label: msg.files.search,
                    accel: findMode === 'search' ? '✓' : undefined,
                    title: msg.files.searchTitle,
                    action: openSearch
                  },
                  {
                    label: msg.files.filter,
                    accel: findMode === 'filter' ? '✓' : undefined,
                    title: msg.files.filterTitle,
                    action: openFilter
                  }
                ]
              })
            }}
          >
            ▾
          </button>
        </span>
        {/* Browsing the whole directory is the title picker's other half, so
            the way back out of it is the picker too — a second control saying
            the same thing would only crowd the header. A commit, a range or a
            revision's snapshot keeps the button. */}
        {view.mode !== 'worktree' && !(view.mode === 'snapshot' && view.hash === null) && (
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
              // the view behind it. A query that only limits the paths
              // (`in:*.py`) has nothing to look for, so Enter leaves the box
              // open and the strip says so rather than reporting no match.
              if (e.key === 'Enter' && searchText.trim() && searchable) {
                e.stopPropagation()
                onSearch(searchText.trim())
              } else if (e.key === 'Escape') {
                e.stopPropagation()
                setSearchOpen(false)
              }
            }}
          />
          <span className="log-filter-busy">
            {!searchable
              ? msg.files.searchNeedsTerm
              : revForView()
                ? msg.files.searchInRevision((revForView() as string).slice(0, 8))
                : msg.files.searchInWorktree}
          </span>
          <button
            className="log-filter-clear"
            title={msg.files.searchClear}
            onClick={() => setSearchOpen(false)}
          >
            ✕
          </button>
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
            // before it gets there. It is the filter's key wherever the button
            // is left, and leaves the button on the filter afterwards.
            e.preventDefault()
            e.stopPropagation()
            openFilter()
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
