import type { RendererMessages } from '../../../shared/messages'

export const de: RendererMessages = {
  app: {
    title: 'Gitty',
    settings: 'Einstellungen',
    openRepository: 'Repository öffnen',
    refresh: 'Aktualisieren',
    panes: 'Bereiche',
    noRepo: 'kein Repository',
    noReposOpen: 'Keine Repositories geöffnet.',
    recentlyOpened: 'Zuletzt geöffnete Repositories',
    showHidePanes: 'Bereiche ein- oder ausblenden',
    changesCount: (n: number) => `${n} geändert`,
    notInWorkTree: (path: string) =>
      `${path} liegt nicht in einem Git-Arbeitsverzeichnis.`,
    notInWorkTreeHint: (path: string) =>
      `${path} liegt nicht in einem Git-Arbeitsverzeichnis. Verwenden Sie „Repository öffnen“.`
  },
  tab: {
    uncommittedChanges: (path: string) => `${path} — nicht committete Änderungen`,
    closeRepository: 'Repository schließen',
    openAnotherRepo: 'Weiteres Repository öffnen'
  },
  recent: {
    noOtherRepos: 'Noch keine weiteren Repositories',
    openRepoEllipsis: 'Repository öffnen…',
    clearRecent: 'Liste leeren',
    tooltip:
      '\n\nKlicken, um in einem neuen Tab zu öffnen\nStrg+Klick, um in diesem Tab zu öffnen\nRechtsklick, um aus der Liste zu entfernen',
    accelOpen: 'Strg+O'
  },
  branch: {
    noBranchesYet: 'Noch keine Branches',
    backTo: (branch: string) => `Zurück zu ${branch}`,
    browseHint: 'Verlauf eines anderen Branches ansehen (nichts wird ausgecheckt)',
    headLabel: 'HEAD'
  },
  files: {
    workingTreeTitle: 'Arbeitsverzeichnis',
    commitTitle: (short: string, subject: string) =>
      `Commit ${short} — ${subject}`,
    snapshotTitle: (short: string, subject: string) =>
      `Snapshot ${short} — ${subject}`,
    rangeTitle: (from: string, to: string) =>
      `Bereich ${from.slice(0, 8)}..${to.slice(0, 8)}`,
    backToWorkTree: 'Zurück zum Arbeitsverzeichnis',
    emptyWorktree: 'Arbeitsverzeichnis ist sauber.',
    emptySnapshot: 'Keine Dateien in diesem Snapshot.',
    emptyDiff: 'Keine Dateien in diesem Diff.',
    lines: (n: number) => `${n} Zeilen`
  },
  diff: {
    titleFallback: 'Diff',
    errorTitle: 'Fehler',
    emptyWorktree: 'Arbeitsverzeichnis ist sauber.',
    emptySnapshot: 'Wählen Sie eine Datei, um sie zu diesem Commit anzusehen.',
    emptyDiff: 'Keine Textänderungen.',
    emptyBlame: 'Keine Zeilen zuzuordnen.',
    emptyHistory: 'Diese Datei hat noch keinen Verlauf.',
    showWholeDiff: 'Ganzen Diff anzeigen',
    allShown: 'Alle nicht committeten Änderungen werden angezeigt',
    allCommitShown: 'Alle Dateien dieses Commits werden angezeigt',
    widenWorktree: 'Diff wieder auf alle nicht committeten Änderungen ausweiten',
    widenCommit: 'Diff wieder auf alle Dateien dieses Commits ausweiten',
    preview: 'Vorschau',
    viewImage: 'Bild ansehen',
    viewFile: 'Datei ansehen',
    previewTitle: 'Diese Markdown-Datei gerendert neben dem Diff öffnen',
    viewImageTitle: 'Dieses Bild neben dem Diff anzeigen',
    viewFileTitle: 'Die ganze Datei neben dem Diff öffnen',
    markdownSourceTitle: 'Stattdessen den Markdown-Quelltext anzeigen',
    renderMarkdownTitle: 'Diese Markdown-Datei rendern',
    expandAll: 'Alle ausklappen',
    collapseAll: 'Alle einklappen',
    expandAllTitle: 'Alle Dateien ausklappen',
    collapseAllTitle: 'Alle Dateien auf ihren Namen einklappen',
    wrap: 'Umbruch',
    wrapLong: 'Lange Zeilen umbrechen',
    wrapCode: 'Codeblöcke und Tabellen umbrechen',
    outline: 'Gliederung',
    showOutline: 'Überschriften-Gliederung anzeigen',
    inline: 'Inline',
    sideBySide: 'Nebeneinander',
    switchView: 'Zwischen Inline- und Nebeneinander-Ansicht wechseln',
    docTabDiff: 'Diff',
    docTabDiffTitle: 'Der Diff',
    docTabClose: 'Schließen',
    docTabBlame: 'blame',
    docTabHistory: 'Verlauf',
    dblClickFullScreen: 'Doppelklick schaltet Vollbild um',
    fileHeadingTooltip: (collapsed: boolean) =>
      `\n\nKlicken zum ${collapsed ? 'Ausklappen' : 'Einklappen'}\nStrg+Klick öffnet in einem neuen Tab\nRechtsklick für mehr`,
    loadMoreLines: (n: number) => `${n} weitere Zeilen — scrollen oder klicken zum Laden`
  },
  log: {
    commits: 'Commits',
    worktreeRow: 'Arbeitsverzeichnis ',
    worktreeRowTitle: 'Nicht committete Änderungen im Arbeitsverzeichnis',
    worktreeClean: '(sauber)',
    worktreeUncommitted: (n: number) => `(${n} nicht committet)`,
    noCommitsYet: 'Noch keine Commits.',
    filterPlaceholder: 'Commits filtern…',
    noMatches: 'Keine passenden Commits',
    clearFilter: 'Filter löschen',
    browsingAnother: 'Anderer Branch wird angesehen',
    comparing2: '2 Commits werden verglichen',
    openInBrowser: 'Im Browser öffnen',
    openRepoCommitsTitle: 'Die Commits dieses Repositorys im Browser öffnen',
    clickToDismiss: 'Zum Schließen klicken',
    now: 'jetzt',
    placeholder: '—',
    keyMove: ' bewegen',
    keyShow: ' anzeigen',
    keyCompare: ' vergleichen',
    keyWorktree: ' Arbeitsverzeichnis',
    tooltipViews: ' Ansichten',
    tooltipMore: ' für mehr',
    messageToggle: (collapsed: boolean) =>
      collapsed
        ? 'Vollständige Commit-Nachricht anzeigen'
        : 'Vollständige Commit-Nachricht ausblenden'
  },
  pushPull: {
    push: 'Push',
    pull: 'Pull',
    pushing: 'Wird gepusht…',
    pulling: 'Wird geholt…',
    pushCount: (n: number) => `Push ${n}`,
    pullCount: (n: number) => `Pull ${n}`,
    publishTitle: (branch: string) =>
      `${branch} auf origin veröffentlichen und verfolgen`,
    pushAhead: (ahead: number, branch: string, upstream: string) =>
      `${ahead} Commit${ahead === 1 ? '' : 's'} nach ${upstream} pushen`,
    nothingToPush: (branch: string, upstream: string) =>
      `Nichts zu pushen — ${branch} entspricht ${upstream}`,
    pullNoUpstream: (branch: string) =>
      `${branch} verfolgt keinen Branch — es gibt nichts zu holen`,
    pullBehind: (branch: string, upstream: string, behind: number) =>
      `${branch} auf ${upstream} vorspulen (${behind} zurück)`,
    pullFastForward: (branch: string, upstream: string) =>
      `${branch} von ${upstream} holen und vorspulen`
  },
  settings: {
    title: 'Einstellungen',
    close: 'Schließen',
    appearance: 'Darstellung',
    view: 'Ansicht',
    theme: 'Design',
    dark: 'Dunkel',
    light: 'Hell',
    fontSize: 'Schriftgröße',
    rowHeight: 'Zeilenhöhe',
    diffLayout: 'Diff-Layout',
    inline: 'Inline',
    sideBySide: 'Nebeneinander',
    wordWrap: 'Zeilenumbruch',
    wordHighlight: 'Worthervorhebung',
    markdownOutline: 'Markdown-Gliederung',
    language: 'Sprache',
    restoreDefaults: 'Standard wiederherstellen',
    done: 'Fertig'
  },
  contextMenu: {
    copySelection: 'Auswahl kopieren',
    copySelectionAccel: 'Strg+C',
    copyMarkdownSource: 'Markdown-Quelltext kopieren',
    copyFileContents: 'Dateiinhalt kopieren',
    copyWholeDiff: 'Ganzen Diff kopieren',
    enableWordWrap: 'Zeilenumbruch aktivieren',
    disableWordWrap: 'Zeilenumbruch deaktivieren',
    enableWordHighlight: 'Worthervorhebung aktivieren',
    disableWordHighlight: 'Worthervorhebung deaktivieren',
    showOutline: 'Gliederung anzeigen',
    hideOutline: 'Gliederung ausblenden',
    showDiffInstead: 'Stattdessen Diff anzeigen',
    inlineView: 'Inline-Ansicht',
    sideBySideView: 'Nebeneinander-Ansicht',
    previewMarkdown: 'Markdown-Vorschau',
    viewFile: 'Datei ansehen',
    openInNewTab: (name: string) => `${name} in einem neuen Tab öffnen`,
    openInNewTabAccel: 'Strg+Klick',
    selectInFileList: 'In der Dateiliste auswählen',
    copyRelativePath: 'Relativen Pfad kopieren',
    copyAbsolutePath: 'Absoluten Pfad kopieren',
    copyFileName: 'Dateinamen kopieren',
    openInSystemApp: 'In der Systemanwendung öffnen',
    revealInFileManager: 'Im Dateimanager anzeigen',
    viewFileAccel: 'Doppelklick',
    showCommitDiff: 'Commit-Diff anzeigen',
    showCommitDiffAccel: 'Eingabe',
    copyCommitHash: 'Commit-Hash kopieren',
    copyShortHash: 'Kurzen Hash kopieren',
    copySubject: 'Betreff kopieren',
    openInBrowser: 'Im Browser öffnen',
    copyCommitUrl: 'Commit-URL kopieren',
    browseSnapshot: 'Snapshot ansehen',
    diffAgainstSelected: 'Mit ausgewähltem Commit vergleichen',
    diffAgainstAccel: 'Strg+Klick',
    blameFile: 'Blame',
    fileHistory: 'Dateiverlauf'
  },
  paneChrome: {
    paneLabelFiles: 'Dateien',
    paneLabelDiff: 'Diff',
    restoreLayout: (fullAccel: string) =>
      `Layout wiederherstellen (Esc, ${fullAccel} oder Doppelklick auf die Kopfzeile)`,
    fillWindow: (fullAccel: string) =>
      `Fenster ausfüllen (${fullAccel} oder Doppelklick auf die Kopfzeile)`,
    hidePane: (accel: string) =>
      `Diesen Bereich ausblenden (${accel}) — „Bereiche“ in der Titelleiste holt ihn zurück`,
    hidePaneTerminal: (accel: string) =>
      `Diesen Bereich ausblenden (${accel}) — „Bereiche“ in der Titelleiste holt ihn zurück — die Shells laufen weiter`,
    showPane: (label: string) => `Bereich ${label} einblenden`,
    hidePaneMenu: (label: string) => `Bereich ${label} ausblenden`,
    showAllPanes: 'Alle Bereiche einblenden',
    hidesThisPane: ' blendet diesen Bereich aus',
    fillsTheWindow: ' füllt das Fenster',
    dblClickToggles: 'Doppelklick auf den Titel schaltet Vollbild um'
  },
  terminal: {
    title: 'Terminal',
    starting: 'Wird gestartet…',
    shellExited: (exitCode: number) =>
      `[Shell mit Code ${exitCode} beendet]`,
    closeTerminal: 'Dieses Terminal schließen',
    splitRight: 'Teilen →',
    splitRightTitle: 'Das aktive Terminal nach rechts teilen',
    splitDown: 'Teilen ↓',
    splitDownTitle: 'Das aktive Terminal nach unten teilen',
    shellsKeepRunning: ' — die Shells laufen weiter'
  },
  common: {
    loading: 'Wird geladen…',
    binaryOrOversized: 'Binäre oder zu große Datei.'
  },
  time: {
    today: 'heute',
    yesterday: 'gestern',
    daysAgo: (n: number) => `vor ${n} T`,
    monthsAgo: (n: number) => `vor ${Math.floor(n / 30)} Mon.`,
    yearsAgo: (n: number) => `vor ${Math.floor(n / 365)} J`
  },
  image: {
    loading: 'Wird geladen…',
    clickToFit: 'Klicken zum Einpassen',
    clickForActualSize: 'Klicken für Originalgröße'
  }
}
