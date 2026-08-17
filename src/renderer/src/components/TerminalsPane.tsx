import { Fragment, memo, useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { TerminalPane, type Theme } from './TerminalPane'
import { useMsg } from '../locale'
import type { TerminalOptions } from '../../../shared/types'
import { FullButton, HideButton } from './PaneChrome'
import type { MenuItem, MenuState } from './ContextMenu'
import { paneControls } from '../panes'
import { Tooltip } from './Tooltip'
import {
  destroySession,
  focusSession,
  layouts,
  layoutFor,
  leaves,
  nextTermId,
  type TermNode
} from '../terminals'

type Orientation = 'horizontal' | 'vertical'

/**
 * The split layout: a leaf is one shell, a branch divides its area between
 * its children. Splitting the same way twice extends the branch rather than
 * nesting another one, so three side-by-side terminals share one set of
 * separators and resize against each other. `TermNode`, the tree type, lives
 * in `../terminals` so `RepoTab` can destroy a repository's shells without
 * loading the xterm chunk.
 */
function splitAt(node: TermNode, target: string, orientation: Orientation, id: string): TermNode {
  if (node.kind === 'leaf') {
    return node.id === target
      ? { kind: 'split', orientation, children: [node, { kind: 'leaf', id }] }
      : node
  }
  if (node.orientation === orientation) {
    const i = node.children.findIndex((c) => c.kind === 'leaf' && c.id === target)
    if (i >= 0) {
      const children = [...node.children]
      children.splice(i + 1, 0, { kind: 'leaf', id })
      return { ...node, children }
    }
  }
  return { ...node, children: node.children.map((c) => splitAt(c, target, orientation, id)) }
}

/** Drop a leaf; a branch left with one child collapses into it. */
function removeAt(node: TermNode, target: string): TermNode | null {
  if (node.kind === 'leaf') return node.id === target ? null : node
  const children = node.children
    .map((c) => removeAt(c, target))
    .filter((c): c is TermNode => c !== null)
  if (children.length === 0) return null
  if (children.length === 1) return children[0]
  return { ...node, children }
}

/**
 * Panels keep their sizes by position, so a changed set of children must
 * remount the group to be shared out evenly again. That is free here: the
 * terminals themselves live outside React.
 */
function nodeKey(node: TermNode): string {
  return leaves(node).join('+')
}

/** The terminal pane: one shell, or several split across it. */
export const TerminalsPane = memo(function TerminalsPane({
  root,
  theme,
  fontSize,
  fontFamily,
  options,
  disabled = false,
  full = false,
  onToggleFull,
  onHide,
  sendToAgent,
  agentItems,
  agentCommands,
  agentCommand,
  setMenu
}: {
  root: string
  theme: Theme
  fontSize: number
  /** The monospace font setting, so a change reaches the running shells. */
  fontFamily: string
  /** Which shell a new session starts, and how. */
  options: TerminalOptions
  /** Set on hidden tabs, so their splits stay out of pointer hit testing. */
  disabled?: boolean
  /** This pane is filling the window. */
  full?: boolean
  onToggleFull?: () => void
  /** Absent when this is the only pane left on screen. */
  onHide?: () => void
  /** Type the chosen command into the focused shell — see `RepoTab`. */
  sendToAgent: (pick?: string) => void
  agentItems: (list: string[]) => MenuItem[]
  agentCommands: string[]
  agentCommand: string
  setMenu: (m: MenuState | null) => void
}): JSX.Element {
  const { msg } = useMsg()

  // Restored from the registry: this component comes and goes with the pane,
  // the shells do not.
  const [tree, setTree] = useState<TermNode>(() => layoutFor(root).tree)
  const [focused, setFocused] = useState(() => layoutFor(root).focused)
  const ids = leaves(tree)

  const idsRef = useRef(ids)
  idsRef.current = ids
  useEffect(() => {
    layouts.set(root, { tree, focused })
  }, [root, tree, focused])

  const split = useCallback((orientation: Orientation): void => {
    const id = nextTermId()
    setTree((t) => splitAt(t, focused, orientation, id))
    setFocused(id)
  }, [focused])

  const close = useCallback((id: string): void => {
    const rest = idsRef.current
    // The last terminal stays: an empty pane would have no way back.
    if (rest.length < 2) return
    destroySession(id)
    const i = rest.indexOf(id)
    setFocused(rest[i + 1] ?? rest[i - 1])
    setTree((t) => removeAt(t, id) ?? t)
  }, [])

  // Focus follows the split, and a click inside a terminal reports back here.
  useEffect(() => focusSession(focused), [focused])

  const render = (node: TermNode): JSX.Element => {
    if (node.kind === 'leaf') {
      return (
        <TerminalPane
          id={node.id}
          root={root}
          theme={theme}
          fontSize={fontSize}
          fontFamily={fontFamily}
          options={options}
          active={ids.length > 1 && node.id === focused}
          canClose={ids.length > 1}
          onFocus={() => setFocused(node.id)}
          onClose={() => close(node.id)}
          onExit={() => close(node.id)}
        />
      )
    }
    const sep = node.orientation === 'horizontal' ? 'sep-v' : 'sep-h'
    return (
      <Group
        orientation={node.orientation}
        id={`term-${root}-${nodeKey(node)}`}
        className="term-split"
        disabled={disabled}
      >
        {node.children.map((child, i) => (
          <Fragment key={nodeKey(child)}>
            {i > 0 && <Separator className={sep} />}
            <Panel minSize="10%">{render(child)}</Panel>
          </Fragment>
        ))}
      </Group>
    )
  }

  return (
    <div className={`pane${full ? ' maximized' : ''}`}>
      <div
        className="pane-header"
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          onToggleFull?.()
        }}
      >
        {onToggleFull && <FullButton full={full} accel="Ctrl+Shift+4" onToggle={onToggleFull} />}
        <Tooltip className="title" lines={paneControls('terminal', msg)}>
          {msg.terminal.title}
        </Tooltip>
        <span className="spacer" />
        {/* The command is only ever typed into a shell in this pane, so the
            choice of what to send belongs here rather than beside the files it
            talks about. Which agent to hand the work to is a per-commit
            decision, so the whole choice lives in the header: the remembered
            commands and the box for one that is not remembered yet. It names
            the command it would run — the head of the list — so what Send does
            is readable without opening the menu; a long one is cut by CSS
            rather than allowed to widen the header, and carries the whole of
            itself as its own tooltip. */}
        <span className="split-button">
          <button
            className="toggle split-pick"
            title={msg.terminal.agentCommandsTitle}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              setMenu({ x: r.left, y: r.bottom, items: agentItems(agentCommands) })
            }}
          >
            <span
              className={`split-pick-label${agentCommand === '' ? ' empty' : ''}`}
              title={agentCommand || undefined}
            >
              {agentCommand || msg.terminal.agentNone}
            </span>
            ▾
          </button>
          {/* Nothing remembered means nothing to send: the button greys out
              rather than reporting the same absence after the click. */}
          <button
            className="toggle"
            disabled={agentCommand === ''}
            title={msg.terminal.sendToAgentTitle(agentCommand)}
            onClick={() => sendToAgent()}
          >
            {msg.terminal.sendToAgent}
          </button>
        </span>
        <button title={msg.terminal.splitRightTitle} onClick={() => split('horizontal')}>
          {msg.terminal.splitRight}
        </button>
        <button title={msg.terminal.splitDownTitle} onClick={() => split('vertical')}>
          {msg.terminal.splitDown}
        </button>
        {onHide && (
          <HideButton accel="Ctrl+4" note={msg.terminal.shellsKeepRunning} onHide={onHide} />
        )}
      </div>
      {root && <div className="term-body" key={nodeKey(tree)}>{render(tree)}</div>}
    </div>
  )
})
