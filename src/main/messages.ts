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
      `${path} is not inside a git work tree.`,
    deleteTitle: 'Delete File',
    deleteConfirm: (name: string) => `Move ${name} to the trash?`,
    deleteDetail:
      'The file goes to the system trash, and the work tree shows it as deleted.',
    deleteButton: 'Delete',
    cancelButton: 'Cancel',
    deleteFailed: 'Could not delete the file',
    deletePermanentConfirm: (name: string) => `Delete ${name} permanently?`,
    deletePermanentDetail:
      'This system has no trash to move it to. A tracked file can still be restored with git; an untracked one cannot.',
    deletePermanentButton: 'Delete Permanently',
    aboutTitle: 'About Gitty',
    aboutVersion: (v: string) => `Version ${v}`,
    aboutElectron: (v: string) => `Electron ${v}`,
    aboutChromium: (v: string) => `Chromium ${v}`,
    aboutNode: (v: string) => `Node.js ${v}`,
    okButton: 'OK'
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
  },
  gource: {
    failed: 'gource failed',
    notInstalled: 'gource is not installed.'
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
      `${path} 不在 git 工作树中。`,
    deleteTitle: '删除文件',
    deleteConfirm: (name: string) => `将 ${name} 移到回收站？`,
    deleteDetail: '文件会被移到系统回收站，工作树中显示为已删除。',
    deleteButton: '删除',
    cancelButton: '取消',
    deleteFailed: '无法删除该文件',
    deletePermanentConfirm: (name: string) => `永久删除 ${name}？`,
    deletePermanentDetail:
      '本系统没有可用的回收站。已跟踪的文件仍可用 git 恢复，未跟踪的则无法恢复。',
    deletePermanentButton: '永久删除',
    aboutTitle: '关于 Gitty',
    aboutVersion: (v: string) => `版本 ${v}`,
    aboutElectron: (v: string) => `Electron ${v}`,
    aboutChromium: (v: string) => `Chromium ${v}`,
    aboutNode: (v: string) => `Node.js ${v}`,
    okButton: '确定'
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
  },
  gource: {
    failed: 'gource 运行失败',
    notInstalled: 'gource 未安装。'
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
      `${path} は git ワークツリー内にありません。`,
    deleteTitle: 'ファイルを削除',
    deleteConfirm: (name: string) => `${name} をゴミ箱に移動しますか？`,
    deleteDetail:
      'ファイルはシステムのゴミ箱に移動し、ワークツリーでは削除として表示されます。',
    deleteButton: '削除',
    cancelButton: 'キャンセル',
    deleteFailed: 'ファイルを削除できませんでした',
    deletePermanentConfirm: (name: string) => `${name} を完全に削除しますか？`,
    deletePermanentDetail:
      'このシステムには移動先のゴミ箱がありません。追跡されているファイルは git で復元できますが、追跡されていないファイルは復元できません。',
    deletePermanentButton: '完全に削除',
    aboutTitle: 'Gitty について',
    aboutVersion: (v: string) => `バージョン ${v}`,
    aboutElectron: (v: string) => `Electron ${v}`,
    aboutChromium: (v: string) => `Chromium ${v}`,
    aboutNode: (v: string) => `Node.js ${v}`,
    okButton: 'OK'
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
  },
  gource: {
    failed: 'gource の実行に失敗しました',
    notInstalled: 'gource がインストールされていません。'
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
      `${path}은(는) git 작업 트리 안에 없습니다.`,
    deleteTitle: '파일 삭제',
    deleteConfirm: (name: string) => `${name}을(를) 휴지통으로 옮길까요?`,
    deleteDetail: '파일은 시스템 휴지통으로 이동하고, 작업 트리에는 삭제로 표시됩니다.',
    deleteButton: '삭제',
    cancelButton: '취소',
    deleteFailed: '파일을 삭제할 수 없습니다',
    deletePermanentConfirm: (name: string) => `${name}을(를) 영구히 삭제할까요?`,
    deletePermanentDetail:
      '이 시스템에는 옮길 휴지통이 없습니다. 추적되는 파일은 git으로 되돌릴 수 있지만, 추적되지 않는 파일은 되돌릴 수 없습니다.',
    deletePermanentButton: '영구 삭제',
    aboutTitle: 'Gitty 정보',
    aboutVersion: (v: string) => `버전 ${v}`,
    aboutElectron: (v: string) => `Electron ${v}`,
    aboutChromium: (v: string) => `Chromium ${v}`,
    aboutNode: (v: string) => `Node.js ${v}`,
    okButton: '확인'
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
  },
  gource: {
    failed: 'gource 실행 실패',
    notInstalled: 'gource가 설치되어 있지 않습니다.'
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
      `${path} n'est pas dans une copie de travail git.`,
    deleteTitle: 'Supprimer le fichier',
    deleteConfirm: (name: string) => `Mettre ${name} à la corbeille ?`,
    deleteDetail:
      "Le fichier part à la corbeille du système, et la copie de travail l'affiche comme supprimé.",
    deleteButton: 'Supprimer',
    cancelButton: 'Annuler',
    deleteFailed: 'Impossible de supprimer le fichier',
    deletePermanentConfirm: (name: string) => `Supprimer ${name} définitivement ?`,
    deletePermanentDetail:
      "Ce système n'a pas de corbeille où le déplacer. Un fichier suivi reste récupérable avec git ; un fichier non suivi, non.",
    deletePermanentButton: 'Supprimer définitivement',
    aboutTitle: 'À propos de Gitty',
    aboutVersion: (v: string) => `Version ${v}`,
    aboutElectron: (v: string) => `Electron ${v}`,
    aboutChromium: (v: string) => `Chromium ${v}`,
    aboutNode: (v: string) => `Node.js ${v}`,
    okButton: 'OK'
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
  },
  gource: {
    failed: 'échec de gource',
    notInstalled: 'gource n’est pas installé.'
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
      `${path} liegt nicht in einem Git-Arbeitsverzeichnis.`,
    deleteTitle: 'Datei löschen',
    deleteConfirm: (name: string) => `${name} in den Papierkorb verschieben?`,
    deleteDetail:
      'Die Datei wandert in den Papierkorb des Systems, im Arbeitsverzeichnis erscheint sie als gelöscht.',
    deleteButton: 'Löschen',
    cancelButton: 'Abbrechen',
    deleteFailed: 'Die Datei konnte nicht gelöscht werden',
    deletePermanentConfirm: (name: string) => `${name} endgültig löschen?`,
    deletePermanentDetail:
      'Dieses System hat keinen Papierkorb, in den sie verschoben werden könnte. Eine versionierte Datei lässt sich mit git wiederherstellen, eine unversionierte nicht.',
    deletePermanentButton: 'Endgültig löschen',
    aboutTitle: 'Über Gitty',
    aboutVersion: (v: string) => `Version ${v}`,
    aboutElectron: (v: string) => `Electron ${v}`,
    aboutChromium: (v: string) => `Chromium ${v}`,
    aboutNode: (v: string) => `Node.js ${v}`,
    okButton: 'OK'
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
  },
  gource: {
    failed: 'gource fehlgeschlagen',
    notInstalled: 'gource ist nicht installiert.'
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
      `${path} no está dentro de un árbol de trabajo de git.`,
    deleteTitle: 'Eliminar archivo',
    deleteConfirm: (name: string) => `¿Mover ${name} a la papelera?`,
    deleteDetail:
      'El archivo va a la papelera del sistema, y el árbol de trabajo lo muestra como eliminado.',
    deleteButton: 'Eliminar',
    cancelButton: 'Cancelar',
    deleteFailed: 'No se pudo eliminar el archivo',
    deletePermanentConfirm: (name: string) => `¿Eliminar ${name} de forma permanente?`,
    deletePermanentDetail:
      'Este sistema no tiene papelera a la que moverlo. Un archivo versionado se puede recuperar con git; uno sin seguimiento, no.',
    deletePermanentButton: 'Eliminar permanentemente',
    aboutTitle: 'Acerca de Gitty',
    aboutVersion: (v: string) => `Versión ${v}`,
    aboutElectron: (v: string) => `Electron ${v}`,
    aboutChromium: (v: string) => `Chromium ${v}`,
    aboutNode: (v: string) => `Node.js ${v}`,
    okButton: 'Aceptar'
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
  },
  gource: {
    failed: 'gource falló',
    notInstalled: 'gource no está instalado.'
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
      `${path} не находится в рабочем дереве git.`,
    deleteTitle: 'Удалить файл',
    deleteConfirm: (name: string) => `Переместить ${name} в корзину?`,
    deleteDetail:
      'Файл отправится в системную корзину, а в рабочем дереве появится как удалённый.',
    deleteButton: 'Удалить',
    cancelButton: 'Отмена',
    deleteFailed: 'Не удалось удалить файл',
    deletePermanentConfirm: (name: string) => `Удалить ${name} безвозвратно?`,
    deletePermanentDetail:
      'В этой системе нет корзины, куда его переместить. Отслеживаемый файл можно вернуть через git, неотслеживаемый — нет.',
    deletePermanentButton: 'Удалить безвозвратно',
    aboutTitle: 'О Gitty',
    aboutVersion: (v: string) => `Версия ${v}`,
    aboutElectron: (v: string) => `Electron ${v}`,
    aboutChromium: (v: string) => `Chromium ${v}`,
    aboutNode: (v: string) => `Node.js ${v}`,
    okButton: 'ОК'
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
  },
  gource: {
    failed: 'gource завершился с ошибкой',
    notInstalled: 'gource не установлен.'
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
      `${path} não está dentro de uma árvore de trabalho do git.`,
    deleteTitle: 'Eliminar ficheiro',
    deleteConfirm: (name: string) => `Mover ${name} para o lixo?`,
    deleteDetail:
      'O ficheiro vai para o lixo do sistema, e a árvore de trabalho mostra-o como eliminado.',
    deleteButton: 'Eliminar',
    cancelButton: 'Cancelar',
    deleteFailed: 'Não foi possível eliminar o ficheiro',
    deletePermanentConfirm: (name: string) => `Eliminar ${name} definitivamente?`,
    deletePermanentDetail:
      'Este sistema não tem lixo para onde o mover. Um ficheiro versionado ainda pode ser recuperado com git; um não versionado, não.',
    deletePermanentButton: 'Eliminar definitivamente',
    aboutTitle: 'Sobre o Gitty',
    aboutVersion: (v: string) => `Versão ${v}`,
    aboutElectron: (v: string) => `Electron ${v}`,
    aboutChromium: (v: string) => `Chromium ${v}`,
    aboutNode: (v: string) => `Node.js ${v}`,
    okButton: 'OK'
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
  },
  gource: {
    failed: 'gource falhou',
    notInstalled: 'gource não está instalado.'
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
