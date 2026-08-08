import type { RendererMessages } from '../../../shared/messages'

export const pt: RendererMessages = {
  app: {
    title: 'Gitty',
    settings: 'Definições',
    openRepository: 'Abrir repositório',
    refresh: 'Atualizar',
    panes: 'Painéis',
    noRepo: 'sem repositório',
    noReposOpen: 'Nenhum repositório aberto.',
    recentlyOpened: 'Repositórios abertos recentemente',
    showHidePanes: 'Mostrar ou ocultar os painéis',
    changesCount: (n: number) => `${n} alterado${n === 1 ? '' : 's'}`,
    notInWorkTree: (path: string) =>
      `${path} não está dentro de uma árvore de trabalho do git.`,
    notInWorkTreeHint: (path: string) =>
      `${path} não está dentro de uma árvore de trabalho do git. Use «Abrir repositório».`
  },
  tab: {
    uncommittedChanges: (path: string) => `${path} — alterações por confirmar`,
    closeRepository: 'Fechar repositório',
    openAnotherRepo: 'Abrir outro repositório'
  },
  recent: {
    noOtherRepos: 'Ainda não há outros repositórios',
    openRepoEllipsis: 'Abrir repositório…',
    clearRecent: 'Limpar recentes',
    tooltip:
      '\n\nClique para abrir num novo separador\nCtrl+clique para abrir neste separador\nClique com o botão direito para remover da lista',
    accelOpen: 'Ctrl+O'
  },
  branch: {
    noBranchesYet: 'Ainda não há ramos',
    backTo: (branch: string) => `Voltar a ${branch}`,
    browseHint: 'Percorrer o histórico de outro ramo (nada é obtido)',
    headLabel: 'HEAD'
  },
  files: {
    workingTreeTitle: 'Árvore de trabalho',
    commitTitle: (short: string, subject: string) =>
      `Commit ${short} — ${subject}`,
    snapshotTitle: (short: string, subject: string) =>
      `Instantâneo ${short} — ${subject}`,
    rangeTitle: (from: string, to: string) =>
      `Intervalo ${from.slice(0, 8)}..${to.slice(0, 8)}`,
    backToWorkTree: 'Voltar à árvore de trabalho',
    emptyWorktree: 'Árvore de trabalho limpa.',
    emptySnapshot: 'Nenhum ficheiro neste instantâneo.',
    emptyDiff: 'Nenhum ficheiro neste diff.',
    lines: (n: number) => `${n} linha${n === 1 ? '' : 's'}`
  },
  diff: {
    titleFallback: 'Diff',
    errorTitle: 'erro',
    emptyWorktree: 'Árvore de trabalho limpa.',
    emptySnapshot: 'Selecione um ficheiro para o ver neste commit.',
    emptyDiff: 'Sem alterações de texto.',
    emptyBlame: 'Nenhuma linha a atribuir.',
    emptyHistory: 'Este arquivo ainda não tem histórico.',
    showWholeDiff: 'Mostrar o diff completo',
    allShown: 'São mostradas todas as alterações por confirmar',
    allCommitShown: 'São mostrados todos os ficheiros deste commit',
    widenWorktree: 'Alargar o diff a todas as alterações por confirmar',
    widenCommit: 'Alargar o diff a todos os ficheiros deste commit',
    preview: 'Pré-visualizar',
    viewImage: 'Ver imagem',
    viewFile: 'Ver ficheiro',
    previewTitle: 'Abrir este ficheiro markdown renderizado, ao lado do diff',
    viewImageTitle: 'Mostrar esta imagem ao lado do diff',
    viewFileTitle: 'Abrir o ficheiro inteiro ao lado do diff',
    markdownSourceTitle: 'Mostrar antes o código markdown',
    renderMarkdownTitle: 'Renderizar este ficheiro markdown',
    expandAll: 'Expandir tudo',
    collapseAll: 'Recolher tudo',
    expandAllTitle: 'Expandir todos os ficheiros',
    collapseAllTitle: 'Recolher todos os ficheiros até ao nome',
    wrap: 'Moldar',
    wrapLong: 'Moldar as linhas longas',
    wrapCode: 'Moldar os blocos de código e as tabelas',
    outline: 'Estrutura',
    showOutline: 'Mostrar a estrutura de títulos',
    inline: 'Em linha',
    sideBySide: 'Lado a lado',
    switchView: 'Alternar entre a vista em linha e lado a lado',
    docTabDiff: 'Diff',
    docTabDiffTitle: 'O diff',
    docTabClose: 'Fechar',
    docTabBlame: 'blame',
    docTabHistory: 'histórico',
    dblClickFullScreen: 'Duplo clique alterna o ecrã inteiro',
    fileHeadingTooltip: (collapsed: boolean) =>
      `\n\nClique para ${collapsed ? 'expandir' : 'recolher'}\nCtrl+clique para abrir num novo separador\nClique com o botão direito para mais`,
    loadMoreLines: (n: number) =>
      `Mais ${n} linha${n === 1 ? '' : 's'} — desloque ou clique para carregar`
  },
  log: {
    commits: 'Commits',
    worktreeRow: 'Árvore de trabalho ',
    worktreeRowTitle: 'Alterações por confirmar na árvore de trabalho',
    worktreeClean: '(limpa)',
    worktreeUncommitted: (n: number) => `(${n} por confirmar)`,
    noCommitsYet: 'Ainda não há commits.',
    filterPlaceholder: 'Filtrar commits…',
    noMatches: 'Nenhum commit correspondente',
    clearFilter: 'Limpar filtro',
    browsingAnother: 'A percorrer outro ramo',
    comparing2: 'a comparar 2 commits',
    openInBrowser: 'Abrir no navegador',
    openRepoCommitsTitle: 'Abrir os commits deste repositório no navegador',
    clickToDismiss: 'Clique para fechar',
    now: 'agora',
    placeholder: '—',
    keyMove: ' mover',
    keyShow: ' mostrar',
    keyCompare: ' comparar',
    keyWorktree: ' árvore de trabalho',
    tooltipViews: ' vistas',
    tooltipMore: ' para mais'
  },
  pushPull: {
    push: 'Push',
    pull: 'Pull',
    pushing: 'A enviar…',
    pulling: 'A obter…',
    pushCount: (n: number) => `Push ${n}`,
    pullCount: (n: number) => `Pull ${n}`,
    publishTitle: (branch: string) =>
      `Publicar ${branch} em origin e segui-lo`,
    pushAhead: (ahead: number, branch: string, upstream: string) =>
      `Enviar ${ahead} commit${ahead === 1 ? '' : 's'} para ${upstream}`,
    nothingToPush: (branch: string, upstream: string) =>
      `Nada a enviar — ${branch} coincide com ${upstream}`,
    pullNoUpstream: (branch: string) =>
      `${branch} não segue nenhum ramo — não há de onde obter`,
    pullBehind: (branch: string, upstream: string, behind: number) =>
      `Avançar ${branch} até ${upstream} (${behind} atrás)`,
    pullFastForward: (branch: string, upstream: string) =>
      `Obter e avançar ${branch} a partir de ${upstream}`
  },
  settings: {
    title: 'Definições',
    close: 'Fechar',
    appearance: 'Aspeto',
    view: 'Vista',
    theme: 'Tema',
    dark: 'Escuro',
    light: 'Claro',
    fontSize: 'Tamanho da letra',
    rowHeight: 'Altura da linha',
    diffLayout: 'Disposição do diff',
    inline: 'Em linha',
    sideBySide: 'Lado a lado',
    wordWrap: 'Moldagem de texto',
    wordHighlight: 'Realce de palavras',
    markdownOutline: 'Estrutura do markdown',
    language: 'Idioma',
    restoreDefaults: 'Repor predefinições',
    done: 'Concluído'
  },
  contextMenu: {
    copySelection: 'Copiar seleção',
    copySelectionAccel: 'Ctrl+C',
    copyMarkdownSource: 'Copiar código markdown',
    copyFileContents: 'Copiar conteúdo do ficheiro',
    copyWholeDiff: 'Copiar o diff completo',
    enableWordWrap: 'Ativar a moldagem de texto',
    disableWordWrap: 'Desativar a moldagem de texto',
    enableWordHighlight: 'Ativar o realce de palavras',
    disableWordHighlight: 'Desativar o realce de palavras',
    showOutline: 'Mostrar estrutura',
    hideOutline: 'Ocultar estrutura',
    showDiffInstead: 'Mostrar antes o diff',
    inlineView: 'Vista em linha',
    sideBySideView: 'Vista lado a lado',
    previewMarkdown: 'Pré-visualizar markdown',
    viewFile: 'Ver ficheiro',
    openInNewTab: (name: string) => `Abrir ${name} num novo separador`,
    openInNewTabAccel: 'Ctrl+clique',
    selectInFileList: 'Selecionar na lista de ficheiros',
    copyRelativePath: 'Copiar caminho relativo',
    copyAbsolutePath: 'Copiar caminho absoluto',
    copyFileName: 'Copiar nome do ficheiro',
    openInSystemApp: 'Abrir na aplicação do sistema',
    revealInFileManager: 'Mostrar no gestor de ficheiros',
    viewFileAccel: 'Duplo clique',
    showCommitDiff: 'Mostrar o diff do commit',
    showCommitDiffAccel: 'Enter',
    copyCommitHash: 'Copiar hash do commit',
    copyShortHash: 'Copiar hash curto',
    copySubject: 'Copiar assunto',
    openInBrowser: 'Abrir no navegador',
    copyCommitUrl: 'Copiar o URL do commit',
    browseSnapshot: 'Percorrer o instantâneo',
    diffAgainstSelected: 'Comparar com o commit selecionado',
    diffAgainstAccel: 'Ctrl+clique',
    blameFile: 'Blame',
    fileHistory: 'Histórico do arquivo'
  },
  paneChrome: {
    paneLabelFiles: 'Ficheiros',
    paneLabelDiff: 'Diff',
    restoreLayout: (fullAccel: string) =>
      `Repor a disposição (Esc, ${fullAccel} ou duplo clique no cabeçalho)`,
    fillWindow: (fullAccel: string) =>
      `Preencher a janela (${fullAccel} ou duplo clique no cabeçalho)`,
    hidePane: (accel: string) =>
      `Ocultar este painel (${accel}) — «Painéis» na barra de título traz de volta`,
    hidePaneTerminal: (accel: string) =>
      `Ocultar este painel (${accel}) — «Painéis» na barra de título traz de volta — as shells continuam a correr`,
    showPane: (label: string) => `Mostrar o painel de ${label.toLowerCase()}`,
    hidePaneMenu: (label: string) => `Ocultar o painel de ${label.toLowerCase()}`,
    showAllPanes: 'Mostrar todos os painéis',
    hidesThisPane: ' oculta este painel',
    fillsTheWindow: ' preenche a janela',
    dblClickToggles: 'Duplo clique no título alterna o ecrã inteiro'
  },
  terminal: {
    title: 'Terminal',
    starting: 'A iniciar…',
    shellExited: (exitCode: number) =>
      `[a shell terminou com o código ${exitCode}]`,
    closeTerminal: 'Fechar este terminal',
    splitRight: 'Dividir →',
    splitRightTitle: 'Dividir o terminal ativo para a direita',
    splitDown: 'Dividir ↓',
    splitDownTitle: 'Dividir o terminal ativo para baixo',
    shellsKeepRunning: ' — as shells continuam a correr'
  },
  common: {
    loading: 'A carregar…',
    binaryOrOversized: 'Ficheiro binário ou demasiado grande.'
  },
  time: {
    today: 'hoje',
    yesterday: 'ontem',
    daysAgo: (n: number) => `há ${n} d`,
    monthsAgo: (n: number) => `há ${Math.floor(n / 30)} m`,
    yearsAgo: (n: number) => `há ${Math.floor(n / 365)} a`
  },
  image: {
    loading: 'A carregar…',
    clickToFit: 'Clique para ajustar',
    clickForActualSize: 'Clique para o tamanho real'
  }
}
