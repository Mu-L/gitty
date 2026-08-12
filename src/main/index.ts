import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeImage, shell } from 'electron'
import * as git from './git'
import * as gource from './gource'
import { createTerminal, type TerminalSession } from './pty'
import { addRecent, clearRecent, listRecent, removeRecent } from './recent'
import { watchRepo, type RepoWatcher } from './watcher'
import * as web from './web'
import type { ChurnSpec, DiffOptions, DiffRequest, TerminalOptions } from '../shared/types'
import { msg, setMainLocale } from './messages'

// Fixes the userData directory (~/.config/Gitty) rather than inheriting
// Electron's default name when running unpackaged.
app.setName('Gitty')

let win: BrowserWindow | null = null

// The renderer can split the terminal pane, so shells are keyed by the id it
// hands out rather than held one at a time.
const terms = new Map<string, TerminalSession>()

// Each open tab watches its own repository, so several may be watched at once.
const watchers = new Map<string, RepoWatcher>()

function disposeTerminal(id: string): void {
  terms.get(id)?.dispose()
  terms.delete(id)
}

function disposeAllTerminals(): void {
  for (const t of terms.values()) t.dispose()
  terms.clear()
}

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
        label: msg.menu.file,
        submenu: [
          {
            label: msg.menu.openRepo,
            accelerator: 'CmdOrCtrl+O',
            click: () => win?.webContents.send('menu:open-repo')
          },
          {
            label: msg.menu.settings,
            accelerator: 'CmdOrCtrl+,',
            click: () => win?.webContents.send('menu:open-settings')
          },
          { type: 'separator' as const },
          isMac ? { role: 'close' as const } : { role: 'quit' as const }
        ]
      },
      { role: 'editMenu' as const },
      {
        label: msg.menu.view,
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
  // BrowserWindow's icon shows on Linux and Windows; the macOS dock has its
  // own. Guard it in case the file is absent when running unpackaged.
  const icon = path.join(app.getAppPath(), 'build', 'icon.png')
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#12141a',
    title: msg.window.title,
    autoHideMenuBar: true,
    ...(fs.existsSync(icon) ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // The window is created hidden and shown at its first paint, so it never
  // appears empty. Under Wayland that frame can never come: an unmapped
  // window's renderer keeps its first frame to itself, 'ready-to-show' waits
  // for exactly that frame, and the window stays hidden for good — showing it
  // is what unblocks the paint it is waiting for. So the load event arms a
  // fallback; on a compositor that paints hidden windows the first paint has
  // long since won the race.
  const show = (): void => {
    if (win && !win.isDestroyed() && !win.isVisible()) win.show()
  }
  win.on('ready-to-show', show)
  win.webContents.once('did-finish-load', () => setTimeout(show, 1000))
  // A reload throws away the renderer's terminal ids, so its shells would
  // otherwise linger with nothing able to reach them.
  win.webContents.on('did-start-loading', disposeAllTerminals)

  win.on('closed', () => {
    disposeAllTerminals()
    for (const w of watchers.values()) w.close()
    watchers.clear()
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

  // The window icon doubles as the title-bar mark. The renderer cannot read
  // build/ for itself, so serve it as a data URL. Null when the PNG is absent
  // (e.g. running unpackaged from a tarball without build assets).
  ipcMain.handle('app:icon', () => {
    const icon = path.join(app.getAppPath(), 'build', 'icon.png')
    try {
      return `data:image/png;base64,${fs.readFileSync(icon).toString('base64')}`
    } catch {
      return null
    }
  })

  // The About dialog: version plus the runtimes the app is built on. A native
  // dialog like the delete confirmations, so it reads the same everywhere.
  // Unpackaged, getAppPath points at out/main, where no package.json lives —
  // app.getVersion() would report Electron's own version — so the version and
  // icon come from the repo root beside the bundle instead.
  ipcMain.handle('app:about', async () => {
    const root = path.resolve(__dirname, '..', '..')
    let version = app.getVersion()
    let author = ''
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(root, 'package.json'), 'utf8')
      ) as { version?: string; author?: string }
      if (pkg.version) version = pkg.version
      author = pkg.author ?? ''
    } catch {
      // Packaged: no manifest beside the bundle; app.getVersion() is right.
    }
    const iconPath = path.join(root, 'build', 'icon.png')
    const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined
    const versions = [
      msg.dialog.aboutVersion(version),
      msg.dialog.aboutElectron(process.versions.electron ?? ''),
      msg.dialog.aboutChromium(process.versions.chrome ?? ''),
      msg.dialog.aboutNode(process.versions.node ?? ''),
      '',
      author ? msg.dialog.aboutAuthor(author) : '',
      // The project's home page; a URL is not a translated string.
      'https://github.com/baojie/gitty'
    ]
      .filter(Boolean)
      .join('\n')
    await dialog.showMessageBox(win!, {
      type: 'info',
      title: msg.dialog.aboutTitle,
      message: msg.window.title,
      detail: versions,
      icon,
      buttons: [msg.dialog.okButton],
      defaultId: 0
    })
  })

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
      title: msg.dialog.openRepoTitle,
      properties: ['openDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) return null
    try {
      return await git.resolveRepo(res.filePaths[0])
    } catch {
      dialog.showErrorBox(msg.dialog.notARepo, msg.dialog.notInsideWorkTree(res.filePaths[0]))
      return null
    }
  })

  ipcMain.on('settings:setLocale', (_e, locale: string) => {
    setMainLocale(locale)
    installMenu()
  })

  ipcMain.handle('recent:list', () => listRecent())
  ipcMain.handle('recent:add', (_e, root: string) => addRecent(root))
  ipcMain.handle('recent:remove', (_e, root: string) => removeRecent(root))
  ipcMain.handle('recent:clear', () => clearRecent())

  ipcMain.handle('repo:watch', (_e, root: string) => {
    // Re-watching the same root replaces its watcher; others stay untouched.
    watchers.get(root)?.close()
    watchers.set(
      root,
      watchRepo(root, () => {
        if (win && !win.isDestroyed()) win.webContents.send('repo:changed', { root })
      })
    )
    // The web server serves any open repo; a re-open just re-registers it.
    web.registerRepo(root)
    return true
  })

  // A closed tab stops watching its repository; its terminals are already gone,
  // disposed by the renderer when the tab's terminal pane unmounts.
  ipcMain.handle('repo:close', (_e, root: string) => {
    watchers.get(root)?.close()
    watchers.delete(root)
    web.unregisterRepo(root)
    return true
  })

  ipcMain.handle('git:status', (_e, root: string) => git.status(root))
  ipcMain.handle(
    'git:log',
    (_e, root: string, limit: number, skip: number, ref: string | null, filter: string) =>
      git.log(root, limit, skip, ref, filter)
  )
  ipcMain.handle('git:branches', (_e, root: string) => git.branches(root))
  ipcMain.handle('git:push', (_e, root: string, branch: string | null) =>
    git.push(root, branch ?? undefined)
  )
  ipcMain.handle('git:pull', (_e, root: string) => git.pull(root))
  ipcMain.handle('git:commitDetail', (_e, root: string, hash: string) =>
    git.commitDetail(root, hash)
  )
  ipcMain.handle('git:commitMeta', (_e, root: string, hash: string) =>
    git.commitMeta(root, hash)
  )
  ipcMain.handle(
    'git:blame',
    (_e, root: string, rev: string | null, filePath: string) =>
      git.blame(root, rev, filePath)
  )
  ipcMain.handle(
    'git:fileHistory',
    (_e, root: string, rev: string | null, filePath: string) =>
      git.fileHistory(root, rev, filePath)
  )
  ipcMain.handle('git:rangeFiles', (_e, root: string, from: string, to: string) =>
    git.rangeFiles(root, from, to)
  )
  ipcMain.handle('git:diff', (_e, root: string, req: DiffRequest, opts?: DiffOptions) =>
    git.diff(root, req, opts)
  )
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

  ipcMain.handle('git:readImage', (_e, root: string, rev: string | null, filePath: string) =>
    git.readImageFile(root, rev, filePath)
  )

  ipcMain.handle(
    'git:fileLines',
    (_e, root: string, pairs: Array<{ rev: string | null; filePath: string }>) =>
      git.countFileLines(root, pairs)
  )

  ipcMain.handle('git:fileChurn', (_e, root: string, spec: ChurnSpec, opts?: DiffOptions) =>
    git.fileChurn(root, spec, opts)
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

  /**
   * Delete a file from the work tree. The path is resolved against the root and
   * checked, like every other path the renderer names, and it goes to the
   * system trash rather than being unlinked — a deletion made by a right-click
   * should be recoverable outside git as well as inside it. Confirmation is a
   * native dialog here rather than something the renderer draws, so the window
   * cannot be clicked past while it is up.
   */
  ipcMain.handle('file:trash', async (_e, root: string, filePath: string) => {
    const abs = path.resolve(root, filePath)
    if (abs === root || !abs.startsWith(root + path.sep)) return false
    const answer = await dialog.showMessageBox(win!, {
      type: 'warning',
      title: msg.dialog.deleteTitle,
      message: msg.dialog.deleteConfirm(path.basename(abs)),
      detail: msg.dialog.deleteDetail,
      buttons: [msg.dialog.cancelButton, msg.dialog.deleteButton],
      defaultId: 0,
      cancelId: 0
    })
    if (answer.response !== 1) return false
    try {
      await shell.trashItem(abs)
      return true
    } catch {
      // No trash to move it to — a repository on a mount without one, or a
      // system with no desktop trash at all. Ask again rather than report a
      // failure the user can do nothing about: the second ask says plainly
      // that the file is gone from disk.
      const again = await dialog.showMessageBox(win!, {
        type: 'warning',
        title: msg.dialog.deleteTitle,
        message: msg.dialog.deletePermanentConfirm(path.basename(abs)),
        detail: msg.dialog.deletePermanentDetail,
        buttons: [msg.dialog.cancelButton, msg.dialog.deletePermanentButton],
        defaultId: 0,
        cancelId: 0
      })
      if (again.response !== 1) return false
      try {
        await fs.promises.rm(abs)
        return true
      } catch (e) {
        dialog.showErrorBox(msg.dialog.deleteFailed, e instanceof Error ? e.message : String(e))
        return false
      }
    }
  })

  // Optional: the button is only rendered where gource is installed.
  ipcMain.handle('gource:available', () => gource.available())
  ipcMain.handle('gource:play', (_e, root: string) => gource.play(root))

  ipcMain.handle('web:repoUrl', (_e, root: string) => web.repoUrl(root))
  ipcMain.handle('web:commitUrl', (_e, root: string, hash: string) => web.commitUrl(root, hash))
  ipcMain.handle('clipboard:write', (_e, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle(
    'terminal:start',
    (e, id: string, root: string, cols: number, rows: number, opts?: TerminalOptions) => {
      disposeTerminal(id)
      terms.set(id, createTerminal(e.sender, id, root, cols, rows, opts))
      return true
    }
  )
  ipcMain.on('terminal:input', (_e, id: string, data: string) => terms.get(id)?.write(data))
  ipcMain.on('terminal:resize', (_e, id: string, cols: number, rows: number) =>
    terms.get(id)?.resize(cols, rows)
  )
  ipcMain.on('terminal:close', (_e, id: string) => disposeTerminal(id))
}

app.whenReady().then(async () => {
  // The web server must be up before the renderer can ask for URLs.
  await web.start()
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

app.on('will-quit', () => {
  web.stop()
})
