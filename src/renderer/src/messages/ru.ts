import type { RendererMessages } from '../../../shared/messages'

/**
 * Russian has three plural forms, picked by the last digits of the number —
 * "1 коммит", "2 коммита", "5 коммитов". Every count in this table goes
 * through here rather than through a bare `n === 1` test.
 */
function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = n % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export const ru: RendererMessages = {
  app: {
    title: 'Gitty',
    about: {
      title: 'О Gitty',
      version: (v: string) => `Версия ${v}`,
      author: (name: string) => `Автор: ${name}`,
      builtAt: (when: string) => `Сборка ${when}`,
      electron: (v: string) => `Electron ${v}`,
      chromium: (v: string) => `Chromium ${v}`,
      node: (v: string) => `Node.js ${v}`,
      github: 'GitHub',
      close: 'Закрыть'
    },
    settings: 'Настройки',
    openRepository: 'Открыть репозиторий',
    refresh: 'Обновить',
    refreshTitle: (accel: string) => `Обновить статус и журнал (${accel})`,
    menuTitle: (accel: string) => `Показать или скрыть меню (${accel})`,
    panes: 'Панели',
    noRepo: 'нет репозитория',
    noReposOpen: 'Нет открытых репозиториев.',
    recentlyOpened: 'Недавно открытые репозитории',
    showHidePanes: 'Показать или скрыть панели',
    changesCount: (n: number) =>
      `${n} ${plural(n, 'изменение', 'изменения', 'изменений')}`,
    notInWorkTree: (path: string) =>
      `${path} не находится в рабочем дереве git.`,
    notInWorkTreeHint: (path: string) =>
      `${path} не находится в рабочем дереве git. Воспользуйтесь пунктом «Открыть репозиторий».`
  },
  tab: {
    uncommittedChanges: (path: string) => `${path} — есть незакоммиченные изменения`,
    closeRepository: 'Закрыть репозиторий',
    openAnotherRepo: 'Открыть другой репозиторий'
  },
  recent: {
    noOtherRepos: 'Других репозиториев пока нет',
    openRepoEllipsis: 'Открыть репозиторий…',
    clearRecent: 'Очистить список',
    tooltip:
      '\n\nЩелчок — открыть в новой вкладке\nCtrl+щелчок — открыть в этой вкладке\nПравый щелчок — убрать из списка',
    accelOpen: 'Ctrl+O'
  },
  nav: {
    backTitle: 'Назад к предыдущему просмотренному месту (Alt+←)',
    forwardTitle: 'Вперёд, к месту, откуда вернулись (Alt+→)',
    historyTitle: 'Просмотренные места в этом репозитории, начиная с последнего',
    noHistory: 'Пока ничего не просмотрено',
    worktree: 'Рабочее дерево',
    worktreeFile: (path: string) => `${path} (рабочее дерево)`,
    commit: (short: string, subject: string) => `${short} — ${subject}`,
    commitFile: (path: string, short: string) => `${path} @ ${short}`,
    snapshot: (short: string, subject: string) => `${short} — ${subject} (снимок)`,
    snapshotFile: (path: string, short: string) => `${path} @ ${short} (снимок)`,
    range: (from: string, to: string) => `${from.slice(0, 8)}..${to.slice(0, 8)}`,
    rangeFile: (path: string, from: string, to: string) =>
      `${path} @ ${from.slice(0, 8)}..${to.slice(0, 8)}`,
    blame: (label: string) => `blame: ${label}`,
    fileHistory: (label: string) => `история: ${label}`,
    lineHistory: (path: string, start: number, end: number) =>
      `строки ${start}–${end} файла ${path}`,
    search: (pattern: string) => `поиск: ${pattern}`
  },
  branch: {
    noBranchesYet: 'Веток пока нет',
    backTo: (branch: string) => `Назад к ${branch}`,
    browseHint: 'Посмотреть историю другой ветки (переключения не происходит)',
    checkedOutHint: (branch: string) =>
      `Активная ветка: ${branch} — рабочее дерево, его различия и оболочки находятся на ней`,
    browsingHint: (branch: string) =>
      `Просмотр истории ветки ${branch} — она не переключена`,
    headLabel: 'HEAD'
  },
  files: {
    workingTreeTitle: 'Рабочее дерево',
    commitTitle: (short: string, subject: string) =>
      `Коммит ${short} — ${subject}`,
    snapshotTitle: (short: string, subject: string) =>
      `Снимок ${short} — ${subject}`,
    rangeTitle: (from: string, to: string) =>
      `Диапазон ${from.slice(0, 8)}..${to.slice(0, 8)}`,
    backToWorkTree: 'Назад к рабочему дереву',
    emptyWorktree: 'Рабочее дерево чистое.',
    emptySnapshot: 'В этом снимке нет файлов.',
    emptyDiff: 'В этом diff нет файлов.',
    lines: (n: number) => `${n} ${plural(n, 'строка', 'строки', 'строк')}`,
    toggleStage: (staged: boolean) =>
      staged ? 'Щёлкните, чтобы убрать файл из индекса' : 'Щёлкните, чтобы добавить файл в индекс',
    sendToAgent: 'Отправить',
    sendToAgentTitle: (command: string) =>
      `Выполнить «${command}» в терминале — по тому, что лежит в индексе`,
    agentCommandsTitle: 'Выберите команду для запуска',
    agentCommandTooltip:
      '\n\nЩелчок — запустить\n× убирает её из списка',
    agentForget: 'Убрать эту команду из списка',
    agentNewCommand: 'Новая команда…',
    agentPromptTitle: 'Отправить агенту',
    agentPromptRun: 'Запустить',
    agentPromptCancel: 'Отмена',
    agentCommandPlaceholder: 'команда, запускаемая в терминале',
    agentNoCommand:
      'Команда агента не задана. Выберите её в стрелке рядом с кнопкой.',
    agentNoTerminal: 'В этой вкладке нет оболочки, где её запустить.',
    search: 'Поиск',
    searchTitle: 'Искать по репозиторию через git grep',
    searchPlaceholder: 'Искать по репозиторию…',
    searchInRevision: (short: string) => `поиск в ${short}`,
    searchInWorktree: 'поиск в рабочем дереве',
    findModeTitle: 'Искать по репозиторию или отфильтровать этот список',
    filter: 'Фильтр',
    filterTitle: 'Фильтровать перечисленные файлы по пути',
    filterPlaceholder: 'Отфильтровать это дерево…',
    filterCount: (shown: number, total: number) => `${shown} из ${total}`,
    filterNone: 'нет совпадений',
    filterClear: 'Очистить фильтр'
  },
  diff: {
    titleFallback: 'Diff',
    errorTitle: 'ошибка',
    emptyWorktree: 'Рабочее дерево чистое.',
    emptySnapshot: 'Выберите файл, чтобы посмотреть его на этом коммите.',
    emptyDiff: 'Текстовых изменений нет.',
    emptyBrowseWorktree: 'Выберите файл, чтобы посмотреть его в рабочем дереве.',
    emptyBlame: 'Нет строк для вины.',
    emptyHistory: 'У этого файла пока нет истории.',
    showWholeDiff: 'Показать весь diff',
    allShown: 'Показаны все незакоммиченные изменения',
    allCommitShown: 'Показаны все файлы этого коммита',
    widenWorktree: 'Расширить diff до всех незакоммиченных изменений',
    widenCommit: 'Расширить diff до всех файлов этого коммита',
    preview: 'Предпросмотр',
    viewImage: 'Показать изображение',
    viewFile: 'Показать файл',
    previewTitle: 'Открыть этот markdown-файл в отрисованном виде рядом с diff',
    viewImageTitle: 'Показать это изображение рядом с diff',
    viewFileTitle: 'Открыть файл целиком рядом с diff',
    openLinkHint: 'Ctrl+щелчок — открыть этот файл в Gitty',
    markdownSourceTitle: 'Показать исходный markdown',
    renderMarkdownTitle: 'Отрисовать этот markdown-файл',
    htmlPreviewTitle: 'Открыть этот HTML-файл в режиме рендеринга',
    htmlSourceTitle: 'Показать исходный HTML',
    expandAll: 'Развернуть все',
    collapseAll: 'Свернуть все',
    expandAllTitle: 'Развернуть все файлы',
    collapseAllTitle: 'Свернуть все файлы до их имён',
    wrap: 'Перенос',
    wrapLong: 'Переносить длинные строки',
    wrapCode: 'Переносить блоки кода и таблицы',
    outline: 'Структура',
    showOutline: 'Показать структуру заголовков',
    showSymbols: 'Показать структуру символов',
    inline: 'В строку',
    sideBySide: 'Рядом',
    switchView: 'Переключиться между построчным видом и видом «рядом»',
    docTabDiff: 'Diff',
    docTabDiffTitle: 'Diff',
    docTabClose: 'Закрыть',
    docTabBlame: 'blame',
    docTabHistory: 'история',
    docTabLines: 'строки',
    docTabSearch: 'поиск',
    emptyLineHistory: 'Эти строки не трогал ни один коммит.',
    emptySearch: 'Совпадений нет.',
    searchHits: (n: number, files: number) =>
      `${n} ${plural(n, 'совпадение', 'совпадения', 'совпадений')} в ${files} ${plural(files, 'файле', 'файлах', 'файлах')}`,
    searchTruncated: (n: number) => `Остановлено на ${n} совпадениях — сузьте поиск.`,
    dblClickFullScreen: 'Двойной щелчок переключает полноэкранный режим',
    fileHeadingTooltip: (collapsed: boolean) =>
      `\n\nЩелчок — ${collapsed ? 'развернуть' : 'свернуть'}\nCtrl+щелчок — открыть в новой вкладке\nПравый щелчок — ещё действия`,
    loadMoreLines: (n: number) =>
      `Ещё ${n} ${plural(n, 'строка', 'строки', 'строк')} — прокрутите или щёлкните для загрузки`,
    stageHunk: 'В индекс',
    unstageHunk: 'Из индекса',
    stageHunkTitle: 'Положить этот фрагмент в индекс',
    unstageHunkTitle: 'Забрать этот фрагмент из индекса',
    stageSelection: (n: number) => `В индекс: ${n} ${plural(n, 'строка', 'строки', 'строк')}`,
    unstageSelection: (n: number) => `Из индекса: ${n} ${plural(n, 'строка', 'строки', 'строк')}`,
    stageSelectionTitle: 'Положить в индекс только выделенные строки',
    unstageSelectionTitle: 'Забрать из индекса только выделенные строки',
    sideUnstaged: 'Не в индексе',
    sideStaged: 'В индексе',
    sideUnstagedTitle: 'Показать то, что ещё не в индексе',
    sideStagedTitle: 'Показать то, что уже в индексе'
  },
  log: {
    commits: 'Коммиты',
    worktreeRow: 'Рабочее дерево ',
    worktreeRowTitle: 'Незакоммиченные изменения в рабочем дереве',
    worktreeClean: '(чисто)',
    worktreeUncommitted: (n: number) =>
      `(${n} ${plural(n, 'изменение', 'изменения', 'изменений')} не закоммичено)`,
    noCommitsYet: 'Коммитов пока нет.',
    filterPlaceholder: 'Фильтровать коммиты…',
    noMatches: 'Нет подходящих коммитов',
    clearFilter: 'Очистить фильтр',
    filterModeText: 'Сообщение / Автор',
    filterModeContent: 'Содержимое',
    filterModeRegex: 'Содержимое (regex)',
    filterModeTitle:
      'Что искать.\nСообщение / Автор: сообщение коммита и автор.\nСодержимое (-S): коммиты, в которых изменилось число вхождений строки, — где её добавили или убрали.\nСодержимое (regex) (-G): все коммиты, чей diff совпадает с выражением, включая те, где строку просто переместили.',
    searching: 'Поиск по диффам…',
    graph: 'Граф',
    graphTitle:
      'Рисовать дорожки рядом с хешами — где ветки расходятся и куда падают слияния',
    allBranches: 'Все ветки',
    allBranchesTitle:
      'Показать сразу все ветки, а не одну, на которую указывает журнал',
    browsingAnother: 'Просмотр другой ветки',
    comparing2: 'сравнение 2 коммитов',
    openInBrowser: 'Открыть в браузере',
    openRepoCommitsTitle: 'Открыть коммиты этого репозитория в браузере',
    gource: 'Gource',
    gourceStarting: 'Запуск…',
    gourceTitle: 'Проиграть анимацию истории этого репозитория в gource',
    clickToDismiss: 'Щёлкните, чтобы закрыть',
    now: 'сейчас',
    placeholder: '—',
    keyMove: ' перемещение',
    keyShow: ' показать',
    keyCompare: ' сравнить',
    keyWorktree: ' рабочее дерево',
    tooltipViews: ' виды',
    tooltipMore: ' ещё',
    moreTitle: 'Другие действия журнала',
    messageToggle: (collapsed: boolean) =>
      collapsed
        ? 'Показать полное сообщение коммита'
        : 'Скрыть полное сообщение коммита'
  },
  pushPull: {
    push: 'Push',
    pull: 'Pull',
    pushing: 'Отправка…',
    pulling: 'Получение…',
    pushCount: (n: number) => `Push ${n}`,
    pullCount: (n: number) => `Pull ${n}`,
    publishTitle: (branch: string) =>
      `Опубликовать ${branch} в origin и отслеживать её`,
    pushAhead: (ahead: number, branch: string, upstream: string) =>
      `Отправить ${ahead} ${plural(ahead, 'коммит', 'коммита', 'коммитов')} в ${upstream}`,
    nothingToPush: (branch: string, upstream: string) =>
      `Отправлять нечего — ${branch} совпадает с ${upstream}`,
    pullNoUpstream: (branch: string) =>
      `${branch} не отслеживает ветку — получать неоткуда`,
    pullBehind: (branch: string, upstream: string, behind: number) =>
      `Перемотать ${branch} до ${upstream} (отстаёт на ${behind})`,
    pullFastForward: (branch: string, upstream: string) =>
      `Получить и перемотать ${branch} из ${upstream}`
  },
  settings: {
    title: 'Настройки',
    close: 'Закрыть',
    appearance: 'Оформление',
    view: 'Вид',
    theme: 'Тема',
    dark: 'Тёмная',
    light: 'Светлая',
    fontSize: 'Размер шрифта',
    rowHeight: 'Высота строки',
    diffLayout: 'Раскладка diff',
    inline: 'В строку',
    sideBySide: 'Рядом',
    wordWrap: 'Перенос по словам',
    wordHighlight: 'Подсветка слов',
    commitGraph: 'Граф коммитов',
    documentOutline: 'Структура',
    markdownLineNumbers: 'Номера строк исходника markdown',
    fileSort: 'Сортировка файлов',
    sortNatural: 'Естественная',
    sortByte: 'По байтам',
    language: 'Язык',
    timeZone: 'Часовой пояс',
    systemTimeZone: (zone: string) => `Системный (${zone})`,
    timeFormat: 'Формат времени',
    absolute: 'Абсолютный',
    relative: 'Относительный',
    monoFont: 'Моноширинный шрифт',
    systemDefault: 'Системный по умолчанию',
    contextLines: 'Строк контекста',
    ignoreWhitespace: 'Игнорировать пробелы',
    whitespaceNone: 'Нет',
    whitespaceChange: 'Количество',
    whitespaceAll: 'Все',
    session: 'Сеанс',
    restoreTabs: 'Восстановить прошлый сеанс',
    shell: 'Оболочка',
    loginShell: 'Login-оболочка',
    restoreDefaults: 'Восстановить по умолчанию',
    done: 'Готово'
  },
  contextMenu: {
    copySelection: 'Копировать выделенное',
    copySelectionAccel: 'Ctrl+C',
    copyMarkdownSource: 'Копировать исходный markdown',
    copyFileContents: 'Копировать содержимое файла',
    copyWholeDiff: 'Копировать весь diff',
    enableWordWrap: 'Включить перенос по словам',
    disableWordWrap: 'Отключить перенос по словам',
    enableWordHighlight: 'Включить подсветку слов',
    disableWordHighlight: 'Отключить подсветку слов',
    showOutline: 'Показать структуру',
    hideOutline: 'Скрыть структуру',
    showDiffInstead: 'Показать вместо этого diff',
    inlineView: 'Построчный вид',
    sideBySideView: 'Вид «рядом»',
    previewMarkdown: 'Предпросмотр markdown',
    viewFile: 'Показать файл',
    openInNewTab: (name: string) => `Открыть ${name} в новой вкладке`,
    openInNewTabAccel: 'Ctrl+щелчок',
    selectInFileList: 'Выделить в списке файлов',
    copyRelativePath: 'Копировать относительный путь',
    copyAbsolutePath: 'Копировать абсолютный путь',
    copyFileName: 'Копировать имя файла',
    openInSystemApp: 'Открыть в системном приложении',
    revealInFileManager: 'Показать в файловом менеджере',
    deleteFile: 'Удалить файл…',
    stageFile: 'Добавить файл в индекс',
    unstageFile: 'Убрать файл из индекса',
    discardChanges: 'Отменить изменения…',
    copyStagedDiff: 'Скопировать diff индекса',
    viewFileAccel: 'Двойной щелчок',
    showCommitDiff: 'Показать diff коммита',
    showCommitDiffAccel: 'Enter',
    copyCommitHash: 'Копировать хеш коммита',
    copyShortHash: 'Копировать короткий хеш',
    copySubject: 'Копировать заголовок',
    openInBrowser: 'Открыть в браузере',
    copyCommitUrl: 'Копировать URL коммита',
    browseSnapshot: 'Просмотреть снимок',
    diffAgainstSelected: 'Сравнить с выбранным коммитом',
    diffAgainstAccel: 'Ctrl+щелчок',
    blameFile: 'Blame',
    fileHistory: 'История файла',
    lineHistory: 'История этих строк',
    browseWorktree: 'Просмотреть рабочее дерево'
  },
  paneChrome: {
    paneLabelFiles: 'Файлы',
    paneLabelDiff: 'Diff',
    restoreLayout: (fullAccel: string) =>
      `Восстановить раскладку (Esc, ${fullAccel} или двойной щелчок по заголовку)`,
    fillWindow: (fullAccel: string) =>
      `Развернуть на окно (${fullAccel} или двойной щелчок по заголовку)`,
    hidePane: (accel: string) =>
      `Скрыть эту панель (${accel}) — вернуть можно через «Панели» в строке заголовка`,
    hidePaneTerminal: (accel: string) =>
      `Скрыть эту панель (${accel}) — вернуть можно через «Панели» в строке заголовка — оболочки продолжают работать`,
    showPane: (label: string) => `Показать панель «${label}»`,
    hidePaneMenu: (label: string) => `Скрыть панель «${label}»`,
    showAllPanes: 'Показать все панели',
    hidesThisPane: ' скрывает эту панель',
    fillsTheWindow: ' разворачивает на окно',
    cyclesWhileFull: ' переходит к следующей панели, пока одна развёрнута на окно',
    dblClickToggles: 'Двойной щелчок по заголовку переключает полный экран'
  },
  terminal: {
    title: 'Терминал',
    starting: 'Запуск…',
    shellExited: (exitCode: number) =>
      `[оболочка завершилась с кодом ${exitCode}]`,
    closeTerminal: 'Закрыть этот терминал',
    splitRight: 'Разделить →',
    splitRightTitle: 'Разделить активный терминал вправо',
    splitDown: 'Разделить ↓',
    splitDownTitle: 'Разделить активный терминал вниз',
    shellsKeepRunning: ' — оболочки продолжают работать'
  },
  common: {
    loading: 'Загрузка…',
    binaryOrOversized: 'Двоичный или слишком большой файл.'
  },
  find: {
    placeholder: 'Поиск в документе',
    count: (i: number, n: number) => `${i} / ${n}`,
    noMatches: 'Нет совпадений',
    next: 'Следующее совпадение (Enter)',
    previous: 'Предыдущее совпадение (Shift+Enter)',
    close: 'Закрыть (Escape)'
  },
  time: {
    today: 'сегодня',
    yesterday: 'вчера',
    justNow: 'только что',
    minutesAgo: (n: number) => `${n} мин назад`,
    hoursAgo: (n: number) => `${n} ч назад`,
    daysAgo: (n: number) => `${n} дн. назад`,
    monthsAgo: (n: number) => `${Math.floor(n / 30)} мес. назад`,
    yearsAgo: (n: number) => `${Math.floor(n / 365)} г. назад`
  },
  image: {
    loading: 'Загрузка…',
    clickToFit: 'Щёлкните, чтобы вписать',
    clickForActualSize: 'Щёлкните для реального размера'
  }
}
