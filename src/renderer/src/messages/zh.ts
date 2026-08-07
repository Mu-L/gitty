import type { RendererMessages } from '../../../shared/messages'

export const zh: RendererMessages = {
  app: {
    title: 'Gitty',
    settings: '设置',
    openRepository: '打开仓库',
    refresh: '刷新',
    panes: '窗格',
    noRepo: '未打开仓库',
    noReposOpen: '未打开任何仓库。',
    recentlyOpened: '最近打开的仓库',
    showHidePanes: '显示或隐藏窗格',
    changesCount: (n: number) => `${n} 个变更`,
    notInWorkTree: (path: string) => `${path} 不在 git 工作树中。`,
    notInWorkTreeHint: (path: string) =>
      `${path} 不在 git 工作树中。请使用"打开仓库"。`
  },
  tab: {
    uncommittedChanges: (path: string) => `${path} — 有未提交的变更`,
    closeRepository: '关闭仓库',
    openAnotherRepo: '打开另一个仓库'
  },
  recent: {
    noOtherRepos: '暂无其他仓库',
    openRepoEllipsis: '打开仓库…',
    clearRecent: '清除记录',
    tooltip:
      '\n\n单击在新标签页中打开\nCtrl+单击在当前标签页打开\n右键从列表中移除',
    accelOpen: 'Ctrl+O'
  },
  branch: {
    noBranchesYet: '暂无分支',
    backTo: (branch: string) => `返回 ${branch}`,
    browseHint: '浏览其他分支的历史（不会 checkout）',
    headLabel: 'HEAD'
  },
  files: {
    workingTreeTitle: '工作树',
    commitTitle: (short: string, subject: string) =>
      `提交 ${short} — ${subject}`,
    snapshotTitle: (short: string, subject: string) =>
      `快照 ${short} — ${subject}`,
    rangeTitle: (from: string, to: string) =>
      `范围 ${from.slice(0, 8)}..${to.slice(0, 8)}`,
    backToWorkTree: '返回工作树',
    emptyWorktree: '工作树干净。',
    emptySnapshot: '此快照中没有文件。',
    emptyDiff: '此差异中没有文件。',
    lines: (n: number) => `${n} 行`
  },
  diff: {
    titleFallback: '差异',
    errorTitle: '错误',
    emptyWorktree: '工作树干净。',
    emptySnapshot: '选择一个文件以在此提交中查看。',
    emptyDiff: '无文本变更。',
    showWholeDiff: '显示完整差异',
    allShown: '已显示所有未提交的变更',
    allCommitShown: '已显示此提交中的所有文件',
    widenWorktree: '将差异展开至所有未提交的变更',
    widenCommit: '将差异展开至此提交中的所有文件',
    preview: '预览',
    viewImage: '查看图片',
    viewFile: '查看文件',
    previewTitle: '在差异旁以渲染模式打开此 Markdown 文件',
    viewImageTitle: '在差异旁显示此图片',
    viewFileTitle: '在差异旁打开完整文件',
    markdownSourceTitle: '改为显示 Markdown 源码',
    renderMarkdownTitle: '渲染此 Markdown 文件',
    expandAll: '全部展开',
    collapseAll: '全部折叠',
    expandAllTitle: '展开所有文件',
    collapseAllTitle: '将所有文件折叠为文件名',
    wrap: '折行',
    wrapLong: '折行显示长行',
    wrapCode: '折行显示代码块和表格',
    outline: '大纲',
    showOutline: '显示标题大纲',
    inline: '行内',
    sideBySide: '并排',
    switchView: '在行内和并排视图之间切换',
    docTabDiff: '差异',
    docTabDiffTitle: '差异',
    docTabClose: '关闭',
    dblClickFullScreen: '双击切换全屏',
    fileHeadingTooltip: (collapsed: boolean) =>
      `\n\n单击${collapsed ? '展开' : '折叠'}\nCtrl+单击在新标签页中打开\n右键查看更多`,
    loadMoreLines: (n: number) => `还有 ${n} 行 — 滚动或单击加载`
  },
  log: {
    commits: '提交',
    worktreeRow: '工作树 ',
    worktreeRowTitle: '工作树中未提交的变更',
    worktreeClean: '（干净）',
    worktreeUncommitted: (n: number) => `（${n} 个未提交）`,
    noCommitsYet: '暂无提交。',
    browsingAnother: '正在浏览其他分支',
    comparing2: '正在比较 2 个提交',
    openInBrowser: '在浏览器中打开',
    openRepoCommitsTitle: '在浏览器中打开此仓库的提交',
    clickToDismiss: '单击关闭',
    now: '现在',
    placeholder: '—',
    keyMove: ' 移动',
    keyShow: ' 显示',
    keyCompare: ' 比较',
    keyWorktree: ' 工作树',
    tooltipViews: ' 查看',
    tooltipMore: ' 更多'
  },
  pushPull: {
    push: '推送',
    pull: '拉取',
    pushing: '推送中…',
    pulling: '拉取中…',
    pushCount: (n: number) => `推送 ${n}`,
    pullCount: (n: number) => `拉取 ${n}`,
    publishTitle: (branch: string) =>
      `将 ${branch} 发布到 origin 并跟踪`,
    pushAhead: (ahead: number, branch: string, upstream: string) =>
      `推送 ${ahead} 个提交到 ${upstream}`,
    nothingToPush: (branch: string, upstream: string) =>
      `无需推送 — ${branch} 与 ${upstream} 一致`,
    pullNoUpstream: (branch: string) =>
      `${branch} 未跟踪任何分支 — 无处拉取`,
    pullBehind: (branch: string, upstream: string, behind: number) =>
      `快进 ${branch} 到 ${upstream}（落后 ${behind}）`,
    pullFastForward: (branch: string, upstream: string) =>
      `从 ${upstream} 获取并快进 ${branch}`
  },
  settings: {
    title: '设置',
    close: '关闭',
    appearance: '外观',
    view: '视图',
    theme: '主题',
    dark: '深色',
    light: '浅色',
    fontSize: '字号',
    rowHeight: '行高',
    diffLayout: '差异布局',
    inline: '行内',
    sideBySide: '并排',
    wordWrap: '自动折行',
    wordHighlight: '单词高亮',
    markdownOutline: 'Markdown 大纲',
    language: '语言',
    restoreDefaults: '恢复默认',
    done: '完成'
  },
  contextMenu: {
    copySelection: '复制选中内容',
    copySelectionAccel: 'Ctrl+C',
    copyMarkdownSource: '复制 Markdown 源码',
    copyFileContents: '复制文件内容',
    copyWholeDiff: '复制全部差异',
    enableWordWrap: '启用自动折行',
    disableWordWrap: '禁用自动折行',
    enableWordHighlight: '启用单词高亮',
    disableWordHighlight: '禁用单词高亮',
    showOutline: '显示大纲',
    hideOutline: '隐藏大纲',
    showDiffInstead: '改为显示差异',
    inlineView: '行内视图',
    sideBySideView: '并排视图',
    previewMarkdown: '预览 Markdown',
    viewFile: '查看文件',
    openInNewTab: (name: string) => `在新标签页中打开 ${name}`,
    openInNewTabAccel: 'Ctrl+单击',
    selectInFileList: '在文件列表中定位',
    copyRelativePath: '复制相对路径',
    copyAbsolutePath: '复制绝对路径',
    copyFileName: '复制文件名',
    openInSystemApp: '在系统应用中打开',
    revealInFileManager: '在文件管理器中显示',
    viewFileAccel: '双击',
    showCommitDiff: '显示提交差异',
    showCommitDiffAccel: 'Enter',
    copyCommitHash: '复制完整哈希',
    copyShortHash: '复制短哈希',
    copySubject: '复制标题',
    openInBrowser: '在浏览器中打开',
    copyCommitUrl: '复制提交 URL',
    browseSnapshot: '浏览快照',
    diffAgainstSelected: '与选中提交对比',
    diffAgainstAccel: 'Ctrl+单击'
  },
  paneChrome: {
    paneLabelFiles: '文件',
    paneLabelDiff: '差异',
    paneLabelLog: '提交',
    paneLabelTerminal: '终端',
    restoreLayout: (fullAccel: string) =>
      `还原布局（Esc、${fullAccel} 或双击标题栏）`,
    fillWindow: (fullAccel: string) =>
      `填满窗口（${fullAccel} 或双击标题栏）`,
    hidePane: (accel: string) =>
      `隐藏此窗格（${accel}）— 可通过标题栏中的"窗格"菜单恢复`,
    hidePaneTerminal: (accel: string) =>
      `隐藏此窗格（${accel}）— 可通过标题栏中的"窗格"菜单恢复 — Shell 将继续运行`,
    panesMenuNote: ' — Shell 将继续运行',
    showPane: (label: string) => `显示 ${label} 窗格`,
    hidePaneMenu: (label: string) => `隐藏 ${label} 窗格`,
    showAllPanes: '显示所有窗格',
    hidesThisPane: ' 隐藏此窗格',
    fillsTheWindow: ' 填满窗口',
    dblClickToggles: '双击标题栏切换全屏'
  },
  terminal: {
    title: '终端',
    starting: '启动中…',
    shellExited: (exitCode: number) =>
      `[Shell 已退出，退出码 ${exitCode}]`,
    closeTerminal: '关闭此终端',
    splitRight: '向右拆分 →',
    splitRightTitle: '向右拆分当前终端',
    splitDown: '向下拆分 ↓',
    splitDownTitle: '向下拆分当前终端',
    shellsKeepRunning: ' — Shell 将继续运行'
  },
  common: {
    close: '关闭',
    loading: '加载中…',
    binaryOrOversized: '二进制文件或文件过大。'
  },
  time: {
    today: '今天',
    yesterday: '昨天',
    daysAgo: (n: number) => `${n} 天前`,
    monthsAgo: (n: number) => `${Math.floor(n / 30)} 个月前`,
    yearsAgo: (n: number) => `${Math.floor(n / 365)} 年前`
  },
  image: {
    loading: '加载中…',
    clickToFit: '单击适应窗口',
    clickForActualSize: '单击查看原始尺寸'
  }
}
