/**
 * Shared interfaces for the i18n message tables.
 *
 * Both `MainMessages` and `RendererMessages` are plain objects whose leaves are
 * either static strings or arrow functions that take typed parameters and return
 * a string. There is no runtime interpolation — the compiler checks every call
 * site, so a missing key or a wrong parameter type is a typecheck error.
 */

// ── Main process ────────────────────────────────────────────────────────────

export interface MainMessages {
  readonly menu: {
    readonly file: string
    readonly openRepo: string
    readonly settings: string
    readonly view: string
  }
  readonly dialog: {
    readonly openRepoTitle: string
    readonly notARepo: string
    readonly notInsideWorkTree: (path: string) => string
  }
  readonly window: {
    readonly title: string
  }
  readonly git: {
    readonly workingTree: string
    readonly diffTruncated: string
    readonly untrackedOmitted: (n: number) => string
    readonly notAnImage: string
    readonly imageTooLarge: string
    readonly done: string
    readonly gitFailed: string
    readonly pathEscapesRepo: string
    readonly changesCount: (n: number) => string
    /** Parenthetical labels used in diff titles. */
    readonly untrackedLabel: string
    readonly stagedLabel: string
    readonly unstagedLabel: string
  }
  /** The optional gource companion; only ever seen when it goes wrong. */
  readonly gource: {
    readonly failed: string
    readonly notInstalled: string
  }
}

// ── Renderer process ────────────────────────────────────────────────────────

