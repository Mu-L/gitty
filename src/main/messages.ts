import type { MainMessages } from '../shared/messages'

// ── Language tables ─────────────────────────────────────────────────────────

const en: MainMessages = {
  menu: {
    file: 'File',
    openRepo: 'Open Repository…',
    settings: 'Settings…',
    view: 'View'
  },
  dialog: {
    openRepoTitle: 'Open Repository',
    notARepo: 'Not a repository',
    notInsideWorkTree: (path: string) =>
      `${path} is not inside a git work tree.`
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Working tree',
    diffTruncated: 'Diff truncated — larger than 2 MB.',
    untrackedOmitted: (n: number) => `${n} more untracked files not shown.`,
    notAnImage: 'Not an image.',
    imageTooLarge: 'Image too large to preview.',
    done: 'Done.',
    gitFailed: 'git failed',
    pathEscapesRepo: 'path escapes the repository',
    changesCount: (n: number) => `${n} changed`,
    untrackedLabel: 'untracked',
    stagedLabel: 'staged',
    unstagedLabel: 'unstaged'
  }
}

const zh: MainMessages = {
  menu: {
    file: '文件',
    openRepo: '打开仓库…',
    settings: '设置…',
    view: '视图'
  },
  dialog: {
    openRepoTitle: '打开仓库',
    notARepo: '不是仓库',
    notInsideWorkTree: (path: string) =>
      `${path} 不在 git 工作树中。`
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: '工作树',
    diffTruncated: '差异已截断 — 大于 2 MB。',
    untrackedOmitted: (n: number) => `还有 ${n} 个未跟踪文件未显示。`,
    notAnImage: '不是图片。',
    imageTooLarge: '图片过大，无法预览。',
    done: '完成。',
    gitFailed: 'git 执行失败',
    pathEscapesRepo: '路径超出仓库范围',
    changesCount: (n: number) => `${n} 个变更`,
    untrackedLabel: '未跟踪',
    stagedLabel: '已暂存',
    unstagedLabel: '未暂存'
  }
}

const ALL: Record<string, MainMessages> = { en, zh }

// ── Runtime switching ───────────────────────────────────────────────────────

let current: MainMessages = en

export function setMainLocale(locale: string): void {
  current = ALL[locale] ?? en
}

/**
 * Proxy that forwards every access to the current language table. Menu
 * labels, dialog text and notices all read through this — so changing
 * `current` changes what they see without restarting the app.
 */
export const msg = new Proxy({} as MainMessages, {
  get(_target, key: string) {
    return (current as unknown as Record<string, unknown>)[key]
  }
})
