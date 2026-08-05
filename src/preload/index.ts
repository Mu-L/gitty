import { contextBridge, ipcRenderer } from 'electron'
import type {
  Commit,
  CommitDetail,
  CommitFile,
  DiffRequest,
  DiffResult,
  PtyExit,
  RepoStatus,
  SnapshotFileContent
} from '../shared/types'

const api = {
  repo: {
    initial: (): Promise<string> => ipcRenderer.invoke('repo:initial'),
    resolve: (cwd: string): Promise<string | null> => ipcRenderer.invoke('repo:resolve', cwd),
    pick: (): Promise<string | null> => ipcRenderer.invoke('repo:pick'),
    watch: (root: string): Promise<boolean> => ipcRenderer.invoke('repo:watch', root),
    onChanged: (cb: () => void): (() => void) => {
      const h = (): void => cb()
      ipcRenderer.on('repo:changed', h)
      return () => ipcRenderer.removeListener('repo:changed', h)
    },
    /** Fired by the File ▸ Open Repository menu item. */
    onMenuOpen: (cb: () => void): (() => void) => {
      const h = (): void => cb()
      ipcRenderer.on('menu:open-repo', h)
      return () => ipcRenderer.removeListener('menu:open-repo', h)
    }
  },
  git: {
    status: (root: string): Promise<RepoStatus> => ipcRenderer.invoke('git:status', root),
    log: (root: string, limit: number, skip = 0): Promise<Commit[]> =>
      ipcRenderer.invoke('git:log', root, limit, skip),
    commitDetail: (root: string, hash: string): Promise<CommitDetail> =>
      ipcRenderer.invoke('git:commitDetail', root, hash),
    rangeFiles: (root: string, from: string, to: string): Promise<CommitFile[]> =>
      ipcRenderer.invoke('git:rangeFiles', root, from, to),
    diff: (root: string, req: DiffRequest): Promise<DiffResult> =>
      ipcRenderer.invoke('git:diff', root, req),
    snapshotFiles: (root: string, hash: string): Promise<string[]> =>
      ipcRenderer.invoke('git:snapshotFiles', root, hash),
    snapshotFile: (root: string, hash: string, filePath: string): Promise<SnapshotFileContent> =>
      ipcRenderer.invoke('git:snapshotFile', root, hash, filePath),
    snapshotOpen: (root: string, hash: string, filePath: string): Promise<string | null> =>
      ipcRenderer.invoke('git:snapshotOpen', root, hash, filePath)
  },
  file: {
    open: (abs: string): Promise<string | null> => ipcRenderer.invoke('file:open', abs),
    reveal: (abs: string): Promise<void> => ipcRenderer.invoke('file:reveal', abs)
  },
  clipboard: {
    write: (text: string): Promise<void> => ipcRenderer.invoke('clipboard:write', text)
  },
  terminal: {
    start: (root: string, cols: number, rows: number): Promise<boolean> =>
      ipcRenderer.invoke('terminal:start', root, cols, rows),
    input: (data: string): void => ipcRenderer.send('terminal:input', data),
    resize: (cols: number, rows: number): void => ipcRenderer.send('terminal:resize', cols, rows),
    onData: (cb: (data: string) => void): (() => void) => {
      const h = (_e: unknown, data: string): void => cb(data)
      ipcRenderer.on('terminal:data', h)
      return () => ipcRenderer.removeListener('terminal:data', h)
    },
    onExit: (cb: (info: PtyExit) => void): (() => void) => {
      const h = (_e: unknown, info: PtyExit): void => cb(info)
      ipcRenderer.on('terminal:exit', h)
      return () => ipcRenderer.removeListener('terminal:exit', h)
    }
  }
}

export type GittyApi = typeof api

contextBridge.exposeInMainWorld('gitty', api)
