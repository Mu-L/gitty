/**
 * Path predicates shared by the file list, the diff pane and the context menus.
 * Kept in their own tiny module so the heavy viewers (highlight.js, markdown-it,
 * xterm) stay out of the main bundle: anything that imports only these
 * predicates must not drag in FileDoc or ImagePane just for a regex.
 */

/** Markdown files open rendered by default, with a toggle back to the source. */
export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown|mdown|mkd)$/i.test(path)
}

/** Extensions the image preview claims; must match `IMAGE_MIME` in main/git.ts. */
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|ico|avif|svg)$/i

export function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path)
}