export interface RendererMessages {
  readonly app: {
    readonly title: string
    readonly settings: string
    readonly openRepository: string
    readonly refresh: string
    readonly panes: string
    readonly noRepo: string
    readonly noReposOpen: string
    readonly recentlyOpened: string
    readonly showHidePanes: string
    readonly changesCount: (n: number) => string
    readonly notInWorkTree: (path: string) => string
    readonly notInWorkTreeHint: (path: string) => string
  }
  readonly tab: {
    readonly uncommittedChanges: (path: string) => string
    readonly closeRepository: string
    readonly openAnotherRepo: string
  }
  readonly recent: {
    readonly noOtherRepos: string
    readonly openRepoEllipsis: string
    readonly clearRecent: string
    /** Hover tip for a recent-repo entry. */
    readonly tooltip: string
    readonly accelOpen: string
  }
  /** The back / forward buttons and the browsing-history menu. */
  readonly nav: {
    readonly backTitle: string
    readonly forwardTitle: string
    readonly historyTitle: string
    readonly noHistory: string
    /** A place, as the menu lists it. */
    readonly worktree: string
    readonly worktreeFile: (path: string) => string
    readonly commit: (short: string, subject: string) => string
    readonly commitFile: (path: string, short: string) => string
    readonly snapshot: (short: string, subject: string) => string
    readonly snapshotFile: (path: string, short: string) => string
    readonly range: (from: string, to: string) => string
    readonly rangeFile: (path: string, from: string, to: string) => string
    /** Wrappers for a blame or file-history document. */
    readonly blame: (label: string) => string
    readonly fileHistory: (label: string) => string
  }
  readonly branch: {
    readonly noBranchesYet: string
    readonly backTo: (branch: string) => string
    readonly browseHint: string
    readonly headLabel: string
  }
  readonly files: {
    readonly workingTreeTitle: string
    readonly commitTitle: (short: string, subject: string) => string
    readonly snapshotTitle: (short: string, subject: string) => string
    readonly rangeTitle: (from: string, to: string) => string
    readonly backToWorkTree: string
    /** The empty text shown in the work-tree pane. */
    readonly emptyWorktree: string
    readonly emptySnapshot: string
    readonly emptyDiff: string
    /** Suffix displayed after a file name, e.g. "142 lines". */
    readonly lines: (n: number) => string
  }
  readonly diff: {
    readonly titleFallback: string
    readonly errorTitle: string
    readonly emptyWorktree: string
    readonly emptySnapshot: string
    readonly emptyDiff: string
    /** The empty text shown when blame has no lines to attribute. */
    readonly emptyBlame: string
    /** The empty text shown when a file has no commit history. */
    readonly emptyHistory: string
    readonly showWholeDiff: string
    readonly allShown: string
    readonly allCommitShown: string
    readonly widenWorktree: string
    readonly widenCommit: string
    readonly preview: string
    readonly viewImage: string
    readonly viewFile: string
    readonly previewTitle: string
    readonly viewImageTitle: string
    readonly viewFileTitle: string
    readonly markdownSourceTitle: string
    readonly renderMarkdownTitle: string
    readonly expandAll: string
    readonly collapseAll: string
    readonly expandAllTitle: string
    readonly collapseAllTitle: string
    readonly wrap: string
    readonly wrapLong: string
    readonly wrapCode: string
    readonly outline: string
    readonly showOutline: string
    readonly inline: string
    readonly sideBySide: string
    readonly switchView: string
    readonly docTabDiff: string
    readonly docTabDiffTitle: string
    readonly docTabClose: string
    /** Small labels on the doc tabs for blame / file-history documents. */
    readonly docTabBlame: string
    readonly docTabHistory: string
    readonly dblClickFullScreen: string
    /** File heading tooltip in a collapsed multi-file diff. */
    readonly fileHeadingTooltip: (collapsed: boolean) => string
    /** "N more lines — scroll or click to load". */
    readonly loadMoreLines: (n: number) => string
  }
  readonly log: {
    readonly commits: string
    readonly worktreeRow: string
    readonly worktreeRowTitle: string
    readonly worktreeClean: string
    readonly worktreeUncommitted: (n: number) => string
    readonly noCommitsYet: string
    /** Filter box above the commit list. */
    readonly filterPlaceholder: string
    /** Shown when a filter matches nothing. */
    readonly noMatches: string
    /** Title of the button that clears the filter. */
    readonly clearFilter: string
    readonly browsingAnother: string
    readonly comparing2: string
    readonly openInBrowser: string
    readonly openRepoCommitsTitle: string
    /** The gource button, shown only where gource is installed. */
    readonly gource: string
    readonly gourceStarting: string
    readonly gourceTitle: string
    readonly clickToDismiss: string
    readonly now: string
    readonly placeholder: string
    /** Tooltip hint for navigation keys. */
    readonly keyMove: string
    readonly keyShow: string
    readonly keyCompare: string
    readonly keyWorktree: string
    /** Tooltip for the button that folds the commit-message body away. */
    readonly messageToggle: (collapsed: boolean) => string
    /** The suffix "views" paired with "dbl-click" key in FilesPane tooltip. */
    readonly tooltipViews: string
    readonly tooltipMore: string
  }
  readonly pushPull: {
    readonly push: string
    readonly pull: string
    readonly pushing: string
    readonly pulling: string
    readonly pushCount: (n: number) => string
    readonly pullCount: (n: number) => string
    readonly publishTitle: (branch: string) => string
    readonly pushAhead: (ahead: number, branch: string, upstream: string) => string
    readonly nothingToPush: (branch: string, upstream: string) => string
    readonly pullNoUpstream: (branch: string) => string
    readonly pullBehind: (branch: string, upstream: string, behind: number) => string
    readonly pullFastForward: (branch: string, upstream: string) => string
  }
  readonly settings: {
    readonly title: string
    readonly close: string
    readonly appearance: string
    readonly view: string
    readonly theme: string
    readonly dark: string
    readonly light: string
    readonly fontSize: string
    readonly rowHeight: string
    readonly diffLayout: string
    readonly inline: string
    readonly sideBySide: string
    readonly wordWrap: string
    readonly wordHighlight: string
    readonly markdownOutline: string
    readonly language: string
    readonly restoreDefaults: string
    readonly done: string
  }
  readonly contextMenu: {
    // diff area
    readonly copySelection: string
    readonly copySelectionAccel: string
    readonly copyMarkdownSource: string
    readonly copyFileContents: string
    readonly copyWholeDiff: string
    readonly enableWordWrap: string
    readonly disableWordWrap: string
    readonly enableWordHighlight: string
    readonly disableWordHighlight: string
    readonly showOutline: string
    readonly hideOutline: string
    readonly showDiffInstead: string
    readonly inlineView: string
    readonly sideBySideView: string
    readonly previewMarkdown: string
    readonly viewFile: string
    // file heading inside a diff
    readonly openInNewTab: (name: string) => string
    readonly openInNewTabAccel: string
    readonly selectInFileList: string
    readonly copyRelativePath: string
    readonly copyAbsolutePath: string
    readonly copyFileName: string
    readonly openInSystemApp: string
    readonly revealInFileManager: string
    // file tree
    readonly viewFileAccel: string
    // commit log
    readonly showCommitDiff: string
    readonly showCommitDiffAccel: string
    readonly copyCommitHash: string
    readonly copyShortHash: string
    readonly copySubject: string
    readonly openInBrowser: string
    readonly copyCommitUrl: string
    readonly browseSnapshot: string
    readonly diffAgainstSelected: string
    readonly diffAgainstAccel: string
    // file tree — per-file questions, both open a document in the diff pane
    readonly blameFile: string
    readonly fileHistory: string
    // worktree row in commit log
    readonly browseWorktree: string
  }
  readonly paneChrome: {
    /** The four pane names used as labels throughout the UI. */
    readonly paneLabelFiles: string
    readonly paneLabelDiff: string
    readonly restoreLayout: (fullAccel: string) => string
    readonly fillWindow: (fullAccel: string) => string
    readonly hidePane: (accel: string) => string
    readonly hidePaneTerminal: (accel: string) => string
    /** The Panes menu entries. */
    readonly showPane: (label: string) => string
    readonly hidePaneMenu: (label: string) => string
    readonly showAllPanes: string
    /** The tooltip line descriptions for pane controls. */
    readonly hidesThisPane: string
    readonly fillsTheWindow: string
    readonly dblClickToggles: string
  }
  readonly terminal: {
    readonly title: string
    readonly starting: string
    readonly shellExited: (exitCode: number) => string
    readonly closeTerminal: string
    readonly splitRight: string
    readonly splitRightTitle: string
    readonly splitDown: string
    readonly splitDownTitle: string
    readonly shellsKeepRunning: string
  }
  readonly common: {
    readonly loading: string
    readonly binaryOrOversized: string
  }
  readonly time: {
    readonly today: string
    readonly yesterday: string
    readonly daysAgo: (n: number) => string
    readonly monthsAgo: (n: number) => string
    readonly yearsAgo: (n: number) => string
  }
  readonly image: {
    readonly loading: string
    readonly clickToFit: string
    readonly clickForActualSize: string
  }
}
