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

const ja: MainMessages = {
  menu: {
    file: 'ファイル',
    openRepo: 'リポジトリを開く…',
    settings: '設定…',
    view: '表示'
  },
  dialog: {
    openRepoTitle: 'リポジトリを開く',
    notARepo: 'リポジトリではありません',
    notInsideWorkTree: (path: string) =>
      `${path} は git ワークツリー内にありません。`
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'ワークツリー',
    diffTruncated: '差分を省略しました — 2 MB を超えています。',
    untrackedOmitted: (n: number) => `未追跡ファイルがあと ${n} 件あります。`,
    notAnImage: '画像ではありません。',
    imageTooLarge: '画像が大きすぎてプレビューできません。',
    done: '完了しました。',
    gitFailed: 'git の実行に失敗しました',
    pathEscapesRepo: 'パスがリポジトリの外を指しています',
    changesCount: (n: number) => `${n} 件の変更`,
    untrackedLabel: '未追跡',
    stagedLabel: 'ステージ済み',
    unstagedLabel: '未ステージ'
  }
}

const ko: MainMessages = {
  menu: {
    file: '파일',
    openRepo: '저장소 열기…',
    settings: '설정…',
    view: '보기'
  },
  dialog: {
    openRepoTitle: '저장소 열기',
    notARepo: '저장소가 아닙니다',
    notInsideWorkTree: (path: string) =>
      `${path}은(는) git 작업 트리 안에 없습니다.`
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: '작업 트리',
    diffTruncated: 'diff가 잘렸습니다 — 2 MB보다 큽니다.',
    untrackedOmitted: (n: number) => `표시하지 않은 추적되지 않는 파일 ${n}개.`,
    notAnImage: '이미지가 아닙니다.',
    imageTooLarge: '이미지가 너무 커서 미리 볼 수 없습니다.',
    done: '완료했습니다.',
    gitFailed: 'git 실행 실패',
    pathEscapesRepo: '경로가 저장소를 벗어납니다',
    changesCount: (n: number) => `${n}개 변경됨`,
    untrackedLabel: '추적 안 함',
    stagedLabel: '스테이지됨',
    unstagedLabel: '스테이지 안 함'
  }
}

const fr: MainMessages = {
  menu: {
    file: 'Fichier',
    openRepo: 'Ouvrir un dépôt…',
    settings: 'Paramètres…',
    view: 'Affichage'
  },
  dialog: {
    openRepoTitle: 'Ouvrir un dépôt',
    notARepo: 'Pas un dépôt',
    notInsideWorkTree: (path: string) =>
      `${path} n'est pas dans une copie de travail git.`
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Copie de travail',
    diffTruncated: 'Diff tronqué — plus de 2 Mo.',
    untrackedOmitted: (n: number) =>
      `${n} fichier${n === 1 ? '' : 's'} non suivi${n === 1 ? '' : 's'} de plus non affiché${n === 1 ? '' : 's'}.`,
    notAnImage: 'Ce n’est pas une image.',
    imageTooLarge: 'Image trop grande pour un aperçu.',
    done: 'Terminé.',
    gitFailed: 'échec de git',
    pathEscapesRepo: 'le chemin sort du dépôt',
    changesCount: (n: number) => `${n} modifié${n === 1 ? '' : 's'}`,
    untrackedLabel: 'non suivi',
    stagedLabel: 'indexé',
    unstagedLabel: 'non indexé'
  }
}

const de: MainMessages = {
  menu: {
    file: 'Datei',
    openRepo: 'Repository öffnen…',
    settings: 'Einstellungen…',
    view: 'Ansicht'
  },
  dialog: {
    openRepoTitle: 'Repository öffnen',
    notARepo: 'Kein Repository',
    notInsideWorkTree: (path: string) =>
      `${path} liegt nicht in einem Git-Arbeitsverzeichnis.`
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Arbeitsverzeichnis',
    diffTruncated: 'Diff gekürzt — größer als 2 MB.',
    untrackedOmitted: (n: number) =>
      `${n} weitere nicht verfolgte Dateien werden nicht angezeigt.`,
    notAnImage: 'Kein Bild.',
    imageTooLarge: 'Bild zu groß für eine Vorschau.',
    done: 'Fertig.',
    gitFailed: 'git fehlgeschlagen',
    pathEscapesRepo: 'Pfad verlässt das Repository',
    changesCount: (n: number) => `${n} geändert`,
    untrackedLabel: 'nicht verfolgt',
    stagedLabel: 'vorgemerkt',
    unstagedLabel: 'nicht vorgemerkt'
  }
}

