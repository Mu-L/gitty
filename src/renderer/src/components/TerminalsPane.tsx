import { Fragment, useEffect, useRef, useState, type JSX } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { TerminalPane, destroySession, focusSession, type Theme } from './TerminalPane'

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

/** The terminal pane: one shell, or several split across it. */
export function TerminalsPane({
  root,
  theme,
  fontSize
}: {
  root: string
  theme: Theme
  fontSize: number
}): JSX.Element {
  // Lazily, so a re-render does not burn ids the layout never uses.
  const [first] = useState(nextId)
  const [tree, setTree] = useState<Node>({ kind: 'leaf', id: first })
  const [focused, setFocused] = useState(first)
  const ids = leaves(tree)

  // The pane is remounted when the repository changes; its shells go with it.
  const idsRef = useRef(ids)
  idsRef.current = ids
  useEffect(() => {
    return () => idsRef.current.forEach(destroySession)
  }, [])

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
      <Group orientation={node.orientation} id={`term-${nodeKey(node)}`} className="term-split">
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
    <div className="pane">
      <div className="pane-header">
        <span className="title">Terminal</span>
        <span className="spacer" />
        <button title="Split the focused terminal to the right" onClick={() => split('horizontal')}>
          Split →
        </button>
        <button title="Split the focused terminal downwards" onClick={() => split('vertical')}>
          Split ↓
        </button>
        <span className="hint">{root}</span>
      </div>
      {root && <div className="term-body" key={nodeKey(tree)}>{render(tree)}</div>}
    </div>
  )
}
