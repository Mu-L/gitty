import type { MainMessages } from '../shared/messages'

export const msg: MainMessages = {
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