const es: MainMessages = {
  menu: {
    file: 'Archivo',
    openRepo: 'Abrir repositorio…',
    settings: 'Ajustes…',
    view: 'Vista'
  },
  dialog: {
    openRepoTitle: 'Abrir repositorio',
    notARepo: 'No es un repositorio',
    notInsideWorkTree: (path: string) =>
      `${path} no está dentro de un árbol de trabajo de git.`
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Árbol de trabajo',
    diffTruncated: 'Diff truncado — supera los 2 MB.',
    untrackedOmitted: (n: number) =>
      `${n} archivo${n === 1 ? '' : 's'} sin seguimiento más que no se muestra${n === 1 ? '' : 'n'}.`,
    notAnImage: 'No es una imagen.',
    imageTooLarge: 'La imagen es demasiado grande para previsualizarla.',
    done: 'Hecho.',
    gitFailed: 'git falló',
    pathEscapesRepo: 'la ruta se sale del repositorio',
    changesCount: (n: number) => `${n} cambiado${n === 1 ? '' : 's'}`,
    untrackedLabel: 'sin seguimiento',
    stagedLabel: 'preparado',
    unstagedLabel: 'sin preparar'
  }
}

const ru: MainMessages = {
  menu: {
    file: 'Файл',
    openRepo: 'Открыть репозиторий…',
    settings: 'Настройки…',
    view: 'Вид'
  },
  dialog: {
    openRepoTitle: 'Открыть репозиторий',
    notARepo: 'Это не репозиторий',
    notInsideWorkTree: (path: string) =>
      `${path} не находится в рабочем дереве git.`
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Рабочее дерево',
    diffTruncated: 'Diff обрезан — больше 2 МБ.',
    untrackedOmitted: (n: number) => `Ещё ${n} неотслеживаемых файлов не показано.`,
    notAnImage: 'Это не изображение.',
    imageTooLarge: 'Изображение слишком велико для предпросмотра.',
    done: 'Готово.',
    gitFailed: 'git завершился с ошибкой',
    pathEscapesRepo: 'путь выходит за пределы репозитория',
    changesCount: (n: number) => `${n} изменено`,
    untrackedLabel: 'не отслеживается',
    stagedLabel: 'проиндексировано',
    unstagedLabel: 'не проиндексировано'
  }
}

const pt: MainMessages = {
  menu: {
    file: 'Ficheiro',
    openRepo: 'Abrir repositório…',
    settings: 'Definições…',
    view: 'Vista'
  },
  dialog: {
    openRepoTitle: 'Abrir repositório',
    notARepo: 'Não é um repositório',
    notInsideWorkTree: (path: string) =>
      `${path} não está dentro de uma árvore de trabalho do git.`
  },
  window: {
    title: 'Gitty'
  },
  git: {
    workingTree: 'Árvore de trabalho',
    diffTruncated: 'Diff truncado — maior do que 2 MB.',
    untrackedOmitted: (n: number) =>
      `Mais ${n} ficheiro${n === 1 ? '' : 's'} não seguido${n === 1 ? '' : 's'} que não ${n === 1 ? 'é mostrado' : 'são mostrados'}.`,
    notAnImage: 'Não é uma imagem.',
    imageTooLarge: 'Imagem demasiado grande para pré-visualizar.',
    done: 'Concluído.',
    gitFailed: 'o git falhou',
    pathEscapesRepo: 'o caminho sai do repositório',
    changesCount: (n: number) => `${n} alterado${n === 1 ? '' : 's'}`,
    untrackedLabel: 'não seguido',
    stagedLabel: 'preparado',
    unstagedLabel: 'não preparado'
  }
}

const ALL: Record<string, MainMessages> = { en, zh, ja, ko, fr, de, es, ru, pt }

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
