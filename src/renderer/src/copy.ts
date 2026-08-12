import { sessions } from './terminals'

/**
 * The text a copy should take, wherever the focus happens to be.
 *
 * Three places keep a selection and only one of them is the document's. A
 * terminal draws its text itself, so xterm holds that selection and the
 * document knows nothing about it; an HTML preview is an iframe, whose
 * selection belongs to the frame's own document. Asking in that order means
 * one key can mean "copy" everywhere in the window.
 */
export function selectedText(): string {
  const el = document.activeElement

  const host = el instanceof Element ? el.closest('[data-term-id]') : null
  const id = host?.getAttribute('data-term-id')
  if (id) {
    const sel = sessions.get(id)?.term.getSelection() ?? ''
    if (sel) return sel
  }

  if (el instanceof HTMLIFrameElement) {
    try {
      const sel = el.contentWindow?.getSelection()?.toString() ?? ''
      if (sel) return sel
    } catch {
      // A cross-origin frame cannot be read; the preview's srcdoc is not one.
    }
  }

  return window.getSelection()?.toString() ?? ''
}

/** Copy whatever is selected. Returns false when there was nothing to copy. */
export function copySelection(): boolean {
  const text = selectedText()
  if (!text) return false
  void window.gitty.clipboard.write(text)
  return true
}

/**
 * True for the second copy key. Ctrl+C is the interrupt inside a terminal, so
 * a shell's copy has always been Ctrl+Shift+C; accepting it everywhere means
 * the key does not change meaning as the focus moves between the panes.
 * Read off `code`: with Shift down, `key` is the capital letter.
 */
export function isCopyChord(e: KeyboardEvent): boolean {
  return (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.code === 'KeyC'
}
