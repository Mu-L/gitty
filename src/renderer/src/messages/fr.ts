import type { RendererMessages } from '../../../shared/messages'

export const fr: RendererMessages = {
  app: {
    title: 'Gitty',
    settings: 'Paramètres',
    openRepository: 'Ouvrir un dépôt',
    refresh: 'Actualiser',
    panes: 'Volets',
    noRepo: 'aucun dépôt',
    noReposOpen: 'Aucun dépôt ouvert.',
    recentlyOpened: 'Dépôts récemment ouverts',
    showHidePanes: 'Afficher ou masquer les volets',
    changesCount: (n: number) => `${n} modifié${n === 1 ? '' : 's'}`,
    notInWorkTree: (path: string) =>
      `${path} n'est pas dans une copie de travail git.`,
    notInWorkTreeHint: (path: string) =>
      `${path} n'est pas dans une copie de travail git. Utilisez « Ouvrir un dépôt ».`
  },
  tab: {
    uncommittedChanges: (path: string) => `${path} — modifications non validées`,
    closeRepository: 'Fermer le dépôt',
    openAnotherRepo: 'Ouvrir un autre dépôt'
  },
  recent: {
    noOtherRepos: 'Aucun autre dépôt pour l’instant',
    openRepoEllipsis: 'Ouvrir un dépôt…',
    clearRecent: 'Effacer la liste',
    tooltip:
      '\n\nCliquer pour ouvrir dans un nouvel onglet\nCtrl+clic pour ouvrir dans cet onglet\nClic droit pour retirer de la liste',
    accelOpen: 'Ctrl+O'
  },
  branch: {
    noBranchesYet: 'Aucune branche pour l’instant',
    backTo: (branch: string) => `Retour à ${branch}`,
    browseHint: 'Parcourir l’historique d’une autre branche (rien n’est extrait)',
    headLabel: 'HEAD'
  },
  files: {
    workingTreeTitle: 'Copie de travail',
    commitTitle: (short: string, subject: string) =>
      `Commit ${short} — ${subject}`,
    snapshotTitle: (short: string, subject: string) =>
      `Instantané ${short} — ${subject}`,
    rangeTitle: (from: string, to: string) =>
      `Plage ${from.slice(0, 8)}..${to.slice(0, 8)}`,
    backToWorkTree: 'Retour à la copie de travail',
    emptyWorktree: 'Copie de travail propre.',
    emptySnapshot: 'Aucun fichier dans cet instantané.',
    emptyDiff: 'Aucun fichier dans ce diff.',
    lines: (n: number) => `${n} ligne${n === 1 ? '' : 's'}`
  },
  diff: {
    titleFallback: 'Diff',
    errorTitle: 'erreur',
    emptyWorktree: 'Copie de travail propre.',
    emptySnapshot: 'Sélectionnez un fichier pour le voir à ce commit.',
    emptyDiff: 'Aucune modification textuelle.',
    emptyBlame: 'Aucune ligne à imputer.',
    emptyHistory: 'Ce fichier n’a pas encore d’historique.',
    showWholeDiff: 'Afficher tout le diff',
    allShown: 'Toutes les modifications non validées sont affichées',
    allCommitShown: 'Tous les fichiers de ce commit sont affichés',
    widenWorktree: 'Élargir le diff à toutes les modifications non validées',
    widenCommit: 'Élargir le diff à tous les fichiers de ce commit',
    preview: 'Aperçu',
    viewImage: 'Voir l’image',
    viewFile: 'Voir le fichier',
    previewTitle: 'Ouvrir ce fichier markdown rendu, à côté du diff',
    viewImageTitle: 'Afficher cette image à côté du diff',
    viewFileTitle: 'Ouvrir le fichier entier à côté du diff',
    markdownSourceTitle: 'Afficher la source markdown à la place',
    renderMarkdownTitle: 'Rendre ce fichier markdown',
    expandAll: 'Tout déplier',
    collapseAll: 'Tout replier',
    expandAllTitle: 'Déplier tous les fichiers',
    collapseAllTitle: 'Replier tous les fichiers à leur nom',
    wrap: 'Retour',
    wrapLong: 'Retour à la ligne automatique',
    wrapCode: 'Retour à la ligne dans les blocs de code et les tableaux',
    outline: 'Plan',
    showOutline: 'Afficher le plan des titres',
    inline: 'En ligne',
    sideBySide: 'Côte à côte',
    switchView: 'Basculer entre l’affichage en ligne et côte à côte',
    docTabDiff: 'Diff',
    docTabDiffTitle: 'Le diff',
    docTabClose: 'Fermer',
    docTabBlame: 'blame',
    docTabHistory: 'historique',
    dblClickFullScreen: 'Double-cliquer pour basculer en plein écran',
    fileHeadingTooltip: (collapsed: boolean) =>
      `\n\nCliquer pour ${collapsed ? 'déplier' : 'replier'}\nCtrl+clic pour ouvrir dans un nouvel onglet\nClic droit pour plus d’options`,
    loadMoreLines: (n: number) =>
      `${n} ligne${n === 1 ? '' : 's'} de plus — faites défiler ou cliquez pour charger`
  },
  log: {
    commits: 'Commits',
    worktreeRow: 'Copie de travail ',
    worktreeRowTitle: 'Modifications non validées dans la copie de travail',
    worktreeClean: '(propre)',
    worktreeUncommitted: (n: number) => `(${n} non validé${n === 1 ? '' : 's'})`,
    noCommitsYet: 'Aucun commit pour l’instant.',
    filterPlaceholder: 'Filtrer les commits…',
    noMatches: 'Aucun commit ne correspond',
    clearFilter: 'Effacer le filtre',
    browsingAnother: 'Consultation d’une autre branche',
    comparing2: 'comparaison de 2 commits',
    openInBrowser: 'Ouvrir dans le navigateur',
    openRepoCommitsTitle: 'Ouvrir les commits de ce dépôt dans le navigateur',
    clickToDismiss: 'Cliquer pour fermer',
    now: 'à l’instant',
    placeholder: '—',
    keyMove: ' déplacer',
    keyShow: ' afficher',
    keyCompare: ' comparer',
    keyWorktree: ' copie de travail',
    tooltipViews: ' vues',
    tooltipMore: ' pour plus'
  },
  pushPull: {
    push: 'Pousser',
    pull: 'Tirer',
    pushing: 'Envoi…',
    pulling: 'Récupération…',
    pushCount: (n: number) => `Pousser ${n}`,
    pullCount: (n: number) => `Tirer ${n}`,
    publishTitle: (branch: string) =>
      `Publier ${branch} sur origin et la suivre`,
    pushAhead: (ahead: number, branch: string, upstream: string) =>
      `Pousser ${ahead} commit${ahead === 1 ? '' : 's'} vers ${upstream}`,
    nothingToPush: (branch: string, upstream: string) =>
      `Rien à pousser — ${branch} correspond à ${upstream}`,
    pullNoUpstream: (branch: string) =>
      `${branch} ne suit aucune branche — rien à tirer`,
    pullBehind: (branch: string, upstream: string, behind: number) =>
      `Avance rapide de ${branch} vers ${upstream} (${behind} en retard)`,
    pullFastForward: (branch: string, upstream: string) =>
      `Récupérer et avancer ${branch} depuis ${upstream}`
  },
  settings: {
    title: 'Paramètres',
    close: 'Fermer',
    appearance: 'Apparence',
    view: 'Affichage',
    theme: 'Thème',
    dark: 'Sombre',
    light: 'Clair',
    fontSize: 'Taille du texte',
    rowHeight: 'Hauteur des lignes',
    diffLayout: 'Disposition du diff',
    inline: 'En ligne',
    sideBySide: 'Côte à côte',
    wordWrap: 'Retour à la ligne',
    wordHighlight: 'Surlignage des mots',
    markdownOutline: 'Plan markdown',
    language: 'Langue',
    restoreDefaults: 'Rétablir les valeurs par défaut',
    done: 'Terminé'
  },
  contextMenu: {
    copySelection: 'Copier la sélection',
    copySelectionAccel: 'Ctrl+C',
    copyMarkdownSource: 'Copier la source markdown',
    copyFileContents: 'Copier le contenu du fichier',
    copyWholeDiff: 'Copier tout le diff',
    enableWordWrap: 'Activer le retour à la ligne',
    disableWordWrap: 'Désactiver le retour à la ligne',
    enableWordHighlight: 'Activer le surlignage des mots',
    disableWordHighlight: 'Désactiver le surlignage des mots',
    showOutline: 'Afficher le plan',
    hideOutline: 'Masquer le plan',
    showDiffInstead: 'Afficher le diff à la place',
    inlineView: 'Vue en ligne',
    sideBySideView: 'Vue côte à côte',
    previewMarkdown: 'Aperçu markdown',
    viewFile: 'Voir le fichier',
    openInNewTab: (name: string) => `Ouvrir ${name} dans un nouvel onglet`,
    openInNewTabAccel: 'Ctrl+clic',
    selectInFileList: 'Sélectionner dans la liste des fichiers',
    copyRelativePath: 'Copier le chemin relatif',
    copyAbsolutePath: 'Copier le chemin absolu',
    copyFileName: 'Copier le nom du fichier',
    openInSystemApp: 'Ouvrir dans l’application système',
    revealInFileManager: 'Afficher dans le gestionnaire de fichiers',
    viewFileAccel: 'Double-clic',
    showCommitDiff: 'Afficher le diff du commit',
    showCommitDiffAccel: 'Entrée',
    copyCommitHash: 'Copier le hash du commit',
    copyShortHash: 'Copier le hash court',
    copySubject: 'Copier le sujet',
    openInBrowser: 'Ouvrir dans le navigateur',
    copyCommitUrl: 'Copier l’URL du commit',
    browseSnapshot: 'Parcourir l’instantané',
    diffAgainstSelected: 'Comparer au commit sélectionné',
    diffAgainstAccel: 'Ctrl+clic',
    blameFile: 'Blâme',
    fileHistory: 'Historique du fichier'
  },
  paneChrome: {
    paneLabelFiles: 'Fichiers',
    paneLabelDiff: 'Diff',
    restoreLayout: (fullAccel: string) =>
      `Rétablir la disposition (Échap, ${fullAccel} ou double-clic sur l’en-tête)`,
    fillWindow: (fullAccel: string) =>
      `Remplir la fenêtre (${fullAccel} ou double-clic sur l’en-tête)`,
    hidePane: (accel: string) =>
      `Masquer ce volet (${accel}) — « Volets » dans la barre de titre le rétablit`,
    hidePaneTerminal: (accel: string) =>
      `Masquer ce volet (${accel}) — « Volets » dans la barre de titre le rétablit — les shells continuent de tourner`,
    showPane: (label: string) => `Afficher le volet ${label.toLowerCase()}`,
    hidePaneMenu: (label: string) => `Masquer le volet ${label.toLowerCase()}`,
    showAllPanes: 'Afficher tous les volets',
    hidesThisPane: ' masque ce volet',
    fillsTheWindow: ' remplit la fenêtre',
    dblClickToggles: 'Double-cliquer sur le titre bascule en plein écran'
  },
  terminal: {
    title: 'Terminal',
    starting: 'Démarrage…',
    shellExited: (exitCode: number) =>
      `[le shell s’est terminé avec le code ${exitCode}]`,
    closeTerminal: 'Fermer ce terminal',
    splitRight: 'Diviser →',
    splitRightTitle: 'Diviser le terminal actif vers la droite',
    splitDown: 'Diviser ↓',
    splitDownTitle: 'Diviser le terminal actif vers le bas',
    shellsKeepRunning: ' — les shells continuent de tourner'
  },
  common: {
    loading: 'Chargement…',
    binaryOrOversized: 'Fichier binaire ou trop volumineux.'
  },
  time: {
    today: 'aujourd’hui',
    yesterday: 'hier',
    daysAgo: (n: number) => `il y a ${n} j`,
    monthsAgo: (n: number) => `il y a ${Math.floor(n / 30)} mois`,
    yearsAgo: (n: number) => `il y a ${Math.floor(n / 365)} an${Math.floor(n / 365) === 1 ? '' : 's'}`
  },
  image: {
    loading: 'Chargement…',
    clickToFit: 'Cliquer pour ajuster',
    clickForActualSize: 'Cliquer pour la taille réelle'
  }
}
