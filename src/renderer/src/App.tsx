import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX
} from 'react'
import { ContextMenu, type MenuItem, type MenuState } from './components/ContextMenu'
import { SettingsPane, type Theme } from './components/SettingsPane'
import type { RepoTabHandle } from './RepoTab'

// The whole tab content is its own chunk, so the app shell — title bar, tab
// bar, empty state — paints before any pane code has loaded. The heavy panes
// inside it (terminal, opened files) are lazy again, one level down.
const RepoTab = lazy(() => import('./RepoTab').then((m) => ({ default: m.RepoTab })))
import {
  ALL_PANES,
  ALL_PANES_ACCEL,
  paneLabels,
  PANE_ORDER,
  loadPanes,
  paneAccel,
  visibleCount,
  type PaneId,
  type PaneVisibility
} from './panes'
import { navLabel, type NavHistory } from './nav'
import type { DiffView } from './components/DiffPane'
import type { Branch, RepoStatus } from '../../shared/types'
import { LocaleProvider, loadLocale, type Locale } from './locale'
import { TimeZoneProvider, loadTimeZone, SYSTEM_TZ, type TimeZone } from './timezone'
import { ALL_LOCALES } from './locale'
import { getMessages } from './messages'

export default function App(): JSX.Element {
  const [locale, setLocale] = useState<Locale>(loadLocale)
  const msg = getMessages(locale)
  const [roots, setRoots] = useState<string[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [statusByRoot, setStatusByRoot] = useState<Record<string, RepoStatus>>({})
  // Branch each tab is browsing; absent means its checked-out one. Kept here
  // rather than in RepoTab because the title bar is where it is chosen.
  const [browsingByRoot, setBrowsingByRoot] = useState<Record<string, string>>({})
  // Each tab's browsing history, reported up so the title bar's back, forward
  // and history buttons can act on the tab the user is looking at.
  const [navByRoot, setNavByRoot] = useState<Record<string, NavHistory>>({})
  const tabRefs = useRef<Record<string, RepoTabHandle | null>>({})

  // Preferences are app-wide: changing the theme or row height touches every
  // open repository's panes.
  const [wrap, setWrap] = useState(() => localStorage.getItem('gitty.wrap') !== 'off')
  const [diffView, setDiffView] = useState<DiffView>(
    () => (localStorage.getItem('gitty.diffView') as DiffView | null) ?? 'inline'
  )
  // Word-level highlighting is on by default; fine-grained changes stand out.
  const [wordDiff, setWordDiff] = useState(() => localStorage.getItem('gitty.wordDiff') !== 'off')
  const [mdOutline, setMdOutline] = useState(
    () => localStorage.getItem('gitty.mdOutline') !== 'off'
  )
  const [panes, setPanes] = useState<PaneVisibility>(loadPanes)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('gitty.theme') === 'light' ? 'light' : 'dark')
  )
  const [fontSize, setFontSize] = useState(() => {
    const v = Number(localStorage.getItem('gitty.fontSize'))
    return Number.isFinite(v) ? Math.min(16, Math.max(11, v)) : 12.5
  })
  const [rowHeight, setRowHeight] = useState(() => {
    const v = Number(localStorage.getItem('gitty.rowHeight'))
    return Number.isFinite(v) ? Math.min(26, Math.max(18, v)) : 20
  })
  const [timeZone, setTimeZone] = useState<TimeZone>(loadTimeZone)
  const [recent, setRecent] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  // The four-pane icon, fetched from the main process as a data URL.
  const [appIcon, setAppIcon] = useState<string | null>(null)

  /* ---------- tab management ---------- */

  const openTab = useCallback(async (candidate: string): Promise<boolean> => {
    const resolved = await window.gitty.repo.resolve(candidate)
    if (!resolved) {
      setError(msg.app.notInWorkTreeHint(candidate))
      return false
    }
    setError(null)
    setRoots((prev) => (prev.includes(resolved) ? prev : [...prev, resolved]))
    setActive(resolved)
    await window.gitty.repo.watch(resolved)
    setRecent(await window.gitty.repo.remember(resolved))
    return true
  }, [msg])

  /** Replace the active tab's repository, keeping its position in the bar. */
  const openInActiveTab = useCallback(
    async (candidate: string): Promise<boolean> => {
      const resolved = await window.gitty.repo.resolve(candidate)
      if (!resolved) {
        setError(msg.app.notInWorkTree(candidate))
        return false
      }
      setError(null)
      const previous = active
      if (previous === resolved) return true
      // Already open in another tab: just go there rather than duplicating it.
      if (roots.includes(resolved)) {
        setActive(resolved)
        return true
      }
      setRoots((prev) =>
        previous && prev.includes(previous)
          ? prev.map((r) => (r === previous ? resolved : r))
          : [...prev, resolved]
      )
      setActive(resolved)
      await window.gitty.repo.watch(resolved)
      setRecent(await window.gitty.repo.remember(resolved))
      if (previous) {
        void window.gitty.repo.close(previous)
        setStatusByRoot((prev) => {
          const next = { ...prev }
          delete next[previous]
          return next
        })
        setBrowsingByRoot((prev) => {
          const next = { ...prev }
          delete next[previous]
          return next
        })
        setNavByRoot((prev) => {
          const next = { ...prev }
          delete next[previous]
          return next
        })
      }
      return true
    },
    [msg, active, roots]
  )

  const closeTab = useCallback(
    (root: string) => {
      void window.gitty.repo.close(root)
      setStatusByRoot((prev) => {
        const next = { ...prev }
        delete next[root]
        return next
      })
      setBrowsingByRoot((prev) => {
        const next = { ...prev }
        delete next[root]
        return next
      })
      setNavByRoot((prev) => {
        const next = { ...prev }
        delete next[root]
        return next
      })
      const i = roots.indexOf(root)
      if (i < 0) return
      const next = roots.filter((r) => r !== root)
      setRoots(next)
      // Closing the active tab activates its neighbour; the last one leaves the
      // window on the empty state.
      if (active === root) setActive(next[Math.min(i, next.length - 1)] ?? null)
    },
    [roots, active]
  )

  const pickAndOpen = useCallback(() => {
    void window.gitty.repo.pick().then((p) => {
      if (p) void openTab(p)
    })
  }, [openTab])

  // Launch in the requested repository; if there is none — started from a
  // directory outside any work tree — fall back to the last one opened.
  useEffect(() => {
    void (async () => {
      const initial = await window.gitty.repo.initial()
      if (await openTab(initial)) return
      for (const previous of await window.gitty.repo.recent()) {
        if (await openTab(previous)) return
      }
    })()
  }, [openTab])

  useEffect(() => void window.gitty.appIcon().then(setAppIcon), [])

  const refreshActive = useCallback(() => {
    tabRefs.current[active ?? '']?.refresh()
  }, [active])

  const onStatus = useCallback((st: RepoStatus) => {
    setStatusByRoot((prev) => ({ ...prev, [st.root]: st }))
  }, [])

  const onNav = useCallback((root: string, h: NavHistory) => {
    setNavByRoot((prev) => ({ ...prev, [root]: h }))
  }, [])

  const activeStatus = active ? statusByRoot[active] ?? null : null
  const activeBrowsing = active ? browsingByRoot[active] ?? null : null

  /* ---------- browsing history of the active tab ---------- */

  const activeNav = active ? navByRoot[active] ?? null : null
  const canBack = activeNav !== null && activeNav.index > 0
  const canForward = activeNav !== null && activeNav.index < activeNav.places.length - 1

  const goBack = useCallback(() => {
    tabRefs.current[active ?? '']?.back()
  }, [active])
  const goForward = useCallback(() => {
    tabRefs.current[active ?? '']?.forward()
  }, [active])

  /** The places, most recent first — the order they are remembered in. */
  const openHistoryMenu = (x: number, y: number): void => {
    const items: MenuItem[] =
      activeNav && activeNav.places.length > 1
        ? activeNav.places
            .map((p, i) => ({
              label: `${i === activeNav.index ? '●' : ' '} ${navLabel(p, msg)}`,
              title: navLabel(p, msg),
              action: () => tabRefs.current[active ?? '']?.goTo(i)
            }))
            .reverse()
        : [{ label: msg.nav.noHistory, action: () => {} }]
    setMenu({ x, y, items })
  }

  useEffect(
    () =>
      window.gitty.repo.onMenuOpen(() => {
        void pickAndOpen()
      }),
    [pickAndOpen]
  )

  useEffect(() => window.gitty.repo.onMenuSettings(() => setSettingsOpen(true)), [])

  /* ---------- pane visibility ---------- */

  // The last visible pane cannot be hidden: an empty window would leave the
  // Panes menu as the only way back, which is easy to miss.
  const togglePane = useCallback((id: PaneId) => {
    setPanes((prev) => (prev[id] && visibleCount(prev) < 2 ? prev : { ...prev, [id]: !prev[id] }))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // Settings is app-wide; Escape closes it before any tab's own unwinding.
      if (e.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        void pickAndOpen()
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowLeft') {
        // The browser convention, and the only keys the panes leave free:
        // Alt+arrow walks the active tab's browsing history.
        e.preventDefault()
        goBack()
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Digit0') {
        // Read from the code: with Shift down the key itself is punctuation.
        e.preventDefault()
        setPanes({ ...ALL_PANES })
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey && /^[1-4]$/.test(e.key)) {
        // Ctrl+1..4 toggle the panes in layout order.
        e.preventDefault()
        togglePane(PANE_ORDER[Number(e.key) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, pickAndOpen, togglePane, goBack, goForward])

  const openPanesMenu = (x: number, y: number): void => {
    const items: MenuItem[] = PANE_ORDER.map((id) => ({
      label: `${panes[id] ? '●' : ' '} ${paneLabels(msg)[id]}`,
      accel: paneAccel(id),
      title: panes[id]
        ? msg.paneChrome.hidePaneMenu(paneLabels(msg)[id])
        : msg.paneChrome.showPane(paneLabels(msg)[id]),
      action: () => togglePane(id)
    }))
    items.push({
      label: msg.paneChrome.showAllPanes,
      accel: ALL_PANES_ACCEL,
      separatorBefore: true,
      action: () => setPanes({ ...ALL_PANES })
    })
    setMenu({ x, y, items })
  }

  const resetSettings = useCallback(() => {
    setPanes({ ...ALL_PANES })
    setLocale('en')
    setTimeZone(SYSTEM_TZ)
    setTheme('dark')
    setFontSize(12.5)
    setRowHeight(20)
    setWrap(true)
    setDiffView('inline')
    setWordDiff(true)
    setMdOutline(true)
  }, [])

  // Push the visual knobs onto <html> as layout effects, so child passive
  // effects (TerminalPane reads the CSS variables) always see the new values.
  useLayoutEffect(() => {
    const el = document.documentElement
    el.dataset.theme = theme
    el.style.setProperty('--font-size', `${fontSize}px`)
    el.style.setProperty('--row-h', `${rowHeight}px`)
    el.style.colorScheme = theme
  }, [theme, fontSize, rowHeight])

  useEffect(() => {
    localStorage.setItem('gitty.wrap', wrap ? 'on' : 'off')
    localStorage.setItem('gitty.diffView', diffView)
    localStorage.setItem('gitty.wordDiff', wordDiff ? 'on' : 'off')
    localStorage.setItem('gitty.mdOutline', mdOutline ? 'on' : 'off')
    localStorage.setItem('gitty.theme', theme)
    localStorage.setItem('gitty.fontSize', String(fontSize))
    localStorage.setItem('gitty.rowHeight', String(rowHeight))
    localStorage.setItem('gitty.panes', JSON.stringify(panes))
    localStorage.setItem('gitty.timeZone', timeZone)
  }, [wrap, diffView, wordDiff, mdOutline, theme, fontSize, rowHeight, panes, timeZone])

  // Persist locale and tell the main process.
  useEffect(() => {
    localStorage.setItem('gitty.locale', locale)
    window.gitty.settings.setLocale(locale)
  }, [locale])

  /* ---------- repository menu (recent + open) ---------- */

  // Rebuilt rather than captured, so removing an entry updates the open menu.
  function recentItems(list: string[]): MenuItem[] {
    const others = list.filter((p) => p !== active)
    const items: MenuItem[] = others.map((p) => ({
      label: p.split('/').pop() || p,
      accel: shortenPath(p),
      title: `${p}${msg.recent.tooltip}`,
      action: (mods) => void (mods?.ctrl ? openInActiveTab(p) : openTab(p)),
      auxAction: () => void openInActiveTab(p),
      altAction: () =>
        void window.gitty.repo.forget(p).then((next) => {
          setRecent(next)
          setMenu((m) => (m ? { ...m, items: recentItems(next) } : m))
        })
    }))
    if (items.length === 0) {
      items.push({ label: msg.recent.noOtherRepos, action: () => {} })
    }
    items.push({
      label: msg.recent.openRepoEllipsis,
      accel: msg.recent.accelOpen,
      separatorBefore: true,
      action: () => pickAndOpen()
    })
    if (others.length > 0) {
      items.push({
        label: msg.recent.clearRecent,
        action: () => {
          void window.gitty.repo.forgetAll()
          setRecent(active ? [active] : [])
        }
      })
    }
    return items
  }

  const openRecentMenu = (x: number, y: number): void => {
    setMenu({ x, y, items: recentItems(recent) })
  }

  /* ---------- branch menu ---------- */

  const browse = (root: string, branch: string | null): void => {
    setBrowsingByRoot((prev) => {
      const next = { ...prev }
      if (branch === null) delete next[root]
      else next[root] = branch
      return next
    })
  }

  /**
   * Point the log at another branch. Nothing here checks anything out: the
   * work tree, its diffs and the shells stay on the branch git is actually on.
   */
  const openBranchMenu = async (x: number, y: number): Promise<void> => {
    if (!active) return
    const root = active
    const list = await window.gitty.git.branches(root)
    // The branch whose history is on screen: what was picked, or the one
    // checked out when nothing was.
    const showing = browsingByRoot[root] ?? activeStatus?.branch ?? null

    const entry = (b: Branch): MenuItem => ({
      label: `${b.name === showing ? '●' : ' '} ${b.name}`,
      accel: b.head ? msg.branch.headLabel : ago(b.date),
      title: b.subject,
      action: () => browse(root, b.head ? null : b.name)
    })

    const locals = list.filter((b) => !b.remote)
    const remotes = list.filter((b) => b.remote)
    // The checked-out branch leads, however old its last commit is.
    locals.sort((a, b) => Number(b.head) - Number(a.head))

    const items: MenuItem[] = locals.map(entry)
    if (items.length === 0) items.push({ label: msg.branch.noBranchesYet, action: () => {} })
    remotes.forEach((b, i) => items.push({ ...entry(b), separatorBefore: i === 0 }))
    if (browsingByRoot[root]) {
      items.push({
        label: msg.branch.backTo(activeStatus?.branch ?? msg.branch.headLabel),
        separatorBefore: true,
        action: () => browse(root, null)
      })
    }
    setMenu({ x, y, items })
  }

  return (
    <LocaleProvider locale={locale} setLocale={setLocale}>
    <TimeZoneProvider timeZone={timeZone}>
    <div className="app" onContextMenu={(e) => e.preventDefault()}>
      <div className="titlebar">
        {appIcon && (
          <img className="titlebar-icon" src={appIcon} alt={msg.app.title} draggable={false} />
        )}
        <strong>{msg.app.title}</strong>
        {/* Back, forward and the list of places — of the active tab, since the
            history belongs to a repository session, not to the window. */}
        {active && (
          <div className="nav-buttons">
            <button
              className="nav-btn"
              disabled={!canBack}
              title={
                canBack && activeNav
                  ? `${msg.nav.backTitle}\n${navLabel(activeNav.places[activeNav.index - 1], msg)}`
                  : msg.nav.backTitle
              }
              onClick={goBack}
            >
              ‹
            </button>
            <button
              className="nav-btn"
              disabled={!canForward}
              title={
                canForward && activeNav
                  ? `${msg.nav.forwardTitle}\n${navLabel(activeNav.places[activeNav.index + 1], msg)}`
                  : msg.nav.forwardTitle
              }
              onClick={goForward}
            >
              ›
            </button>
            <button
              className="nav-btn"
              title={msg.nav.historyTitle}
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                openHistoryMenu(r.left, r.bottom + 2)
              }}
            >
              ▾
            </button>
          </div>
        )}
        <button
          className="repo-button"
          title={msg.app.recentlyOpened}
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            openRecentMenu(r.left, r.bottom + 2)
          }}
        >
          <span className="repo">{active ? active.split('/').pop() : msg.app.noRepo}</span>
          <span className="caret">▾</span>
        </button>
        {activeStatus && (
          <>
            <button
              className="repo-button branch-button"
              title={msg.branch.browseHint}
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                void openBranchMenu(r.left, r.bottom + 2)
              }}
            >
              <span className="branch">⎇ {activeStatus.branch}</span>
              {activeBrowsing && <span className="browsing">› {activeBrowsing}</span>}
              <span className="caret">▾</span>
            </button>
            {activeStatus.upstream && (
              <span className="tracking">
                {activeStatus.upstream} ↑{activeStatus.ahead} ↓{activeStatus.behind}
              </span>
            )}
            <span className="tracking">{msg.app.changesCount(activeStatus.files.length)}</span>
          </>
        )}
        {error && <span style={{ color: 'var(--red)' }}>{error}</span>}
        <span className="spacer" />
        <button
          title={msg.app.showHidePanes}
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            openPanesMenu(r.left, r.bottom + 2)
          }}
        >
          {msg.app.panes} ▾
        </button>
        <button
          onClick={() => {
            setMenu(null)
            setSettingsOpen(true)
          }}
        >
          {msg.app.settings}
        </button>
        <button onClick={() => pickAndOpen()}>{msg.app.openRepository}</button>
        <button onClick={refreshActive}>{msg.app.refresh}</button>
      </div>

      {roots.length === 0 ? (
        <div className="tab-empty">
          <p>{msg.app.noReposOpen}</p>
          <button onClick={() => pickAndOpen()}>{msg.app.openRepository}</button>
        </div>
      ) : (
        <div className="tab-content">
          {roots.map((r) => (
            <div
              className="repo-tab-shell"
              key={r}
              style={r === active ? undefined : { display: 'none' }}
            >
              <Suspense
                fallback={
                  <div className="repo-tab">
                    <div className="pane">
                      <div className="empty">{msg.common.loading}</div>
                    </div>
                  </div>
                }
              >
                <RepoTab
                  ref={(el) => {
                    tabRefs.current[r] = el
                  }}
                  root={r}
                  active={r === active}
                  theme={theme}
                  fontSize={fontSize}
                  wrap={wrap}
                  setWrap={setWrap}
                  diffView={diffView}
                  setDiffView={setDiffView}
                  wordDiff={wordDiff}
                  setWordDiff={setWordDiff}
                  mdOutline={mdOutline}
                  setMdOutline={setMdOutline}
                  panes={panes}
                  onHidePane={togglePane}
                  browsing={browsingByRoot[r] ?? null}
                  settingsOpen={settingsOpen}
                  onStatus={onStatus}
                  onNav={onNav}
                />
              </Suspense>
            </div>
          ))}
        </div>
      )}

      <div className="tabbar">
        {roots.map((r) => (
          <div
            className={`tab${r === active ? ' active' : ''}`}
            key={r}
            title={statusByRoot[r]?.files.length ? msg.tab.uncommittedChanges(r) : r}
            onClick={() => setActive(r)}
          >
            <span className="tab-name">{r.split('/').pop() || r}</span>
            {statusByRoot[r]?.files.length ? (
              // No title of its own: hovering the dot would otherwise replace
              // the tab's tooltip with a version that drops the path.
              <span className="tab-dirty" />
            ) : null}
            <button
              className="tab-close"
              title={msg.tab.closeRepository}
              onClick={(e) => {
                // Closing a tab must not also switch to it.
                e.stopPropagation()
                closeTab(r)
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="tab-add" title={msg.tab.openAnotherRepo} onClick={() => pickAndOpen()}>
          +
        </button>
      </div>

      <ContextMenu state={menu} onClose={() => setMenu(null)} />
      <SettingsPane
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        fontSize={fontSize}
        setFontSize={setFontSize}
        rowHeight={rowHeight}
        setRowHeight={setRowHeight}
        wrap={wrap}
        setWrap={setWrap}
        diffView={diffView}
        setDiffView={setDiffView}
        wordDiff={wordDiff}
        setWordDiff={setWordDiff}
        mdOutline={mdOutline}
        setMdOutline={setMdOutline}
        onReset={resetSettings}
        locale={locale}
        setLocale={setLocale}
        timeZone={timeZone}
        setTimeZone={setTimeZone}
      />
    </div>
    </TimeZoneProvider>
    </LocaleProvider>
  )
}

/** Coarse age of a branch's last commit, to date the branch menu's entries. */
function ago(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.floor((Date.now() - then) / 86_400_000)
  const m = getMessages(loadLocale())
  if (days < 1) return m.time.today
  if (days === 1) return m.time.yesterday
  if (days < 30) return m.time.daysAgo(days)
  if (days < 365) return m.time.monthsAgo(days)
  return m.time.yearsAgo(days)
}

/** Home-relative directory of a path, for the recent-repository menu. */
function shortenPath(p: string): string {
  const dir = p.slice(0, p.lastIndexOf('/')) || '/'
  const home = window.gitty.homeDir
  return home && dir.startsWith(home) ? '~' + dir.slice(home.length) : dir
}
