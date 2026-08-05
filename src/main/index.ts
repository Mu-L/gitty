import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, shell } from 'electron'
import * as git from './git'
import { createTerminal, type TerminalSession } from './pty'
import { watchRepo, type RepoWatcher } from './watcher'
import type { DiffRequest } from '../shared/types'

let win: BrowserWindow | null = null
let term: TerminalSession | null = null
let watcher: RepoWatcher | null = null

/**
 * Repository to open on launch: $GITTY_REPO, else the first command-line
 * argument that names a directory (argv also holds the electron binary and,
 * when unpackaged, the entry script), else the cwd.
 */
function initialPath(): string {
  if (process.env.GITTY_REPO) return path.resolve(process.env.GITTY_REPO)
  for (const arg of process.argv.slice(1)) {
    if (arg.startsWith('-')) continue
    const candidate = path.resolve(arg)
    try {
      if (fs.statSync(candidate).isDirectory()) return candidate
    } catch {
      /* not a path we can use */
    }
  }
  return process.cwd()
}

/**
 * A minimal application menu. Without one, Chromium's edit accelerators
 * (Ctrl+C to copy selected diff text, Ctrl+A, …) are not bound at all.
 * The bar itself stays hidden; only the shortcuts matter here.
 */
function installMenu(): void {
  const isMac = process.platform === 'darwin'
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(isMac ? [{ role: 'appMenu' as const }] : []),
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Repository…',
            accelerator: 'CmdOrCtrl+O',
            click: () => win?.webContents.send('menu:open-repo')
          },
          {
            label: 'Settings…',
            accelerator: 'CmdOrCtrl+,',
            click: () => win?.webContents.send('menu:open-settings')
          },
          { type: 'separator' as const },
          isMac ? { role: 'close' as const } : { role: 'quit' as const }
        ]
      },
      { role: 'editMenu' as const },
      {
        label: 'View',
        submenu: [
          { role: 'reload' as const },
          { role: 'toggleDevTools' as const },
          { type: 'separator' as const },
          { role: 'resetZoom' as const },
          { role: 'zoomIn' as const },
          { role: 'zoomOut' as const },
          { type: 'separator' as const },
          { role: 'togglefullscreen' as const }
        ]
      }
    ])
  )
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#12141a',
    title: 'Gitty',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win?.show())
  win.on('closed', () => {
    term?.dispose()
    term = null
    watcher?.close()
    watcher = null
    win = null
  })

  // Open external links in the system browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  ipcMain.handle('repo:initial', () => initialPath())

  ipcMain.handle('repo:resolve', async (_e, cwd: string) => {
    try {
      return await git.resolveRepo(cwd)
    } catch {
      return null
    }
  })

  ipcMain.handle('repo:pick', async () => {
    if (!win) return null
    const res = await dialog.showOpenDialog(win, {
      title: 'Open Repository',
      properties: ['openDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) return null
    try {
      return await git.resolveRepo(res.filePaths[0])
    } catch {
      dialog.showErrorBox('Not a repository', `${res.filePaths[0]} is not inside a git work tree.`)
      return null
    }
  })

  ipcMain.handle('repo:watch', (_e, root: string) => {
    watcher?.close()
    watcher = watchRepo(root, () => {
      if (win && !win.isDestroyed()) win.webContents.send('repo:changed')
    })
    return true
  })

  ipcMain.handle('git:status', (_e, root: string) => git.status(root))
  ipcMain.handle('git:log', (_e, root: string, limit: number, skip: number) =>
    git.log(root, limit, skip)
  )
  ipcMain.handle('git:commitDetail', (_e, root: string, hash: string) =>
    git.commitDetail(root, hash)
  )
  ipcMain.handle('git:rangeFiles', (_e, root: string, from: string, to: string) =>
    git.rangeFiles(root, from, to)
  )
  ipcMain.handle('git:diff', (_e, root: string, req: DiffRequest) => git.diff(root, req))
  ipcMain.handle('git:snapshotFiles', (_e, root: string, hash: string) =>
    git.snapshotFiles(root, hash)
  )
  ipcMain.handle('git:snapshotFile', (_e, root: string, hash: string, filePath: string) =>
    git.snapshotFile(root, hash, filePath)
  )
  ipcMain.handle('git:snapshotOpen', async (_e, root: string, hash: string, filePath: string) => {
    const tmp = await git.snapshotWriteTemp(root, hash, filePath)
    return (await shell.openPath(tmp)) || null
  })

  ipcMain.handle('git:readWorking', (_e, root: string, filePath: string) =>
    git.readWorkingFile(root, filePath)
  )

  ipcMain.handle('file:openExternal', (_e, url: string) => {
    // Only ever hand real web links to the system browser.
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
  })

  ipcMain.handle('file:open', async (_e, abs: string) => {
    const err = await shell.openPath(abs)
    return err || null
  })
  ipcMain.handle('file:reveal', (_e, abs: string) => {
    shell.showItemInFolder(abs)
  })
  ipcMain.handle('clipboard:write', (_e, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('terminal:start', (e, root: string, cols: number, rows: number) => {
    term?.dispose()
    term = createTerminal(e.sender, root, cols, rows)
    return true
  })
  ipcMain.on('terminal:input', (_e, data: string) => term?.write(data))
  ipcMain.on('terminal:resize', (_e, cols: number, rows: number) => term?.resize(cols, rows))
}

app.whenReady().then(() => {
  registerIpc()
  installMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
