import type { RendererMessages } from '../../../shared/messages'

export const es: RendererMessages = {
  app: {
    title: 'Gitty',
    settings: 'Ajustes',
    openRepository: 'Abrir repositorio',
    refresh: 'Actualizar',
    panes: 'Paneles',
    noRepo: 'sin repositorio',
    noReposOpen: 'No hay repositorios abiertos.',
    recentlyOpened: 'Repositorios abiertos recientemente',
    showHidePanes: 'Mostrar u ocultar los paneles',
    changesCount: (n: number) => `${n} cambiado${n === 1 ? '' : 's'}`,
    notInWorkTree: (path: string) =>
      `${path} no está dentro de un árbol de trabajo de git.`,
    notInWorkTreeHint: (path: string) =>
      `${path} no está dentro de un árbol de trabajo de git. Usa «Abrir repositorio».`
  },
  tab: {
    uncommittedChanges: (path: string) => `${path} — cambios sin confirmar`,
    closeRepository: 'Cerrar repositorio',
    openAnotherRepo: 'Abrir otro repositorio'
  },
  recent: {
    noOtherRepos: 'Aún no hay otros repositorios',
    openRepoEllipsis: 'Abrir repositorio…',
    clearRecent: 'Borrar recientes',
    tooltip:
      '\n\nHaz clic para abrir en una pestaña nueva\nCtrl+clic para abrir en esta pestaña\nClic derecho para quitar de la lista',
    accelOpen: 'Ctrl+O'
  },
  branch: {
    noBranchesYet: 'Aún no hay ramas',
    backTo: (branch: string) => `Volver a ${branch}`,
    browseHint: 'Explorar el historial de otra rama (no se cambia de rama)',
    headLabel: 'HEAD'
  },
  files: {
    workingTreeTitle: 'Árbol de trabajo',
    commitTitle: (short: string, subject: string) =>
      `Commit ${short} — ${subject}`,
    snapshotTitle: (short: string, subject: string) =>
      `Instantánea ${short} — ${subject}`,
    rangeTitle: (from: string, to: string) =>
      `Rango ${from.slice(0, 8)}..${to.slice(0, 8)}`,
    backToWorkTree: 'Volver al árbol de trabajo',
    emptyWorktree: 'El árbol de trabajo está limpio.',
    emptySnapshot: 'No hay archivos en esta instantánea.',
    emptyDiff: 'No hay archivos en este diff.',
    lines: (n: number) => `${n} línea${n === 1 ? '' : 's'}`
  },
  diff: {
    titleFallback: 'Diff',
    errorTitle: 'error',
    emptyWorktree: 'El árbol de trabajo está limpio.',
    emptySnapshot: 'Selecciona un archivo para verlo en este commit.',
    emptyDiff: 'Sin cambios de texto.',
    emptyBlame: 'No hay líneas que atribuir.',
    emptyHistory: 'Este archivo aún no tiene historial.',
    showWholeDiff: 'Mostrar el diff completo',
    allShown: 'Se muestran todos los cambios sin confirmar',
    allCommitShown: 'Se muestran todos los archivos de este commit',
    widenWorktree: 'Ampliar el diff a todos los cambios sin confirmar',
    widenCommit: 'Ampliar el diff a todos los archivos de este commit',
    preview: 'Vista previa',
    viewImage: 'Ver imagen',
    viewFile: 'Ver archivo',
    previewTitle: 'Abrir este archivo markdown renderizado, junto al diff',
    viewImageTitle: 'Mostrar esta imagen junto al diff',
    viewFileTitle: 'Abrir el archivo completo junto al diff',
    markdownSourceTitle: 'Mostrar el código markdown en su lugar',
    renderMarkdownTitle: 'Renderizar este archivo markdown',
    expandAll: 'Expandir todo',
    collapseAll: 'Contraer todo',
    expandAllTitle: 'Expandir todos los archivos',
    collapseAllTitle: 'Contraer todos los archivos hasta su nombre',
    wrap: 'Ajustar',
    wrapLong: 'Ajustar las líneas largas',
    wrapCode: 'Ajustar los bloques de código y las tablas',
    outline: 'Esquema',
    showOutline: 'Mostrar el esquema de encabezados',
    inline: 'En línea',
    sideBySide: 'Lado a lado',
    switchView: 'Cambiar entre la vista en línea y lado a lado',
    docTabDiff: 'Diff',
    docTabDiffTitle: 'El diff',
    docTabClose: 'Cerrar',
    docTabBlame: 'blame',
    docTabHistory: 'historial',
    dblClickFullScreen: 'Doble clic para alternar pantalla completa',
    fileHeadingTooltip: (collapsed: boolean) =>
      `\n\nHaz clic para ${collapsed ? 'expandir' : 'contraer'}\nCtrl+clic para abrir en una pestaña nueva\nClic derecho para más opciones`,
    loadMoreLines: (n: number) =>
      `${n} línea${n === 1 ? '' : 's'} más — desplázate o haz clic para cargar`
  },
  log: {
    commits: 'Commits',
    worktreeRow: 'Árbol de trabajo ',
    worktreeRowTitle: 'Cambios sin confirmar en el árbol de trabajo',
    worktreeClean: '(limpio)',
    worktreeUncommitted: (n: number) => `(${n} sin confirmar)`,
    noCommitsYet: 'Aún no hay commits.',
    filterPlaceholder: 'Filtrar commits…',
    noMatches: 'No hay commits que coincidan',
    clearFilter: 'Borrar filtro',
    browsingAnother: 'Explorando otra rama',
    comparing2: 'comparando 2 commits',
    openInBrowser: 'Abrir en el navegador',
    openRepoCommitsTitle: 'Abrir los commits de este repositorio en el navegador',
    clickToDismiss: 'Haz clic para cerrar',
    now: 'ahora',
    placeholder: '—',
    keyMove: ' mover',
    keyShow: ' mostrar',
    keyCompare: ' comparar',
    keyWorktree: ' árbol de trabajo',
    tooltipViews: ' vistas',
    tooltipMore: ' para más'
  },
  pushPull: {
    push: 'Push',
    pull: 'Pull',
    pushing: 'Enviando…',
    pulling: 'Recibiendo…',
    pushCount: (n: number) => `Push ${n}`,
    pullCount: (n: number) => `Pull ${n}`,
    publishTitle: (branch: string) =>
      `Publicar ${branch} en origin y hacer seguimiento`,
    pushAhead: (ahead: number, branch: string, upstream: string) =>
      `Enviar ${ahead} commit${ahead === 1 ? '' : 's'} a ${upstream}`,
    nothingToPush: (branch: string, upstream: string) =>
      `Nada que enviar — ${branch} coincide con ${upstream}`,
    pullNoUpstream: (branch: string) =>
      `${branch} no sigue ninguna rama — no hay de dónde recibir`,
    pullBehind: (branch: string, upstream: string, behind: number) =>
      `Avanzar ${branch} hasta ${upstream} (${behind} por detrás)`,
    pullFastForward: (branch: string, upstream: string) =>
      `Obtener y avanzar ${branch} desde ${upstream}`
  },
  settings: {
    title: 'Ajustes',
    close: 'Cerrar',
    appearance: 'Apariencia',
    view: 'Vista',
    theme: 'Tema',
    dark: 'Oscuro',
    light: 'Claro',
    fontSize: 'Tamaño de letra',
    rowHeight: 'Altura de fila',
    diffLayout: 'Disposición del diff',
    inline: 'En línea',
    sideBySide: 'Lado a lado',
    wordWrap: 'Ajuste de línea',
    wordHighlight: 'Resaltado de palabras',
    markdownOutline: 'Esquema de markdown',
    language: 'Idioma',
    restoreDefaults: 'Restaurar valores predeterminados',
    done: 'Hecho'
  },
  contextMenu: {
    copySelection: 'Copiar selección',
    copySelectionAccel: 'Ctrl+C',
    copyMarkdownSource: 'Copiar código markdown',
    copyFileContents: 'Copiar contenido del archivo',
    copyWholeDiff: 'Copiar el diff completo',
    enableWordWrap: 'Activar el ajuste de línea',
    disableWordWrap: 'Desactivar el ajuste de línea',
    enableWordHighlight: 'Activar el resaltado de palabras',
    disableWordHighlight: 'Desactivar el resaltado de palabras',
    showOutline: 'Mostrar esquema',
    hideOutline: 'Ocultar esquema',
    showDiffInstead: 'Mostrar el diff en su lugar',
    inlineView: 'Vista en línea',
    sideBySideView: 'Vista lado a lado',
    previewMarkdown: 'Vista previa de markdown',
    viewFile: 'Ver archivo',
    openInNewTab: (name: string) => `Abrir ${name} en una pestaña nueva`,
    openInNewTabAccel: 'Ctrl+clic',
    selectInFileList: 'Seleccionar en la lista de archivos',
    copyRelativePath: 'Copiar ruta relativa',
    copyAbsolutePath: 'Copiar ruta absoluta',
    copyFileName: 'Copiar nombre del archivo',
    openInSystemApp: 'Abrir en la aplicación del sistema',
    revealInFileManager: 'Mostrar en el gestor de archivos',
    viewFileAccel: 'Doble clic',
    showCommitDiff: 'Mostrar el diff del commit',
    showCommitDiffAccel: 'Intro',
    copyCommitHash: 'Copiar hash del commit',
    copyShortHash: 'Copiar hash corto',
    copySubject: 'Copiar asunto',
    openInBrowser: 'Abrir en el navegador',
    copyCommitUrl: 'Copiar la URL del commit',
    browseSnapshot: 'Explorar instantánea',
    diffAgainstSelected: 'Comparar con el commit seleccionado',
    diffAgainstAccel: 'Ctrl+clic',
    blameFile: 'Blame',
    fileHistory: 'Historial del archivo'
  },
  paneChrome: {
    paneLabelFiles: 'Archivos',
    paneLabelDiff: 'Diff',
    restoreLayout: (fullAccel: string) =>
      `Restaurar la disposición (Esc, ${fullAccel} o doble clic en la cabecera)`,
    fillWindow: (fullAccel: string) =>
      `Llenar la ventana (${fullAccel} o doble clic en la cabecera)`,
    hidePane: (accel: string) =>
      `Ocultar este panel (${accel}) — «Paneles» en la barra de título lo devuelve`,
    hidePaneTerminal: (accel: string) =>
      `Ocultar este panel (${accel}) — «Paneles» en la barra de título lo devuelve — los shells siguen ejecutándose`,
    showPane: (label: string) => `Mostrar el panel de ${label.toLowerCase()}`,
    hidePaneMenu: (label: string) => `Ocultar el panel de ${label.toLowerCase()}`,
    showAllPanes: 'Mostrar todos los paneles',
    hidesThisPane: ' oculta este panel',
    fillsTheWindow: ' llena la ventana',
    dblClickToggles: 'Doble clic en el título alterna la pantalla completa'
  },
  terminal: {
    title: 'Terminal',
    starting: 'Iniciando…',
    shellExited: (exitCode: number) =>
      `[el shell terminó con el código ${exitCode}]`,
    closeTerminal: 'Cerrar este terminal',
    splitRight: 'Dividir →',
    splitRightTitle: 'Dividir el terminal activo hacia la derecha',
    splitDown: 'Dividir ↓',
    splitDownTitle: 'Dividir el terminal activo hacia abajo',
    shellsKeepRunning: ' — los shells siguen ejecutándose'
  },
  common: {
    loading: 'Cargando…',
    binaryOrOversized: 'Archivo binario o demasiado grande.'
  },
  time: {
    today: 'hoy',
    yesterday: 'ayer',
    daysAgo: (n: number) => `hace ${n} d`,
    monthsAgo: (n: number) => `hace ${Math.floor(n / 30)} m`,
    yearsAgo: (n: number) => `hace ${Math.floor(n / 365)} a`
  },
  image: {
    loading: 'Cargando…',
    clickToFit: 'Haz clic para ajustar',
    clickForActualSize: 'Haz clic para el tamaño real'
  }
}
