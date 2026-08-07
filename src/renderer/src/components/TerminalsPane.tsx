import { Fragment, useEffect, useRef, useState, type JSX } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { TerminalPane, destroySession, focusSession, type Theme } from './TerminalPane'
import { FullButton, HideButton } from './PaneChrome'
import { paneControls } from '../panes'
import { Tooltip } from './Tooltip'

type Orientation = 'horizontal' | 'vertical'

/**
 * The split layout: a leaf is one shell, a branch divides its area between
 * its children. Splitting the same way twice extends the branch rather than
 * nesting another one, so three side-by-side terminals share one set of
 * separators and resize against each other.
 */
type Node = { kind: 'leaf'; id: string } | { kind: 'split'; orientation: Orientation; children: Node[] }

let counter = 0
const nextId = (): string => `term${++counter}`

function leaves(node: Node): string[] {
  return node.kind === 'leaf' ? [node.id] : node.children.flatMap(leaves)
}

function splitAt(node: Node, target: string, orientation: Orientation, id: string): Node {
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
function removeAt(node: Node, target: string): Node | null {
  if (node.kind === 'leaf') return node.id === target ? null : node
  const children = node.children
    .map((c) => removeAt(c, target))
    .filter((c): c is Node => c !== null)
  if (children.length === 0) return null
  if (children.length === 1) return children[0]
  return { ...node, children }
}

/**
 * Panels keep their sizes by position, so a changed set of children must
 * remount the group to be shared out evenly again. That is free here: the
 * terminals themselves live outside React.
 */
function nodeKey(node: Node): string {
  return leaves(node).join('+')
}

/**
 * The split layout per repository, kept outside React for the same reason the
 * xterms are: hiding the terminal pane unmounts this component, and a shell
 * must not die because its pane was toggled away. Sessions end only in
 * `destroyTerminals`, which the repository tab calls when it closes.
 */
const layouts = new Map<string, { tree: Node; focused: string }>()

function layoutFor(root: string): { tree: Node; focused: string } {
  const existing = layouts.get(root)
  if (existing) return existing
  const id = nextId()
  const fresh = { tree: { kind: 'leaf', id } as Node, focused: id }
  layouts.set(root, fresh)
  return fresh
}

/** End every shell of a repository, and forget its layout. */
export function destroyTerminals(root: string): void {
  const layout = layouts.get(root)
  if (!layout) return
  layouts.delete(root)
  leaves(layout.tree).forEach(destroySession)
}

/** The terminal pane: one shell, or several split across it. */
export function TerminalsPane({
  root,
  theme,
  fontSize,
  disabled = false,
  full = false,
  onToggleFull,
  onHide
}: {
  root: string
  theme: Theme
  fontSize: number
  /** Set on hidden tabs, so their splits stay out of pointer hit testing. */
  disabled?: boolean
  /** This pane is filling the window. */
  full?: boolean
  onToggleFull?: () => void
  /** Absent when this is the only pane left on screen. */
  onHide?: () => void
}): JSX.Element {
  // Restored from the registry: this component comes and goes with the pane,
  // the shells do not.
  const [tree, setTree] = useState<Node>(() => layoutFor(root).tree)
  const [focused, setFocused] = useState(() => layoutFor(root).focused)
  const ids = leaves(tree)

  const idsRef = useRef(ids)
  idsRef.current = ids
  useEffect(() => {
    layouts.set(root, { tree, focused })
  }, [root, tree, focused])

  const split = (orientation: Orientation): void => {
    const id = nextId()
    setTree((t) => splitAt(t, focused, orientation, id))
    setFocused(id)
  }

  const close = (id: string): void => {
    const rest = idsRef.current
    // The last terminal stays: an empty pane would have no way back.
    if (rest.length < 2) return
    destroySession(id)
    const i = rest.indexOf(id)
    setFocused(rest[i + 1] ?? rest[i - 1])
    setTree((t) => removeAt(t, id) ?? t)
  }

  // Focus follows the split, and a click inside a terminal reports back here.
  useEffect(() => focusSession(focused), [focused])

  const render = (node: Node): JSX.Element => {
    if (node.kind === 'leaf') {
      return (
        <TerminalPane
          id={node.id}
          root={root}
          theme={theme}
          fontSize={fontSize}
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
        <Tooltip className="title" lines={paneControls('terminal')}>
          Terminal
        </Tooltip>
        <span className="spacer" />
        <button title="Split the focused terminal to the right" onClick={() => split('horizontal')}>
          Split →
        </button>
        <button title="Split the focused terminal downwards" onClick={() => split('vertical')}>
          Split ↓
        </button>
        <span className="hint">{root}</span>
        {onHide && (
          <HideButton accel="Ctrl+4" note=" — the shells keep running" onHide={onHide} />
        )}
      </div>
      {root && <div className="term-body" key={nodeKey(tree)}>{render(tree)}</div>}
    </div>
  )
}
