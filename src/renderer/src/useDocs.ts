import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { isHtmlPath, isMarkdownPath } from './paths'
import type { FileDocState } from './nav'

/**
 * The documents beside the diff. The diff is always the first document; opening
 * a file adds another beside it rather than replacing it, so a diff can stay on
 * screen while a file is read. Snapshots have no diff, so there the first
 * document is a file.
 *
 * Lives in its own hook because the strip is a self-contained unit: its state
 * (`docs`, `activeDoc`) and every operation that touches them. RepoTab keeps
 * the coordination — resetting the list when the view changes — through the
 * setters it hands back, and the display derivations it reads off `doc`.
 */
export function useDocs(revForView: () => string | null): {
  docs: FileDocState[]
  activeDoc: string | null
  setDocs: Dispatch<SetStateAction<FileDocState[]>>
  setActiveDoc: Dispatch<SetStateAction<string | null>>
  doc: FileDocState | null
  viewingFile: boolean
  previewing: boolean
  addDoc: (kind: FileDocState['kind'], path: string) => void
  showDoc: (doc: FileDocState) => void
  closeDoc: (id: string) => void
  openFileDoc: (path: string) => void
  openLineHistory: (path: string, start: number, end: number) => void
  openSearch: (pattern: string) => void
  openHit: (path: string, line: number) => void
  openLinkedPath: (path: string, rev: string | null, anchor?: string) => void
  openBlame: (path: string) => void
  openHistory: (path: string) => void
} {
  const [docs, setDocs] = useState<FileDocState[]>([])
  const [activeDoc, setActiveDoc] = useState<string | null>(null)

  // One document per kind+revision+path; a blame of a file and the file itself
  // can sit beside each other, and so can two blame views of different revisions.
  const addDoc = useCallback(
    (kind: FileDocState['kind'], path: string) => {
      const rev = revForView()
      const prefix = kind === 'file' ? '' : `${kind}:`
      const id = `${prefix}${rev ?? 'work'}:${path}`
      setDocs((prev) =>
        prev.some((d) => d.id === id)
          ? prev
          : [
              ...prev,
              {
                kind,
                id,
                path,
                rev,
                preview: kind === 'file' && (isMarkdownPath(path) || isHtmlPath(path))
              }
            ]
      )
      setActiveDoc(id)
    },
    [revForView]
  )

  const openFileDoc = useCallback((path: string) => addDoc('file', path), [addDoc])

  /** Put a document in the strip and show it, unless it is already there. */
  const showDoc = useCallback((doc: FileDocState) => {
    setDocs((prev) =>
      prev.some((d) => d.id === doc.id)
        ? prev.map((d) => (d.id === doc.id ? doc : d))
        : [...prev, doc]
    )
    setActiveDoc(doc.id)
  }, [])

  /** `git log -L` over a range of one file's lines, from a blame row. */
  const openLineHistory = useCallback(
    (path: string, start: number, end: number) => {
      const rev = revForView()
      showDoc({
        kind: 'lines',
        id: `lines:${rev ?? 'work'}:${path}:${start}-${end}`,
        path,
        rev,
        preview: false,
        range: { start, end }
      })
    },
    [revForView, showDoc]
  )

  /** A repository-wide search, at whatever revision is being read. */
  const openSearch = useCallback(
    (pattern: string) => {
      const rev = revForView()
      showDoc({
        kind: 'grep',
        id: `grep:${rev ?? 'work'}:${pattern}`,
        path: pattern,
        rev,
        preview: false
      })
    },
    [revForView, showDoc]
  )

  /**
   * Open the file a search hit names, at the line it names. Source rather than
   * a rendered preview even for markdown: the line is the point.
   */
  const openHit = useCallback(
    (path: string, line: number) => {
      const rev = revForView()
      showDoc({ kind: 'file', id: `${rev ?? 'work'}:${path}`, path, rev, preview: false, line })
    },
    [revForView, showDoc]
  )

  /**
   * A link inside a rendered document, Ctrl+clicked. The revision comes from
   * the document that holds the link rather than from the view: a README read
   * at a commit links to that commit's files, whatever the log has selected
   * since.
   */
  const openLinkedPath = useCallback(
    (path: string, rev: string | null, anchor?: string) => {
      showDoc({
        kind: 'file',
        id: `${rev ?? 'work'}:${path}`,
        path,
        rev,
        preview: isMarkdownPath(path) || isHtmlPath(path),
        anchor
      })
    },
    [showDoc]
  )

  const openBlame = useCallback((path: string) => addDoc('blame', path), [addDoc])
  const openHistory = useCallback((path: string) => addDoc('history', path), [addDoc])

  const closeDoc = useCallback((id: string) => {
    setDocs((prev) => {
      const i = prev.findIndex((d) => d.id === id)
      if (i < 0) return prev
      const next = prev.filter((d) => d.id !== id)
      setActiveDoc((cur) => (cur === id ? (next[Math.min(i, next.length - 1)]?.id ?? null) : cur))
      return next
    })
  }, [])

  const doc = docs.find((d) => d.id === activeDoc) ?? null
  const viewingFile = doc !== null
  const previewing =
    viewingFile && doc.preview && (isMarkdownPath(doc.path) || isHtmlPath(doc.path))

  return {
    docs,
    activeDoc,
    setDocs,
    setActiveDoc,
    doc,
    viewingFile,
    previewing,
    addDoc,
    showDoc,
    closeDoc,
    openFileDoc,
    openLineHistory,
    openSearch,
    openHit,
    openLinkedPath,
    openBlame,
    openHistory
  }
}
